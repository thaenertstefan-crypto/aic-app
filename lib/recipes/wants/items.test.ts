import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_BETS,
  MAX_WANTS,
  isBetItem,
  isWantItem,
  mergeItems,
  parseItems,
  parsePreviousIds,
  wantSentence,
} from "./items.ts";
import { ANSWER_MAX } from "./state.ts";

/** Ein Element, das nur trägt, was der Merge überhaupt ansieht. */
type Item = { id: string; text: string };
const item = (id: string, text = id): Item => ({ id, text });
const ids = (items: Item[]) => items.map((i) => i.id);

describe("mergeItems — was der Client nicht kannte, hat er nicht gelöscht", () => {
  it("nimmt bei leerer Baseline schlicht das, was ankommt", () => {
    const merged = mergeItems<Item>([], [item("a"), item("b")], []);

    assert.deepEqual(ids(merged), ["a", "b"]);
  });

  it("löscht, was der Client kannte und nicht mehr mitschickt", () => {
    // b stand in previousIds und fehlt jetzt — das ist eine echte Löschung.
    const merged = mergeItems([item("a"), item("b")], [item("a")], ["a", "b"]);

    assert.deepEqual(ids(merged), ["a"]);
  });

  it("bewahrt, was der Client nie kannte", () => {
    // c wurde parallel angelegt (zweiter Tab, anderes Gerät). Der Client kann
    // es nicht mitschicken und hat es nicht gelöscht — es bleibt.
    const merged = mergeItems([item("a"), item("c")], [item("a")], ["a"]);

    assert.deepEqual(ids(merged), ["a", "c"]);
  });

  it("trennt Löschung und parallelen Add im selben Schreibvorgang", () => {
    // b: gekannt und weg → gelöscht. c: nie gekannt → bleibt.
    const merged = mergeItems(
      [item("a"), item("b"), item("c")],
      [item("a")],
      ["a", "b"],
    );

    assert.deepEqual(ids(merged), ["a", "c"]);
  });

  it("stellt das Eingehende voran und hängt die parallelen Adds hinten an", () => {
    const merged = mergeItems(
      [item("c"), item("a")],
      [item("a"), item("b")],
      ["a"],
    );

    assert.deepEqual(ids(merged), ["a", "b", "c"]);
  });

  it("nimmt für ein bekanntes Element die eingehende Fassung, nicht die aus der DB", () => {
    const merged = mergeItems(
      [item("a", "alt")],
      [item("a", "neu")],
      ["a"],
    );

    assert.deepEqual(merged, [item("a", "neu")]);
  });

  it("verdoppelt eine ID nicht, die eingehend und in der DB steht", () => {
    // Ohne previousIds: die ID kommt mit, also ist sie kein paralleler Add.
    const merged = mergeItems([item("a")], [item("a")], []);

    assert.deepEqual(ids(merged), ["a"]);
  });

  it("reicht doppelte IDs im Eingehenden unverändert durch", () => {
    // Der Merge entscheidet über Herkunft, nicht über Eindeutigkeit — eine
    // doppelte ID wäre ein Client-Fehler und wird hier nicht still repariert.
    const merged = mergeItems([], [item("a"), item("a")], []);

    assert.deepEqual(ids(merged), ["a", "a"]);
  });

  it("behandelt doppelte IDs in der DB als ein und dieselbe Herkunft", () => {
    const kept = mergeItems([item("c"), item("c")], [item("a")], ["a"]);
    const dropped = mergeItems([item("b"), item("b")], [item("a")], ["a", "b"]);

    assert.deepEqual(ids(kept), ["a", "c", "c"]);
    assert.deepEqual(ids(dropped), ["a"]);
  });

  it("fasst den Bestand nicht an", () => {
    const dbItems = [item("c")];
    const incoming = [item("a")];
    mergeItems(dbItems, incoming, ["a"]);

    assert.deepEqual(ids(dbItems), ["c"]);
    assert.deepEqual(ids(incoming), ["a"]);
  });
});

