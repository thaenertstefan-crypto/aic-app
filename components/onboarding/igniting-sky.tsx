"use client";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/**
 * Die Zünd-Sterne der Onboarding-Übergabe: sechs zusätzliche Lichter im
 * `sky-light`-Vokabular des [SkyBackdrop](../backdrops/sky-backdrop.tsx), die
 * gestaffelt (≈120 ms Abstand) in freien Bereichen des Himmels aufglimmen,
 * während die Karte fadet. Liegt auf derselben fixen -z-10-Ebene wie der
 * Backdrop, damit Onboarding und Dashboard als eine durchgehende Fläche gelesen
 * werden.
 *
 * Der Fade sitzt auf einem Wrapper-Span, nicht auf `.sky-light` selbst — die
 * Klasse bringt ihre eigene Ruhe-Opacity (0.38) mit, ein `fade-in` auf ihr
 * würde sie auf 1 hochziehen und heller als der restliche Himmel enden.
 */
const IGNITE: { pos: React.CSSProperties; big?: boolean; delay: number }[] = [
  { pos: { left: "26%", top: "20%" }, delay: 0 },
  { pos: { right: "18%", top: "28%" }, delay: 120 },
  { pos: { left: "14%", top: "36%" }, big: true, delay: 240 },
  { pos: { right: "30%", top: "16%" }, delay: 360 },
  { pos: { left: "62%", top: "26%" }, delay: 480 },
  { pos: { left: "40%", top: "45%" }, big: true, delay: 600 },
];

export function IgnitingSky() {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {IGNITE.map((s, i) => (
        <span
          key={i}
          className="absolute animate-in fade-in zoom-in-50"
          style={{
            ...s.pos,
            animationDelay: `${s.delay}ms`,
            animationDuration: "500ms",
            animationFillMode: "both",
          }}
        >
          <span
            className="sky-light block"
            style={s.big ? { width: "4px", height: "4px" } : undefined}
          />
        </span>
      ))}
    </div>
  );
}
