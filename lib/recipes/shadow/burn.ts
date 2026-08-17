/**
 * Das Verbrenn-Ritual der Shadow-Übung.
 *
 * `burnEntry` trug vorher drei Dinge in einer Funktion: eine
 * Bestätigungs-Invariante als 3500-ms-Timer, eine Persistenz-Entscheidung
 * („bewusst nichts speichern") und **zwei verschiedene Wege** in die Bühne
 * `done`, je nach Motion-Präferenz. Der zweite Weg war nur im Browser und nur
 * mit gesetzter Präferenz überhaupt zu sehen.
 *
 * Hier stehen die beiden Regeln, die daran keine Frage der Animation sind —
 * als reine Funktionen, damit sie unter `node --test` fallen. Nach demselben
 * Muster wie der KI-Schritt: **das Modul gibt die nächste Bühne zurück, die
 * Komponente ruft `setPhase`.** Das Verwerfen des Entwurfs und der
 * Fortschritts-Eintrag bleiben bei der Komponente — das ist Persistenz, keine
 * Regel.
 */

/** Dauer der Verbrenn-Animation (muss zur sh-burn-Keyframe-Dauer passen). */
export const BURN_MS = 1600;

/** Was im Ritual passieren kann. */
export type BurnEvent =
  /** Ein Tap auf „Verbrennen". */
  | "tap"
  /** Der Text wurde geändert. */
  | "edit";

/** Der Stand des Rituals nach einem Ereignis. */
export type BurnState = {
  /** Steht die Nachfrage „Wirklich verbrennen?" danach im Raum? */
  confirming: boolean;
  /**
   * Die Bühne danach. Nie `done` — dorthin führt allein die Verbrenn-Bühne,
   * und zwar auf einem Weg.
   */
  phase: "journal" | "burning";
};

/**
 * Die beiden Übergänge des Rituals.
 *
 * **Die Bestätigung ist eine Regel, kein Timer.** Der erste Tap fragt nach,
 * der zweite verbrennt — und die Nachfrage galt dem Text, wie er dastand: wer
 * weiterschreibt, nimmt sie zurück. Vorher nahm ein 3500-ms-Timer sie dem
 * Nutzer unter den Fingern wieder weg, sodass derselbe zweite Tap je nach
 * Reaktionszeit verbrannte oder erneut nachfragte.
 */
export function burnRitual(confirming: boolean, event: BurnEvent): BurnState {
  if (event === "edit") return { confirming: false, phase: "journal" };
  return confirming
    ? { confirming: false, phase: "burning" }
    : { confirming: true, phase: "journal" };
}

/**
 * Wie lange die Verbrenn-Bühne steht, bevor es nach `done` weitergeht.
 *
 * Die Motion-Präferenz entscheidet über die **Dauer**, nicht über den Weg:
 * bei „Bewegung reduzieren" steht die Bühne 0 ms und derselbe Übergang läuft.
 */
export function burnDuration(reducedMotion: boolean): number {
  return reducedMotion ? 0 : BURN_MS;
}
