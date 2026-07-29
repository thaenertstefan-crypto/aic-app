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
import { BOOSTER_ART } from "@/components/booster/booster-art";
import type { CellVariant } from "@/app/(app)/booster/pressure-cell";

/**
 * „Kamera-Push in den Booster" — der Zoom-Übergang vom Kopfwetter-Hub in eine
 * Sub-Page. Das Overlay lebt im geteilten booster/layout.tsx, damit es den
 * Routenwechsel überlebt (Layouts bleiben bei Navigation zwischen Kind-Routen
 * erhalten).
 *
 * Ablauf: zoomInto() → phase "zooming" (der Hub skaliert am Tap-Punkt verankert
 * vorbei und fadet, ein fixer Klon des Wetter-Icons löst sich vom Tap-Punkt und
 * reist auf einer weichen Kurve nach oben in die Bildmitte), nach ACCEL_MS
 * navigieren — der Klon liegt über allem, der Wechsel ist nicht sichtbar. Die
 * Sub-Page meldet beim Mount arrive(rect | null): mit Rect setzt sich der Klon
 * exakt auf das echte Modul-Icon und blendet über, ohne Rect löst er sich an
 * seiner Zielposition auf (Intro-Sequenz beim Erstbesuch). Reduced motion:
 * sofort navigieren, kein Klon.
 */

type Phase = "idle" | "zooming" | "arriving";

/** Mittelpunkt in Viewport-Koordinaten + gerenderte Kantenlänge (px). */
export type ZoomRect = { x: number; y: number; size: number };

type Flight = { from: ZoomRect; to: ZoomRect; variant: CellVariant };

// Navigation am Ende des Kamera-Push.
const ACCEL_MS = 300;
// Reisedauer des Klons vom Tap-Punkt zur Zielposition (gespiegelt in den
// `transition`-Deklarationen von .booster-zoom-arc-x/-y in globals.css — hier
// nur zur Dokumentation des Timing-Modells, kein aktiver Codepfad liest sie).
const _TRAVEL_MS = 620;
// Übergabe auf das echte Icon, danach verschwindet das Overlay.
const SETTLE_MS = 260;
// Notbremse: falls arrive() nie feuert (Navigation hängt/schlägt fehl, z.B. auf
// wackliger Verbindung — PWA mit OfflineBanner, offline ist ein erwarteter
// Zustand), zwingt dieser Deckel "zooming" zurück auf "idle", statt den User
// hinter dem input-schluckenden Overlay stecken zu lassen.
const WATCHDOG_MS = ACCEL_MS + 4000;

/** Zielgröße des Klons = size-20 (80 px) des Modul-Icons. */
const TARGET_SIZE = 80;
/** Fallback-Ziel, solange die Sub-Page ihr Icon noch nicht gemeldet hat:
 *  horizontal zentriert, im oberen Drittel — dort sitzt das Modul-Icon. */
function defaultTarget(): ZoomRect {
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.28,
    size: TARGET_SIZE,
  };
}

type ZoomValue = {
  phase: Phase;
  /** true, solange der Klon die Signatur trägt — das echte Icon hält sich zurück. */
  flying: boolean;
  zoomInto: (
    o: { rect: ZoomRect; variant: CellVariant },
    navigate: () => void,
  ) => void;
  arrive: (target: ZoomRect | null) => void;
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
  const [flight, setFlight] = useState<Flight | null>(null);
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

  const finish = useCallback(() => {
    const t = window.setTimeout(() => {
      set("idle");
      setFlight(null);
    }, SETTLE_MS);
    timers.current.push(t);
  }, [set]);

  const zoomInto = useCallback(
    (o: { rect: ZoomRect; variant: CellVariant }, navigate: () => void) => {
      if (phaseRef.current !== "idle") {
        // Zoom blockiert (z.B. sehr schneller Doppel-Tap) → Tap darf nicht
        // verschluckt werden, normal navigieren.
        navigate();
        return;
      }
      if (reduced) {
        navigate();
        return;
      }
      setFlight({ from: o.rect, to: defaultTarget(), variant: o.variant });
      set("zooming");
      const t = window.setTimeout(() => navigate(), ACCEL_MS);
      timers.current.push(t);
      // Notbremse: löst nur aus, wenn arrive() bis dahin nicht schon
      // "zooming" verlassen hat.
      const watchdog = window.setTimeout(() => {
        if (phaseRef.current === "zooming") {
          set("arriving");
          finish();
        }
      }, WATCHDOG_MS);
      timers.current.push(watchdog);
    },
    [reduced, set, finish],
  );

  const arrive = useCallback(
    (target: ZoomRect | null) => {
      if (phaseRef.current !== "zooming") return;
      // Mit gemeldetem Rect landet der Klon exakt auf dem echten Icon; ohne
      // (Intro-Sequenz) bleibt er auf dem Fallback-Ziel stehen und löst sich
      // dort auf.
      if (target) setFlight((f) => (f ? { ...f, to: target } : f));
      set("arriving");
      finish();
    },
    [set, finish],
  );

  return (
    <ZoomContext.Provider
      value={{ phase, flying: phase !== "idle", zoomInto, arrive }}
    >
      {children}
      <BoosterZoomOverlay phase={phase} flight={flight} />
    </ZoomContext.Provider>
  );
}

function BoosterZoomOverlay({ phase, flight }: { phase: Phase; flight: Flight | null }) {
  // Der Klon startet exakt auf dem Tap-Punkt und bekommt seine Zielwerte erst
  // im Frame danach — sonst gäbe es nichts zu transitionieren.
  const [launched, setLaunched] = useState(false);
  useEffect(() => {
    // Beide Zweige planen die Zustandsänderung über rAF statt sie synchron im
    // Effect-Körper auszulösen (kaskadierende Renders). Der Reset beim Zurück-
    // fallen auf "idle" ist unsichtbar, weil die Overlay-Komponente in diesem
    // Fall ohnehin null rendert — ein Frame Verzögerung macht keinen Unterschied.
    const raf =
      phase === "idle"
        ? requestAnimationFrame(() => setLaunched(false))
        : requestAnimationFrame(() => setLaunched(true));
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  if (phase === "idle" || !flight) return null;

  const Art = BOOSTER_ART[flight.variant];
  const dx = flight.to.x - flight.from.x;
  const dy = flight.to.y - flight.from.y;
  const scale = flight.to.size / flight.from.size;

  return (
    <div aria-hidden data-phase={phase} className="booster-zoom-overlay fixed inset-0 z-[80]">
      {/* Zwei geschachtelte Ebenen mit unterschiedlichen Kurven: x läuft
          ease-out, y ease-in → zusammen ergibt das eine weiche Bogenbahn statt
          einer geraden Linie. */}
      <div
        className="booster-zoom-arc-x absolute"
        style={
          {
            left: `${flight.from.x}px`,
            top: `${flight.from.y}px`,
            translate: launched ? `${dx}px 0` : "0 0",
          } as CSSProperties
        }
      >
        <div
          className="booster-zoom-arc-y"
          style={
            {
              translate: launched ? `0 ${dy}px` : "0 0",
            } as CSSProperties
          }
        >
          <div
            className="booster-zoom-clone"
            style={
              {
                width: `${flight.from.size}px`,
                height: `${flight.from.size}px`,
                scale: launched ? `${scale}` : "1",
                opacity: phase === "arriving" ? 0 : 1,
              } as CSSProperties
            }
          >
            <Art className="size-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
