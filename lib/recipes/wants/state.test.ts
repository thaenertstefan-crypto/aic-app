import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  advanceWants,
  initialWants,
  joinAnswers,
  keptWants,
  type DraftWant,
  type WantsState,
} from "./state.ts";

function star(id: string, patch: Partial<DraftWant> = {}): DraftWant {
  return {
    id,
    text: `Stern ${id}`,
    title: null,
    distance: "nah",
    valueId: null,
    valueLabel: null,
    reason: null,
    question: null,
    source: "ai",
    ...patch,
  };
}

/** Ein Zustand nach einem KI-Destillat: jedes Feld des Destillats ist gefüllt. */
function afterDistillate(): WantsState {
  return {
    ...initialWants(true),
    phase: "sterne",
    yin: ["Nächte vor der Abgabe"],
    yang: ["Wenn ich tüftle"],
    tagtraum: ["Ironman"],
    principles: "Erschaffen",
    principlesOpen: true,
    saving: true,
    error: "Speichern fehlgeschlagen.",
    entryId: "entry-1",
    comment: "Das lese ich heraus.",
    aiError: "Das Destillieren hat gerade nicht geklappt.",
    manualMode: true,
    wants: [star("a", { question: "Woran merkst du das?" })],
    newWantText: "Halb getippt",
    savingWants: true,
    wantsError: "Speichern fehlgeschlagen.",
    openIds: ["a"],
    refineAnswers: { a: "Meine Antwort" },
    refiningId: "a",
    refineErrors: { a: "Nachschärfen fehlgeschlagen." },
  };
}

/** Was ein neues Destillat überlebt — die Sternensuche, aus der es stammt. */
const SURVIVES_DISTILLATE = [
  "phase",
  "yin",
  "yang",
  "tagtraum",
  "principles",
  "principlesOpen",
  "saving",
  "error",
  "entryId",
];

describe("distillateRequested — der zweite Anlauf erbt nichts vom ersten", () => {
  it("räumt das ganze vorige Destillat weg, samt Sternen und Nachschärf-Ständen", () => {
    const dirty = afterDistillate();
    const fresh = initialWants(true);

    const next = advanceWants(dirty, { type: "distillateRequested" });

    for (const key of Object.keys(fresh) as (keyof WantsState)[]) {
      if (SURVIVES_DISTILLATE.includes(key)) continue;
      // Wer dem Zustand ein Feld hinzufügt, muss es in afterDistillate() setzen —
      // sonst überlebt es den zweiten Anlauf unbemerkt.
      assert.notDeepEqual(
        dirty[key],
        fresh[key],
        `Testdaten unvollständig: ${key} ist im Ausgangszustand nicht verschmutzt`,
      );
      assert.deepEqual(next[key], fresh[key], `${key} überlebt den zweiten Anlauf`);
    }
  });

  it("lässt die Antworten und den Eintrag stehen — sie sind die Quelle", () => {
    const next = advanceWants(afterDistillate(), { type: "distillateRequested" });

    assert.deepEqual(next.yin, ["Nächte vor der Abgabe"]);
    assert.equal(next.entryId, "entry-1");
    assert.equal(next.phase, "analyzing");
  });
});

describe("distillateReceived — Übernehmen ist eine Stelle", () => {
  it("legt Kommentar und Sterne in einem Zug ab", () => {
    const state = advanceWants(
      { ...initialWants(true), aiError: "Alter Fehler" },
      {
        type: "distillateReceived",
        phase: "sterne",
        distillate: { comment: "Das lese ich heraus.", wants: [star("a"), star("b")] },
      },
    );

    assert.equal(state.comment, "Das lese ich heraus.");
    assert.equal(state.wants.length, 2);
    assert.equal(state.aiError, null);
    assert.equal(state.phase, "sterne");
  });

  it("schaltet in den manuellen Modus, wenn die KI keinen Stern findet", () => {
    // Ohne Vorschläge stünde die Bühne sonst leer da — die Übung bleibt
    // auch ohne KI vollständig.
    const state = advanceWants(initialWants(true), {
      type: "distillateReceived",
      phase: "sterne",
      distillate: { comment: "", wants: [] },
    });

    assert.equal(state.manualMode, true);
  });
});

describe("refineSucceeded — Nachschärfen ist ein Übergang, nicht drei", () => {
  it("ersetzt den Text, schließt die Rückfrage und räumt die Antwort weg", () => {
    const before: WantsState = {
      ...initialWants(true),
      wants: [star("a", { question: "Woran merkst du das?" }), star("b")],
      refineAnswers: { a: "Weil ich abends noch weitermache." },
      refiningId: "a",
    };

    const state = advanceWants(before, {
      type: "refineSucceeded",
      id: "a",
      text: "Ich will zwei Abende pro Woche für eigene Projekte.",
    });

    assert.equal(state.wants[0].text, "Ich will zwei Abende pro Woche für eigene Projekte.");
    assert.equal(state.wants[0].question, null);
    assert.equal(state.refineAnswers.a, undefined);
    assert.equal(state.refiningId, null);
  });

  it("lässt die anderen Sterne unberührt", () => {
    const before: WantsState = {
      ...initialWants(true),
      wants: [star("a", { question: "Frage?" }), star("b", { question: "Auch eine Frage?" })],
    };

    const state = advanceWants(before, { type: "refineSucceeded", id: "a", text: "Neu" });

    assert.deepEqual(state.wants[1], before.wants[1]);
  });

  it("hält den Fehler beim Stern fest, zu dem er gehört", () => {
    let state = advanceWants(
      { ...initialWants(true), wants: [star("a"), star("b")] },
      { type: "refineRequested", id: "a" },
    );
    assert.equal(state.refiningId, "a");

    state = advanceWants(state, {
      type: "refineFailed",
      id: "a",
      message: "Nachschärfen fehlgeschlagen.",
    });

    assert.equal(state.refiningId, null);
    assert.equal(state.refineErrors.a, "Nachschärfen fehlgeschlagen.");
    assert.equal(state.refineErrors.b, undefined);
  });
});

