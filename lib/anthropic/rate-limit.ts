import "server-only";

import type { createClient } from "@/lib/supabase/server";

/**
 * Die Endpunkte der KI-Routen samt ihrer stündlichen Obergrenze pro Person.
 *
 * Eine Tabelle statt acht Konstanten: der Endpunkt-String ging vorher zweimal
 * pro Route von Hand ein (einmal in `checkRateLimit`, einmal in `logUsage`) und
 * das Limit als separat importierte Konstante daneben. Drei Stellen, die
 * auseinanderlaufen konnten. Hier ist der Schlüssel die einzige Angabe, und
 * `AiEndpoint` macht einen Tippfehler zum Compilerfehler.
 */
export const AI_ENDPOINT_LIMITS = {
  "journal-analysis": 10,
  "rights-formulator": 20,
  // ~3 Fragen pro Durchlauf des Overthinking-Wizards, großzügig für Re-Runs.
  "overthinking-question": 40,
  // Ein Call pro Things-Got-Messy-Eintrag (+ Retries nach Fehlern).
  "messy-guilt-coach": 10,
  // Nein-Trainer: pro Durchlauf ≤2 Szenarien + ≤2 Feedback-Runden → mehrere
  // Durchläufe pro Stunde bleiben möglich.
  "saying-no-coach": 30,
  // Ein Call pro Wants-Audit-Durchlauf (+ Retries nach Fehlern).
  "wants-distiller": 10,
  // Nachschärfen einzelner Wants — mehrere pro Audit-Durchlauf möglich.
  "wants-refiner": 30,
  // Sternschmiede: ein Funken-Generierungs-Call pro Durchlauf (+ Retries).
  sternschmiede: 15,
} as const satisfies Record<string, number>;

/** Der Name einer KI-Route — zugleich der Wert in `ai_usage_log.endpoint`. */
export type AiEndpoint = keyof typeof AI_ENDPOINT_LIMITS;

// Friendly German message returned with a 429 when a cap is hit.
export const RATE_LIMIT_MESSAGE =
  "Du hast das stündliche Limit erreicht, versuch's später nochmal.";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Returns true when the user has already hit the endpoint's hourly cap. Counts
 * run through the per-request (RLS-scoped) client, so a user only ever sees
 * their own rows.
 */
export async function checkRateLimit(
  supabase: SupabaseServerClient,
  userId: string,
  endpoint: AiEndpoint,
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("created_at", oneHourAgo);

  return (count ?? 0) >= AI_ENDPOINT_LIMITS[endpoint];
}

/**
 * Records a single usage row. Der Reihenfolge-Zwang „erst nach einem geglückten
 * Modellaufruf" ist in `askModel` verdrahtet — nicht mehr als Kommentar an den
 * Aufrufstellen.
 */
export async function logUsage(
  supabase: SupabaseServerClient,
  userId: string,
  endpoint: AiEndpoint,
): Promise<void> {
  await supabase.from("ai_usage_log").insert({ user_id: userId, endpoint });
}
