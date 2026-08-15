"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

import { CompassRose, shortestDelta, type CompassValue } from "./compass-rose";

export type { CompassValue };

/**
 * "Dein innerer Kompass": die entdeckten Werte als leuchtende Punkte um eine
 * Kompassrose, das Maskottchen in der Mitte schaut zum gewählten Wert, die
 * Nadel schwingt zu ihm. Darunter Name + Detailkarte.
 *
 * Die Geometrie liegt in [CompassRose](./compass-rose.tsx) — diese Komponente
 * trägt nur den Auswahl-Zustand.
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

  // ── Empty State: leere, leise suchende Rose ─────────────────────────
  if (n === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-[380px] opacity-40">
          <CompassRose values={[]} />
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
      <Reveal>
        <CompassRose
          values={values}
          selectedId={selected.id}
          rotation={rotation}
          interactive
          onSelect={(id, index) => {
            setSelectedId(id);
            setRotation((prev) => prev + shortestDelta(prev, (index * 360) / n));
          }}
        />
      </Reveal>

      {/* ── Name des gewählten Werts, direkt an der Rose ────────────────
         Nennt die Auswahl unmittelbar unter dem Kompass (die Rosen-Punkte
         sind emoji-only) und meldet den Wechsel an Screenreader. */}
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-center font-heading text-lg font-semibold text-foreground"
      >
        {selected.label}
      </p>

      {/* ── Detailkarte des gewählten Werts ─────────────────────────── */}
      <Reveal delay={0.15}>
        <Card
          key={selected.id}
          variant="glass"
          className={cn(!reduced && "fade-swap")}
        >
          <CardContent className="flex items-start gap-3">
            <span className="text-2xl leading-none" aria-hidden="true">
              {selected.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-base leading-relaxed text-foreground">
                Dir ist wichtig, dass {selected.description}.
              </p>
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
