"use client";

import { cn } from "@/lib/utils";

/**
 * Wetter-Bühne um das Dashboard-Maskottchen — reagiert auf den (optimistisch
 * getippten) Mood-Score. Linien-Wolken in Lavendel-Grau (Formsprache von
 * weather-art.tsx); rein dekorativ (aria-hidden). Rein/raus fliegen die
 * Elemente per CSS-Transition auf dem äußeren Wrapper (Opacity + Transform);
 * Drift/Regen/Wetterleuchten laufen als dash-*-Keyframes auf einem inneren
 * Wrapper, damit sich Transition und Animation nicht um transform streiten.
 * Reduced motion stellt die Loops in globals.css still.
 */

const STROKE = "var(--muted-foreground)";

function CloudSvg({
  heavy = false,
  opacity,
}: {
  heavy?: boolean;
  opacity?: number;
}) {
  const fillOpacity = opacity ?? (heavy ? 0.3 : 0.2);
  return (
    <svg viewBox="0 0 56 28" className={heavy ? "w-28" : "w-24"} aria-hidden="true">
      <g fill={STROKE} opacity={fillOpacity}>
        <circle cx="18" cy="16" r="8" />
        <circle cx="30" cy="12" r="10" />
        <circle cx="40" cy="17" r="7" />
        <rect x="10" y="16" width="37" height="9" rx="4.5" />
      </g>
    </svg>
  );
}

/** Äußerer Flug-Wrapper: sichtbar = an Ort und Stelle, sonst seitlich ganz raus. */
function flyClass(visible: boolean, hiddenShift: string): string {
  return cn(
    "absolute transition-[opacity,transform] duration-[900ms] ease-in-out",
    visible ? "translate-x-0 opacity-100" : cn("opacity-0", hiddenShift),
  );
}

export function MascotWeather({ score }: { score: number }) {
  // 1 = Gewitterwolke + Regen + Wetterleuchten, 2 = zwei Wolken,
  // 3 = eine ruhige Wolke, 4–5 = wolkenlos.
  const storm = score === 1;
  const cloudA = score === 2 || score === 3;
  const cloudB = score === 2;

  return (
    // Wolken sind relativ zum Maskottchen (inset-0 dieses size-32-Kästchens)
    // verankert. Beim Mood-Wechsel fliegen sie ~60vw seitlich raus/rein; der
    // <main>-Wrapper (overflow-x-clip) schneidet sie am Viewport-Rand ab, sodass
    // sie sichtbar aus dem Bild fliegen, ohne die Seite scrollbar zu machen.
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Ruhige Wolke (Score 2–3), oben links vom Maskottchen */}
      <span className={cn(flyClass(cloudA, "-translate-x-[60vw]"), "-left-14 -top-6")}>
        <span className="block dash-cloud-drift">
          <CloudSvg />
        </span>
      </span>

      {/* Zweite Wolke (Score 2), rechts, etwas tiefer */}
      <span className={cn(flyClass(cloudB, "translate-x-[60vw]"), "-right-16 top-4")}>
        <span className="block dash-cloud-drift dash-cloud-drift-2">
          <CloudSvg />
        </span>
      </span>

      {/* Gewitter (Score 1): schwere Wolke + Regenstriche + Wetterleuchten */}
      <span className={cn(flyClass(storm, "-translate-x-[60vw]"), "-left-16 -top-8")}>
        <span className="relative block dash-cloud-drift">
          <span
            className="dash-sheetlight absolute -inset-3 rounded-full opacity-0"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in srgb, var(--primary) 28%, transparent), transparent 70%)",
            }}
          />
          <CloudSvg heavy opacity={0.34} />
          <svg viewBox="0 0 56 22" className="w-28" aria-hidden="true">
            <path className="dash-rain" d="M16 2 l-2 7" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
            <path className="dash-rain dash-rain-2" d="M28 1 l-2 7" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
            <path className="dash-rain dash-rain-3" d="M40 3 l-2 7" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
          </svg>
        </span>
      </span>

      {/* Gewitter (Score 1): zweite, kleinere Regenwolke rechts, tiefer versetzt */}
      <span className={cn(flyClass(storm, "translate-x-[60vw]"), "-right-14 top-6")}>
        <span className="relative block dash-cloud-drift dash-cloud-drift-2">
          <CloudSvg opacity={0.26} />
          <svg viewBox="0 0 56 22" className="w-24" aria-hidden="true">
            <path className="dash-rain dash-rain-2" d="M16 2 l-2 7" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
            <path className="dash-rain" d="M28 1 l-2 7" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
            <path className="dash-rain dash-rain-3" d="M40 3 l-2 7" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
          </svg>
        </span>
      </span>
    </div>
  );
}
