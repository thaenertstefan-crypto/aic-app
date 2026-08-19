/**
 * Die Textseite des Journals: aus einer Eintragszeile wird eine Vorschau, aus
 * `template_type` + `content` werden geordnete Sektionen für die Detailansicht.
 *
 * Bewusst ohne Wert-Imports aus dem React-Graphen und mit relativen
 * `.ts`-Pfaden statt `@/`: so lässt sich diese Datei mit purem Node prüfen
 * (`npm test`), ohne Bundler und ohne Alias-Auflösung. Alles, was Icons oder
 * Labels braucht, wohnt nebenan in `journal-chrome.ts` — das ist die
 * Trennlinie, nicht Formatierung gegen Anzeige.
 */

import type { Json } from "../supabase/database.types.ts";
import type {
  BillOfRightsContent,
  DailyValueContent,
  FreeEntryContent,
  LittleBetContent,
  MessyMomentContent,
  OverthinkingContent,
  SayingNoContent,
  ShadowContent,
  ValueEvalContent,
  YinYangContent,
} from "../types/db-json.ts";
import {
  readJournalContent,
  type KnownJournalContent,
} from "./journal-content.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

/**
 * Schlanke Variante für die Journal-Liste: enthält NUR die für Anzeige und
 * Filterung nötigen Felder plus eine kurze, serverseitig berechnete Vorschau.
 * content (JSONB) und ai_insights (langer Text) werden bewusst NICHT in die
 * Liste geladen — sie werden erst beim Öffnen eines Eintrags nachgeladen.
 */
export type JournalListItem = {
  id: string;
  template_type: string;
  recipe_slug: string | null;
  entry_date: string;
  created_at: string;
  preview: string;
};

export type ContentSection = {
  label: string;
  value: string;
};

/** Mappt eine geladene Eintragszeile auf das schlanke Listen-Item und
 *  berechnet dabei die Vorschau serverseitig (content verlässt den Server nicht). */
export function toJournalListItem(row: {
  id: string;
  template_type: string;
  recipe_slug: string | null;
  entry_date: string;
  created_at: string;
  content: Record<string, unknown>;
}): JournalListItem {
  return {
    id: row.id,
    template_type: row.template_type,
    recipe_slug: row.recipe_slug,
    entry_date: row.entry_date,
    created_at: row.created_at,
    preview: extractPreview(row.content),
  };
}

/* ------------------------------------------------------------------ */
/*  Vorschau                                                          */
/* ------------------------------------------------------------------ */

/** Bevorzugte Erzähl-Felder für die Vorschau. Nötig, weil Postgres-JSONB die
 *  Keys umsortiert (Länge, dann Bytes) — ohne Priorität landet sonst z.B. bei
 *  messy_moment das kurze Enum-Feld guilt_type ("unhealthy") vor messy_when. */
const PREVIEW_PREFERRED_KEYS = [
  "messy_when",
  "happenings",
  "problem",
  "situation",
  // yin_yang: die Yin-Antwort vor allem anderen (statt z.B. principles).
  "yin",
  // little_bet: der Bet-Snapshot statt des vibe-Enums.
  "bet_text",
  "body",
];

/**
 * Extract a short text preview from an entry's content JSONB.
 * Finds the first non-empty string value (or first element of a string array),
 * then truncates to maxLen characters.
 */
export function extractPreview(
  content: Record<string, unknown>,
  maxLen = 80,
): string {
  if (!content || typeof content !== "object") return "";

  // Private Einträge (Schattenseite): fester Hinweis statt Text-Vorschau —
  // der Inhalt bleibt der Detailansicht vorbehalten. MUSS vor dem
  // Preferred-Key-Scan stehen ("body" ist ein bevorzugter Key).
  if (content["private"] === true) {
    return "Privater Eintrag — nur für dich.";
  }

  for (const key of PREVIEW_PREFERRED_KEYS) {
    const val = content[key];
    if (typeof val === "string" && val.trim().length > 0) {
      return truncate(val.trim(), maxLen);
    }
  }

  const values = Object.values(content);

  for (const val of values) {
    if (typeof val === "string" && val.trim().length > 0) {
      return truncate(val.trim(), maxLen);
    }
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") {
      return truncate(val[0].trim(), maxLen);
    }
  }

  return "";
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

