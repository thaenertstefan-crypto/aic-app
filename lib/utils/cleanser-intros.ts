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
 * Aktuelle Slugs: "confidence-boost" (Merge aus Mantra Cleanser + Showstopper
 * Confidence, lebt unter /booster/confidence) und "promises". Der neue Slug
 * nach dem Merge ist Absicht: so sehen auch Nutzer, die die alten Intros
 * kannten, die Merged-Intro genau einmal automatisch (cleanser_intro_seen
 * trackt pro Slug; verwaiste "mantra"/"confidence"-Zeilen sind harmlos).
 */

export type CleanserIntro = { title: string; body: string };

export const CLEANSER_INTROS: Record<string, CleanserIntro> = {
  "confidence-boost": {
    title: "Worum geht's?",
    body: "Zwei Werkzeuge in einem: Der „Gleich bin ich dran“-Flow macht dich in fünf Minuten bereit, wenn du gleich auftrittst — Atmung, Körper, Stimme, dein Mantra. Und das tägliche Ritual festigt nebenbei deine liebevollere innere Stimme: Mantra lesen, Reframe-Karten durchgehen, abhaken.",
  },
  promises: {
    title: "Worum geht's?",
    body: "Kleine, konkrete Versprechen an dich selbst, die du Tag für Tag hältst. Jedes gehaltene Versprechen ist ein Beweis: Du kannst dich auf dich verlassen. Fang klein an — Hauptsache, du ziehst es wirklich durch.",
  },
};

/**
 * Liefert die Intro für ein Cleanser anhand seines Slugs.
 * Gibt null zurück, wenn für den Slug keine Intro hinterlegt ist.
 */
export function getCleanserIntro(slug: string): CleanserIntro | null {
  return CLEANSER_INTROS[slug] ?? null;
}
