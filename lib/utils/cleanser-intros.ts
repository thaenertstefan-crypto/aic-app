/**
 * Intro-Texte für die Cleanser (analog zu lib/utils/recipe-intros.ts aus
 * Schritt 6.10, nur schlanker).
 *
 * Im Gegensatz zu den Rezepten gibt es hier keine durchklickbare Sequenz,
 * sondern pro Cleanser genau einen kurzen "Worum geht's?"-Block, der bei
 * Bedarf aufgeklappt wird. Die Texte sind erste Entwürfe in der warmen,
 * informellen AIC-Stimme ("du") und vom Nutzer frei pflegbar — die
 * Komponente bleibt generisch.
 *
 * Slugs gegen app/(app)/cleansers/* geprüft: "mantra", "promises" und
 * "confidence" sind die aktuell verfügbaren Cleanser.
 */

export type CleanserIntro = { title: string; body: string };

export const CLEANSER_INTROS: Record<string, CleanserIntro> = {
  mantra: {
    title: "Worum geht's?",
    body: "Eine kurze tägliche Reflexion: Du liest dein eigenes Mantra, gehst ein paar Reframe-Karten durch und hakst ab. So festigst du Tag für Tag eine liebevollere innere Stimme — in nur ein, zwei Minuten.",
  },
  promises: {
    title: "Worum geht's?",
    body: "Kleine, konkrete Versprechen an dich selbst, die du Tag für Tag hältst. Jedes gehaltene Versprechen ist ein Beweis: Du kannst dich auf dich verlassen. Fang klein an — Hauptsache, du ziehst es wirklich durch.",
  },
  confidence: {
    title: "Worum geht's?",
    body: "Fünf kleine Tricks für mehr Präsenz im Moment: kurz innehalten, ehrlich „Ich weiß es nicht“ sagen, kleinmachende Füllwörter streichen, deine Stimme ruhig führen und mit der 4-7-8-Atmung runterfahren. Tipp dich durch und probier sie vor deinem nächsten Auftritt aus.",
  },
};

/**
 * Liefert die Intro für ein Cleanser anhand seines Slugs.
 * Gibt null zurück, wenn für den Slug keine Intro hinterlegt ist.
 */
export function getCleanserIntro(slug: string): CleanserIntro | null {
  return CLEANSER_INTROS[slug] ?? null;
}
