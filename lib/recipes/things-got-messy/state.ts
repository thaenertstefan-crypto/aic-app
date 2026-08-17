/**
 * Der Übungszustand von „Things got messy" — ein Objekt mit benannten
 * Übergängen.
 *
 * Vorher führte der Wizard 18 einzelne `useState`, und das Zurücksetzen vor
 * einem zweiten Auswertungs-Versuch war eine Feldliste von Hand: `guilt` und
 * `rules` standen darin, `analysis`, `right` und die Stimmigkeits-Rückmeldung
 * nicht. Der Kommentar daneben sagte „Retry darf keine Werte des vorherigen
 * Versuchs behalten" — die Liste hielt das Versprechen nur zur Hälfte.
 *
 * Deshalb steht hier statt der Liste die Aussage, **was eine neue Auswertung
 * überlebt**: der Text und der Eintrag, dem sie gilt. Alles andere ist die
 * Auswertung selbst und wird frisch gebaut.
 *
 * Nach demselben Muster wie `lib/recipes/saying-no/state.ts`: **das Modul
 * rechnet den nächsten Zustand aus, die Komponente rendert ihn.** Die Bühne,
 * in der ein KI-Schritt endet, kommt von `lib/recipes/ai-step.ts` und wird als
 * `phase` hereingereicht.
 */

import type { RightSuggestion } from "../right-suggestion.ts";

/** Die Bühnen der Übung. */
export type Phase = "reflect" | "analyzing" | "result";

/** Gesundes oder ungesundes Schuldgefühl — oder das Modell legt sich nicht fest. */
export type Guilt = "healthy" | "unhealthy" | null;

/** Was die KI zum Moment zurückmeldet. */
export type Analysis = {
  analysis: string;
  guilt: Guilt;
  /** Die zwei Regeln, die gerungen haben — oder `null`. */
  rules: string | null;
  right: RightSuggestion;
};

export type MessyState = {
  phase: Phase;

  // ── Was eine neue Auswertung überlebt ─────────────────────────────
  messyWhen: string;
  entryId: string | null;
  saving: boolean;
  error: string | null;

  // ── Die Auswertung ────────────────────────────────────────────────
  analysis: string;
  guilt: Guilt;
  rules: string | null;
  right: RightSuggestion;
  aiError: string | null;
  /** Antwort auf „Fühlt sich das stimmig an?" — gilt genau dieser Auswertung. */
  feedback: "agree" | "disagree" | null;
  feedbackPending: boolean;
  feedbackError: string | null;
};

/** Die benannten Übergänge der Übung. */
export type MessyEvent =
  | { type: "draftRestored"; messyWhen: string }
  | { type: "messyEdited"; text: string }
  | { type: "saving" }
  | { type: "savingFailed"; message: string }
  | { type: "saved"; entryId: string }
  | { type: "analysisRequested" }
  | { type: "analysisReceived"; phase: Phase; analysis: Analysis }
  | { type: "analysisFailed"; phase: Phase; message: string }
  | { type: "feedbackSending" }
  | { type: "feedbackSent"; value: "agree" | "disagree" }
  | { type: "feedbackFailed"; message: string };

/** Der Einstieg: die Reflexionsfrage, sonst nichts. */
export function initialMessy(): MessyState {
  return {
    phase: "reflect",
    messyWhen: "",
    entryId: null,
    saving: false,
    error: null,
    analysis: "",
    guilt: null,
    rules: null,
    right: null,
    aiError: null,
    feedback: null,
    feedbackPending: false,
    feedbackError: null,
  };
}

export function advanceMessy(state: MessyState, event: MessyEvent): MessyState {
  switch (event.type) {
    // Alte Entwürfe trugen zusätzlich conflicting_rules/guilt_type — gelesen
    // wird nur noch der Text.
    case "draftRestored":
      return { ...state, messyWhen: event.messyWhen };

    case "messyEdited":
      return { ...state, messyWhen: event.text };

    case "saving":
      return { ...state, saving: true, error: null };

    case "savingFailed":
      return { ...state, saving: false, error: event.message };

    case "saved":
      return { ...state, saving: false, entryId: event.entryId };

    // Hier steht keine Feldliste, sondern was den Anlauf überlebt: die
    // Stimmigkeits-Rückmeldung galt der alten Auswertung und geht mit ihr.
    case "analysisRequested":
      return { ...state, ...noAnalysis(), phase: "analyzing" };

    case "analysisReceived":
      return {
        ...state,
        analysis: event.analysis.analysis,
        guilt: event.analysis.guilt,
        rules: event.analysis.rules,
        right: event.analysis.right,
        aiError: null,
        phase: event.phase,
      };

    case "analysisFailed":
      return { ...state, aiError: event.message, phase: event.phase };

    case "feedbackSending":
      return { ...state, feedbackPending: true, feedbackError: null };

    // Erst gespeichert, dann gemerkt — sonst dankt die Bühne für eine
    // Rückmeldung, die nie ankam.
    case "feedbackSent":
      return { ...state, feedback: event.value, feedbackPending: false };

    case "feedbackFailed":
      return { ...state, feedbackPending: false, feedbackError: event.message };
  }
}

/** Der Stand „es liegt keine Auswertung vor" — vollständig, nicht in Auswahl. */
function noAnalysis() {
  return {
    analysis: "",
    guilt: null,
    rules: null,
    right: null,
    aiError: null,
    feedback: null,
    feedbackPending: false,
    feedbackError: null,
  } satisfies Partial<MessyState>;
}
