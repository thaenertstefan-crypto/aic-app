import { type AiRouteContext, withAiRoute } from "@/lib/anthropic/ask-model";
import {
  readModelJson,
  readText,
  unescapeJsonString,
} from "@/lib/anthropic/model-json";
import { SYSTEM_PROMPT as COACH_PROMPT } from "@/lib/anthropic/prompts/saying-no-coach";
import { SYSTEM_PROMPT as SCENARIO_PROMPT } from "@/lib/anthropic/prompts/saying-no-scenario";
import {
  type RightResult,
  rescueMatch,
  resolveMatch,
} from "@/lib/anthropic/right-match";
import type { RightItem, SayingNoChecklist } from "@/lib/types/db-json";
import { TEXT_MAX_LONG, TEXT_MAX_SHORT } from "@/lib/utils/form-validation";
import {
  patchJournalContent,
  readJournalContent,
} from "@/lib/utils/journal-content";

// Entry texts come from the user's own DB (already length-capped at save time),
// so defensively truncate instead of 400ing — max_tokens only bounds the OUTPUT.
const MAX_ENTRY_LEN = 2000;
const MAX_RIGHTS_IN_PROMPT = 100;
// Bereits gesehene Szenarien fürs Reroll: kurze Anfangs-Snippets reichen.
const MAX_EXCLUDE_ITEMS = 5;
const MAX_EXCLUDE_LEN = 80;

const AI_ERROR_MESSAGE =
  "Das Feedback hat gerade nicht geklappt. Dein Nein ist gespeichert — versuch es gleich noch einmal.";
const SCENARIO_ERROR_MESSAGE =
  "Wir konnten gerade kein Szenario erfinden. Versuch es noch einmal.";

/** Eine bewertete Blueprint-Schicht (pass + kurze Begründung). */
type ChecklistItem = { pass: boolean; note: string };

/** Geparste Modell-Antwort des Feedback-Modus. */
type CoachResult = {
  comment: string;
  checklist: Record<keyof SayingNoChecklist, ChecklistItem> | null;
  improved: string | null;
  right: RightResult;
};

const CHECKLIST_KEYS = [
  "complete_sentence",
  "no_apology",
  "warmth",
  "no_but",
] as const;

function clampText(value: string): string {
  return value.slice(0, MAX_ENTRY_LEN);
}

/** Validiert das checklist-Objekt Key für Key; ein einzelner kaputter Key
 *  verwirft nicht die ganze Liste, sondern nur, wenn am Ende keiner valide ist. */
function parseChecklist(raw: unknown): CoachResult["checklist"] {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const result = {} as Record<keyof SayingNoChecklist, ChecklistItem>;
  let validCount = 0;

  for (const key of CHECKLIST_KEYS) {
    const item = source[key];
    if (item && typeof item === "object") {
      const pass = (item as { pass?: unknown }).pass;
      const note = (item as { note?: unknown }).note;
      if (typeof pass === "boolean") {
        result[key] = {
          pass,
          note:
            typeof note === "string" ? note.trim().slice(0, TEXT_MAX_SHORT) : "",
        };
        validCount++;
        continue;
      }
    }
    return null; // Die UI zeigt die Checklist nur komplett — 4 Zeilen oder keine.
  }

  return validCount === CHECKLIST_KEYS.length ? result : null;
}

/** Holt die Checklist aus kaputtem JSON. Die pass-Booleans sind robust
 *  extrahierbar (kein String-Quoting), die notes hängen zwischen
 *  `"note": "…"` und der schließenden Klammer. */
function rescueChecklist(text: string): CoachResult["checklist"] {
  const checklist = {} as Record<keyof SayingNoChecklist, ChecklistItem>;
  for (const key of CHECKLIST_KEYS) {
    const item = text.match(
      new RegExp(
        `"${key}"\\s*:\\s*\\{\\s*"pass"\\s*:\\s*(true|false)\\s*,\\s*"note"\\s*:\\s*"([\\s\\S]*?)"\\s*\\}`,
      ),
    );
    if (!item) return null; // Die UI zeigt die Checklist nur komplett.
    checklist[key] = {
      pass: item[1] === "true",
      note: unescapeJsonString(item[2]).slice(0, TEXT_MAX_SHORT),
    };
  }
  return checklist;
}

