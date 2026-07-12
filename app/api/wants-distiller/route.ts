import { anthropic } from "@/lib/anthropic/client";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/wants-distiller";
import {
  RATE_LIMIT_MESSAGE,
  WANTS_DISTILLER_LIMIT,
  checkRateLimit,
  logUsage,
} from "@/lib/anthropic/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { YinYangContent } from "@/lib/types/db-json";
import { TEXT_MAX_SHORT } from "@/lib/utils/form-validation";
import { getValueLabel } from "@/lib/utils/values-bank";

// Audit texts come from the user's own DB (length-capped at save time), so
// defensively truncate instead of 400ing — max_tokens only bounds the OUTPUT.
const MAX_ENTRY_LEN = 2000;
const MAX_VALUES_IN_PROMPT = 20;
// Obergrenzen für die Modell-Listen — mehr wird still verworfen.
const MAX_WANTS_OUT = 6;

const AI_ERROR_MESSAGE =
  "Das Destillieren hat gerade nicht geklappt. Dein Audit ist gespeichert — du kannst deine Wants auch selbst formulieren.";

/** Ein destillierter Wants/Stern (value gegen die DB-Werte aufgelöst). */
type WantSuggestion = {
  text: string;
  valueId: string | null;
  valueLabel: string | null;
  reason: string | null;
  question: string | null;
};

type DistillerResult = {
  comment: string;
  wants: WantSuggestion[];
};

function clampText(value: string): string {
  return value.slice(0, MAX_ENTRY_LEN);
}

/** Validiert die wants-Liste des Modells; value_ids werden IMMER gegen die
 *  bestätigten Werte der Person aufgelöst — unbekannte ids werden zu null. */
function parseWants(raw: unknown, valueIds: Set<string>): WantSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const wants: WantSuggestion[] = [];

  for (const item of raw.slice(0, MAX_WANTS_OUT)) {
    if (!item || typeof item !== "object") continue;
    const v = item as {
      text?: unknown;
      value_id?: unknown;
      reason?: unknown;
      question?: unknown;
    };
    if (typeof v.text !== "string" || !v.text.trim()) continue;

    const valueId =
      typeof v.value_id === "string" && valueIds.has(v.value_id)
        ? v.value_id
        : null;

    wants.push({
      text: v.text.trim().slice(0, TEXT_MAX_SHORT),
      valueId,
      valueLabel: valueId ? getValueLabel(valueId) : null,
      reason:
        typeof v.reason === "string" && v.reason.trim()
          ? v.reason.trim().slice(0, TEXT_MAX_SHORT)
          : null,
      question:
        typeof v.question === "string" && v.question.trim()
          ? v.question.trim().slice(0, TEXT_MAX_SHORT)
          : null,
    });
  }

  return wants;
}

/**
 * Parse the model output. Preferred path: strict JSON per system prompt.
 * Die Listen sind per Regex kaum rettbar — bei kaputtem JSON degradiert die
 * Antwort gestuft: comment-only (die UI wechselt dann in den manuellen Modus).
 */
function parseModelOutput(raw: string, valueIds: Set<string>): DistillerResult {
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
      const comment = ((parsed as { comment: string }).comment).trim();
      const wants = parseWants((parsed as { wants?: unknown }).wants, valueIds);
      if (comment) {
        return { comment, wants };
      }
    }
  } catch {
    // JSON kaputt → comment-Fallback unten.
  }

  // Feld-Reihenfolge (comment → wants) ist per Prompt fixiert: der
  // Kommentar lässt sich über den nachfolgenden "wants"-Key heraustrennen.
  const commentMatch = stripped.match(/"comment"\s*:\s*"([\s\S]*?)"\s*,\s*"wants"/);
  if (commentMatch) {
    const comment = commentMatch[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .trim();
    if (comment) {
      return { comment, wants: [] };
    }
  }

  return { comment: "", wants: [] };
}

