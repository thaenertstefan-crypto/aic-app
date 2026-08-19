import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  JOURNEY_LAST_INDEX,
  cycleFrom,
  cycleOfEntry,
  evaluationPhase,
  journeySteps,
  nextCycle,
  type Cycle,
} from "./cycle.ts";

/**
 * Ein laufender Durchlauf, gebaut aus den zwei Zeilen, die ihn belegen.
 *
 * Bewusst über `cycleFrom` statt über ein Objektliteral: damit prüfen die Tests
 * nur Zustände, die aus echten Zeilen entstehen können. „Keine
 * Fortschritts-Zeile, aber Durchlauf 3" ist keiner davon — dafür steht
 * `UNBEGONNEN`.
 */
function cycle({
  status = "in_progress" as NonNullable<Cycle["status"]>,
  number = 1,
  version = 1 as number | null,
} = {}): Cycle {
  return cycleFrom(
    { status, cycle_number: number },
    version === null ? null : { version },
  );
}

/** Wer die Übung noch nie geöffnet hat: keine Fortschritts-Zeile, keine Hypothese. */
const UNBEGONNEN = cycleFrom(null, null);

describe("cycleFrom — der Anfangszustand ist ein Zustand", () => {
  it("steht ohne jede Zeile in Durchlauf 1", () => {
    assert.equal(UNBEGONNEN.number, 1);
    assert.equal(UNBEGONNEN.status, null);
    assert.equal(UNBEGONNEN.hypothesisVersion, null);
  });

  it("lässt Schritt 1 offen, solange nichts angefangen ist", () => {
    assert.equal(UNBEGONNEN.isComplete, false);
    assert.equal(UNBEGONNEN.hypothesisLocked, false);
    assert.equal(UNBEGONNEN.stage, "select");
  });

  it("unterscheidet „keine Hypothese“ von „Version 1“", () => {
    // Die eine Stelle, an der der Unterschied zählt: Stern 0 der Sternenkarte.
    assert.equal(cycle({ version: null }).hypothesisVersion, null);
    assert.equal(cycle({ version: 1 }).hypothesisVersion, 1);
  });
});

describe("cycleOfEntry — der Durchlauf eines Eintrags, nicht der laufende", () => {
  it("übernimmt die Nummer der Zeile", () => {
    assert.equal(cycleOfEntry({ cycle_number: 3 }).number, 3);
  });

  it("behauptet nichts, was auf der Zeile nicht steht", () => {
    const dritter = cycleOfEntry({ cycle_number: 3 });
    assert.equal(dritter.status, null);
    assert.equal(dritter.hypothesisVersion, null);
    // „Nicht nachweislich abgeschlossen“ — ohne Fortschritts-Zeile gibt es
    // keinen Beleg dafür, dass der Durchlauf vorbei wäre.
    assert.equal(dritter.isComplete, false);
  });
});

describe("evaluationPhase — die drei Bühnen der Auswertung", () => {
  it("beginnt bei der Reflexion, solange nichts gespeichert ist", () => {
    assert.equal(evaluationPhase(cycle(), false), "reflection");
  });

  it("geht zur Anpassung, sobald eine Reflexion vorliegt", () => {
    assert.equal(evaluationPhase(cycle(), true), "adjust");
  });

  it("zeigt die Feier-Bühne, wenn der Fortschritt abgeschlossen ist", () => {
    assert.equal(evaluationPhase(cycle({ status: "completed" }), false), "complete");
  });

  it("hält auch ohne Fortschritts-Zeile die Reflexion", () => {
    assert.equal(evaluationPhase(UNBEGONNEN, false), "reflection");
  });
});

describe("evaluationPhase — die zweite Hypothesen-Version schließt ab", () => {
  it("gilt als abgeschlossen, obwohl der Fortschritt das nicht sagt", () => {
    // Die nicht offensichtliche Regel: das `insert` der neuen Version lief,
    // das `update` des Fortschritts danach nicht. Ohne diesen Weg stünde der
    // Nutzer wieder in der Anpassung vor Werten, die er schon angepasst hat.
    assert.equal(
      evaluationPhase(cycle({ status: "in_progress", version: 2 }), false),
      "complete",
    );
  });

  it("schlägt die Anpassung, auch wenn eine Reflexion vorliegt", () => {
    assert.equal(
      evaluationPhase(cycle({ status: "in_progress", version: 2 }), true),
      "complete",
    );
  });

  it("bleibt bei Version 1 in der bisherigen Bühne", () => {
    assert.equal(evaluationPhase(cycle({ version: 1 }), true), "adjust");
  });

  it("schließt bei jeder höheren Version ab, nicht nur bei genau 2", () => {
    for (const version of [2, 3, 7]) {
      assert.equal(evaluationPhase(cycle({ version }), false), "complete");
    }
  });
});

