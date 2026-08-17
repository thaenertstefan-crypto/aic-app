/**
 * Der Übungszustand von „Nein sagen" — ein Objekt mit benannten Übergängen.
 *
 * Vorher führte der Wizard 27 einzelne `useState`. Weil es kein
 * zusammenhängendes Objekt gab, musste jeder Zurücksetz- und Übernahme-Vorgang
 * jedes Feld von Hand anfassen: `nextScenario()` setzte **13 Felder einzeln**
 * zurück. Jedes neu dazukommende Feld hätte dort nachgetragen werden müssen —
 * sonst leckt Zustand ins nächste Szenario, und zwar still.
 *
 * Deshalb steht hier kein Feld-für-Feld-Zurücksetzen mehr, sondern die
 * Aussage, **was einen Szenario-Wechsel überlebt**: der Modus und die schon
 * gezeigten Szenarien. Alles andere gehört dem einen Versuch und wird frisch
 * gebaut. Ein Feld, das später dazukommt, ist damit automatisch mit
 * zurückgesetzt.
 *
 * Nach demselben Muster wie das Verbrenn-Ritual (`lib/recipes/shadow/burn.ts`):
 * **das Modul rechnet den nächsten Zustand aus, die Komponente rendert ihn.**
 * Kein Fetch, kein Timer, kein React — so fällt die Übung unter `node --test`.
 * Die Bühne, in der ein KI-Schritt endet, kommt weiterhin von
 * `lib/recipes/ai-step.ts` und wird als `phase` mit hereingereicht.
 *
 * Kein Rezept-Modul im Sinne von ADR-0001: hier steht der Zustand *dieser*
 * Übung, nicht der einer beliebigen.
 */

import type { SayingNoChecklist } from "../../types/db-json.ts";
import type { RightSuggestion } from "../right-suggestion.ts";

/** Echte Situation oder Übungsszenario. */
export type Mode = "real" | "practice";

/** Die Bühnen der Übung. */
export type Phase =
  | "mode"
  | "situation"
  | "hellyes"
  | "scenario"
  | "draft"
  | "analyzing"
  | "feedback"
  | "final";

/** Eine Zeile im Blueprint-Check. */
export type ChecklistItem = { pass: boolean; note: string };

/** Der Blueprint-Check — eine Zeile je Schicht aus `blueprint.ts`. */
export type FeedbackChecklist = Record<keyof SayingNoChecklist, ChecklistItem>;

/** Was die KI zum Entwurf zurückmeldet. */
export type Feedback = {
  comment: string;
  checklist: FeedbackChecklist | null;
  /** Die verbesserte Version der KI, oder `null`, wenn sie keine schickt. */
  improved: string | null;
  right: RightSuggestion;
};

export type SayingNoState = {
  phase: Phase;

  // ── Was einen Szenario-Wechsel überlebt ───────────────────────────
  mode: Mode | null;
  /** Schon gezeigte Szenarien — die Route soll sich nicht wiederholen. */
  seenScenarios: string[];

  // ── Der laufende Versuch ──────────────────────────────────────────
  situation: string;
  /** Hat die Person den „Hell yes!"-Check mit ja beantwortet? */
  hellYes: boolean;
  scenarioSource: "ai" | "static";
  scenarioPending: boolean;
  rerolls: number;
  entryId: string | null;
  draft: string;
  /** true, sobald „Nochmal selbst umformulieren" benutzt wurde (max. 1×). */
  revisionUsed: boolean;
  saving: boolean;
  error: string | null;
  comment: string;
  checklist: FeedbackChecklist | null;
  improved: string | null;
  /** Die KI-Version, wie sie im Textfeld steht — editierbar. */
  improvedDraft: string;
  right: RightSuggestion;
  aiError: string | null;
  finalNo: string;
  copied: boolean;
  copyError: string | null;
};

/** Die benannten Übergänge der Übung. */
export type SayingNoEvent =
  | { type: "modeChosen"; mode: Mode }
  | { type: "draftRestored"; mode: Mode | null; situation: string; draft: string }
  | { type: "situationEdited"; text: string }
  | { type: "situationDone" }
  | { type: "hellYesConfirmed" }
  | { type: "draftStarted" }
  | { type: "scenarioLoaded"; text: string; source: "ai" | "static" }
  | { type: "rerolled" }
  | { type: "draftEdited"; text: string }
  | { type: "saving" }
  | { type: "savingFailed"; message: string }
  | { type: "saved"; entryId: string }
  | { type: "feedbackRequested" }
  | { type: "feedbackReceived"; phase: Phase; feedback: Feedback }
  | { type: "feedbackFailed"; phase: Phase; message: string }
  | { type: "revisionStarted" }
  | { type: "improvedEdited"; text: string }
  | { type: "finished"; text: string }
  | { type: "copied" }
  | { type: "copyReset" }
  | { type: "copyFailed"; message: string }
  | { type: "nextScenario" };

