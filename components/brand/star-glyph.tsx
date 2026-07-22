import { cn } from "@/lib/utils";

/** Die 4-strahlige Marken-Sternglyphe — die von der Werte-Szene freigegebene
 *  Sprache, geteilt über Star-Map, Sternensuche und Abschluss. */
export const STAR_PATH =
  "M8 0 L9.8 6.2 L16 8 L9.8 9.8 L8 16 L6.2 9.8 L0 8 L6.2 6.2 Z";

export function StarGlyph({
  className,
  sizeClass = "size-6",
  glow = 6,
  dim = false,
  twinkle = false,
  fill = "var(--primary)",
}: {
  className?: string;
  sizeClass?: string;
  glow?: number;
  dim?: boolean;
  twinkle?: boolean;
  fill?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn("shrink-0", sizeClass, dim && "opacity-55", twinkle && "want-star-twinkle", className)}
      style={{
        filter: `drop-shadow(0 0 ${glow}px color-mix(in srgb, var(--primary) ${dim ? 35 : 55}%, transparent))`,
      }}
    >
      <path d={STAR_PATH} fill={fill} />
    </svg>
  );
}
