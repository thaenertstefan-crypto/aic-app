import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BURN_MS, burnDuration, burnRitual } from "./burn.ts";

describe("burnRitual — die Bestätigung ist eine Regel", () => {
  it("fragt beim ersten Tap nach und lässt die Bühne stehen", () => {
    const next = burnRitual(false, "tap");

    assert.equal(next.confirming, true);
    assert.equal(next.phase, "journal");
  });

  it("verbrennt beim zweiten Tap", () => {
    const armed = burnRitual(false, "tap");
    const next = burnRitual(armed.confirming, "tap");

    assert.equal(next.confirming, false);
    assert.equal(next.phase, "burning");
  });

  it("nimmt die Nachfrage zurück, wenn der Text sich ändert", () => {
    // Sie galt dem Text, wie er dastand. Ohne diese Regel bliebe „Wirklich
    // verbrennen?" nach dem Wegfall des Timers unbegrenzt scharf.
    const next = burnRitual(true, "edit");

    assert.equal(next.confirming, false);
    assert.equal(next.phase, "journal");
  });

  it("verbrennt nach einer Textänderung erst wieder auf zwei Taps", () => {
    let state = burnRitual(false, "tap");
    state = burnRitual(state.confirming, "edit");
    state = burnRitual(state.confirming, "tap");

    assert.equal(state.phase, "journal");
    assert.equal(burnRitual(state.confirming, "tap").phase, "burning");
  });

  it("hängt an nichts als der Nachfrage — nicht an verstrichener Zeit", () => {
    // Vorher setzte ein 3500-ms-Timer `confirming` zurück: derselbe zweite Tap
    // verbrannte oder fragte erneut nach, je nachdem wie schnell getippt wurde.
    assert.deepEqual(burnRitual(true, "tap"), burnRitual(true, "tap"));
    assert.deepEqual(burnRitual(false, "tap"), burnRitual(false, "tap"));
  });

  it("führt nie unmittelbar nach done", () => {
    // Nach „done" kommt man nur über die Verbrenn-Bühne — das ist der eine Weg.
    for (const confirming of [true, false]) {
      for (const event of ["tap", "edit"] as const) {
        assert.notEqual(burnRitual(confirming, event).phase, "done");
      }
    }
  });
});

describe("burnDuration — die Motion-Präferenz ändert die Dauer, nicht den Weg", () => {
  it("lässt die Verbrenn-Bühne so lange stehen wie die Animation", () => {
    assert.equal(burnDuration(false), BURN_MS);
  });

  it("überspringt bei „Bewegung reduzieren“ nur die Wartezeit", () => {
    assert.equal(burnDuration(true), 0);
  });
});
