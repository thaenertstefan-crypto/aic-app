import { anthropic } from "@/lib/anthropic/client";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/sternschmiede";
import {
  RATE_LIMIT_MESSAGE,
  STERNSCHMIEDE_LIMIT,
  checkRateLimit,
  logUsage,
} from "@/lib/anthropic/rate-limit";
import { parseForgeOutput } from "@/lib/anthropic/sternschmiede-result";
import { SESSION_EXPIRED } from "@/lib/actions/action-result";
import { createClient } from "@/lib/supabase/server";
import type { WantItem } from "@/lib/types/db-json";
import { TEXT_MAX_SHORT } from "@/lib/utils/form-validation";
import { getValueLabel } from "@/lib/utils/values-bank";

const MAX_VALUES_IN_PROMPT = 20;
const MAX_WANTS_IN_PROMPT = 20;
const MAX_CHILD_LEN = 800;

const AI_ERROR_MESSAGE =
  "Das Funkenschlagen hat gerade nicht geklappt. Versuch es gleich noch einmal.";

// ── Slot-Auswürfelung (Spec 2026-07-16, §1.2) ──────────────────────────
// Der Server bestimmt Anzahl und Quelle der Funken; die KI bekommt einen
// festen AUFTRAG. Standard: 2 Wert-Slots (zufällig gezogene Werte) + 2
// Stern-Slots; mit Kind-Antwort ein 5. Kind-Slot. Fallbacks: keine Werte →
// 4 Stern-Slots; keine Sterne → 4 Wert-Slots; beides leer → 4 freie Slots.
type ForgeSlot =
  | { kind: "wert"; valueId: string }
  | { kind: "stern" }
  | { kind: "kind" }
  | { kind: "frei" };

/** n zufällige Werte (Fisher-Yates); bei weniger als n Werten wird wiederholt. */
function pickRandomValues(values: string[], n: number): string[] {
  if (values.length === 0) return [];
  const shuffled = [...values];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(shuffled[i % shuffled.length]);
  return out;
}

function buildForgeSlots(
  values: string[],
  sterneCount: number,
  hasChildAnswer: boolean,
): ForgeSlot[] {
  const slots: ForgeSlot[] = [];
  if (values.length > 0 && sterneCount > 0) {
    for (const v of pickRandomValues(values, 2)) slots.push({ kind: "wert", valueId: v });
    slots.push({ kind: "stern" }, { kind: "stern" });
  } else if (values.length > 0) {
    for (const v of pickRandomValues(values, 4)) slots.push({ kind: "wert", valueId: v });
  } else if (sterneCount > 0) {
    slots.push({ kind: "stern" }, { kind: "stern" }, { kind: "stern" }, { kind: "stern" });
  } else {
    slots.push({ kind: "frei" }, { kind: "frei" }, { kind: "frei" }, { kind: "frei" });
  }
  if (hasChildAnswer) slots.push({ kind: "kind" });
  return slots;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: SESSION_EXPIRED }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { childAnswer?: unknown };
  const childAnswer =
    typeof body.childAnswer === "string" ? body.childAnswer.trim().slice(0, MAX_CHILD_LEN) : "";

  // Werte (neueste bestätigte Hypothese) + Sterne parallel laden.
  const [{ data: hypothesisRow }, { data: wantsRow }] = await Promise.all([
    supabase
      .from("values_hypothesis")
      .select("values")
      .eq("user_id", user.id)
      .eq("confirmed", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("wants").select("wants").eq("user_id", user.id).maybeSingle(),
  ]);

  const values = ((hypothesisRow?.values as string[] | null) ?? []).slice(0, MAX_VALUES_IN_PROMPT);
  const sterne = ((wantsRow?.wants as WantItem[] | null) ?? [])
    .filter((w) => w.active && w.text?.trim())
    .slice(0, MAX_WANTS_IN_PROMPT);

  if (await checkRateLimit(supabase, user.id, "sternschmiede", STERNSCHMIEDE_LIMIT)) {
    return Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const werteText =
      values.length > 0
        ? values.map((id) => `<wert>${getValueLabel(id)}</wert>`).join("\n")
        : "(keine bestätigten Werte)";
    const sterneText =
      sterne.length > 0
        ? sterne.map((w) => `<stern>${w.text}</stern>`).join("\n")
        : "(noch keine Sterne)";

    const slots = buildForgeSlots(values, sterne.length, childAnswer.length > 0);
    const auftragText = slots
      .map((s, i) => {
        const label =
          s.kind === "wert"
            ? `Wert: ${getValueLabel(s.valueId)}`
            : s.kind === "stern"
              ? "Stern-Inspiration"
              : s.kind === "kind"
                ? "Kind-Antwort"
                : "Frei";
        return `${i + 1}. ${label}`;
      })
      .join("\n");

    const userMessage = `Die Werte der Person:
<werte>
${werteText}
</werte>

Die bereits entdeckten Sterne der Person:
<sterne>
${sterneText}
</sterne>

Was der Person als Kind Spaß gemacht hat:
<kind>${childAnswer || "(keine Angabe)"}</kind>

Dein AUFTRAG — schlage genau ${slots.length} Funken, in dieser Reihenfolge:
<auftrag>
${auftragText}
</auftrag>`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    await logUsage(supabase, user.id, "sternschmiede");

    const rawText = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!rawText) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }

    // Ohne Funken hat die Bühne nichts zu zeigen — dann lieber ein ehrliches
    // 502, damit der Client einen neuen Versuch anbietet.
    const result = parseForgeOutput(rawText, { maxTextLen: TEXT_MAX_SHORT });
    if (!result) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }

    return Response.json(result);
  } catch (error) {
    console.error("sternschmiede: call failed", error);
    return Response.json({ error: AI_ERROR_MESSAGE }, { status: 500 });
  }
}
