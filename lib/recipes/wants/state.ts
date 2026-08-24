/**
 * Der Übungszustand der Sternensuche („Wants") — ein Objekt mit benannten
 * Übergängen.
 *
 * Vorher führte die Bühnenfolge 21 einzelne `useState`. Am teuersten war das
 * beim Nachschärfen eines Sterns: ein geglücktes „Konkreter machen" war drei
 * verschachtelte Setter (Text ersetzen, Rückfrage schließen, Antwort aus einer
 * Map löschen) — drei Stellen, die zusammengehören und nur durch Reihenfolge
 * zusammenhielten. Hier ist das **ein** Übergang.
 *
 * Und wie bei den anderen Übungen steht das Zurücksetzen vor einem zweiten
 * KI-Anlauf nicht mehr als Feldliste da, sondern als Aussage darüber, **was
 * ein neues Destillat überlebt**: die Antworten der Sternensuche und der
 * Eintrag, aus dem destilliert wird.
 *
 * Nach demselben Muster wie `lib/recipes/saying-no/state.ts`: **das Modul
 * rechnet den nächsten Zustand aus, die Komponente rendert ihn.** Die Bühne,
 * in der ein KI-Schritt endet, kommt von `lib/recipes/ai-step.ts` und wird als
 * `phase` hereingereicht.
 */

import type { SavedEntryId } from "../saved-entry.ts";

/** Die Bühnen der Übung. */
export type Phase =
  | "nudge"
  | "yin"
  | "yang"
  | "tagtraum"
  | "analyzing"
  | "sterne"
  | "done";

/** Die drei Fragen der Sternensuche — je eine Liste von Antwortfeldern. */
export type AuditField = "yin" | "yang" | "tagtraum";

/** Vorgeschlagene Antwortfelder je Frage (eines ist Pflicht). */
export const START_BOXES = 3;

/** Mehr Antwortfelder als so bietet eine Frage nicht an. */
export const MAX_ANSWER_BOXES = 6;

/** Was ein einzelnes Antwortfeld trägt. Der Deckel, aus dem alles folgt:
 *  ein ferner Stern ist der Wortlaut eines Antwortfelds, also muss der
 *  Text-Cap von `WantItem` mitgehen (s. `isWantItem`). */
export const ANSWER_MAX = 800;

/** Was eine ganze Frage trägt — abgeleitet, nicht frei gesetzt. Vorher stand
 *  vor dem Modellaufruf eine freie 2000, unter der sechs volle Boxen still
 *  abgeschnitten wurden. */
export const ANSWER_LIST_MAX = MAX_ANSWER_BOXES * ANSWER_MAX;

/** Ein Stern-Entwurf im Client-State — die id wird beim Bestätigen zur WantItem-id. */
export type DraftWant = {
  id: string;
  text: string;
  title: string | null;
  /** Der konkrete Anker zum Satz („z. B. einen Marathon") — eigenes Feld,
   *  damit später niemand an einem Geviertstrich parsen muss. */
  example: string | null;
  distance: "nah" | "fern";
  valueId: string | null;
  valueLabel: string | null;
  reason: string | null;
  /** Rückfrage der KI, um den Stern zu schärfen — `null`, sobald erledigt. */
  question: string | null;
  source: "ai" | "own";
};

/** Was die KI aus der Sternensuche herausliest. */
export type Distillate = {
  comment: string;
  /** Die destillierten Sterne — ausschließlich NAHE. Ferne kommen nie aus
   *  dem Modell (ADR-0005). */
  wants: DraftWant[];
  /** Die Namen für die fernen Sterne, in der Reihenfolge der ausgefüllten
   *  Antwortfelder der Tagtraum-Frage. Kürzer als die Liste der fernen
   *  Sterne heißt schlicht: die hinteren bleiben namenlos. */
  farTitles: (string | null)[];
};

export type WantsState = {
  phase: Phase;

  // ── Was ein neues Destillat überlebt ──────────────────────────────
  yin: string[];
  yang: string[];
  tagtraum: string[];
  principles: string;
  principlesOpen: boolean;
  saving: boolean;
  error: string | null;
  /** Der Beleg des gespeicherten Audits — erst er macht das Destillat möglich. */
  entryId: SavedEntryId | null;

  // ── Das Destillat ─────────────────────────────────────────────────
  comment: string;
  aiError: string | null;
  /** true, wenn die Sterne selbst formuliert werden — statt aus der KI. */
  manualMode: boolean;
  wants: DraftWant[];
  newWantText: string;
  savingWants: boolean;
  wantsError: string | null;
  /** Welche Sterne aufgeklappt sind (Tap-to-Edit) — unabhängig voneinander. */
  openIds: string[];
  refineAnswers: Record<string, string>;
  refiningId: string | null;
  refineErrors: Record<string, string>;
};

