/**
 * „Der Wurf" — die Zahlen und die Geometrie des Kopfwetter-Flugs (KAN-60).
 *
 * Der Flug trägt **einen** Gegenstand von A nach B: das Wetter-Motiv der
 * angetippten Zelle. Er reist auf einer geraden Linie und wächst dabei **genau
 * einmal**. Keine Kamerafahrt, kein Zwischenhalt, keine zweite Kurve — der
 * frühere Kamera-Push schob 64 → 154 → 96 und machte aus einer Bewegung drei
 * Ereignisse.
 *
 * Die Dauer ist der tragende Wert, nicht die Bahn: die Diagonale war nie das
 * Problem, ihre Länge war es. Bei 375 px sind ±127 px Seitwärts über ~940 ms
 * als eigene Absicht lesbar — über 380 ms nicht mehr.
 *
 * Hier stehen nur Zahlen und reine Rechnung. Wer sie inszeniert, steht in
 * `components/booster/booster-flug.tsx`; wie sie aussieht, in `globals.css`.
 */

/** Mittelpunkt in Viewport-Koordinaten + gerenderte Kantenlänge (px). */
export type FlugRect = { x: number; y: number; size: number };

/** Die vier Kontrollpunkt-Koordinaten einer `cubic-bezier()`. */
export type Kurve = readonly [number, number, number, number];

/** Kantenlänge des Motivs im Auge der Hub-Zelle (`size-16`). */
export const ZELLE_PX = 64;
/** Kantenlänge des Modul-Icons auf der Sub-Page (`size-24`). */
export const ZIEL_PX = 96;

/**
 * Abstand vom oberen Viewport-Rand (unterhalb der Safe Area) zum Mittelpunkt
 * des Modul-Icons. Alle fünf Booster-Sub-Pages bauen ihren Einstiegs-Screen
 * gleich auf, der Landeplatz ist damit rechenbar statt gemeldet:
 *
 *   61  SubPageHeader — py-3 (12 + 12) + size-9 Zurück-Pfeil (36) + border-b (1);
 *       keiner der fünf Header setzt `subtitle`, die Zeilenhöhe des Titels
 *       (text-lg → 28) bleibt also unter der des Zurück-Pfeils
 * + 24  Content-Wrapper py-6
 * +  4  ModuleIcon-Wrapper pt-1
 * + 48  halbe Icon-Höhe (size-24)
 *
 * Der Wert ist nur der Startwert: ab der zweiten Reise einer Session gewinnt
 * der gemessene Rect, die Vorhersage heilt sich also selbst, falls das Layout
 * wandert. Warum überhaupt vorausberechnet: die Sub-Pages sind async Server
 * Components mit Supabase-Roundtrip; hinge der Flug an ihrem Mount, stünde der
 * Klon 300–800 ms still in der Luft.
 */
const LANDE_KOPF = 61;
const LANDE_INHALT = 24;
const LANDE_ICON_POLSTER = 4;
export const LANDE_Y =
  LANDE_KOPF + LANDE_INHALT + LANDE_ICON_POLSTER + ZIEL_PX / 2;

/** Hinflug: Hub → Sub-Page. */
export const HIN_MS = 380;
/** Der Rückweg ist dieselbe Bahn rückwärts, schneller: 0,78× des Hinflugs. */
export const RUECK_MS = Math.round(HIN_MS * 0.78);

/** Die Kurve des Wurfs. Der Rückflug fliegt sie umgekehrt (siehe `umgekehrt`). */
export const WURF: Kurve = [0.34, 0.62, 0.24, 1];

/** Die Bühne, die der Flug verlässt: ausblenden, reine Opacity — sonst nichts. */
export const BUEHNE_AUS_MS = 200;
/** Übergabe Klon → echtes Icon. Überlappend, damit kein Loch ohne Icon entsteht. */
export const UEBERGABE_MS = 220;
/**
 * Notbremse fürs Warten am Landeplatz: falls die Ankunft nie gemeldet wird
 * (Navigation hängt oder schlägt fehl — die PWA hat ein OfflineBanner, offline
 * ist ein erwarteter Zustand), löst sich der Klon trotzdem auf, statt den User
 * vor einem schwebenden Icon sitzen zu lassen.
 */
export const HALTEN_MAX_MS = 4000;

/**
 * Dieselbe Kurve rückwärts.
 *
 * Eine `cubic-bezier(x1,y1,x2,y2)` ist der Bézier über (0,0), (x1,y1),
 * (x2,y2), (1,1). „Rückwärts" heißt: dieselbe Bahn, am Punkt (0.5, 0.5)
 * gespiegelt und in umgekehrter Reihenfolge durchlaufen — aus P0…P3 wird
 * (1−P3)…(1−P0), und weil P0 und P3 auf (0,0) bzw. (1,1) liegen, bleiben nur
 * die beiden inneren Punkte übrig, getauscht und gespiegelt.
 */
export function umgekehrt(k: Kurve): Kurve {
  return [1 - k[2], 1 - k[3], 1 - k[0], 1 - k[1]];
}

/** Als CSS-Wert für `animation-timing-function`. */
export function alsCss(k: Kurve): string {
  return `cubic-bezier(${k.join(",")})`;
}

/**
 * Die ganze Bewegung in drei Zahlen: Versatz der Mitte und **eine** monotone
 * Skalierung. Mehr braucht der Flug nicht — genau daran ist der Kamera-Push
 * gescheitert, der eine zweite, gegenläufige Skalierung dazwischenschob.
 */
export function flugVektor(
  von: FlugRect,
  nach: FlugRect,
): { dx: number; dy: number; scale: number } {
  return {
    dx: nach.x - von.x,
    dy: nach.y - von.y,
    scale: nach.size / von.size,
  };
}

/** Der vorausberechnete Landeplatz: mittig, direkt unter dem SubPageHeader. */
export function landeplatz(breite: number, safeTop: number): FlugRect {
  return { x: breite / 2, y: safeTop + LANDE_Y, size: ZIEL_PX };
}
