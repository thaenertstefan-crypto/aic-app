import { PAGE_TITLES } from "../content/labels.ts";

export type RecipeSlug =
  | "values"
  | "wants"
  | "bill-of-rights"
  | "saying-no"
  | "overthinking"
  | "things-got-messy"
  | "shadow";

export type Recipe = {
  slug: RecipeSlug;
  title: string;
  description: string;
  /** Name of the lucide-react icon component (e.g. "Heart", "Brain") */
  icon: string;
  /** Estimated duration shown on the card, e.g. "7–14 Tage" */
  duration: string;
  /**
   * True for repeatable recipes that track multiple cycles (e.g. "values").
   * Drives whether the overview badge counts cycles instead of showing a
   * final "Abgeschlossen".
   */
  cyclical?: boolean;
  /** Whether the recipe is currently available to users */
  available: boolean;
  /** Path to redirect to when starting this recipe (step 1) */
  startPath: string;
  /**
   * For multi-step recipes: the path for each step, indexed by
   * (current_step - 1). Used to resume at the correct step. Single-page
   * recipes can omit this and rely on startPath.
   */
  stepPaths?: readonly string[];
};

export const RECIPES: readonly Recipe[] = [
  {
    slug: "values",
    title: "Deine Werte entdecken",
    description:
      "Finde heraus, was dir wirklich wichtig ist. Ein 7-Tage-Tagebuch, um deine inneren Werte zu erkennen und zu verstehen, was dich antreibt.",
    icon: "Heart",
    duration: "7–14 Tage",
    cyclical: true,
    available: true,
    startPath: "/me/values/journey/hypothesis",
    stepPaths: [
      "/me/values/journey/hypothesis",
      "/me/values/journey/journal",
      "/me/values/journey/evaluation",
    ],
  },
  {
    slug: "wants",
    title: PAGE_TITLES.wants,
    description:
      "Lerne deine eigenen Wünsche von fremden Erwartungen zu unterscheiden und herauszufinden, wohin du dich entwickeln möchtest.",
    icon: "Compass",
    duration: "20 Min + laufende Experimente",
    available: true,
    startPath: "/me/wants/journey",
    stepPaths: ["/me/wants/journey", "/me/wants"],
  },
  {
    slug: "bill-of-rights",
    title: "Dein Bill of Rights",
    description:
      "Erstelle deine persönlichen Grundrechte – innere Regeln, die dich schützen und dir helfen, authentisch zu leben.",
    icon: "Shield",
    duration: "7 Tage",
    available: true,
    startPath: "/me/bill-of-rights",
  },
  {
    slug: "saying-no",
    title: PAGE_TITLES.sayingNo,
    description:
      "Formuliere dein nächstes Nein — für eine echte Anfrage oder zum Üben am Szenario. Mit Feedback nach dem Saying-'No'-Blueprint.",
    icon: "ShieldOff",
    duration: "5–10 Minuten",
    available: true,
    startPath: "/booster/saying-no",
  },
  {
    slug: "overthinking",
    title: "Grübelspiralen durchbrechen",
    description:
      "Stopp den Gedankenkarussell. Eine geführte Übung, um aus der Überanalyse auszusteigen und klar zu entscheiden.",
    icon: "Brain",
    duration: "15 Minuten",
    available: true,
    startPath: "/booster/overthinking",
  },
  {
    slug: "things-got-messy",
    title: PAGE_TITLES.thingsGotMessy,
    description:
      "Wenn du in ein altes Muster zurückgefallen bist: Reflektiere den Moment, versteh deine Schuld — und leite ein neues Recht daraus ab.",
    icon: "Flame",
    duration: "5–10 Minuten",
    available: true,
    startPath: "/booster/things-got-messy",
  },
  {
    slug: "shadow",
    title: "Deine Schattenseite",
    description:
      "Wut, Groll, dunkle Gedanken — sicher rauslassen statt runterschlucken. Schreib oder sprich dich frei; danach entscheidest du: behalten oder verbrennen.",
    icon: "Moon",
    duration: "5–15 Minuten",
    available: true,
    startPath: "/booster/shadow",
  },
] as const;

/**
 * Look up a recipe by its slug.
 * Returns the recipe object or undefined if no match is found.
 */
export function getRecipeBySlug(slug: string): Recipe | undefined {
  return RECIPES.find((r) => r.slug === slug);
}

/**
 * Resolve the path for a given step of a recipe (1-based).
 * Falls back to startPath for single-page recipes or out-of-range steps.
 */
export function getRecipeStepPath(slug: string, step: number): string {
  const recipe = getRecipeBySlug(slug);
  if (!recipe) return "/dashboard";
  return recipe.stepPaths?.[step - 1] ?? recipe.startPath;
}