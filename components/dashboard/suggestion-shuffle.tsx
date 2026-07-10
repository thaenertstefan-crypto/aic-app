"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { Destination } from "@/components/dashboard/daily-focus";

/** Akut-Hilfen zuerst — kuratierter Start der Rotation (siehe Spec). */
const CURATED_FIRST = ["overthinking", "confidence", "shadow"];
/** Vorschläge pro Gruppe. */
const GROUP_SIZE = 3;
/** Out-Phase einer Zeile (Fade + Float nach oben). */
const OUT_MS = 180;
/** In-Phase einer Zeile (Fade + Float von unten). */
const IN_MS = 250;
/** Versatz zwischen den Zeilen (Stagger), out wie in. */
const STAGGER_MS = 40;

/**
 * „Vorschlags-Shuffle": genau eine sichtbare 3er-Gruppe von Anlaufstellen plus
 * ein stiller „Zeig mir was anderes"-Trigger. Blättert zyklisch durch feste
 * Gruppen (deterministisch, kein Zufall) — Dialoggeste statt Menü-Navigation.
 *
 * Motion: beim Shuffle schweben die alten Zeilen gestaffelt nach oben raus
 * (Transition), nach dem Swap die neuen gestaffelt von unten rein
 * (animate-in, remount über den Gruppen-Key). Erst-Mount ist bewusst statisch:
 * das Einblenden des Gesamtblocks übernimmt die Crossfade-Maschine in
 * daily-focus.tsx. Reduced motion: sofortiger Austausch, Icon statisch.
 */
export function SuggestionShuffle({
  destinations,
}: {
  destinations: Destination[];
}) {
  const reduced = useReducedMotion();
  const [groupIndex, setGroupIndex] = useState(0);
  /** true während die alte Gruppe rausschwebt (blockiert Doppel-Taps). */
  const [leaving, setLeaving] = useState(false);
  /** Erst nach dem ersten Shuffle animieren Zeilen sich ein (kein Mount-Pop). */
  const [hasShuffled, setHasShuffled] = useState(false);
  /** Halbe Icon-Umdrehung pro Tap. */
  const [turns, setTurns] = useState(0);

  // Kuratierte Reihenfolge: Akut-Hilfen zuerst, Rest in Server-Reihenfolge.
  // destinations kommt bereits ohne die Primary-Empfehlung an.
  const ordered = [
    ...CURATED_FIRST.flatMap((key) => {
      const match = destinations.find((d) => d.key === key);
      return match ? [match] : [];
    }),
    ...destinations.filter((d) => !CURATED_FIRST.includes(d.key)),
  ];
  const groups: Destination[][] = [];
  for (let i = 0; i < ordered.length; i += GROUP_SIZE) {
    groups.push(ordered.slice(i, i + GROUP_SIZE));
  }
  // Modulo sichert gegen kürzere Listen nach einem Tier-Wechsel ab (die
  // Alternativen ändern sich, wenn die Primary-Empfehlung wechselt).
  const safeIndex = groups.length > 0 ? groupIndex % groups.length : 0;
  const group = groups[safeIndex] ?? [];
  const hasMultipleGroups = groups.length > 1;

  const shuffle = () => {
    if (leaving) return;
    setTurns((t) => t + 1);
    setHasShuffled(true);
    if (reduced) {
      setGroupIndex((i) => i + 1);
      return;
    }
    setLeaving(true);
    // Swap erst, wenn auch die letzte (gestaffelte) Zeile draußen ist; die
    // neuen Zeilen animieren sich über ihre animate-in-Klassen selbst ein.
    window.setTimeout(() => {
      setGroupIndex((i) => i + 1);
      setLeaving(false);
    }, OUT_MS + (GROUP_SIZE - 1) * STAGGER_MS);
  };

  return (
    <div className="space-y-2">
      {/* min-h hält 3 Zeilen frei, damit beim Wechsel auf eine kleinere
          Restgruppe (1–2 Einträge) nichts unter dem Block springt.
          aria-live kündigt die neue Gruppe Screenreadern an. */}
      <ul
        aria-live="polite"
        className={cn("space-y-2", hasMultipleGroups && "min-h-[142px]")}
      >
        {group.map((destination, i) => (
          <li
            key={`${safeIndex}-${destination.key}`}
            className={cn(
              !reduced &&
                leaving &&
                "-translate-y-1.5 opacity-0 transition-[opacity,translate] ease-out",
              !reduced &&
                !leaving &&
                hasShuffled &&
                "animate-in fade-in slide-in-from-bottom-2",
            )}
            style={
              reduced
                ? undefined
                : leaving
                  ? {
                      transitionDuration: `${OUT_MS}ms`,
                      transitionDelay: `${i * STAGGER_MS}ms`,
                    }
                  : hasShuffled
                    ? {
                        animationDuration: `${IN_MS}ms`,
                        animationDelay: `${i * STAGGER_MS}ms`,
                        animationFillMode: "both",
                      }
                    : undefined
            }
          >
            <Link
              href={destination.href}
              className="flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <span className="text-sm font-medium text-foreground">
                {destination.sentence}
              </span>
              {destination.badge && (
                <span className="text-xs text-muted-foreground">
                  {destination.badge}
                </span>
              )}
              <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      {hasMultipleGroups && (
        /* Icon-only-Trigger — bewusst ohne Schriftzug (genug Text auf dem
           Dashboard); das aria-label trägt die Bedeutung. size-11 = volles
           44px-Touch-Target, das Icon selbst bleibt klein und leise. */
        <button
          type="button"
          onClick={shuffle}
          aria-label="Zeig mir was anderes"
          className="mx-auto flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <RefreshCw
            aria-hidden
            className="size-4 shrink-0 transition-transform duration-300 ease-out"
            style={reduced ? undefined : { rotate: `${turns * 180}deg` }}
          />
        </button>
      )}
    </div>
  );
}
