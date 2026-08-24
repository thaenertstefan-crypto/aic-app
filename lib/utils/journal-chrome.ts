/**
 * Die Anzeige-Seite des Journals: Icon, Label und Filter-Tabs. Das hier ist
 * Chrome, kein Inhalt — und die einzige Journal-Datei, die `lucide-react` zieht.
 *
 * Die Trennlinie zu `journal-format.ts` ist Ladbarkeit: alles, was ohne Bundler
 * lädt und deshalb testbar ist, wohnt dort; hier bleibt, was React-Icons und
 * zentrale Labels braucht. Ein Re-Export-Barrel gäbe es nicht umsonst — es
 * zöge `lucide-react` wieder in jeden Konsumenten-Graphen, auch in die
 * Server-Action des Journals.
 */

import {
  AlertTriangle,
  Brain,
  Compass,
  FlaskConical,
  Heart,
  Lock,
  Notebook,
  NotebookPen,
  Shield,
  ShieldOff,
  type LucideIcon,
} from "lucide-react";

import { PAGE_TITLES } from "@/lib/content/labels";
import { RECIPE_SLUG_BY_TEMPLATE } from "@/lib/utils/journal-recipe-slug";

/* ------------------------------------------------------------------ */
/*  Config map: template_type → { icon, label, recipeSlug }          */
/* ------------------------------------------------------------------ */

type TemplateConfig = {
  icon: LucideIcon;
  label: string;
  recipeSlug: string;
};

/** `RECIPE_SLUG_BY_TEMPLATE` trägt `null` für `free` (die DB-Wahrheit) — hier
 *  wird daraus `""`, weil `recipeSlug` ein Anzeige-/Filter-Tab-Wert ist und
 *  kein Filter-Tab je auf `""` matcht (siehe journal-recipe-slug.ts). */
function displaySlug(templateType: keyof typeof RECIPE_SLUG_BY_TEMPLATE) {
  return RECIPE_SLUG_BY_TEMPLATE[templateType] ?? "";
}

export const JOURNAL_TEMPLATE_MAP: Record<string, TemplateConfig> = {
  daily_value: {
    icon: Heart,
    label: "Werte-Tagebuch",
    recipeSlug: displaySlug("daily_value"),
  },
  value_eval: {
    icon: Notebook,
    label: "Werte-Auswertung",
    recipeSlug: displaySlug("value_eval"),
  },
  yin_yang: {
    icon: Compass,
    label: PAGE_TITLES.wants,
    recipeSlug: displaySlug("yin_yang"),
  },
  little_bet: {
    icon: FlaskConical,
    label: "Little-Bet-Reflexion",
    recipeSlug: displaySlug("little_bet"),
  },
  bill_of_rights: {
    icon: Shield,
    label: "Bill of Rights Reflexion",
    recipeSlug: displaySlug("bill_of_rights"),
  },
  messy_moment: {
    icon: AlertTriangle,
    label: PAGE_TITLES.thingsGotMessy,
    recipeSlug: displaySlug("messy_moment"),
  },
  overthinking: {
    icon: Brain,
    label: "Grübelspirale durchbrochen",
    recipeSlug: displaySlug("overthinking"),
  },
  saying_no: {
    icon: ShieldOff,
    label: PAGE_TITLES.sayingNo,
    recipeSlug: displaySlug("saying_no"),
  },
  shadow: {
    // Schloss statt Rezept-Icon: signalisiert in der Liste "privat".
    icon: Lock,
    label: PAGE_TITLES.shadow,
    recipeSlug: displaySlug("shadow"),
  },
  free: {
    icon: NotebookPen,
    label: "Freier Eintrag",
    recipeSlug: displaySlug("free"),
  },
};

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
 *
 * Bewusst nicht mit `JOURNAL_TEMPLATE_MAP` zusammengelegt: die Labels sind echt
 * verschieden („Werte-Tagebuch" vs. „Werte"), eine gemeinsame Map mit zwei
 * Label-Feldern wäre breiter, ohne etwas zu entscheiden.
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
      value: "wants",
      label: "Wants",
      icon: Compass,
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
    {
      value: "saying-no",
      label: PAGE_TITLES.sayingNo,
      icon: ShieldOff,
    },
    {
      value: "shadow",
      label: PAGE_TITLES.shadow,
      icon: Lock,
    },
  ];
}
