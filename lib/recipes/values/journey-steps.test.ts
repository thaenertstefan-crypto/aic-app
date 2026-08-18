import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  JOURNEY_LAST_INDEX,
  journeySteps,
  type JourneyStand,
} from "./journey-steps.ts";

const TODAY = "2026-08-18";

/** Ein frisch begonnener erster Durchlauf: Kompass steht, kein Tag reflektiert. */
function stand(patch: Partial<JourneyStand> = {}): JourneyStand {
  return {
    status: "in_progress",
    hypothesisVersion: 1,
    cycleNumber: 1,
    hasHypothesisRow: true,
    entryDates: [],
    today: TODAY,
    ...patch,
  };
}

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

describe("journeySteps — der erste Durchlauf", () => {
  it("zündet Stern 0, sobald eine Hypothese vorliegt", () => {
    const { completed, currentStep } = journeySteps(stand());
    assert.deepEqual(completed, [0]);
    assert.equal(currentStep, 1);
  });

  it("lässt ohne Hypothese alles dunkel und stellt auf Stern 0", () => {
    const { completed, currentStep } = journeySteps(
      stand({ hasHypothesisRow: false, status: null }),
    );
    assert.deepEqual(completed, []);
    assert.equal(currentStep, 0);
  });

  it("zählt eindeutige Tage, nicht Einträge", () => {
    const { completed } = journeySteps(
      stand({ entryDates: ["2026-08-05", "2026-08-05", "2026-08-06"] }),
    );
    assert.deepEqual(completed, [0, 1, 2]);
  });

  it("stellt nach sieben Tagen auf die Auswertung", () => {
    const { completed, currentStep } = journeySteps(
      stand({ entryDates: SEVEN_DAYS }),
    );
    assert.deepEqual(completed, [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.equal(currentStep, JOURNEY_LAST_INDEX);
  });

  it("zündet bei abgeschlossenem Durchlauf jede Etappe", () => {
    const { completed, currentStep } = journeySteps(
      stand({ entryDates: SEVEN_DAYS, status: "completed" }),
    );
    assert.deepEqual(completed, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(currentStep, JOURNEY_LAST_INDEX);
  });
});

describe("journeySteps — die Karte zeigt den laufenden Durchlauf", () => {
  // Der Kern von KAN-21: die Einträge sind gefiltert übergeben, also leer.
  // Vorher zählte die Übersicht ungefiltert und meldete 7/7, während Journal
  // und Auswertung im selben Moment 0/7 sahen.
  it("beginnt im zweiten Durchlauf wieder bei Tag 1", () => {
    const { completed, currentStep } = journeySteps(
      stand({
        cycleNumber: 2,
        hypothesisVersion: 2,
        entryDates: [],
      }),
    );
    assert.deepEqual(completed, [0]);
    assert.equal(currentStep, 1);
  });

  it("hält Stern 0 im zweiten Durchlauf erledigt, auch ohne neue Hypothesen-Zeile", () => {
    // Sonst stünde ein ohne Anpassung gestarteter Durchlauf vor einem
    // gesperrten Stern 0 und einem gesperrten Rest — eine Sackgasse.
    const { completed, currentStep } = journeySteps(
      stand({ cycleNumber: 2, hasHypothesisRow: false }),
    );
    assert.deepEqual(completed, [0]);
    assert.equal(currentStep, 1);
  });

  it("meldet den zweiten Durchlauf nicht als abgeschlossen, nur weil Version 2 existiert", () => {
    const { completed } = journeySteps(
      stand({ cycleNumber: 2, hypothesisVersion: 2, entryDates: SEVEN_DAYS }),
    );
    assert.equal(completed.includes(JOURNEY_LAST_INDEX), false);
  });

  it("schließt ab, sobald die Hypothese über den Durchlauf hinausgeht", () => {
    const { completed } = journeySteps(
      stand({ cycleNumber: 2, hypothesisVersion: 3 }),
    );
    assert.deepEqual(completed, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe("journeySteps — die Tagessperre", () => {
  it("bleibt auf dem heute ausgefüllten Tag stehen", () => {
    const { completed, currentStep } = journeySteps(
      stand({ entryDates: ["2026-08-17", TODAY] }),
    );
    assert.deepEqual(completed, [0, 1, 2]);
    assert.equal(currentStep, 2);
  });

  it("gibt am Folgetag den nächsten Stern frei", () => {
    const { currentStep } = journeySteps(
      stand({ entryDates: ["2026-08-16", "2026-08-17"] }),
    );
    assert.equal(currentStep, 3);
  });

  it("lässt die Auswertung unberührt, auch wenn Tag 7 heute war", () => {
    const { currentStep } = journeySteps(
      stand({ entryDates: [...SEVEN_DAYS.slice(0, 6), TODAY] }),
    );
    assert.equal(currentStep, JOURNEY_LAST_INDEX);
  });

  it("greift nicht, solange gar kein Tag reflektiert ist", () => {
    const { currentStep } = journeySteps(stand({ entryDates: [] }));
    assert.equal(currentStep, 1);
  });
});
