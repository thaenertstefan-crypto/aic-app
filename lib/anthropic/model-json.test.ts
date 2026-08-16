import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readModelJson, readText } from "./model-json.ts";

/** Die Reihenfolge, die der messy-guilt-Prompt vorschreibt. */
const ORDER = ["analysis", "guilt", "rules", "match"] as const;

describe("readModelJson — Fence-Varianten", () => {
  it("liest nacktes JSON", () => {
    const out = readModelJson('{"analysis": "Alles gut"}', { fieldOrder: ORDER });
    assert.equal(out?.source, "json");
    assert.equal(out?.fields.analysis, "Alles gut");
  });

  it("streift ```json-Fences ab", () => {
    const out = readModelJson('```json\n{"analysis": "Alles gut"}\n```', {
      fieldOrder: ORDER,
    });
    assert.equal(out?.source, "json");
    assert.equal(out?.fields.analysis, "Alles gut");
  });

  it("streift nackte ```-Fences ab", () => {
    const out = readModelJson('```\n{"analysis": "Alles gut"}\n```', {
      fieldOrder: ORDER,
    });
    assert.equal(out?.source, "json");
    assert.equal(out?.fields.analysis, "Alles gut");
  });

  it("streift ```JSON in Großschreibung ab", () => {
    const out = readModelJson('```JSON\n{"analysis": "Alles gut"}\n```', {
      fieldOrder: ORDER,
    });
    assert.equal(out?.source, "json");
  });

  it("verträgt Whitespace um den Fence herum", () => {
    const out = readModelJson('  \n```json\n{"analysis": "Alles gut"}\n```  \n', {
      fieldOrder: ORDER,
    });
    assert.equal(out?.source, "json");
    assert.equal(out?.fields.analysis, "Alles gut");
  });
});

describe("readModelJson — ungeescapte Anführungszeichen", () => {
  it("rettet den Wert über den nächsten Key als Anker", () => {
    // Das gerade Anführungszeichen in "nett" bricht JSON.parse.
    const raw =
      '{"analysis": "Du wolltest "nett" sein", "guilt": "unhealthy", "rules": "Regel A gegen Regel B", "match": {"type": "new"}}';
    const out = readModelJson(raw, { fieldOrder: ORDER });
    assert.equal(out?.source, "rescued");
    assert.equal(out?.fields.analysis, 'Du wolltest "nett" sein');
    assert.equal(out?.fields.guilt, "unhealthy");
    assert.equal(out?.fields.rules, "Regel A gegen Regel B");
  });

  it("löst \\n, \\\" und \\\\ im geretteten Wert auf", () => {
    // Korrekt geescaptes analysis, kaputtes rules → die Rettung greift, und
    // die Escapes im geretteten Wert müssen aufgelöst werden.
    const raw =
      '{"analysis": "Zeile eins\\nZeile \\"zwei\\"\\\\", "guilt": "healthy", "rules": "Regel "A" gegen B", "match": {}}';
    const out = readModelJson(raw, { fieldOrder: ORDER });
    assert.equal(out?.source, "rescued");
    assert.equal(out?.fields.analysis, 'Zeile eins\nZeile "zwei"\\');
  });

  it("rettet Objekt- und Listenfelder NICHT — nur Strings", () => {
    const raw =
      '{"analysis": "Du wolltest "nett" sein", "guilt": "healthy", "rules": "x", "match": {"type": "existing", "id": "r1"}}';
    const out = readModelJson(raw, { fieldOrder: ORDER });
    assert.equal(out?.source, "rescued");
    assert.equal(out?.fields.match, undefined);
  });
});

describe("readModelJson — Truncation", () => {
  it("rettet die Felder VOR dem Abbruch", () => {
    // Mitten in "rules" abgeschnitten: analysis und guilt haben ihren Anker.
    const raw =
      '{"analysis": "Du hast "zu viel" versprochen", "guilt": "unhealthy", "rules": "Die Regel lautet';
    const out = readModelJson(raw, { fieldOrder: ORDER });
    assert.equal(out?.source, "rescued");
    assert.equal(out?.fields.analysis, 'Du hast "zu viel" versprochen');
    assert.equal(out?.fields.guilt, "unhealthy");
    assert.equal(out?.fields.rules, undefined);
  });

  it("fällt aus, wenn VOR dem ersten Anker abgeschnitten wurde", () => {
    const raw = '{"analysis": "Du hast "zu viel" ver';
    assert.equal(readModelJson(raw, { fieldOrder: ORDER }), null);
  });

  it("rettet das letzte Feld über die schließende Klammer", () => {
    const raw = '{"analysis": "Du warst "streng"", "guilt": "healthy"}';
    const out = readModelJson(raw, { fieldOrder: ["analysis", "guilt"] });
    assert.equal(out?.source, "rescued");
    assert.equal(out?.fields.guilt, "healthy");
  });

  it("rettet das letzte Feld nicht, wenn die Klammer fehlt", () => {
    const raw = '{"analysis": "Du warst "streng"", "guilt": "healthy"';
    const out = readModelJson(raw, { fieldOrder: ["analysis", "guilt"] });
    assert.equal(out?.fields.guilt, undefined);
  });
});

describe("readModelJson — Nicht-Objekt-JSON", () => {
  it("fällt bei einem nackten String aus", () => {
    assert.equal(readModelJson('"nur ein Satz"', { fieldOrder: ORDER }), null);
  });

  it("fällt bei einer Liste aus", () => {
    assert.equal(readModelJson('["a", "b"]', { fieldOrder: ORDER }), null);
  });

  it("fällt bei einer Zahl aus", () => {
    assert.equal(readModelJson("42", { fieldOrder: ORDER }), null);
  });

  it("fällt bei null aus", () => {
    assert.equal(readModelJson("null", { fieldOrder: ORDER }), null);
  });

  it("fällt bei leerem Text aus", () => {
    assert.equal(readModelJson("   ", { fieldOrder: ORDER }), null);
    assert.equal(readModelJson("```json\n```", { fieldOrder: ORDER }), null);
  });
});

describe("readModelJson — Prosa vs. Blob", () => {
  it("reicht echte Prosa unverändert durch", () => {
    const out = readModelJson("Das klingt nach einem harten Tag.", {
      fieldOrder: ORDER,
    });
    assert.equal(out?.source, "prose");
    assert.equal(out?.text, "Das klingt nach einem harten Tag.");
    assert.deepEqual(out?.fields, {});
  });

  it("reicht einen kaputten JSON-Blob NIE als Prosa durch", () => {
    // Beginnt mit `{` → als JSON gemeint, aber kein Anker greift.
    const out = readModelJson('{"unbekannt": "wert"', { fieldOrder: ORDER });
    assert.equal(out, null);
  });

  it("erkennt den JSON-Versuch auch ohne führende Klammer", () => {
    const out = readModelJson('Hier: "analysis": "Text ohne Klammer', {
      fieldOrder: ORDER,
    });
    assert.equal(out, null);
  });
});

describe("readText", () => {
  it("trimmt und kappt", () => {
    assert.equal(readText({ a: "  hallo  " }, "a"), "hallo");
    assert.equal(readText({ a: "abcdef" }, "a", 3), "abc");
  });

  it("gibt null bei fehlendem, leerem oder nicht-String-Wert", () => {
    assert.equal(readText({}, "a"), null);
    assert.equal(readText({ a: "   " }, "a"), null);
    assert.equal(readText({ a: 5 }, "a"), null);
    assert.equal(readText({ a: null }, "a"), null);
  });
});
