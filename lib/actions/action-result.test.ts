import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  type ActionResult,
  dbFailed,
  failed,
  ok,
  SESSION_EXPIRED,
} from "./action-result.ts";

/** Fängt console.error weg, damit der Testlauf nicht zugemüllt wird. */
function captureErrorLog<T>(run: () => T): { result: T; logged: unknown[][] } {
  const original = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => void logged.push(args);
  try {
    return { result: run(), logged };
  } finally {
    console.error = original;
  }
}

/* ------------------------------------------------------------------ */
/*  Die Invariante                                                    */
/* ------------------------------------------------------------------ */

describe("ActionResult — error === null genau dann, wenn es geklappt hat", () => {
  it("ok() trägt keinen Fehler und keine Nutzlast", () => {
    assert.deepEqual(ok(), { error: null, data: null });
  });

  it("ok(data) reicht die Nutzlast unverändert durch", () => {
    const payload = { rights: ["a", "b"] };
    const result = ok(payload);
    assert.equal(result.error, null);
    // Identität, nicht Kopie — die Form soll nichts an der Nutzlast tun.
    assert.equal(result.data, payload);
  });

  it("failed() trägt die Meldung und niemals eine Nutzlast", () => {
    assert.deepEqual(failed("Kaputt."), { error: "Kaputt.", data: null });
  });

  it("jeder Scheitern-Helfer trägt eine Meldung und nie eine Nutzlast", () => {
    const failures = [
      failed("x"),
      captureErrorLog(() => dbFailed(new Error("y"))).result,
    ];
    for (const r of failures) {
      assert.equal(typeof r.error, "string");
      assert.notEqual(r.error, "");
      assert.equal(r.data, null);
    }
  });

  it("jeder Erfolgs-Helfer trägt error === null", () => {
    for (const r of [ok(), ok(42), ok(null)]) {
      assert.equal(r.error, null);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Der Wortlaut                                                      */
/* ------------------------------------------------------------------ */

describe("SESSION_EXPIRED — der entschiedene Wortlaut", () => {
  it("ist zeichengenau der beschlossene Satz", () => {
    assert.equal(
      SESSION_EXPIRED,
      "Deine Sitzung ist abgelaufen — melde dich neu an.",
    );
  });

  it("trägt keinen der vier alten Wortlaute mehr", () => {
    assert.equal(SESSION_EXPIRED.includes("Du musst angemeldet sein"), false);
  });
});

/* ------------------------------------------------------------------ */
/*  dbFailed — der rohe Fehler bleibt auf dem Server                  */
/* ------------------------------------------------------------------ */

describe("dbFailed — leakt keine Tabellen- und Constraint-Namen", () => {
  it("gibt die generische Meldung statt der rohen error.message", () => {
    const raw = 'duplicate key value violates unique constraint "rights_pkey"';
    const { result } = captureErrorLog(() =>
      dbFailed(new Error(raw), "bill_of_rights"),
    );

    assert.equal(result.data, null);
    assert.equal(result.error.includes("rights_pkey"), false);
    assert.equal(result.error.includes("constraint"), false);
    assert.equal(result.error, "Das hat gerade nicht geklappt – bitte versuch es noch einmal.");
  });

  it("loggt den echten Fehler samt Kontext serverseitig", () => {
    const boom = new Error("boom");
    const { logged } = captureErrorLog(() => dbFailed(boom, "bill_of_rights"));

    assert.equal(logged.length, 1);
    assert.equal(logged[0][0], "[db-error] bill_of_rights");
    assert.equal(logged[0][1], boom);
  });
});

/* ------------------------------------------------------------------ */
/*  Verengung — geprüft von `npx tsc --noEmit`, nicht zur Laufzeit    */
/* ------------------------------------------------------------------ */

describe("Verengung über error", () => {
  it("verengt bei === null auf beiden Seiten", () => {
    const r = ok(["a"]) as ActionResult<string[]>;

    if (r.error === null) {
      const data: string[] = r.data;
      assert.deepEqual(data, ["a"]);
    } else {
      const message: string = r.error;
      const nothing: null = r.data;
      assert.equal(typeof message, "string");
      assert.equal(nothing, null);
    }
  });

  it("verengt bei Truthiness NICHT — deshalb steht die Regel im Doc-Kommentar", () => {
    const r = ok(["a"]) as ActionResult<string[]>;

    if (!r.error) {
      // @ts-expect-error — `string` schließt "" nicht aus, also bleibt data
      // hier `string[] | null`. Wer `if (!error)` schreibt, verliert die
      // Verengung. Schlägt dieses @ts-expect-error fehl, hat sich die Form
      // geändert und der Doc-Kommentar in action-result.ts ist überholt.
      const data: string[] = r.data;
      assert.deepEqual(data, ["a"]);
    }
  });
});
