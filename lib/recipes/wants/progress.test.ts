import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  nextAuditProgress,
  nextWantsProgress,
  type WantsProgressWrite,
} from "./progress.ts";

const NOW = "2026-08-18T10:00:00.000Z";

/** Die Nutzlast eines Schreibvorgangs — schlägt fehl, wenn keiner ansteht. */
function payloadOf(write: WantsProgressWrite) {
  assert.notEqual(write, null, "es sollte geschrieben werden");
  return write ?? {};
}

describe("nextWantsProgress — die erste Fortschritts-Zeile", () => {
  it("legt sie ohne Sterne als in_progress an", () => {
    const row = payloadOf(nextWantsProgress(null, false, NOW));

    assert.equal(row.current_step, 2);
    assert.equal(row.status, "in_progress");
    assert.equal(row.started_at, NOW);
    assert.equal(row.cycle_number, 1);
    assert.equal(row.completed_at, undefined);
  });

  it("legt sie mit Sternen sofort als abgeschlossen an", () => {
    const row = payloadOf(nextWantsProgress(null, true, NOW));

    assert.equal(row.status, "completed");
    assert.equal(row.completed_at, NOW);
  });
});

describe("nextWantsProgress — Sterne schließen ab", () => {
  it("schließt einen laufenden Durchlauf ab, sobald ein Stern steht", () => {
    const changes = payloadOf(
      nextWantsProgress({ status: "in_progress" }, true, NOW),
    );

    assert.equal(changes.status, "completed");
    assert.equal(changes.completed_at, NOW);
    assert.equal(changes.current_step, 2);
  });

  it("holt einen unberührten Durchlauf ohne Sterne auf in_progress", () => {
    const changes = payloadOf(
      nextWantsProgress({ status: "not_started" }, false, NOW),
    );

    assert.equal(changes.status, "in_progress");
    assert.equal(changes.completed_at, undefined);
  });

  it("rührt einen laufenden Durchlauf ohne Sterne im Status nicht an", () => {
    const changes = payloadOf(
      nextWantsProgress({ status: "in_progress" }, false, NOW),
    );

    assert.equal(changes.status, undefined);
    assert.equal(changes.current_step, 2);
  });

  it("schiebt immer auf die Sternenkarte, egal was der Status sagt", () => {
    for (const status of ["not_started", "in_progress", "completed", null]) {
      for (const completed of [true, false]) {
        assert.equal(
          payloadOf(nextWantsProgress({ status }, completed, NOW)).current_step,
          2,
        );
      }
    }
  });
});

describe("nextWantsProgress — stuft einen abgeschlossenen Durchlauf nicht zurück", () => {
  it("schreibt bei erneutem Speichern mit Sternen kein zweites completed_at", () => {
    // Sonst wanderte der Abschluss-Zeitpunkt bei jedem Speichern nach vorn.
    const changes = payloadOf(
      nextWantsProgress({ status: "completed" }, true, NOW),
    );

    assert.equal(changes.status, undefined);
    assert.equal(changes.completed_at, undefined);
  });

  it("setzt ihn auch dann nicht auf in_progress, wenn kein Stern mehr steht", () => {
    const changes = payloadOf(
      nextWantsProgress({ status: "completed" }, false, NOW),
    );

    assert.equal(changes.status, undefined);
  });
});

describe("nextAuditProgress — dieselbe Regel, andere Bühne", () => {
  it("legt ohne Zeile eine an, die auf der Sternenschmiede steht", () => {
    const row = payloadOf(nextAuditProgress(null, NOW));

    assert.equal(row.current_step, 1);
    assert.equal(row.status, "in_progress");
    assert.equal(row.started_at, NOW);
    assert.equal(row.cycle_number, 1);
  });

  it("setzt einen unberührten Durchlauf auf in_progress", () => {
    const changes = payloadOf(nextAuditProgress({ status: "not_started" }, NOW));

    assert.equal(changes.status, "in_progress");
    assert.equal(changes.current_step, 1);
  });

  it("setzt auch einen laufenden Durchlauf auf in_progress", () => {
    // Anders als bei den Sternen: das Audit fragt nur nach „abgeschlossen",
    // nicht nach „unberührt". Die Asymmetrie ist gewollt und benannt.
    const changes = payloadOf(nextAuditProgress({ status: "in_progress" }, NOW));

    assert.equal(changes.status, "in_progress");
  });

  it("stuft einen abgeschlossenen Durchlauf nicht zurück", () => {
    // Und fasst ihn gar nicht erst an: `current_step` darf ein
    // Wiederholungs-Audit nicht auf 1 zurückziehen, sonst zeigte der
    // Weiter-Link des Dashboards wieder auf die Sternenschmiede.
    assert.equal(nextAuditProgress({ status: "completed" }, NOW), null);
  });
});
