"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Soft, blurred color blobs that drift slowly behind a "hero" surface.
 *
 * Perf note: backdrop-filter + several blurred layers are not free on older
 * mobile devices — these building blocks are meant for 1–2 hero moments per
 * screen (see Phase 7.5), not for every card.
 *
 * Respects `prefers-reduced-motion`: when active, the blobs stay static and no
 * GSAP animation is started.
 */

type Blob = {
  /** Token-based fill color. */
  color: string;
  /** Tailwind classes for size and resting position within the container. */
  className: string;
  /** Drift offsets and duration — intentionally different per blob so the
   *  movement feels organic and never synchronized. */
  x: number;
  y: number;
  duration: number;
};

const BLOBS: Blob[] = [
  {
    color: "var(--primary)",
    className: "-left-16 -top-10 size-56 opacity-[0.18] blur-3xl",
    x: 36,
    y: 24,
    duration: 13,
  },
  {
    color: "var(--celebrate)",
    className: "-right-14 top-1/3 size-52 opacity-[0.16] blur-3xl",
    x: -28,
    y: 32,
    duration: 16,
  },
  {
    color: "var(--muted-foreground)",
    className: "bottom-[-3rem] left-1/4 size-48 opacity-[0.12] blur-3xl",
    x: 24,
    y: -30,
    duration: 11,
  },
];

type AmbientBlobsProps = {
  /** Size/positioning of the container, supplied by the calling surface. */
  className?: string;
};

export function AmbientBlobs({ className }: AmbientBlobsProps) {
  const reduced = useReducedMotion();
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (reduced) return;

    const tweens = blobRefs.current.map((el, i) => {
      if (!el) return null;
      const blob = BLOBS[i];
      return gsap.to(el, {
        x: blob.x,
        y: blob.y,
        duration: blob.duration,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });

    return () => {
      tweens.forEach((tween) => tween?.kill());
    };
  }, [reduced]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          ref={(el) => {
            blobRefs.current[i] = el;
          }}
          className={cn("absolute rounded-full", blob.className)}
          style={{ backgroundColor: blob.color }}
        />
      ))}
    </div>
  );
}
