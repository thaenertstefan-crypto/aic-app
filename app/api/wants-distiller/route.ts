import { withAiRoute } from "@/lib/anthropic/ask-model";
import { readModelJson, readText } from "@/lib/anthropic/model-json";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/wants-distiller";
import { wantSentence } from "@/lib/recipes/wants/items";
import {
  ANSWER_LIST_MAX,
  ANSWER_MAX,
  filledAnswers,
} from "@/lib/recipes/wants/state";
import { TEXT_MAX_SHORT } from "@/lib/utils/form-validation";
import {
  patchJournalContent,
  readJournalContent,
} from "@/lib/utils/journal-content";
import { recipeSlugFor } from "@/lib/utils/journal-recipe-slug";
import { getValueLabel } from "@/lib/utils/values-bank";

// Audit texts come from the user's own DB (length-capped at save time), so
// defensively truncate instead of 400ing — max_tokens only bounds the OUTPUT.
// Die Kappung ist die Boxen-Rechnung, keine frei gesetzte Zahl: sechs
// Antwortfelder à 800 Zeichen. Eine freie 2000 schnitt hier still ab.
const MAX_ENTRY_LEN = ANSWER_LIST_MAX;
const MAX_VALUES_IN_PROMPT = 20;
// Obergrenze für die Modell-Liste — sie trägt seit ADR-0005 nur noch die
// NAHEN Sterne; die fernen laufen am Modell vorbei.
const MAX_WANTS_OUT = 9;
/** Ein Titel ist eine Überschrift, kein Satz. */
const MAX_TITLE_LEN = 60;

const AI_ERROR_MESSAGE =
  "Das Destillieren hat gerade nicht geklappt. Dein Audit ist gespeichert — du kannst deine Wants auch selbst formulieren.";

/** Ein destillierter Stern (value gegen die DB-Werte aufgelöst). Immer nah:
 *  ferne Sterne baut der Client aus den Antwortfeldern selbst (ADR-0005),
 *  das Modell kann gar keinen mehr liefern. */
type WantSuggestion = {
  text: string;
  title: string | null;
  /** Der konkrete Anker — eigenes Feld, nicht „— z. B. …" im Satz. */
  example: string | null;
  valueId: string | null;
  valueLabel: string | null;
  reason: string | null;
  question: string | null;
};

type DistillerResult = {
  comment: string;
  wants: WantSuggestion[];
  /** Ein Name je fernem Stern, in der Reihenfolge der Antwortfelder. */
  farTitles: (string | null)[];
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
      example: readText(fields, "example", TEXT_MAX_SHORT),
      valueId,
      valueLabel: valueId ? getValueLabel(valueId) : null,
      reason: readText(fields, "reason", TEXT_MAX_SHORT),
      question: readText(fields, "question", TEXT_MAX_SHORT),
    });
  }

  return wants;
}

/**
 * Die Namen für die fernen Sterne — positionsgebunden.
 *
 * `count` ist die Zahl der fernen Sterne, die der Client gebaut hat. Liefert
 * das Modell weniger (oder Unsinn an einer Stelle), bleibt dort `null`: der
 * Stern steht trotzdem, ihm fehlt nur der Name.
 */
function parseTitles(raw: unknown, count: number): (string | null)[] {
  const list: unknown[] = Array.isArray(raw) ? raw : [];
  return Array.from({ length: count }, (_, i) => {
    const value = list[i];
    if (typeof value !== "string") return null;
    const title = value.trim().slice(0, MAX_TITLE_LEN);
    return title || null;
  });
}

/** Die Feldreihenfolge, die der System-Prompt vorschreibt. */
const FIELD_ORDER = ["comment", "wants", "titles"] as const;

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
  farCount: number,
): DistillerResult | null {
  const output = readModelJson(raw, { fieldOrder: FIELD_ORDER });
  if (!output) return null;

  const comment = readText(output.fields, "comment");
  const isJson = output.source === "json";
  const wants = isJson ? parseWants(output.fields.wants, valueIds) : [];
  const farTitles = parseTitles(
    isJson ? output.fields.titles : null,
    farCount,
  );

  if (!comment && wants.length === 0) return null;
  return { comment: comment ?? "", wants, farTitles };
}

