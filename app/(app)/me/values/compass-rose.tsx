"use client";

import { Mascot } from "@/components/brand/mascot";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

export type CompassValue = {
  id: string;
  label: string;
  emoji: string;
  description: string;
};

// ─── Rosen-Geometrie (viewBox 0 0 320 320, Zentrum 160/160) ───────────
const C = 160;
/** Radius, auf dem die Werte-Punkte um die Rose sitzen. */
const POINT_R = 118;
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/** Gradstriche nur auf den Diagonalen — auf den Hauptachsen sitzen stattdessen
 *  die Himmelsrichtungs-Buchstaben. */
const ROSE_TICKS = ANGLES.filter((a) => a % 90 !== 0).map((a) => {
  const rad = (Math.PI * a) / 180;
  return {
    x1: +(C + 104 * Math.sin(rad)).toFixed(2),
    y1: +(C - 104 * Math.cos(rad)).toFixed(2),
    x2: +(C + 94 * Math.sin(rad)).toFixed(2),
    y2: +(C - 94 * Math.cos(rad)).toFixed(2),
  };
});

/** Klassische Windrosen-Spitze: schlanke Raute aus zwei halbschattierten
 *  Dreieckshälften (hell/dunkel), wie auf alten Seekarten. Der innere Punkt
 *  (r=16) verschwindet hinter dem Maskottchen-Blob (Radius 28) — die Spitzen
 *  wachsen also hinter ihm hervor. */
function spikeHalves(a: number, tipR: number, sideR: number, halfW: number) {
  const rad = (Math.PI * a) / 180;
  const perp = rad + Math.PI / 2;
  const pt = (r: number, w: number) =>
    `${(C + r * Math.sin(rad) + w * Math.sin(perp)).toFixed(1)},${(
      C - r * Math.cos(rad) - w * Math.cos(perp)
    ).toFixed(1)}`;
  const tip = pt(tipR, 0);
  const inner = pt(16, 0);
  return [
    `M${tip} L${pt(sideR, halfW)} L${inner} Z`,
    `M${tip} L${pt(sideR, -halfW)} L${inner} Z`,
  ];
}

/** 4 lange Hauptspitzen (N/O/S/W) + 4 kurze Zwischenspitzen. Die Hauptspitzen
 *  enden bei r=72, damit zwischen ihnen und dem inneren Ring (r=98) Platz für
 *  die Himmelsrichtungs-Buchstaben bleibt. */
const ROSE_SPIKES = ANGLES.map((a) =>
  a % 90 === 0 ? spikeHalves(a, 72, 28, 5) : spikeHalves(a, 50, 24, 4),
);

/** Himmelsrichtungs-Buchstaben auf den Hauptachsen — bei r=84 im freien Raum
 *  zwischen Spitzen-Ende und Ring, außerhalb der Reichweite der Werte-Punkte
 *  (deren Buttons erst ab r≈94 beginnen), damit immer alle vier sichtbar sind. */
const CARDINALS = [
  { angle: 0, label: "N" },
  { angle: 90, label: "O" },
  { angle: 180, label: "S" },
  { angle: 270, label: "W" },
].map((c) => {
  const rad = (Math.PI * c.angle) / 180;
  return {
    ...c,
    x: +(C + 84 * Math.sin(rad)).toFixed(1),
    y: +(C - 84 * Math.cos(rad)).toFixed(1),
  };
});

/** Winkel (Standard-Mathe-Koordinaten, Grad) des i-ten von n Punkten —
 *  beginnend oben (Norden), im Uhrzeigersinn. */
export function pointAngleDeg(i: number, n: number): number {
  return -90 + (i * 360) / n;
}

function pointPosition(i: number, n: number) {
  const rad = (Math.PI * pointAngleDeg(i, n)) / 180;
  return {
    x: C + POINT_R * Math.cos(rad),
    y: C + POINT_R * Math.sin(rad),
  };
}

/** Kürzestes Rotations-Delta von `from` (akkumuliert) nach `target` (0–360). */
export function shortestDelta(from: number, target: number): number {
  const normalized = ((from % 360) + 360) % 360;
  return ((target - normalized + 540) % 360) - 180;
}

/** Dekorative Kompassrose (Ringe, Ticks, Windrosen-Spitzen, N/O/S/W) — rein
 *  ornamental. */
function RoseOrnament() {
  return (
    <>
      <circle cx={C} cy={C} r={130} fill="none" stroke="var(--primary)" strokeWidth="0.75" opacity="0.15" />
      <circle cx={C} cy={C} r={104} fill="none" stroke="var(--primary)" strokeWidth="1.5" opacity="0.3" />
      <circle cx={C} cy={C} r={98} fill="none" stroke="var(--primary)" strokeWidth="0.5" opacity="0.15" />
      {ROSE_TICKS.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="var(--primary)" strokeWidth="1" opacity="0.35" />
      ))}
      {ROSE_SPIKES.map(([light, dark], i) => (
        <g key={i} stroke="var(--primary)" strokeWidth="0.75" strokeOpacity="0.35">
          <path d={light} fill="var(--primary)" fillOpacity="0.3" />
          <path d={dark} fill="var(--primary)" fillOpacity="0.1" />
        </g>
      ))}
      {CARDINALS.map((c) => (
        <text
          key={c.label}
          x={c.x}
          y={c.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="9"
          fontFamily="var(--font-heading)"
          fill="var(--primary)"
          opacity="0.45"
        >
          {c.label}
        </text>
      ))}
    </>
  );
}

