import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EMPTY_ANSWERS,
  TOTAL_STEPS,
  answerKeyForStep,
  dropQuestionsFrom,
  isQuestionPending,
  isStepAnswered,
  nextStep,
} from "./steps.ts";

const answered = { ...EMPTY_ANSWERS, step2: "Ich grüble", step3: "weil", step4: "darum", step5: "tief" };

/* ------------------------------------------------------------------ */
/*  Gültigkeit — und nur Gültigkeit                                    */
/* ------------------------------------------------------------------ */

describe("nextStep — entscheidet über Gültigkeit, nicht über Ladezustände", () => {
  it("hält Bühne 1 fest, bis der Countdown gelaufen ist", () => {
    assert.equal(nextStep(1, EMPTY_ANSWERS, false), null);
    assert.equal(nextStep(1, EMPTY_ANSWERS, true), 2);
  });

  it("hält eine Bühne mit Pflichtantwort fest, solange sie leer ist", () => {
    assert.equal(nextStep(2, EMPTY_ANSWERS, true), null);
    assert.equal(nextStep(2, { ...EMPTY_ANSWERS, step2: "Ich grüble" }, true), 3);
  });

  it("wertet Leerzeichen nicht als Antwort", () => {
    assert.equal(nextStep(3, { ...EMPTY_ANSWERS, step3: "   " }, true), null);
  });

  it("lässt Bühnen ohne Pflichtantwort durch", () => {
    // 6 (Perspektivwechsel) und 7 (Reframing) dürfen leer bleiben.
    assert.equal(nextStep(6, EMPTY_ANSWERS, true), 7);
    assert.equal(nextStep(7, EMPTY_ANSWERS, true), 8);
  });

  it("kennt hinter der letzten Bühne keine nächste", () => {
    assert.equal(nextStep(TOTAL_STEPS, answered, true), null);
  });

  it("weiß nichts von wartenden KI-Fragen", () => {
    // Der Ladezustand steckt in isQuestionPending — vorher sperrte er
    // dieselbe Funktion, die über die Antwort entschied.
    assert.equal(nextStep(4, answered, true), 5);
  });
});

describe("isStepAnswered", () => {
  it("bindet Bühne 1 an den Countdown", () => {
    assert.equal(isStepAnswered(1, answered, false), false);
    assert.equal(isStepAnswered(1, EMPTY_ANSWERS, true), true);
  });

  it("prüft ab Bühne 2 die zugehörige Antwort", () => {
    assert.equal(isStepAnswered(5, EMPTY_ANSWERS, true), false);
    assert.equal(isStepAnswered(5, answered, true), true);
  });
});

describe("answerKeyForStep", () => {
  it("ordnet den Warum-Bühnen ihre Antwort zu", () => {
    assert.equal(answerKeyForStep(2), "step2");
    assert.equal(answerKeyForStep(5), "step5");
  });

  it("gibt null für Bühnen ohne Pflichtantwort", () => {
    for (const step of [1, 6, 7, 8]) {
      assert.equal(answerKeyForStep(step), null, `Bühne ${step}`);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Der Ladezustand, getrennt                                          */
/* ------------------------------------------------------------------ */

describe("isQuestionPending — der Ladezustand der Bühne", () => {
  it("wartet auf den Bühnen 3–6, solange keine Frage da ist", () => {
    for (const step of [3, 4, 5, 6]) {
      assert.equal(isQuestionPending({}, step), true, `Bühne ${step}`);
    }
  });

  it("wartet auf keiner anderen Bühne", () => {
    for (const step of [1, 2, 7, 8]) {
      assert.equal(isQuestionPending({}, step), false, `Bühne ${step}`);
    }
  });

  it("hört auf zu warten, sobald die Frage da ist", () => {
    assert.equal(isQuestionPending({ 4: "Und warum noch?" }, 4), false);
  });

  it("hört auch dann auf zu warten, wenn keine Frage kam", () => {
    // null heißt „die KI hat nicht geantwortet" — die Bühne nimmt dann ihre
    // statische Frage, statt endlos zu schimmern.
    assert.equal(isQuestionPending({ 4: null }, 4), false);
  });
});

/* ------------------------------------------------------------------ */
/*  Ungültig gewordene Fragen                                          */
/* ------------------------------------------------------------------ */

describe("dropQuestionsFrom", () => {
  it("verwirft die Fragen ab der genannten Bühne", () => {
    const questions = { 3: "warum?", 4: "und warum?", 5: "und ganz unten?", 6: "und anders?" };

    assert.deepEqual(dropQuestionsFrom(questions, 5), { 3: "warum?", 4: "und warum?" });
  });

  it("lässt die Fragen darüber stehen", () => {
    const questions = { 3: "warum?", 6: "und anders?" };

    assert.deepEqual(dropQuestionsFrom(questions, 7), questions);
  });

  it("gibt dasselbe Objekt zurück, wenn nichts zu verwerfen ist", () => {
    // Sonst löste jeder Tastendruck einen Render aus, der nichts ändert.
    const questions = { 3: "warum?" };
    const leer = {};

    assert.equal(dropQuestionsFrom(questions, 4), questions);
    assert.equal(dropQuestionsFrom(leer, 3), leer);
  });

  it("lässt das übergebene Objekt unangetastet", () => {
    const questions = { 3: "warum?", 4: "und warum?" };

    dropQuestionsFrom(questions, 4);

    assert.deepEqual(questions, { 3: "warum?", 4: "und warum?" });
  });
});
