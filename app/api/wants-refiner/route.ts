import { anthropic } from "@/lib/anthropic/client";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/wants-refiner";
import {
  RATE_LIMIT_MESSAGE,
  WANTS_REFINER_LIMIT,
  checkRateLimit,
  logUsage,
} from "@/lib/anthropic/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { YinYangContent } from "@/lib/types/db-json";
import { TEXT_MAX_SHORT } from "@/lib/utils/form-validation";

const MAX_ENTRY_LEN = 2000;
const MAX_FIELD_LEN = 500;

const AI_ERROR_MESSAGE =
  "Das Nachschärfen hat gerade nicht geklappt. Du kannst dein Want auch selbst anpassen.";

function clamp(value: string, max: number): string {
  return value.slice(0, max);
}

/** Parst { "text": "…" } — tolerant gegen Code-Fences. */
function parseRefined(raw: string): string | null {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    const parsed: unknown = JSON.parse(stripped);
    if (parsed && typeof parsed === "object") {
      const t = (parsed as { text?: unknown }).text;
      if (typeof t === "string" && t.trim()) return t.trim().slice(0, TEXT_MAX_SHORT);
    }
  } catch {
    // fällt unten auf null
  }
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Du musst angemeldet sein." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    entryId?: unknown;
    text?: unknown;
    question?: unknown;
    answer?: unknown;
  };
  const entryId = typeof body.entryId === "string" ? body.entryId : "";
  const wantText = typeof body.text === "string" ? body.text.trim() : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";

  if (!entryId || !wantText || !answer) {
    return Response.json({ error: "Es fehlen Angaben zum Nachschärfen." }, { status: 400 });
  }

  const { data: entry } = await supabase
    .from("journal_entries")
    .select("id, content")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .eq("recipe_slug", "wants")
    .eq("template_type", "yin_yang")
    .maybeSingle();

  if (!entry) {
    return Response.json({ error: "Wir konnten dein Audit nicht finden." }, { status: 404 });
  }

  if (await checkRateLimit(supabase, user.id, "wants-refiner", WANTS_REFINER_LIMIT)) {
    return Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const content = entry.content as YinYangContent;
  const auditText = [
    (content.yin ?? "").trim(),
    (content.yang ?? "").trim(),
    (content.principles ?? "").trim(),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const userMessage = `<audit>${clamp(auditText, MAX_ENTRY_LEN)}</audit>
<want>${clamp(wantText, MAX_FIELD_LEN)}</want>
<frage>${clamp(question, MAX_FIELD_LEN) || "(keine)"}</frage>
<antwort>${clamp(answer, MAX_FIELD_LEN)}</antwort>`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    await logUsage(supabase, user.id, "wants-refiner");

    const raw = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    const refined = parseRefined(raw);
    if (!refined) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }

    return Response.json({ text: refined });
  } catch (error) {
    console.error("wants-refiner: call failed", error);
    return Response.json({ error: AI_ERROR_MESSAGE }, { status: 500 });
  }
}
