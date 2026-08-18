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
 *
 * Seit KAN-24 ist dies der zweite Adapter auf `lib/recipes/progress.ts`: die
 * gelesene Zeile und die zu schreibende Nutzlast heißen dort einmal
 * (`ProgressRow`, `ProgressWrite`), `writeProgress` führt den Update-oder-
 * Insert-Tanz und setzt dabei `cycle_number` selbst. Hier stehen nur noch die
 * zwei Regeln der Übung.
 */

import type { ProgressRow, ProgressWrite } from "../progress.ts";

/** Die geteilte Regel: ein abgeschlossener Durchlauf bleibt abgeschlossen. */
function isCompleted(progress: NonNullable<ProgressRow>): boolean {
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
  progress: ProgressRow,
  completed: boolean,
  now: string,
): ProgressWrite {
  if (!progress) {
    return {
      current_step: 2,
      status: completed ? "completed" : "in_progress",
      started_at: now,
      ...(completed ? { completed_at: now } : {}),
    };
  }

  const changes: NonNullable<ProgressWrite> = { current_step: 2 };
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
  progress: ProgressRow,
  now: string,
): ProgressWrite {
  if (!progress) {
    return {
      current_step: 1,
      status: "in_progress",
      started_at: now,
    };
  }

  return isCompleted(progress)
    ? null
    : { current_step: 1, status: "in_progress" };
}
