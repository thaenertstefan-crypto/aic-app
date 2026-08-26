import { test } from "node:test";
import assert from "node:assert/strict";

import {
  HIN_MS,
  LANDE_Y,
  RUECK_MS,
  WURF,
  ZELLE_PX,
  ZIEL_PX,
  alsCss,
  flugVektor,
  landeplatz,
  umgekehrt,
  type Kurve,
} from "./flug.ts";

/**
 * Der Flug behauptet drei Dinge, und genau die prüft diese Datei: er wächst
 * **einmal**, er fliegt **eine** Linie, und der Rückweg ist **dieselbe** Bahn
 * rückwärts. Was davon bricht, sieht man am Telefon — aber erst dort.
 */

test("der Klon wächst genau einmal, von der Zelle auf das Modul-Icon", () => {
  const { scale } = flugVektor(
    { x: 60, y: 500, size: ZELLE_PX },
    { x: 187, y: 184, size: ZIEL_PX },
  );
  assert.equal(scale, 1.5);
  // Monoton heißt: ein einziger Faktor, kein Zwischenwert. Der frühere
  // Kamera-Push schob 64 → 154 → 96 und war genau deshalb ein Rechenfehler.
  assert.equal(ZELLE_PX * scale, ZIEL_PX);
});

test("der Versatz ist der Abstand der Mittelpunkte — nichts wird dazugerechnet", () => {
  const { dx, dy } = flugVektor(
    { x: 60, y: 500, size: ZELLE_PX },
    { x: 187, y: 184, size: ZIEL_PX },
  );
  assert.equal(dx, 127);
  assert.equal(dy, -316);
});

test("der Rückflug ist der Hinflug rückwärts: Versatz negiert, Skala reziprok", () => {
  const zelle = { x: 60, y: 500, size: ZELLE_PX };
  const landung = { x: 187, y: 184, size: ZIEL_PX };
  const hin = flugVektor(zelle, landung);
  const zurueck = flugVektor(landung, zelle);

  assert.equal(zurueck.dx, -hin.dx);
  assert.equal(zurueck.dy, -hin.dy);
  assert.ok(Math.abs(zurueck.scale * hin.scale - 1) < 1e-12);
});

test("der Rückflug dauert 0,78× des Hinflugs", () => {
  assert.equal(HIN_MS, 380);
  assert.equal(RUECK_MS, 296);
  // Nicht die Rechnung nachrechnen, sondern die Entwurfs-Aussage festhalten:
  // der Rückweg ist spürbar schneller, aber nicht halb so lang.
  assert.ok(Math.abs(RUECK_MS / HIN_MS - 0.78) < 0.005, `${RUECK_MS / HIN_MS}`);
});

/** Ein Punkt der kubischen Bézier über (0,0), (x1,y1), (x2,y2), (1,1). */
function punkt(k: Kurve, t: number): { x: number; y: number } {
  const achse = (a1: number, a2: number) =>
    3 * a1 * t * (1 - t) ** 2 + 3 * a2 * t ** 2 * (1 - t) + t ** 3;
  return { x: achse(k[0], k[2]), y: achse(k[1], k[3]) };
}

test("die umgekehrte Kurve ist dieselbe Bahn, am Mittelpunkt gespiegelt", () => {
  // Das ist die eigentliche Behauptung von „dieselbe Kurve rückwärts": wer die
  // Rückwärts-Kurve bei t abtastet, muss den Punkt der Vorwärts-Kurve bei 1−t
  // finden, gespiegelt an (0.5, 0.5).
  const rueck = umgekehrt(WURF);
  for (const t of [0, 0.13, 0.25, 0.5, 0.75, 0.87, 1]) {
    const a = punkt(rueck, t);
    const b = punkt(WURF, 1 - t);
    assert.ok(Math.abs(a.x - (1 - b.x)) < 1e-12, `x bei t=${t}`);
    assert.ok(Math.abs(a.y - (1 - b.y)) < 1e-12, `y bei t=${t}`);
  }
});

test("zweimal umgekehrt ist wieder die Ausgangskurve", () => {
  // Mit Toleranz: 1 - (1 - 0.34) landet in Gleitkomma auf 0.3400000000000001.
  umgekehrt(umgekehrt(WURF)).forEach((wert, i) => {
    assert.ok(Math.abs(wert - WURF[i]) < 1e-12, `Punkt ${i}: ${wert}`);
  });
});

test("die Kurve reicht als CSS-Wert durch", () => {
  assert.equal(alsCss(WURF), "cubic-bezier(0.34,0.62,0.24,1)");
});

test("der Landeplatz steht mittig unter dem Header, auf der Icon-Mitte", () => {
  const ziel = landeplatz(375, 47);
  assert.equal(ziel.x, 187.5);
  assert.equal(ziel.y, 47 + LANDE_Y);
  assert.equal(ziel.size, ZIEL_PX);
});

test("die Landehöhe ist die Summe der Kästen, nicht eine gemessene Zahl", () => {
  // Ändert jemand den Aufbau des Einstiegs-Screens, ohne LANDE_Y mitzuziehen,
  // verfehlt der Klon die Landung — der Klon säße dann sichtbar daneben.
  assert.equal(LANDE_Y, 61 + 24 + 4 + ZIEL_PX / 2);
  assert.equal(LANDE_Y, 137);
});
