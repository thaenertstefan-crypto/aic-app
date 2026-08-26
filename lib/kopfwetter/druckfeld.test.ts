import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AUGE_CX,
  BUEHNE_BREITE,
  FELD_H,
  FELD_KOPF,
  ZEILEN_Y,
  zeilenSeite,
} from "./buehne.ts";
import { GRADNETZ_D, ISOBAREN, ZENTREN, druckAn } from "./druckfeld.ts";

/**
 * Geprüft wird die Aussage des Feldes, nicht seine Zahlen. Drei Dinge können
 * das Bild kaputtmachen, ohne dass Typ oder Build es merken: das Feld rutscht
 * von den Motiven weg, der Grundgradient fällt weg (dann sind es wieder fünf
 * Ringsätze), oder die Segmente bleiben unverkettet.
 */

// ── 1. Feld und Motiv gehören zusammen ────────────────────────────────────

test("jedes Tief liegt exakt auf seiner Zeile", () => {
  assert.equal(ZENTREN.length, ZEILEN_Y.length);
  ZENTREN.forEach((z, i) => {
    assert.equal(z.y, FELD_KOPF + ZEILEN_Y[i]);
    assert.equal(z.x, zeilenSeite(i) === "left" ? AUGE_CX : BUEHNE_BREITE - AUGE_CX);
  });
});

// ── 2. Es ist ein Feld, keine fünf Ringsätze ──────────────────────────────

test("der Grundgradient kippt das ganze Blatt", () => {
  // Fern von allen Zentren steigt der Druck nach unten und nach rechts. Ohne
  // dieses Gefälle schlössen sich die Konturen wieder um jedes Zentrum.
  const mitteX = BUEHNE_BREITE / 2;
  assert.ok(druckAn(mitteX, 40) < druckAn(mitteX, FELD_H - 40));
  const ruhigesY = (ZENTREN[0].y + ZENTREN[1].y) / 2;
  assert.ok(druckAn(10, ruhigesY) < druckAn(BUEHNE_BREITE - 10, ruhigesY));
});

test("jedes Zentrum ist ein echtes Tief", () => {
  for (const z of ZENTREN) {
    const kern = druckAn(z.x, z.y);
    for (const [dx, dy] of [
      [z.sigma, 0],
      [-z.sigma, 0],
      [0, z.sigma],
      [0, -z.sigma],
    ]) {
      assert.ok(kern < druckAn(z.x + dx, z.y + dy), `Zentrum bei ${z.x},${z.y}`);
    }
  }
});

test("die Isobaren laufen aus dem Bild heraus", () => {
  // Mindestens eine Höhenlinie berührt den linken UND den rechten Rand — genau
  // das unterscheidet ein Feld von fünf geschlossenen Ringsätzen.
  const links = /[ML]0\.0,/;
  const rechts = new RegExp(`[ML]${BUEHNE_BREITE}\\.0,`);
  assert.ok(ISOBAREN.some((iso) => links.test(iso.d) && rechts.test(iso.d)));
});

test("jedes der fünf Tiefs trägt eigene geschlossene Ringe", () => {
  // Rings um jedes Auge muss mindestens eine Höhenlinie herumlaufen, sonst
  // sitzt ein Motiv auf einer leeren Stelle der Karte.
  for (const z of ZENTREN) {
    const kern = druckAn(z.x, z.y);
    const ringe = ISOBAREN.filter(
      (iso) => iso.level > kern && iso.level < druckAn(z.x, z.y - z.sigma),
    );
    assert.ok(ringe.length >= 2, `Zentrum bei ${z.x},${z.y}: ${ringe.length}`);
  }
});

// ── 3. Die Linien sind Linienzüge, keine Strichhaufen ─────────────────────

test("die Segmente sind zu wenigen langen Zügen verkettet", () => {
  // Unverkettet wäre jedes Segment ein eigenes „M…L…" mit zwei Punkten. Ein
  // Zug pro „M" muss deshalb im Schnitt weit mehr als zwei Punkte tragen —
  // sonst bekäme die Linie an jeder Zellgrenze eine eigene Kappe.
  for (const iso of ISOBAREN) {
    const zuege = iso.d.split("M").length - 1;
    const punkte = zuege + (iso.d.split("L").length - 1);
    assert.ok(punkte / zuege > 10, `Level ${iso.level}: ${punkte}/${zuege}`);
  }
});

// ── 4. Die Strich-Rampe erreicht beide Enden ──────────────────────────────

test("keine Höhenlinie ist leer", () => {
  // Ein leeres `d` würde als unsichtbarer Pfad mitzählen und die Rampe
  // verschieben — der kräftigste Strich käme dann nie vor.
  assert.ok(ISOBAREN.length >= 10);
  for (const iso of ISOBAREN) assert.ok(iso.d.length > 0);
});

test("der Strich läuft von innen 1.4/0.42 nach außen 0.9/0.14", () => {
  const innen = ISOBAREN[0];
  const aussen = ISOBAREN[ISOBAREN.length - 1];
  assert.equal(innen.breite, 1.4);
  assert.equal(innen.deckung, 0.42);
  assert.equal(aussen.breite, 0.9);
  assert.equal(aussen.deckung, 0.14);
});

test("die Level steigen, der Strich wird nach außen schwächer", () => {
  for (let i = 1; i < ISOBAREN.length; i++) {
    assert.ok(ISOBAREN[i].level > ISOBAREN[i - 1].level);
    assert.ok(ISOBAREN[i].breite < ISOBAREN[i - 1].breite);
    assert.ok(ISOBAREN[i].deckung < ISOBAREN[i - 1].deckung);
  }
});

test("das Gradnetz spannt sich über das ganze Feld", () => {
  assert.ok(GRADNETZ_D.includes(`V${FELD_H}`));
  assert.ok(GRADNETZ_D.includes(`H${BUEHNE_BREITE}`));
});
