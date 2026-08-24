import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { RightItem } from "../types/db-json.ts";
import { dayOfYear, rightOfTheDay } from "./daily-right.ts";

function right(id: string, active = true): RightItem {
  return { id, text: `Recht ${id}`, active };
}

describe("dayOfYear", () => {
  it("zählt ab 1 am Neujahrstag", () => {
    assert.equal(dayOfYear("2026-01-01"), 1);
  });

  it("zählt den 31. Dezember eines Nicht-Schaltjahres als 365", () => {
    assert.equal(dayOfYear("2026-12-31"), 365);
  });

  it("kennt den Schalttag — 2024 hat 366 Tage", () => {
    assert.equal(dayOfYear("2024-12-31"), 366);
  });

  it("liest den Key als reines Datum, nicht als Server-Zeitpunkt", () => {
    // Derselbe Key ergibt denselben Tag, egal wann der Prozess ihn auswertet.
    assert.equal(dayOfYear("2026-08-24"), dayOfYear("2026-08-24"));
  });
});

describe("rightOfTheDay", () => {
  it("gibt null zurück, wenn es gar keine Rechte gibt", () => {
    assert.equal(rightOfTheDay([], "2026-08-24"), null);
  });

  it("gibt null zurück, wenn kein Recht aktiv ist", () => {
    const abgewaehlt = [right("a", false), right("b", false)];
    assert.equal(rightOfTheDay(abgewaehlt, "2026-08-24"), null);
  });

  it("rotiert nur über die aktiven Rechte", () => {
    const rights = [right("aus", false), right("a"), right("b")];
    const gezogen = new Set<string>();
    for (let tag = 1; tag <= 31; tag++) {
      const key = `2026-01-${String(tag).padStart(2, "0")}`;
      gezogen.add(rightOfTheDay(rights, key)!.id);
    }
    assert.deepEqual([...gezogen].sort(), ["a", "b"]);
  });

  it("wählt für denselben Tag immer dasselbe Recht", () => {
    const rights = [right("a"), right("b"), right("c")];
    assert.equal(
      rightOfTheDay(rights, "2026-08-24")!.id,
      rightOfTheDay(rights, "2026-08-24")!.id,
    );
  });

  it("wechselt von einem Tag auf den nächsten", () => {
    const rights = [right("a"), right("b")];
    assert.notEqual(
      rightOfTheDay(rights, "2026-08-24")!.id,
      rightOfTheDay(rights, "2026-08-25")!.id,
    );
  });
});
