import {
  AlertTriangle,
  Brain,
  Heart,
  Notebook,
  NotebookPen,
  Shield,
  type LucideIcon,
} from "lucide-react";

import { PAGE_TITLES } from "@/lib/content/labels";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type TemplateType =
  | "daily_value"
  | "value_eval"
  | "bill_of_rights"
  | "messy_moment"
  | "overthinking"
  | "free";

export type JournalEntryRow = {
  id: string;
  user_id: string;
  recipe_slug: string | null;
  template_type: string;
  entry_date: string;
  content: Record<string, unknown>;
  ai_insights: string | null;
  created_at: string;
};

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

/** Seitengröße für die paginierte Journal-Liste ("Mehr laden"). */
export const JOURNAL_PAGE_SIZE = 30;

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

export type ContentSection = {
  label: string;
  value: string;
};

/* ------------------------------------------------------------------ */
/*  Config map: template_type → { icon, label, recipeSlug }          */
/* ------------------------------------------------------------------ */

type TemplateConfig = {
  icon: LucideIcon;
  label: string;
  recipeSlug: string;
};

export const JOURNAL_TEMPLATE_MAP: Record<string, TemplateConfig> = {
  daily_value: {
    icon: Heart,
    label: "Werte-Tagebuch",
    recipeSlug: "values",
  },
  value_eval: {
    icon: Notebook,
    label: "Werte-Auswertung",
    recipeSlug: "values",
  },
  bill_of_rights: {
    icon: Shield,
    label: "Bill of Rights Reflexion",
    recipeSlug: "bill-of-rights",
  },
  messy_moment: {
    icon: AlertTriangle,
    label: PAGE_TITLES.thingsGotMessy,
    recipeSlug: "things-got-messy",
  },
  overthinking: {
    icon: Brain,
    label: "Grübelspirale durchbrochen",
    recipeSlug: "overthinking",
  },
  free: {
    icon: NotebookPen,
    label: "Freier Eintrag",
    recipeSlug: "",
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Look up config for a template type — falls back to a generic entry. */
export function getJournalConfig(templateType: string): TemplateConfig {
  return (
    JOURNAL_TEMPLATE_MAP[templateType] ?? {
      icon: Notebook,
      label: templateType,
      recipeSlug: "unknown",
    }
  );
}

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

/** Format a date key "YYYY-MM-DD" to German "DD.MM.YYYY". Re-exported from the
 *  central date helper so existing imports from this module keep working. */
export { formatDateDE } from "./date";

/* ------------------------------------------------------------------ */
/*  Per-template-type content formatters                              */
/* ------------------------------------------------------------------ */

function formatDailyValue(content: Record<string, unknown>): ContentSection[] {
  return [
    { label: "Was ist passiert?", value: stringField(content, "happenings") },
    { label: "Gedanken und Gefühle", value: stringField(content, "response") },
  ];
}

function formatValueEval(content: Record<string, unknown>): ContentSection[] {
  return [
    {
      label: "Was lief gut?",
      value: stringField(content, "positive_reflection"),
    },
    {
      label: "Was war schwierig?",
      value: stringField(content, "negative_reflection"),
    },
  ];
}

function formatBillOfRights(
  content: Record<string, unknown>,
): ContentSection[] {
  // prompt1, prompt2, prompt3
  const sections: ContentSection[] = [];
  const p1 = stringField(content, "prompt1");
  const p2 = stringField(content, "prompt2");
  const p3 = stringField(content, "prompt3");

  if (p1) sections.push({ label: "Deine Reflexion", value: p1 });
  if (p2) sections.push({ label: "Was dir wichtig ist", value: p2 });
  if (p3) sections.push({ label: "Was du dir vornimmst", value: p3 });

  return sections;
}

function formatMessyMoment(content: Record<string, unknown>): ContentSection[] {
  const guiltLabels: Record<string, string> = {
    healthy: "Gesundes Schuldgefühl",
    unhealthy: "Ungesundes Schuldgefühl",
    unsure: "Bin mir nicht sicher",
  };

  const guiltRaw = stringField(content, "guilt_type");
  const guiltLabel = guiltRaw
    ? guiltLabels[guiltRaw] ?? guiltRaw
    : "—";

  return [
    {
      label: "Was war die Situation?",
      value: stringField(content, "messy_when"),
    },
    {
      label: "Welche Regeln standen im Konflikt?",
      value: stringField(content, "conflicting_rules"),
    },
    { label: "Art des Schuldgefühls", value: guiltLabel },
  ];
}

function formatOverthinking(
  content: Record<string, unknown>,
): ContentSection[] {
  // Nur die tiefste Warum-Ebene — die Zwischenebenen sind Weg, nicht Ergebnis.
  const whyLevels = content["why_levels"];
  const deepest = Array.isArray(whyLevels)
    ? [...(whyLevels as string[])].reverse().find((v) => v?.trim())
    : undefined;

  const sections: ContentSection[] = [
    { label: "Das Problem", value: stringField(content, "problem") },
  ];

  if (deepest) {
    sections.push({ label: "Das Problem auf der tiefsten Ebene", value: deepest });
  }

  // Die KI-Frage aus dem Perspektivwechsel (Alt-Einträge haben sie nicht).
  const challengerQuestion = stringField(content, "challenger_question");
  if (challengerQuestion) {
    sections.push({ label: "Die Reframe-Frage", value: challengerQuestion });
  }

  const whatIfWrong = stringField(content, "what_if_wrong");
  if (whatIfWrong) {
    sections.push({ label: "Deine neue Perspektive", value: whatIfWrong });
  }

  const whatItWouldMean = stringField(content, "what_it_would_mean");
  if (whatItWouldMean) {
    sections.push({ label: "Was würde das bedeuten?", value: whatItWouldMean });
  }

  const reframedProblem = stringField(content, "reframed_problem");
  if (reframedProblem) {
    sections.push({
      label: "Was würde diese Perspektive für dein Problem bedeuten?",
      value: reframedProblem,
    });
  }

  // Rückwärtskompatibel: ältere Einträge mit dem alten Vergleichsblock.
  const currentProblem = stringField(content, "current_problem");
  if (currentProblem) sections.push({ label: "Das aktuelle Problem", value: currentProblem });
  const newProblem = stringField(content, "new_problem");
  if (newProblem) sections.push({ label: "Das neue Problem", value: newProblem });

  sections.push({ label: "Dein nächster Schritt", value: stringField(content, "decision") });

  return sections;
}

function formatFree(content: Record<string, unknown>): ContentSection[] {
  const sections: ContentSection[] = [];
  const title = stringField(content, "title");
  const body = stringField(content, "body");

  if (title) sections.push({ label: "Titel", value: title });
  sections.push({ label: "Eintrag", value: body });

  return sections;
}

/* ------------------------------------------------------------------ */
/*  Dispatcher                                                        */
/* ------------------------------------------------------------------ */

const FORMATTERS: Record<
  string,
  (content: Record<string, unknown>) => ContentSection[]
> = {
  daily_value: formatDailyValue,
  value_eval: formatValueEval,
  bill_of_rights: formatBillOfRights,
  messy_moment: formatMessyMoment,
  overthinking: formatOverthinking,
  free: formatFree,
};

/**
 * Get ordered content sections for a given template_type and content blob.
 * Used by the detail dialog to render a nicely formatted view.
 */
export function getContentSections(
  templateType: string,
  content: Record<string, unknown>,
): ContentSection[] {
  const formatter = FORMATTERS[templateType];
  if (!formatter) {
    // Fallback: show all keys alphabetically
    return Object.entries(content).map(([key, val]) => ({
      label: key,
      value: formatValue(val),
    }));
  }
  return formatter(content);
}

/* ------------------------------------------------------------------ */
/*  Filter tabs                                                       */
/* ------------------------------------------------------------------ */

export type FilterTab = {
  value: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Build filter tabs for the journal hub.
 * The "Alle" tab is always first, followed by one tab per recipe.
 */
export function getFilterTabs(): FilterTab[] {
  return [
    { value: "all", label: "Alle", icon: Notebook },
    {
      value: "values",
      label: "Werte",
      icon: Heart,
    },
    {
      value: "bill-of-rights",
      label: "Bill of Rights",
      icon: Shield,
    },
    {
      value: "overthinking",
      label: "Grübelspiralen",
      icon: Brain,
    },
    {
      value: "things-got-messy",
      label: PAGE_TITLES.thingsGotMessy,
      icon: AlertTriangle,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

function stringField(
  content: Record<string, unknown>,
  key: string,
): string {
  const val = content[key];
  if (typeof val === "string") return val;
  return "";
}

function formatValue(val: unknown): string {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map(String).join(", ");
  if (val === null || val === undefined) return "";
  return String(val);
}