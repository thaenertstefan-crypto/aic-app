"use client";

import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

export type ReframePair = {
  critic: string;
  reframe: string;
};

/**
 * Default-Paare: durchgestrichener Inner-Critic-Gedanke → stärkender Reframe.
 * Abgeleitet aus dem Cookbook und dem Kern-Mantra (Phase 6.13).
 */
export const DEFAULT_REFRAME_PAIRS: ReframePair[] = [
  { critic: "Ich bin nicht gut genug", reframe: "Ich bin nicht für jeden" },
  {
    critic: "Was, wenn sie mich durchschauen?",
    reframe: "Ich muss niemandem etwas beweisen",
  },
  {
    critic: "Ich sollte lieber still sein",
    reframe: "Meine Meinung darf Platz nehmen",
  },
  {
    critic: "Die anderen sind alle besser",
    reframe: "Ich gehe meinen eigenen Weg",
  },
  {
    critic: "Ich will bloß niemanden enttäuschen",
    reframe: "Ich darf auch mal Nein sagen",
  },
];

type ReframeAnimationProps = {
  pairs?: ReframePair[];
  /** Zeit pro Paar in Millisekunden. */
  intervalMs?: number;
  /** "compact" verkleinert Schrift und Höhe für dezentere Kontexte (z. B. Dashboard). */
  size?: "default" | "compact";
  /** "center" richtet Pfeil und Text mittig aus (für zentrierte Completion-Screens). */
  align?: "start" | "center";
  className?: string;
};

/**
 * Rotiert durch Reframe-Paare: ein durchgestrichener Zweifel verwandelt sich
 * in einen stärkenden Satz. Bei "Bewegung reduzieren" bleibt das erste Paar
 * statisch stehen — kein Rotieren, keine Einblend-Animation.
 */
export function ReframeAnimation({
  pairs = DEFAULT_REFRAME_PAIRS,
  intervalMs = 3500,
  size = "default",
  align = "start",
  className,
}: ReframeAnimationProps) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || pairs.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % pairs.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [reduced, pairs.length, intervalMs]);

  const pair = pairs[index] ?? pairs[0];

  const compact = size === "compact";
  const heightClass = compact ? "min-h-20 sm:min-h-24" : "min-h-28 sm:min-h-32";
  const criticClass = compact ? "text-sm" : "text-base";
  const reframeClass = compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl";
  const arrowClass = compact ? "size-3.5" : "size-4";

  return (
    <div
      className={cn(heightClass, className)}
      aria-live={reduced ? undefined : "polite"}
    >
      <div
        key={reduced ? "static" : index}
        className={cn(
          "flex flex-col gap-2",
          align === "center" && "items-center text-center",
          !reduced && "animate-in fade-in slide-in-from-bottom-1 duration-700",
        )}
      >
        <p
          className={cn(
            "text-muted-foreground line-through decoration-muted-foreground/50",
            criticClass,
          )}
        >
          {pair.critic}
        </p>
        <ArrowDown
          className={cn("text-primary/60", arrowClass)}
          aria-hidden
        />
        <p
          className={cn(
            "font-heading font-medium leading-snug text-primary",
            reframeClass,
          )}
        >
          {pair.reframe}
        </p>
      </div>
    </div>
  );
}