/**
 * Der Wants-Destillierer (Rezept #2 — Was du wirklich willst). Accepts
 * { entryId } eines yin_yang-Eintrags — Audit-Texte und bestätigte Werte
 * werden serverseitig über den RLS-Client nachgeladen (entryId-first).
 * Die Sterne werden zusätzlich auf den Eintrag persistiert
 * (content.ai_wants + ai_insights).
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Du musst angemeldet sein." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { entryId?: unknown };
  const entryId = typeof body.entryId === "string" ? body.entryId : "";
  if (!entryId) {
    return Response.json(
      { error: "Es fehlt der Audit-Eintrag." },
      { status: 400 },
    );
  }

  // Die zwei Reads sind unabhängig → parallel laden. Nur die neueste
  // BESTÄTIGTE Werte-Hypothese wird verlinkt — unbestätigte Vermutungen
  // aus einem laufenden Werte-Zyklus gehören nicht in die Wants.
  const [{ data: entry }, { data: hypothesisRow }] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("id, content")
      .eq("id", entryId)
      .eq("user_id", user.id)
      .eq("recipe_slug", "wants")
      .eq("template_type", "yin_yang")
      .maybeSingle(),
    supabase
      .from("values_hypothesis")
      .select("values")
      .eq("user_id", user.id)
      .eq("confirmed", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!entry) {
    return Response.json(
      { error: "Wir konnten dein Audit nicht finden." },
      { status: 404 },
    );
  }

  const content = entry.content as YinYangContent;
  const yin = (content.yin ?? "").trim();
  const yang = (content.yang ?? "").trim();
  if (!yin || !yang) {
    return Response.json(
      { error: "Dein Audit ist noch nicht vollständig." },
      { status: 400 },
    );
  }

  const values = ((hypothesisRow?.values as string[] | null) ?? []).slice(
    0,
    MAX_VALUES_IN_PROMPT,
  );
  const valueIds = new Set(values);

  // Cap hourly AI calls per user (checked after input validation so invalid
  // requests don't burn quota).
  if (
    await checkRateLimit(supabase, user.id, "wants-distiller", WANTS_DISTILLER_LIMIT)
  ) {
    return Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const valuesText =
      values.length > 0
        ? values
            .map((id) => `<wert id="${id}">${getValueLabel(id)}</wert>`)
            .join("\n")
        : "(noch keine bestätigten Werte — gib bei allen Wants value_id null an)";

    const userMessage = `Das Yin-&-Yang-Audit der Person:
<yin>${clampText(yin)}</yin>
<yang>${clampText(yang)}</yang>
<prinzipien>${clampText((content.principles ?? "").trim()) || "(keine Angabe)"}</prinzipien>

Die bestätigten Werte der Person:
<werte>
${valuesText}
</werte>`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      // Kommentar + bis zu 6 Wants (text/value_id/reason/question) +
      // JSON-Gerüst — 1200 lässt extra Luft, damit nie mitten im Satz
      // abgeschnitten wird.
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Only count genuinely successful generations against the quota.
    await logUsage(supabase, user.id, "wants-distiller");

    const raw = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!raw) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }

    const { comment, wants } = parseModelOutput(raw, valueIds);
    if (!comment && wants.length === 0) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }

    // Persist onto the entry: die Sterne als Provenienz ins content-JSONB,
    // der Lesetext in ai_insights. WICHTIG: content mergen, nie ersetzen.
    const mergedContent: YinYangContent = {
      ...content,
      ai_wants: wants.map((w) => ({ text: w.text, value_id: w.valueId })),
    };

    const insightParts = [comment];
    if (wants.length > 0) {
      insightParts.push(
        wants
          .map((w) => `• ${w.text}${w.valueLabel ? ` (Wert: ${w.valueLabel})` : ""}`)
          .join("\n"),
      );
    }
    await supabase
      .from("journal_entries")
      .update({
        content: mergedContent,
        ai_insights: insightParts.filter(Boolean).join("\n\n"),
      })
      .eq("id", entry.id);

    return Response.json({ comment, wants });
  } catch (error) {
    console.error("wants-distiller: call failed", error);
    return Response.json({ error: AI_ERROR_MESSAGE }, { status: 500 });
  }
}
