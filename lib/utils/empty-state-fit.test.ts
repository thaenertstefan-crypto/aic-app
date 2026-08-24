import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fitEmptyStateHeight } from "./empty-state-fit.ts";

describe("fitEmptyStateHeight", () => {
  it("füllt den Rest zwischen Spalten-Oberkante und Navigationsleiste", () => {
    // Spalte beginnt bei 220, nichts unter ihr, die Leiste beginnt bei 603.
    assert.equal(
      fitEmptyStateHeight({ top: 220, bottom: 320, pageBottom: 320, navTop: 603 }),
      383,
    );
  });

  it("zieht das Seiten-Padding unter der Spalte ab", () => {
    // Dieselbe Spalte in einer Seite mit p-4: unter ihr liegen 16 px, die
    // mitscrollen würden, wenn die Spalte sie sich nimmt.
    assert.equal(
      fitEmptyStateHeight({ top: 220, bottom: 320, pageBottom: 336, navTop: 603 }),
      367,
    );
  });

  it("ist ein Fixpunkt — die eigene Höhe geht nicht in die Rechnung ein", () => {
    // Nach dem Anwenden misst der zweite Durchlauf dieselbe Oberkante und
    // denselben Abstand darunter, nur eine tiefere Unterkante. Gleiches Ergebnis.
    const first = fitEmptyStateHeight({
      top: 220,
      bottom: 320,
      pageBottom: 336,
      navTop: 603,
    });
    const second = fitEmptyStateHeight({
      top: 220,
      bottom: 220 + first,
      pageBottom: 220 + first + 16,
      navTop: 603,
    });
    assert.equal(second, first);
  });

  it("gibt 0 zurück, wenn oberhalb schon kein Platz mehr ist", () => {
    // Die Spalte steht unterhalb der Leiste — die Seite über ihr ist zu hoch.
    assert.equal(
      fitEmptyStateHeight({ top: 700, bottom: 700, pageBottom: 700, navTop: 603 }),
      0,
    );
  });

  it("rundet ab, damit ein halbes Pixel keinen Scroll erzeugt", () => {
    assert.equal(
      fitEmptyStateHeight({
        top: 220.4,
        bottom: 320,
        pageBottom: 336.3,
        navTop: 603.9,
      }),
      367,
    );
  });

  it("liefert 0 statt NaN, wenn eine Messung fehlschlägt", () => {
    assert.equal(
      fitEmptyStateHeight({
        top: Number.NaN,
        bottom: 320,
        pageBottom: 336,
        navTop: 603,
      }),
      0,
    );
    assert.equal(
      fitEmptyStateHeight({
        top: 220,
        bottom: 320,
        pageBottom: 336,
        navTop: Number.POSITIVE_INFINITY,
      }),
      0,
    );
  });
});
