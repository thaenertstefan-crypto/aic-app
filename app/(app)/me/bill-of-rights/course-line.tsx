import type { CSSProperties } from "react";

/**
 * „Der gesteuerte Kurs" — das einzige einzigartige Bill-of-Rights-Szenenelement.
 * Eine feine gepunktete Kurslinie mit Wegpunkten, rein atmosphärisch über dem
 * geteilten SkyBackdrop. Bewusst KEIN Kompass (= Werte) und KEINE
 * Sterne-als-Hauptsache (= Wants): die „Linien, nach denen du steuerst".
 *
 * Modulfarbe der Bill of Rights ist Sage (DESIGN.md) und lebt ausschließlich im
 * Szenen-Ornament — die Wegpunkte tragen einen Sage-Glow über --scene-glow. Die
 * Linie bleibt gedämpftes Foreground. Gold bleibt unangetastet (Aktionsfarbe).
 *
 * Rein gemalt (SVG), kein backdrop-filter. Linie + Wegpunkte sind immer sichtbar
 * (statischer Default, kein class-getriggertes Reveal); nur der Wegpunkt-Glow
 * pulst langsam. Reduced motion: komplett statisch, weiterhin sichtbar.
 */

const WAYPOINTS: { x: number; y: number; delay: number }[] = [
  { x: 352, y: 150, delay: 0 },
  { x: 300, y: 300, delay: 1.8 },
  { x: 190, y: 440, delay: 3.4 },
  { x: 108, y: 560, delay: 2.4 },
  { x: 48, y: 720, delay: 4.6 },
];

export function CourseLine() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 800"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
      style={{ "--scene-glow": "var(--success)" } as CSSProperties}
    >
      {/* Gepunktete Kurslinie: tritt oben rechts ein, schwingt nach unten/links
          hinaus. Gedämpftes Foreground, damit sie „gechartert" liest. */}
      <path
        d="M356 40 C 392 210, 320 330, 236 424 C 170 498, 96 606, 40 784"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="0.5 11"
        opacity={0.3}
      />
      {/* Wegpunkte — hier lebt die Modulfarbe (Sage-Glow über --scene-glow). */}
      {WAYPOINTS.map((w, i) => (
        <circle
          key={i}
          cx={w.x}
          cy={w.y}
          r={2.6}
          fill="var(--foreground)"
          className="course-waypoint"
          style={{ animationDelay: `${w.delay}s` }}
        />
      ))}
    </svg>
  );
}
