import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  advanceWarten,
  type WarteEreignis,
  flugstand,
  initialWarten,
  type WarteZustand,
} from "./warten.ts";

/** Spielt eine Folge von Ereignissen ab und gibt den Endzustand zurück. */
function spiele(...ereignisse: WarteEreignis["type"][]): WarteZustand {
  return ereignisse.reduce<WarteZustand>(
    (zustand, type) => advanceWarten(zustand, { type }),
    initialWarten,
  );
}

/** Was der Aufrufer am Ende sieht. */
function stand(...ereignisse: WarteEreignis["type"][]) {
  return flugstand(spiele(...ereignisse));
}

/* ------------------------------------------------------------------ */
/*  Die Schwelle: unter 250 ms erscheint gar nichts                    */
/* ------------------------------------------------------------------ */

describe("Schwelle", () => {
  it("zeigt im Ruhezustand nichts", () => {
    assert.equal(flugstand(initialWarten), "aus");
  });

  it("zeigt nichts, solange die Schwelle nicht erreicht ist", () => {
    assert.equal(stand("warteBegonnen"), "aus");
  });

  it("verschluckt eine Antwort unter der Schwelle vollstaendig", () => {
    // Der Fall, um den es geht: eine schnelle Antwort darf nicht aufblitzen.
    assert.equal(stand("warteBegonnen", "warteBeendet"), "aus");
    assert.deepEqual(spiele("warteBegonnen", "warteBeendet"), initialWarten);
  });

  it("steht erst, wenn die Schwelle erreicht ist", () => {
    assert.equal(stand("warteBegonnen", "schwelleErreicht"), "steht");
  });
});

/* ------------------------------------------------------------------ */
/*  Die Mindeststandzeit: einmal da, bleibt er stehen                  */
/* ------------------------------------------------------------------ */

describe("Mindeststandzeit", () => {
  it("bleibt stehen, wenn die Antwort waehrend der Standzeit kommt", () => {
    assert.equal(
      stand("warteBegonnen", "schwelleErreicht", "warteBeendet"),
      "steht",
    );
  });

  it("geht erst, wenn die Standzeit danach abgelaufen ist", () => {
    assert.equal(
      stand(
        "warteBegonnen",
        "schwelleErreicht",
        "warteBeendet",
        "standzeitAbgelaufen",
      ),
      "geht",
    );
  });

  it("geht sofort, wenn die Standzeit schon vorbei war", () => {
    assert.equal(
      stand(
        "warteBegonnen",
        "schwelleErreicht",
        "standzeitAbgelaufen",
        "warteBeendet",
      ),
      "geht",
    );
  });

  it("ist nach dem Ausblenden wieder in Ruhe", () => {
    assert.deepEqual(
      spiele(
        "warteBegonnen",
        "schwelleErreicht",
        "standzeitAbgelaufen",
        "warteBeendet",
        "ausgeblendet",
      ),
      initialWarten,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Ein zweites Warten waehrend der Flug noch steht                    */
/* ------------------------------------------------------------------ */

describe("erneutes Warten", () => {
  it("nimmt den Nachlauf zurueck, ohne die Schwelle neu zu laufen", () => {
    assert.equal(
      stand(
        "warteBegonnen",
        "schwelleErreicht",
        "warteBeendet", // Nachlauf
        "warteBegonnen",
      ),
      "steht",
    );
  });

  it("holt den ausblendenden Flug ohne Schwelle zurueck", () => {
    // Er ist noch auf dem Schirm — ihn erst auszublenden und dann 250 ms
    // spaeter neu einzublenden waere genau das Flackern, das die Schwelle
    // verhindern soll.
    assert.equal(
      stand(
        "warteBegonnen",
        "schwelleErreicht",
        "standzeitAbgelaufen",
        "warteBeendet", // geht
        "warteBegonnen",
      ),
      "steht",
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Kein Uebergang ohne Anlass                                         */
/* ------------------------------------------------------------------ */

describe("Ereignisse ohne Wirkung", () => {
  it("gibt denselben Zustand zurueck, wenn nichts passiert", () => {
    // Referenzgleichheit, damit useReducer nicht neu rendert.
    const ruhe = initialWarten;
    assert.equal(advanceWarten(ruhe, { type: "schwelleErreicht" }), ruhe);
    assert.equal(advanceWarten(ruhe, { type: "warteBeendet" }), ruhe);
    assert.equal(advanceWarten(ruhe, { type: "ausgeblendet" }), ruhe);

    const steht = spiele("warteBegonnen", "schwelleErreicht");
    assert.equal(advanceWarten(steht, { type: "warteBegonnen" }), steht);
    assert.equal(advanceWarten(steht, { type: "schwelleErreicht" }), steht);
  });

  it("laesst ein zweites warteBeendet den Nachlauf nicht abkuerzen", () => {
    const nachlauf = spiele(
      "warteBegonnen",
      "schwelleErreicht",
      "warteBeendet",
    );
    assert.equal(advanceWarten(nachlauf, { type: "warteBeendet" }), nachlauf);
    assert.equal(flugstand(nachlauf), "steht");
  });
});
