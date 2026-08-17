import { withAiRoute } from "@/lib/anthropic/ask-model";
import { readModelJson, readText } from "@/lib/anthropic/model-json";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/messy-guilt-coach";
import {
  type RightResult,
  findRightSentence,
  rescueMatch,
  resolveMatch,
} from "@/lib/anthropic/right-match";
import type { RightItem } from "@/lib/types/db-json";
import { TEXT_MAX_SHORT } from "@/lib/utils/form-validation";
import {
  patchJournalContent,
  readJournalContent,
} from "@/lib/utils/journal-content";

// Entry texts come from the user's own DB (already length-capped at save time),
// so defensively truncate instead of 400ing — max_tokens only bounds the OUTPUT.
const MAX_ENTRY_LEN = 2000;
const MAX_RIGHTS_IN_PROMPT = 100;

const AI_ERROR_MESSAGE =
  "Die Auswertung hat gerade nicht geklappt. Dein Eintrag ist gespeichert — versuch es gleich noch einmal.";

/** Geparste Modell-Antwort inkl. Schuld-Vermutung und Regel-Benennung. */
type CoachResult = {
  analysis: string;
  guilt: "healthy" | "unhealthy" | null;
  rules: string | null;
  right: RightResult;
};

function clampText(value: string): string {
  return value.slice(0, MAX_ENTRY_LEN);
}

/** Die Feldreihenfolge, die der System-Prompt vorschreibt — zugleich die
 *  Anker-Kette, über die sich Werte aus kaputtem JSON retten lassen. */
const FIELD_ORDER = ["analysis", "guilt", "rules", "match"] as const;

/**
 * Parse the model output. Die Analyse ist die Nutzlast — ohne sie gibt es
 * nichts zu zeigen, also 502. Einordnung, Regeln-Satz und Recht dürfen fehlen
 * (kein Badge, keine Regeln-Zeile, kein Rechts-Vorschlag). Für "existing"
 * kommt der Text immer aus der DB-Liste, nie aus der Modellantwort.
 */
function parseModelOutput(
  raw: string,
  activeRights: RightItem[],
): CoachResult | null {
  const output = readModelJson(raw, { fieldOrder: FIELD_ORDER });
  if (!output) return null;

  // Prosa statt JSON: der Text IST die Analyse, und ein "Ich habe das
  // Recht …"-Satz darin wird zum Vorschlag.
  if (output.source === "prose") return parseProse(output.text);

  const analysis = readText(output.fields, "analysis");
  if (!analysis) return null;

  const rawGuilt = output.fields.guilt;
  const guilt =
    rawGuilt === "healthy" || rawGuilt === "unhealthy" ? rawGuilt : null;

  // `match` ist ein Objekt und überlebt die Anker-Rettung nicht — aus
  // geretteter Antwort muss es aus dem Rohtext geschnitten werden.
  const right =
    output.source === "json"
      ? resolveMatch(output.fields.match, activeRights, TEXT_MAX_SHORT)
      : rescueMatch(output.text, activeRights, TEXT_MAX_SHORT);

  return {
    analysis,
    guilt,
    rules: readText(output.fields, "rules", TEXT_MAX_SHORT),
    right,
  };
}

function parseProse(text: string): CoachResult {
  const sentence = findRightSentence(text, TEXT_MAX_SHORT);
  if (!sentence) {
    return { analysis: text, guilt: null, rules: null, right: null };
  }
  const analysis = text.replace(sentence, "").trim();
  return {
    analysis: analysis || text,
    guilt: null,
    rules: null,
    right: { type: "new", text: sentence },
  };
}

/**
 * Analyse a saved "Things Got Messy" reflection against the user's Bill of
 * Rights. Accepts { entryId } (texts and rights are re-loaded server-side via
 * the RLS-scoped client) and returns { analysis, right }. The result is also
 * persisted onto the entry's ai_insights column.
 */