/* ------------------------------------------------------------------ */
/*  Per-template-type content formatters                              */
/* ------------------------------------------------------------------ */

function formatDailyValue(content: DailyValueContent): ContentSection[] {
  const sections: ContentSection[] = [
    { label: "Was ist passiert?", value: content.happenings },
  ];

  // Alt-Einträge (vor der 1-Feld-Zusammenlegung) tragen noch ein eigenes
  // `response` — neue Einträge haben das Feld gar nicht mehr. Nur zeigen,
  // wenn tatsächlich etwas da ist, sonst bleibt eine leere Sektion stehen.
  if (content.response) {
    sections.push({ label: "Gedanken und Gefühle", value: content.response });
  }

  return sections;
}

function formatValueEval(content: ValueEvalContent): ContentSection[] {
  return [
    { label: "Was lief gut?", value: content.positive_reflection },
    { label: "Was war schwierig?", value: content.negative_reflection },
  ];
}

function formatYinYang(content: YinYangContent): ContentSection[] {
  const sections: ContentSection[] = [
    { label: "Wofür nimmst du Mühsal in Kauf?", value: content.yin },
    { label: "Was bringt dich in Flow?", value: content.yang },
  ];

  if (content.principles) {
    sections.push({
      label: "Die Prinzipien dahinter",
      value: content.principles,
    });
  }

  // Die destillierten Hypothesen (von /api/wants-distiller nachgetragen).
  const texts = (content.ai_wants ?? []).map((w) => w.text).filter(Boolean);
  if (texts.length > 0) {
    sections.push({
      label: "Deine Wants-Hypothesen",
      value: texts.map((t) => `• ${t}`).join("\n"),
    });
  }

  return sections;
}

/** Die drei Vibe-Stufen als Text. `Record` über den Feldtyp: eine vierte Stufe
 *  in `db-json.ts` bricht hier den Build, statt still ohne Label zu rendern. */
const VIBE_LABELS: Record<NonNullable<LittleBetContent["vibe"]>, string> = {
  energized: "Hat mir Energie gegeben",
  neutral: "War okay",
  drained: "Hat mich eher ausgelaugt",
};

function formatLittleBet(content: LittleBetContent): ContentSection[] {
  const sections: ContentSection[] = [
    { label: "Dein Little Bet", value: content.bet_text },
    { label: "Wie war's?", value: content.experience },
  ];

  if (content.liked) {
    sections.push({ label: "Was dir gefallen hat", value: content.liked });
  }

  if (content.disliked) {
    sections.push({ label: "Was dir nicht gefallen hat", value: content.disliked });
  }

  if (content.vibe) {
    sections.push({ label: "Leute & Vibe", value: VIBE_LABELS[content.vibe] });
  }

  if (content.changed_wants) {
    sections.push({
      label: "Was das mit deinen Wants macht",
      value: content.changed_wants,
    });
  }

  return sections;
}

function formatBillOfRights(content: BillOfRightsContent): ContentSection[] {
  // Neue Einträge (Regel-Duell): prompt1 + ai_analysis + old_rule.
  // Alt-Einträge: prompt1, prompt2, prompt3 (nur noch lesend).
  const sections: ContentSection[] = [];

  if (content.prompt1) {
    sections.push({ label: "Deine Reflexion", value: content.prompt1 });
  }
  if (content.ai_analysis) {
    sections.push({ label: "Meine Einschätzung", value: content.ai_analysis });
  }
  if (content.old_rule) {
    sections.push({ label: "Die alte Regel", value: content.old_rule });
  }
  if (content.prompt2) {
    sections.push({ label: "Was dir wichtig ist", value: content.prompt2 });
  }
  if (content.prompt3) {
    sections.push({ label: "Was du dir vornimmst", value: content.prompt3 });
  }

  return sections;
}

