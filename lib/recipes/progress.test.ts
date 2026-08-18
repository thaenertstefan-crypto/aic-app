import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Enums } from "../supabase/database.types.ts";
import { everCompletedSlugs, latestPerSlug } from "./progress.ts";

/** So schmal wie die Signatur es zulässt — mehr liest keine der beiden Fragen. */
type Row = {
  recipe_slug: string;
  cycle_number: number;
  status: Enums<"recipe_status">;
};

function row(
  slug: string,
  cycle_number: number,
  status: Row["status"] = "in_progress",
): Row {
  return { recipe_slug: slug, cycle_number, status };
}

describe("latestPerSlug", () => {
  it("gibt für einen Nutzer ohne Zeilen nichts zurück", () => {
    assert.equal(latestPerSlug([]).size, 0);
  });

  it("gibt die eine Zeile eines Slugs zurück", () => {
    const only = row("values", 1);

    assert.deepEqual(latestPerSlug([only]).get("values"), only);
  });

  it("greift bei zwei Durchläufen desselben Slugs den laufenden", () => {
    // Der Defekt, den diese Funktion abräumt: das Dashboard griff hier per
    // `.find()` und bekam den abgeschlossenen ersten Durchlauf, sobald
    // `startNewCycleAction` einen zweiten angelegt hatte.
    const abgeschlossen = row("values", 1, "completed");
    const laufend = row("values", 2, "in_progress");

    assert.deepEqual(
      latestPerSlug([abgeschlossen, laufend]).get("values"),
      laufend,
    );
  });

  it("greift den laufenden Durchlauf auch, wenn er zuerst kommt", () => {
    // Ohne `order` ist die Reihenfolge der Zeilen nicht zugesichert — die
    // Funktion darf sich nicht darauf verlassen, dass der jüngste hinten steht.
    const laufend = row("values", 2, "in_progress");
    const abgeschlossen = row("values", 1, "completed");

    assert.deepEqual(
      latestPerSlug([laufend, abgeschlossen]).get("values"),
      laufend,
    );
  });

  it("hält die Slugs auseinander", () => {
    const map = latestPerSlug([row("values", 2), row("wants", 1)]);

    assert.equal(map.size, 2);
    assert.equal(map.get("values")?.cycle_number, 2);
    assert.equal(map.get("wants")?.cycle_number, 1);
  });
});

describe("everCompletedSlugs", () => {
  it("zählt für einen Nutzer ohne Zeilen nichts", () => {
    assert.equal(everCompletedSlugs([]).size, 0);
  });

  it("nimmt nur abgeschlossene Durchläufe", () => {
    const slugs = everCompletedSlugs([
      row("values", 1, "completed"),
      row("wants", 1, "in_progress"),
      row("shadow", 1, "not_started"),
    ]);

    assert.deepEqual([...slugs], ["values"]);
  });

  it("zählt einen Slug einmal, egal wie viele Durchläufe abgeschlossen sind", () => {
    const slugs = everCompletedSlugs([
      row("values", 1, "completed"),
      row("values", 2, "completed"),
    ]);

    assert.equal(slugs.size, 1);
  });

  it("behält einen geschafften Slug, wenn ein neuer Durchlauf läuft", () => {
    // Der Unterschied zu `latestPerSlug`: die Einstellungen zählen, was der
    // Nutzer geschafft hat — ein zweiter Durchlauf nimmt ihm den ersten nicht.
    const slugs = everCompletedSlugs([
      row("values", 1, "completed"),
      row("values", 2, "in_progress"),
    ]);

    assert.deepEqual([...slugs], ["values"]);
  });
});
