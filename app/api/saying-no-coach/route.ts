import { anthropic } from "@/lib/anthropic/client";
import { SYSTEM_PROMPT as COACH_PROMPT } from "@/lib/anthropic/prompts/saying-no-coach";
import { SYSTEM_PROMPT as SCENARIO_PROMPT } from "@/lib/anthropic/prompts/saying-no-scenario";
import {
  RATE_LIMIT_MESSAGE,
  SAYING_NO_LIMIT,
  checkRateLimit,
  logUsage,
} from "@/lib/anthropic/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type {
  RightItem,
  SayingNoChecklist,
  SayingNoContent,
} from "@/lib/types/db-json";
import { TEXT_MAX_LONG, TEXT_MAX_SHORT } from "@/lib/utils/form-validation";

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

/** Ergebnis-Shape für match: bestehendes Recht, neuer Vorschlag oder nichts. */
type RightResult =
  | { type: "existing"; id: string; text: string }
  | { type: "new"; text: string }
  | null;

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

/** Löst ein match-Objekt gegen die DB-Rechte auf — Text IMMER aus der DB,
 *  nie vom Modell; unauflösbare ids werden zu null (= none). */
function resolveMatch(raw: unknown, activeRights: RightItem[]): RightResult {
  if (!raw || typeof raw !== "object") return null;
  const match = raw as { type?: unknown; id?: unknown; right?: unknown };

  if (match.type === "existing" && typeof match.id === "string") {
    const hit = activeRights.find((r) => r.id === match.id);
    if (hit) return { type: "existing", id: hit.id, text: hit.text };
    return null;
  }
  if (match.type === "new" && typeof match.right === "string" && match.right.trim()) {
    return { type: "new", text: match.right.trim().slice(0, TEXT_MAX_SHORT) };
  }
  return null;
}

/**
 * Parse the feedback-mode model output. Preferred path: strict JSON per system
 * prompt. Fallbacks keep the UI functional: broken JSON is recovered via the
 * fixed field order; total failure degrades to comment-only (checklist and
 * improved dann null — die UI zeigt dann nur den Kommentar).
 */
function parseModelOutput(raw: string, activeRights: RightItem[]): CoachResult {
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
      const checklist = parseChecklist((parsed as { checklist?: unknown }).checklist);

      const rawImproved = (parsed as { improved?: unknown }).improved;
      const improved =
        typeof rawImproved === "string" && rawImproved.trim()
          ? rawImproved.trim().slice(0, TEXT_MAX_LONG)
          : null;

      const right = resolveMatch((parsed as { match?: unknown }).match, activeRights);

      if (comment) {
        return { comment, checklist, improved, right };
      }
    }
  } catch {
    // JSON kaputt → struktureller Fallback unten.
  }

  // Struktureller Fallback: JSON.parse scheitert z.B. an ungeescapten geraden
  // Anführungszeichen INNERHALB eines String-Werts. Die Feld-Reihenfolge
  // (comment → checklist → improved → match) ist per Prompt fixiert, deshalb
  // lassen sich die Werte über die nachfolgenden Keys als Anker heraustrennen.
  const structural = recoverFromBrokenJson(stripped, activeRights);
  if (structural) return structural;

  return { comment: stripped, checklist: null, improved: null, right: null };
}

/** Entschärft JSON-String-Escapes in per Regex extrahierten Werten. */
function unescapeJsonString(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\").trim();
}

