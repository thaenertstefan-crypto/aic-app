import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MOMENT_MAX,
  deletedStarIds,
  groupMomentsByStar,
  isMomentOrigin,
  momentTextError,
  toStarMoment,
  type StarMoment,
} from "./moments.ts";
import { ANSWER_MAX } from "./state.ts";

const moment = (
  id: string,
  star_id: string,
  created_at = "2026-08-25T10:00:00.000Z",
): StarMoment => ({
  id,
  star_id,
  text: `Moment ${id}`,
  origin: "own",
  created_at,
});

describe("MOMENT_MAX — ein Moment fasst ein ganzes Antwortfeld", () => {
  it("ist die Zahl, die auch in der Spalte steht", () => {
    // Die 800 stehen ein zweites Mal als `check (char_length(text) <= 800)` in
    // der Migration, und über die TS/SQL-Grenze trägt kein Typ. Diese Zeile ist
    // die Grenze: wer ANSWER_MAX verschiebt, macht sie rot und muss die
    // Migration mitziehen, statt dass App-Deckel und Constraint still
    // auseinanderlaufen.
    assert.equal(MOMENT_MAX, 800);
  });

  it("ist der Deckel eines Antwortfelds, nicht der einer Überschrift", () => {
    // Ein übernommener Moment trägt den Wortlaut eines Antwortfelds. Ein
    // engerer Deckel wiese genau die Momente ab, die beim Anlegen des Sterns
    // von selbst entstehen.
    assert.equal(MOMENT_MAX, ANSWER_MAX);
  });
});

describe("momentTextError — was gar kein Moment ist", () => {
  it("lässt einen normalen Satz durch", () => {
    assert.equal(momentTextError("Ich bin heute früh losgelaufen."), null);
  });

  it("weist leeren Text ab", () => {
    assert.notEqual(momentTextError(""), null);
  });

  it("weist reinen Leerraum ab", () => {
    assert.notEqual(momentTextError("   \n  "), null);
  });

  it("lässt genau MOMENT_MAX Zeichen durch", () => {
    assert.equal(momentTextError("a".repeat(MOMENT_MAX)), null);
  });

  it("weist ein Zeichen darüber ab", () => {
    assert.notEqual(momentTextError("a".repeat(MOMENT_MAX + 1)), null);
  });
});

describe("isMomentOrigin — die interne Marke", () => {
  it("kennt die zwei erlaubten Werte", () => {
    assert.equal(isMomentOrigin("audit"), true);
    assert.equal(isMomentOrigin("own"), true);
  });

  it("weist alles andere ab — auch das, was aus der DB als string kommt", () => {
    assert.equal(isMomentOrigin("ai"), false);
    assert.equal(isMomentOrigin(""), false);
    assert.equal(isMomentOrigin(null), false);
    assert.equal(isMomentOrigin(undefined), false);
  });
});

describe("toStarMoment — aus der Zeile wird ein Moment", () => {
  const row = {
    id: "m1",
    star_id: "s1",
    text: "Ich bin heute früh losgelaufen.",
    origin: "audit",
    created_at: "2026-08-25T10:00:00.000Z",
  };

  it("übernimmt die Spalten und verengt die Marke", () => {
    assert.deepEqual(toStarMoment(row), {
      id: "m1",
      star_id: "s1",
      text: "Ich bin heute früh losgelaufen.",
      origin: "audit",
      created_at: "2026-08-25T10:00:00.000Z",
    });
  });

  it("fällt auf „own“ zurück, wenn die Marke nichts Bekanntes ist", () => {
    // Der check-Constraint lässt das nicht zu; der generierte Typ führt die
    // Spalte trotzdem als string. „own" ist die Marke ohne Sonderfall.
    assert.equal(toStarMoment({ ...row, origin: "irgendwas" }).origin, "own");
  });
});

describe("groupMomentsByStar — die einzige Abfrageform, die je vorkommt", () => {
  it("gibt für keine Momente ein leeres Verzeichnis", () => {
    assert.deepEqual(groupMomentsByStar([]), {});
  });

  it("legt jeden Moment unter seinen Stern", () => {
    const grouped = groupMomentsByStar([
      moment("m1", "s1"),
      moment("m2", "s2"),
      moment("m3", "s1"),
    ]);

    assert.deepEqual(Object.keys(grouped).sort(), ["s1", "s2"]);
    assert.deepEqual(
      grouped.s1?.map((m) => m.id),
      ["m1", "m3"],
    );
    assert.deepEqual(
      grouped.s2?.map((m) => m.id),
      ["m2"],
    );
  });

  it("behält die Reihenfolge, in der die Momente ankamen", () => {
    // Sortiert wird in der Abfrage (created_at); das Gruppieren darf sie
    // nicht umwerfen, sonst steht der jüngste Moment mal oben, mal unten.
    const grouped = groupMomentsByStar([
      moment("alt", "s1", "2026-01-01T00:00:00.000Z"),
      moment("neu", "s1", "2026-08-01T00:00:00.000Z"),
    ]);

    assert.deepEqual(
      grouped.s1?.map((m) => m.id),
      ["alt", "neu"],
    );
  });

  it("verwechselt eine Stern-ID nicht mit einem Prototyp-Schlüssel", () => {
    // star_id ist ein Client-String und geht ungeprüft durch die DB. Ein
    // naiv gebautes Objekt-Verzeichnis würde hier den Prototyp anfassen.
    const grouped = groupMomentsByStar([moment("m1", "__proto__")]);

    assert.deepEqual(
      grouped["__proto__"]?.map((m) => m.id),
      ["m1"],
    );
    assert.equal(Object.getPrototypeOf({}), Object.prototype);
  });
});

describe("deletedStarIds — die Waisen, die beim Speichern entstehen", () => {
  it("nennt die Sterne, die der Client kannte und nicht mehr mitschickt", () => {
    assert.deepEqual(deletedStarIds(["a", "b", "c"], ["a", "c"]), ["b"]);
  });

  it("nennt nichts, wenn nichts wegfällt", () => {
    assert.deepEqual(deletedStarIds(["a", "b"], ["a", "b"]), []);
  });

  it("nennt nichts ohne Baseline", () => {
    // Fehlt previousIds, ist jedes DB-Element ein paralleler Add — dieselbe
    // sichere Seite wie in mergeItems. Nichts wird gelöscht, also auch keine
    // Momente geräumt.
    assert.deepEqual(deletedStarIds([], ["a", "b"]), []);
  });

  it("hält einen neu angelegten Stern nicht für eine Löschung", () => {
    assert.deepEqual(deletedStarIds(["a"], ["a", "neu"]), []);
  });

  it("nennt jede Waise genau einmal", () => {
    assert.deepEqual(deletedStarIds(["b", "b", "a"], ["a"]), ["b"]);
  });
});
