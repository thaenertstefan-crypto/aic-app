"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/**
 * „Kamera-Push in den Booster" — der Zoom-Übergang vom Kopfwetter-Hub in eine
 * Sub-Page. Das Overlay lebt im geteilten booster/layout.tsx, damit seine
 * CSS-Animation den Routenwechsel überlebt (Layouts bleiben bei Navigation
 * zwischen Kind-Routen erhalten). Ablauf: zoomInto() → phase "zooming" (Zellen
 * skalieren vom Tap-Punkt weg, Bloom deckt die Navigation), nach ACCEL_MS
 * navigieren. Die Sub-Page ruft beim Mount arrive() → phase "arriving" (Bloom
 * fadet weg, Seite taucht auf). Reduced motion: sofort navigieren, kein Zoom.
 */

type Phase = "idle" | "zooming" | "arriving";
type Origin = { x: number; y: number };

// Navigation am Ende des Kamera-Push; Bloom dann voll deckend.
const ACCEL_MS = 300;
// Dauer der Auflösung/Ankunft, bevor das Overlay verschwindet.
const SETTLE_MS = 360;

type ZoomValue = {
  phase: Phase;
  origin: Origin | null;
  zoomInto: (origin: Origin, navigate: () => void) => void;
  arrive: () => void;
};

const ZoomContext = createContext<ZoomValue | null>(null);

export function useBoosterZoom(): ZoomValue {
  const ctx = useContext(ZoomContext);
  if (!ctx) {
    throw new Error("useBoosterZoom muss innerhalb von <BoosterZoomProvider> verwendet werden");
  }
  return ctx;
}

export function BoosterZoomProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<number[]>([]);

  const set = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const zoomInto = useCallback(
    (o: Origin, navigate: () => void) => {
      if (phaseRef.current !== "idle") return;
      setOrigin(o);
      if (reduced) {
        navigate();
        return;
      }
      set("zooming");
      const t = window.setTimeout(() => navigate(), ACCEL_MS);
      timers.current.push(t);
    },
    [reduced, set],
  );

  const arrive = useCallback(() => {
    if (phaseRef.current !== "zooming") return;
    set("arriving");
    const t = window.setTimeout(() => {
      set("idle");
      setOrigin(null);
    }, SETTLE_MS);
    timers.current.push(t);
  }, [set]);

  return (
    <ZoomContext.Provider value={{ phase, origin, zoomInto, arrive }}>
      {children}
      <BoosterZoomOverlay phase={phase} origin={origin} />
    </ZoomContext.Provider>
  );
}

function BoosterZoomOverlay({ phase, origin }: { phase: Phase; origin: Origin | null }) {
  if (phase === "idle" || !origin) return null;
  return (
    <div
      aria-hidden
      data-phase={phase}
      className="booster-zoom-overlay fixed inset-0 z-[80]"
      style={{ "--bz-x": `${origin.x}px`, "--bz-y": `${origin.y}px` } as CSSProperties}
    >
      <div className="booster-zoom-bloom absolute inset-0" />
    </div>
  );
}