/** Die benannten Übergänge der Übung. */
export type WantsEvent =
  /** Freie Navigation innerhalb der Sternensuche (Weiter / Zurück). */
  | { type: "stageChanged"; phase: Extract<Phase, "nudge" | "yin" | "yang" | "tagtraum"> }
  | { type: "answersEdited"; field: AuditField; answers: string[] }
  | { type: "principlesEdited"; text: string }
  | { type: "principlesToggled" }
  | {
      type: "draftRestored";
      yin: string[];
      yang: string[];
      tagtraum: string[];
      principles: string;
    }
  | { type: "saving" }
  | { type: "savingFailed"; message: string }
  | { type: "saved"; entryId: SavedEntryId }
  | { type: "distillateRequested"; farWants: DraftWant[] }
  | { type: "distillateReceived"; phase: Phase; distillate: Distillate }
  | { type: "distillateFailed"; phase: Phase; message: string }
  | { type: "manualStarted" }
  | { type: "newWantEdited"; text: string }
  | { type: "ownWantAdded"; id: string; text: string }
  | { type: "wantEdited"; id: string; patch: { text?: string; title?: string } }
  | { type: "wantDiscarded"; id: string }
  | { type: "wantToggled"; id: string }
  | { type: "refineAnswerEdited"; id: string; text: string }
  | { type: "refineRequested"; id: string }
  | { type: "refineSucceeded"; id: string; text: string }
  | { type: "refineFailed"; id: string; message: string }
  | { type: "wantsSaving" }
  | { type: "wantsSaveFailed"; message: string }
  | { type: "wantsSaved" };

/**
 * Der Einstieg. Steht schon eine Werte-Hypothese, geht es direkt los —
 * sonst kommt erst der Hinweis, dass der Kompass die Sterne heller macht.
 */
export function initialWants(hasValuesHypothesis: boolean): WantsState {
  return {
    phase: hasValuesHypothesis ? "yin" : "nudge",
    yin: emptyAnswers(),
    yang: emptyAnswers(),
    tagtraum: emptyAnswers(),
    principles: "",
    principlesOpen: false,
    saving: false,
    error: null,
    entryId: null,
    ...noDistillate(),
  };
}

export function advanceWants(state: WantsState, event: WantsEvent): WantsState {
  switch (event.type) {
    case "stageChanged":
      return { ...state, phase: event.phase };

    case "answersEdited":
      return { ...state, [event.field]: event.answers };

    case "principlesEdited":
      return { ...state, principles: event.text };

    case "principlesToggled":
      return { ...state, principlesOpen: !state.principlesOpen };

    // Ein Entwurf ohne Antworten ist kein leeres Feld, sondern gar keiner —
    // dann stehen wieder die vorgeschlagenen Boxen da.
    case "draftRestored":
      return {
        ...state,
        yin: event.yin.length > 0 ? event.yin : emptyAnswers(),
        yang: event.yang.length > 0 ? event.yang : emptyAnswers(),
        tagtraum: event.tagtraum.length > 0 ? event.tagtraum : emptyAnswers(),
        principles: event.principles,
        principlesOpen: state.principlesOpen || Boolean(event.principles),
      };

    case "saving":
      return { ...state, saving: true, error: null };

    case "savingFailed":
      return { ...state, saving: false, error: event.message };

    case "saved":
      return { ...state, saving: false, entryId: event.entryId };

    // Hier steht keine Feldliste, sondern was den Anlauf überlebt: die Sterne
    // des ersten Destillats gehören zu ihm und gehen mit ihm.
    //
    // Die fernen Sterne sind die eine Ausnahme — sie kommen nicht aus dem
    // Modell, sondern aus den Antwortfeldern, und stehen deshalb schon da,
    // bevor gefragt wird. Ein Ausfall kostet sie nur ihren Namen.
    case "distillateRequested":
      return {
        ...state,
        ...noDistillate(),
        wants: event.farWants,
        phase: "analyzing",
      };

    // Was hier ankommt, tritt neben die fernen Sterne, statt sie zu ersetzen:
    // die nahen als ganze Sterne, für die fernen nur die Namen.
    case "distillateReceived": {
      const far = state.wants.map((want, i) => {
        const title = event.distillate.farTitles[i];
        return title && !want.title ? { ...want, title } : want;
      });
      const wants = [...event.distillate.wants, ...far];

      return {
        ...state,
        comment: event.distillate.comment,
        wants,
        // Ohne Vorschläge stünde die Bühne leer da — dann formuliert man selbst.
        manualMode: wants.length === 0,
        aiError: null,
        phase: event.phase,
      };
    }

    case "distillateFailed":
      return { ...state, aiError: event.message, phase: event.phase };

    case "manualStarted":
      return { ...state, aiError: null, manualMode: true };

    case "newWantEdited":
      return { ...state, newWantText: event.text };

    // Ein selbst geschriebener Stern kommt aufgeklappt — er will benannt werden.
    case "ownWantAdded":
      return {
        ...state,
        wants: [
          ...state.wants,
          {
            id: event.id,
            text: event.text.trim(),
            title: null,
            example: null,
            // Fest „nah": „fern" ist eine Herkunftsmarke (aus einem
            // Antwortfeld der Tagtraum-Frage), keine Einstellung. CONTEXT.md.
            distance: "nah",
            valueId: null,
            valueLabel: null,
            reason: null,
            question: null,
            source: "own",
          },
        ],
        openIds: [...state.openIds, event.id],
        newWantText: "",
      };

    case "wantEdited":
      return {
        ...state,
        wants: state.wants.map((w) =>
          w.id === event.id ? { ...w, ...event.patch } : w,
        ),
      };

    case "wantDiscarded":
      return {
        ...state,
        wants: state.wants.filter((w) => w.id !== event.id),
        openIds: state.openIds.filter((id) => id !== event.id),
      };

    case "wantToggled":
      return {
        ...state,
        openIds: state.openIds.includes(event.id)
          ? state.openIds.filter((id) => id !== event.id)
          : [...state.openIds, event.id],
      };

    case "refineAnswerEdited":
      return {
        ...state,
        refineAnswers: { ...state.refineAnswers, [event.id]: event.text },
      };

    case "refineRequested":
      return { ...state, refiningId: event.id, refineErrors: without(state.refineErrors, event.id) };

    // Ein Übergang, keine drei: der geschärfte Text steht, die Rückfrage ist
    // beantwortet und die Antwort hat ihren Zweck erfüllt.
    //
    // Das Beispiel fällt mit: der Refiner bekommt den ganzen Satz (samt
    // Beispiel) und gibt einen neuen zurück. Bliebe das alte Feld stehen,
    // klebte `wantSentence` einen überholten Anker an den neuen Satz.
    case "refineSucceeded":
      return {
        ...state,
        wants: state.wants.map((w) =>
          w.id === event.id
            ? { ...w, text: event.text, example: null, question: null }
            : w,
        ),
        refineAnswers: without(state.refineAnswers, event.id),
        refiningId: null,
      };

    case "refineFailed":
      return {
        ...state,
        refiningId: null,
        refineErrors: { ...state.refineErrors, [event.id]: event.message },
      };

    case "wantsSaving":
      return { ...state, savingWants: true, wantsError: null };

    case "wantsSaveFailed":
      return { ...state, savingWants: false, wantsError: event.message };

    case "wantsSaved":
      return { ...state, savingWants: false, phase: "done" };
  }
}