export const POST = withAiRoute(
  { endpoint: "messy-guilt-coach", failure: AI_ERROR_MESSAGE },
  async ({ supabase, user, askModel }, request) => {
    const { entryId } = (await request.json()) as { entryId?: string };

    if (!entryId || typeof entryId !== "string") {
      return Response.json(
        { error: "Es fehlt der Eintrag für die Auswertung." },
        { status: 400 },
      );
    }

    // Die zwei Reads sind unabhängig → parallel laden.
    const [{ data: entry }, { data: bor }] = await Promise.all([
      supabase
        .from("journal_entries")
        .select("id, template_type, content")
        .eq("id", entryId)
        .eq("user_id", user.id)
        .eq("recipe_slug", "things-got-messy")
        .eq("template_type", "messy_moment")
        .maybeSingle(),
      supabase
        .from("bill_of_rights")
        .select("rights")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    // Ein content ohne messy_when ist für diese Route so gut wie kein Eintrag —
    // die Route hätte sonst ein leeres <messy_when> ans Modell geschickt.
    const moment = entry
      ? readJournalContent(entry.template_type, entry.content)
      : null;
    if (!entry || moment?.template !== "messy_moment") {
      return Response.json(
        { error: "Wir konnten deinen Eintrag nicht finden." },
        { status: 404 },
      );
    }
    const { content } = moment;

    const activeRights = ((bor?.rights as RightItem[] | null) ?? [])
      .filter((r) => r.active)
      .slice(0, MAX_RIGHTS_IN_PROMPT)
      .map((r) => ({ ...r, text: r.text.slice(0, TEXT_MAX_SHORT) }));

    const rightsText =
      activeRights.length > 0
        ? activeRights
            .map((r) => `<right id="${r.id}">${r.text}</right>`)
            .join("\n")
        : "(noch keine Rechte vorhanden — es muss ein neues vorgeschlagen werden)";

    const answer = await askModel({
      system: SYSTEM_PROMPT,
      // Analyse (2–4 Sätze) + Einordnung + Regeln-Satz + JSON-Gerüst +
      // Rechts-Satz — 700 lässt Luft, damit nie mitten im Satz abgeschnitten wird.
      maxTokens: 700,
      message: `Was passiert ist und wo sich das Schuldgefühl gemeldet hat:
<messy_when>${clampText(content.messy_when) || "(keine Angabe)"}</messy_when>

Die bisherigen Rechte der Person:
<rights>
${rightsText}
</rights>`,
    });
    if (answer.failure !== null) return answer.failure;

    const result = parseModelOutput(answer.text, activeRights);
    if (!result) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }
    const { analysis, guilt, rules, right } = result;

    // Persist onto the entry: die maschinenlesbare Vermutung wandert ins
    // content-JSONB (fürs Journal-Rendering), der Lesetext in ai_insights.
    // WICHTIG: content mergen, nie ersetzen — sonst ist messy_when weg.
    const mergedContent = patchJournalContent("messy_moment", entry.content, {
      ai_guilt_guess: guilt,
      ai_rules_conflict: rules,
    });

    const insightParts = [analysis];
    if (guilt) {
      insightParts.push(
        `Vermutung: ${guilt === "healthy" ? "gesunde Schuld" : "ungesunde Schuld"}`,
      );
    }
    if (rules) {
      insightParts.push(`Die Regeln im Konflikt: ${rules}`);
    }
    if (right?.type === "existing") {
      insightParts.push(
        `Passendes Recht aus deinem Bill of Rights: ${right.text}`,
      );
    } else if (right?.type === "new") {
      insightParts.push(`Vorschlag für ein neues Recht: ${right.text}`);
    }
    await supabase
      .from("journal_entries")
      .update({
        content: mergedContent,
        ai_insights: insightParts.filter(Boolean).join("\n\n"),
      })
      .eq("id", entry.id);

    return Response.json({ analysis, guilt, rules, right });
  },
);
