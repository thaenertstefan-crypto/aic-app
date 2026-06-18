"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { Mascot, type MascotExpression, type MascotSize } from "@/components/brand/mascot";
import { cn } from "@/lib/utils";

type MascotPeekProps = {
  from?: "left" | "right";
  expression?: MascotExpression;
  size?: MascotSize;
  pulseSeconds?: number;
  gazeX?: number;
  className?: string;
};

/**
 * Lässt den Mascot von einer Bildschirmkante sanft ins Bild gleiten —
 * für Einstiegs-Momente wie den Auth-Hero oder die Login-Karte. Blickt
 * standardmäßig in Richtung Bildmitte (abhängig davon, von welcher Seite
 * er kommt), außer ein expliziter gazeX wird übergeben.
 *
 * Respektiert prefers-reduced-motion: erscheint direkt an Endposition,
 * keine Translate-Animation.
 */
export function MascotPeek({
  from = "right",
  expression = "curious",
  size = "lg",
  pulseSeconds = 3.4,
  gazeX,
  className,
}: MascotPeekProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const resolvedGazeX = gazeX ?? (from === "right" ? -3.5 : 3.5);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduced) {
      gsap.set(el, { x: 0, opacity: 1 });
      return;
    }

    const startX = from === "right" ? 90 : -90;
    const tween = gsap.fromTo(
      el,
      { x: startX, opacity: 0 },
      { x: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.3 },
    );

    return () => {
      tween.kill();
    };
  }, [reduced, from]);

  return (
    <div ref={ref} className={cn("inline-block", className)}>
      <Mascot expression={expression} pulseSeconds={pulseSeconds} size={size} gazeX={resolvedGazeX} />
    </div>
  );
}
