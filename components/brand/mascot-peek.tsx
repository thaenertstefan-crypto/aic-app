"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { Mascot, type MascotExpression, type MascotSize } from "@/components/brand/mascot";
import { cn } from "@/lib/utils";

type MascotPeekProps = {
  from?: "left" | "right" | "bottom" | "top";
  expression?: MascotExpression;
  size?: MascotSize;
  pulseSeconds?: number;
  gazeX?: number;
  gazeY?: number;
  /** Ruhe-Rotation in Grad (gegen den Uhrzeigersinn = negativ). Wird über GSAP
   *  gefahren, damit sie mit der Slide-in-Animation harmoniert. */
  rotate?: number;
  /** Optionales Overlay, das innerhalb des ge-rotateten Containers liegt — kippt
   *  und gleitet also mit dem Mascot mit (z. B. ein Notizblock, den er „hält"). */
  accessory?: ReactNode;
  className?: string;
  /** Inline-Styles am Wurzel-Container — z. B. für Safe-Area-Insets, die sich
   *  nicht sauber als Tailwind-Klasse ausdrücken lassen. */
  style?: React.CSSProperties;
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
  gazeY,
  rotate = 0,
  accessory,
  className,
  style,
}: MascotPeekProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const resolvedGazeX =
    gazeX ??
    (from === "bottom" || from === "top"
      ? 0
      : from === "right"
        ? -3.5
        : 3.5);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduced) {
      gsap.set(el, { x: 0, y: 0, opacity: 1, rotation: rotate });
      return;
    }

    // Startversatz je nach Kante: von rechts/links horizontal, von unten/oben vertikal.
    const fromVars =
      from === "bottom" || from === "top"
        ? { y: from === "bottom" ? 90 : -90, opacity: 0, rotation: rotate }
        : { x: from === "right" ? 90 : -90, opacity: 0, rotation: rotate };

    const tween = gsap.fromTo(el, fromVars, {
      x: 0,
      y: 0,
      opacity: 1,
      rotation: rotate,
      duration: 1,
      ease: "power3.out",
      delay: 0.3,
    });

    return () => {
      tween.kill();
    };
  }, [reduced, from, rotate]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)} style={style}>
      <Mascot
        expression={expression}
        pulseSeconds={pulseSeconds}
        size={size}
        gazeX={resolvedGazeX}
        gazeY={gazeY}
      />
      {accessory}
    </div>
  );
}
