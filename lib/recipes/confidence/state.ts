/**
 * Der Übungszustand des Confidence-Boosts („Gleich bin ich dran") — ein Objekt
 * mit benannten Übergängen, nach demselben Muster wie
 * `lib/recipes/things-got-messy/state.ts` und `lib/recipes/saying-no/state.ts`:
 * **das Modul rechnet den nächsten Zustand aus, die Komponente rendert ihn.**
 *
 * Die Übung läuft geradeaus: vier Schritte, dann der Abschluss. Es gibt keinen
 * zweiten Anlauf und kein nächstes Szenario — wer sie erneut braucht, kommt neu
 * über den Hub herein und startet frisch. Deshalb steht hier keine
 * „was überlebt den Wechsel"-Aussage: es gibt keinen Wechsel, den etwas
 * überleben könnte.
 */

/** Die Bühnen der Übung. `go` ist der Abschluss und zählt nicht mit. */
export type Step = "breathe" | "body" | "voice" | "reminder" | "go";

/**
 * Die Reihenfolge ist die Übung. Sie steht hier einmal — die Fortschritts-
 * anzeige („Schritt X von 4") und der Übergang lesen beide daraus, damit ein
 * eingefügter Schritt nicht an zwei Stellen nachgezogen werden muss.
 */
const ORDER: Step[] = ["breathe", "body", "voice", "reminder", "go"];

/** Wie viele Schritte gezählt werden — der Abschluss ist keiner. */
export const COUNTED_STEPS = ORDER.length - 1;

export type ConfidenceState = {
  step: Step;
  /**
   * Hat die 4-7-8-Atmung ihre vier Runden durch? Trägt nur den „Weiter"-Knopf:
   * vorher zurückhaltend, danach einladend. Weiter darf man jederzeit.
   */
  breathingDone: boolean;
};

/** Die benannten Übergänge der Übung. */
export type ConfidenceEvent =
  | { type: "breathingFinished" }
  | { type: "stepFinished" };

/** Der Einstieg: die Atmung, noch ungelaufen. */
export function initialConfidence(): ConfidenceState {
  return { step: "breathe", breathingDone: false };
}

export function advanceConfidence(
  state: ConfidenceState,
  event: ConfidenceEvent,
): ConfidenceState {
  switch (event.type) {
    case "breathingFinished":
      return { ...state, breathingDone: true };

    // Am Abschluss angekommen bleibt die Übung stehen — von dort führt nur
    // noch der Weg zurück auf den Hub, kein weiterer Übergang.
    case "stepFinished": {
      const upcoming = ORDER[ORDER.indexOf(state.step) + 1];
      return upcoming ? { ...state, step: upcoming } : state;
    }
  }
}

/** Die Nummer eines Schritts für die Fortschrittsanzeige (1-basiert). */
export function stepNumber(step: Step): number {
  return ORDER.indexOf(step) + 1;
}
