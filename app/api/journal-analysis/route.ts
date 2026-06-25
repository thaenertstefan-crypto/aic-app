import { anthropic } from "@/lib/anthropic/client";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/journal-analysis";
import {
  JOURNAL_ANALYSIS_LIMIT,
  RATE_LIMIT_MESSAGE,
  checkRateLimit,
  logUsage,
} from "@/lib/anthropic/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getValueLabel } from "@/lib/utils/values-bank";

// Warm German fallback shown when the AI call fails for any reason.
const FALLBACK_INSIGHTS =
  "Wir konnten diesmal leider keine Beobachtungen für dich erstellen. Schau einfach selbst noch einmal auf deine Woche zurück – was hat sich für dich besonders stimmig angefühlt?";

type DailyValueContent = { happenings: string; response: string };
type ValueEvalContent = {
  positive_reflection: string;
  negative_reflection: string;
};

/**
 * Analyse the user's last 7 daily journal entries (Recipe #1) and surface a few
 * gentle value-theme observations. The generated text is persisted onto the
 * value_eval entry's ai_insights column and returned as { insights }.
 */
export async function POST() {
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

  // Cap hourly AI calls per user. Kept above the try/catch below so the 429 is
  // never swallowed by the fallback handler.
  if (
    await checkRateLimit(
      supabase,
      user.id,
      "journal-analysis",
      JOURNAL_ANALYSIS_LIMIT,
    )
  ) {
    return Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  // Die drei Reads sind voneinander unabhängig → parallel laden, bevor der
  // KI-Call startet.
  const [
    { data: dailyEntries },
    { data: hypothesisRow },
    { data: evalRow },
  ] = await Promise.all([
    // Most recent 7 daily_value entries = the current cycle.
    supabase
      .from("journal_entries")
      .select("content")
      .eq("user_id", user.id)
      .eq("recipe_slug", "values")
      .eq("template_type", "daily_value")
      .order("created_at", { ascending: false })
      .limit(7),
    // Latest values hypothesis.
    supabase
      .from("values_hypothesis")
      .select("values")
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // The value_eval entry holds the user's reflection and is where we save insights.
    supabase
      .from("journal_entries")
      .select("id, content")
      .eq("user_id", user.id)
      .eq("recipe_slug", "values")
      .eq("template_type", "value_eval")
      .maybeSingle(),
  ]);

  // Chronological order reads more naturally in the prompt.
  const entries = ((dailyEntries ?? []).reverse() as { content: DailyValueContent }[]);

  const values = (hypothesisRow?.values as string[] | undefined) ?? [];

  const reflection = (evalRow?.content as ValueEvalContent | undefined) ?? {
    positive_reflection: "",
    negative_reflection: "",
  };

  try {
    const entriesText = entries
      .map(
        (entry, i) =>
          `Tag ${i + 1}\nWas ist passiert: ${entry.content.happenings}\nGedanken & Gefühle: ${entry.content.response}`,
      )
      .join("\n\n");

    const userMessage = `Aktuelle Werte der Person: ${
      values.length > 0
        ? values.map(getValueLabel).join(", ")
        : "(noch keine festgelegt)"
    }

Die Tagebucheinträge der letzten Woche:

${entriesText || "(keine Einträge vorhanden)"}

Rückblick der Person:
Positive Momente: ${reflection.positive_reflection || "(keine Angabe)"}
Belastende Momente: ${reflection.negative_reflection || "(keine Angabe)"}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      // Generous headroom so a ~200–250 word German reply always finishes its
      // final sentence instead of being cut off mid-thought.
      max_tokens: 900,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Only count genuinely successful generations against the quota.
    await logUsage(supabase, user.id, "journal-analysis");

    const insights = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    const finalInsights = insights || FALLBACK_INSIGHTS;

    // Persist onto the value_eval entry so it survives reloads.
    if (evalRow) {
      await supabase
        .from("journal_entries")
        .update({ ai_insights: finalInsights })
        .eq("id", evalRow.id);
    }

    return Response.json({ insights: finalInsights });
  } catch (error) {
    console.error("journal-analysis: AI call failed", error);
    return Response.json({ insights: FALLBACK_INSIGHTS });
  }
}