/** Die Feldreihenfolge, die der Coach-Prompt vorschreibt — zugleich die
 *  Anker-Kette, über die sich Werte aus kaputtem JSON retten lassen. */
const FIELD_ORDER = ["comment", "checklist", "improved", "match"] as const;

/**
 * Parse the feedback-mode model output. Der Kommentar ist die Nutzlast — ohne
 * ihn gibt es nichts zu zeigen, also 502. Checklist, verbesserte Fassung und
 * Recht dürfen fehlen; die UI zeigt dann nur den Kommentar.
 */
function parseModelOutput(
  raw: string,
  activeRights: RightItem[],
): CoachResult | null {
  const output = readModelJson(raw, { fieldOrder: FIELD_ORDER });
  if (!output) return null;

  // Prosa statt JSON: der Text ist der Kommentar, mehr ist nicht darin.
  if (output.source === "prose") {
    return { comment: output.text, checklist: null, improved: null, right: null };
  }

  const comment = readText(output.fields, "comment");
  if (!comment) return null;

  // Checklist und match sind verschachtelt und überleben die Anker-Rettung
  // nicht — aus geretteter Antwort müssen sie aus dem Rohtext kommen.
  const fromJson = output.source === "json";
  return {
    comment,
    checklist: fromJson
      ? parseChecklist(output.fields.checklist)
      : rescueChecklist(output.text),
    improved: readText(output.fields, "improved", TEXT_MAX_LONG),
    right: fromJson
      ? resolveMatch(output.fields.match, activeRights, TEXT_MAX_SHORT)
      : rescueMatch(output.text, activeRights, TEXT_MAX_SHORT),
  };
}

/** Kompakte Lesefassung des Blueprint-Checks für ai_insights. */
function checklistSummary(
  checklist: Record<keyof SayingNoChecklist, ChecklistItem>,
): string {
  const layerLabels: Record<keyof SayingNoChecklist, string> = {
    complete_sentence: "„Nein.“ ist ein vollständiger Satz",
    no_apology: "Keine Entschuldigungen",
    warmth: "Wärme zuerst",
    no_but: "Kein „aber“",
  };
  const passed = CHECKLIST_KEYS.filter((k) => checklist[k].pass).length;
  const lines = [`Blueprint-Check: ${passed} von 4 Schichten`];
  for (const key of CHECKLIST_KEYS) {
    if (!checklist[key].pass && checklist[key].note) {
      lines.push(`${layerLabels[key]}: ${checklist[key].note}`);
    }
  }
  return lines.join("\n");
}

/**
 * Der Nein-Trainer-Coach (Rezept #4 — Saying 'No' Blueprint). Zwei Modi:
 *
 * - mode "scenario": erfindet ein Übungsszenario. Kein DB-Zugriff; der Client
 *   schickt höchstens Anfangs-Snippets bereits gesehener Szenarien.
 * - mode "feedback": bewertet den gespeicherten Nein-Entwurf gegen die vier
 *   Blueprint-Schichten. Accepts { entryId } — Texte und Rechte werden
 *   serverseitig über den RLS-Client nachgeladen. Das Ergebnis wird zusätzlich
 *   auf den Eintrag persistiert (content-Merge + ai_insights).
 */
export const POST = withAiRoute(
  { endpoint: "saying-no-coach", failure: AI_ERROR_MESSAGE },
  async (ctx, request) => {
    const body = (await request.json()) as {
      mode?: "scenario" | "feedback";
      entryId?: string;
      exclude?: unknown;
    };

    if (body.mode === "scenario") {
      return handleScenario(ctx, body.exclude);
    }
    if (body.mode === "feedback") {
      return handleFeedback(ctx, body.entryId);
    }

    return Response.json({ error: "Unbekannter Modus." }, { status: 400 });
  },
);

