"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

type RevealProps = {
  /** Delay before the fade-in starts, in seconds. */
  delay?: number;
  /**
   * Shows the children at once, without an entrance — for surfaces that are
   * being restored rather than entered, and should already stand there on
   * mount (e.g. the Kopfwetter hub under an incoming return flight).
   */
  instant?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Fades its children in (with a gentle upward drift) after an optional delay —
 * used to stagger an element in after another, e.g. the closing reframe after
 * the completion icon.
 *
 * Respects `prefers-reduced-motion`: children appear immediately, no fade.
 */
export function Reveal({ delay = 0, instant, className, children }: RevealProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduced || instant) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay },
    );

    return () => {
      tween.kill();
    };
  }, [reduced, instant, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