describe("isComplete — gilt je Durchlauf, nicht ein für alle Mal", () => {
  it("hält einen frischen Durchlauf offen", () => {
    assert.equal(cycle().isComplete, false);
  });

  it("hält auch ohne Fortschritts-Zeile offen", () => {
    assert.equal(UNBEGONNEN.isComplete, false);
  });

  it("schließt ab, wenn der Fortschritt es sagt", () => {
    assert.equal(cycle({ status: "completed" }).isComplete, true);
  });

  it("schließt Durchlauf 1 ab, sobald Version 2 existiert", () => {
    assert.equal(cycle({ version: 2 }).isComplete, true);
  });

  it("hält Durchlauf 2 offen, solange nur Version 2 existiert", () => {
    // Der Kern von KAN-20: Version 2 ist der Kompass, den Durchlauf 2 GERADE
    // TESTET — kein Beleg dafür, dass Durchlauf 2 vorbei wäre. Die alte Regel
    // `hypothesisVersion > 1` meldete hier sofort „abgeschlossen“ und ließ
    // sieben Tage Journal ins Leere laufen.
    assert.equal(cycle({ number: 2, version: 2 }).isComplete, false);
  });

  it("schließt Durchlauf 2 ab, sobald Version 3 existiert", () => {
    assert.equal(cycle({ number: 2, version: 3 }).isComplete, true);
  });

  it("bleibt über beliebig viele Durchläufe dieselbe Regel", () => {
    for (const number of [1, 2, 3, 7]) {
      assert.equal(cycle({ number, version: number }).isComplete, false);
      assert.equal(cycle({ number, version: number + 1 }).isComplete, true);
    }
  });

  it("stimmt mit der Feier-Bühne überein — in jedem Durchlauf", () => {
    for (const c of alleDurchlaeufe()) {
      for (const hasEvalEntry of [false, true]) {
        assert.equal(
          c.isComplete,
          evaluationPhase(c, hasEvalEntry) === "complete",
          JSON.stringify(c),
        );
      }
    }
  });
});

describe("hypothesisLocked — die Hypothese steht, auch wenn der Durchlauf neu ist", () => {
  it("lässt Schritt 1 im ersten Durchlauf offen", () => {
    assert.equal(cycle().hypothesisLocked, false);
  });

  it("sperrt, sobald der erste Durchlauf abgeschlossen ist", () => {
    assert.equal(cycle({ status: "completed" }).hypothesisLocked, true);
  });

  it("sperrt, sobald eine angepasste Version existiert", () => {
    assert.equal(cycle({ version: 2 }).hypothesisLocked, true);
  });

  it("bleibt im zweiten Durchlauf gesperrt, obwohl der offen ist", () => {
    // Genau hier laufen die beiden Wahrheiten auseinander: der Durchlauf ist
    // NICHT vorbei, die Hypothese steht trotzdem fest. Mit `isComplete` an
    // dieser Stelle stünde Schritt 1 wieder offen — und schriebe auf Version 1.
    const zweiter = cycle({ number: 2, version: 2 });
    assert.equal(zweiter.isComplete, false);
    assert.equal(zweiter.hypothesisLocked, true);
  });

  it("ist im ersten Durchlauf deckungsgleich mit „Durchlauf vorbei“", () => {
    for (const c of alleDurchlaeufe()) {
      if (c.number !== 1) continue;
      assert.equal(c.hypothesisLocked, c.isComplete, JSON.stringify(c));
    }
  });
});