function recoverFromBrokenJson(
  stripped: string,
  activeRights: RightItem[],
): CoachResult | null {
  if (!stripped.startsWith("{")) return null;

  const commentMatch = stripped.match(/"comment"\s*:\s*"([\s\S]*?)"\s*,\s*"checklist"/);
  if (!commentMatch) return null;
  const comment = unescapeJsonString(commentMatch[1]);
  if (!comment) return null;

  // Checklist: pass-Booleans sind robust extrahierbar (kein String-Quoting),
  // die notes hängen zwischen "note": "…" und dem schließenden "}".
  const checklist = {} as Record<keyof SayingNoChecklist, ChecklistItem>;
  let checklistComplete = true;
  for (const key of CHECKLIST_KEYS) {
    const itemMatch = stripped.match(
      new RegExp(
        `"${key}"\\s*:\\s*\\{\\s*"pass"\\s*:\\s*(true|false)\\s*,\\s*"note"\\s*:\\s*"([\\s\\S]*?)"\\s*\\}`,
      ),
    );
    if (!itemMatch) {
      checklistComplete = false;
      break;
    }
    checklist[key] = {
      pass: itemMatch[1] === "true",
      note: unescapeJsonString(itemMatch[2]).slice(0, TEXT_MAX_SHORT),
    };
  }

  const improvedMatch = stripped.match(/"improved"\s*:\s*"([\s\S]*?)"\s*,\s*"match"/);
  const improvedRaw = improvedMatch ? unescapeJsonString(improvedMatch[1]) : "";
  const improved = improvedRaw ? improvedRaw.slice(0, TEXT_MAX_LONG) : null;

  let right: RightResult = null;
  const existingMatch = stripped.match(
    /"type"\s*:\s*"existing"\s*,\s*"id"\s*:\s*"([^"]+)"/,
  );
  if (existingMatch) {
    const hit = activeRights.find((r) => r.id === existingMatch[1]);
    if (hit) right = { type: "existing", id: hit.id, text: hit.text };
  } else {
    const newMatch = stripped.match(/"right"\s*:\s*"(Ich habe das Recht[\s\S]*?)"\s*\}/);
    if (newMatch) {
      const text = unescapeJsonString(newMatch[1]).slice(0, TEXT_MAX_SHORT);
      if (text) right = { type: "new", text };
    }
  }

  return {
    comment,
    checklist: checklistComplete ? checklist : null,
    improved,
    right,
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

  const body = (await request.json()) as {
    mode?: "scenario" | "feedback";
    entryId?: string;
    exclude?: unknown;
  };

  if (body.mode === "scenario") {
    return handleScenario(supabase, user.id, body.exclude);
  }
  if (body.mode === "feedback") {
    return handleFeedback(supabase, user.id, body.entryId);
  }

  return Response.json(
    { error: "Unbekannter Modus." },
    { status: 400 },
  );
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function handleScenario(
  supabase: SupabaseServerClient,
  userId: string,
  excludeRaw: unknown,
) {
  const exclude = (Array.isArray(excludeRaw) ? excludeRaw : [])
    .filter((s): s is string => typeof s === "string" && Boolean(s.trim()))
    .slice(0, MAX_EXCLUDE_ITEMS)
    .map((s) => s.trim().slice(0, MAX_EXCLUDE_LEN));

  // Cap hourly AI calls per user (checked after input validation so invalid
  // requests don't burn quota).
  if (await checkRateLimit(supabase, userId, "saying-no-coach", SAYING_NO_LIMIT)) {
    return Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const userMessage =
      exclude.length > 0
        ? `Bereits gesehene Szenarien (Anfänge):\n${exclude
            .map((s, i) => `${i + 1}. ${s} …`)
            .join("\n")}\n\nErfinde ein deutlich anderes Szenario.`
        : "Erfinde ein Szenario.";

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      // 2–4 Sätze Szenario — 250 lässt Luft, damit die Bitte am Ende nie
      // mitten im Satz abgeschnitten wird.
      max_tokens: 250,
      system: SCENARIO_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Only count genuinely successful generations against the quota.
    await logUsage(supabase, userId, "saying-no-coach");

    const scenario = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim()
      // Strip any wrapping quotes the model may add despite instructions.
      .replace(/^["„»]+|["“«]+$/g, "")
      .trim();

    if (!scenario) {
      return Response.json({ error: SCENARIO_ERROR_MESSAGE }, { status: 502 });
    }

    return Response.json({ scenario });
  } catch (error) {
    console.error("saying-no-coach: scenario call failed", error);
    return Response.json({ error: SCENARIO_ERROR_MESSAGE }, { status: 500 });
  }
}

async function handleFeedback(
  supabase: SupabaseServerClient,
  userId: string,
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
      .select("id, content")
      .eq("id", entryId)
      .eq("user_id", userId)
      .eq("recipe_slug", "saying-no")
      .eq("template_type", "saying_no")
      .maybeSingle(),
    supabase
      .from("bill_of_rights")
      .select("rights")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (!entry) {
    return Response.json(
      { error: "Wir konnten deinen Eintrag nicht finden." },
      { status: 404 },
    );
  }

  const content = entry.content as SayingNoContent;
  const draft = (content.draft2 ?? content.draft ?? "").trim();
  if (!draft) {
    return Response.json(
      { error: "Es fehlt dein Nein-Entwurf für das Feedback." },
      { status: 400 },
    );
  }

  const activeRights = (((bor?.rights as RightItem[] | null) ?? [])
    .filter((r) => r.active)
    .slice(0, MAX_RIGHTS_IN_PROMPT))
    .map((r) => ({ ...r, text: r.text.slice(0, TEXT_MAX_SHORT) }));

  if (await checkRateLimit(supabase, userId, "saying-no-coach", SAYING_NO_LIMIT)) {
    return Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const rightsText =
      activeRights.length > 0
        ? activeRights.map((r) => `<right id="${r.id}">${r.text}</right>`).join("\n")
        : "(noch keine Rechte vorhanden — es kann nur ein neues vorgeschlagen werden oder none)";

    const situationLabel =
      content.mode === "practice"
        ? "Das Übungsszenario"
        : "Die echte Anfrage, zu der die Person Nein sagen will";

    const userMessage = `${situationLabel}:
<situation>${clampText(content.situation ?? "") || "(keine Angabe)"}</situation>

Der Nein-Entwurf der Person:
<draft>${clampText(draft)}</draft>

Die bisherigen Rechte der Person:
<rights>
${rightsText}
</rights>`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      // Kommentar + 4 Checklist-Notizen + verbesserte Version + JSON-Gerüst +
      // Rechts-Satz — 900 lässt Luft, damit nie mitten im Satz abgeschnitten wird.
      max_tokens: 900,
      system: COACH_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Only count genuinely successful generations against the quota.
    await logUsage(supabase, userId, "saying-no-coach");

    const raw = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!raw) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }

    const { comment, checklist, improved, right } = parseModelOutput(raw, activeRights);

    // Persist onto the entry: die maschinenlesbaren Verdicts wandern ins
    // content-JSONB (fürs Journal-Rendering), der Lesetext in ai_insights.
    // WICHTIG: content mergen, nie ersetzen — sonst sind situation/draft weg.
    const mergedContent: SayingNoContent = {
      ...content,
      ai_checklist: checklist
        ? {
            complete_sentence: checklist.complete_sentence.pass,
            no_apology: checklist.no_apology.pass,
            warmth: checklist.warmth.pass,
            no_but: checklist.no_but.pass,
          }
        : null,
      ai_improved: improved,
    };

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
  } catch (error) {
    console.error("saying-no-coach: feedback call failed", error);
    return Response.json({ error: AI_ERROR_MESSAGE }, { status: 500 });
  }
}
