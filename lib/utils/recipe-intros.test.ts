import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RECIPE_INTROS, getRecipeIntro } from "./recipe-intros.ts";

/* ------------------------------------------------------------------ */
/*  Die Tabelle trägt das Gate                                        */
/* ------------------------------------------------------------------ */

describe("RECIPE_INTROS — jede Übung hat wirklich Karten", () => {
  // Das Intro-Gate (components/recipes/recipe-intro-gate.tsx) fragt nicht mehr
  // `INTRO_CARDS.length > 0`, bevor es die Sequenz zeigt — es verlässt sich
  // darauf, dass zu jedem Slug der Tabelle auch Karten gehören. Ein leerer
  // Eintrag wäre sonst eine leere Bühne, die die Übung verdeckt.
  it("liefert zu jedem Slug mindestens eine Karte", () => {
    for (const [slug, cards] of Object.entries(RECIPE_INTROS)) {
      assert.ok(Array.isArray(cards), slug);
      assert.ok(cards.length > 0, slug);
    }
  });

  it("gibt jeder Karte einen nicht-leeren Titel und Text", () => {
    for (const [slug, cards] of Object.entries(RECIPE_INTROS)) {
      cards.forEach((card, index) => {
        assert.equal(typeof card.title, "string", `${slug}[${index}].title`);
        assert.ok(card.title.trim().length > 0, `${slug}[${index}].title`);
        assert.equal(typeof card.body, "string", `${slug}[${index}].body`);
        assert.ok(card.body.trim().length > 0, `${slug}[${index}].body`);
      });
    }
  });
});

describe("getRecipeIntro — der Weg für unbekannte Slugs", () => {
  it("findet eine hinterlegte Intro", () => {
    assert.equal(getRecipeIntro("shadow"), RECIPE_INTROS.shadow);
  });

  it("gibt null statt undefined, wenn der Slug keine Intro hat", () => {
    assert.equal(getRecipeIntro("gibt-es-nicht"), null);
  });

  it("greift nicht in den Prototyp", () => {
    assert.equal(getRecipeIntro("toString"), null);
    assert.equal(getRecipeIntro("constructor"), null);
  });
});
