import { anthropic } from "@/lib/anthropic/client";
import { parseAnalysisResult } from "@/lib/anthropic/journal-analysis-result";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/journal-analysis";
import {
  JOURNAL_ANALYSIS_LIMIT,
  RATE_LIMIT_MESSAGE,
  checkRateLimit,
  logUsage,
} from "@/lib/anthropic/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { DailyValueContent, ValueEvalContent } from "@/lib/types/db-json";
import { VALUES_BANK, getValueLabel } from "@/lib/utils/values-bank";

// Warm German fallback shown when the AI call fails for any reason.
const FALLBACK_INSIGHTS =
  "Wir konnten diesmal leider keine Beobachtungen für dich erstellen. Schau einfach selbst noch einmal auf deine Woche zurück – was hat sich für dich besonders stimmig angefühlt?";

// Entries come from the user's own DB, so defensively truncate (no 400) to keep
// input-token costs bounded — max_tokens only bounds the OUTPUT.
const MAX_ENTRY_LEN = 2000;

function clampEntryText(value: string): string {
  return value.slice(0, MAX_ENTRY_LEN);
}

/**
 * Analyse the user's last 7 daily journal entries (Recipe #1) and surface a few
 * gentle value-theme observations. The result is persisted onto the
 * value_eval entry (ai_insights + content.ai_confirmed/ai_suggested) and
 * returned as { insights, confirmed, suggested }.
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
          `Tag ${i + 1}\nWas ist passiert: ${clampEntryText(entry.content.happenings)}\nGedanken & Gefühle: ${clampEntryText(entry.content.response ?? "") || "(keine Angabe)"}`,
      )
      .join("\n\n");

    const userMessage = `Aktuelle Werte der Person: ${
      values.length > 0
        ? values.map(getValueLabel).join(", ")
        : "(noch keine festgelegt)"
    }

Die Tagebucheinträge der letzten Woche:
<journal_entries>
${entriesText || "(keine Einträge vorhanden)"}
</journal_entries>

Rückblick der Person:
<rueckblick>
Positive Momente: ${clampEntryText(reflection.positive_reflection) || "(keine Angabe)"}
Belastende Momente: ${clampEntryText(reflection.negative_reflection) || "(keine Angabe)"}
</rueckblick>`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      // Generous headroom: die ~200–250-Wörter-Prosa TEILT sich das Budget mit
      // dem JSON-Umschlag, confirmed und bis zu 3 Vorschlägen samt Begründung —
      // 900 reichte dafür nicht zuverlässig (Schwesterrouten mit JSON-Antwort
      // fahren 1200/1600).
      max_tokens: 1400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Only count genuinely successful generations against the quota.
    await logUsage(supabase, user.id, "journal-analysis");

    const raw = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    const result = parseAnalysisResult(raw, {
      currentValues: values,
      bankIds: VALUES_BANK.map((v) => v.id),
      fallbackInsights: FALLBACK_INSIGHTS,
    });

    // Persist onto the value_eval entry so it survives reloads and the later
    // read-only revisit. Das content-Update MERGED — sonst gingen die beiden
    // Reflexions-Felder der Person verloren.
    if (evalRow) {
      await supabase
        .from("journal_entries")
        .update({
          ai_insights: result.insights,
          content: {
            ...((evalRow.content as Record<string, unknown>) ?? {}),
            ai_confirmed: result.confirmed,
            ai_suggested: result.suggested,
          },
        })
        .eq("id", evalRow.id);
    }

    return Response.json(result);
  } catch (error) {
    console.error("journal-analysis: AI call failed", error);
    return Response.json({
      insights: FALLBACK_INSIGHTS,
      confirmed: [],
      suggested: [],
    });
  }
}
