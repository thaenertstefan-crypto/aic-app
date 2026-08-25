import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  advanceMomentWall,
  canSubmitMomentWall,
  editedMomentId,
  initialMomentWall,
  momentDateLabel,
  type MomentWallState,
} from "./moment-wall.ts";

/** Ein Zustand, in dem **jedes** Feld verschmutzt ist — Futter für die
 *  Überlebens-Tests der beiden schließenden Übergänge. */
const dirty: MomentWallState = {
  composer: { kind: "edit", id: "m1" },
  draft: "halb getippt",
  confirmDelete: true,
  saving: true,
  error: "Das hat nicht geklappt.",
};

describe("initialMomentWall — die Wand ist zu", () => {
  it("hat keinen offenen Composer und nichts Angefangenes", () => {
    assert.deepEqual(initialMomentWall(), {
      composer: { kind: "closed" },
      draft: "",
      confirmDelete: false,
      saving: false,
      error: null,
    });
  });
});

describe("compose — die gestrichelte Zeile klappt auf", () => {
  it("öffnet den Composer leer", () => {
    const state = advanceMomentWall(dirty, { type: "compose" });

    assert.deepEqual(state.composer, { kind: "new" });
    assert.equal(state.draft, "");
  });

  it("räumt den Rest der vorigen Öffnung weg", () => {
    const state = advanceMomentWall(dirty, { type: "compose" });

    assert.equal(state.confirmDelete, false);
    assert.equal(state.saving, false);
    assert.equal(state.error, null);
  });
});

describe("edit — ein Moment klappt an Ort und Stelle auf", () => {
  it("nimmt den vorhandenen Text als Entwurf mit", () => {
    const state = advanceMomentWall(initialMomentWall(), {
      type: "edit",
      id: "m7",
      text: "Ich bin heute früh losgelaufen.",
    });

    assert.deepEqual(state.composer, { kind: "edit", id: "m7" });
    assert.equal(state.draft, "Ich bin heute früh losgelaufen.");
  });

  it("stellt das Löschen nicht schon beim Öffnen scharf", () => {
    // Sonst löschte der erste Tap auf „Löschen“ sofort — die zwei Stufen
    // sind der Schutz.
    const state = advanceMomentWall(dirty, {
      type: "edit",
      id: "m7",
      text: "…",
    });

    assert.equal(state.confirmDelete, false);
    assert.equal(state.error, null);
    assert.equal(state.saving, false);
  });

  it("wechselt direkt von einem Moment auf den nächsten", () => {
    // In der Wand ist jeder Moment antippbar; ein offener Composer darf den
    // Wechsel nicht blockieren, sonst muss man erst abbrechen.
    const open = advanceMomentWall(initialMomentWall(), {
      type: "edit",
      id: "m1",
      text: "erster",
    });
    const next = advanceMomentWall(open, {
      type: "edit",
      id: "m2",
      text: "zweiter",
    });

    assert.deepEqual(next.composer, { kind: "edit", id: "m2" });
    assert.equal(next.draft, "zweiter");
  });
});

describe("type — was getippt wird", () => {
  it("übernimmt den Text und lässt den Composer offen", () => {
    const open = advanceMomentWall(initialMomentWall(), { type: "compose" });
    const state = advanceMomentWall(open, { type: "type", text: "Ich habe" });

    assert.deepEqual(state.composer, { kind: "new" });
    assert.equal(state.draft, "Ich habe");
  });

  it("nimmt eine stehende Fehlermeldung zurück", () => {
    // Der Fehler gehörte zum abgeschickten Text. Wer weiterschreibt, hat ihn
    // beantwortet — er darf nicht unter dem neuen Satz stehen bleiben.
    const failed = advanceMomentWall(dirty, {
      type: "failed",
      message: "Schreib kurz auf, was du gelebt hast.",
    });
    const state = advanceMomentWall(failed, { type: "type", text: "a" });

    assert.equal(state.error, null);
  });

  it("entschärft ein scharf gestelltes Löschen", () => {
    // „Wirklich löschen?“ steht, dann tippt die Person weiter: das ist ein
    // Bearbeiten, kein Löschen. Der scharfe Knopf darf nicht stehen bleiben.
    const armed = advanceMomentWall(
      advanceMomentWall(initialMomentWall(), {
        type: "edit",
        id: "m1",
        text: "alt",
      }),
      { type: "askDelete" },
    );
    assert.equal(armed.confirmDelete, true);

    assert.equal(
      advanceMomentWall(armed, { type: "type", text: "alt und neu" })
        .confirmDelete,
      false,
    );
  });
});

describe("askDelete — die erste Stufe", () => {
  it("stellt scharf, ohne den Composer zu schließen", () => {
    const open = advanceMomentWall(initialMomentWall(), {
      type: "edit",
      id: "m1",
      text: "alt",
    });
    const state = advanceMomentWall(open, { type: "askDelete" });

    assert.equal(state.confirmDelete, true);
    assert.deepEqual(state.composer, { kind: "edit", id: "m1" });
    assert.equal(state.draft, "alt");
  });
});

