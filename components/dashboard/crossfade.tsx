"use client";

import { type ReactNode } from "react";

import { CROSSFADE_MS, useCrossfade } from "@/lib/hooks/use-crossfade";
import { cn } from "@/lib/utils";

/**
 * Blendet beliebige `children` beim Wechsel des `token` sanft über: aktuellen
 * Inhalt ausblenden, tauschen, neuen Inhalt einblenden. Läuft über die geteilte
 * `useCrossfade`-Maschine, damit der Wechsel exakt synchron zur Fokus-Frage
 * (`focus-question.tsx`) verläuft. Respektiert `prefers-reduced-motion` (dann
 * sofortiger Wechsel ohne Animation).
 */
export function Crossfade({
  token,
  children,
  className,
}: {
  token: string;
  children: ReactNode;
  className?: string;
}) {
  const { shown, visible, reduced, onTransitionEnd, fadeRef } =
    useCrossfade<ReactNode>(token, children);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  // Bei stabilem Token (oder nach dem Swap) die LIVE children rendern, damit
  // interaktive Inhalte (kontrollierte Inputs, Radios, Slider) funktionieren —
  // der eingefrorene Snapshot `shown.value` wird nur während der Ausblend-Phase
  // gezeigt (Token bereits gewechselt, Swap noch ausstehend), damit der alte
  // Inhalt sauber ausblendet.
  const content = shown.token === token ? children : shown.value;

  return (
    <div
      ref={(el) => {
        fadeRef.current = el;
      }}
      className={cn(
        "transition-opacity",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
      style={{ transitionDuration: `${CROSSFADE_MS}ms` }}
      onTransitionEnd={onTransitionEnd}
    >
      {content}
    </div>
  );
}