async function handleScenario(
  { askModel }: AiRouteContext,
  excludeRaw: unknown,
) {
  const exclude = (Array.isArray(excludeRaw) ? excludeRaw : [])
    .filter((s): s is string => typeof s === "string" && Boolean(s.trim()))
    .slice(0, MAX_EXCLUDE_ITEMS)
    .map((s) => s.trim().slice(0, MAX_EXCLUDE_LEN));

  const answer = await askModel({
    system: SCENARIO_PROMPT,
    // 2–4 Sätze Szenario — 250 lässt Luft, damit die Bitte am Ende nie
    // mitten im Satz abgeschnitten wird.
    maxTokens: 250,
    // Dieser Modus hat seine eigene Meldung: das Szenario ist kein Feedback.
    failure: SCENARIO_ERROR_MESSAGE,
    message:
      exclude.length > 0
        ? `Bereits gesehene Szenarien (Anfänge):\n${exclude
            .map((s, i) => `${i + 1}. ${s} …`)
            .join("\n")}\n\nErfinde ein deutlich anderes Szenario.`
        : "Erfinde ein Szenario.",
  });
  if (answer.failure !== null) return answer.failure;

  // Strip any wrapping quotes the model may add despite instructions.
  const scenario = answer.text.replace(/^["„»]+|["“«]+$/g, "").trim();

  if (!scenario) {
    return Response.json({ error: SCENARIO_ERROR_MESSAGE }, { status: 502 });
  }

  return Response.json({ scenario });
}

async function handleFeedback(
  { supabase, user, askModel }: AiRouteContext,
  entryId: string | undefined,
) {
  if (!entryId || typeof entryId !== "string") {
    return Response.json(
      { error: "Es fehlt der Eintrag für das Feedback." },
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
      .eq("recipe_slug", "saying-no")
      .eq("template_type", "saying_no")
      .maybeSingle(),
    supabase
      .from("bill_of_rights")
      .select("rights")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  // Ohne mode/situation/draft ist es kein Nein-Eintrag, egal was die Zeile
  // behauptet — für diese Route derselbe Befund wie eine fehlende Zeile.
  const noEntry = entry
    ? readJournalContent(entry.template_type, entry.content)
    : null;
  if (!entry || noEntry?.template !== "saying_no") {
    return Response.json(
      { error: "Wir konnten deinen Eintrag nicht finden." },
      { status: 404 },
    );
  }
  const { content } = noEntry;

  const draft = (content.draft2 ?? content.draft).trim();
  if (!draft) {
    return Response.json(
      { error: "Es fehlt dein Nein-Entwurf für das Feedback." },
      { status: 400 },
    );
  }

  const activeRights = ((bor?.rights as RightItem[] | null) ?? [])
    .filter((r) => r.active)
    .slice(0, MAX_RIGHTS_IN_PROMPT)
    .map((r) => ({ ...r, text: r.text.slice(0, TEXT_MAX_SHORT) }));

  const rightsText =
    activeRights.length > 0
      ? activeRights
          .map((r) => `<right id="${r.id}">${r.text}</right>`)
          .join("\n")
      : "(noch keine Rechte vorhanden — es kann nur ein neues vorgeschlagen werden oder none)";

  const situationLabel =
    content.mode === "practice"
      ? "Das Übungsszenario"
      : "Die echte Anfrage, zu der die Person Nein sagen will";

  const answer = await askModel({
    system: COACH_PROMPT,
    // Kommentar + 4 Checklist-Notizen + verbesserte Version + JSON-Gerüst +
    // Rechts-Satz — 900 lässt Luft, damit nie mitten im Satz abgeschnitten wird.
    maxTokens: 900,
    message: `${situationLabel}:
<situation>${clampText(content.situation) || "(keine Angabe)"}</situation>

Der Nein-Entwurf der Person:
<draft>${clampText(draft)}</draft>

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
  const { comment, checklist, improved, right } = result;

  // Persist onto the entry: die maschinenlesbaren Verdicts wandern ins
  // content-JSONB (fürs Journal-Rendering), der Lesetext in ai_insights.
  // WICHTIG: content mergen, nie ersetzen — sonst sind situation/draft weg.
  const mergedContent = patchJournalContent("saying_no", entry.content, {
    ai_checklist: checklist
      ? {
          complete_sentence: checklist.complete_sentence.pass,
          no_apology: checklist.no_apology.pass,
          warmth: checklist.warmth.pass,
          no_but: checklist.no_but.pass,
        }
      : null,
    ai_improved: improved,
  });

  const insightParts = [comment];
  if (checklist) {
    insightParts.push(checklistSummary(checklist));
  }
  if (improved) {
    insightParts.push(`Vorschlag deines Begleiters: ${improved}`);
  }
  if (right?.type === "existing") {
    insightParts.push(`Passendes Recht aus deinem Bill of Rights: ${right.text}`);
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

  return Response.json({ comment, checklist, improved, right });
}
