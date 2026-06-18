"use client";

import { useEffect, useState } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/** Halbe Überblendung in ms — out + in ≈ 0,5 s gesamt. */
const FADE_MS = 250;

const QUESTION_CLASS = "font-heading text-base text-foreground/90";

/**
 * Blendet die Fokus-Frage beim Wechsel sanft über: aktuellen Text ausblenden,
 * Text tauschen, neuen Text einblenden. Respektiert `prefers-reduced-motion`
 * (dann sofortiger Wechsel ohne Animation). `null` = keine Frage anzeigen.
 */
export function FocusQuestion({ question }: { question: string | null }) {
  const reduced = useReducedMotion();
  const [displayed, setDisplayed] = useState<string | null>(question);
  const [visible, setVisible] = useState<boolean>(question !== null);

  // Effect 1 — auf Frage-Wechsel reagieren: aktuellen Text ausblenden, dann tauschen.
  // Das Einblenden übernimmt bewusst Effect 2 (am `displayed`-Wechsel), damit es nicht
  // vom Cleanup dieses Effects abgebrochen wird (sonst bliebe die Frage unsichtbar).
  useEffect(() => {
    // Bei reduzierter Bewegung rendert die Komponente direkt aus `question`.
    if (reduced || question === displayed) return;

    // War nichts sichtbar, entfällt die Ausblende-Phase (sofort tauschen).
    const delay = displayed === null ? 0 : FADE_MS;
    const swap = setTimeout(() => setDisplayed(question), delay);

    // Aktuellen Text ausblenden (nur wenn überhaupt einer sichtbar ist).
    let fadeOut = 0;
    if (displayed !== null) {
      fadeOut = requestAnimationFrame(() => setVisible(false));
    }

    return () => {
      clearTimeout(swap);
      cancelAnimationFrame(fadeOut);
    };
  }, [question, displayed, reduced]);

  // Effect 2 — neuen Text einblenden, sobald `displayed` wechselt.
  useEffect(() => {
    if (reduced || displayed === null) return;

    const fadeIn = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(fadeIn);
  }, [displayed, reduced]);

  if (reduced) {
    return question === null ? null : (
      <p aria-live="polite" className={QUESTION_CLASS}>
        {question}
      </p>
    );
  }

  if (displayed === null) return null;

  return (
    <p
      aria-live="polite"
      className={cn(
        QUESTION_CLASS,
        "transition-opacity",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      {displayed}
    </p>
  );
}