/** Kompassnadel, zeigt im Grundzustand nach Norden; Rotation am <g>.
 *  Endet bei r=76, knapp vor den Himmelsrichtungs-Buchstaben (r=84). */
function Needle({ style }: { style?: React.CSSProperties }) {
  return (
    <g style={style}>
      <polygon points={`${C},84 ${C + 7},${C} ${C},${C - 26} ${C - 7},${C}`} fill="var(--primary)" />
      <polygon points={`${C},214 ${C - 7},${C} ${C},${C + 18} ${C + 7},${C}`} fill="var(--accent)" opacity="0.75" />
    </g>
  );
}

/**
 * Reine Darstellung der Kompassrose: Ornament, Nadel, Maskottchen im Zentrum,
 * Werte-Punkte auf dem Kreis. EINE Quelle für die Geometrie — der interaktive
 * Aufsatz (ValuesCompass) und das ruhige Abschlussbild der Auswertung nutzen
 * dieselbe Komponente.
 *
 * `interactive={false}` (Default) rendert die Punkte als reine Spans: ein Bild,
 * kein Bedienelement. Ohne Werte zeigt sie die leere, leise suchende Rose.
 */
export function CompassRose({
  values,
  selectedId = null,
  rotation = 0,
  interactive = false,
  onSelect,
}: {
  values: CompassValue[];
  selectedId?: string | null;
  rotation?: number;
  interactive?: boolean;
  onSelect?: (id: string, index: number) => void;
}) {
  const reduced = useReducedMotion();
  const n = values.length;

  // Leere Rose: Nadel sucht langsam, keine Punkte, kein Maskottchen.
  if (n === 0) {
    return (
      <div className="relative mx-auto aspect-square w-full max-w-[380px]">
        <svg viewBox="0 0 320 320" className="size-full" aria-hidden="true">
          <RoseOrnament />
          <Needle
            style={
              reduced
                ? undefined
                : {
                    transformOrigin: "160px 160px",
                    animation: "val-unease-sway 7s ease-in-out infinite",
                  }
            }
          />
        </svg>
      </div>
    );
  }

  const selectedIndex = Math.max(
    0,
    values.findIndex((v) => v.id === selectedId),
  );
  // Blick des Maskottchens zum gewählten Punkt; ohne Auswahl schaut es geradeaus.
  const gazeRad = (Math.PI * pointAngleDeg(selectedIndex, n)) / 180;
  const gazeX = selectedId
    ? Math.max(-2, Math.min(2, Math.cos(gazeRad) * 1.8))
    : 0;
  const gazeY = selectedId
    ? Math.max(-2, Math.min(2, Math.sin(gazeRad) * 1.8))
    : 0;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px]">
      <svg
        viewBox="0 0 320 320"
        className="absolute inset-0 size-full"
        aria-hidden="true"
      >
        <RoseOrnament />
        <Needle
          style={{
            transformOrigin: "160px 160px",
            transform: `rotate(${rotation}deg)`,
            transition: reduced
              ? "none"
              : "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </svg>

      {/* Maskottchen im Zentrum */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Mascot size="sm" expression="curious" gazeX={gazeX} gazeY={gazeY} />
      </div>

      {/* Werte-Punkte */}
      {values.map((v, i) => {
        const pos = pointPosition(i, n);
        const isSelected = v.id === selectedId;
        const style = {
          left: `${(pos.x / 320) * 100}%`,
          top: `${(pos.y / 320) * 100}%`,
          boxShadow: isSelected
            ? "0 0 18px color-mix(in srgb, var(--primary) 35%, transparent)"
            : undefined,
        };
        const base =
          "absolute flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full";
        const skin = isSelected
          ? "bg-primary/15 ring-2 ring-primary"
          : "border border-foreground/15 bg-foreground/10";
        const glyph = (
          <span className="text-2xl leading-none" aria-hidden="true">
            {v.emoji}
          </span>
        );

        return interactive ? (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect?.(v.id, i)}
            aria-label={v.label}
            aria-pressed={isSelected}
            className={cn(
              base,
              skin,
              "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              !isSelected &&
                "hover:border-foreground/30 hover:bg-foreground/15 active:bg-foreground/20",
            )}
            style={style}
          >
            {glyph}
          </button>
        ) : (
          <span key={v.id} className={cn(base, skin)} style={style}>
            {glyph}
            <span className="sr-only">{v.label}</span>
          </span>
        );
      })}
    </div>
  );
}
