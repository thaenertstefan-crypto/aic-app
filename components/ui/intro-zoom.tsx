"use client";

import { useEffect, useState, type ReactNode } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/** sessionStorage-Schlüssel, gesetzt direkt vor dem Login/Signup-Redirect. */
export const INTRO_ZOOM_KEY = "aic:intro-zoom";
/** Flag nur honorieren, wenn es jünger als das ist (vermeidet Spuk-Zoom). */
const MAX_AGE_MS = 10_000;

type Phase = "idle" | "enter" | "active";

type IntroZoomProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Spielt beim ersten Mount nach einem Login/Signup einmalig einen sanften
 * „von hinten nach vorne"-Zoom (scale .96 → 1, fade in). Gegatet über ein
 * kurzlebiges sessionStorage-Flag, damit normale App-Navigation nicht animiert
 * und ein fehlgeschlagener Login keinen verspäteten Zoom auslöst.
 *
 * Nach Abschluss (Phase "idle") werden alle Transform-/Transition-Klassen
 * entfernt — so bleibt kein `transform` zurück, das einen Containing-Block für
 * `position: fixed`-Elemente in den Seiten erzeugen würde.
 */
export function IntroZoom({ children, className }: IntroZoomProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const raw = sessionStorage.getItem(INTRO_ZOOM_KEY);
    if (raw) sessionStorage.removeItem(INTRO_ZOOM_KEY);

    const ts = raw ? Number(raw) : NaN;
    const fresh = Number.isFinite(ts) && Date.now() - ts < MAX_AGE_MS;
    if (!fresh || reduced) return;

    // Startzustand setzen, dann im nächsten Frame auf den Endzustand schalten,
    // damit die CSS-Transition tatsächlich läuft.
    const begin = () => setPhase("enter");
    begin();
    const id = requestAnimationFrame(() => setPhase("active"));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  if (phase === "idle") {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      onTransitionEnd={() => setPhase("idle")}
      className={cn(
        "transition-[transform,opacity] duration-700 ease-out",
        phase === "enter" ? "scale-[0.96] opacity-0" : "scale-100 opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
