import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractPreview,
  getContentSections,
  toJournalListItem,
} from "./journal-format.ts";

/** Die Labels der Sektionen in ihrer Reihenfolge — die Achse, um die es geht.
 *  Verglichen wird die Auswahl, nicht der Wortlaut der Copy. */
function labels(sections: { label: string }[]): string[] {
  return sections.map((s) => s.label);
}

/* ------------------------------------------------------------------ */
/*  Der Fallback: nichts wirft, nichts verschwindet                   */
/* ------------------------------------------------------------------ */

describe("getContentSections — der generische Fallback", () => {
  it("rendert einen unbekannten template_type roh, statt zu werfen", () => {
    const sections = getContentSections("gratitude", {
      note: "Danke.",
      count: 3,
    });

    assert.deepEqual(sections, [
      { label: "note", value: "Danke." },
      { label: "count", value: "3" },
    ]);
  });

  it("fällt auch dann generisch zurück, wenn der content seinen Shape verfehlt", () => {
    // `free` braucht `body` — ohne das Pflichtfeld ist der Eintrag nicht das,
    // was sein template_type behauptet. Vertraute Überschriften über leeren
    // Feldern wären die schlechtere Antwort als die rohen Schlüssel.
    const sections = getContentSections("free", { title: "Ohne Text" });

    assert.deepEqual(sections, [{ label: "title", value: "Ohne Text" }]);
  });

  it("verträgt einen content, der gar kein Objekt ist", () => {
    for (const raw of [null, "Text", 7, ["a"]]) {
      assert.deepEqual(getContentSections("free", raw), []);
    }
  });

  it("macht aus Arrays und null im Fallback lesbaren Text statt \"undefined\"", () => {
    const sections = getContentSections("gratitude", {
      tags: ["a", "b"],
      leer: null,
    });

    assert.deepEqual(sections, [
      { label: "tags", value: "a, b" },
      { label: "leer", value: "" },
    ]);
  });
});

/* ------------------------------------------------------------------ */
/*  Optionale Felder degradieren, statt leere Sektionen zu zeigen     */
/* ------------------------------------------------------------------ */

describe("getContentSections — fehlende optionale Felder", () => {
  it("lässt die Sektion eines fehlenden optionalen Feldes weg", () => {
    const ohne = getContentSections("daily_value", { happenings: "Etwas." });
    assert.deepEqual(labels(ohne), ["Was ist passiert?"]);

    const mit = getContentSections("daily_value", {
      happenings: "Etwas.",
      response: "Ging mir gut damit.",
    });
    assert.deepEqual(labels(mit), ["Was ist passiert?", "Gedanken und Gefühle"]);
  });

  it("zeigt kein Feld mit dem Wert \"undefined\" an", () => {
    const sections = getContentSections("little_bet", {
      bet_text: "Töpferkurs",
      experience: "Überraschend ruhig.",
    });

    for (const section of sections) {
      assert.notEqual(section.value, "undefined");
      assert.notEqual(section.value, "");
    }
    assert.deepEqual(labels(sections), ["Dein Little Bet", "Wie war's?"]);
  });

  it("nimmt die optionalen Sektionen von little_bet in fester Reihenfolge dazu", () => {
    const sections = getContentSections("little_bet", {
      bet_text: "Töpferkurs",
      experience: "Überraschend ruhig.",
      liked: "Die Stille.",
      vibe: "energized",
      changed_wants: "Mehr Handwerk.",
    });

    assert.deepEqual(labels(sections), [
      "Dein Little Bet",
      "Wie war's?",
      "Was dir gefallen hat",
      "Leute & Vibe",
      "Was das mit deinen Wants macht",
    ]);
    // Das Enum wird zu Text — nicht der rohe Schlüssel.
    assert.equal(sections[3].value, "Hat mir Energie gegeben");
  });

  it("verschluckt ein optionales Feld mit falschem Typ, statt den Eintrag zu verwerfen", () => {
    const sections = getContentSections("daily_value", {
      happenings: "Etwas.",
      response: 42,
    });

    assert.deepEqual(labels(sections), ["Was ist passiert?"]);
  });

  it("überspringt bei yin_yang die Hypothesen-Sektion, wenn die Liste leer ist", () => {
    const sections = getContentSections("yin_yang", {
      yin: "Frühes Aufstehen.",
      yang: "Schreiben.",
      ai_wants: [],
    });

    assert.deepEqual(labels(sections), [
      "Wofür nimmst du Mühsal in Kauf?",
      "Was bringt dich in Flow?",
    ]);
  });
});