describe("Eigene Sterne", () => {
  it("legt einen eigenen Stern aufgeklappt an und leert das Eingabefeld", () => {
    let state = advanceWants(initialWants(true), {
      type: "newWantEdited",
      text: "Ich will mehr Zeit am Wasser.",
    });

    state = advanceWants(state, {
      type: "ownWantAdded",
      id: "own-1",
      text: "  Ich will mehr Zeit am Wasser.  ",
    });

    assert.equal(state.wants.length, 1);
    assert.equal(state.wants[0].text, "Ich will mehr Zeit am Wasser.");
    assert.equal(state.wants[0].source, "own");
    assert.deepEqual(state.openIds, ["own-1"]);
    assert.equal(state.newWantText, "");
  });

  it("verwirft einen Stern samt seinem Aufgeklappt-Zustand", () => {
    const before: WantsState = {
      ...initialWants(true),
      wants: [star("a"), star("b")],
      openIds: ["a", "b"],
    };

    const state = advanceWants(before, { type: "wantDiscarded", id: "a" });

    assert.deepEqual(
      state.wants.map((w) => w.id),
      ["b"],
    );
    assert.deepEqual(state.openIds, ["b"]);
  });

  it("klappt unabhängig auf und zu", () => {
    let state: WantsState = { ...initialWants(true), wants: [star("a"), star("b")] };

    state = advanceWants(state, { type: "wantToggled", id: "a" });
    state = advanceWants(state, { type: "wantToggled", id: "b" });
    assert.deepEqual(state.openIds, ["a", "b"]);

    state = advanceWants(state, { type: "wantToggled", id: "a" });
    assert.deepEqual(state.openIds, ["b"]);
  });

  it("bearbeitet Name und Text genau eines Sterns", () => {
    let state: WantsState = { ...initialWants(true), wants: [star("a"), star("b")] };

    state = advanceWants(state, { type: "wantEdited", id: "b", patch: { title: "Wasser" } });
    state = advanceWants(state, { type: "wantEdited", id: "b", patch: { text: "Neuer Text" } });

    assert.equal(state.wants[0].title, null);
    assert.equal(state.wants[1].title, "Wasser");
    assert.equal(state.wants[1].text, "Neuer Text");
  });
});

describe("Der Einstieg hängt am Kompass", () => {
  it("beginnt beim Werte-Nudge, solange keine Werte-Hypothese steht", () => {
    assert.equal(initialWants(false).phase, "nudge");
    assert.equal(initialWants(true).phase, "yin");
  });

  it("startet mit drei leeren Antwortfeldern je Frage", () => {
    const state = initialWants(true);

    assert.deepEqual(state.yin, ["", "", ""]);
    assert.deepEqual(state.yang, ["", "", ""]);
    assert.deepEqual(state.tagtraum, ["", "", ""]);
  });
});

describe("Der gesicherte Entwurf", () => {
  it("klappt den Bonus auf, wenn dort schon etwas steht", () => {
    const state = advanceWants(initialWants(true), {
      type: "draftRestored",
      yin: ["Etwas"],
      yang: [],
      tagtraum: [],
      principles: "Erschaffen",
    });

    assert.deepEqual(state.yin, ["Etwas"]);
    assert.equal(state.principlesOpen, true);
  });

  it("ersetzt leere Listen durch frische Antwortfelder", () => {
    const state = advanceWants(initialWants(true), {
      type: "draftRestored",
      yin: [],
      yang: [],
      tagtraum: [],
      principles: "",
    });

    assert.deepEqual(state.yin, ["", "", ""]);
    assert.equal(state.principlesOpen, false);
  });
});

describe("joinAnswers — was in die Action geht", () => {
  it("fügt nur die ausgefüllten Antworten zeilenweise zusammen", () => {
    assert.equal(joinAnswers(["  eins  ", "", "   ", "zwei"]), "eins\nzwei");
  });
});

describe("keptWants — ein Stern ohne Text ist keiner", () => {
  it("zählt nur die Sterne, die noch Text tragen", () => {
    const state: WantsState = {
      ...initialWants(true),
      wants: [star("a"), star("b", { text: "   " }), star("c")],
    };

    assert.deepEqual(
      keptWants(state).map((w) => w.id),
      ["a", "c"],
    );
  });
});
