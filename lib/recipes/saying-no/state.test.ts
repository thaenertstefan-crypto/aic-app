import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  advanceSayingNo,
  initialSayingNo,
  type SayingNoState,
} from "./state.ts";

/**
 * Den Beleg eines gespeicherten Eintrags stellt sonst der Server aus
 * (`lib/recipes/saved-entry.ts`, `server-only`). Der Typ wird hier aus dem
 * Zustand abgeleitet statt importiert — ein Import würde `node --test` an
 * `server-only` scheitern lassen.
 */
const savedId = (id: string) => id as NonNullable<SayingNoState["entryId"]>;

/** Ein Zustand mitten im ersten Szenario: jedes Feld des Versuchs ist benutzt. */
function afterOneScenario(): SayingNoState {
  return {
    ...initialSayingNo(),
    phase: "final",
    mode: "practice",
    seenScenarios: ["Ein Kollege fragt nach dem Wochenende."],
    situation: "Ein Kollege fragt nach dem Wochenende.",
    hellYes: true,
    scenarioSource: "ai",
    scenarioPending: true,
    rerolls: 2,
    entryId: savedId("entry-1"),
    draft: "Nee, das geht bei mir nicht.",
    revisionUsed: true,
    saving: true,
    error: "Speichern fehlgeschlagen.",
    comment: "Das klingt schon klar.",
    checklist: {
      complete_sentence: { pass: true, note: "Steht." },
      no_apology: { pass: false, note: "Da ist noch ein Sorry." },
      warmth: { pass: true, note: "Warm." },
      no_but: { pass: true, note: "Kein Aber." },
    },
    improved: "Danke, dass du fragst — diesmal passt es bei mir nicht.",
    improvedDraft: "Danke, dass du fragst — diesmal nicht.",
    right: { type: "new", text: "Ich habe das Recht, mein Wochenende zu behalten." },
    aiError: "Das Feedback hat gerade nicht geklappt.",
    finalNo: "Danke, dass du fragst — diesmal nicht.",
    copied: true,
    copyError: "Kopieren klappt hier nicht.",
  };
}

/** Was einen Szenario-Wechsel überlebt — alles andere gehört dem Versuch. */
const SURVIVES_NEXT_SCENARIO = ["mode", "seenScenarios", "phase", "scenarioPending"];

describe("nextScenario — Zurücksetzen ist eine Stelle, keine Feldliste", () => {
  it("nimmt aus dem alten Versuch nichts mit außer Modus und gesehenen Szenarien", () => {
    const dirty = afterOneScenario();
    const fresh = initialSayingNo();

    const next = advanceSayingNo(dirty, { type: "nextScenario" });

    for (const key of Object.keys(fresh) as (keyof SayingNoState)[]) {
      if (SURVIVES_NEXT_SCENARIO.includes(key)) continue;
      // Erst die Testdaten prüfen: ein Feld, das hier gar nicht verschmutzt
      // ist, könnte den Wechsel unbemerkt überleben. Wer dem Zustand ein Feld
      // hinzufügt, muss es in afterOneScenario() setzen — sonst schlägt das an.
      assert.notDeepEqual(
        dirty[key],
        fresh[key],
        `Testdaten unvollständig: ${key} ist im Ausgangszustand nicht verschmutzt`,
      );
      assert.deepEqual(next[key], fresh[key], `${key} leckt ins nächste Szenario`);
    }
  });

  it("behält Modus und gesehene Szenarien — daran hängt der Übungsmodus", () => {
    const next = advanceSayingNo(afterOneScenario(), { type: "nextScenario" });

    assert.equal(next.mode, "practice");
    assert.deepEqual(next.seenScenarios, ["Ein Kollege fragt nach dem Wochenende."]);
  });

  it("landet direkt im Szenario-Laden, ohne Zwischenbühne", () => {
    // Sonst blitzt die Modus-Wahl auf, bevor das nächste Szenario da ist.
    const next = advanceSayingNo(afterOneScenario(), { type: "nextScenario" });

    assert.equal(next.phase, "scenario");
    assert.equal(next.scenarioPending, true);
  });
});

