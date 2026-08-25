import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MOMENT_MAX,
  deletedStarIds,
  groupMomentsByStar,
  isMomentOrigin,
  momentTextError,
  momentsForDrafts,
  parseBornMoments,
  MAX_BORN_MOMENTS,
  toStarMoment,
  type StarMoment,
} from "./moments.ts";
import { ANSWER_MAX, type DraftWant } from "./state.ts";
import { MAX_QUOTES_PER_WANT } from "../../anthropic/wants-distiller-result.ts";
import { MAX_WANTS } from "./items.ts";

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

describe("momentsForDrafts — ein naher Stern wird mit seinen Momenten geboren", () => {
  const draft = (over: Partial<DraftWant> = {}): DraftWant => ({
    id: "stern-1",
    text: "Ich will mehr draußen sein.",
    title: null,
    example: null,
    distance: "nah",
    valueId: null,
    valueLabel: null,
    reason: null,
    quotes: [],
    question: null,
    source: "ai",
    ...over,
  });

  /** Zählbare id-Quelle — dasselbe Muster wie im Test von `farDrafts`. */
  const ids = () => {
    let n = 0;
    return () => `m${++n}`;
  };

  it("macht aus jedem Beleg einen Moment, im Wortlaut", () => {
    // Der Kern des Tickets: der Text eines Moments steht wortwörtlich so in
    // einem der Antwortfelder, die vorher getippt wurden. `quotes` ist bereits
    // der aufgelöste Wortlaut (KAN-45) — hier wird nichts mehr umformuliert.
    const out = momentsForDrafts(
      [draft({ quotes: ["Samstags im Wald.", "Mit dem Rad zur Arbeit."] })],
      ids(),
    );

    assert.deepEqual(out, [
      { id: "m1", starId: "stern-1", text: "Samstags im Wald.", origin: "audit" },
      {
        id: "m2",
        starId: "stern-1",
        text: "Mit dem Rad zur Arbeit.",
        origin: "audit",
      },
    ]);
  });

  it("gibt einem fernen Stern nichts", () => {
    // Kein Mangel, sondern die Weite von der anderen Seite: einen fernen Stern
    // hast du noch nicht gelebt, es gibt nichts zu belegen (ADR-0005).
    // `quotes` ist bei ihm ohnehin leer — die Marke ist der zweite Riegel.
    assert.deepEqual(
      momentsForDrafts(
        [draft({ distance: "fern", quotes: ["Ein Jahr am Meer."], example: "Segeln" })],
        ids(),
      ),
      [],
    );
  });

  it("fällt auf das Beispiel zurück, wenn es keine Belege gibt", () => {
    // Die Rückfallebene aus Punkt 2: schlechter als der eigene Wortlaut, aber
    // nie leer. Der leere `quotes`-Fall ist in `parseQuotes` ausdrücklich
    // gültig — es gibt ihn also wirklich.
    assert.deepEqual(momentsForDrafts([draft({ example: "einen Marathon" })], ids()), [
      { id: "m1", starId: "stern-1", text: "einen Marathon", origin: "audit" },
    ]);
  });

  it("nimmt das Beispiel nur als Rückfall, nicht zusätzlich", () => {
    const out = momentsForDrafts(
      [draft({ quotes: ["Samstags im Wald."], example: "einen Marathon" })],
      ids(),
    );
    assert.deepEqual(out.map((m) => m.text), ["Samstags im Wald."]);
  });

  it("lässt einen Stern lieber leer als mit Unsinn stehen", () => {
    // Weder Beleg noch Beispiel: dann entsteht kein Moment. Der Stern steht
    // trotzdem — das ist der Fall, den der Nutzer selbst füllt.
    assert.deepEqual(momentsForDrafts([draft()], ids()), []);
  });

  it("wirft weg, was als Moment nicht durchginge", () => {
    // Derselbe Deckel wie in `momentTextError`, und zwar hier statt erst an der
    // Spalte: ein einziger Ausreißer darf nicht das Anlegen des Sterns
    // abweisen, an dem er hängt. Leerraum ist kein Beleg.
    const out = momentsForDrafts(
      [draft({ quotes: ["   ", "x".repeat(MOMENT_MAX + 1), "Samstags im Wald."] })],
      ids(),
    );
    assert.deepEqual(out.map((m) => m.text), ["Samstags im Wald."]);
  });

  it("fällt auf das Beispiel zurück, wenn kein Beleg durchgeht", () => {
    assert.deepEqual(
      momentsForDrafts(
        [draft({ quotes: ["   "], example: "einen Marathon" })],
        ids(),
      ).map((m) => m.text),
      ["einen Marathon"],
    );
  });

  it("beschneidet den Wortlaut nicht, sondern trimmt nur die Ränder", () => {
    assert.deepEqual(
      momentsForDrafts([draft({ quotes: ["  Samstags im Wald.  "] })], ids())[0]?.text,
      "Samstags im Wald.",
    );
  });

  it("hängt jeden Moment an seinen eigenen Stern", () => {
    const out = momentsForDrafts(
      [
        draft({ id: "a", quotes: ["Erstens."] }),
        draft({ id: "b", quotes: ["Zweitens."] }),
      ],
      ids(),
    );
    assert.deepEqual(
      out.map((m) => [m.starId, m.text]),
      [
        ["a", "Erstens."],
        ["b", "Zweitens."],
      ],
    );
  });

  it("gibt jedem Moment eine eigene id", () => {
    const out = momentsForDrafts(
      [draft({ quotes: ["Erstens.", "Zweitens.", "Drittens."] })],
      ids(),
    );
    assert.equal(new Set(out.map((m) => m.id)).size, 3);
  });
});

