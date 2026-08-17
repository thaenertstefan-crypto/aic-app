import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  RECIPE_SLUG_BY_TEMPLATE,
  recipeSlugFor,
} from "./journal-recipe-slug.ts";

describe("recipeSlugFor", () => {
  it("kennt alle zehn template_type-Werte", () => {
    for (const template of [
      "daily_value",
      "value_eval",
      "yin_yang",
      "little_bet",
      "bill_of_rights",
      "messy_moment",
      "overthinking",
      "saying_no",
      "shadow",
      "free",
    ] as const) {
      assert.ok(
        template in RECIPE_SLUG_BY_TEMPLATE,
        `${template} fehlt in RECIPE_SLUG_BY_TEMPLATE`,
      );
    }
  });

  it("liefert null für free — die DB-Spalte trägt dort null, kein leerer String", () => {
    assert.equal(recipeSlugFor("free"), null);
  });

  it("liefert den Rezept-Slug für einen bekannten template_type", () => {
    assert.equal(recipeSlugFor("daily_value"), "values");
    assert.equal(recipeSlugFor("value_eval"), "values");
    assert.equal(recipeSlugFor("yin_yang"), "wants");
    assert.equal(recipeSlugFor("little_bet"), "wants");
    assert.equal(recipeSlugFor("bill_of_rights"), "bill-of-rights");
    assert.equal(recipeSlugFor("messy_moment"), "things-got-messy");
    assert.equal(recipeSlugFor("overthinking"), "overthinking");
    assert.equal(recipeSlugFor("saying_no"), "saying-no");
    assert.equal(recipeSlugFor("shadow"), "shadow");
  });
});
