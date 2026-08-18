import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readValueSelection } from "./value-selection.ts";

const FIVE = ["mut", "ruhe", "naehe", "freiheit", "klarheit"];

/** Wie Schritt 1 prüft: nur die Anzahl. */
const loose = (raw: string | null) =>
  readValueSelection(raw, { requireDistinct: false });

/** Wie Schritt 3 prüft: zusätzlich auf Verschiedenheit. */
const strict = (raw: string | null) =>
  readValueSelection(raw, { requireDistinct: true });

describe("readValueSelection — was durchkommt", () => {
  it("gibt die fünf Werte zurück, wie sie kamen", () => {
    const selection = loose(JSON.stringify(FIVE));

    assert.equal(selection.problem, null);
    assert.deepEqual(selection.values, FIVE);
  });

  it("lässt die Reihenfolge unangetastet — sie ist die Rangfolge", () => {
    const reversed = [...FIVE].reverse();

    assert.deepEqual(strict(JSON.stringify(reversed)).values, reversed);
  });
});

describe("readValueSelection — fehlendes und kaputtes Feld", () => {
  it("meldet ein fehlendes Feld als missing", () => {
    assert.equal(loose(null).problem, "missing");
  });

  it("meldet den leeren String als missing, nicht als malformed", () => {
    assert.equal(loose("").problem, "missing");
  });

  it("meldet kaputtes JSON als malformed", () => {
    assert.equal(loose("[\"mut\",").problem, "malformed");
  });

  it("meldet ein Nicht-Array als malformed", () => {
    assert.equal(loose(JSON.stringify({ mut: true })).problem, "malformed");
  });

  it("meldet Nicht-Strings im Array als malformed", () => {
    assert.equal(loose(JSON.stringify([1, 2, 3, 4, 5])).problem, "malformed");
  });

  it("meldet einen überlangen Wert als malformed", () => {
    const tooLong = ["mut", "ruhe", "naehe", "freiheit", "x".repeat(101)];

    assert.equal(loose(JSON.stringify(tooLong)).problem, "malformed");
  });

  it("fängt ein riesiges Array vor der Anzahl-Prüfung ab", () => {
    // Die Obergrenze schützt vor manipulierten Payloads — sie greift, bevor
    // überhaupt gezählt wird, und meldet deshalb malformed statt count.
    const huge = Array.from({ length: 21 }, (_, i) => `wert-${i}`);

    assert.equal(loose(JSON.stringify(huge)).problem, "malformed");
  });
});

describe("readValueSelection — die Anzahl", () => {
  it("weist zu wenige Werte ab", () => {
    assert.equal(loose(JSON.stringify(FIVE.slice(0, 4))).problem, "count");
  });

  it("weist zu viele Werte ab", () => {
    assert.equal(loose(JSON.stringify([...FIVE, "geduld"])).problem, "count");
  });
});

describe("readValueSelection — requireDistinct macht die Asymmetrie sichtbar", () => {
  const withDuplicate = JSON.stringify(["mut", "mut", "ruhe", "naehe", "freiheit"]);

  it("lässt Duplikate durch, wo allein der Client sie verhindert", () => {
    // Schritt 1: die Auswahl im Client kann gar kein Duplikat erzeugen.
    const selection = loose(withDuplicate);

    assert.equal(selection.problem, null);
    assert.equal(selection.values?.length, 5);
  });

  it("weist Duplikate ab, wo die Tausch-Kette sie erzeugen kann", () => {
    // Schritt 3: Wert raus, ein anderer rein für ihn, der erste per
    // „Rückgängig" zurück — clientseitig möglich, hier gefangen.
    assert.equal(strict(withDuplicate).problem, "count");
  });

  it("prüft die Verschiedenheit erst nach der Anzahl", () => {
    const fourDistinct = JSON.stringify(["mut", "mut", "ruhe", "naehe"]);

    assert.equal(strict(fourDistinct).problem, "count");
  });
});
