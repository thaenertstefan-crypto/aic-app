"use server";

import { createClient } from "@/lib/supabase/server";

export type MoodCheckinState = {
  error: string | null;
  success: boolean;
  /** The score that was just saved, so the client can confirm the selection. */
  score: number | null;
};

/**
 * Save (or update) today's mood check-in for the current user.
 * A unique constraint on (user_id, date) lets us upsert: re-tapping a mood
 * simply overwrites today's score instead of creating duplicate rows.
 */
export async function saveMoodCheckinAction(
  _prevState: MoodCheckinState,
  formData: FormData,
): Promise<MoodCheckinState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", success: false, score: null };
  }

  const score = Number(formData.get("mood_score"));
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return { error: "Ungültige Auswahl.", success: false, score: null };
  }

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("daily_checkins")
    .upsert(
      { user_id: user.id, date: today, mood_score: score },
      { onConflict: "user_id,date" },
    );

  if (error) {
    return { error: error.message, success: false, score: null };
  }

  return { error: null, success: true, score };
}
