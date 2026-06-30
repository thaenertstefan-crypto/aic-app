"use client";

import { Mascot } from "@/components/brand/mascot";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/** Atemzyklus der Perücke — identisch zum Blob (siehe mascot.tsx: pulseSeconds
 *  default 3 s). */
const WIG_PULSE_SECONDS = 3;

/** Weiße Barrister-Perücke — im 0 0 64 64-Raum des Mascot-Gesichts gerendert,
 *  liegt also passgenau über dem Kopf. Bewusst NICHT vom Blob beschnitten: die
 *  Perücke wird als eigenes overflow-visible-SVG über dem Mascot gerendert (nicht
 *  als Blob-Overlay), sodass Krone und Seitenlocken über den Blobrand hinausragen
 *  statt an ihm zu enden. Die Seitenlocken sitzen ganz außen (x≈3 / x≈61); über
 *  den Augen (y≈27) bleibt die Stirn frei. Die Krone hat zwei eng beieinander
 *  liegende Scheitelhügel, die sich zur Mitte hin zum Mittelscheitel einsenken. */
const JudgeWig = (
  <g fill="var(--foreground)" stroke="rgba(0,0,0,0.10)" strokeWidth="0.5">
    {/* Krone — zwei eng stehende Hügel (x≈24 / x≈40), die sich mittig zum
        Scheitel einsenken, außen weit über den Blobrand hinaus */}
    <path d="M-3,25.5 Q-6,-0.5 24,-1.5 Q29,-0.5 32,2.5 Q35,-0.5 40,-1.5 Q70,-0.5 67,25.5 Q50,11.5 32,11.5 Q14,11.5 -3,25.5 Z" />
    {/* Mittelscheitel */}
    <path
      d="M32,2.5 L32,10.5"
      fill="none"
      stroke="rgba(0,0,0,0.13)"
      strokeWidth="1"
      strokeLinecap="round"
    />
    {/* Seitenlocken links — ganz außen an der Blob-Kante */}
    <circle cx="3" cy="22.5" r="6" />
    <circle cx="2" cy="30.5" r="5.5" />
    <circle cx="4" cy="37.5" r="5" />
    {/* Seitenlocken rechts */}
    <circle cx="61" cy="22.5" r="6" />
    <circle cx="62" cy="30.5" r="5.5" />
    <circle cx="60" cy="37.5" r="5" />
  </g>
);

/** Richter-Hammer (Gavel) als Requisit — eigenes, kleines SVG im 0 0 40 40-Raum.
 *  Liegt unten rechts schräg am Blob „an" (Rotation am Wrapper), Stiel zeigt nach
 *  oben/links, der Kopf ruht unten. Liegt außerhalb des Blobs, wird also nicht
 *  beschnitten. Holzbraune Töne mit dunkleren Endkappen. */
const JudgeGavel = (
  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
    {/* Stiel */}
    <rect
      x="17.5"
      y="14"
      width="5"
      height="24"
      rx="2.5"
      fill="#a06a3c"
      stroke="rgba(74,46,22,0.55)"
      strokeWidth="1"
    />
    {/* Hammerkopf-Korpus */}
    <rect
      x="6"
      y="6"
      width="28"
      height="11"
      rx="3.5"
      fill="#a06a3c"
      stroke="rgba(74,46,22,0.55)"
      strokeWidth="1"
    />
    {/* Endkappen (dunkleres Holz) */}
    <rect x="6" y="6" width="4.5" height="11" rx="2" fill="#6f4a28" />
    <rect x="29.5" y="6" width="4.5" height="11" rx="2" fill="#6f4a28" />
  </svg>
);

/**
 * Maskottchen in Richter-Verkleidung: Mascot mit weißer Perücke (Overlay) und
 * einem Richter-Hammer als Requisit, der unten rechts am Blob anlehnt. Nur für
 * /me/bill-of-rights gedacht.
 */
export function MascotJudge({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <div
      className={cn("relative mx-auto", className)}
      style={{ width: 120, height: 112 }}
      aria-hidden="true"
    >
      {/* Maskottchen, würdevoller Blick leicht nach unten */}
      <Mascot
        size="md"
        expression="smile"
        gazeX={0}
        gazeY={1}
        className="absolute left-1/2 top-0 -translate-x-1/2"
      />

      {/* Perücke ÜBER dem Blob — eigenes overflow-visible-SVG (kein Blob-Overlay),
          deckungsgleich mit dem Mascot-Gesicht, ragt über den Blobrand hinaus.
          Die Zentrier-Translation liegt am Wrapper, damit die Atem-Skalierung des
          SVG (gleiche „mood-breathe"-Animation wie der Blob, gleicher Mittelpunkt)
          nicht mit dem transform kollidiert — Perücke und Blob atmen so im
          Gleichtakt. */}
      <div className="pointer-events-none absolute left-1/2 top-0 size-24 -translate-x-1/2">
        <svg
          viewBox="0 0 64 64"
          className="size-full"
          style={{
            overflow: "visible",
            ...(reduced
              ? {}
              : {
                  animationName: "mood-breathe",
                  animationDuration: `${WIG_PULSE_SECONDS}s`,
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                }),
          }}
          aria-hidden="true"
        >
          {JudgeWig}
        </svg>
      </div>

      {/* Richter-Hammer, schräg unten rechts angelehnt */}
      <div className="absolute bottom-0 right-0 rotate-[-30deg]">
        {JudgeGavel}
      </div>
    </div>
  );
}
