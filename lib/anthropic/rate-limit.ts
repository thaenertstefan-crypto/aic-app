import "server-only";

import type { createClient } from "@/lib/supabase/server";

// Per-user, per-endpoint hourly caps for the AI routes. Kept here so the
// numbers live in one place next to the helpers that enforce them.
export const JOURNAL_ANALYSIS_LIMIT = 10;
export const RIGHTS_FORMULATOR_LIMIT = 20;
// ~3 Fragen pro Durchlauf des Overthinking-Wizards, großzügig für Re-Runs.
export const OVERTHINKING_QUESTION_LIMIT = 40;
// Ein Call pro Things-Got-Messy-Eintrag (+ Retries nach Fehlern).
export const MESSY_GUILT_LIMIT = 10;
// Nein-Trainer: pro Durchlauf ≤2 Szenarien + ≤2 Feedback-Runden → mehrere
// Durchläufe pro Stunde bleiben möglich.
export const SAYING_NO_LIMIT = 30;

// Friendly German message returned with a 429 when a cap is hit.
export const RATE_LIMIT_MESSAGE =
  "Du hast das stündliche Limit erreicht, versuch's später nochmal.";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Returns true when the user has already hit `limit` calls to `endpoint` within
 * the last hour. Counts run through the per-request (RLS-scoped) client, so a
 * user only ever sees their own rows.
 */
export async function checkRateLimit(
  supabase: SupabaseServerClient,
  userId: string,
  endpoint: string,
  limit: number,
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("created_at", oneHourAgo);

  return (count ?? 0) >= limit;
}

/**
 * Records a single usage row. Call this only after a genuine Anthropic call
 * succeeds, so failed/fallback responses don't count against the user's quota.
 */
export async function logUsage(
  supabase: SupabaseServerClient,
  userId: string,
  endpoint: string,
): Promise<void> {
  await supabase.from("ai_usage_log").insert({ user_id: userId, endpoint });
}
