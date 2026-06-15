import { anthropic } from "@/lib/anthropic/client";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/rights-formulator";
import {
  RATE_LIMIT_MESSAGE,
  RIGHTS_FORMULATOR_LIMIT,
  checkRateLimit,
  logUsage,
} from "@/lib/anthropic/rate-limit";
import { createClient } from "@/lib/supabase/server";

/**
 * Reformulate a user's reflection (Recipe #3 – Bill of Rights) into a single
 * empowering "Ich habe das Recht, …" statement. Accepts { situation,
 * idealReaction } and returns { suggestion }.
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

  const { situation, idealReaction } = (await request.json()) as {
    situation?: string;
    idealReaction?: string;
  };

  if (!situation?.trim() && !idealReaction?.trim()) {
    return Response.json(
      { error: "Bitte fülle zuerst deine Reflexion aus." },
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
    const userMessage = `Situation, in der ich mich zurückgehalten gefühlt habe:
${situation?.trim() || "(keine Angabe)"}

Wie ich idealerweise gehandelt hätte:
${idealReaction?.trim() || "(keine Angabe)"}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Only count genuinely successful generations against the quota.
    await logUsage(supabase, user.id, "rights-formulator");

    const suggestion = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim()
      // Strip any wrapping quotes the model may add despite instructions.
      .replace(/^["„»]+|["“«]+$/g, "")
      .trim();

    if (!suggestion) {
      return Response.json(
        { error: "Wir konnten gerade keinen Vorschlag erstellen. Versuch es noch einmal." },
        { status: 502 },
      );
    }

    return Response.json({ suggestion });
  } catch (error) {
    console.error("rights-formulator: AI call failed", error);
    return Response.json(
      { error: "Wir konnten gerade keinen Vorschlag erstellen. Versuch es noch einmal." },
      { status: 500 },
    );
  }
}
