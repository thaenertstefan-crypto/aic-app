"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import gsap from "gsap";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Completion icon with a quiet, one-time celebration: the check mark scales in
 * with a soft overshoot while a blurred `--celebrate` halo glows up behind it
 * once (no looping). A leise Feier — Glühen statt Konfetti.
 *
 * Respects `prefers-reduced-motion`: icon and glow appear directly in their
 * final state, no scale/fade.
 */
export function CompletionCelebration({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const glowRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    const icon = iconRef.current;
    if (!glow || !icon) return;

    if (reduced) {
      gsap.set(glow, { opacity: 0.5, scale: 1 });
      gsap.set(icon, { scale: 1 });
      return;
    }

    const tl = gsap.timeline();
    tl.fromTo(
      glow,
      { opacity: 0, scale: 0.8 },
      { opacity: 0.5, scale: 1, duration: 1.2, ease: "power2.out" },
      0,
    );
    tl.fromTo(
      icon,
      { scale: 0.7 },
      { scale: 1, duration: 0.6, ease: "back.out(1.4)" },
      0,
    );

    return () => {
      tl.kill();
    };
  }, [reduced]);

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <span
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute size-24 rounded-full bg-celebrate opacity-0 blur-2xl"
      />
      <div
        ref={iconRef}
        className="relative flex size-16 items-center justify-center rounded-full bg-success/15"
      >
        <CheckCircle2 className="size-8 text-success" />
      </div>
    </div>
  );
}
