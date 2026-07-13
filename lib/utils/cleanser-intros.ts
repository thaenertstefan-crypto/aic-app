import type { IntroCard } from "@/lib/utils/recipe-intros";

/**
 * Intro-Karten für Cleanser — gleiches Karten-Format wie RECIPE_INTROS,
 * damit RecipeIntro/IntroInfoButton sie direkt rendern können. Der
 * "schon gesehen?"-Status läuft weiter über cleanser_intro_seen
 * (siehe app/(app)/cleansers/actions.ts).
 *
 * Aktuell einziger Slug: "confidence-boost" (Merge aus Mantra Cleanser +
 * Showstopper Confidence, lebt unter /booster/confidence).
 */
export const CLEANSER_INTROS: Record<string, IntroCard[]> = {
  "confidence-boost": [
    {
      title: "Kennst du das?",
      body: "Gleich bist du dran — und dein Kopf ruft: „Hoffentlich blamier ich mich nicht.“ Herzklopfen, flache Atmung, die Stimme wird dünn. Das ist kein Charakterfehler, das ist dein Körper im Alarmmodus. Die gute Nachricht: Selbstvertrauen ist keine Eigenschaft, mit der man geboren wird. Es ist eine Fähigkeit — und Fähigkeiten kann man trainieren.",
    },
    {
      title: "„Gleich bin ich dran“ — dein 5-Minuten-Boost",
      body: "Auftritt, Meeting, Prüfung, schwieriges Gespräch? Der geführte Flow macht dich in fünf Minuten bereit: Erst beruhigst du mit der 4-7-8-Atmung deinen Fight-or-Flight-Reflex, dann gibst du dem Adrenalin eine stille Aufgabe, wärmst deine Stimme auf — und nimmst dein Mantra mit rein.",
    },
    {
      title: "Dein tägliches Mantra-Ritual",
      body: "Selbstvertrauen wächst nicht im Ausnahmezustand, sondern nebenbei: einmal am Tag dein Mantra lesen, deine Reframe-Karten durchgehen, abhaken. Mantra und Karten kannst du komplett zu deinen machen — und deine Serie zeigt dir, wie du dranbleibst. Bereit?",
    },
  ],
};

/**
 * Liefert die Intro-Karten für ein Cleanser anhand seines Slugs.
 * Gibt null zurück, wenn für den Slug keine Intro hinterlegt ist.
 */
export function getCleanserIntro(slug: string): IntroCard[] | null {
  return CLEANSER_INTROS[slug] ?? null;
}
