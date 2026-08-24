"use server";

import { dbFailed, ok, type ActionResult } from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
import { serverTodayKey } from "@/lib/server/timezone";

/**
 * Stiller Check-in beim Abschluss des Confidence-Boosts („Gleich bin ich
 * dran"). Bewusst OHNE Streak-UI — ein Akut-Werkzeug soll keinen
 * Täglich-Nutzen-Anreiz setzen; die Daten liegen nur für spätere Statistiken
 * vor. Der Client ruft fire-and-forget auf und wertet das Ergebnis nie aus
 * (23505 = heute schon geloggt ist hier schlicht egal).
 */
export async function logConfidenceCheckin(): Promise<ActionResult> {
  return withUser(async ({ supabase, user }) => {
    const today = await serverTodayKey();

    const { error } = await supabase.from("cleanser_checkins").insert({
      user_id: user.id,
      cleanser_slug: "confidence",
      date: today,
    });

    if (error && error.code !== "23505") {
      return dbFailed(error, "confidence");
    }

    return ok();
  });
}
