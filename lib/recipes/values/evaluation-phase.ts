/**
 * Welche Bühne der Werte-Auswertung dran ist — als reines Modul, damit die
 * Regel unter `node --test` fällt.
 *
 * Der Grund für diese Datei ist die zweite Hälfte der ersten Bedingung.
 * `hypothesisVersion > 1` heißt „abgeschlossen", **auch wenn der Fortschritt
 * das nicht sagt**: die angepasste Hypothese wird als neue Version angelegt
 * (s. `saveAdjustedHypothesisAction`), und ab da ist der Zyklus vorbei,
 * gleichgültig was in `status` steht. Eingeklemmt zwischen vier Supabase-Reads
 * war das eine Zeile, die man beim Lesen überfliegt und beim Ändern kippt.
 *
 * Die Reihenfolge der drei Fälle ist die Regel: „abgeschlossen" schlägt
 * „Reflexion liegt vor", nicht umgekehrt.
 */

/** Die drei Bühnen der Auswertung (Schritt 3 der Werte-Übung). */
export type EvaluationPhase = "reflection" | "adjust" | "complete";

/** Woran sich die Bühne entscheidet. */
export type EvaluationStand = {
  /** `status` der jüngsten Fortschritts-Zeile — `null`, wenn es keine gibt. */
  status: string | null;
  /** Version der jüngsten Hypothese; ohne Hypothese gilt 1. */
  hypothesisVersion: number;
  /** Liegt eine `value_eval`-Zeile vor, also eine gespeicherte Reflexion? */
  hasEvalEntry: boolean;
};

/**
 * Die Bühne, die der Nutzer beim Öffnen der Auswertung sehen soll.
 *
 * Abgeschlossen ist ein Zyklus auf **zwei** Wegen: über den Fortschritt und
 * über eine zweite Hypothesen-Version. Der zweite Weg fängt die Zeile ab, bei
 * der das `insert` der neuen Version durchlief und das `update` des
 * Fortschritts danach nicht — sonst stünde der Nutzer wieder in der
 * Anpassungs-Bühne vor Werten, die er schon angepasst hat.
 */
export function evaluationPhase({
  status,
  hypothesisVersion,
  hasEvalEntry,
}: EvaluationStand): EvaluationPhase {
  if (status === "completed" || hypothesisVersion > 1) return "complete";
  return hasEvalEntry ? "adjust" : "reflection";
}
