import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hash01 } from "./sky-hash.ts";

/** Sechzehn IDs, die sich **nur im letzten Zeichen** unterscheiden — so sehen
 *  die echten Stern- und Funken-IDs aus, die nebeneinander am Himmel stehen. */
const nachbarnVon = (basis: string): number[] =>
  [..."0123456789abcdef"].map((letztes) => hash01(basis + letztes));

const BASEN = [
  "3f2b9c10-7a4e-4d18-9c3f-1b7e5a2d8c0",
  "b81d47ee-2c95-41a7-8f60-5d3a9e1c7b4",
  "0a1c8f33-6b02-4e59-aa17-c4d8e60f92",
];

describe("hash01", () => {
  it("gibt demselben Seed immer denselben Wert", () => {
    // Die Positionen werden nirgends gespeichert, sondern bei jedem Rendern
    // neu gerechnet. Driftete der Hash, spränge der Himmel bei jedem Besuch.
    for (const seed of ["", "a", "stern", ...BASEN]) {
      assert.equal(hash01(seed), hash01(seed));
    }
  });

  it("bleibt im Intervall 0 bis 1", () => {
    for (let i = 0; i < 2000; i++) {
      const wert = hash01(`stern-${i}`);
      assert.ok(wert >= 0 && wert < 1, `${wert} liegt außerhalb von [0, 1)`);
    }
  });

  it("streut benachbarte Seeds über den ganzen Bereich", () => {
    // DER Test dieses Moduls. Die Vorgänger-Fassung (`h * 31 + c`, dann
    // `h % 1000`) warf für genau diese Seeds alle Werte in ein Band von 0,001
    // Breite — der Versatz war rechnerisch da und sichtbar tot, beide Himmel
    // standen als Zweispalten-Raster. Geprüft wird deshalb die Streuung der
    // *Menge*, nicht der Abstand einzelner Paare: dass zwei von sechzehn
    // gleichverteilten Werten nah beieinander liegen, ist erlaubt.
    for (const basis of BASEN) {
      const werte = nachbarnVon(basis);
      const spanne = Math.max(...werte) - Math.min(...werte);
      assert.ok(spanne > 0.5, `Spanne für ${basis} nur ${spanne.toFixed(4)}`);

      const zehntel = new Set(werte.map((w) => Math.floor(w * 10)));
      assert.ok(
        zehntel.size >= 6,
        `Nachbarn von ${basis} treffen nur ${zehntel.size} Zehntel`,
      );
    }
  });

  it("trennt den x- vom y-Seed derselben ID", () => {
    // Beide Himmel rechnen `hash01(id)` für den Versatz nach außen und
    // `hash01(`${id}y`)` für den Versatz in der Zeile. Fielen die zusammen,
    // hinge die Höhe an der Seite.
    for (const basis of BASEN) {
      assert.notEqual(hash01(basis), hash01(`${basis}y`));
    }
  });

  it("gibt für feste Seeds unverändert dieselben Werte", () => {
    // Goldene Werte aus der Fassung, die auf `/me/wants` und
    // `/me/wants/schmiede` abgenommen wurde. Sie stehen hier, damit ein
    // späterer Griff in den Hash nicht still jeden Stern verschiebt.
    assert.equal(hash01(""), 0.6689221884589642);
    assert.equal(hash01("a"), 0.10352621669881046);
    assert.equal(hash01("stern"), 0.561917050043121);
    assert.equal(
      hash01("3f2b9c10-7a4e-4d18-9c3f-1b7e5a2d8c01"),
      0.03663092106580734,
    );
    assert.equal(
      hash01("3f2b9c10-7a4e-4d18-9c3f-1b7e5a2d8c01y"),
      0.5600359786767513,
    );
  });
});
