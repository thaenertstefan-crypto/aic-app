import { anthropic } from "@/lib/anthropic/client";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/rights-formulator";
import {
  RATE_LIMIT_MESSAGE,
  RIGHTS_FORMULATOR_LIMIT,
  checkRateLimit,
  logUsage,
} from "@/lib/anthropic/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { TEXT_MAX_SHORT } from "@/lib/utils/form-validation";

// Cap per-field input length so a single allowed call can't drive up input-token
// costs. max_tokens only bounds the OUTPUT.
const MAX_INPUT_LEN = 2000;

const AI_ERROR_MESSAGE =
  "Wir konnten gerade keinen Vorschlag erstellen. Versuch es noch einmal.";

/** Geparste Modell-Antwort: die alte Regel (kann bei kaputtem JSON fehlen)
 *  und das neue Recht. */
type FormulatorResult = {
  oldRule: string | null;
  newRight: string;
};

/**
 * Parse the model output. Preferred path: strict JSON per system prompt
 * ({"old_rule": …, "new_right": …}). Fallback keeps the UI functional: an
 * "Ich habe das Recht …" sentence in free text becomes the new right and the
 * old rule stays null (the duel view then shows the right without opponent).
 */
function parseModelOutput(raw: string): FormulatorResult | null {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
    const parsed: unknown = JSON.parse(stripped);
    if (parsed && typeof parsed === "object") {
      const rawOld = (parsed as { old_rule?: unknown }).old_rule;
      const rawNew = (parsed as { new_right?: unknown }).new_right;
      const newRight =
        typeof rawNew === "string" && rawNew.trim()
          ? rawNew.trim().slice(0, TEXT_MAX_SHORT)
          : null;
      if (newRight) {
        return {
          oldRule:
            typeof rawOld === "string" && rawOld.trim()
              ? rawOld.trim().slice(0, TEXT_MAX_SHORT)
              : null,
          newRight,
        };
      }
    }
  } catch {
    // JSON kaputt → Freitext-Fallback unten.
  }

  const sentence = stripped.match(/Ich habe das Recht[^.!\n]*[.!]?/)?.[0]?.trim();
  if (sentence) {
    return { oldRule: null, newRight: sentence.slice(0, TEXT_MAX_SHORT) };
  }

  return null;
}

/**
 * Name the two inner rules behind a moment of inner conflict (Recipe #3 –
 * Bill of Rights): the old people-pleaser rule and a new empowering
 * "Ich habe das Recht, …" statement. Accepts { situation } and returns
 * { oldRule, newRight }.
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

  // Cap hourly AI calls per user (checked after input validation so invalid
  // requests don't burn quota).
  if (
    await checkRateLimit(
      supabase,
      user.id,
      "rights-formulator",
      RIGHTS_FORMULATOR_LIMIT,
    )
  ) {
    return Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const userMessage = `Situation, in der ich einen inneren Konflikt gespürt habe:
<situation>${situation.trim()}</situation>`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Only count genuinely successful generations against the quota.
    await logUsage(supabase, user.id, "rights-formulator");

    const raw = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    const result = parseModelOutput(raw);

    if (!result) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }

    return Response.json(result);
  } catch (error) {
    console.error("rights-formulator: AI call failed", error);
    return Response.json({ error: AI_ERROR_MESSAGE }, { status: 500 });
  }
}
