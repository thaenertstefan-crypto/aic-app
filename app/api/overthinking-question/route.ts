import { withAiRoute } from "@/lib/anthropic/ask-model";
import { SYSTEM_PROMPT as CHALLENGER_PROMPT } from "@/lib/anthropic/prompts/overthinking-challenger";
import { SYSTEM_PROMPT as WHY_PROMPT } from "@/lib/anthropic/prompts/overthinking-question";

// Cap input so a single allowed call can't drive up input-token costs
// (max_tokens only bounds the OUTPUT).
const MAX_PROBLEM_LEN = 2000;
const MAX_WHY_ITEMS = 10;
const MAX_WHY_ITEM_LEN = 500;

const AI_ERROR_MESSAGE =
  "Wir konnten gerade keine Frage formulieren. Versuch es noch einmal.";

/**
 * Formulate a tailored question for the Overthinking wizard (Recipe #5 –
 * Gedankenspirale). Accepts { problem, whyChain, mode } and returns { question }.
 *
 * - mode "why" (default): the next, deeper "Warum?" question down the ladder.
 * - mode "challenger": a positive challenger question that gently questions the
 *   assumed worst case ("Was, wenn es gar nicht so schlimm ist?").
 */
export const POST = withAiRoute(
  { endpoint: "overthinking-question", failure: AI_ERROR_MESSAGE },
  async ({ askModel }, request) => {
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

    const answers = (whyChain ?? [])
      .slice(0, MAX_WHY_ITEMS)
      .map((a) => a?.trim().slice(0, MAX_WHY_ITEM_LEN))
      .filter((a): a is string => Boolean(a));

    const previousAnswers =
      answers.length > 0
        ? answers.map((a, i) => `${i + 1}. ${a}`).join("\n")
        : "(noch keine)";

    const result = await askModel({
      system: isChallenger ? CHALLENGER_PROMPT : WHY_PROMPT,
      maxTokens: 100,
      message: `Oberflächliches Problem:
<problem>${problem.trim()}</problem>

Bisherige Antworten auf „Warum?“:
<why_chain>${previousAnswers}</why_chain>

${
  isChallenger
    ? "Formuliere eine positive Challenger-Frage, die den befürchteten Worst Case sanft infrage stellt."
    : "Formuliere die nächste, tiefere „Warum?“-Frage."
}`,
    });
    if (result.failure !== null) return result.failure;

    // Strip any wrapping quotes the model may add despite instructions.
    const question = result.text.replace(/^["„»]+|["“«]+$/g, "").trim();

    if (!question) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }

    return Response.json({ question });
  },
);
