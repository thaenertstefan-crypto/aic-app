import { withAiRoute } from "@/lib/anthropic/ask-model";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/wants-distiller";
import {
  parseDistillerOutput,
  type AnswerSource,
} from "@/lib/anthropic/wants-distiller-result";
import { wantSentence } from "@/lib/recipes/wants/items";
import {
  ANSWER_LIST_MAX,
  ANSWER_MAX,
  MAX_ANSWER_BOXES,
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
// Antwortfelder à 800 Zeichen. Eine freie 2000 schnitt hier still ab. Sie
// gilt noch für die Prinzipien (ein Freitextfeld) und für den Lesetext eines
// Alt-Eintrags; die Antwortfelder selbst werden einzeln gedeckelt.
const MAX_ENTRY_LEN = ANSWER_LIST_MAX;
const MAX_VALUES_IN_PROMPT = 20;

const AI_ERROR_MESSAGE =
  "Das Destillieren hat gerade nicht geklappt. Dein Audit ist gespeichert — du kannst deine Wants auch selbst formulieren.";

function clampText(value: string): string {
  return value.slice(0, MAX_ENTRY_LEN);
}

/**
 * Die Antwortfelder einer Frage — der Adressraum der Zitat-Zeiger.
 *
 * Das Modell zeigt mit `{"frage": …, "nr": …}` auf eine Position dieser Liste
 * zurück, und `parseDistillerOutput` löst gegen dieselbe Liste auf. Deshalb
 * wird sie genau einmal gebaut und an beide Stellen gereicht — zwei
 * Rechnungen wären zwei Gelegenheiten, die Belege an die falschen Sterne zu
 * hängen.
 *
 * **Alt-Einträge haben die Liste nicht** (s. `YinYangContent`) — der
 * Normalfall der Lesefunktion, kein Sonderfall. Dann ist sie hier **leer**,
 * und der Eintrag bekommt gar keine Belege. Das ist ADR-0005 von der anderen
 * Seite: aus dem zusammengefügten Lesetext sind die Feldgrenzen nicht
 * zurückzugewinnen, also gibt es dort nichts, was ein Zitat sein könnte. Ein
 * Zeiger auf „den ganzen Block" wäre kein Beleg, sondern das halbe Audit
 * unter jedem einzelnen Stern.
 */
function quotableAnswers(answers: string[] | undefined): string[] {
  return (answers ?? []).slice(0, MAX_ANSWER_BOXES).map((text) =>
    text.slice(0, ANSWER_MAX),
  );
}

/**
 * Eine Frage, wie das Modell sie liest.
 *
 * Mit Feldgrenzen als nummerierte `<antwort>`-Felder — die Nummern sind es,
 * worauf `quotes` zeigt. Ohne Feldgrenzen (Alt-Eintrag) steht dort schlicht
 * der zusammengefügte Lesetext: destillieren lässt sich daraus weiterhin,
 * zitieren nicht.
 */
function questionForPrompt(answers: string[], joined: string): string {
  if (answers.length === 0) return clampText(joined);
  return answers
    .map((text, i) => `<antwort nr="${i + 1}">${text}</antwort>`)
    .join("\n");
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

    // Der Adressraum der Zitat-Zeiger. Bewusst NICHT `filledAnswers`: gezählt
    // wird die Position im Formular, wie sie das Modell nummeriert sieht —
    // ein leeres Feld dazwischen darf die Nummern der folgenden nicht
    // verschieben. Leere Felder fallen erst beim Auflösen weg.
    const answers: AnswerSource = {
      yin: quotableAnswers(content.yin_answers),
      yang: quotableAnswers(content.yang_answers),
    };

    const farText =
      farTexts.length > 0
        ? farTexts
            .map((text, i) => `<stern nr="${i + 1}">${text}</stern>`)
            .join("\n")
        : "(keine fernen Sterne — gib titles als leere Liste zurück)";

    const answer = await askModel({
      system: SYSTEM_PROMPT,
      // Kommentar + bis zu MAX_WANTS_OUT nahe Sterne (text/title/example/
      // value_id/quotes/question + seit KAN-45 ein reason-ABSATZ statt eines
      // Satzes) + bis zu 6 Titel + JSON-Gerüst. ~250 Tokens je Stern,
      // aufgerundet: 3600 lässt Luft, damit nie mitten im Absatz
      // abgeschnitten wird.
      maxTokens: 3600,
      message: `Das Yin-&-Yang-Audit der Person:
<yin>
${questionForPrompt(answers.yin, yin)}
</yin>
<yang>
${questionForPrompt(answers.yang, yang)}
</yang>
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

    const result = parseDistillerOutput(answer.text, {
      valueIds,
      answers,
      farCount: farTexts.length,
      maxTextLen: TEXT_MAX_SHORT,
    });
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
