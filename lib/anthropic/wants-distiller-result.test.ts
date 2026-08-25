import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_QUOTES_PER_WANT,
  MAX_REASON_LEN,
  MAX_WANTS_OUT,
  parseDistillerOutput,
  parseQuotes,
  parseTitles,
  type AnswerSource,
  type DistillerOptions,
} from "./wants-distiller-result.ts";

const ANSWERS: AnswerSource = {
  yin: ["Ich stehe um fünf auf, um zu schreiben.", "  ", "Lange Läufe im Regen."],
  yang: ["Wenn ich Musik mache, vergesse ich die Zeit."],
};

/** Die ids sind echte Bank-ids — `getValueLabel` läuft ungestubbt mit, damit
 *  der Test auch merkt, wenn ein Label aus der Bank verschwindet. */
const OPTIONS: DistillerOptions = {
  valueIds: new Set(["courage", "growth"]),
  answers: ANSWERS,
  farCount: 0,
  maxTextLen: 300,
};

function json(value: unknown): string {
  return JSON.stringify(value);
}

// ── Zeiger → Wortlaut ────────────────────────────────────────────────

test("löst Zeiger in den Wortlaut des Antwortfelds auf (nr ist 1-basiert)", () => {
  assert.deepEqual(
    parseQuotes([{ frage: "yin", nr: 1 }, { frage: "yang", nr: 1 }], ANSWERS),
    ["Ich stehe um fünf auf, um zu schreiben.", "Wenn ich Musik mache, vergesse ich die Zeit."],
  );
});

test("verwirft Zeiger, die ins Leere zeigen — der Stern bleibt", () => {
  assert.deepEqual(
    parseQuotes(
      [
        { frage: "yin", nr: 99 }, // außerhalb
        { frage: "yin", nr: 2 }, // nur Leerzeichen
        { frage: "yin", nr: 0 }, // 0-basiert missverstanden
        { frage: "tagtraum", nr: 1 }, // Frage gibt es hier nicht
        { frage: "yin", nr: 1.5 }, // keine ganze Zahl
        { frage: "yin" }, // ohne nr
        "yin 1", // gar kein Objekt
        { frage: "yin", nr: 3 }, // der eine gute
      ],
      ANSWERS,
    ),
    ["Lange Läufe im Regen."],
  );
});

test("dasselbe Antwortfeld zweimal ist ein Beleg, nicht zwei", () => {
  assert.deepEqual(
    parseQuotes([{ frage: "yin", nr: 1 }, { frage: "yin", nr: 1 }], ANSWERS),
    ["Ich stehe um fünf auf, um zu schreiben."],
  );
});

test("deckelt die Belege pro Stern", () => {
  const many: AnswerSource = {
    yin: Array.from({ length: 6 }, (_, i) => `Antwort ${i + 1}`),
    yang: [],
  };
  const pointers = many.yin.map((_, i) => ({ frage: "yin", nr: i + 1 }));
  assert.equal(parseQuotes(pointers, many).length, MAX_QUOTES_PER_WANT);
});

test("keine Zeiger ist ein gültiger Fall, kein Fehler", () => {
  assert.deepEqual(parseQuotes(undefined, ANSWERS), []);
  assert.deepEqual(parseQuotes([], ANSWERS), []);
});

// ── Die ganze Antwort ────────────────────────────────────────────────

test("liest Kommentar, nahe Sterne samt Belegen und ferne Titel", () => {
  const raw = json({
    comment: "Das lese ich aus deinen Worten.",
    wants: [
      {
        text: "Ich will früh und ungestört schreiben.",
        example: "eine Stunde vor der Arbeit",
        title: "Frühe Seiten",
        value_id: "courage",
        reason: "Du nimmst dafür Schlaf in Kauf — das ist Mühsal, die sich lohnt.",
        question: null,
        quotes: [{ frage: "yin", nr: 1 }],
      },
    ],
    titles: ["Weite Reise", "  ", 42],
  });

  const result = parseDistillerOutput(raw, { ...OPTIONS, farCount: 3 });

  assert.equal(result?.comment, "Das lese ich aus deinen Worten.");
  assert.deepEqual(result?.wants[0].quotes, ["Ich stehe um fünf auf, um zu schreiben."]);
  assert.equal(result?.wants[0].valueLabel, "Mut");
  assert.deepEqual(result?.farTitles, ["Weite Reise", null, null]);
});

test("liest weit mehr als die alten 6 Sterne, deckelt aber bei MAX_WANTS_OUT", () => {
  const wants = Array.from({ length: MAX_WANTS_OUT + 5 }, (_, i) => ({
    text: `Stern ${i + 1}`,
    quotes: [],
  }));
  const result = parseDistillerOutput(json({ comment: "…", wants, titles: [] }), OPTIONS);
  assert.equal(result?.wants.length, MAX_WANTS_OUT);
});

test("ein Alt-Eintrag ohne Feldgrenzen bekommt keine Belege, aber seine Sterne", () => {
  const raw = json({
    comment: "…",
    wants: [{ text: "Ein Stern", quotes: [{ frage: "yin", nr: 1 }] }],
    titles: [],
  });
  const result = parseDistillerOutput(raw, {
    ...OPTIONS,
    answers: { yin: [], yang: [] },
  });
  assert.equal(result?.wants.length, 1);
  assert.deepEqual(result?.wants[0].quotes, []);
});

test("kappt die Begründung auf einen Absatz", () => {
  const raw = json({
    comment: "…",
    wants: [{ text: "Ein Stern", reason: "a".repeat(MAX_REASON_LEN + 200) }],
    titles: [],
  });
  const result = parseDistillerOutput(raw, OPTIONS);
  assert.equal(result?.wants[0].reason?.length, MAX_REASON_LEN);
});

test("unbekannte value_id wird zu null statt durchgereicht", () => {
  const raw = json({
    comment: "…",
    wants: [{ text: "Ein Stern", value_id: "voellig-erfunden" }],
    titles: [],
  });
  const result = parseDistillerOutput(raw, OPTIONS);
  assert.equal(result?.wants[0].valueId, null);
  assert.equal(result?.wants[0].valueLabel, null);
});

test("Sterne ohne Kommentar sind ein gültiges Ergebnis", () => {
  const raw = json({ wants: [{ text: "Ein Stern" }], titles: [] });
  const result = parseDistillerOutput(raw, OPTIONS);
  assert.equal(result?.comment, "");
  assert.equal(result?.wants.length, 1);
});

test("gerettete Prosa trägt nur den Kommentar, nie Sterne", () => {
  const result = parseDistillerOutput(
    'Ich habe nachgedacht. {"comment": "Ein warmer Satz", "wants": [{"text": "kaputt',
    OPTIONS,
  );
  assert.equal(result?.wants.length, 0);
  assert.ok(result?.comment);
});

test("weder Kommentar noch Sterne ist der eine Ausfall", () => {
  assert.equal(parseDistillerOutput(json({ wants: [], titles: [] }), OPTIONS), null);
});

test("fehlende Titel-Liste lässt die fernen Sterne namenlos stehen", () => {
  assert.deepEqual(parseTitles(undefined, 2), [null, null]);
});
