"use client";

import { useState } from "react";

import { Mascot } from "@/components/brand/mascot";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
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
function pointAngleDeg(i: number, n: number): number {
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
function shortestDelta(from: number, target: number): number {
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
 * "Dein innerer Kompass": die entdeckten Werte als leuchtende Punkte um eine
 * Kompassrose, das Maskottchen in der Mitte schaut zum gewählten Wert, die
 * Nadel schwingt zu ihm. Darunter Detailkarte + kompakte Liste (a11y/Scan).
 */
export function ValuesCompass({ values }: { values: CompassValue[] }) {
  const reduced = useReducedMotion();
  const n = values.length;
  const [selectedId, setSelectedId] = useState<string | null>(
    values[0]?.id ?? null,
  );
  // Akkumulierte Nadelrotation, damit der Übergang immer den kürzesten Weg
  // nimmt statt einmal ganz herum zu schwingen.
  const [rotation, setRotation] = useState(0);

  const selected = values.find((v) => v.id === selectedId) ?? values[0];

  function select(id: string, index: number) {
    setSelectedId(id);
    setRotation((prev) => prev + shortestDelta(prev, (index * 360) / n));
  }

  // Blick des Maskottchens zum gewählten Punkt
  const selectedIndex = Math.max(
    0,
    values.findIndex((v) => v.id === selected?.id),
  );
  const gazeRad = (Math.PI * pointAngleDeg(selectedIndex, Math.max(n, 1))) / 180;
  const gazeX = Math.max(-2, Math.min(2, Math.cos(gazeRad) * 1.8));
  const gazeY = Math.max(-2, Math.min(2, Math.sin(gazeRad) * 1.8));

  // ── Empty State: leere, leise suchende Rose ─────────────────────────
  if (n === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative mx-auto aspect-square w-full max-w-[320px] opacity-40">
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
        <p className="text-center text-base text-muted-foreground">
          Du hast noch keine Werte entdeckt.
          <br />
          Deine Kompassrose wartet darauf, sich zu füllen.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Die Rose mit Werte-Punkten ──────────────────────────────── */}
      <Reveal>
        <div className="relative mx-auto aspect-square w-full max-w-[320px]">
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

          {/* Maskottchen im Zentrum, Blick zum gewählten Wert */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Mascot
              size="sm"
              expression="curious"
              gazeX={gazeX}
              gazeY={gazeY}
            />
          </div>

          {/* Werte-Punkte */}
          {values.map((v, i) => {
            const pos = pointPosition(i, n);
            const isSelected = v.id === selected?.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => select(v.id, i)}
                aria-label={v.label}
                aria-pressed={isSelected}
                className={cn(
                  "absolute flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
                  isSelected
                    ? "bg-primary/15 ring-2 ring-primary"
                    : "border border-white/10 bg-white/5",
                )}
                style={{
                  left: `${(pos.x / 320) * 100}%`,
                  top: `${(pos.y / 320) * 100}%`,
                  boxShadow: isSelected
                    ? "0 0 18px color-mix(in srgb, var(--primary) 35%, transparent)"
                    : undefined,
                }}
              >
                <span className="text-2xl leading-none" aria-hidden="true">
                  {v.emoji}
                </span>
              </button>
            );
          })}
        </div>
      </Reveal>

      {/* ── Detailkarte des gewählten Werts ─────────────────────────── */}
      <Reveal delay={0.15}>
        <Card
          key={selected.id}
          variant="glass"
          className={cn("min-h-28", !reduced && "fade-swap")}
        >
          <CardContent className="flex items-start gap-3">
            <span className="text-2xl leading-none" aria-hidden="true">
              {selected.emoji}
            </span>
            <div className="min-w-0 space-y-1">
              <p className="font-heading text-base font-semibold text-primary">
                {selected.label}
              </p>
              <p className="text-base leading-relaxed text-muted-foreground">
                Dir ist wichtig, dass {selected.description}.
              </p>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* ── Kompakte Liste (scanbar, auswählbar) ────────────────────── */}
      <ul className="divide-y divide-border/60">
        {values.map((v, i) => (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => select(v.id, i)}
              aria-pressed={v.id === selected?.id}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 px-1 text-left transition-colors",
                v.id === selected?.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {v.emoji}
              </span>
              <span className="truncate text-sm font-medium">{v.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