/* ------------------------------------------------------------------ */
/*  Alt-Einträge formatieren weiter                                   */
/* ------------------------------------------------------------------ */

describe("getContentSections — Alt-Einträge", () => {
  const neu = {
    problem: "Ich komme nicht zum Schreiben.",
    why_levels: ["Zu wenig Zeit.", "Ich fange zu spät an."],
    what_if_wrong: "Vielleicht ist es Angst.",
    reframed_problem: "Ich brauche einen kleineren Anfang.",
    decision: "Morgen 20 Minuten.",
  };

  it("rendert die drei Alt-Felder von overthinking weiterhin", () => {
    const sections = getContentSections("overthinking", {
      ...neu,
      what_it_would_mean: "Dass ich mich davor drücke.",
      current_problem: "Kein Text entsteht.",
      new_problem: "Ich traue mich nicht.",
    });

    assert.deepEqual(labels(sections), [
      "Das Problem",
      "Das Problem auf der tiefsten Ebene",
      "Deine neue Perspektive",
      "Was würde das bedeuten?",
      "Was würde diese Perspektive für dein Problem bedeuten?",
      "Das aktuelle Problem",
      "Das neue Problem",
      "Dein nächster Schritt",
    ]);
  });

  it("nimmt bei overthinking nur die tiefste nicht-leere Warum-Ebene", () => {
    const sections = getContentSections("overthinking", {
      ...neu,
      why_levels: ["Zu wenig Zeit.", "Ich fange zu spät an.", "   "],
    });

    const tiefste = sections.find(
      (s) => s.label === "Das Problem auf der tiefsten Ebene",
    );
    assert.equal(tiefste?.value, "Ich fange zu spät an.");
  });

  it("lässt die Tiefen-Sektion weg, wenn keine Warum-Ebene Text trägt", () => {
    const sections = getContentSections("overthinking", {
      ...neu,
      why_levels: ["", "  "],
    });

    assert.equal(labels(sections).includes("Das Problem auf der tiefsten Ebene"), false);
  });

  it("rendert einen messy_moment mit Selbst-Einordnung im Alt-Zuschnitt", () => {
    const sections = getContentSections("messy_moment", {
      messy_when: "Absage an einen Freund.",
      conflicting_rules: "Verlässlich sein vs. Ruhe brauchen.",
      guilt_type: "unhealthy",
      // Die KI-Felder werden im Alt-Zweig bewusst nicht gezeigt.
      ai_rules_conflict: "Sollte hier nicht auftauchen.",
    });

    assert.deepEqual(labels(sections), [
      "Was war die Situation?",
      "Welche Regeln standen im Konflikt?",
      "Art des Schuldgefühls",
    ]);
    assert.equal(sections[2].value, "Ungesundes Schuldgefühl");
  });

  it("rendert einen neuen messy_moment mit den KI-Feldern und dem Feedback", () => {
    const sections = getContentSections("messy_moment", {
      messy_when: "Absage an einen Freund.",
      ai_rules_conflict: "Verlässlichkeit gegen Selbstfürsorge.",
      ai_guilt_guess: "unhealthy",
      guilt_feedback: "agree",
    });

    assert.deepEqual(labels(sections), [
      "Was war die Situation?",
      "Die Regeln im Konflikt",
      "Einschätzung deines Begleiters",
    ]);
    assert.equal(
      sections[2].value,
      "Vermutlich ungesunde Schuld — du fandest: passt",
    );
  });

  it("zeigt bei saying_no den ersten Entwurf nur, wenn er nicht das finale Nein ist", () => {
    const gleich = getContentSections("saying_no", {
      mode: "real",
      situation: "Anfrage fürs Wochenende.",
      draft: "Nein, das schaffe ich nicht.",
    });
    assert.deepEqual(labels(gleich), ["Die Anfrage", "Dein Nein"]);

    const verschieden = getContentSections("saying_no", {
      mode: "practice",
      situation: "Anfrage fürs Wochenende.",
      draft: "Ähm, eher nicht?",
      final_no: "Nein, das schaffe ich nicht.",
    });
    assert.deepEqual(labels(verschieden), [
      "Das Übungsszenario",
      "Dein erster Entwurf",
      "Dein Nein",
    ]);
  });

  it("bilanziert die Blueprint-Checkliste nur, wenn sie vollständig ist", () => {
    const halb = getContentSections("saying_no", {
      mode: "real",
      situation: "Anfrage.",
      draft: "Nein.",
      // Eine halbe Checkliste ergäbe eine falsche Bilanz — die Verengung
      // verwirft sie ganz, die Sektion fehlt dann.
      ai_checklist: { complete_sentence: true, no_apology: true },
    });
    assert.equal(labels(halb).includes("Blueprint-Check"), false);

    const ganz = getContentSections("saying_no", {
      mode: "real",
      situation: "Anfrage.",
      draft: "Nein.",
      ai_checklist: {
        complete_sentence: true,
        no_apology: true,
        warmth: true,
        no_but: false,
      },
    });
    const bilanz = ganz.find((s) => s.label === "Blueprint-Check");
    assert.equal(bilanz?.value, "3 von 4 Schichten ✓");
  });
});