describe("isWantItem — die Schranke vor der JSONB-Spalte", () => {
  const want = { id: "w1", text: "Ich baue gern Dinge.", active: true };

  it("nimmt ein Element mit den Pflichtfeldern an", () => {
    assert.equal(isWantItem(want), true);
  });

  it("nimmt die optionalen Felder in ihren erlaubten Ausprägungen an", () => {
    assert.equal(
      isWantItem({
        ...want,
        title: "Der Baumeister",
        distance: "fern",
        valueId: "custom:handwerk",
        source: "ai",
      }),
      true,
    );
    assert.equal(
      isWantItem({ ...want, title: null, valueId: null }),
      true,
    );
  });

  it("weist ab, was kein Objekt ist", () => {
    for (const value of [null, undefined, "w1", 42, []]) {
      assert.equal(isWantItem(value), false);
    }
  });

  it("weist ab, wenn ein Pflichtfeld fehlt oder die falsche Form hat", () => {
    assert.equal(isWantItem({ text: "ohne id", active: true }), false);
    assert.equal(isWantItem({ id: "w1", active: true }), false);
    assert.equal(isWantItem({ ...want, active: "ja" }), false);
  });

  it("trägt einen fernen Stern im vollen Wortlaut eines Antwortfelds", () => {
    // Ein ferner Stern ist wörtlich, sein Antwortfeld darf ANSWER_MAX lang
    // sein — ein engerer Deckel hier wiese das GANZE Speichern ab.
    assert.equal(isWantItem({ ...want, text: "x".repeat(ANSWER_MAX) }), true);
    assert.equal(isWantItem({ ...want, text: "x".repeat(ANSWER_MAX + 1) }), false);
  });

  it("hält den Namen bei der Länge einer Überschrift", () => {
    assert.equal(isWantItem({ ...want, title: "x".repeat(301) }), false);
  });

  it("nimmt das Beispiel als eigenes Feld neben dem Satz", () => {
    assert.equal(isWantItem({ ...want, example: "für einen Marathon" }), true);
    assert.equal(isWantItem({ ...want, example: null }), true);
    assert.equal(isWantItem({ ...want, example: 42 }), false);
    assert.equal(isWantItem({ ...want, example: "x".repeat(301) }), false);
  });

  it("weist unbekannte Ausprägungen der Aufzählungen ab", () => {
    assert.equal(isWantItem({ ...want, distance: "mittel" }), false);
    assert.equal(isWantItem({ ...want, source: "import" }), false);
  });
});

describe("wantSentence — das Beispiel klebt erst in der Anzeige am Satz", () => {
  it("hängt das Beispiel an, wenn eines da ist", () => {
    assert.equal(
      wantSentence({
        text: "Ich will mich an meine Grenzen treiben.",
        example: "einen Marathon",
      }),
      "Ich will mich an meine Grenzen treiben. — z. B. einen Marathon",
    );
  });

  it("lässt den Satz ohne Beispiel unangetastet", () => {
    const text = "Ich will mich an meine Grenzen treiben.";

    assert.equal(wantSentence({ text }), text);
    assert.equal(wantSentence({ text, example: null }), text);
    assert.equal(wantSentence({ text: ` ${text} `, example: "  " }), text);
  });
});

describe("isBetItem — die Schranke vor der JSONB-Spalte", () => {
  const bet = { id: "b1", text: "Einen Abend lang töpfern.", status: "open" };

  it("nimmt ein Element mit den Pflichtfeldern an", () => {
    assert.equal(isBetItem(bet), true);
  });

  it("nimmt die optionalen Felder in ihren erlaubten Ausprägungen an", () => {
    assert.equal(
      isBetItem({
        ...bet,
        status: "tried",
        wantId: "w1",
        journalEntryId: "j1",
        source: "own",
      }),
      true,
    );
    assert.equal(
      isBetItem({ ...bet, wantId: null, journalEntryId: null }),
      true,
    );
  });

  it("weist ab, was kein Objekt ist", () => {
    for (const value of [null, undefined, "b1", 42, []]) {
      assert.equal(isBetItem(value), false);
    }
  });

  it("weist ab, wenn ein Pflichtfeld fehlt oder die falsche Form hat", () => {
    assert.equal(isBetItem({ text: "ohne id", status: "open" }), false);
    assert.equal(isBetItem({ id: "b1", text: "ohne status" }), false);
  });

  it("weist einen unbekannten Status ab", () => {
    assert.equal(isBetItem({ ...bet, status: "done" }), false);
  });

  it("weist ab, was über den Text-Cap hinausgeht", () => {
    assert.equal(isBetItem({ ...bet, text: "x".repeat(301) }), false);
  });
});

