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
 * „Kamera-Push in den Booster“ — der Zoom-Übergang vom Kopfwetter-Hub in eine
 * Sub-Page. Das Overlay lebt im geteilten booster/layout.tsx, damit es den
 * Routenwechsel überlebt (Layouts bleiben bei Navigation zwischen Kind-Routen
 * erhalten).
 *
 * Zwei Takte, jeder mit genau EINEM Ziel — deshalb gibt es unterwegs nichts zu
 * korrigieren und keinen Knick in der Bahn:
 *
 * Takt 1 „pushing“ (PUSH_MS): die ganze Hub-Bühne skaliert am Tap-Punkt verankert
 * auf PUSH_SCALE und fadet dabei aus (BoosterHubStage). Der Klon liegt auf dem
 * Tap-Punkt und wächst im selben Takt mit derselben Kurve mit — er wirkt in der
 * Szene verklebt, alles andere strömt an ihm vorbei. Bei NAVIGATE_AT (kurz vor
 * Push-Ende, die Bühne ist da schon unsichtbar) wird navigiert.
 *
 * Takt 2 „traveling“ (TRAVEL_MS): erst wenn die Sub-Page ihr Icon-Rect gemeldet
 * hat (arrive()), reist der Klon auf EINER geraden, ausklingenden Bahn direkt
 * dorthin und schrumpft auf TARGET_SIZE.
 *
 * „arriving“ (SETTLE_MS): der Klon blendet aus, das echte Icon blendet ein.
 * Reduced motion: sofort navigieren, kein Klon.
 */

type Phase = "idle" | "pushing" | "traveling" | "arriving";

/** Mittelpunkt in Viewport-Koordinaten + gerenderte Kantenlänge (px). */
export type ZoomRect = { x: number; y: number; size: number };

type Flight = {
  from: ZoomRect;
  to: ZoomRect | null;
  variant: CellVariant;
  /** Tap-Punkt in den Koordinaten der Hub-Bühne = deren transform-origin. */
  stageOrigin: { x: number; y: number } | null;
};

/** Markiert die skalierende Box der Hub-Bühne (BoosterHubStage). */
export const STAGE_ATTR = "data-booster-stage";

/** Rechnet den Tap-Punkt in Bühnen-Koordinaten um. Bewusst hier und per
 *  Attribut-Lookup statt über einen Layout-Effect in der Bühne: so steht der
 *  Ursprung schon im selben Render, in dem die Push-Klasse gesetzt wird, und
 *  der erste Frame skaliert garantiert um den richtigen Punkt. Ohne Bühne
 *  (Zoom von woanders) bleibt es beim CSS-Default `center`. */
function stageOriginFor(rect: ZoomRect): { x: number; y: number } | null {
  const stage = document.querySelector(`[${STAGE_ATTR}]`);
  if (!stage) return null;
  const s = stage.getBoundingClientRect();
  return { x: rect.x - s.left, y: rect.y - s.top };
}

/** Takt 1: Dauer und Ziel-Scale des Kamera-Push. Beides speist über
 *  Custom Properties auch die CSS-Animation der Bühne (BoosterHubStage →
 *  .booster-cells-zoom in globals.css), damit die Zahlen nur hier stehen. */
export const PUSH_MS = 420;
export const PUSH_SCALE = 2.4;
/** Navigation kurz VOR dem Ende von Takt 1: die Bühne ist zu diesem Zeitpunkt
 *  schon auf Opacity 0 (die Keyframes ziehen die Opacity bis 65 % durch), der
 *  Wechsel ist also unsichtbar — und die Sub-Page bekommt einen Vorsprung beim
 *  Mounten, damit Takt 2 möglichst nahtlos an Takt 1 anschließt. */
const NAVIGATE_AT = 340;
/** Takt 2: Reisedauer des Klons vom Tap-Punkt auf das gemeldete Icon. */
const TRAVEL_MS = 520;
/** Übergabe auf das echte Icon, danach verschwindet das Overlay. */
const SETTLE_MS = 260;
/** Notbremse: falls arrive() nie feuert (Navigation hängt/schlägt fehl, z.B. auf
 *  wackliger Verbindung — PWA mit OfflineBanner, offline ist ein erwarteter
 *  Zustand), zwingt dieser Deckel „pushing“ zurück auf „idle“, statt den User
 *  hinter einem Overlay stecken zu lassen. */
const WATCHDOG_MS = NAVIGATE_AT + 4000;

/** Zielgröße des Klons = size-20 (80 px) des Modul-Icons. */
const TARGET_SIZE = 80;
/** Nur für arrive(null) — Seiten ohne Modul-Icon (Intro-Sequenz beim
 *  Erstbesuch). Der Klon reist zu dieser Stelle und löst sich dort auf. */
function dissolveTarget(): ZoomRect {
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.28,
    size: TARGET_SIZE,
  };
}

