import { withAiRoute } from "@/lib/anthropic/ask-model";
import { readModelJson, readText } from "@/lib/anthropic/model-json";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/rights-formulator";
import { findRightSentence } from "@/lib/anthropic/right-match";
import { TEXT_MAX_SHORT } from "@/lib/utils/form-validation";

// Cap per-field input length so a single allowed call can't drive up input-token
// costs. max_tokens only bounds the OUTPUT.
const MAX_INPUT_LEN = 2000;

const AI_ERROR_MESSAGE =
  "Wir konnten gerade keinen Vorschlag erstellen. Versuch es noch einmal.";

/** Geparste Modell-Antwort: einfühlsame Analyse und alte Regel (können bei
 *  kaputtem JSON fehlen) sowie das neue Recht. */
type FormulatorResult = {
  analysis: string | null;
  oldRule: string | null;
  newRight: string;
};

/** Die Feldreihenfolge, die der System-Prompt vorschreibt — zugleich die
 *  Anker-Kette, über die sich Werte aus kaputtem JSON retten lassen. */
const FIELD_ORDER = ["analysis", "old_rule", "new_right"] as const;

/**
 * Parse the model output. Das neue Recht ist die Nutzlast — ohne es gibt es
 * keine Duell-Ansicht, also 502. Analyse und alte Regel dürfen fehlen (die
 * Ansicht zeigt das Recht dann ohne Vortext und ohne Gegner). Antwortet das
 * Modell in Prosa statt in JSON, trägt ein "Ich habe das Recht …"-Satz die
 * Bühne auch allein.
 */
function parseModelOutput(raw: string): FormulatorResult | null {
  const output = readModelJson(raw, { fieldOrder: FIELD_ORDER });
  if (!output) return null;

  const newRight = readText(output.fields, "new_right", TEXT_MAX_SHORT);
  if (newRight) {
    return {
      analysis: readText(output.fields, "analysis"),
      oldRule: readText(output.fields, "old_rule", TEXT_MAX_SHORT),
      newRight,
    };
  }

  if (output.source === "prose") {
    const sentence = findRightSentence(output.text, TEXT_MAX_SHORT);
    if (sentence) {
      return { analysis: null, oldRule: null, newRight: sentence };
    }
  }

  return null;
}

/**
 * Name the two inner rules behind a moment of inner conflict (Recipe #3 –
 * Bill of Rights): the old people-pleaser rule and a new empowering
 * "Ich habe das Recht, …" statement, plus a short empathetic analysis.
 * Accepts { situation } and returns { analysis, oldRule, newRight }.
 */
export const POST = withAiRoute(
  { endpoint: "rights-formulator", failure: AI_ERROR_MESSAGE },
  async ({ askModel }, request) => {
    const { situation } = (await request.json()) as { situation?: string };

    if (!situation?.trim()) {
      return Response.json(
        { error: "Bitte beschreib zuerst deine Situation." },
        { status: 400 },
      );
    }

    if (situation.trim().length > MAX_INPUT_LEN) {
      return Response.json(
        {
          error:
            "Deine Eingabe ist etwas lang geraten. Kürze sie bitte ein wenig und versuch es noch einmal.",
        },
        { status: 400 },
      );
    }

    const answer = await askModel({
      system: SYSTEM_PROMPT,
      maxTokens: 450,
      message: `Situation, in der ich einen inneren Konflikt gespürt habe:
<situation>${situation.trim()}</situation>`,
    });
    if (answer.failure !== null) return answer.failure;

    const result = parseModelOutput(answer.text);
    if (!result) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }

    return Response.json(result);
  },
);