/** Ein Stern ohne Text ist keiner — er zählt nicht und wird nicht gespeichert. */
export function keptWants(state: WantsState): DraftWant[] {
  return state.wants.filter((w) => w.text.trim());
}

/**
 * Die ausgefüllten Antwortfelder einer Frage — **die eine Rechnung**.
 *
 * Client, Action und KI-Route müssen hier zum selben Ergebnis kommen: der
 * Client baut daraus die fernen Sterne, die Action speichert dieselbe Liste,
 * die Route schickt sie ans Modell und bekommt Namen in derselben Reihenfolge
 * zurück. Zwei Filter, die sich auseinanderentwickeln — oder eine Kappung, die
 * nur an zwei von drei Stellen steht — hängten die Namen an die falschen
 * Sterne. Deshalb trägt diese Funktion auch den Deckel.
 */
export function filledAnswers(answers: string[]): string[] {
  return answers
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, MAX_ANSWER_BOXES);
}

/** Nicht-leere Antworten zeilenweise zusammenfügen (für die Action). */
export function joinAnswers(answers: string[]): string {
  return filledAnswers(answers).join("\n");
}

/**
 * Aus jedem ausgefüllten Antwortfeld der Tagtraum-Frage genau ein ferner
 * Stern — im unveränderten Wortlaut der Person.
 *
 * Das ist der Kern von ADR-0005: der Wortlaut läuft nie durch das Modell,
 * also kann ihn auch kein Prompt-Regress mehr kürzen, zusammenlegen oder für
 * unklar halten. Ein mehrzeiliges Antwortfeld bleibt **ein** Stern.
 *
 * `newId` kommt herein, damit das Modul rein bleibt (`crypto.randomUUID` im
 * Client, eine zählbare Quelle im Test).
 */
export function farDrafts(answers: string[], newId: () => string): DraftWant[] {
  return filledAnswers(answers).map((text) => ({
    id: newId(),
    text,
    title: null,
    example: null,
    distance: "fern",
    valueId: null,
    valueLabel: null,
    reason: null,
    question: null,
    // Der Satz stammt Wort für Wort von der Person, nicht vom Modell.
    source: "own",
  }));
}

function emptyAnswers(): string[] {
  return Array<string>(START_BOXES).fill("");
}

/** Der Stand „es liegt kein Destillat vor" — vollständig, nicht in Auswahl. */
function noDistillate() {
  return {
    comment: "",
    aiError: null,
    manualMode: false,
    wants: [],
    newWantText: "",
    savingWants: false,
    wantsError: null,
    openIds: [],
    refineAnswers: {},
    refiningId: null,
    refineErrors: {},
  } satisfies Partial<WantsState>;
}

/** Einen Schlüssel entfernen, ohne den Bestand anzufassen. */
function without<T>(map: Record<string, T>, key: string): Record<string, T> {
  const next = { ...map };
  delete next[key];
  return next;
}