describe("feedbackReceived — Übernehmen ist eine Stelle", () => {
  const feedback = {
    comment: "Klar und warm.",
    checklist: null,
    improved: "Danke dir — diesmal passt es nicht.",
    right: { type: "new" as const, text: "Ich habe das Recht, abzulehnen." },
  };

  it("legt das Ergebnis in einem Zug ab und macht die Meldung frei", () => {
    const state = advanceSayingNo(
      { ...initialSayingNo(), aiError: "Alter Fehler" },
      { type: "feedbackReceived", phase: "feedback", feedback },
    );

    assert.equal(state.comment, "Klar und warm.");
    assert.equal(state.improved, "Danke dir — diesmal passt es nicht.");
    assert.deepEqual(state.right, feedback.right);
    assert.equal(state.aiError, null);
    assert.equal(state.phase, "feedback");
  });

  it("legt die KI-Version editierbar daneben, ohne das Original zu verlieren", () => {
    // Aus dem Vergleich der beiden entscheidet sich später „ai" oder „edited".
    const state = advanceSayingNo(initialSayingNo(), {
      type: "feedbackReceived",
      phase: "feedback",
      feedback,
    });

    assert.equal(state.improvedDraft, state.improved);
  });

  it("macht aus einer fehlenden KI-Version ein leeres Feld, nicht „null“", () => {
    const state = advanceSayingNo(initialSayingNo(), {
      type: "feedbackReceived",
      phase: "feedback",
      feedback: { ...feedback, improved: null },
    });

    assert.equal(state.improved, null);
    assert.equal(state.improvedDraft, "");
  });
});

describe("feedbackRequested — der zweite Anlauf erbt nichts vom ersten", () => {
  it("räumt das ganze vorige Feedback weg, nicht nur Kommentar und Checkliste", () => {
    const state = advanceSayingNo(afterOneScenario(), { type: "feedbackRequested" });

    assert.equal(state.comment, "");
    assert.equal(state.checklist, null);
    assert.equal(state.improved, null);
    assert.equal(state.improvedDraft, "");
    assert.equal(state.right, null);
    assert.equal(state.aiError, null);
    assert.equal(state.phase, "analyzing");
  });

  it("lässt Entwurf und Eintrag stehen — der Anlauf gilt demselben Nein", () => {
    const state = advanceSayingNo(afterOneScenario(), { type: "feedbackRequested" });

    assert.equal(state.draft, "Nee, das geht bei mir nicht.");
    assert.equal(state.entryId, "entry-1");
  });
});

describe("feedbackFailed — ein KI-Ausfall blockiert die Übung nicht", () => {
  it("landet in der Bühne, die der KI-Schritt zurückgibt", () => {
    const state = advanceSayingNo(initialSayingNo(), {
      type: "feedbackFailed",
      phase: "feedback",
      message: "Das Feedback hat gerade nicht geklappt.",
    });

    assert.equal(state.phase, "feedback");
    assert.equal(state.aiError, "Das Feedback hat gerade nicht geklappt.");
  });
});

describe("Szenarien — was die Übung schon gezeigt hat", () => {
  it("merkt sich jedes geladene Szenario", () => {
    let state = advanceSayingNo(initialSayingNo(), { type: "modeChosen", mode: "practice" });
    state = advanceSayingNo(state, { type: "scenarioLoaded", text: "Erstes", source: "ai" });
    state = advanceSayingNo(state, { type: "rerolled" });
    state = advanceSayingNo(state, { type: "scenarioLoaded", text: "Zweites", source: "static" });

    assert.deepEqual(state.seenScenarios, ["Erstes", "Zweites"]);
    assert.equal(state.situation, "Zweites");
    assert.equal(state.scenarioSource, "static");
    assert.equal(state.scenarioPending, false);
  });

  it("führt jeden Weg ins Szenario-Laden über dieselbe Anfrage", () => {
    // Modus-Wahl, „Anderes Szenario" und „Nächstes Szenario" — die Bühne darf
    // an keinem der drei Wege an einer nachgereichten Anfrage hängen.
    const entered = [
      advanceSayingNo(initialSayingNo(), { type: "modeChosen", mode: "practice" }),
      advanceSayingNo(afterOneScenario(), { type: "rerolled" }),
      advanceSayingNo(afterOneScenario(), { type: "nextScenario" }),
    ];

    for (const state of entered) {
      assert.equal(state.phase, "scenario");
      assert.equal(state.scenarioPending, true);
    }
  });

  it("zählt nur die Reroll-Taps, nicht das erste Laden", () => {
    const state = advanceSayingNo(initialSayingNo(), {
      type: "modeChosen",
      mode: "practice",
    });
    assert.equal(state.rerolls, 0);

    assert.equal(advanceSayingNo(state, { type: "rerolled" }).rerolls, 1);
  });

  it("setzt die Reroll-Zählung mit jedem neuen Szenario zurück", () => {
    const next = advanceSayingNo(afterOneScenario(), { type: "nextScenario" });

    assert.equal(next.rerolls, 0);
  });
});

