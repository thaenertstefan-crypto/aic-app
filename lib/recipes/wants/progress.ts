/**
 * Der Fortschritt der Wants-Übung — was nach einem Speichern in
 * `user_recipe_progress` zu schreiben ist, als reines Modul.
 *
 * Beide Schreibwege der Übung tragen **dieselbe Regel**: ein abgeschlossener
 * Durchlauf wird nie zurückgestuft. Sie stand zweimal in `actions.ts`, rund
 * hundert Zeilen auseinander und in zwei verschiedenen Formen — einmal als
 * `completed && progress.status !== "completed"`, einmal als ein
 * `if (progress.status !== "completed")` um den ganzen Schreibvorgang herum.
 * Dass es dieselbe Regel ist, sah man den beiden Stellen nicht an. Hier hängen
 * sie an einem Prädikat.
 *
 * **Was sie NICHT teilen, teilen sie weiterhin nicht.** Die beiden Übergänge
 * unterscheiden sich in zwei Punkten, und beide sind hier sichtbar:
 *
 * - Das Sterne-Speichern schiebt `current_step` auf 2 (die Sternenkarte), auch
 *   bei abgeschlossenem Durchlauf. Das Audit-Speichern schreibt dann gar
 *   nichts — sonst zöge ein Wiederholungs-Audit den Weiter-Link des Dashboards
 *   auf Schritt 1 zurück (s. `stepPaths` in `lib/utils/recipes.ts`).
 * - Das Audit setzt `in_progress`, sobald der Durchlauf nicht abgeschlossen
 *   ist; die Sterne nur aus `not_started` heraus.
 *
 * Ob diese Asymmetrie bleiben soll, ist eine eigene Entscheidung und ein
 * eigenes Ticket — dieses Modul benennt sie, es räumt sie nicht ab.
 */

import type { Tables, TablesUpdate } from "../../supabase/database.types.ts";

/**
 * Der gelesene Stand — `null`, wenn es für den Slug noch keine Zeile gibt.
 *
 * Nur die eine Spalte, an der die Regel hängt, und die aus den generierten
 * Typen statt von Hand: bei einer Schema-Änderung zieht `status` hier mit.
 */
export type WantsProgressRow = Pick<
  Tables<"user_recipe_progress">,
  "status"
> | null;

/**
 * Die zu schreibende Nutzlast, oder `null` für „die Zeile bleibt unangetastet".
 *
 * Es ist **eine** Nutzlast für beide Fälle: gibt es eine Zeile, ist sie der
 * Update-Patch; gibt es keine, sind es die Felder der neuen Zeile — dann trägt
 * sie `started_at` und `cycle_number` mit. Identität (`user_id`,
 * `recipe_slug`) und die Wahl zwischen `update` und `insert` bleiben bei der
 * Action; beides ist Datenzugriff, keine Regel.
 */
export type WantsProgressWrite = TablesUpdate<"user_recipe_progress"> | null;

/** Die geteilte Regel: ein abgeschlossener Durchlauf bleibt abgeschlossen. */
function isCompleted(progress: NonNullable<WantsProgressRow>): boolean {
  return progress.status === "completed";
}

/**
 * Nach dem Speichern der Sterne (Sternenkarte, Schritt 2).
 *
 * `completed` heißt „es gibt mindestens einen Stern". Seit dem Wegfall von
 * „loslassen" kann kein Stern mehr erlöschen, darum ist das Gate schlicht die
 * Anzahl; Little Bets gaten nicht.
 */
export function nextWantsProgress(
  progress: WantsProgressRow,
  completed: boolean,
  now: string,
): WantsProgressWrite {
  if (!progress) {
    return {
      current_step: 2,
      status: completed ? "completed" : "in_progress",
      started_at: now,
      cycle_number: 1,
      ...(completed ? { completed_at: now } : {}),
    };
  }

  const changes: TablesUpdate<"user_recipe_progress"> = { current_step: 2 };
  if (completed && !isCompleted(progress)) {
    changes.status = "completed";
    changes.completed_at = now;
  } else if (!completed && progress.status === "not_started") {
    changes.status = "in_progress";
  }
  return changes;
}

/**
 * Nach dem Speichern eines Yin-&-Yang-Audits (Sternenschmiede, Schritt 1).
 *
 * Jeder Durchlauf legt einen eigenen Journal-Eintrag an, auch der zweite —
 * ein bereits abgeschlossener Durchlauf bleibt dabei ganz unangetastet.
 */
export function nextAuditProgress(
  progress: WantsProgressRow,
  now: string,
): WantsProgressWrite {
  if (!progress) {
    return {
      current_step: 1,
      status: "in_progress",
      started_at: now,
      cycle_number: 1,
    };
  }

  return isCompleted(progress)
    ? null
    : { current_step: 1, status: "in_progress" };
}
