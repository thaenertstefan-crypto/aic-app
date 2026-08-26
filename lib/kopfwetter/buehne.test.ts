import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AUGE,
  AUGE_CX,
  AUGE_X_PROZENT,
  BUEHNE_BREITE,
  FELD_H,
  FELD_KOPF,
  ZEILEN_H,
  ZEILEN_POLSTER,
  ZEILEN_Y,
  ZELLEN_H,
  zeilenAnker,
  zeilenSeite,
} from "./buehne.ts";

/**
 * Die Bühne behauptet eines: die Motiv-Mitte trifft das Auge des Tiefs, bei
 * jeder Bildschirmbreite. Das ist der Defekt, den die Prüfung fangen soll —
 * Feld und Zelle, die sichtbar nicht zusammengehören.
 */

test("die Zeile hängt an der Kante, die ihre Seite nennt", () => {
  ZEILEN_Y.forEach((_, i) => {
    const anker = zeilenAnker(i);
    const seite = zeilenSeite(i);
    assert.equal(typeof anker[seite], "string");
    assert.equal(anker[seite === "left" ? "right" : "left"], undefined);
  });
});

test("der Zeilen-Kasten sitzt mittig auf seiner Augenhöhe", () => {
  ZEILEN_Y.forEach((y, i) => {
    assert.equal(zeilenAnker(i).top + ZEILEN_H / 2, y);
  });
});

test("der Prozent-Anker landet bei Entwurfsbreite auf der Augenmitte", () => {
  // Die eine Rechnung, die zwischen Bühne und Feld stimmen muss: der
  // Prozentwert, an dem die Zeile hängt, muss auf dieselbe Mitte fallen, auf
  // die druckfeld.ts sein Tief setzt.
  const mitte = (AUGE_X_PROZENT / 100) * BUEHNE_BREITE;
  assert.ok(Math.abs(mitte - AUGE_CX) < 1e-9, `${mitte} statt ${AUGE_CX}`);
});

test("der Versatz zieht genau vom Auge auf die Kante des Link-Kastens zurück", () => {
  // Ändert jemand AUGE oder ZEILEN_POLSTER, ohne die Formel in zeilenAnker
  // mitzuziehen, wandert das Motiv aus dem Auge.
  const anker = zeilenAnker(0);
  assert.equal(
    anker.left,
    `calc(${AUGE_X_PROZENT}% - ${AUGE / 2 + ZEILEN_POLSTER}px)`,
  );
});

test("die Zellen-Bühne trägt alle fünf Zeilen mit gleicher Luft an beiden Enden", () => {
  const oben = ZEILEN_Y[0];
  const unten = ZELLEN_H - ZEILEN_Y[ZEILEN_Y.length - 1];
  assert.equal(ZEILEN_Y.length, 5);
  assert.equal(oben, unten);
  assert.ok(oben > AUGE / 2);
  assert.equal(FELD_H, FELD_KOPF + ZELLEN_H);
});

test("die Seiten wechseln sich ab, damit der Weg mäandert", () => {
  assert.deepEqual(
    ZEILEN_Y.map((_, i) => zeilenSeite(i)),
    ["left", "right", "left", "right", "left"],
  );
});
