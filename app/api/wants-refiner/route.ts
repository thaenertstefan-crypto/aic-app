import { withAiRoute } from "@/lib/anthropic/ask-model";
import { readModelJson, readText } from "@/lib/anthropic/model-json";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/wants-refiner";
import { TEXT_MAX_SHORT } from "@/lib/utils/form-validation";
import { readJournalContent } from "@/lib/utils/journal-content";

const MAX_ENTRY_LEN = 2000;
const MAX_FIELD_LEN = 500;

const AI_ERROR_MESSAGE =
  "Das Nachschärfen hat gerade nicht geklappt. Du kannst dein Want auch selbst anpassen.";

function clamp(value: string, max: number): string {
  return value.slice(0, max);
}

/** Parst `{"text": "…"}`. Das einzige Feld ist zugleich die Nutzlast: fehlt es,
 *  gibt es nichts zu zeigen, und die Route antwortet mit 502. */
function parseRefined(raw: string): string | null {
  const output = readModelJson(raw, { fieldOrder: ["text"] });
  if (!output) return null;
  return readText(output.fields, "text", TEXT_MAX_SHORT);
}

export const POST = withAiRoute(
  { endpoint: "wants-refiner", failure: AI_ERROR_MESSAGE },
  async ({ supabase, user, askModel }, request) => {
    const body = (await request.json().catch(() => ({}))) as {
      entryId?: unknown;
      text?: unknown;
      question?: unknown;
      answer?: unknown;
    };
    const entryId = typeof body.entryId === "string" ? body.entryId : "";
    const wantText = typeof body.text === "string" ? body.text.trim() : "";
    const question =
      typeof body.question === "string" ? body.question.trim() : "";
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";

    if (!entryId || !wantText || !answer) {
      return Response.json(
        { error: "Es fehlen Angaben zum Nachschärfen." },
        { status: 400 },
      );
    }

    const { data: entry } = await supabase
      .from("journal_entries")
      .select("id, template_type, content")
      .eq("id", entryId)
      .eq("user_id", user.id)
      .eq("recipe_slug", "wants")
      .eq("template_type", "yin_yang")
      .maybeSingle();

    // Ein Eintrag, dessen content kein Audit ist, ist für diese Route dasselbe
    // wie kein Eintrag — vorher lief er als Audit aus lauter Leerstrings weiter
    // und verbrauchte dabei ein Kontingent.
    const audit = entry
      ? readJournalContent(entry.template_type, entry.content)
      : null;
    if (audit?.template !== "yin_yang") {
      return Response.json(
        { error: "Wir konnten dein Audit nicht finden." },
        { status: 404 },
      );
    }
    const { content } = audit;

    const auditText = [content.yin, content.yang, content.principles ?? ""]
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n");

    const result = await askModel({
      system: SYSTEM_PROMPT,
      maxTokens: 200,
      message: `<audit>${clamp(auditText, MAX_ENTRY_LEN)}</audit>
<want>${clamp(wantText, MAX_FIELD_LEN)}</want>
<frage>${clamp(question, MAX_FIELD_LEN) || "(keine)"}</frage>
<antwort>${clamp(answer, MAX_FIELD_LEN)}</antwort>`,
    });
    if (result.failure !== null) return result.failure;

    const refined = parseRefined(result.text);
    if (!refined) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }

    return Response.json({ text: refined });
  },
);
