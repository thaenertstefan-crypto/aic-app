import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Enums } from "../../supabase/database.types.ts";
import type { ProgressWrite } from "../progress.ts";
import { nextAuditProgress, nextWantsProgress } from "./progress.ts";

const NOW = "2026-08-18T10:00:00.000Z";

/**
 * Eine bestehende Fortschritts-Zeile. Beide Regeln lesen nur `status`, aber der
 * gemeinsame `ProgressRow` ist seit KAN-24 die ganze Zeile — der Rest steht
 * hier einmal, damit die Tests von den Spalten reden, um die es geht.
 */
function row(status: Enums<"recipe_status">) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    user_id: "00000000-0000-0000-0000-0000000000aa",
    recipe_slug: "wants",
    cycle_number: 1,
    current_step: 1,
    status,
    intro_seen: true,
    started_at: NOW,
    completed_at: null,
  };
}

/** Die Nutzlast eines Schreibvorgangs — schlägt fehl, wenn keiner ansteht. */
function payloadOf(write: ProgressWrite) {
  assert.notEqual(write, null, "es sollte geschrieben werden");
  return write ?? {};
}

describe("nextWantsProgress — die erste Fortschritts-Zeile", () => {
  it("legt sie ohne Sterne als in_progress an", () => {
    const row = payloadOf(nextWantsProgress(null, false, NOW));

    assert.equal(row.current_step, 2);
    assert.equal(row.status, "in_progress");
    assert.equal(row.started_at, NOW);
    assert.equal(row.completed_at, undefined);
    // `cycle_number` steht bewusst NICHT hier: seit KAN-24 setzt es
    // `writeProgress` beim Anlegen selbst.
    assert.equal(row.cycle_number, undefined);
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
      nextWantsProgress(row("in_progress"), true, NOW),
    );

    assert.equal(changes.status, "completed");
    assert.equal(changes.completed_at, NOW);
    assert.equal(changes.current_step, 2);
  });

  it("holt einen unberührten Durchlauf ohne Sterne auf in_progress", () => {
    const changes = payloadOf(
      nextWantsProgress(row("not_started"), false, NOW),
    );

    assert.equal(changes.status, "in_progress");
    assert.equal(changes.completed_at, undefined);
  });

  it("rührt einen laufenden Durchlauf ohne Sterne im Status nicht an", () => {
    const changes = payloadOf(
      nextWantsProgress(row("in_progress"), false, NOW),
    );

    assert.equal(changes.status, undefined);
    assert.equal(changes.current_step, 2);
  });

  it("schiebt immer auf die Sternenkarte, egal was der Status sagt", () => {
    // Seit KAN-23 ist `status` ein Enum und NOT NULL — „gar kein Status" ist
    // kein Fall mehr, den eine Zeile haben kann. Die fehlende Zeile bleibt
    // geprüft, aber als `null` statt als Zeile mit `status: null`.
    for (const status of ["not_started", "in_progress", "completed"] as const) {
      for (const completed of [true, false]) {
        assert.equal(
          payloadOf(nextWantsProgress(row(status), completed, NOW)).current_step,
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
      nextWantsProgress(row("completed"), true, NOW),
    );

    assert.equal(changes.status, undefined);
    assert.equal(changes.completed_at, undefined);
  });

  it("setzt ihn auch dann nicht auf in_progress, wenn kein Stern mehr steht", () => {
    const changes = payloadOf(
      nextWantsProgress(row("completed"), false, NOW),
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
    assert.equal(row.cycle_number, undefined);
  });

  it("setzt einen unberührten Durchlauf auf in_progress", () => {
    const changes = payloadOf(nextAuditProgress(row("not_started"), NOW));

    assert.equal(changes.status, "in_progress");
    assert.equal(changes.current_step, 1);
  });

  it("setzt auch einen laufenden Durchlauf auf in_progress", () => {
    // Anders als bei den Sternen: das Audit fragt nur nach „abgeschlossen",
    // nicht nach „unberührt". Die Asymmetrie ist gewollt und benannt.
    const changes = payloadOf(nextAuditProgress(row("in_progress"), NOW));

    assert.equal(changes.status, "in_progress");
  });

  it("stuft einen abgeschlossenen Durchlauf nicht zurück", () => {
    // Und fasst ihn gar nicht erst an: `current_step` darf ein
    // Wiederholungs-Audit nicht auf 1 zurückziehen, sonst zeigte der
    // Weiter-Link des Dashboards wieder auf die Sternenschmiede.
    assert.equal(nextAuditProgress(row("completed"), NOW), null);
  });
});