describe("Der echte Modus — Hell-yes-Check", () => {
  it("beginnt bei der Situation, ohne Übungs-Szenario", () => {
    const state = advanceSayingNo(initialSayingNo(), { type: "modeChosen", mode: "real" });

    assert.equal(state.phase, "situation");
    assert.equal(state.mode, "real");
    assert.equal(state.situation, "");
  });

  it("fragt jedes Mal frisch nach, auch wenn schon einmal „ja“ stand", () => {
    let state = advanceSayingNo(initialSayingNo(), { type: "modeChosen", mode: "real" });
    state = advanceSayingNo(state, { type: "situationEdited", text: "Schicht am Samstag" });
    state = advanceSayingNo(state, { type: "situationDone" });
    state = advanceSayingNo(state, { type: "hellYesConfirmed" });
    assert.equal(state.hellYes, true);

    state = advanceSayingNo(state, { type: "situationDone" });

    assert.equal(state.hellYes, false);
    assert.equal(state.phase, "hellyes");
  });
});

describe("draftRestored — der gesicherte Entwurf", () => {
  it("springt zum Schreiben, wenn Modus und Situation mitkommen", () => {
    const state = advanceSayingNo(initialSayingNo(), {
      type: "draftRestored",
      mode: "real",
      situation: "Schicht am Samstag",
      draft: "Diesmal nicht.",
    });

    assert.equal(state.phase, "draft");
    assert.equal(state.mode, "real");
    assert.equal(state.draft, "Diesmal nicht.");
  });

  it("bleibt bei der Modus-Wahl, wenn die Situation fehlt", () => {
    // Die Entwurf-Bühne zeigt die Situation als Kontext — ohne sie stünde dort
    // eine leere Karte.
    const state = advanceSayingNo(initialSayingNo(), {
      type: "draftRestored",
      mode: "real",
      situation: "",
      draft: "Diesmal nicht.",
    });

    assert.equal(state.phase, "mode");
  });
});

describe("Speichern und Umformulieren", () => {
  it("merkt sich den Eintrag und beendet den Ladezustand", () => {
    const saving = advanceSayingNo(initialSayingNo(), { type: "saving" });
    assert.equal(saving.saving, true);
    assert.equal(saving.error, null);

    const saved = advanceSayingNo(saving, {
      type: "saved",
      entryId: savedId("entry-9"),
    });

    assert.equal(saved.entryId, "entry-9");
    assert.equal(saved.saving, false);
  });

  it("hält den Entwurf fest, wenn das Speichern scheitert", () => {
    let state = advanceSayingNo(initialSayingNo(), { type: "draftEdited", text: "Mein Nein" });
    state = advanceSayingNo(state, { type: "saving" });
    state = advanceSayingNo(state, { type: "savingFailed", message: "Du bist offline." });

    assert.equal(state.saving, false);
    assert.equal(state.error, "Du bist offline.");
    assert.equal(state.draft, "Mein Nein");
  });

  it("merkt sich die eine erlaubte Revision und räumt die Fehlermeldung weg", () => {
    const state = advanceSayingNo(
      { ...initialSayingNo(), error: "Alte Meldung" },
      { type: "revisionStarted" },
    );

    assert.equal(state.revisionUsed, true);
    assert.equal(state.error, null);
    assert.equal(state.phase, "draft");
  });
});

describe("finished — das finale Nein", () => {
  it("übernimmt den getrimmten Text und beginnt den Kopier-Zustand von vorn", () => {
    const state = advanceSayingNo(
      { ...afterOneScenario(), phase: "feedback" },
      { type: "finished", text: "  Diesmal nicht.  " },
    );

    assert.equal(state.finalNo, "Diesmal nicht.");
    assert.equal(state.phase, "final");
    assert.equal(state.copied, false);
    assert.equal(state.copyError, null);
  });

  it("geht bei leerem Text nirgendwohin — ein leeres Nein ist keins", () => {
    const before = { ...initialSayingNo(), phase: "feedback" as const };

    assert.deepEqual(advanceSayingNo(before, { type: "finished", text: "   " }), before);
  });
});
