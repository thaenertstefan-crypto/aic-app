"use server";

import { createClient } from "@/lib/supabase/server";

export type CleanserCheckinState = {
  error: string | null;
  success: boolean;
};

/**
 * Log today's "Heute reflektiert" check-in for the mantra cleanser.
 * Idempotent: a unique constraint on (user_id, cleanser_slug, date) means
 * a second insert for the same day is treated as "already done", not an error.
 */
export async function logCleanserCheckinAction(
  _prevState: CleanserCheckinState,
  _formData: FormData,
): Promise<CleanserCheckinState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", success: false };
  }

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("cleanser_checkins").insert({
    user_id: user.id,
    cleanser_slug: "mantra",
    date: today,
  });

  // 23505 = unique_violation → schon heute erledigt, kein echter Fehler.
  if (error && error.code !== "23505") {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}
