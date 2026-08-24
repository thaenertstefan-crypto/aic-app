import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  COUNTED_STEPS,
  advanceConfidence,
  initialConfidence,
  stepNumber,
  type ConfidenceState,
  type Step,
} from "./state.ts";

/** Führt die Übung n-mal weiter. */
function after(n: number, from = initialConfidence()): ConfidenceState {
  let state = from;
  for (let i = 0; i < n; i++) {
    state = advanceConfidence(state, { type: "stepFinished" });
  }
  return state;
}

describe("initialConfidence", () => {
  it("beginnt bei der Atmung, noch ungelaufen", () => {
    assert.deepEqual(initialConfidence(), {
      step: "breathe",
      breathingDone: false,
    });
  });
});

describe("advanceConfidence — der Weg durch die Übung", () => {
  it("führt geradeaus durch alle Bühnen bis zum Abschluss", () => {
    const weg: Step[] = [];
    let state = initialConfidence();
    for (let i = 0; i < 4; i++) {
      state = advanceConfidence(state, { type: "stepFinished" });
      weg.push(state.step);
    }
    assert.deepEqual(weg, ["body", "voice", "reminder", "go"]);
  });

  it("bleibt am Abschluss stehen — von dort führt kein Übergang weiter", () => {
    const abschluss = after(4);
    assert.equal(abschluss.step, "go");
    assert.equal(advanceConfidence(abschluss, { type: "stepFinished" }), abschluss);
  });

  it("merkt sich die gelaufene Atmung über die folgenden Schritte hinweg", () => {
    const geatmet = advanceConfidence(initialConfidence(), {
      type: "breathingFinished",
    });
    assert.equal(geatmet.breathingDone, true);
    assert.equal(after(2, geatmet).breathingDone, true);
  });

  it("lässt weiterziehen, auch wenn die Atmung übersprungen wurde", () => {
    const uebersprungen = after(1);
    assert.equal(uebersprungen.step, "body");
    assert.equal(uebersprungen.breathingDone, false);
  });
});

describe("die Fortschrittsanzeige", () => {
  it("zählt vier Schritte — der Abschluss ist keiner", () => {
    assert.equal(COUNTED_STEPS, 4);
  });

  it("nummeriert jeden Schritt 1-basiert", () => {
    assert.equal(stepNumber("breathe"), 1);
    assert.equal(stepNumber("reminder"), COUNTED_STEPS);
  });
});
