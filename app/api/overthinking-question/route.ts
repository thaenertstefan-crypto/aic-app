import { anthropic } from "@/lib/anthropic/client";
import { SYSTEM_PROMPT as CHALLENGER_PROMPT } from "@/lib/anthropic/prompts/overthinking-challenger";
import { SYSTEM_PROMPT as WHY_PROMPT } from "@/lib/anthropic/prompts/overthinking-question";
import {
  OVERTHINKING_QUESTION_LIMIT,
  RATE_LIMIT_MESSAGE,
  checkRateLimit,
  logUsage,
} from "@/lib/anthropic/rate-limit";
import { createClient } from "@/lib/supabase/server";

// Cap input so a single allowed call can't drive up input-token costs
// (max_tokens only bounds the OUTPUT).
const MAX_PROBLEM_LEN = 2000;
const MAX_WHY_ITEMS = 10;
const MAX_WHY_ITEM_LEN = 500;

/**
 * Formulate a tailored question for the Overthinking wizard (Recipe #5 –
 * Gedankenspirale). Accepts { problem, whyChain, mode } and returns { question }.
 *
 * - mode "why" (default): the next, deeper "Warum?" question down the ladder.
 * - mode "challenger": a positive challenger question that gently questions the
 *   assumed worst case ("Was, wenn es gar nicht so schlimm ist?").
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

  const { problem, whyChain, mode } = (await request.json()) as {
    problem?: string;
    whyChain?: string[];
    mode?: "why" | "challenger";
  };

  const isChallenger = mode === "challenger";

  if (!problem?.trim()) {
    return Response.json(
      { error: "Bitte beschreibe zuerst dein Problem." },
      { status: 400 },
    );
  }

  if (problem.trim().length > MAX_PROBLEM_LEN) {
    return Response.json(
      {
        error:
          "Deine Beschreibung ist etwas lang geraten. Kürze sie bitte ein wenig und versuch es noch einmal.",
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
      "overthinking-question",
      OVERTHINKING_QUESTION_LIMIT,
    )
  ) {
    return Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const answers = (whyChain ?? [])
      .slice(0, MAX_WHY_ITEMS)
      .map((a) => a?.trim().slice(0, MAX_WHY_ITEM_LEN))
      .filter((a): a is string => Boolean(a));

    const previousAnswers =
      answers.length > 0
        ? answers.map((a, i) => `${i + 1}. ${a}`).join("\n")
        : "(noch keine)";

    const userMessage = `Oberflächliches Problem:
<problem>${problem.trim()}</problem>

Bisherige Antworten auf „Warum?“:
<why_chain>${previousAnswers}</why_chain>

${
  isChallenger
    ? "Formuliere eine positive Challenger-Frage, die den befürchteten Worst Case sanft infrage stellt."
    : "Formuliere die nächste, tiefere „Warum?“-Frage."
}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 100,
      system: isChallenger ? CHALLENGER_PROMPT : WHY_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Only count genuinely successful generations against the quota.
    await logUsage(supabase, user.id, "overthinking-question");

    const question = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim()
      // Strip any wrapping quotes the model may add despite instructions.
      .replace(/^["„»]+|["“«]+$/g, "")
      .trim();

    if (!question) {
      return Response.json(
        { error: "Wir konnten gerade keine Frage formulieren. Versuch es noch einmal." },
        { status: 502 },
      );
    }

    return Response.json({ question });
  } catch (error) {
    console.error("overthinking-question: AI call failed", error);
    return Response.json(
      { error: "Wir konnten gerade keine Frage formulieren. Versuch es noch einmal." },
      { status: 500 },
    );
  }
}