type ZoomValue = {
  phase: Phase;
  /** transform-origin der laufenden Reise, in Bühnen-Koordinaten. */
  stageOrigin: { x: number; y: number } | null;
  /** true, solange der Klon die Signatur trägt (Takt 1 + 2) — das echte Icon
   *  hält sich so lange zurück. Endet mit dem Flug, nicht erst mit dem
   *  Verschwinden des Overlays: so überlappen der Fade-out des Klons und der
   *  Fade-in des echten Icons, statt sequenziell hintereinander zu laufen
   *  (sonst ein sichtbares Loch ohne jedes Icon dazwischen). */
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
  // Erste Ankunfts-Meldung gewinnt: Modul-Icon UND BoosterArrive melden im
  // selben Mount-Zyklus, der Phase-Check allein würde den zweiten Aufruf im
  // gleichen Frame nicht sicher abweisen.
  const arrivedRef = useRef(false);

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
      setFlight({
        from: o.rect,
        to: null,
        variant: o.variant,
        stageOrigin: stageOriginFor(o.rect),
      });
      arrivedRef.current = false;
      set("pushing");
      const t = window.setTimeout(() => navigate(), NAVIGATE_AT);
      timers.current.push(t);
      // Notbremse: löst nur aus, wenn arrive() bis dahin nicht schon
      // „pushing“ verlassen hat.
      const watchdog = window.setTimeout(() => {
        if (phaseRef.current === "pushing") {
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
      if (phaseRef.current !== "pushing" || arrivedRef.current) return;
      arrivedRef.current = true;
      // Ab hier steht das Ziel fest — Takt 2 fliegt es in einer Bewegung an.
      // Ohne gemeldetes Rect (Seite ohne Modul-Icon) reist der Klon zur
      // Auflöse-Position und verschwindet dort.
      setFlight((f) => (f ? { ...f, to: target ?? dissolveTarget() } : f));
      set("traveling");
      const t = window.setTimeout(() => {
        set("arriving");
        finish();
      }, TRAVEL_MS);
      timers.current.push(t);
    },
    [set, finish],
  );

  return (
    <ZoomContext.Provider
      value={{
        phase,
        stageOrigin: flight?.stageOrigin ?? null,
        flying: phase === "pushing" || phase === "traveling",
        zoomInto,
        arrive,
      }}
    >
      {children}
      <BoosterZoomOverlay phase={phase} flight={flight} />
    </ZoomContext.Provider>
  );
}

function BoosterZoomOverlay({ phase, flight }: { phase: Phase; flight: Flight | null }) {
  // Der Klon startet exakt auf dem Tap-Punkt in Originalgröße und bekommt seine
  // Takt-1-Zielwerte erst im Frame danach — sonst gäbe es nichts zu
  // transitionieren.
  const [launched, setLaunched] = useState(false);
  useEffect(() => {
    // Beide Zweige planen die Zustandsänderung über rAF statt sie synchron im
    // Effect-Körper auszulösen (kaskadierende Renders). Der Reset beim Zurück-
    // fallen auf „idle“ ist unsichtbar, weil die Overlay-Komponente in diesem
    // Fall ohnehin null rendert.
    if (phase === "idle") {
      const raf = requestAnimationFrame(() => setLaunched(false));
      return () => cancelAnimationFrame(raf);
    }
    if (phase === "pushing") {
      const raf = requestAnimationFrame(() => setLaunched(true));
      return () => cancelAnimationFrame(raf);
    }
    // „traveling“/„arriving“: launched bleibt true, der Flug läuft weiter.
    return undefined;
  }, [phase]);

  if (phase === "idle" || !flight) return null;

  const Art = BOOSTER_ART[flight.variant];
  const traveling = phase === "traveling" || phase === "arriving";
  const dx = flight.to ? flight.to.x - flight.from.x : 0;
  const dy = flight.to ? flight.to.y - flight.from.y : 0;
  // Takt 1 wächst mit der Bühne mit, Takt 2 schrumpft auf die Größe des echten
  // Modul-Icons. Vor dem ersten Frame (launched === false) sitzt der Klon in
  // Originalgröße auf dem Tap-Punkt. Ohne Ziel (Watchdog-Pfad: arrive() kam
  // nie) bleibt er auf Push-Größe stehen und blendet dort aus.
  const scale =
    traveling && flight.to
      ? flight.to.size / flight.from.size
      : launched
        ? PUSH_SCALE
        : 1;

  return (
    <div aria-hidden data-phase={phase} className="booster-zoom-overlay fixed inset-0 z-[80]">
      <div
        className="booster-zoom-travel absolute"
        style={
          {
            left: `${flight.from.x}px`,
            top: `${flight.from.y}px`,
            translate: traveling ? `${dx}px ${dy}px` : "0 0",
            // Alle Dauern stehen nur hier (TS ist die Quelle) und vererben sich
            // an den Klon weiter — siehe die transition-Deklarationen in
            // globals.css.
            "--zoom-push-ms": `${PUSH_MS}ms`,
            "--zoom-travel-ms": `${TRAVEL_MS}ms`,
            "--zoom-settle-ms": `${SETTLE_MS}ms`,
          } as CSSProperties
        }
      >
        <div
          className="booster-zoom-clone"
          data-beat={traveling ? "travel" : "push"}
          style={
            {
              width: `${flight.from.size}px`,
              height: `${flight.from.size}px`,
              scale: `${scale}`,
              opacity: phase === "arriving" ? 0 : 1,
            } as CSSProperties
          }
        >
          <Art className="size-full" />
        </div>
      </div>
    </div>
  );
}