/* ------------------------------------------------------------------ */
/*  Vorschau                                                          */
/* ------------------------------------------------------------------ */

describe("extractPreview", () => {
  it("nimmt den bevorzugten Schlüssel, nicht den ersten im Objekt", () => {
    // JSONB sortiert die Keys um (Länge, dann Bytes) — ohne Priorität landete
    // hier das kurze Enum-Feld vorn.
    const preview = extractPreview({
      guilt_type: "unhealthy",
      messy_when: "Ich habe einem Freund abgesagt.",
    });

    assert.equal(preview, "Ich habe einem Freund abgesagt.");
  });

  it("hält die Reihenfolge der bevorzugten Schlüssel untereinander ein", () => {
    const preview = extractPreview({
      body: "Freitext.",
      problem: "Das eigentliche Problem.",
      messy_when: "Die Situation.",
    });

    assert.equal(preview, "Die Situation.");
  });

  it("kürzt genau an der Grenze — nicht davor", () => {
    const genau = "x".repeat(80);
    assert.equal(extractPreview({ body: genau }), genau);

    const eins_zu_viel = "x".repeat(81);
    assert.equal(extractPreview({ body: eins_zu_viel }), "x".repeat(80) + "…");
  });

  it("schneidet ein Leerzeichen an der Schnittkante weg", () => {
    const text = "y".repeat(79) + "   Rest";
    assert.equal(extractPreview({ body: text }, 80), "y".repeat(79) + "…");
  });

  it("unterdrückt die Vorschau privater Einträge, obwohl body bevorzugt ist", () => {
    const preview = extractPreview({
      body: "Sehr persönlicher Text.",
      private: true,
    });

    assert.equal(preview, "Privater Eintrag — nur für dich.");
  });

  it("überspringt leere und nicht-string Werte und nimmt sonst das erste Element eines String-Arrays", () => {
    assert.equal(extractPreview({ a: "   ", b: 7, c: "Endlich." }), "Endlich.");
    assert.equal(extractPreview({ tags: ["Erster", "Zweiter"] }), "Erster");
    assert.equal(extractPreview({}), "");
    assert.equal(extractPreview({ n: 7, leer: null }), "");
  });
});

/* ------------------------------------------------------------------ */
/*  Listen-Item                                                       */
/* ------------------------------------------------------------------ */

describe("toJournalListItem", () => {
  it("übernimmt die Anzeige-Felder und berechnet die Vorschau, ohne content mitzugeben", () => {
    const item = toJournalListItem({
      id: "e1",
      template_type: "free",
      recipe_slug: null,
      entry_date: "2026-08-19",
      created_at: "2026-08-19T08:00:00.000Z",
      content: { body: "Ein freier Eintrag." },
    });

    assert.deepEqual(item, {
      id: "e1",
      template_type: "free",
      recipe_slug: null,
      entry_date: "2026-08-19",
      created_at: "2026-08-19T08:00:00.000Z",
      preview: "Ein freier Eintrag.",
    });
    assert.equal("content" in item, false);
  });
});