describe("stage — gesperrt ist nicht dasselbe wie vorbei", () => {
  it("zeigt im ersten Durchlauf die Auswahl", () => {
    assert.equal(cycle().stage, "select");
  });

  it("zeigt im frisch gestarteten zweiten Durchlauf den laufenden Kompass", () => {
    // Der Fall, für den es diese Unterscheidung gibt: `startNewCycleAction`
    // leitet auf Schritt 1, und mit nur einem Sperr-Flag stand am Anfang des
    // neuen Durchlaufs „Dieser Durchlauf ist abgeschlossen“.
    const zweiter = cycle({ number: 2, version: 2 });
    assert.equal(zweiter.hypothesisLocked, true);
    assert.equal(zweiter.stage, "current");
  });

  it("zeigt den Rückblick, sobald der Durchlauf abgeschlossen ist", () => {
    assert.equal(cycle({ status: "completed" }).stage, "archive");
  });

  it("zeigt den Rückblick auch, wenn nur die neue Version davon weiß", () => {
    assert.equal(cycle({ status: "in_progress", version: 2 }).stage, "archive");
  });

  it("zeigt den laufenden Kompass auch ohne Anpassung des Vorgängers", () => {
    // Durchlauf 2 ohne neue Hypothesen-Version — dieselbe Sackgasse, die auch
    // die Sternenkarte umgeht.
    assert.equal(cycle({ number: 2, version: 1 }).stage, "current");
  });

  it("bietet nur in der Auswahl einen Speichern-Weg an", () => {
    for (const c of alleDurchlaeufe()) {
      assert.equal(c.stage === "select", !c.hypothesisLocked, JSON.stringify(c));
    }
  });
});

// ─── Sternenkarte ────────────────────────────────────────────────────

const TODAY = "2026-08-18";

/** Sieben Reflexionstage, alle in der Vergangenheit. */
const SEVEN_DAYS = [
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-09",
  "2026-08-10",
  "2026-08-11",
];

/** Die Karte eines Durchlaufs — Tage optional, heute ist immer `TODAY`. */
function karte(c: Cycle, entryDates: string[] = []) {
  return journeySteps(c, { entryDates, today: TODAY });
}

