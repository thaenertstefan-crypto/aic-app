"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
// Notbremse: falls arrive() nie feuert (Navigation hängt/schlägt fehl, z.B.
// auf wackliger Verbindung — PWA mit OfflineBanner, offline ist ein
// erwarteter Zustand), zwingt dieser Deckel "zooming" zurück auf "idle",
// statt den User hinter dem deckenden, input-schluckenden Overlay stecken
// zu lassen.
const WATCHDOG_MS = ACCEL_MS + 4000;

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

  // Timer nur beim Unmount des Providers aufräumen (Provider lebt im
  // Booster-Layout, überlebt normalerweise die ganze Session — dies fängt
  // z.B. Fast-Refresh/StrictMode-Remounts ab).
  useEffect(() => {
    // Die Array-Instanz beim Mount festhalten: sie wird nur befüllt (push),
    // nie ersetzt — der Cleanup sieht deshalb garantiert alle Timer, ohne beim
    // Unmount auf einen dann evtl. anderen ref.current zugreifen zu müssen.
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const zoomInto = useCallback(
    (o: Origin, navigate: () => void) => {
      if (phaseRef.current !== "idle") {
        // Zoom blockiert (z.B. sehr schneller Doppel-Tap) → Tap darf nicht
        // verschluckt werden, normal navigieren.
        navigate();
        return;
      }
      setOrigin(o);
      if (reduced) {
        navigate();
        return;
      }
      set("zooming");
      const t = window.setTimeout(() => navigate(), ACCEL_MS);
      timers.current.push(t);
      // Notbremse: löst nur aus, wenn arrive() bis dahin nicht schon
      // "zooming" verlassen hat.
      const watchdog = window.setTimeout(() => {
        if (phaseRef.current === "zooming") {
          set("arriving");
          const settleTimer = window.setTimeout(() => {
            set("idle");
            setOrigin(null);
          }, SETTLE_MS);
          timers.current.push(settleTimer);
        }
      }, WATCHDOG_MS);
      timers.current.push(watchdog);
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
