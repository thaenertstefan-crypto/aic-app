/**
 * Die eine Höhenrechnung der Leer-Grammatik: **ein leerer Zustand scrollt nie,
 * er passt auf einen Screen.** Sie steht hier und nicht in der Komponente,
 * damit sie sich prüfen lässt — in der Standalone-PWA verhalten sich
 * Viewport-Einheiten anders als in Safari, und diese Rechnung will man nicht
 * an jeder leeren Fläche einzeln haben (KAN-62).
 *
 * Alle vier Werte sind **Viewport-Koordinaten** (`getBoundingClientRect()`),
 * gemessen im selben Frame:
 *
 * ```
 *  ┌───────────── Viewport ─────────────┐
 *  │  Seitenkopf, Tabs, …               │
 *  │  ┌── Spalte ──────────────┐  top   │
 *  │  │                        │        │
 *  │  └────────────────────────┘  bottom│
 *  │      Seiten-Padding             …  │  ← pageBottom
 *  ├────────── Bottom-Nav ──────────────┤  ← navTop
 *  └────────────────────────────────────┘
 * ```
 *
 * `pageBottom - bottom` ist der Abstand **unter** der Spalte bis zum Ende des
 * Seiteninhalts — Padding der Seite, Ränder, Geschwister. Er ist von der Höhe
 * der Spalte unabhängig, weshalb die eigene Höhe gar nicht erst eingeht: die
 * Rechnung ist damit in einem Durchlauf fertig und beim zweiten ein Fixpunkt
 * (kein Aufschaukeln zwischen Messen und Anwenden).
 *
 * Absichtlich `min-height`, nicht `height`: passt der Inhalt einmal nicht
 * (sehr großer Text, sehr kurzer Screen), wächst die Spalte über das Maß und
 * die Seite scrollt — lieber ein Scroll als abgeschnittene Sätze.
 */
export type EmptyStateFitInput = {
  /** Oberkante der Spalte. */
  top: number;
  /** Unterkante der Spalte. */
  bottom: number;
  /** Unterkante des Seiteninhalts (Spalte plus alles darunter). */
  pageBottom: number;
  /** Oberkante der unteren Navigationsleiste — dort endet die nutzbare Fläche. */
  navTop: number;
};

export function fitEmptyStateHeight({
  top,
  bottom,
  pageBottom,
  navTop,
}: EmptyStateFitInput): number {
  if (![top, bottom, pageBottom, navTop].every(Number.isFinite)) return 0;

  const gapBelow = pageBottom - bottom;
  return Math.max(0, Math.floor(navTop - top - gapBelow));
}
