"use server";

import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
import { serverTodayKey } from "@/lib/server/timezone";

/**
 * Save (or update) today's mood check-in for the current user.
 * A unique constraint on (user_id, date) lets us upsert: re-tapping a mood
 * simply overwrites today's score instead of creating duplicate rows.
 *
 * Ohne Nutzlast: der alte `score`-Rückgabewert („damit der Client die Auswahl
 * bestätigen kann") wurde nie gelesen — die Auswahl steht schon optimistisch
 * im Client.
 */
export async function saveMoodCheckinAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const score = Number(formData.get("mood_score"));
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return failed("Ungültige Auswahl.");
  }

  return withUser(async ({ supabase, user }) => {
    const today = await serverTodayKey();

    const { error } = await supabase
      .from("daily_checkins")
      .upsert(
        { user_id: user.id, date: today, mood_score: score },
        { onConflict: "user_id,date" },
      );

    return error ? dbFailed(error, "daily_checkins") : ok();
  });
}
