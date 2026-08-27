import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { zoneOf } from "./zone.ts";

describe("zoneOf", () => {
  it("gibt der Schmiede und allem darunter die Schmiede-Zone", () => {
    assert.equal(zoneOf("/me/wants/schmiede"), "schmiede");
    assert.equal(zoneOf("/me/wants/schmiede/"), "schmiede");
    assert.equal(zoneOf("/me/wants/reflect/abc"), "nachthimmel");
  });

  it("laesst alles andere im Nachthimmel", () => {
    assert.equal(zoneOf("/me/wants"), "nachthimmel");
    assert.equal(zoneOf("/booster/saying-no"), "nachthimmel");
    assert.equal(zoneOf("/me/bill-of-rights/generate"), "nachthimmel");
    assert.equal(zoneOf("/"), "nachthimmel");
  });
});
