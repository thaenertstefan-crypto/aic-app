import { CROSSFADE_MS } from "@/lib/hooks/use-crossfade";
import { cn } from "@/lib/utils";

const QUESTION_CLASS = "font-heading text-lg font-medium text-foreground/90";

/**
 * Rein präsentationale Fokus-Frage. Text **und** Sichtbarkeit kommen von außen
 * (`daily-focus.tsx`), damit Frage und Empfehlungskarte über **dieselbe**
 * Crossfade-Maschine synchron überblenden. `null` = keine Frage anzeigen.
 * Die Opacity-Transition nutzt dasselbe Timing (`CROSSFADE_MS`) wie der restliche
 * Fokus-Block; bei reduzierter Bewegung bleibt `visible` konstant `true`, sodass
 * kein Übergang ausgelöst wird.
 */
export function FocusQuestion({
  question,
  visible,
}: {
  question: string | null;
  visible: boolean;
}) {
  if (question === null) return null;

  return (
    <p
      aria-live="polite"
      className={cn(
        QUESTION_CLASS,
        "transition-opacity",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{ transitionDuration: `${CROSSFADE_MS}ms` }}
    >
      {question}
    </p>
  );
}
