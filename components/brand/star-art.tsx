import { cn } from "@/lib/utils";
import { STAR_PATH } from "@/components/brand/star-glyph";

/**
 * Glühender Stern — Signatur-Ornament der Wants. Nutzt dieselbe 4-strahlige
 * Marken-Sternglyphe (STAR_PATH) wie die echten Wants-Sterne (StarGlyph), damit
 * /me-Hub, Onboarding-Preview und die Wants-Seite eine Sprache sprechen.
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
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-14", dim && "opacity-40", className)}
      aria-hidden="true"
    >
      <g className={animate ? "me-star-glow" : undefined}>
        {/* Innere Gruppe trägt den Glitzer-Aufblitz — getrennt vom Grundschein,
            damit sich die beiden Animationen nicht um filter/opacity streiten. */}
        <g className={animate ? "me-star-sparkle" : undefined}>
          <path d={STAR_PATH} fill="var(--primary)" opacity={dim ? 0.6 : 0.95} />
        </g>
      </g>
    </svg>
  );
}
