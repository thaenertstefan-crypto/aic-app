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

/** Woran sich „abgeschlossen" entscheidet — die kleinere Hälfte von `EvaluationStand`. */
export type CycleStand = {
  /** `status` der jüngsten Fortschritts-Zeile — `null`, wenn es keine gibt. */
  status: string | null;
  /** Version der jüngsten Hypothese; ohne Hypothese gilt 1. */
  hypothesisVersion: number;
};

/**
 * Ist der Durchlauf vorbei?
 *
 * Abgeschlossen ist ein Durchlauf auf **zwei** Wegen: über den Fortschritt und
 * über eine zweite Hypothesen-Version. Der zweite Weg fängt die Zeile ab, bei
 * der das `insert` der neuen Version durchlief und das `update` des
 * Fortschritts danach nicht.
 *
 * Diese Regel steht hier allein, weil zwei Stellen sie lesen: die Bühne der
 * Auswertung (unten) und die Sperre von Schritt 1 (`getHypothesisData` /
 * `saveHypothesisAction`). Zwei Kopien davon würden auseinanderlaufen — genau
 * so ist KAN-19 entstanden.
 */
export function cycleIsComplete({
  status,
  hypothesisVersion,
}: CycleStand): boolean {
  return status === "completed" || hypothesisVersion > 1;
}

/**
 * Der eine Wortlaut für „Schritt 1 ist für diesen Durchlauf vorbei".
 *
 * Steht hier statt in `actions.ts`, weil eine `"use server"`-Datei nur async
 * Funktionen exportieren darf — und weil er ohnehin die nach außen gedrehte
 * Seite von `cycleIsComplete` ist.
 */
export const HYPOTHESIS_LOCKED =
  "Dein Kompass steht schon — für diesen Durchlauf lässt sich die Hypothese nicht mehr ändern.";

/** Woran sich die Bühne entscheidet. */
export type EvaluationStand = CycleStand & {
  /** Liegt eine `value_eval`-Zeile vor, also eine gespeicherte Reflexion? */
  hasEvalEntry: boolean;
};

/**
 * Die Bühne, die der Nutzer beim Öffnen der Auswertung sehen soll.
 *
 * Wann ein Durchlauf vorbei ist, sagt `cycleIsComplete` — sonst stünde der
 * Nutzer wieder in der Anpassungs-Bühne vor Werten, die er schon angepasst hat.
 */
export function evaluationPhase({
  status,
  hypothesisVersion,
  hasEvalEntry,
}: EvaluationStand): EvaluationPhase {
  if (cycleIsComplete({ status, hypothesisVersion })) return "complete";
  return hasEvalEntry ? "adjust" : "reflection";
}
