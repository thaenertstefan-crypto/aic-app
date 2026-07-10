import { cn } from "@/lib/utils";

/**
 * Glühender Stern — Signatur-Ornament der Wants ("die Sterne, nach denen du
 * greifst"). Geschwister zu CompassArt/SealArt: prozedurales SVG in --primary.
 * `dim` blasst ihn aus (leerer Zustand), `animate` lässt ihn sanft pulsieren.
 */
export function StarArt({
  animate,
  dim = false,
  className,
}: {
  animate: boolean;
  dim?: boolean;
  className?: string;
}) {
  // 5-zackiger Stern, zentriert in 64×64.
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 22 : 9;
    const a = (Math.PI * (i * 36 - 90)) / 180;
    return `${(32 + r * Math.cos(a)).toFixed(2)},${(32 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-14", dim && "opacity-40", className)}
      aria-hidden="true"
    >
      <circle
        cx="32"
        cy="32"
        r="26"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="0.6"
        opacity="0.16"
      />
      <g className={animate ? "me-star-glow" : undefined}>
        <polygon points={points} fill="var(--primary)" opacity="0.9" />
        <polygon points={points} fill="none" stroke="var(--primary)" strokeWidth="1" opacity="0.35" />
      </g>
    </svg>
  );
}
