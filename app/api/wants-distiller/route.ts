import { anthropic } from "@/lib/anthropic/client";
import { readModelJson, readText } from "@/lib/anthropic/model-json";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/wants-distiller";
import {
  RATE_LIMIT_MESSAGE,
  WANTS_DISTILLER_LIMIT,
  checkRateLimit,
  logUsage,
} from "@/lib/anthropic/rate-limit";
import { SESSION_EXPIRED } from "@/lib/actions/action-result";
import { createClient } from "@/lib/supabase/server";
import { TEXT_MAX_SHORT } from "@/lib/utils/form-validation";
import {
  patchJournalContent,
  readJournalContent,
} from "@/lib/utils/journal-content";
import { getValueLabel } from "@/lib/utils/values-bank";

// Audit texts come from the user's own DB (length-capped at save time), so
// defensively truncate instead of 400ing — max_tokens only bounds the OUTPUT.
const MAX_ENTRY_LEN = 2000;
const MAX_VALUES_IN_PROMPT = 20;
// Obergrenzen für die Modell-Listen — mehr wird still verworfen.
const MAX_WANTS_OUT = 9;
/** Ein Titel ist eine Überschrift, kein Satz. */
const MAX_TITLE_LEN = 60;

const AI_ERROR_MESSAGE =
  "Das Destillieren hat gerade nicht geklappt. Dein Audit ist gespeichert — du kannst deine Wants auch selbst formulieren.";

/** Ein destillierter Wants/Stern (value gegen die DB-Werte aufgelöst). */
type WantSuggestion = {
  text: string;
  title: string | null;
  valueId: string | null;
  valueLabel: string | null;
  reason: string | null;
  question: string | null;
  distance: "nah" | "fern";
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
    const fields = item as Record<string, unknown>;
    const text = readText(fields, "text", TEXT_MAX_SHORT);
    if (!text) continue;

    const rawValueId = readText(fields, "value_id");
    const valueId = rawValueId && valueIds.has(rawValueId) ? rawValueId : null;

    wants.push({
      text,
      title: readText(fields, "title", MAX_TITLE_LEN),
      valueId,
      valueLabel: valueId ? getValueLabel(valueId) : null,
      reason: readText(fields, "reason", TEXT_MAX_SHORT),
      question: readText(fields, "question", TEXT_MAX_SHORT),
      distance: fields.distance === "fern" ? "fern" : "nah",
    });
  }

  return wants;
}

/** Die Feldreihenfolge, die der System-Prompt vorschreibt. */
const FIELD_ORDER = ["comment", "wants"] as const;

/**
 * Parse the model output. Die Wants-Liste ist per Anker nicht rettbar — bei
 * kaputtem JSON degradiert die Antwort deshalb gestuft auf comment-only, und
 * die UI wechselt in den manuellen Modus. Erst wenn auch der Kommentar fehlt,
 * ist es ein Ausfall (`null` → 502).
 *
 * Umgekehrt gilt seit der Vereinheitlichung: Wants OHNE Kommentar sind ein
 * gültiges Ergebnis (vorher 502). Die Sterne sind die Nutzlast dieser Übung —
 * sie wegzuwerfen, weil das Rahmen-Sätzchen fehlt, wäre der teurere Fehler.
 * Gleiche Regel wie in `sternschmiede-result.ts`.
 */
function parseModelOutput(
  raw: string,
  valueIds: Set<string>,
): DistillerResult | null {
  const output = readModelJson(raw, { fieldOrder: FIELD_ORDER });
  if (!output) return null;

  const comment = readText(output.fields, "comment");
  const wants =
    output.source === "json" ? parseWants(output.fields.wants, valueIds) : [];

  if (!comment && wants.length === 0) return null;
  return { comment: comment ?? "", wants };
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
      { error: SESSION_EXPIRED },
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
      .select("id, template_type, content")
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

  // Ein content ohne yin/yang verengt gar nicht erst zu einem Audit — für
  // diese Route derselbe Befund wie leere Felder: noch nicht vollständig.
  const audit = readJournalContent(entry.template_type, entry.content);
  const content = audit.template === "yin_yang" ? audit.content : null;
  const yin = content?.yin.trim();
  const yang = content?.yang.trim();
  if (!content || !yin || !yang) {
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
<tagtraeume>${clampText((content.tagtraum ?? "").trim()) || "(keine Angabe)"}</tagtraeume>

Die bestätigten Werte der Person:
<werte>
${valuesText}
</werte>`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      // Kommentar + bis zu 9 Wants (text/title/value_id/reason/question/
      // distance) + JSON-Gerüst — 1600 lässt extra Luft für Titel und bis
      // zu 3 zusätzliche ferne Wants, damit nie mitten im Satz
      // abgeschnitten wird.
      max_tokens: 1600,
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

    const result = parseModelOutput(raw, valueIds);
    if (!result) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }
    const { comment, wants } = result;

    // Persist onto the entry: die Sterne als Provenienz ins content-JSONB,
    // der Lesetext in ai_insights. WICHTIG: content mergen, nie ersetzen.
    const mergedContent = patchJournalContent("yin_yang", entry.content, {
      ai_wants: wants.map((w) => ({ text: w.text, value_id: w.valueId })),
    });

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
