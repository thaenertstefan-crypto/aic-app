import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readRightSuggestion } from "./right-suggestion.ts";

describe("readRightSuggestion — ein Vorschlag ohne Text ist keiner", () => {
  it("nimmt ein bestehendes Recht mit id und Text", () => {
    assert.deepEqual(
      readRightSuggestion({ type: "existing", id: "r-1", text: "Ich habe das Recht, Nein zu sagen." }),
      { type: "existing", id: "r-1", text: "Ich habe das Recht, Nein zu sagen." },
    );
  });

  it("nimmt einen neuen Vorschlag mit Text", () => {
    assert.deepEqual(
      readRightSuggestion({ type: "new", text: "Ich habe das Recht, zu zögern." }),
      { type: "new", text: "Ich habe das Recht, zu zögern." },
    );
  });

  it("verwirft leeren und weißen Text", () => {
    assert.equal(readRightSuggestion({ type: "new", text: "" }), null);
    assert.equal(readRightSuggestion({ type: "new", text: "   " }), null);
    assert.equal(readRightSuggestion({ type: "existing", id: "r-1", text: " " }), null);
  });

  it("verwirft ein bestehendes Recht ohne id — der Server schickt sie immer mit", () => {
    assert.equal(readRightSuggestion({ type: "existing", text: "Ich habe das Recht." }), null);
  });

  it("verwirft, was gar keine der beiden Formen ist", () => {
    for (const value of [null, undefined, "Ich habe das Recht.", 42, [], {}, { type: "beides" }]) {
      assert.equal(readRightSuggestion(value), null);
    }
  });

  it("trimmt den Text — er landet editierbar in einem Textfeld", () => {
    const suggestion = readRightSuggestion({ type: "new", text: "  Ich habe das Recht.  " });

    assert.deepEqual(suggestion, { type: "new", text: "Ich habe das Recht." });
  });
});
