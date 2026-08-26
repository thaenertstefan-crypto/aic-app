/**
 * Steht die Bildschirmtastatur gerade im Bild? — die eine Antwort auf eine
 * Frage, die iOS von sich aus nicht beantwortet.
 *
 * Es gibt kein „keyboard open“-Flag. iOS verkleinert beim Aufziehen der
 * Tastatur **nicht** den Layout-Viewport, sondern nur den sichtbaren
 * Ausschnitt (Visual Viewport) — und verschiebt ihn nach oben, damit das Feld
 * frei steht. `dvh`, `svh`, `lvh` und `window.innerHeight` bleiben davon alle
 * unberührt; für sie existiert die Tastatur nicht. Was bleibt, ist die Lücke,
 * die der Ausschnitt am unteren Rand des Layout-Viewports frei lässt:
 *
 * ```
 *  ┌───────────── Layout-Viewport ──────┐  ← layoutHeight
 *  │            ↕ visualOffsetTop       │
 *  │  ┌── sichtbarer Ausschnitt ─────┐  │
 *  │  │                              │  │  ← visualHeight
 *  │  └──────────────────────────────┘  │
 *  │            ↕ Lücke                 │  ← hier steht die Tastatur
 *  └────────────────────────────────────┘
 * ```
 *
 * Die Lücke allein reicht als Signal nicht, deshalb sind es **zwei, die sich
 * gegenseitig absichern** — Fokus in einem Feld als Tor, die Lücke als
 * Bestätigung:
 *
 * - Nur der Fokus wäre falsch bei einer **Hardware-Tastatur**: Cursor im Feld,
 *   aber nichts auf dem Schirm. Die Lücke widerspricht.
 * - Nur die Lücke wäre falsch nach dem Schließen auf **iOS 26**: dort springt
 *   `visualViewport.offsetTop` nicht auf 0 zurück (offener Apple-Fehler
 *   FB19889436). Der verschwundene Fokus widerspricht.
 *
 * Ein Schwellwert statt „Lücke > 0“, weil unter dem Ausschnitt auch mal ein
 * Pixel Rundung liegt. In der Homescreen-PWA gibt es keine URL-Leiste, die
 * ihrerseits die Größe ändert — die Tastatur (~290–340 px auf einem 375-px-
 * iPhone) ist dort die einzige Größenänderung, die je auftritt. 150 px liegt
 * mit Abstand zwischen beidem.
 *
 * Hintergrund, Belege und die verworfene Alternative („echt sticky über der
 * Tastatur“): `docs/recherche/kan-33-bottom-nav-und-tastatur.md`.
 */

/** Ab dieser Lücke (px) unter dem Ausschnitt ist es eine Tastatur, kein Rundungsrest. */
const MIN_KEYBOARD_GAP = 150;

export type KeyboardSignals = {
  /** Sitzt der Fokus in einem Eingabefeld? */
  editableFocused: boolean;
  /** Höhe des Layout-Viewports (`window.innerHeight`). */
  layoutHeight: number;
  /** Höhe des sichtbaren Ausschnitts (`visualViewport.height`). */
  visualHeight: number;
  /** Wie weit der Ausschnitt nach unten gewandert ist (`visualViewport.offsetTop`). */
  visualOffsetTop: number;
};

export function isKeyboardOpen({
  editableFocused,
  layoutHeight,
  visualHeight,
  visualOffsetTop,
}: KeyboardSignals): boolean {
  if (!editableFocused) return false;

  // Fehlt eine Messung, lieber „zu“ melden: dann bleibt die Leiste stehen —
  // der harmlose Ausgang. Umgekehrt wäre sie ohne Grund weg.
  const measured = [layoutHeight, visualHeight, visualOffsetTop];
  if (!measured.every(Number.isFinite)) return false;

  return layoutHeight - visualHeight - visualOffsetTop > MIN_KEYBOARD_GAP;
}
