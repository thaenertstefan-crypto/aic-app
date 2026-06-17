"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { AmbientBlobs } from "@/components/ui/ambient-blobs";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/** Mindest-Wischweg (in px) nach oben, ab dem die Karte aufgedeckt wird. */
const SWIPE_THRESHOLD = 50;

type AuthRevealProps = {
  /** Hero-Inhalt (Logo + BrandPanel), wird als Vollbild-Intro gezeigt. */
  hero: ReactNode;
  /** Die eigentliche Auth-Karte (Login-/Signup-Formular). */
  children: ReactNode;
};

/**
 * Vollbild-„Bühne" für die Auth-Seiten: zuerst sieht man nur den Hero mit
 * Blob-Hintergrund und einem Pfeil. Wischt man nach oben (oder tippt den
 * Pfeil), schiebt der Hero nach oben weg und die Auth-Karte zoomt von hinten
 * nach vorne herein.
 *
 * Bei „Bewegung reduzieren" entfällt das Gating komplett: Hero und Karte
 * stehen im normalen Fluss untereinander, ohne Animation und ohne versteckte
 * Inhalte.
 */
export function AuthReveal({ hero, children }: AuthRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const reduced = useReducedMotion();
  const touchStartY = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    if (touchStartY.current - endY > SWIPE_THRESHOLD) {
      setRevealed(true);
    }
    touchStartY.current = null;
  }

  function handleWheel(e: React.WheelEvent) {
    if (e.deltaY > 0) setRevealed(true);
  }

  // Reduced-Motion: zugänglicher Fallback ohne Overlay/Gating.
  if (reduced) {
    return (
      <div className="flex min-h-svh flex-col">
        <div className="relative isolate overflow-hidden">{hero}</div>
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-svh overflow-hidden">
      {/* Karten-Panel: zoomt von hinten nach vorne herein, sobald aufgedeckt. */}
      <div className="flex min-h-svh items-center justify-center px-4 py-12">
        <div
          className={cn(
            "w-full max-w-sm transition-[transform,opacity] duration-700 ease-out",
            revealed
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-90 opacity-0",
          )}
        >
          {children}
        </div>
      </div>

      {/* Hero-Panel: liegt darüber und schiebt beim Aufdecken nach oben weg. */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className={cn(
          "absolute inset-0 z-20 isolate flex flex-col overflow-hidden",
          "bg-linear-to-br from-secondary via-accent/60 to-background",
          "transition-[transform,opacity] duration-700 ease-out",
          revealed
            ? "pointer-events-none -translate-y-full opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        <AmbientBlobs className="-z-10" />

        <div className="flex flex-1 flex-col">{hero}</div>

        {/* Aufdeck-Hinweis: Pfeil + Text, dezent pulsierend. */}
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="group flex flex-col items-center gap-2 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-4 text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="text-sm font-medium">Nach oben wischen</span>
          <ChevronDown
            className="size-6 motion-safe:animate-bounce"
            aria-hidden
          />
          <span className="sr-only">Zur Anmeldung</span>
        </button>
      </div>
    </div>
  );
}