describe("parseBornMoments — die Zugabe darf die Nutzlast nicht abweisen", () => {
  const stars = new Set(["stern-1", "stern-2"]);
  const born = (over: Record<string, unknown> = {}) => ({
    id: "m1",
    starId: "stern-1",
    text: "Samstags im Wald.",
    origin: "audit",
    ...over,
  });

  it("lässt durch, was ein Moment ist", () => {
    assert.deepEqual(parseBornMoments(JSON.stringify([born()]), stars), [
      { id: "m1", starId: "stern-1", text: "Samstags im Wald.", origin: "audit" },
    ]);
  });

  it("setzt die Herkunft, statt sie zu glauben", () => {
    // Eine Server-Action ist eine offene HTTP-Fläche: „own" hieße „selbst
    // eingetragen", und das ist keine Zeile, die aus einer Sternensuche fällt.
    assert.equal(
      parseBornMoments(JSON.stringify([born({ origin: "own" })]), stars)[0]?.origin,
      "audit",
    );
  });

  it("wirft den einen Ausreißer weg, nicht die ganze Liste", () => {
    // Der Unterschied zu `parseItems`, das hier `null` gäbe und damit das
    // Speichern der Sterne abwiese.
    const out = parseBornMoments(
      JSON.stringify([born({ id: "m1", text: "  " }), born({ id: "m2" })]),
      stars,
    );
    assert.deepEqual(out.map((m) => m.id), ["m2"]);
  });

  it("erzeugt keine Waise ab der ersten Zeile", () => {
    assert.deepEqual(
      parseBornMoments(JSON.stringify([born({ starId: "weg" })]), stars),
      [],
    );
  });

  it("nimmt dieselbe id nur einmal", () => {
    // Zweimal dieselbe id in einer Anweisung weist Postgres ab — und mit ihr
    // alle Momente, die sonst durchgegangen wären.
    const out = parseBornMoments(
      JSON.stringify([born(), born({ text: "Anders." })]),
      stars,
    );
    assert.equal(out.length, 1);
  });

  it("nimmt nichts, was gar keine Liste ist", () => {
    for (const raw of ["", "kein json", "{}", '"text"', null]) {
      assert.deepEqual(parseBornMoments(raw, stars), []);
    }
  });

  it("verschluckt sich nicht an einer entgleisten Nutzlast", () => {
    const huge = Array.from({ length: MAX_BORN_MOMENTS + 50 }, (_, i) =>
      born({ id: `m${i}` }),
    );
    assert.equal(parseBornMoments(JSON.stringify(huge), stars).length, MAX_BORN_MOMENTS);
  });
});

describe("MAX_BORN_MOMENTS — die Zahl steht zweimal", () => {
  it("ist genau so viel, wie ein ehrlicher Client schicken kann", () => {
    // Die Rechnung, die im Kommentar der Konstante steht — hier ausgeführt.
    // Der Test darf importieren, was das Modul selbst nicht darf: er läuft
    // unter `node --test`, nicht im Bundle.
    assert.equal(MAX_BORN_MOMENTS, MAX_QUOTES_PER_WANT * MAX_WANTS);
  });
});