describe("submit / failed — der Weg zum Server", () => {
  it("sperrt während des Speicherns und räumt den alten Fehler weg", () => {
    const failed = advanceMomentWall(dirty, { type: "failed", message: "puff" });
    const state = advanceMomentWall(failed, { type: "submit" });

    assert.equal(state.saving, true);
    assert.equal(state.error, null);
  });

  it("hält bei einem Fehler den getippten Text fest", () => {
    // Das Wichtigste an dieser Fläche: ein misslungenes Speichern darf den
    // Beleg nicht verschlucken.
    const typed = advanceMomentWall(
      advanceMomentWall(initialMomentWall(), { type: "compose" }),
      { type: "type", text: "Ich habe es gelebt." },
    );
    const state = advanceMomentWall(
      advanceMomentWall(typed, { type: "submit" }),
      { type: "failed", message: "Das hat nicht geklappt." },
    );

    assert.equal(state.draft, "Ich habe es gelebt.");
    assert.deepEqual(state.composer, { kind: "new" });
    assert.equal(state.saving, false);
    assert.equal(state.error, "Das hat nicht geklappt.");
  });
});

describe("cancel und done — was einen Schluss überlebt: nichts", () => {
  // Die Regel aus CODING_STANDARDS.md: der geschlossene Stand ist ein
  // benannter, vollständiger Wert, keine Feldauswahl. Beide Übergänge laufen
  // über `Object.keys`, damit ein später hinzugefügtes Feld nicht still in die
  // nächste Öffnung leckt.
  for (const type of ["cancel", "done"] as const) {
    describe(type, () => {
      it("setzt jedes Feld auf den Anfangswert zurück", () => {
        assert.deepEqual(advanceMomentWall(dirty, { type }), initialMomentWall());
      });

      it("lässt kein Feld unverschmutzt durch die Prüfung", () => {
        // Die Gegenprobe: Wäre ein Feld in `dirty` schon auf dem Anfangswert,
        // sagte der Test darüber nichts aus.
        const start = initialMomentWall();
        const after = advanceMomentWall(dirty, { type });
        for (const key of Object.keys(start) as (keyof MomentWallState)[]) {
          assert.notDeepEqual(
            dirty[key],
            start[key],
            `Testdaten verschmutzen „${key}“ nicht`,
          );
          assert.deepEqual(after[key], start[key]);
        }
      });
    });
  }
});

describe("canSubmitMomentWall — wann „Festhalten“ greift", () => {
  const typed = (text: string): MomentWallState => ({
    ...initialMomentWall(),
    composer: { kind: "new" },
    draft: text,
  });

  it("greift bei einem echten Satz", () => {
    assert.equal(canSubmitMomentWall(typed("Ich bin losgelaufen.")), true);
  });

  it("greift nicht bei leerem Text", () => {
    assert.equal(canSubmitMomentWall(typed("")), false);
  });

  it("greift nicht bei reinem Leerraum", () => {
    // Der Server weist das ohnehin ab (`momentTextError`); der Knopf soll
    // gar nicht erst dorthin führen.
    assert.equal(canSubmitMomentWall(typed("   \n ")), false);
  });

  it("greift nicht, solange gespeichert wird", () => {
    assert.equal(
      canSubmitMomentWall({ ...typed("Ich bin losgelaufen."), saving: true }),
      false,
    );
  });

  it("greift nicht bei geschlossenem Composer", () => {
    assert.equal(
      canSubmitMomentWall({ ...initialMomentWall(), draft: "Rest" }),
      false,
    );
  });
});

describe("editedMomentId — welcher Moment gerade offen ist", () => {
  it("nennt die id im Bearbeiten", () => {
    assert.equal(
      editedMomentId({ ...initialMomentWall(), composer: { kind: "edit", id: "m3" } }),
      "m3",
    );
  });

  it("nennt nichts bei der Add-Zeile", () => {
    assert.equal(
      editedMomentId({ ...initialMomentWall(), composer: { kind: "new" } }),
      null,
    );
  });

  it("nennt nichts bei geschlossener Wand", () => {
    assert.equal(editedMomentId(initialMomentWall()), null);
  });
});

describe("momentDateLabel — das Datum über einem Beleg", () => {
  const now = new Date("2026-08-25T12:00:00.000Z");

  it("nennt Tag und Monat im laufenden Jahr", () => {
    assert.equal(momentDateLabel("2026-07-03T09:30:00.000Z", now), "3. Juli");
  });

  it("nennt das Jahr mit, sobald es ein anderes ist", () => {
    // Eine Belegwand wächst über Jahre. Ohne Jahr stünden „3. Juli“ von 2025
    // und von 2026 ununterscheidbar untereinander.
    assert.equal(
      momentDateLabel("2025-07-03T09:30:00.000Z", now),
      "3. Juli 2025",
    );
  });

  it("kennt jeden Monat mit deutschem Namen", () => {
    const namen = Array.from({ length: 12 }, (_, i) =>
      momentDateLabel(
        `2026-${String(i + 1).padStart(2, "0")}-15T12:00:00.000Z`,
        now,
      ),
    );

    assert.deepEqual(namen, [
      "15. Januar", "15. Februar", "15. März", "15. April",
      "15. Mai", "15. Juni", "15. Juli", "15. August",
      "15. September", "15. Oktober", "15. November", "15. Dezember",
    ]);
  });

  it("nennt nichts, was es nicht lesen kann", () => {
    // Lieber keine Zeile als „NaN. undefined“ über einem Beleg.
    assert.equal(momentDateLabel("", now), null);
    assert.equal(momentDateLabel("übermorgen", now), null);
  });
});