/** Der Einstieg: Modus-Wahl, sonst nichts. */
export function initialSayingNo(): SayingNoState {
  return {
    phase: "mode",
    mode: null,
    seenScenarios: [],
    situation: "",
    hellYes: false,
    scenarioSource: "static",
    scenarioPending: false,
    rerolls: 0,
    entryId: null,
    draft: "",
    revisionUsed: false,
    saving: false,
    error: null,
    comment: "",
    checklist: null,
    improved: null,
    improvedDraft: "",
    right: null,
    aiError: null,
    finalNo: "",
    copied: false,
    copyError: null,
  };
}

export function advanceSayingNo(
  state: SayingNoState,
  event: SayingNoEvent,
): SayingNoState {
  switch (event.type) {
    // Der Modus entscheidet die nächste Bühne vollständig — der Übungsmodus
    // beginnt mit dem Laden eines Szenarios, nicht mit dem Warten darauf, dass
    // die Komponente das nachreicht.
    case "modeChosen": {
      const chosen = { ...state, mode: event.mode, situation: "", rerolls: 0 };
      return event.mode === "real"
        ? { ...chosen, phase: "situation" as const }
        : requestScenario(chosen);
    }

    // Ein gesicherter Entwurf springt direkt zum Schreiben — aber nur, wenn er
    // beides mitbringt. Ohne Modus oder Situation stünde die Entwurf-Bühne
    // ohne den Kontext da, auf den sie sich beruft.
    case "draftRestored":
      return {
        ...state,
        mode: event.mode,
        situation: event.situation,
        draft: event.draft,
        phase: event.mode && event.situation ? "draft" : state.phase,
      };

    case "situationEdited":
      return { ...state, situation: event.text };

    // Der Check gilt der Anfrage, wie sie dasteht — wer die Situation neu
    // vorlegt, bekommt ihn frisch gestellt.
    case "situationDone":
      return { ...state, hellYes: false, phase: "hellyes" };

    case "hellYesConfirmed":
      return { ...state, hellYes: true };

    case "draftStarted":
      return { ...state, phase: "draft" };

    case "scenarioLoaded":
      return {
        ...state,
        situation: event.text,
        scenarioSource: event.source,
        seenScenarios: [...state.seenScenarios, event.text],
        scenarioPending: false,
      };

    case "rerolled":
      return requestScenario({ ...state, rerolls: state.rerolls + 1 });

    case "draftEdited":
      return { ...state, draft: event.text };

    case "saving":
      return { ...state, saving: true, error: null };

    case "savingFailed":
      return { ...state, saving: false, error: event.message };

    case "saved":
      return { ...state, saving: false, entryId: event.entryId };

    // Der zweite Anlauf erbt nichts vom ersten: bliebe auch nur der
    // Rechts-Vorschlag stehen, zeigte der Abschluss ein Recht zu einem
    // Feedback, das es nicht mehr gibt.
    case "feedbackRequested":
      return { ...state, ...noFeedback(), phase: "analyzing" };

    case "feedbackReceived":
      return {
        ...state,
        comment: event.feedback.comment,
        checklist: event.feedback.checklist,
        improved: event.feedback.improved,
        improvedDraft: event.feedback.improved ?? "",
        right: event.feedback.right,
        aiError: null,
        phase: event.phase,
      };

    case "feedbackFailed":
      return { ...state, aiError: event.message, phase: event.phase };

    case "revisionStarted":
      return { ...state, revisionUsed: true, error: null, phase: "draft" };

    case "improvedEdited":
      return { ...state, improvedDraft: event.text };

    case "finished": {
      const chosen = event.text.trim();
      if (!chosen) return state;
      return { ...state, finalNo: chosen, copied: false, copyError: null, phase: "final" };
    }

    case "copied":
      return { ...state, copied: true, copyError: null };

    // Die Bestätigung „Kopiert!" steht nur kurz — danach lädt der Button
    // wieder zum Kopieren ein.
    case "copyReset":
      return { ...state, copied: false };

    case "copyFailed":
      return { ...state, copied: false, copyError: event.message };

    // Hier steht keine Feldliste, sondern was den Wechsel überlebt.
    case "nextScenario":
      return requestScenario({
        ...initialSayingNo(),
        mode: state.mode,
        seenScenarios: state.seenScenarios,
      });
  }
}

/**
 * Eine Szenario-Anfrage sieht immer gleich aus, egal woher sie kommt: aus der
 * Modus-Wahl, aus „Anderes Szenario" oder aus `nextScenario`. Deshalb steht sie
 * hier einmal und nicht als eigenes Ereignis, das die Komponente hinterher
 * nachreichen müsste — sonst hinge die Bühne wieder an der Aufrufreihenfolge.
 */
function requestScenario(state: SayingNoState): SayingNoState {
  return { ...state, scenarioPending: true, phase: "scenario" };
}

/** Der Stand „es liegt kein Feedback vor" — vollständig, nicht in Auswahl. */
function noFeedback() {
  return {
    comment: "",
    checklist: null,
    improved: null,
    improvedDraft: "",
    right: null,
    aiError: null,
  } satisfies Partial<SayingNoState>;
}
