"use client";

import { CROSSFADE_MS, useCrossfade } from "@/lib/hooks/use-crossfade";
import { cn } from "@/lib/utils";

const QUESTION_CLASS = "font-heading text-lg font-medium text-foreground/90";

/** Token-Marker für „keine Frage anzeigen" (kollidiert mit keinem echten
 *  Fragetext). */
const NO_QUESTION_TOKEN = " none";

/**
 * Blendet die Fokus-Frage beim Wechsel sanft über: aktuellen Text ausblenden,
 * Text tauschen, neuen Text einblenden. Läuft über dieselbe `useCrossfade`-
 * Maschine wie die Empfehlungskarte (`crossfade.tsx`), damit Frage und
 * Empfehlung bei einem Stimmungswechsel synchron wechseln. Respektiert
 * `prefers-reduced-motion` (dann sofortiger Wechsel ohne Animation). `null` =
 * keine Frage anzeigen.
 */
export function FocusQuestion({ question }: { question: string | null }) {
  const token = question ?? NO_QUESTION_TOKEN;
  const { shown, visible, reduced } = useCrossfade(token, question);

  if (reduced) {
    return question === null ? null : (
      <p aria-live="polite" className={QUESTION_CLASS}>
        {question}
      </p>
    );
  }

  if (shown.value === null) return null;

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
      {shown.value}
    </p>
  );
}
