import { cn } from "@/lib/utils";

/** 4-strahliger Stern (16er-Box) — dieselbe Silhouette wie in der Werte-Journey. */
const STAR_PATH = "M8 0 L9.8 6.2 L16 8 L9.8 9.8 L8 16 L6.2 9.8 L0 8 L6.2 6.2 Z";

/**
 * Briefing-Illustration der Sternschmiede: die Kompassrose (Werte, vgl.
 * CompassArt im /me-Hub) unter einem kleinen Sternenfeld (Sterne/Wants) —
 * die beiden Zutaten, aus denen Funken geschlagen werden. Rein dekorativ.
 */
export function CompassStarsArt({ className }: { className?: string }) {
  const stars = [
    { x: 18, y: 14, s: 1 },
    { x: 96, y: 6, s: 0.7 },
    { x: 118, y: 28, s: 0.55 },
    { x: 6, y: 42, s: 0.6 },
    { x: 112, y: 58, s: 0.8 },
  ];
  return (
    <svg
      viewBox="0 0 136 118"
      className={cn("h-28 w-auto", className)}
      aria-hidden="true"
    >
      {stars.map((st, i) => (
        <g
          key={i}
          transform={`translate(${st.x} ${st.y}) scale(${st.s})`}
          opacity={0.9}
        >
          <path d={STAR_PATH} fill="var(--primary)" />
        </g>
      ))}
      {/* Kompassrose */}
      <g transform="translate(36 50)">
        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--primary)" strokeWidth="1" opacity="0.35" />
        <circle cx="32" cy="32" r="20" fill="none" stroke="var(--primary)" strokeWidth="0.6" opacity="0.18" />
        <polygon points="32,10 35,32 32,30 29,32" fill="var(--primary)" opacity="0.9" />
        <polygon points="32,54 29,32 32,34 35,32" fill="var(--primary)" opacity="0.35" />
      </g>
    </svg>
  );
}
