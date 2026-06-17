"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

type CtaGlowProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Wraps a single primary CTA with a soft, breathing glow halo behind it.
 *
 * Deliberately reserved for the one primary call-to-action per screen (the
 * dashboard RecipeCard button) — not every button. Respects
 * `prefers-reduced-motion`: the glow then sits still at a calm base opacity.
 */
export function CtaGlow({ className, children }: CtaGlowProps) {
  const reduced = useReducedMotion();
  const glowRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow || reduced) return;

    const tween = gsap.to(glow, {
      opacity: 0.6,
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    return () => {
      tween.kill();
    };
  }, [reduced]);

  return (
    <div className={cn("relative w-full", className)}>
      <span
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 rounded-xl bg-primary opacity-35 blur-lg"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
