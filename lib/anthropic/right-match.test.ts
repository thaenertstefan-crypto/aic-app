import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findRightSentence,
  type RightLike,
  rescueMatch,
  resolveMatch,
} from "./right-match.ts";

const MAX = 300;

const RIGHTS: RightLike[] = [
  { id: "r-1", text: "Ich habe das Recht, Nein zu sagen." },
  { id: "r-2", text: "Ich habe das Recht, Fehler zu machen." },
];

describe("resolveMatch — bestehendes Recht", () => {
  it("löst eine bekannte id gegen die DB-Liste auf", () => {
    const result = resolveMatch({ type: "existing", id: "r-2" }, RIGHTS, MAX);
    assert.deepEqual(result, {
      type: "existing",
      id: "r-2",
      text: "Ich habe das Recht, Fehler zu machen.",
    });
  });

  it("nimmt den Text IMMER aus der DB, nie aus der Modellantwort", () => {
    const result = resolveMatch(
      { type: "existing", id: "r-1", right: "Ein vom Modell erfundener Text" },
      RIGHTS,
      MAX,
    );
    assert.equal(result?.type, "existing");
    assert.equal(
      result && "text" in result ? result.text : null,
      "Ich habe das Recht, Nein zu sagen.",
    );
  });

  it("verwirft eine halluzinierte fremde id", () => {
    assert.equal(
      resolveMatch({ type: "existing", id: "gibt-es-nicht" }, RIGHTS, MAX),
      null,
    );
  });

  it("verwirft eine nicht-stringige id", () => {
    assert.equal(resolveMatch({ type: "existing", id: 7 }, RIGHTS, MAX), null);
  });

  it("verwirft eine bekannte id gegen eine leere Rechte-Liste", () => {
    assert.equal(resolveMatch({ type: "existing", id: "r-1" }, [], MAX), null);
  });
});

describe("resolveMatch — neuer Vorschlag", () => {
  it("nimmt den Vorschlagstext des Modells und kappt ihn", () => {
    const result = resolveMatch(
      { type: "new", right: "  Ich habe das Recht, müde zu sein.  " },
      RIGHTS,
      MAX,
    );
    assert.deepEqual(result, {
      type: "new",
      text: "Ich habe das Recht, müde zu sein.",
    });
    const capped = resolveMatch({ type: "new", right: "x".repeat(500) }, RIGHTS, 10);
    assert.equal(capped && "text" in capped ? capped.text.length : null, 10);
  });

  it("verwirft einen leeren oder fehlenden Vorschlag", () => {
    assert.equal(resolveMatch({ type: "new", right: "   " }, RIGHTS, MAX), null);
    assert.equal(resolveMatch({ type: "new" }, RIGHTS, MAX), null);
  });
});

describe("resolveMatch — kein match", () => {
  it("verträgt null, undefined und Nicht-Objekte", () => {
    assert.equal(resolveMatch(null, RIGHTS, MAX), null);
    assert.equal(resolveMatch(undefined, RIGHTS, MAX), null);
    assert.equal(resolveMatch("existing", RIGHTS, MAX), null);
  });

  it("verwirft einen unbekannten type", () => {
    assert.equal(resolveMatch({ type: "none" }, RIGHTS, MAX), null);
  });
});

describe("rescueMatch — aus kaputtem JSON", () => {
  it("schneidet ein bestehendes Recht über id heraus", () => {
    const text =
      '{"analysis": "Du sagst "muss" oft", "match": {"type": "existing", "id": "r-1"}}';
    assert.deepEqual(rescueMatch(text, RIGHTS, MAX), {
      type: "existing",
      id: "r-1",
      text: "Ich habe das Recht, Nein zu sagen.",
    });
  });

  it("verwirft eine halluzinierte fremde id auch hier", () => {
    const text = '{"match": {"type": "existing", "id": "frei-erfunden"}}';
    assert.equal(rescueMatch(text, RIGHTS, MAX), null);
  });

  it("schneidet einen neuen Vorschlag heraus und löst Escapes auf", () => {
    const text =
      '{"analysis": "kaputt "hier"", "match": {"type": "new", "right": "Ich habe das Recht, \\"Nein\\" zu sagen."}}';
    assert.deepEqual(rescueMatch(text, RIGHTS, MAX), {
      type: "new",
      text: 'Ich habe das Recht, "Nein" zu sagen.',
    });
  });

  it("gibt null, wenn gar kein match im Text steht", () => {
    assert.equal(rescueMatch('{"analysis": "nur Text"', RIGHTS, MAX), null);
  });

  it("gibt null, wenn der Vorschlag mitten im Satz abgeschnitten ist", () => {
    const text = '{"match": {"type": "new", "right": "Ich habe das Recht, mü';
    assert.equal(rescueMatch(text, RIGHTS, MAX), null);
  });
});

describe("findRightSentence", () => {
  it("findet den Rechts-Satz in einer Prosa-Antwort", () => {
    const text =
      "Das klingt anstrengend. Ich habe das Recht, meine Grenzen zu nennen. Probier das mal.";
    assert.equal(
      findRightSentence(text, MAX),
      "Ich habe das Recht, meine Grenzen zu nennen.",
    );
  });

  it("kappt einen überlangen Satz", () => {
    const text = "Ich habe das Recht, " + "x".repeat(500) + ".";
    assert.equal(findRightSentence(text, 25)?.length, 25);
  });

  it("gibt null, wenn kein solcher Satz vorkommt", () => {
    assert.equal(findRightSentence("Das klingt anstrengend.", MAX), null);
  });
});
