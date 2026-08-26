import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Enums } from "../supabase/database.types.ts";
import { nextRecommendation, selectBild } from "./next-bild.ts";

type Row = {
  recipe_slug: string;
  cycle_number: number;
  status: Enums<"recipe_status">;
  current_step: number | null;
};

function row(
  slug: string,
  status: Row["status"],
  { cycle = 1, step = null as number | null } = {},
): Row {
  return {
    recipe_slug: slug,
    cycle_number: cycle,
    status,
    current_step: step,
  };
}

describe("selectBild", () => {
  it("zeigt einem frischen Konto den Kompass, und zwar leer", () => {
    assert.deepEqual(selectBild([]), {
      slug: "values",
      state: "leer",
      step: 1,
    });
  });

  it("rückt zum Sternenhimmel, sobald der Kompass gefüllt ist", () => {
    const rows = [row("values", "completed")];

    assert.deepEqual(selectBild(rows), {
      slug: "wants",
      state: "leer",
      step: 1,
    });
  });

  it("rückt zu den Rechten, sobald Kompass und Himmel gefüllt sind", () => {
    const rows = [row("values", "completed"), row("wants", "completed")];

    assert.equal(selectBild(rows).slug, "bill-of-rights");
  });

  it("betrachtet nur die drei Bilder — ein Booster wird nie das nächste", () => {
    // Der Defekt aus KAN-35: `RECIPES.find()` lief durch alle sieben Übungen
    // und bot nach den drei durablen den Nein-Trainer als nächsten langen Weg
    // an. Ein Booster wird nie „voll" und kann darum kein nächstes Bild sein.
    const rows = [
      row("values", "completed"),
      row("wants", "completed"),
      row("bill-of-rights", "completed"),
    ];

    assert.deepEqual(selectBild(rows), {
      slug: "values",
      state: "endzustand",
      step: 1,
    });
  });

  it("setzt einen laufenden Weg fort, auch wenn ein früheres Bild leer ist", () => {
    // Die Reihenfolge verliert gegen einen laufenden Weg: der Kompass ist leer,
    // trotzdem gewinnt der angefangene Sternenhimmel.
    const rows = [row("wants", "in_progress", { step: 2 })];

    assert.deepEqual(selectBild(rows), {
      slug: "wants",
      state: "in_arbeit",
      step: 2,
    });
  });

  it("nimmt bei mehreren laufenden Wegen den ersten der Reihenfolge", () => {
    const rows = [
      row("wants", "in_progress", { step: 2 }),
      row("values", "in_progress", { step: 3 }),
    ];

    assert.equal(selectBild(rows).slug, "values");
  });

  it("holt einen selbst gestarteten zweiten Durchlauf zurück", () => {
    // KAN-35, Entscheidung 10: den zweiten Werte-Durchlauf startet der Nutzer
    // selbst in der Auswertung. Ihn auf der einzigen Fläche zu verschweigen,
    // die Wege zeigt, wäre die schlechtere Überraschung — die Karte *schickt*
    // trotzdem nie von sich aus in einen neuen Durchlauf (siehe Endzustand).
    const rows = [
      row("values", "completed", { cycle: 1 }),
      row("values", "in_progress", { cycle: 2, step: 2 }),
      row("wants", "completed"),
      row("bill-of-rights", "completed"),
    ];

    assert.deepEqual(selectBild(rows), {
      slug: "values",
      state: "in_arbeit",
      step: 2,
    });
  });

  it("zählt ein Bild als gefüllt, auch wenn ein neuer Durchlauf läuft", () => {
    // `everCompletedSlugs` fragt „war jemals fertig", nicht „ist es gerade".
    // Sonst böte die Karte den fertigen Sternenhimmel als leer an.
    const rows = [
      row("values", "completed"),
      row("wants", "completed", { cycle: 1 }),
      row("wants", "not_started", { cycle: 2 }),
    ];

    assert.equal(selectBild(rows).slug, "bill-of-rights");
  });

  it("wertet eine bloß angesehene Intro nicht als laufenden Weg", () => {
    // `markRecipeIntroSeenAction` legt eine Zeile mit `not_started` an. Sie darf
    // weder „in Arbeit" noch „gefüllt" bedeuten.
    const rows = [row("wants", "not_started")];

    assert.deepEqual(selectBild(rows), {
      slug: "values",
      state: "leer",
      step: 1,
    });
  });

  it("fällt bei fehlendem Schritt auf den ersten zurück", () => {
    const rows = [row("bill-of-rights", "in_progress", { step: null })];

    assert.equal(selectBild(rows).step, 1);
  });
});

describe("nextRecommendation", () => {
  it("lädt zum Kompass ein und führt am Intro-Gate vorbei", () => {
    const card = nextRecommendation([]);

    assert.equal(card.key, "values");
    // Nicht `startPath` (/me/values/journey/hypothesis): /me/values gated die
    // Intro-Sequenz und führt danach in die Journey.
    assert.equal(card.cta?.href, "/me/values");
  });

  it("spricht in Bildern, nicht in Übungstiteln", () => {
    // KAN-35, Entscheidung 6: sonst ist die Auswahl der Karte nicht
    // nachvollziehbar.
    assert.match(nextRecommendation([]).title, /Kompass/);
    assert.match(
      nextRecommendation([row("values", "completed")]).title,
      /Sternenhimmel/,
    );
  });

  it("führt einen laufenden Weg an seiner Stelle fort", () => {
    const card = nextRecommendation([row("wants", "in_progress", { step: 2 })]);

    assert.equal(card.key, "wants");
    assert.equal(card.cta?.href, "/me/wants");
  });

  it("führt einen laufenden Werte-Durchlauf ohne erneutes Intro fort", () => {
    const card = nextRecommendation([row("values", "in_progress", { step: 2 })]);

    assert.equal(card.cta?.href, "/me/values/journey");
  });

  it("schickt im Endzustand nirgendwohin", () => {
    const rows = [
      row("values", "completed"),
      row("wants", "completed"),
      row("bill-of-rights", "completed"),
    ];

    const card = nextRecommendation(rows);

    assert.match(card.title, /Kompass/);
    assert.equal(card.cta, undefined);
  });
});
