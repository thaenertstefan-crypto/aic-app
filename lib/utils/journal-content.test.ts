import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isKnownTemplate,
  patchJournalContent,
  readJournalContent,
} from "./journal-content.ts";

/* ------------------------------------------------------------------ */
/*  Diskriminante                                                     */
/* ------------------------------------------------------------------ */

describe("readJournalContent — die Diskriminante", () => {
  it("erkennt alle zehn bekannten template_type-Werte", () => {
    for (const template of [
      "daily_value",
      "value_eval",
      "yin_yang",
      "little_bet",
      "bill_of_rights",
      "messy_moment",
      "overthinking",
      "saying_no",
      "shadow",
      "free",
    ]) {
      assert.equal(isKnownTemplate(template), true, template);
    }
  });

  it("verwirft einen unbekannten template_type und reicht ihn roh weiter", () => {
    const result = readJournalContent("gratitude", { note: "Danke." });
    assert.deepEqual(result, {
      template: "unknown",
      templateType: "gratitude",
      content: { note: "Danke." },
    });
  });

  it("verträgt einen template_type, der gar kein String ist", () => {
    for (const raw of [null, undefined, 42, {}, ["free"]]) {
      const result = readJournalContent(raw, { body: "Text" });
      assert.deepEqual(result, {
        template: "unknown",
        templateType: "",
        content: { body: "Text" },
      });
    }
  });

  it("kopiert auch einen Schlüssel __proto__, statt ihn in den Prototyp zu kippen", () => {
    // JSONB darf so einen Schlüssel tragen. Eine schlichte Zuweisung träfe den
    // Setter — die Kopie verlöre still genau das Feld, das sie kopieren soll.
    const raw = JSON.parse('{"note": "Danke.", "__proto__": {"böse": true}}');
    const result = readJournalContent("gratitude", raw);

    assert.equal(result.template, "unknown");
    assert.equal(Object.getPrototypeOf(result.content), Object.prototype);
    assert.deepEqual(Object.keys(result.content).sort(), ["__proto__", "note"]);
    assert.equal("böse" in result.content, false);
  });

  it("macht aus einem content, der kein Objekt ist, ein leeres Objekt", () => {
    for (const raw of [null, undefined, "Text", 7, ["a"]]) {
      assert.deepEqual(readJournalContent("free", raw), {
        template: "unknown",
        templateType: "free",
        content: {},
      });
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Die zehn Shapes                                                   */
/* ------------------------------------------------------------------ */

describe("readJournalContent — daily_value", () => {
  it("liest den Pflichtteil", () => {
    assert.deepEqual(readJournalContent("daily_value", { happenings: "Meeting" }), {
      template: "daily_value",
      content: { happenings: "Meeting" },
    });
  });

  it("nimmt das response-Feld der Alt-Einträge mit", () => {
    const result = readJournalContent("daily_value", {
      happenings: "Meeting",
      response: "War okay.",
    });
    assert.deepEqual(result, {
      template: "daily_value",
      content: { happenings: "Meeting", response: "War okay." },
    });
  });
});

describe("readJournalContent — value_eval", () => {
  it("liest die beiden Reflexionen", () => {
    assert.deepEqual(
      readJournalContent("value_eval", {
        positive_reflection: "Ruhig geblieben.",
        negative_reflection: "Zu spät gesagt.",
      }),
      {
        template: "value_eval",
        content: {
          positive_reflection: "Ruhig geblieben.",
          negative_reflection: "Zu spät gesagt.",
        },
      },
    );
  });

  it("nimmt die nachgetragenen KI-Felder mit", () => {
    const result = readJournalContent("value_eval", {
      positive_reflection: "a",
      negative_reflection: "b",
      ai_confirmed: ["mut", "ruhe"],
      ai_suggested: [{ id: "klarheit", reason: "Du hast dreimal nachgefragt." }],
    });
    assert.deepEqual(result, {
      template: "value_eval",
      content: {
        positive_reflection: "a",
        negative_reflection: "b",
        ai_confirmed: ["mut", "ruhe"],
        ai_suggested: [{ id: "klarheit", reason: "Du hast dreimal nachgefragt." }],
      },
    });
  });

  it("verwirft eine ai_suggested-Liste mit unvollständigem Element", () => {
    const result = readJournalContent("value_eval", {
      positive_reflection: "a",
      negative_reflection: "b",
      ai_suggested: [{ id: "klarheit" }],
    });
    assert.deepEqual(result, {
      template: "value_eval",
      content: { positive_reflection: "a", negative_reflection: "b" },
    });
  });
});

describe("readJournalContent — yin_yang", () => {
  it("liest yin, yang und die optionalen Felder", () => {
    const result = readJournalContent("yin_yang", {
      yin: "Für meine Leute.",
      yang: "Beim Schreiben.",
      principles: "Tiefe vor Breite.",
      tagtraum: "Ein eigenes Café.",
      ai_wants: [{ text: "Etwas bauen", value_id: "kreativitaet" }],
    });
    assert.deepEqual(result, {
      template: "yin_yang",
      content: {
        yin: "Für meine Leute.",
        yang: "Beim Schreiben.",
        principles: "Tiefe vor Breite.",
        tagtraum: "Ein eigenes Café.",
        ai_wants: [{ text: "Etwas bauen", value_id: "kreativitaet" }],
      },
    });
  });

  it("liest die Antwortfelder jeder Frage als Liste", () => {
    // An dieser Liste hängt „ein Antwortfeld = ein ferner Stern": aus dem
    // zusammengefügten Lesetext sind die Feldgrenzen nicht rekonstruierbar.
    const result = readJournalContent("yin_yang", {
      yin: "a\nb",
      yin_answers: ["a", "b"],
      yang: "c",
      yang_answers: ["c"],
      tagtraum: "Ein Café\nmit Garten\nEin Jahr am Meer",
      tagtraum_answers: ["Ein Café\nmit Garten", "Ein Jahr am Meer"],
    });

    assert.deepEqual(result, {
      template: "yin_yang",
      content: {
        yin: "a\nb",
        yin_answers: ["a", "b"],
        yang: "c",
        yang_answers: ["c"],
        tagtraum: "Ein Café\nmit Garten\nEin Jahr am Meer",
        tagtraum_answers: ["Ein Café\nmit Garten", "Ein Jahr am Meer"],
      },
    });
  });

  it("trägt einen Alt-Eintrag ohne Listen als Normalfall", () => {
    // Es gibt keinen Backfill — fehlende Listen sind kein Sonderfall.
    const result = readJournalContent("yin_yang", {
      yin: "a",
      yang: "b",
      tagtraum: "Ein Café",
    });

    assert.deepEqual(result, {
      template: "yin_yang",
      content: { yin: "a", yang: "b", tagtraum: "Ein Café" },
    });
  });

  it("setzt ein fehlendes value_id auf null statt die Liste zu verwerfen", () => {
    const result = readJournalContent("yin_yang", {
      yin: "a",
      yang: "b",
      ai_wants: [{ text: "Etwas bauen" }, { text: "Reisen", value_id: null }],
    });
    assert.deepEqual(result, {
      template: "yin_yang",
      content: {
        yin: "a",
        yang: "b",
        ai_wants: [
          { text: "Etwas bauen", value_id: null },
          { text: "Reisen", value_id: null },
        ],
      },
    });
  });
});

describe("readJournalContent — little_bet", () => {
  it("liest den Bet-Snapshot und die Reflexion", () => {
    const result = readJournalContent("little_bet", {
      bet_text: "Einen Töpferkurs ausprobieren",
      experience: "Anders als gedacht.",
      liked: "Die Ruhe.",
      disliked: "Der Zeitdruck.",
      vibe: "energized",
      changed_wants: "Handwerk zieht mich mehr als vermutet.",
    });
    assert.deepEqual(result, {
      template: "little_bet",
      content: {
        bet_text: "Einen Töpferkurs ausprobieren",
        experience: "Anders als gedacht.",
        liked: "Die Ruhe.",
        disliked: "Der Zeitdruck.",
        vibe: "energized",
        changed_wants: "Handwerk zieht mich mehr als vermutet.",
      },
    });
  });

  it("lässt ein vibe fallen, das nicht zu den drei Werten gehört", () => {
    const result = readJournalContent("little_bet", {
      bet_text: "a",
      experience: "b",
      vibe: "great",
    });
    assert.deepEqual(result, {
      template: "little_bet",
      content: { bet_text: "a", experience: "b" },
    });
  });
});

describe("readJournalContent — bill_of_rights", () => {
  it("liest die neuen Felder (Regel-Duell)", () => {
    const result = readJournalContent("bill_of_rights", {
      prompt1: "Ich habe wieder Ja gesagt.",
      ai_analysis: "Das klingt nach viel Rücksicht.",
      old_rule: "Ich darf niemanden enttäuschen.",
    });
    assert.deepEqual(result, {
      template: "bill_of_rights",
      content: {
        prompt1: "Ich habe wieder Ja gesagt.",
        ai_analysis: "Das klingt nach viel Rücksicht.",
        old_rule: "Ich darf niemanden enttäuschen.",
      },
    });
  });

  it("liest die Alt-Felder prompt2 und prompt3", () => {
    const result = readJournalContent("bill_of_rights", {
      prompt1: "Situation",
      prompt2: "Was mir wichtig ist",
      prompt3: "Was ich mir vornehme",
    });
    assert.deepEqual(result, {
      template: "bill_of_rights",
      content: {
        prompt1: "Situation",
        prompt2: "Was mir wichtig ist",
        prompt3: "Was ich mir vornehme",
      },
    });
  });

  it("bleibt lesbar, auch wenn kein einziges Feld gesetzt ist", () => {
    // Als einziges der zehn Templates hat bill_of_rights kein Pflichtfeld:
    // neue und alte Einträge tragen unterschiedliche Sätze von Feldern.
    assert.deepEqual(readJournalContent("bill_of_rights", {}), {
      template: "bill_of_rights",
      content: {},
    });
  });
});

describe("readJournalContent — messy_moment", () => {
  it("liest einen Alt-Eintrag mit eigener Schuld-Einordnung", () => {
    const result = readJournalContent("messy_moment", {
      messy_when: "Ich bin früher gegangen.",
      conflicting_rules: "Verlässlich sein vs. auf mich achten",
      guilt_type: "unsure",
    });
    assert.deepEqual(result, {
      template: "messy_moment",
      content: {
        messy_when: "Ich bin früher gegangen.",
        conflicting_rules: "Verlässlich sein vs. auf mich achten",
        guilt_type: "unsure",
      },
    });
  });

  it("liest einen neuen Eintrag mit den KI-Feldern", () => {
    const result = readJournalContent("messy_moment", {
      messy_when: "Ich bin früher gegangen.",
      ai_guilt_guess: "unhealthy",
      ai_rules_conflict: "Zwei Regeln standen gegeneinander.",
      guilt_feedback: "agree",
    });
    assert.deepEqual(result, {
      template: "messy_moment",
      content: {
        messy_when: "Ich bin früher gegangen.",
        ai_guilt_guess: "unhealthy",
        ai_rules_conflict: "Zwei Regeln standen gegeneinander.",
        guilt_feedback: "agree",
      },
    });
  });

  it("hält ein explizites null der KI-Felder fest", () => {
    // null heißt hier „die KI lieferte keinen validen Wert" — das ist eine
    // Aussage und darf nicht zu „Feld nicht vorhanden" verschluckt werden.
    const result = readJournalContent("messy_moment", {
      messy_when: "a",
      ai_guilt_guess: null,
      ai_rules_conflict: null,
      guilt_feedback: null,
    });
    assert.deepEqual(result, {
      template: "messy_moment",
      content: {
        messy_when: "a",
        ai_guilt_guess: null,
        ai_rules_conflict: null,
        guilt_feedback: null,
      },
    });
  });

  it("lässt ein guilt_type fallen, das keiner der drei Werte ist", () => {
    const result = readJournalContent("messy_moment", {
      messy_when: "a",
      guilt_type: "maybe",
    });
    assert.deepEqual(result, {
      template: "messy_moment",
      content: { messy_when: "a" },
    });
  });
});

describe("readJournalContent — overthinking", () => {
  const BASE = {
    problem: "Soll ich das Angebot annehmen?",
    why_levels: ["Weil es mehr Geld ist.", "Weil ich Sicherheit will."],
    what_if_wrong: "Dann finde ich etwas anderes.",
    reframed_problem: "Es geht um Sicherheit, nicht ums Geld.",
    decision: "Ich schlafe eine Nacht drüber.",
  };

  it("liest den vollständigen neuen Eintrag", () => {
    const result = readJournalContent("overthinking", {
      ...BASE,
      challenger_question: "Was wäre, wenn du dich irrst?",
    });
    assert.deepEqual(result, {
      template: "overthinking",
      content: { ...BASE, challenger_question: "Was wäre, wenn du dich irrst?" },
    });
  });

  it("liest einen Alt-Eintrag ohne KI-Frage, aber mit dem alten Vergleichsblock", () => {
    const result = readJournalContent("overthinking", {
      ...BASE,
      what_it_would_mean: "Dass ich mich nicht traue.",
      current_problem: "Die Unsicherheit.",
      new_problem: "Die Entscheidung selbst.",
    });
    assert.deepEqual(result, {
      template: "overthinking",
      content: {
        ...BASE,
        what_it_would_mean: "Dass ich mich nicht traue.",
        current_problem: "Die Unsicherheit.",
        new_problem: "Die Entscheidung selbst.",
      },
    });
  });

  it("verwirft den Eintrag, wenn why_levels ein Nicht-String enthält", () => {
    // Ganz oder gar nicht: an der Liste hängt, welche Warum-Ebene als die
    // tiefste gilt — still zu filtern würde die Antwort verschieben.
    const result = readJournalContent("overthinking", {
      ...BASE,
      why_levels: ["Weil es mehr Geld ist.", 3],
    });
    assert.equal(result.template, "unknown");
  });
});

describe("readJournalContent — saying_no", () => {
  it("liest einen echten Fall mit Blueprint-Check", () => {
    const result = readJournalContent("saying_no", {
      mode: "real",
      situation: "Kollege bittet um Samstagsschicht.",
      hell_yes: false,
      draft: "Ich kann leider nicht, tut mir echt leid, aber …",
      draft2: "Das geht bei mir nicht. Danke, dass du gefragt hast.",
      ai_checklist: {
        complete_sentence: true,
        no_apology: true,
        warmth: true,
        no_but: false,
      },
      ai_improved: "Das geht bei mir nicht.",
      final_no: "Das geht bei mir nicht. Danke, dass du gefragt hast.",
      final_source: "edited",
    });
    assert.deepEqual(result, {
      template: "saying_no",
      content: {
        mode: "real",
        situation: "Kollege bittet um Samstagsschicht.",
        hell_yes: false,
        draft: "Ich kann leider nicht, tut mir echt leid, aber …",
        draft2: "Das geht bei mir nicht. Danke, dass du gefragt hast.",
        ai_checklist: {
          complete_sentence: true,
          no_apology: true,
          warmth: true,
          no_but: false,
        },
        ai_improved: "Das geht bei mir nicht.",
        final_no: "Das geht bei mir nicht. Danke, dass du gefragt hast.",
        final_source: "edited",
      },
    });
  });

  it("liest einen Übungsfall mit Szenario-Herkunft", () => {
    const result = readJournalContent("saying_no", {
      mode: "practice",
      situation: "Eine Nachbarin bittet dich, ihr Paket anzunehmen.",
      scenario_source: "static",
      draft: "Heute nicht.",
    });
    assert.deepEqual(result, {
      template: "saying_no",
      content: {
        mode: "practice",
        situation: "Eine Nachbarin bittet dich, ihr Paket anzunehmen.",
        scenario_source: "static",
        draft: "Heute nicht.",
      },
    });
  });

  it("hält ein explizites null der KI-Felder fest", () => {
    const result = readJournalContent("saying_no", {
      mode: "real",
      situation: "a",
      draft: "b",
      ai_checklist: null,
      ai_improved: null,
    });
    assert.deepEqual(result, {
      template: "saying_no",
      content: {
        mode: "real",
        situation: "a",
        draft: "b",
        ai_checklist: null,
        ai_improved: null,
      },
    });
  });

  it("lässt eine unvollständige Checkliste ganz fallen", () => {
    // Eine halbe Checkliste ergäbe eine falsche Bilanz („2 von 3 Schichten").
    const result = readJournalContent("saying_no", {
      mode: "real",
      situation: "a",
      draft: "b",
      ai_checklist: { complete_sentence: true, no_apology: true, warmth: true },
    });
    assert.deepEqual(result, {
      template: "saying_no",
      content: { mode: "real", situation: "a", draft: "b" },
    });
  });

  it("verwirft den Eintrag, wenn mode keiner der zwei Werte ist", () => {
    const result = readJournalContent("saying_no", {
      mode: "uebung",
      situation: "a",
      draft: "b",
    });
    assert.equal(result.template, "unknown");
  });
});

describe("readJournalContent — shadow", () => {
  it("liest den Eintrag samt Privatheits-Marker", () => {
    const result = readJournalContent("shadow", {
      body: "Ich war heute richtig wütend.",
      private: true,
      mode: "walk",
    });
    assert.deepEqual(result, {
      template: "shadow",
      content: {
        body: "Ich war heute richtig wütend.",
        private: true,
        mode: "walk",
      },
    });
  });

  it("verwirft einen Eintrag ohne den Marker private: true", () => {
    // An dem Marker hängen Vorschau-Unterdrückung und KI-Ausschluss. Ohne ihn
    // ist es kein Shadow-Eintrag, egal was der template_type behauptet.
    assert.equal(
      readJournalContent("shadow", { body: "Text" }).template,
      "unknown",
    );
    assert.equal(
      readJournalContent("shadow", { body: "Text", private: false }).template,
      "unknown",
    );
  });
});

describe("readJournalContent — free", () => {
  it("liest Titel und Text", () => {
    assert.deepEqual(
      readJournalContent("free", { title: "Sonntag", body: "Nichts vor." }),
      {
        template: "free",
        content: { title: "Sonntag", body: "Nichts vor." },
      },
    );
  });

  it("kommt ohne Titel aus", () => {
    assert.deepEqual(readJournalContent("free", { body: "Nichts vor." }), {
      template: "free",
      content: { body: "Nichts vor." },
    });
  });
});

/* ------------------------------------------------------------------ */
/*  Die Regel: Pflichtfelder entscheiden, optionale degradieren       */
/* ------------------------------------------------------------------ */

/** Ein gültiger Eintrag je Template, jeweils auf die Pflichtfelder reduziert. */
const MINIMAL: Record<string, Record<string, unknown>> = {
  daily_value: { happenings: "a" },
  value_eval: { positive_reflection: "a", negative_reflection: "b" },
  yin_yang: { yin: "a", yang: "b" },
  little_bet: { bet_text: "a", experience: "b" },
  messy_moment: { messy_when: "a" },
  overthinking: {
    problem: "a",
    why_levels: ["b"],
    what_if_wrong: "c",
    reframed_problem: "d",
    decision: "e",
  },
  saying_no: { mode: "real", situation: "a", draft: "b" },
  shadow: { body: "a", private: true },
  free: { body: "a" },
};

describe("Pflichtfelder entscheiden", () => {
  for (const [template, content] of Object.entries(MINIMAL)) {
    it(`erkennt ${template} an seinen Pflichtfeldern allein`, () => {
      assert.equal(readJournalContent(template, content).template, template);
    });

    for (const key of Object.keys(content)) {
      it(`verwirft ${template} ohne ${key}`, () => {
        const broken = { ...content };
        delete broken[key];
        assert.equal(readJournalContent(template, broken).template, "unknown");
      });

      it(`verwirft ${template} mit falsch getyptem ${key}`, () => {
        assert.equal(
          readJournalContent(template, { ...content, [key]: 42 }).template,
          "unknown",
        );
      });
    }
  }
});

describe("optionale Felder degradieren", () => {
  it("lässt ein falsch getyptes optionales Feld fallen, statt den Eintrag zu verwerfen", () => {
    const result = readJournalContent("daily_value", {
      happenings: "Meeting",
      response: 42,
    });
    assert.deepEqual(result, {
      template: "daily_value",
      content: { happenings: "Meeting" },
    });
  });

  it("gibt undeklarierte Schlüssel nicht weiter", () => {
    // Der deklarierte Shape in db-json.ts ist ab hier die Wahrheit. Wer ein
    // Feld braucht, deklariert es dort — sonst fällt die Lücke beim Lesen auf.
    const result = readJournalContent("free", {
      body: "Text",
      erfundenes_feld: "wird nicht durchgereicht",
    });
    assert.deepEqual(result, {
      template: "free",
      content: { body: "Text" },
    });
  });

  it("reicht bei unknown dagegen den ganzen rohen content weiter", () => {
    const raw = { body: "Text", erfundenes_feld: "bleibt erhalten" };
    assert.deepEqual(readJournalContent("gratitude", raw), {
      template: "unknown",
      templateType: "gratitude",
      content: raw,
    });
  });
});

/* ------------------------------------------------------------------ */
/*  Die Schreibseite                                                  */
/* ------------------------------------------------------------------ */

describe("patchJournalContent — der Bestand bleibt roh", () => {
  it("legt den Patch über den bestehenden content", () => {
    const merged = patchJournalContent(
      "messy_moment",
      { messy_when: "Beim Absagen", ai_guilt_guess: null },
      { ai_guilt_guess: "unhealthy", ai_rules_conflict: "Zwei Regeln." },
    );
    assert.deepEqual(merged, {
      messy_when: "Beim Absagen",
      ai_guilt_guess: "unhealthy",
      ai_rules_conflict: "Zwei Regeln.",
    });
  });

  it("bewahrt undeklarierte Felder — anders als beim Lesen", () => {
    // Die entscheidende Asymmetrie: Lesen vergisst, was nicht deklariert ist;
    // Schreiben darf das nicht, sonst wäre jeder Merge ein stiller Verlust.
    const merged = patchJournalContent(
      "free",
      { body: "Text", feld_aus_der_zukunft: "bleibt" },
      { title: "Titel" },
    );
    assert.deepEqual(merged, {
      body: "Text",
      feld_aus_der_zukunft: "bleibt",
      title: "Titel",
    });
  });

  it("bewahrt den Bestand auch, wenn er sich gar nicht lesen ließe", () => {
    // Kein `body` — als Eintrag wäre das "unknown". Ein Merge darf trotzdem
    // nichts wegwerfen, sonst kostet ein Schreibzugriff den halben Eintrag.
    const merged = patchJournalContent(
      "free",
      { halb: "kaputt" },
      { title: "Titel" },
    );
    assert.deepEqual(merged, { halb: "kaputt", title: "Titel" });
  });

  it("behandelt undefined als „nicht setzen“, nicht als „löschen“", () => {
    // Ein auf undefined gespreadetes Feld fällt beim Serialisieren aus dem
    // JSON — der bestehende Wert wäre damit still weg.
    const merged = patchJournalContent(
      "saying_no",
      { mode: "real", situation: "Anfrage", draft: "Nein.", draft2: "Nein!" },
      { draft2: undefined, final_no: "Nein!" },
    );
    assert.deepEqual(merged, {
      mode: "real",
      situation: "Anfrage",
      draft: "Nein.",
      draft2: "Nein!",
      final_no: "Nein!",
    });
  });

  it("schreibt explizites null durch — das ist eine Aussage", () => {
    const merged = patchJournalContent(
      "saying_no",
      { mode: "real", situation: "Anfrage", draft: "Nein." },
      { ai_checklist: null, ai_improved: null },
    );
    assert.deepEqual(merged, {
      mode: "real",
      situation: "Anfrage",
      draft: "Nein.",
      ai_checklist: null,
      ai_improved: null,
    });
  });

  // Die vier Zeilen, die von ZWEI Seiten beschrieben werden: die
  // Speicher-Action legt den Text der Person an, danach trägt die KI-Route
  // ihre Auswertung nach. Genau das prüfte bisher niemand — der Grund, aus
  // dem der Reihenfolge-Zwang überhaupt gefährlich war
  // (s. lib/recipes/saved-entry.ts).
  const ZWEI_SCHREIBER = [
    {
      template: "value_eval" as const,
      vonDerPerson: {
        positive_reflection: "Das Mittagessen.",
        negative_reflection: "Das Meeting.",
      },
      vonDerKi: {
        ai_confirmed: ["verbindung"],
        ai_suggested: [{ id: "autonomie", reason: "Kam zweimal vor." }],
      },
    },
    {
      template: "messy_moment" as const,
      vonDerPerson: { messy_when: "Beim Absagen." },
      vonDerKi: {
        ai_guilt_guess: "unhealthy" as const,
        ai_rules_conflict: "Hilfsbereitschaft gegen Selbstfürsorge.",
      },
    },
    {
      template: "saying_no" as const,
      vonDerPerson: {
        mode: "real" as const,
        situation: "Die Anfrage.",
        draft: "Nein, das schaffe ich nicht.",
      },
      vonDerKi: {
        ai_checklist: {
          complete_sentence: true,
          no_apology: false,
          warmth: true,
          no_but: true,
        },
        ai_improved: "Nein. Ich mag dich, aber meine Woche ist voll.",
      },
    },
    {
      template: "yin_yang" as const,
      vonDerPerson: {
        yin: "Für meine Leute.",
        yang: "Beim Schreiben.",
        principles: "Tiefe vor Breite.",
      },
      vonDerKi: {
        ai_wants: [{ text: "Etwas bauen", value_id: "kreativitaet" }],
      },
    },
  ];

  for (const { template, vonDerPerson, vonDerKi } of ZWEI_SCHREIBER) {
    it(`verträgt zwei Schreiber auf einer ${template}-Zeile`, () => {
      const gespeichert = patchJournalContent(template, {}, vonDerPerson);
      const ausgewertet = patchJournalContent(template, gespeichert, vonDerKi);

      // Beide Hälften stehen nebeneinander — keine hat die andere verdrängt.
      assert.deepEqual(ausgewertet, { ...vonDerPerson, ...vonDerKi });

      // Und der zweite Durchgang der Person räumt die Auswertung nicht weg.
      const nachgetragen = patchJournalContent(template, ausgewertet, vonDerPerson);
      assert.deepEqual(nachgetragen, { ...vonDerPerson, ...vonDerKi });
    });
  }

  it("macht aus einem Nicht-Objekt einen leeren Bestand statt zu werfen", () => {
    for (const raw of [null, undefined, 42, "text", ["a"]]) {
      assert.deepEqual(patchJournalContent("free", raw, { body: "Text" }), {
        body: "Text",
      });
    }
  });

  it("kopiert einen __proto__-Schlüssel, statt den Setter zu treffen", () => {
    const raw = JSON.parse('{"body":"Text","__proto__":{"gekapert":true}}');
    const merged = patchJournalContent("free", raw, { title: "Titel" });
    assert.deepEqual(Object.keys(merged as object).sort(), [
      "__proto__",
      "body",
      "title",
    ]);
    assert.equal(Object.getPrototypeOf(merged) === Object.prototype, true);
  });

  it("lässt den bestehenden content unangetastet", () => {
    const raw = { body: "Text" };
    patchJournalContent("free", raw, { title: "Titel" });
    assert.deepEqual(raw, { body: "Text" });
  });
});
