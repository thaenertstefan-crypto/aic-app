const QUESTION_CLASS = "font-heading text-lg font-medium text-foreground";

/**
 * Rein präsentationale Fokus-Frage. Sie liegt in `daily-focus.tsx` **innerhalb**
 * des fadenden Taktgeber-Wrappers und erbt dessen Opacity — eigene Transition
 * oder Sichtbarkeits-Logik braucht sie nicht. `null` = keine Frage anzeigen;
 * Mount/Unmount passiert nur beim Swap der Crossfade-Maschine (Opacity 0),
 * weil die Frage-Präsenz Teil des Fade-Tokens ist.
 */
export function FocusQuestion({ question }: { question: string | null }) {
  if (question === null) return null;

  return (
    <p aria-live="polite" className={QUESTION_CLASS}>
      {question}
    </p>
  );
}
