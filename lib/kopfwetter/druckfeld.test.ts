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
import { ISOBAREN, ZENTREN, druckAn, grundlageAn } from "./druckfeld.ts";

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
      [z.quer, 0],
      [-z.quer, 0],
      [0, z.quer],
      [0, -z.quer],
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
  // Der Test, der die teuerste Regression fängt: werden die Senken breiter
  // oder flacher, verschmelzen benachbarte Tiefs zu einem gemeinsamen Trog.
  // Das Motiv sitzt dann nicht mehr auf eigenem Wetter, sondern auf der Flanke
  // seines Nachbarn. Geschlossen ist eine Höhenlinie um ein Zentrum genau dann,
  // wenn ihr Level zwischen dem Kern und dem tiefsten Sattel zu den Nachbarn
  // liegt — die Näherung „ein Radius weiter" verfehlt das bei Ellipsen.
  ZENTREN.forEach((z, i) => {
    const kern = druckAn(z.x, z.y);
    let sattel = Infinity;
    ZENTREN.forEach((n, j) => {
      if (i === j) return;
      let ruecken = -Infinity;
      for (let t = 0.02; t < 1; t += 0.02) {
        const hoehe = druckAn(z.x + (n.x - z.x) * t, z.y + (n.y - z.y) * t);
        if (hoehe > ruecken) ruecken = hoehe;
      }
      if (ruecken < sattel) sattel = ruecken;
    });
    const ringe = ISOBAREN.filter(
      (iso) => iso.level > kern && iso.level < sattel,
    );
    assert.ok(ringe.length >= 2, `Tief ${i}: nur ${ringe.length} eigene Ringe`);
  });
});

test("die Tiefs sind keine Kreise", () => {
  // Ein rotationssymmetrisches Tief zeichnet konzentrische Ringe, und die lesen
  // als Zielscheibe statt als Wetter. Die Senke muss auf ihrer langen Achse
  // spürbar weiter reichen als auf der kurzen — spürbar, nicht maximal: zu
  // weit gezogen wird die Form selbst zum Blickfang und das Blatt unruhig.
  for (const z of ZENTREN) {
    assert.ok(z.lang > z.quer * 1.4, `${z.lang} vs. ${z.quer}`);
    assert.ok(z.lang < z.quer * 2.0, `${z.lang} vs. ${z.quer}`);
    const laengs = [Math.cos(z.dreh), Math.sin(z.dreh)] as const;
    const quer = [-laengs[1], laengs[0]] as const;
    const r = 70;
    assert.ok(
      druckAn(z.x + laengs[0] * r, z.y + laengs[1] * r) <
        druckAn(z.x + quer[0] * r, z.y + quer[1] * r),
      "auf der langen Achse muss es in gleicher Entfernung tiefer sein",
    );
  }
});

test("das Blatt ist gewölbt, nicht eben", () => {
  // Ohne die Grundwelle laufen die Linien zwischen den Tiefs schnurgerade — und
  // gerade Isobaren gibt es auf keiner Wetterkarte. Läge das Blatt eben, wäre
  // der mittlere von drei Punkten auf einer Geraden exakt das Mittel der beiden
  // äußeren. Die Wölbung muss dabei einen sichtbaren Bruchteil des
  // Höhenlinien-Abstands ausmachen, sonst fällt sie unter die nächste Linie.
  let groesste = 0;
  for (let y = 0; y <= FELD_H; y += 20) {
    const abweichung = Math.abs(
      grundlageAn(BUEHNE_BREITE / 2, y) -
        (grundlageAn(0, y) + grundlageAn(BUEHNE_BREITE, y)) / 2,
    );
    if (abweichung > groesste) groesste = abweichung;
  }
  assert.ok(groesste > 0.03, `Wölbung nur ${groesste.toFixed(3)}`);
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
  assert.ok(ISOBAREN.length >= 8, `nur ${ISOBAREN.length} Höhenlinien`);
  for (const iso of ISOBAREN) assert.ok(iso.d.length > 0);
});

test("der Strich läuft von innen 1.5/0.48 nach außen 0.9/0.16", () => {
  const innen = ISOBAREN[0];
  const aussen = ISOBAREN[ISOBAREN.length - 1];
  assert.equal(innen.breite, 1.5);
  assert.equal(innen.deckung, 0.48);
  assert.equal(aussen.breite, 0.9);
  assert.equal(aussen.deckung, 0.16);
});

test("die Level steigen, der Strich wird nach außen schwächer", () => {
  for (let i = 1; i < ISOBAREN.length; i++) {
    assert.ok(ISOBAREN[i].level > ISOBAREN[i - 1].level);
    assert.ok(ISOBAREN[i].breite < ISOBAREN[i - 1].breite);
    assert.ok(ISOBAREN[i].deckung < ISOBAREN[i - 1].deckung);
  }
});
