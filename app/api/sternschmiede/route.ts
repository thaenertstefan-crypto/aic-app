import { anthropic } from "@/lib/anthropic/client";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/sternschmiede";
import {
  RATE_LIMIT_MESSAGE,
  STERNSCHMIEDE_LIMIT,
  checkRateLimit,
  logUsage,
} from "@/lib/anthropic/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { WantItem } from "@/lib/types/db-json";
import { TEXT_MAX_SHORT } from "@/lib/utils/form-validation";
import { getValueLabel } from "@/lib/utils/values-bank";

const MAX_VALUES_IN_PROMPT = 20;
const MAX_WANTS_IN_PROMPT = 20;
const MAX_CHILD_LEN = 800;
const MAX_FUNKEN_OUT = 5;

const AI_ERROR_MESSAGE =
  "Das Funkenschlagen hat gerade nicht geklappt. Versuch es gleich noch einmal.";

type FunkeSuggestion = {
  text: string;
  reason: string | null;
};

function parseFunken(raw: unknown): FunkeSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const out: FunkeSuggestion[] = [];
  for (const item of raw.slice(0, MAX_FUNKEN_OUT)) {
    if (!item || typeof item !== "object") continue;
    const v = item as { text?: unknown; reason?: unknown };
    if (typeof v.text !== "string" || !v.text.trim()) continue;
    out.push({
      text: v.text.trim().slice(0, TEXT_MAX_SHORT),
      reason:
        typeof v.reason === "string" && v.reason.trim()
          ? v.reason.trim().slice(0, TEXT_MAX_SHORT)
          : null,
    });
  }
  return out;
}

function parseModelOutput(raw: string): {
  comment: string;
  funken: FunkeSuggestion[];
} {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    const parsed: unknown = JSON.parse(stripped);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { comment?: unknown }).comment === "string"
    ) {
      const comment = (parsed as { comment: string }).comment.trim();
      const funken = parseFunken((parsed as { funken?: unknown }).funken);
      if (comment || funken.length > 0) return { comment, funken };
    }
  } catch {
    // fällt unten in den comment-Fallback
  }
  const commentMatch = stripped.match(/"comment"\s*:\s*"([\s\S]*?)"\s*,\s*"funken"/);
  if (commentMatch) {
    const comment = commentMatch[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .trim();
    if (comment) return { comment, funken: [] };
  }
  return { comment: "", funken: [] };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Du musst angemeldet sein." }, { status: 401 });
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

    const userMessage = `Die Werte der Person:
<werte>
${werteText}
</werte>

Die bereits entdeckten Sterne der Person:
<sterne>
${sterneText}
</sterne>

Was der Person als Kind Spaß gemacht hat:
<kind>${childAnswer || "(keine Angabe)"}</kind>`;

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

    const { comment, funken } = parseModelOutput(rawText);
    if (!comment && funken.length === 0) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }

    return Response.json({ comment, funken });
  } catch (error) {
    console.error("sternschmiede: call failed", error);
    return Response.json({ error: AI_ERROR_MESSAGE }, { status: 500 });
  }
}
