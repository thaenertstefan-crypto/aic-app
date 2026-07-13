import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Sternschmiede-Motiv — ein Amboss, auf dem ein glühender Stern geschmiedet
 * wird. Geschwister zu StarArt: prozedurales SVG in --primary / --card, kein
 * Bild-Asset. Ersetzt das Maskottchen als Held der Schmiede.
 *
 * `animate` lässt den Stern sanft glühen und die Funken flackern.
 * `active` (Ladezustand „Ich schlage Funken…") blendet einen Hammer ein, der
 * auf den Stern schlägt, und zeigt mehr Funken. Alle Bewegung hat in globals.css
 * einen reduced-motion-Fallback (.me-star-glow, .bs-ember, .forge-hammer).
 */
export function AnvilArt({
  animate,
  active = false,
  className,
}: {
  animate: boolean;
  active?: boolean;
  className?: string;
}) {
  const uid = useId();

  // 5-zackiger Stern, klein, auf der Amboss-Fläche (Zentrum 33,26).
  const starPts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 8 : 3.4;
    const a = (Math.PI * (i * 36 - 90)) / 180;
    return `${(33 + r * Math.cos(a)).toFixed(2)},${(26 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-24", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`anvil-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="color-mix(in srgb, var(--primary) 22%, var(--card))" />
          <stop offset="100%" stopColor="var(--card)" />
        </linearGradient>
        <radialGradient id={`forgeGlow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Glut-Schein unter dem Stern, auf der Amboss-Fläche. */}
      <ellipse cx="33" cy="30" rx="13" ry="5" fill={`url(#forgeGlow-${uid})`} />

      {/* Amboss: Fläche + Horn (links), Taille, Fuß. */}
      <g
        fill={`url(#anvil-${uid})`}
        stroke="color-mix(in srgb, var(--primary) 30%, transparent)"
        strokeWidth="0.75"
        strokeLinejoin="round"
      >
        <polygon points="10,40 21,35 48,35 48,43 21,43" />
        <polygon points="27,43 42,43 39,49 30,49" />
        <polygon points="20,49 48,49 50,56 17,56" />
      </g>
      {/* Oberkante der Amboss-Fläche als feiner Lichtstrich (geschmiedetes Metall). */}
      <line
        x1="21"
        y1="35.4"
        x2="48"
        y2="35.4"
        stroke="color-mix(in srgb, var(--primary) 45%, transparent)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Der geschmiedete Stern. */}
      <g className={animate ? "me-star-glow" : undefined}>
        <polygon points={starPts} fill="var(--primary)" opacity="0.92" />
        <polygon points={starPts} fill="none" stroke="var(--primary)" strokeWidth="0.9" opacity="0.4" />
      </g>

      {/* Funken über der Fläche — im aktiven Zustand mehr und heller. */}
      <g fill="var(--primary)">
        <circle cx="24" cy="22" r="1" className={animate ? "bs-ember" : undefined} opacity="0.8" />
        <circle cx="42" cy="24" r="0.9" className={animate ? "bs-ember bs-ember-2" : undefined} opacity="0.7" />
        {active && (
          <>
            <circle cx="38" cy="18" r="1.1" className={animate ? "bs-ember" : undefined} />
            <circle cx="28" cy="17" r="0.9" className={animate ? "bs-ember bs-ember-2" : undefined} />
            <circle cx="33" cy="15" r="0.8" className={animate ? "bs-ember" : undefined} opacity="0.6" />
          </>
        )}
      </g>

      {/* Hammer (nur Ladezustand): Kopf über dem Stern, Stiel nach oben-rechts.
          .forge-hammer schlägt rhythmisch herunter (Pivot am Stielende). */}
      {active && (
        <g className={animate ? "forge-hammer" : undefined}>
          <rect
            x="27"
            y="10"
            width="12"
            height="6"
            rx="1.6"
            fill="color-mix(in srgb, var(--primary) 30%, var(--card))"
            stroke="color-mix(in srgb, var(--primary) 45%, transparent)"
            strokeWidth="0.75"
          />
          <line
            x1="38"
            y1="13"
            x2="50"
            y2="5"
            stroke="color-mix(in srgb, var(--primary) 55%, var(--card))"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}
