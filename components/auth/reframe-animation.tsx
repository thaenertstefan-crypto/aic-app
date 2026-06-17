"use client";

import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";

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
  className,
}: ReframeAnimationProps) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced || pairs.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % pairs.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [reduced, pairs.length, intervalMs]);

  const pair = pairs[index] ?? pairs[0];

  return (
    <div
      className={cn("min-h-28 sm:min-h-32", className)}
      aria-live={reduced ? undefined : "polite"}
    >
      <div
        key={reduced ? "static" : index}
        className={cn(
          "flex flex-col gap-2",
          !reduced && "animate-in fade-in slide-in-from-bottom-1 duration-700",
        )}
      >
        <p className="text-base text-muted-foreground line-through decoration-muted-foreground/50">
          {pair.critic}
        </p>
        <ArrowDown
          className="size-4 text-primary/60"
          aria-hidden
        />
        <p className="font-heading text-xl font-medium leading-snug text-primary sm:text-2xl">
          {pair.reframe}
        </p>
      </div>
    </div>
  );
}