describe("journeySteps — der erste Durchlauf", () => {
  it("zündet Stern 0, sobald eine Hypothese vorliegt", () => {
    const { completed, currentStep } = karte(cycle());
    assert.deepEqual(completed, [0]);
    assert.equal(currentStep, 1);
  });

  it("lässt ohne Hypothese alles dunkel und stellt auf Stern 0", () => {
    const { completed, currentStep } = karte(UNBEGONNEN);
    assert.deepEqual(completed, []);
    assert.equal(currentStep, 0);
  });

  it("zählt eindeutige Tage, nicht Einträge", () => {
    const { completed } = karte(cycle(), [
      "2026-08-05",
      "2026-08-05",
      "2026-08-06",
    ]);
    assert.deepEqual(completed, [0, 1, 2]);
  });

  it("stellt nach sieben Tagen auf die Auswertung", () => {
    const { completed, currentStep } = karte(cycle(), SEVEN_DAYS);
    assert.deepEqual(completed, [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.equal(currentStep, JOURNEY_LAST_INDEX);
  });

  it("zündet bei abgeschlossenem Durchlauf jede Etappe", () => {
    const { completed, currentStep } = karte(
      cycle({ status: "completed" }),
      SEVEN_DAYS,
    );
    assert.deepEqual(completed, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(currentStep, JOURNEY_LAST_INDEX);
  });
});

describe("journeySteps — die Karte zeigt den laufenden Durchlauf", () => {
  // Der Kern von KAN-21: die Einträge kommen aus `cycleJournal`, sind also
  // gefiltert und im neuen Durchlauf leer. Vorher zählte die Übersicht
  // ungefiltert und meldete 7/7, während Journal und Auswertung 0/7 sahen.
  it("beginnt im zweiten Durchlauf wieder bei Tag 1", () => {
    const { completed, currentStep } = karte(cycle({ number: 2, version: 2 }));
    assert.deepEqual(completed, [0]);
    assert.equal(currentStep, 1);
  });

  it("hält Stern 0 im zweiten Durchlauf erledigt, auch ohne neue Hypothesen-Zeile", () => {
    // Sonst stünde ein ohne Anpassung gestarteter Durchlauf vor einem
    // gesperrten Stern 0 und einem gesperrten Rest — eine Sackgasse.
    const { completed, currentStep } = karte(
      cycle({ number: 2, version: null }),
    );
    assert.deepEqual(completed, [0]);
    assert.equal(currentStep, 1);
  });

  it("meldet den zweiten Durchlauf nicht als abgeschlossen, nur weil Version 2 existiert", () => {
    const { completed } = karte(cycle({ number: 2, version: 2 }), SEVEN_DAYS);
    assert.equal(completed.includes(JOURNEY_LAST_INDEX), false);
  });

  it("schließt ab, sobald die Hypothese über den Durchlauf hinausgeht", () => {
    const { completed } = karte(cycle({ number: 2, version: 3 }));
    assert.deepEqual(completed, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe("journeySteps — die Tagessperre", () => {
  it("bleibt auf dem heute ausgefüllten Tag stehen", () => {
    const { completed, currentStep } = karte(cycle(), ["2026-08-17", TODAY]);
    assert.deepEqual(completed, [0, 1, 2]);
    assert.equal(currentStep, 2);
  });

  it("gibt am Folgetag den nächsten Stern frei", () => {
    const { currentStep } = karte(cycle(), ["2026-08-16", "2026-08-17"]);
    assert.equal(currentStep, 3);
  });

  it("lässt die Auswertung unberührt, auch wenn Tag 7 heute war", () => {
    const { currentStep } = karte(cycle(), [
      ...SEVEN_DAYS.slice(0, 6),
      TODAY,
    ]);
    assert.equal(currentStep, JOURNEY_LAST_INDEX);
  });

  it("greift nicht, solange gar kein Tag reflektiert ist", () => {
    const { currentStep } = karte(cycle(), []);
    assert.equal(currentStep, 1);
  });
});

// ─── Der nächste Durchlauf ───────────────────────────────────────────

const NOW = "2026-08-18T10:00:00.000Z";

describe("nextCycle — die drei Regeln eines neuen Durchlaufs", () => {
  it("zählt die Nummer um genau eins hoch", () => {
    assert.equal(nextCycle(cycle({ number: 2 }), NOW).cycle_number, 3);
  });

  it("beginnt am Kompass, nicht in Tag 1", () => {
    // KAN-22: `current_step: 1` schickte den neuen Durchlauf direkt ins
    // Journal — der angepasste Kompass wurde nie gezeigt.
    assert.equal(nextCycle(cycle(), NOW).current_step, 2);
  });

  it("setzt den neuen Durchlauf auf „läuft“, auch nach einem abgeschlossenen", () => {
    const vorbei = cycle({ status: "completed" });
    assert.equal(vorbei.isComplete, true);
    assert.equal(nextCycle(vorbei, NOW).status, "in_progress");
  });

  it("trägt den übergebenen Zeitstempel als Start ein", () => {
    assert.equal(nextCycle(cycle(), NOW).started_at, NOW);
  });

  it("führt aus dem abgeschlossenen Durchlauf in einen offenen", () => {
    // Die Kette einmal ganz: der neue Durchlauf ist nicht vorbei, sein Kompass
    // ist gesperrt, und Schritt 1 zeigt ihn als laufenden.
    const vorbei = cycle({ number: 1, status: "completed", version: 2 });
    const neu = nextCycle(vorbei, NOW);
    const neuerDurchlauf = cycleFrom(
      { status: neu.status, cycle_number: neu.cycle_number },
      { version: 2 },
    );
    assert.equal(neuerDurchlauf.isComplete, false);
    assert.equal(neuerDurchlauf.hypothesisLocked, true);
    assert.equal(neuerDurchlauf.stage, "current");
  });
});

/**
 * Alle Durchläufe, die aus echten Zeilen entstehen können — für die
 * Übereinstimmungs-Prüfungen oben.
 *
 * Ohne Fortschritts-Zeile gibt es nur Durchlauf 1; diese Kombination steht
 * darum einzeln als `UNBEGONNEN` und nicht im Kreuzprodukt.
 */
function alleDurchlaeufe(): Cycle[] {
  const cycles: Cycle[] = [UNBEGONNEN];

  for (const status of ["not_started", "in_progress", "completed"] as const) {
    for (const number of [1, 2, 3]) {
      for (const version of [null, 1, 2, 3, 4]) {
        cycles.push(cycle({ status, number, version }));
      }
    }
  }

  return cycles;
}
