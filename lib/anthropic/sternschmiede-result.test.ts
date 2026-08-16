import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_FUNKEN_OUT, parseForgeOutput } from "./sternschmiede-result.ts";

const OPTIONS = { maxTextLen: 300 };

function parse(raw: string) {
  return parseForgeOutput(raw, OPTIONS);
}

describe("parseForgeOutput — der gute Fall", () => {
  it("liest Kommentar und Funken", () => {
    const raw = JSON.stringify({
      comment: "Da steckt einiges drin.",
      funken: [
        { text: "Melde dich für den Kurs an", reason: "Wert: Neugier" },
        { text: "Schreib die Mail", reason: null },
      ],
    });
    const result = parse(raw);
    assert.equal(result?.comment, "Da steckt einiges drin.");
    assert.equal(result?.funken.length, 2);
    assert.deepEqual(result?.funken[1], { text: "Schreib die Mail", reason: null });
  });

  it("verträgt einen fehlenden Kommentar, solange Funken da sind", () => {
    const raw = JSON.stringify({ funken: [{ text: "Ein Funke" }] });
    const result = parse(raw);
    assert.equal(result?.comment, "");
    assert.equal(result?.funken.length, 1);
  });

  it("kappt Text und Begründung auf die Längen-Kappe", () => {
    const raw = JSON.stringify({
      comment: "ok",
      funken: [{ text: "a".repeat(500), reason: "b".repeat(500) }],
    });
    const result = parseForgeOutput(raw, { maxTextLen: 10 });
    assert.equal(result?.funken[0].text.length, 10);
    assert.equal(result?.funken[0].reason?.length, 10);
  });

  it("verwirft mehr Funken als die Obergrenze", () => {
    const raw = JSON.stringify({
      comment: "ok",
      funken: Array.from({ length: 12 }, (_, i) => ({ text: `Funke ${i}` })),
    });
    assert.equal(parse(raw)?.funken.length, MAX_FUNKEN_OUT);
  });

  it("verwirft halluzinierte Elemente ohne brauchbaren text", () => {
    // Fünf Elemente, damit die Obergrenze hier nicht mit hineinspielt.
    const raw = JSON.stringify({
      comment: "ok",
      funken: [
        { reason: "nur eine Begründung" },
        { text: "   " },
        "ein nackter String",
        null,
        { text: "Der einzige echte" },
      ],
    });
    const result = parse(raw);
    assert.equal(result?.funken.length, 1);
    assert.equal(result?.funken[0].text, "Der einzige echte");
  });

  it("verwirft ein Element mit nicht-stringigem text", () => {
    const raw = JSON.stringify({
      comment: "ok",
      funken: [{ text: 42 }, { text: "Der echte" }],
    });
    assert.deepEqual(parse(raw)?.funken, [{ text: "Der echte", reason: null }]);
  });
});

describe("parseForgeOutput — der Ausfall ist EIN Ausfall", () => {
  it("fällt aus, wenn das funken-Array kaputt ist, obwohl der Kommentar zu retten wäre", () => {
    // Der lebende Defekt: JSON.parse kippt am ungeescapten Anführungszeichen
    // in einem Funken-Text. Vorher gab die Route 200 mit leerer Liste zurück
    // und die Bühne tat so, als hätte die KI nichts zu sagen gehabt.
    const raw =
      '{"comment": "Deine Werte zeigen ein Muster.", "funken": [{"text": "Sag "ja" zum Kurs", "reason": "Wert: Neugier"}]}';
    assert.equal(parse(raw), null);
  });

  it("fällt aus, wenn das Modell eine leere Funken-Liste liefert", () => {
    const raw = JSON.stringify({ comment: "Mir fällt nichts ein.", funken: [] });
    assert.equal(parse(raw), null);
  });

  it("fällt aus, wenn funken gar kein Array ist", () => {
    const raw = JSON.stringify({ comment: "Kommentar", funken: "keine" });
    assert.equal(parse(raw), null);
  });

  it("fällt aus, wenn funken fehlt", () => {
    assert.equal(parse(JSON.stringify({ comment: "Kommentar" })), null);
  });

  it("fällt bei Prosa statt JSON aus", () => {
    assert.equal(parse("Ich habe leider keine Ideen für dich."), null);
  });

  it("fällt bei leerer Antwort aus", () => {
    assert.equal(parse("   "), null);
  });

  it("fällt bei Truncation mitten in der Liste aus", () => {
    const raw = '{"comment": "Da ist was", "funken": [{"text": "Der erste';
    assert.equal(parse(raw), null);
  });
});

describe("parseForgeOutput — Fences", () => {
  it("liest die Antwort auch in ```json-Fences", () => {
    const inner = JSON.stringify({ comment: "ok", funken: [{ text: "Ein Funke" }] });
    const result = parse("```json\n" + inner + "\n```");
    assert.equal(result?.funken.length, 1);
  });
});
