import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cycleIsComplete,
  evaluationPhase,
  type EvaluationStand,
} from "./evaluation-phase.ts";

/** Ein frisch begonnener Zyklus: nichts abgeschlossen, keine Reflexion. */
function stand(patch: Partial<EvaluationStand> = {}): EvaluationStand {
  return {
    status: "in_progress",
    hypothesisVersion: 1,
    hasEvalEntry: false,
    ...patch,
  };
}

describe("evaluationPhase — die drei Bühnen der Auswertung", () => {
  it("beginnt bei der Reflexion, solange nichts gespeichert ist", () => {
    assert.equal(evaluationPhase(stand()), "reflection");
  });

  it("geht zur Anpassung, sobald eine Reflexion vorliegt", () => {
    assert.equal(evaluationPhase(stand({ hasEvalEntry: true })), "adjust");
  });

  it("zeigt die Feier-Bühne, wenn der Fortschritt abgeschlossen ist", () => {
    assert.equal(evaluationPhase(stand({ status: "completed" })), "complete");
  });

  it("hält auch ohne Fortschritts-Zeile die Reflexion", () => {
    assert.equal(evaluationPhase(stand({ status: null })), "reflection");
  });
});

describe("evaluationPhase — die zweite Hypothesen-Version schließt ab", () => {
  it("gilt als abgeschlossen, obwohl der Fortschritt das nicht sagt", () => {
    // Die nicht offensichtliche Regel: das `insert` der neuen Version lief,
    // das `update` des Fortschritts danach nicht. Ohne diesen Weg stünde der
    // Nutzer wieder in der Anpassung vor Werten, die er schon angepasst hat.
    assert.equal(
      evaluationPhase(stand({ status: "in_progress", hypothesisVersion: 2 })),
      "complete",
    );
  });

  it("schlägt die Anpassung, auch wenn eine Reflexion vorliegt", () => {
    assert.equal(
      evaluationPhase(
        stand({ status: "in_progress", hypothesisVersion: 2, hasEvalEntry: true }),
      ),
      "complete",
    );
  });

  it("bleibt bei Version 1 in der bisherigen Bühne", () => {
    assert.equal(
      evaluationPhase(stand({ hypothesisVersion: 1, hasEvalEntry: true })),
      "adjust",
    );
  });

  it("schließt bei jeder höheren Version ab, nicht nur bei genau 2", () => {
    for (const hypothesisVersion of [2, 3, 7]) {
      assert.equal(evaluationPhase(stand({ hypothesisVersion })), "complete");
    }
  });
});

describe("cycleIsComplete — die Sperre und die Bühne lesen dieselbe Regel", () => {
  it("hält einen frischen Durchlauf offen", () => {
    assert.equal(
      cycleIsComplete({ status: "in_progress", hypothesisVersion: 1 }),
      false,
    );
  });

  it("hält auch ohne Fortschritts-Zeile offen", () => {
    assert.equal(cycleIsComplete({ status: null, hypothesisVersion: 1 }), false);
  });

  it("schließt ab, wenn der Fortschritt es sagt", () => {
    assert.equal(
      cycleIsComplete({ status: "completed", hypothesisVersion: 1 }),
      true,
    );
  });

  it("schließt ab bei einer zweiten Hypothesen-Version, auch ohne Fortschritt", () => {
    // Der Weg, über den KAN-19 sichtbar wurde: Schritt 1 stand offen, obwohl
    // der Kompass längst angepasst war.
    assert.equal(
      cycleIsComplete({ status: "in_progress", hypothesisVersion: 2 }),
      true,
    );
  });

  it("stimmt in jedem Fall mit der Feier-Bühne überein", () => {
    // Die eigentliche Zusicherung: eine Sperre, die anders urteilt als die
    // Bühne, wäre genau die Doppelung, die dieses Prädikat verhindern soll.
    for (const status of ["in_progress", "completed", "not_started", null]) {
      for (const hypothesisVersion of [1, 2, 3]) {
        for (const hasEvalEntry of [false, true]) {
          assert.equal(
            cycleIsComplete({ status, hypothesisVersion }),
            evaluationPhase({ status, hypothesisVersion, hasEvalEntry }) ===
              "complete",
          );
        }
      }
    }
  });
});
