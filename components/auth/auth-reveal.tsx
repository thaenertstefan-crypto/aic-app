"use client";

import { useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { AmbientBlobs } from "@/components/ui/ambient-blobs";
import { MascotPeek } from "@/components/brand/mascot-peek";
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
  // Das hochblickende Karten-Maskottchen erscheint auf Login + Signup.
  const pathname = usePathname();
  const showCardMascot = pathname === "/login" || pathname === "/signup";

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const delta = touchStartY.current - endY;
    if (delta > SWIPE_THRESHOLD) {
      setRevealed(true);
    } else if (delta < -SWIPE_THRESHOLD) {
      setRevealed(false);
    }
    touchStartY.current = null;
  }

  function handleWheel(e: React.WheelEvent) {
    if (e.deltaY > 0) setRevealed(true);
    else if (e.deltaY < 0) setRevealed(false);
  }

  // Reduced-Motion: zugänglicher Fallback ohne Overlay/Gating.
  if (reduced) {
    return (
      <div className="relative flex min-h-lvh flex-col overflow-hidden">
        <div className="relative isolate overflow-hidden">{hero}</div>
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        {showCardMascot && (
          <MascotPeek
            from="top"
            size="lg"
            expression="smile"
            pulseSeconds={3}
            gazeX={0}
            gazeY={3}
            className="pointer-events-none absolute top-0 left-1/2 -ml-16 -mt-14 z-0"
          />
        )}
      </div>
    );
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className="relative min-h-lvh overflow-hidden"
    >
      {/* Karten-Panel: zoomt von hinten nach vorne herein, sobald aufgedeckt. */}
      <div className="flex min-h-lvh items-center justify-center px-4 py-12">
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

        {/* Maskottchen lugt oben mittig vom Bildschirmrand herein und schaut
            hinunter zur Login-Karte. Positioniert relativ zum Vollbild-Root
            (wird oben geclippt → nur die Augen sind sichtbar). Mountet erst beim
            Aufdecken, damit die Slide-down-Animation spielt. */}
        {showCardMascot && revealed && (
          <MascotPeek
            from="top"
            size="lg"
            expression="smile"
            pulseSeconds={3}
            gazeX={0}
            gazeY={3}
            className="pointer-events-none absolute top-0 left-1/2 -ml-16 -mt-14 z-0"
          />
        )}
      </div>

      {/* Hero-Panel: liegt darüber und schiebt beim Aufdecken nach oben weg. */}
      <div
        className={cn(
          "absolute inset-0 z-20 isolate flex flex-col overflow-hidden",
          "bg-linear-to-br from-secondary via-accent/60 to-background",
          "transition-[transform,opacity] duration-1000 ease-out",
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
