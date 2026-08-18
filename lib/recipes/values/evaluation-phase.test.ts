import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cycleIsComplete,
  evaluationPhase,
  hypothesisIsLocked,
  type EvaluationStand,
} from "./evaluation-phase.ts";

/** Ein frisch begonnener Zyklus: nichts abgeschlossen, keine Reflexion. */
function stand(patch: Partial<EvaluationStand> = {}): EvaluationStand {
  return {
    status: "in_progress",
    hypothesisVersion: 1,
    cycleNumber: 1,
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

describe("cycleIsComplete — gilt je Durchlauf, nicht ein für alle Mal", () => {
  it("hält einen frischen Durchlauf offen", () => {
    assert.equal(cycleIsComplete(stand()), false);
  });

  it("hält auch ohne Fortschritts-Zeile offen", () => {
    assert.equal(cycleIsComplete(stand({ status: null })), false);
  });

  it("schließt ab, wenn der Fortschritt es sagt", () => {
    assert.equal(cycleIsComplete(stand({ status: "completed" })), true);
  });

  it("schließt Durchlauf 1 ab, sobald Version 2 existiert", () => {
    assert.equal(cycleIsComplete(stand({ hypothesisVersion: 2 })), true);
  });

  it("hält Durchlauf 2 offen, solange nur Version 2 existiert", () => {
    // Der Kern von KAN-20: Version 2 ist der Kompass, den Durchlauf 2 GERADE
    // TESTET — kein Beleg dafür, dass Durchlauf 2 vorbei wäre. Die alte Regel
    // `hypothesisVersion > 1` meldete hier sofort „abgeschlossen" und ließ
    // sieben Tage Journal ins Leere laufen.
    assert.equal(
      cycleIsComplete(stand({ hypothesisVersion: 2, cycleNumber: 2 })),
      false,
    );
  });

  it("schließt Durchlauf 2 ab, sobald Version 3 existiert", () => {
    assert.equal(
      cycleIsComplete(stand({ hypothesisVersion: 3, cycleNumber: 2 })),
      true,
    );
  });

  it("bleibt über beliebig viele Durchläufe dieselbe Regel", () => {
    for (const cycleNumber of [1, 2, 3, 7]) {
      assert.equal(
        cycleIsComplete(stand({ hypothesisVersion: cycleNumber, cycleNumber })),
        false,
      );
      assert.equal(
        cycleIsComplete(
          stand({ hypothesisVersion: cycleNumber + 1, cycleNumber }),
        ),
        true,
      );
    }
  });

  it("stimmt mit der Feier-Bühne überein — in jedem Durchlauf", () => {
    for (const status of ["in_progress", "completed", "not_started", null]) {
      for (const cycleNumber of [1, 2, 3]) {
        for (const hypothesisVersion of [1, 2, 3, 4]) {
          for (const hasEvalEntry of [false, true]) {
            const s = { status, hypothesisVersion, cycleNumber, hasEvalEntry };
            assert.equal(
              cycleIsComplete(s),
              evaluationPhase(s) === "complete",
              JSON.stringify(s),
            );
          }
        }
      }
    }
  });
});

describe("hypothesisIsLocked — die Hypothese steht, auch wenn der Durchlauf neu ist", () => {
  it("lässt Schritt 1 im ersten Durchlauf offen", () => {
    assert.equal(hypothesisIsLocked(stand()), false);
  });

  it("sperrt, sobald der erste Durchlauf abgeschlossen ist", () => {
    assert.equal(hypothesisIsLocked(stand({ status: "completed" })), true);
  });

  it("sperrt, sobald eine angepasste Version existiert", () => {
    assert.equal(hypothesisIsLocked(stand({ hypothesisVersion: 2 })), true);
  });

  it("bleibt im zweiten Durchlauf gesperrt, obwohl der offen ist", () => {
    // Genau hier laufen die beiden Prädikate auseinander: der Durchlauf ist
    // NICHT vorbei, die Hypothese steht trotzdem fest. Mit cycleIsComplete an
    // dieser Stelle stünde Schritt 1 wieder offen — und schriebe auf Version 1.
    const zweiter = stand({ hypothesisVersion: 2, cycleNumber: 2 });
    assert.equal(cycleIsComplete(zweiter), false);
    assert.equal(hypothesisIsLocked(zweiter), true);
  });

  it("ist im ersten Durchlauf deckungsgleich mit „Durchlauf vorbei“", () => {
    for (const status of ["in_progress", "completed", "not_started", null]) {
      for (const hypothesisVersion of [1, 2, 3]) {
        const s = { status, hypothesisVersion, cycleNumber: 1 };
        assert.equal(hypothesisIsLocked(s), cycleIsComplete(s));
      }
    }
  });
});
