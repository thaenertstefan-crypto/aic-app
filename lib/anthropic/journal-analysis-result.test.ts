import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_REASON_LEN,
  MAX_SUGGESTIONS,
  parseAnalysisResult,
} from "./journal-analysis-result.ts";

const FALLBACK = "Danke fürs Aufschreiben.";

const OPTIONS = {
  currentValues: ["freiheit", "naehe"],
  bankIds: ["freiheit", "naehe", "mut", "ruhe", "spiel", "klarheit"],
  fallbackInsights: FALLBACK,
};

function parse(raw: string) {
  return parseAnalysisResult(raw, OPTIONS);
}

describe("parseAnalysisResult — der gute Fall", () => {
  it("liest insights, confirmed und suggested", () => {
    const raw = JSON.stringify({
      insights: "Du schreibst viel über Aufbruch.",
      confirmed: ["freiheit"],
      suggested: [{ id: "mut", reason: "Du wagst gerade etwas." }],
    });
    const result = parse(raw);
    assert.equal(result.insights, "Du schreibst viel über Aufbruch.");
    assert.deepEqual(result.confirmed, ["freiheit"]);
    assert.deepEqual(result.suggested, [
      { id: "mut", reason: "Du wagst gerade etwas." },
    ]);
  });

  it("kappt eine überlange Begründung", () => {
    const raw = JSON.stringify({
      insights: "ok",
      confirmed: [],
      suggested: [{ id: "mut", reason: "x".repeat(MAX_REASON_LEN + 50) }],
    });
    assert.equal(parse(raw).suggested[0].reason.length, MAX_REASON_LEN);
  });

  it("nimmt höchstens MAX_SUGGESTIONS Vorschläge", () => {
    const raw = JSON.stringify({
      insights: "ok",
      confirmed: [],
      suggested: ["mut", "ruhe", "spiel", "klarheit"].map((id) => ({
        id,
        reason: "Grund",
      })),
    });
    assert.equal(parse(raw).suggested.length, MAX_SUGGESTIONS);
  });
});

describe("parseAnalysisResult — halluzinierte fremde ids", () => {
  it("verwirft confirmed-ids, die nicht in der Hypothese stehen", () => {
    const raw = JSON.stringify({
      insights: "ok",
      confirmed: ["freiheit", "mut", "erfundener-wert"],
      suggested: [],
    });
    assert.deepEqual(parse(raw).confirmed, ["freiheit"]);
  });

  it("verwirft doppelte confirmed-ids", () => {
    const raw = JSON.stringify({
      insights: "ok",
      confirmed: ["naehe", "naehe"],
      suggested: [],
    });
    assert.deepEqual(parse(raw).confirmed, ["naehe"]);
  });

  it("verwirft suggested-ids außerhalb der Werte-Bank", () => {
    const raw = JSON.stringify({
      insights: "ok",
      confirmed: [],
      suggested: [
        { id: "voellig-erfunden", reason: "Grund" },
        { id: "ruhe", reason: "Grund" },
      ],
    });
    assert.deepEqual(parse(raw).suggested, [{ id: "ruhe", reason: "Grund" }]);
  });

  it("verwirft suggested-ids, die schon in der Hypothese stehen", () => {
    const raw = JSON.stringify({
      insights: "ok",
      confirmed: [],
      suggested: [{ id: "freiheit", reason: "Grund" }],
    });
    assert.deepEqual(parse(raw).suggested, []);
  });

  it("verwirft doppelte und unvollständige Vorschläge", () => {
    const raw = JSON.stringify({
      insights: "ok",
      confirmed: [],
      suggested: [
        { id: "mut", reason: "Grund" },
        { id: "mut", reason: "Nochmal" },
        { id: "ruhe" },
        { id: "spiel", reason: "   " },
        { reason: "ohne id" },
        null,
      ],
    });
    assert.deepEqual(parse(raw).suggested, [{ id: "mut", reason: "Grund" }]);
  });

  it("verwirft nicht-stringige confirmed-Einträge", () => {
    const raw = JSON.stringify({
      insights: "ok",
      confirmed: [42, null, "naehe"],
      suggested: [],
    });
    assert.deepEqual(parse(raw).confirmed, ["naehe"]);
  });
});

describe("parseAnalysisResult — kaputte Antworten", () => {
  it("rettet insights über den confirmed-Anker und leert die Listen", () => {
    const raw =
      '{"insights": "Du sagst "muss" sehr oft", "confirmed": ["freiheit"], "suggested": []}';
    const result = parse(raw);
    assert.equal(result.insights, 'Du sagst "muss" sehr oft');
    assert.deepEqual(result.confirmed, []);
    assert.deepEqual(result.suggested, []);
  });

  it("nimmt den Fallback-Text bei Truncation VOR dem Anker", () => {
    const raw = '{"insights": "Du sagst "muss" sehr';
    assert.equal(parse(raw).insights, FALLBACK);
  });

  it("nimmt den Fallback-Text bei validem, aber falsch geformtem JSON", () => {
    assert.equal(parse('"nur ein Satz"').insights, FALLBACK);
    assert.equal(parse("[1, 2, 3]").insights, FALLBACK);
  });

  it("nimmt den Fallback-Text bei fehlendem insights-Feld", () => {
    const raw = JSON.stringify({ confirmed: ["naehe"], suggested: [] });
    const result = parse(raw);
    assert.equal(result.insights, FALLBACK);
    // Die Listen bleiben trotzdem gültig — das JSON war ja intakt.
    assert.deepEqual(result.confirmed, ["naehe"]);
  });

  it("nimmt den Fallback-Text bei leerer Antwort", () => {
    assert.equal(parse("   ").insights, FALLBACK);
  });
});

describe("parseAnalysisResult — Prosa bleibt Prosa", () => {
  it("reicht den alten Freitext-Antwortstil unverändert durch", () => {
    const raw = "Das klingt nach einer Woche, in der du viel getragen hast.";
    const result = parse(raw);
    assert.equal(result.insights, raw);
    assert.deepEqual(result.confirmed, []);
  });

  it("reicht einen kaputten JSON-Blob NIE als insights durch", () => {
    const result = parse('{"unerwartet": "wert"');
    assert.equal(result.insights, FALLBACK);
  });
});