/** Die Selbst-Einordnung der Alt-Einträge als Text (s. VIBE_LABELS). */
const GUILT_LABELS: Record<
  NonNullable<MessyMomentContent["guilt_type"]>,
  string
> = {
  healthy: "Gesundes Schuldgefühl",
  unhealthy: "Ungesundes Schuldgefühl",
  unsure: "Bin mir nicht sicher",
};

function formatMessyMoment(content: MessyMomentContent): ContentSection[] {
  // Alt-Einträge (Formular bis Juli 2026) haben guilt_type vom User selbst —
  // sie rendern unverändert. Neue Einträge tragen stattdessen die KI-Felder
  // ai_guilt_guess/ai_rules_conflict (+ guilt_feedback vom Bestätigungs-Tap).
  if (content.guilt_type) {
    return [
      { label: "Was war die Situation?", value: content.messy_when },
      {
        label: "Welche Regeln standen im Konflikt?",
        value: content.conflicting_rules ?? "",
      },
      {
        label: "Art des Schuldgefühls",
        value: GUILT_LABELS[content.guilt_type],
      },
    ];
  }

  const sections: ContentSection[] = [
    { label: "Was war die Situation?", value: content.messy_when },
  ];

  if (content.ai_rules_conflict) {
    sections.push({
      label: "Die Regeln im Konflikt",
      value: content.ai_rules_conflict,
    });
  }

  if (content.ai_guilt_guess) {
    const base =
      content.ai_guilt_guess === "healthy"
        ? "Vermutlich gesunde Schuld"
        : "Vermutlich ungesunde Schuld";
    const suffix =
      content.guilt_feedback === "agree"
        ? " — du fandest: passt"
        : content.guilt_feedback === "disagree"
          ? " — du fandest: passt eher nicht"
          : "";
    sections.push({ label: "Einschätzung deines Begleiters", value: base + suffix });
  }

  return sections;
}

function formatOverthinking(content: OverthinkingContent): ContentSection[] {
  // Nur die tiefste Warum-Ebene — die Zwischenebenen sind Weg, nicht Ergebnis.
  const deepest = [...content.why_levels].reverse().find((v) => v.trim());

  const sections: ContentSection[] = [
    { label: "Das Problem", value: content.problem },
  ];

  if (deepest) {
    sections.push({ label: "Das Problem auf der tiefsten Ebene", value: deepest });
  }

  // Die KI-Frage aus dem Perspektivwechsel (Alt-Einträge haben sie nicht).
  if (content.challenger_question) {
    sections.push({
      label: "Die Reframe-Frage",
      value: content.challenger_question,
    });
  }

  if (content.what_if_wrong) {
    sections.push({
      label: "Deine neue Perspektive",
      value: content.what_if_wrong,
    });
  }

  if (content.what_it_would_mean) {
    sections.push({
      label: "Was würde das bedeuten?",
      value: content.what_it_would_mean,
    });
  }

  if (content.reframed_problem) {
    sections.push({
      label: "Was würde diese Perspektive für dein Problem bedeuten?",
      value: content.reframed_problem,
    });
  }

  // Rückwärtskompatibel: ältere Einträge mit dem alten Vergleichsblock.
  if (content.current_problem) {
    sections.push({
      label: "Das aktuelle Problem",
      value: content.current_problem,
    });
  }
  if (content.new_problem) {
    sections.push({ label: "Das neue Problem", value: content.new_problem });
  }

  sections.push({ label: "Dein nächster Schritt", value: content.decision });

  return sections;
}

