/**
 * Welche Bühne der Werte-Auswertung dran ist — als reines Modul, damit die
 * Regel unter `node --test` fällt.
 *
 * Der Grund für diese Datei ist die zweite Hälfte der ersten Bedingung.
 * `hypothesisVersion > cycleNumber` heißt „abgeschlossen", **auch wenn der
 * Fortschritt das nicht sagt**: die angepasste Hypothese wird als neue Version
 * angelegt (s. `saveAdjustedHypothesisAction`), und ab da ist der Durchlauf
 * vorbei, gleichgültig was in `status` steht. Eingeklemmt zwischen vier
 * Supabase-Reads war das eine Zeile, die man beim Lesen überfliegt und beim
 * Ändern kippt — sie stand als `> 1` da und galt damit nur für Durchlauf 1.
 *
 * Die Reihenfolge der drei Fälle ist die Regel: „abgeschlossen" schlägt
 * „Reflexion liegt vor", nicht umgekehrt.
 */

/** Die drei Bühnen der Auswertung (Schritt 3 der Werte-Übung). */
export type EvaluationPhase = "reflection" | "adjust" | "complete";

/**
 * Woran „abgeschlossen" und „gesperrt" sich entscheiden.
 *
 * **`version` IST die Durchlauf-Nummer.** Version N ist der Kompass, der in
 * Durchlauf N getestet wird; die Anpassung am Ende von Durchlauf N entsteht als
 * Version N+1 und wird damit der Kompass von Durchlauf N+1. Deshalb braucht
 * `values_hypothesis` keine eigene `cycle_number` — anders als
 * `journal_entries`, wo die Spalte seit KAN-20 steht.
 */
export type CycleStand = {
  /** `status` der jüngsten Fortschritts-Zeile — `null`, wenn es keine gibt. */
  status: string | null;
  /** Version der jüngsten Hypothese; ohne Hypothese gilt 1. */
  hypothesisVersion: number;
  /** Nummer des laufenden Durchlaufs; ohne Fortschritts-Zeile gilt 1. */
  cycleNumber: number;
};

/**
 * Ist **dieser** Durchlauf vorbei?
 *
 * Abgeschlossen ist ein Durchlauf auf **zwei** Wegen: über den Fortschritt und
 * über eine Hypothesen-Version, die über den laufenden Durchlauf hinausgeht.
 * Der zweite Weg fängt die Zeile ab, bei der das `insert` der neuen Version
 * durchlief und das `update` des Fortschritts danach nicht.
 *
 * `hypothesisVersion > cycleNumber` statt `> 1`: die alte Fassung war die
 * Sonderform für Durchlauf 1 und hat jeden weiteren Durchlauf sofort als
 * abgeschlossen gemeldet — sieben Tage Journal liefen ins Leere (KAN-20).
 */
export function cycleIsComplete({
  status,
  hypothesisVersion,
  cycleNumber,
}: CycleStand): boolean {
  return status === "completed" || hypothesisVersion > cycleNumber;
}

/**
 * Ist Schritt 1 vorbei — steht der Kompass also fest?
 *
 * **Nicht dasselbe wie `cycleIsComplete`,** auch wenn beide im ersten Durchlauf
 * zusammenfallen. „Dieser Durchlauf ist vorbei" wird mit jedem neuen Durchlauf
 * wieder falsch; „die Hypothese ist festgelegt" bleibt wahr. Wer hier
 * `cycleIsComplete` einsetzt, öffnet Schritt 1 im zweiten Durchlauf erneut —
 * und dann schreibt er wieder auf Version 1, also in eine Zeile, die niemand
 * mehr anzeigt (KAN-19).
 *
 * Schritt 1 gehört ausschließlich zum ersten Durchlauf: `startNewCycleAction`
 * beginnt bei Schritt 2, der Kompass des neuen Durchlaufs ist das Ergebnis der
 * Anpassung des vorigen.
 */
export function hypothesisIsLocked({
  status,
  hypothesisVersion,
  cycleNumber,
}: CycleStand): boolean {
  return status === "completed" || hypothesisVersion > 1 || cycleNumber > 1;
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

/** Woran sich die Bühne entscheidet: der Durchlauf plus die Reflexion. */
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
  hasEvalEntry,
  ...cycle
}: EvaluationStand): EvaluationPhase {
  if (cycleIsComplete(cycle)) return "complete";
  return hasEvalEntry ? "adjust" : "reflection";
}
