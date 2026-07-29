import { cn } from "@/lib/utils";

/**
 * Signatur-Ornamente des /me-Hubs, prozedurale SVGs in --primary. Geschwister
 * zu [StarArt](./star-art.tsx) — hier zentral, damit sie sowohl der Hub
 * ([me-hub.tsx]) als auch die Onboarding-Vorschau ([intro-previews.tsx]) aus
 * einer Quelle rendern (Preview kann nicht mehr von der Realität abdriften).
 * `className` überschreibt die Default-Größe (z. B. `size-9` in der Preview).
 */

/** Kompassrose mit den echten Werte-Emojis als Himmelsrichtungen (Werte). */
export function CompassArt({
  emojis,
  animate,
  className,
}: {
  emojis: string[];
  animate: boolean;
  className?: string;
}) {
  const pos = [
    { x: 32, y: 16 }, // N
    { x: 50, y: 35 }, // O
    { x: 32, y: 54 }, // S
    { x: 14, y: 35 }, // W
  ];
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-14", emojis.length === 0 && "opacity-40", className)}
      aria-hidden="true"
    >
      <circle
        cx="32"
        cy="32"
        r="26"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.2"
        opacity="0.5"
        className={animate ? "me-ring-draw" : undefined}
      />
      <circle cx="32" cy="32" r="20" fill="none" stroke="var(--primary)" strokeWidth="0.8" opacity="0.3" />
      <g className={animate ? "me-needle-sway" : undefined}>
        <polygon points="32,10 35,32 32,30 29,32" fill="var(--primary)" opacity="0.95" />
        <polygon points="32,54 29,32 32,34 35,32" fill="var(--primary)" opacity="0.5" />
      </g>
      {emojis.slice(0, 4).map((e, i) => (
        <text key={i} x={pos[i].x} y={pos[i].y} textAnchor="middle" dominantBaseline="central" fontSize="9">
          {e}
        </text>
      ))}
    </svg>
  );
}

/** Goldenes Wachssiegel mit §-Prägung — 12 Bogenkreise (r=4) auf Radius 21 (Bill of Rights).
 *
 * `stamp` steuert den einmaligen Einzug (`me-seal-stamp`, 0,5 s) getrennt vom
 * Dauer-Glühen. Im /me-Hub trägt `Reveal` (0,6 s) die Ankunft, Stempel und Glow
 * sind exakt darauf getuned — dort bleibt er an. In der Onboarding-Karte ist der
 * `Crossfade` (0,25 s) die Ankunft; ein 0,5-s-Stempel obendrauf lief dort hinter
 * der Karte her und las sich als zweiter, das anschließende Glühen als dritter
 * Takt. Mit `stamp={false}` kommt das Siegel MIT der Karte und glüht danach —
 * eine Bewegung statt drei. */
export function SealArt({
  animate,
  stamp = true,
  className,
}: {
  animate: boolean;
  stamp?: boolean;
  className?: string;
}) {
  const scallops = Array.from({ length: 12 }, (_, k) => {
    const rad = (Math.PI * (k * 30)) / 180;
    return {
      cx: +(28 + 21 * Math.cos(rad)).toFixed(2),
      cy: +(28 + 21 * Math.sin(rad)).toFixed(2),
    };
  });
  return (
    <span className={cn("inline-block", animate && stamp && "me-seal-stamp")}>
      <svg
        viewBox="0 0 56 56"
        className={cn("size-12", animate && "me-seal-glow", className)}
        style={
          {
            transform: "rotate(-6deg)",
            "--scene-glow": "var(--success)",
          } as React.CSSProperties
        }
        aria-hidden="true"
      >
        {scallops.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r="4" fill="var(--primary)" opacity="0.9" />
        ))}
        <circle cx="28" cy="28" r="21" fill="var(--primary)" opacity="0.95" />
        <circle cx="28" cy="28" r="15" fill="none" stroke="var(--primary-foreground)" strokeWidth="1" opacity="0.3" />
        <text
          x="28"
          y="34"
          textAnchor="middle"
          fontSize="17"
          fontFamily="var(--font-heading)"
          fontWeight="600"
          fill="var(--primary-foreground)"
        >
          §
        </text>
      </svg>
    </span>
  );
}