/**
 * Der Wants-Destillierer (Rezept #2 — Was du wirklich willst). Accepts
 * { entryId } eines yin_yang-Eintrags — Audit-Texte und bestätigte Werte
 * werden serverseitig über den RLS-Client nachgeladen (entryId-first).
 * Die Sterne werden zusätzlich auf den Eintrag persistiert
 * (content.ai_wants + ai_insights).
 */
export const POST = withAiRoute(
  { endpoint: "wants-distiller", failure: AI_ERROR_MESSAGE },
  async ({ supabase, user, askModel }, request) => {
    const body = (await request.json().catch(() => ({}))) as {
      entryId?: unknown;
    };
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
        .eq("recipe_slug", recipeSlugFor("yin_yang"))
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

    const valuesText =
      values.length > 0
        ? values
            .map((id) => `<wert id="${id}">${getValueLabel(id)}</wert>`)
            .join("\n")
        : "(noch keine bestätigten Werte — gib bei allen Wants value_id null an)";

    // Die fernen Sterne stehen beim Client schon — hier gehen sie nur
    // wörtlich mit, damit das Modell im selben Aufruf Namen dafür findet.
    // Dieselbe Rechnung wie im Client (`filledAnswers`), sonst säßen die
    // Namen an den falschen Sternen.
    const farTexts = filledAnswers(content.tagtraum_answers ?? []).map((text) =>
      text.slice(0, ANSWER_MAX),
    );

    const farText =
      farTexts.length > 0
        ? farTexts
            .map((text, i) => `<stern nr="${i + 1}">${text}</stern>`)
            .join("\n")
        : "(keine fernen Sterne — gib titles als leere Liste zurück)";

    const answer = await askModel({
      system: SYSTEM_PROMPT,
      // Kommentar + bis zu 9 nahe Sterne (text/title/example/value_id/
      // reason/question) + bis zu 6 Titel + JSON-Gerüst — 1800 lässt Luft,
      // damit nie mitten im Satz abgeschnitten wird.
      maxTokens: 1800,
      message: `Das Yin-&-Yang-Audit der Person:
<yin>${clampText(yin)}</yin>
<yang>${clampText(yang)}</yang>
<prinzipien>${clampText((content.principles ?? "").trim()) || "(keine Angabe)"}</prinzipien>

Ihre fernen Sterne, je einer im eigenen Wortlaut — du gibst ihnen nur Namen:
<ferne>
${farText}
</ferne>

Die bestätigten Werte der Person:
<werte>
${valuesText}
</werte>`,
    });
    if (answer.failure !== null) return answer.failure;

    const result = parseModelOutput(answer.text, valueIds, farTexts.length);
    if (!result) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }
    const { comment, wants, farTitles } = result;

    // Persist onto the entry: die Sterne als Provenienz ins content-JSONB,
    // der Lesetext in ai_insights. WICHTIG: content mergen, nie ersetzen.
    // Für die Provenienz zählt der Satz, wie ihn die Person liest — das
    // Beispiel gehört dazu, auch wenn es als eigenes Feld herkommt.
    const mergedContent = patchJournalContent("yin_yang", entry.content, {
      ai_wants: wants.map((w) => ({
        text: wantSentence(w),
        value_id: w.valueId,
      })),
    });

    const insightParts = [comment];
    if (wants.length > 0) {
      insightParts.push(
        wants
          .map(
            (w) =>
              `• ${wantSentence(w)}${w.valueLabel ? ` (Wert: ${w.valueLabel})` : ""}`,
          )
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

    return Response.json({ comment, wants, farTitles });
  },
);
