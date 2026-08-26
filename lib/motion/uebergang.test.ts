import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { traegtEinFlug } from "./uebergang.ts";

describe("traegtEinFlug — welcher Routenwechsel gehört einem Flug", () => {
  test("der Sturz in die Schmiede fliegt", () => {
    assert.equal(traegtEinFlug("/me/wants", "/me/wants/schmiede"), true);
  });

  test("und der Aufstieg zurück fliegt genauso", () => {
    assert.equal(traegtEinFlug("/me/wants/schmiede", "/me/wants"), true);
  });

  test("der Kopfwetter-Zoom trägt den Hinweg in jede Übung", () => {
    assert.equal(traegtEinFlug("/booster", "/booster/shadow"), true);
    assert.equal(traegtEinFlug("/booster", "/booster/things-got-messy"), true);
  });

  test("der Rückweg aus einer Übung fliegt noch nicht (KAN-38)", () => {
    assert.equal(traegtEinFlug("/booster/shadow", "/booster"), false);
  });

  test("alles andere blendet ein — auch zwischen zwei Übungen", () => {
    assert.equal(traegtEinFlug("/booster/shadow", "/booster/saying-no"), false);
    assert.equal(traegtEinFlug("/dashboard", "/journal"), false);
    assert.equal(traegtEinFlug("/me", "/me/wants"), false);
    assert.equal(traegtEinFlug("/me", "/me/values"), false);
    assert.equal(traegtEinFlug("/journal", "/journal/new"), false);
  });

  test("eine Nachbarroute der Schmiede erbt ihren Flug nicht", () => {
    assert.equal(traegtEinFlug("/me/wants", "/me/wants/journey"), false);
    assert.equal(
      traegtEinFlug("/me/wants/schmiede", "/me/wants/reflect/abc"),
      false,
    );
  });

  test("der Hub selbst ist kein Flug — auch nicht auf sich", () => {
    assert.equal(traegtEinFlug("/booster", "/booster"), false);
    assert.equal(traegtEinFlug("/me/wants", "/me/wants"), false);
  });

  test("ein abschließender Schrägstrich ändert nichts", () => {
    assert.equal(traegtEinFlug("/me/wants/", "/me/wants/schmiede/"), true);
    assert.equal(traegtEinFlug("/booster/", "/booster/shadow/"), true);
  });
});
