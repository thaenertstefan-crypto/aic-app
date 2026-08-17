import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { advanceMessy, initialMessy, type MessyState } from "./state.ts";

/** Ein ausgewerteter Eintrag: jedes Feld der Auswertung ist gefüllt. */
function afterAnalysis(): MessyState {
  return {
    ...initialMessy(),
    phase: "result",
    messyWhen: "Ich habe zugesagt, obwohl ich keine Zeit hatte.",
    entryId: "entry-1",
    analysis: "Das klingt nach einem Konflikt zwischen zwei Regeln.",
    guilt: "unhealthy",
    rules: "Hilfsbereitschaft gegen Selbstfürsorge",
    right: { type: "new", text: "Ich habe das Recht, meine Zeit zu schützen." },
    aiError: "Die Auswertung hat gerade nicht geklappt.",
    feedback: "agree",
    feedbackPending: true,
    feedbackError: "Das hat gerade nicht geklappt.",
  };
}

/** Was eine neue Auswertung überlebt — der Eintrag, dem sie gilt. */
const SURVIVES_ANALYSIS = ["phase", "messyWhen", "entryId", "saving", "error"];

describe("analysisRequested — der zweite Anlauf erbt nichts vom ersten", () => {
  it("räumt die ganze vorige Auswertung weg, nicht nur Einordnung und Regeln", () => {
    const dirty = afterAnalysis();
    const fresh = initialMessy();

    const next = advanceMessy(dirty, { type: "analysisRequested" });

    for (const key of Object.keys(fresh) as (keyof MessyState)[]) {
      if (SURVIVES_ANALYSIS.includes(key)) continue;
      // Wer dem Zustand ein Feld hinzufügt, muss es in afterAnalysis() setzen —
      // sonst überlebt es den zweiten Anlauf unbemerkt.
      assert.notDeepEqual(
        dirty[key],
        fresh[key],
        `Testdaten unvollständig: ${key} ist im Ausgangszustand nicht verschmutzt`,
      );
      assert.deepEqual(next[key], fresh[key], `${key} überlebt den zweiten Anlauf`);
    }
  });

  it("lässt Text und Eintrag stehen — der Anlauf gilt demselben Moment", () => {
    const next = advanceMessy(afterAnalysis(), { type: "analysisRequested" });

    assert.equal(next.messyWhen, "Ich habe zugesagt, obwohl ich keine Zeit hatte.");
    assert.equal(next.entryId, "entry-1");
    assert.equal(next.phase, "analyzing");
  });
});

describe("analysisReceived — Übernehmen ist eine Stelle", () => {
  const analysis = {
    analysis: "Das war Fürsorge, keine Schuld.",
    guilt: "unhealthy" as const,
    rules: "Nähe gegen Ehrlichkeit",
    right: { type: "existing" as const, id: "r-2", text: "Ich habe das Recht zu gehen." },
  };

  it("legt das Ergebnis in einem Zug ab und macht die Meldung frei", () => {
    const state = advanceMessy(
      { ...initialMessy(), aiError: "Alter Fehler" },
      { type: "analysisReceived", phase: "result", analysis },
    );

    assert.equal(state.analysis, "Das war Fürsorge, keine Schuld.");
    assert.equal(state.guilt, "unhealthy");
    assert.equal(state.rules, "Nähe gegen Ehrlichkeit");
    assert.deepEqual(state.right, analysis.right);
    assert.equal(state.aiError, null);
    assert.equal(state.phase, "result");
  });
});

describe("analysisFailed — ein KI-Ausfall blockiert die Übung nicht", () => {
  it("landet in der Bühne, die der KI-Schritt zurückgibt", () => {
    const state = advanceMessy(initialMessy(), {
      type: "analysisFailed",
      phase: "result",
      message: "Die Auswertung hat gerade nicht geklappt.",
    });

    assert.equal(state.phase, "result");
    assert.equal(state.aiError, "Die Auswertung hat gerade nicht geklappt.");
  });
});

describe("Speichern", () => {
  it("merkt sich den Eintrag und beendet den Ladezustand", () => {
    const saving = advanceMessy(initialMessy(), { type: "saving" });
    assert.equal(saving.saving, true);
    assert.equal(saving.error, null);

    const saved = advanceMessy(saving, { type: "saved", entryId: "entry-7" });

    assert.equal(saved.entryId, "entry-7");
    assert.equal(saved.saving, false);
  });

  it("hält den Text fest, wenn das Speichern scheitert", () => {
    let state = advanceMessy(initialMessy(), { type: "messyEdited", text: "Es war messy." });
    state = advanceMessy(state, { type: "saving" });
    state = advanceMessy(state, { type: "savingFailed", message: "Du bist offline." });

    assert.equal(state.saving, false);
    assert.equal(state.error, "Du bist offline.");
    assert.equal(state.messyWhen, "Es war messy.");
  });

  it("übernimmt einen gesicherten Entwurf, ohne die Bühne zu wechseln", () => {
    const state = advanceMessy(initialMessy(), {
      type: "draftRestored",
      messyWhen: "Gesicherter Text",
    });

    assert.equal(state.messyWhen, "Gesicherter Text");
    assert.equal(state.phase, "reflect");
  });
});

describe("„Fühlt sich das stimmig an?“", () => {
  it("merkt sich die Antwort erst, wenn sie gespeichert ist", () => {
    const pending = advanceMessy(afterAnalysis(), { type: "feedbackSending" });
    assert.equal(pending.feedbackPending, true);
    assert.equal(pending.feedbackError, null);

    const sent = advanceMessy(pending, { type: "feedbackSent", value: "disagree" });

    assert.equal(sent.feedback, "disagree");
    assert.equal(sent.feedbackPending, false);
  });

  it("lässt die Frage stehen, wenn das Speichern scheitert", () => {
    let state = advanceMessy(initialMessy(), { type: "feedbackSending" });
    state = advanceMessy(state, {
      type: "feedbackFailed",
      message: "Das hat gerade nicht geklappt.",
    });

    assert.equal(state.feedback, null);
    assert.equal(state.feedbackPending, false);
    assert.equal(state.feedbackError, "Das hat gerade nicht geklappt.");
  });
});
