/**
 * Der Zustand der **Belegwand** — der Momente unterhalb eines Sterns im
 * Fokus-State (KAN-59) — als reines Modul mit benannten Übergängen.
 *
 * Die Fläche selbst steht in `app/(app)/me/wants/moment-wall.tsx`; die
 * Entscheidungen dahinter in KAN-37: Liste statt Stapel, keine Kürzung,
 * Hinzufügen ohne Modus.
 *
 * Der Kern ist der **eine** Composer. Hinzufügen und Bearbeiten sind in dieser
 * Wand dieselbe Geste — eine Zeile klappt an Ort und Stelle in Textarea samt
 * „Abbrechen“ / „Festhalten“ auf —, und es ist immer höchstens eine offen.
 * Damit sind `draft`, `saving`, `error` und das scharf gestellte Löschen
 * Eigenschaften *dieser einen Öffnung* statt paralleler Felder, die nur durch
 * Aufrufreihenfolge zusammenhalten. Zumachen heißt deshalb: **nichts
 * überlebt** — `initialMomentWall()` ist der vollständige geschlossene Wert,
 * keine Feldauswahl.
 */

/**
 * Was gerade offen ist: nichts, die Add-Zeile am Fuß, oder ein bestimmter
 * Moment.
 *
 * Bewusst eine Union statt zweier Booleans: „die Add-Zeile ist offen **und**
 * Moment m3 wird bearbeitet“ ist kein Zustand, den es gibt, und ein Typ, der
 * ihn nicht ausdrücken kann, muss ihn auch nicht behandeln.
 */
export type MomentComposer =
  | { kind: "closed" }
  | { kind: "new" }
  | { kind: "edit"; id: string };

export type MomentWallState = {
  composer: MomentComposer;
  /** Der getippte Text der offenen Zeile. */
  draft: string;
  /** Die zweite Stufe des Löschens ist scharf („Wirklich löschen?“). */
  confirmDelete: boolean;
  /** Ein Schreibvorgang läuft — der Knopf ist gesperrt. */
  saving: boolean;
  /** Die warme Meldung eines misslungenen Schreibvorgangs. */
  error: string | null;
};

export type MomentWallEvent =
  /** Die gestrichelte Zeile am Fuß klappt auf. */
  | { type: "compose" }
  /** Ein Moment in der Wand klappt an Ort und Stelle auf. */
  | { type: "edit"; id: string; text: string }
  | { type: "type"; text: string }
  /** Die zweite Stufe des Löschens scharf stellen. */
  | { type: "askDelete" }
  /** Der Schreibvorgang startet. */
  | { type: "submit" }
  | { type: "failed"; message: string }
  /** Gespeichert oder gelöscht — die Zeile schließt. */
  | { type: "done" }
  | { type: "cancel" };

/** Die geschlossene Wand — der vollständige Wert, auf den jeder Schluss fällt. */
export function initialMomentWall(): MomentWallState {
  return {
    composer: { kind: "closed" },
    draft: "",
    confirmDelete: false,
    saving: false,
    error: null,
  };
}

/**
 * Eine frisch geöffnete Zeile: der Composer und sein Entwurf, alles andere aus
 * `initialMomentWall()`.
 *
 * Die eine Stelle, an der eine Öffnung entsteht — sonst müsste jeder der
 * beiden Öffnen-Übergänge dieselben drei Felder einzeln zurücksetzen, und der
 * dritte würde eines vergessen.
 */
function opened(composer: MomentComposer, draft: string): MomentWallState {
  return { ...initialMomentWall(), composer, draft };
}

export function advanceMomentWall(
  state: MomentWallState,
  event: MomentWallEvent,
): MomentWallState {
  switch (event.type) {
    case "compose":
      return opened({ kind: "new" }, "");

    // Ohne Zwischenschritt über „geschlossen“: in der Wand ist jeder Moment
    // antippbar, und ein offener Composer darf den Sprung auf den nächsten
    // nicht erst durch ein Abbrechen zwingen.
    case "edit":
      return opened({ kind: "edit", id: event.id }, event.text);

    // Weiterschreiben beantwortet beides: die stehende Fehlermeldung gehörte
    // zum abgeschickten Text, und wer tippt, löscht gerade nicht.
    case "type":
      return { ...state, draft: event.text, error: null, confirmDelete: false };

    case "askDelete":
      return { ...state, confirmDelete: true, error: null };

    case "submit":
      return { ...state, saving: true, error: null };

    // Der Entwurf bleibt stehen — ein misslungenes Speichern darf den Beleg
    // nicht verschlucken.
    case "failed":
      return { ...state, saving: false, error: event.message };

    case "done":
    case "cancel":
      return initialMomentWall();
  }
}

/** Ob „Festhalten“ jetzt greifen darf. */
export function canSubmitMomentWall(state: MomentWallState): boolean {
  return (
    state.composer.kind !== "closed" &&
    !state.saving &&
    state.draft.trim().length > 0
  );
}

/** Die id des gerade bearbeiteten Moments — `null` bei Add-Zeile und Ruhe. */
export function editedMomentId(state: MomentWallState): string | null {
  return state.composer.kind === "edit" ? state.composer.id : null;
}

/**
 * Die deutschen Monatsnamen ausgeschrieben.
 *
 * Von Hand statt über `toLocaleDateString("de-DE", …)`: dieselbe Überlegung
 * wie bei `formatDateDE` in `lib/utils/date.ts` — die Beschriftung soll nicht
 * davon abhängen, welches ICU-Paket gerade unter der Laufzeit liegt.
 */
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/**
 * Das Datum über einem Beleg: „3. Juli“, mit Jahr, sobald es ein anderes als
 * das laufende ist.
 *
 * Eine Belegwand wächst über Jahre; ohne Jahr stünden zwei „3. Juli“
 * ununterscheidbar untereinander. Im laufenden Jahr trüge es dagegen nur
 * Gewicht, das die Zeile nicht braucht.
 *
 * `createdAt` ist der volle `timestamptz` der Spalte, gelesen in der lokalen
 * Zeit dessen, der die Wand ansieht — die Wand rendert nur im Fokus-Overlay,
 * also erst nach einem Tap im Client, wo es keine Hydration zu treffen gibt.
 *
 * `null` für alles, was sich nicht lesen lässt: lieber keine Zeile über einem
 * Beleg als „NaN. undefined“.
 */
export function momentDateLabel(
  createdAt: string,
  now: Date = new Date(),
): string | null {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;

  const month = MONTHS[date.getMonth()];
  const day = `${date.getDate()}. ${month}`;
  return date.getFullYear() === now.getFullYear()
    ? day
    : `${day} ${date.getFullYear()}`;
}
