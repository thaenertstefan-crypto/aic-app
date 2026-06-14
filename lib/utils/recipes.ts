export type RecipeSlug =
  | "values"
  | "wants"
  | "bill-of-rights"
  | "saying-no"
  | "overthinking"
  | "shadow";

export type Recipe = {
  slug: RecipeSlug;
  title: string;
  description: string;
  /** Name of the lucide-react icon component (e.g. "Heart", "Brain") */
  icon: string;
  /** Estimated duration shown on the card, e.g. "7–14 Tage" */
  duration: string;
  /** Whether the recipe is currently available to users */
  available: boolean;
  /** Path to redirect to when starting or continuing this recipe */
  startPath: string;
};

export const RECIPES: readonly Recipe[] = [
  {
    slug: "values",
    title: "Deine Werte entdecken",
    description:
      "Finde heraus, was dir wirklich wichtig ist. Ein 7-Tage-Tagebuch, um deine inneren Werte zu erkennen und zu verstehen, was dich antreibt.",
    icon: "Heart",
    duration: "7–14 Tage",
    available: true,
    startPath: "/recipes/values/hypothesis",
  },
  {
    slug: "wants",
    title: "Was du wirklich willst",
    description:
      "Lerne deine eigenen Wünsche von fremden Erwartungen zu unterscheiden und herauszufinden, wohin du dich entwickeln möchtest.",
    icon: "Compass",
    duration: "14–21 Tage",
    available: false,
    startPath: "/recipes/wants",
  },
  {
    slug: "bill-of-rights",
    title: "Dein Bill of Rights",
    description:
      "Erstelle deine persönlichen Grundrechte – innere Regeln, die dich schützen und dir helfen, authentisch zu leben.",
    icon: "Shield",
    duration: "7 Tage",
    available: true,
    startPath: "/recipes/bill-of-rights",
  },
  {
    slug: "saying-no",
    title: "Nein sagen lernen",
    description:
      "Übe, Grenzen zu setzen, ohne Schuldgefühle. Für alle, die oft Ja sagen, obwohl sie Nein meinen.",
    icon: "XCircle",
    duration: "14 Tage",
    available: false,
    startPath: "/recipes/saying-no",
  },
  {
    slug: "overthinking",
    title: "Grübelspiralen durchbrechen",
    description:
      "Stopp den Gedankenkarussell. Eine geführte Übung, um aus der Überanalyse auszusteigen und klar zu entscheiden.",
    icon: "Brain",
    duration: "15 Minuten",
    available: true,
    startPath: "/recipes/overthinking",
  },
  {
    slug: "shadow",
    title: "Deine Schattenseite",
    description:
      "Was du an dir selbst nicht sehen willst, hat mehr Macht über dich. Lerne deine Schattenseite kennen und integriere sie.",
    icon: "Moon",
    duration: "14–21 Tage",
    available: false,
    startPath: "/recipes/shadow",
  },
] as const;

/**
 * Look up a recipe by its slug.
 * Returns the recipe object or undefined if no match is found.
 */
export function getRecipeBySlug(slug: string): Recipe | undefined {
  return RECIPES.find((r) => r.slug === slug);
}