describe("parseItems — vom FormData-Feld auf ein geprüftes Array", () => {
  const want = { id: "w1", text: "Ich baue gern Dinge.", active: true };

  it("gibt das geprüfte Array zurück", () => {
    const parsed = parseItems(JSON.stringify([want]), MAX_WANTS, isWantItem);

    assert.deepEqual(parsed, [want]);
  });

  it("nimmt ein leeres Array an — es heißt „alles gelöscht“, nicht „nichts gesendet“", () => {
    assert.deepEqual(parseItems("[]", MAX_WANTS, isWantItem), []);
  });

  it("gibt null zurück, wenn das Feld fehlt oder leer ist", () => {
    assert.equal(parseItems(null, MAX_WANTS, isWantItem), null);
    assert.equal(parseItems("", MAX_WANTS, isWantItem), null);
  });

  it("gibt null zurück bei kaputtem JSON", () => {
    assert.equal(parseItems("{nicht json", MAX_WANTS, isWantItem), null);
  });

  it("gibt null zurück, wenn das JSON kein Array ist", () => {
    assert.equal(parseItems(JSON.stringify(want), MAX_WANTS, isWantItem), null);
  });

  it("gibt null zurück, sobald ein einziges Element durchfällt", () => {
    const parsed = parseItems(
      JSON.stringify([want, { id: "w2" }]),
      MAX_WANTS,
      isWantItem,
    );

    assert.equal(parsed, null);
  });

  it("gibt null zurück oberhalb der Obergrenze", () => {
    const many = Array.from({ length: MAX_WANTS + 1 }, (_, i) => ({
      ...want,
      id: `w${i}`,
    }));

    assert.equal(parseItems(JSON.stringify(many), MAX_WANTS, isWantItem), null);
    assert.equal(
      parseItems(JSON.stringify(many.slice(0, MAX_WANTS)), MAX_WANTS, isWantItem)
        ?.length,
      MAX_WANTS,
    );
  });

  it("hält für beide Spalten dieselbe Obergrenze bereit", () => {
    // Die Aussage ist die Gleichheit, nicht die Zahl — eine bewusst
    // angehobene Obergrenze soll diesen Test nicht rot machen.
    assert.equal(MAX_BETS, MAX_WANTS);
  });
});

describe("parsePreviousIds — fehlende Baseline heißt „nichts war bekannt“", () => {
  it("gibt die IDs zurück", () => {
    assert.deepEqual(parsePreviousIds(JSON.stringify(["a", "b"])), ["a", "b"]);
  });

  it("gibt eine leere Liste zurück, wenn das Feld fehlt", () => {
    // Damit ist jedes DB-Element ein paralleler Add und nichts wird gelöscht —
    // die sichere Seite dieser Rechnung.
    assert.deepEqual(parsePreviousIds(null), []);
    assert.deepEqual(parsePreviousIds(""), []);
  });

  it("gibt eine leere Liste zurück bei kaputtem JSON oder Nicht-Array", () => {
    assert.deepEqual(parsePreviousIds("{nicht json"), []);
    assert.deepEqual(parsePreviousIds(JSON.stringify({ a: 1 })), []);
  });

  it("wirft Einträge weg, die keine Strings sind", () => {
    assert.deepEqual(parsePreviousIds(JSON.stringify(["a", 2, null, "b"])), [
      "a",
      "b",
    ]);
  });
});