function formatSayingNo(content: SayingNoContent): ContentSection[] {
  const isPractice = content.mode === "practice";
  const draft = content.draft;
  const finalNo = content.final_no || content.draft2 || draft;

  const sections: ContentSection[] = [
    {
      label: isPractice ? "Das Übungsszenario" : "Die Anfrage",
      value: content.situation,
    },
  ];

  // Der erste Entwurf ist nur interessant, wenn er nicht ohnehin das
  // finale Nein geworden ist.
  if (draft && draft !== finalNo) {
    sections.push({ label: "Dein erster Entwurf", value: draft });
  }

  sections.push({ label: "Dein Nein", value: finalNo });

  // Kompakte Blueprint-Bilanz aus den KI-Verdicts (fehlt bei Alt-/Offline-Einträgen).
  // Die Checkliste kommt entweder vollständig oder gar nicht — eine halbe
  // ergäbe eine falsche Bilanz, deshalb verwirft die Verengung sie ganz.
  if (content.ai_checklist) {
    const layers = Object.values(content.ai_checklist);
    sections.push({
      label: "Blueprint-Check",
      value: `${layers.filter(Boolean).length} von ${layers.length} Schichten ✓`,
    });
  }

  return sections;
}

function formatShadow(content: ShadowContent): ContentSection[] {
  // Nur der rohe Text — bewusst ohne KI-Felder (gibt es hier nie) und ohne
  // weitere Aufbereitung: das Shadow Journal gehört ganz dem User.
  return [{ label: "Dein Eintrag", value: content.body }];
}

function formatFree(content: FreeEntryContent): ContentSection[] {
  const sections: ContentSection[] = [];

  if (content.title) sections.push({ label: "Titel", value: content.title });
  sections.push({ label: "Eintrag", value: content.body });

  return sections;
}

/* ------------------------------------------------------------------ */
/*  Dispatcher                                                        */
/* ------------------------------------------------------------------ */

/**
 * Der `switch` über die Diskriminante ist der ganze Punkt: `entry.content` ist
 * in jedem Zweig der Shape, den der Formatter erwartet — ohne eine einzige
 * Behauptung. Fehlt ein Glied, fehlt dieser Funktion ein Rückgabepfad, und
 * `tsc` sagt das. Eine Tabelle `template_type → Formatter` könnte das nicht:
 * sie prüft die Schlüssel, aber nicht, dass Schlüssel und content-Shape beim
 * Aufruf zusammengehören.
 */
function formatKnown(entry: KnownJournalContent): ContentSection[] {
  switch (entry.template) {
    case "daily_value":
      return formatDailyValue(entry.content);
    case "value_eval":
      return formatValueEval(entry.content);
    case "yin_yang":
      return formatYinYang(entry.content);
    case "little_bet":
      return formatLittleBet(entry.content);
    case "bill_of_rights":
      return formatBillOfRights(entry.content);
    case "messy_moment":
      return formatMessyMoment(entry.content);
    case "overthinking":
      return formatOverthinking(entry.content);
    case "saying_no":
      return formatSayingNo(entry.content);
    case "shadow":
      return formatShadow(entry.content);
    case "free":
      return formatFree(entry.content);
  }
}

/**
 * Die geordneten Sektionen eines Eintrags für die Detailansicht.
 *
 * Nimmt beide Achsen so, wie die Datenbank sie liefert — `template_type` ist
 * dort ein nackter `string`, `content` ein nackter `Json` — und verengt sie in
 * einem Schritt: ab `formatKnown` ist `content` getypt.
 *
 * Der generische Fallback greift jetzt in zwei Fällen — unbekannter
 * `template_type` (wie bisher) UND ein content, der seinen eigenen Shape nicht
 * erfüllt. Beides heißt dasselbe: „dafür kann ich nicht geradestehen“, und
 * alle Schlüssel roh zu zeigen ist ehrlicher als halb leere Sektionen mit
 * vertrauten Überschriften.
 */
export function getContentSections(
  templateType: string,
  content: Json,
): ContentSection[] {
  const entry = readJournalContent(templateType, content);

  if (entry.template === "unknown") {
    return Object.entries(entry.content).map(([key, val]) => ({
      label: key,
      value: formatValue(val),
    }));
  }

  return formatKnown(entry);
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

function formatValue(val: unknown): string {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map(String).join(", ");
  if (val === null || val === undefined) return "";
  return String(val);
}
