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
import { BOOSTER_ART, type CellVariant } from "@/components/booster/booster-art";

/**
 * „Kamera-Push in den Booster“ — der Zoom-Übergang vom Kopfwetter-Hub in eine
 * Sub-Page. Das Overlay lebt im geteilten booster/layout.tsx, damit es den
 * Routenwechsel überlebt (Layouts bleiben bei Navigation zwischen Kind-Routen
 * erhalten).
 *
 * EINE Bewegung, in zwei Etappen ohne Naht dazwischen:
 *
 * „pushing“ (0 … PUSH_MS): die ganze Hub-Bühne skaliert am Tap-Punkt verankert
 * auf PUSH_SCALE und fadet dabei aus (BoosterHubStage). Der Klon liegt auf dem
 * Tap-Punkt und wächst im selben Takt mit derselben Kurve mit — er wirkt in der
 * Szene verklebt, alles andere strömt an ihm vorbei. Bei NAVIGATE_AT (kurz vor
 * Push-Ende, die Bühne ist da schon unsichtbar) wird navigiert.
 *
 * „traveling“ (PUSH_MS … +TRAVEL_MS): der Klon reist auf EINER geraden,
 * ausklingenden Bahn zum Landeplatz und schrumpft auf TARGET_SIZE. Er startet
 * nach der Uhr, NICHT auf Zuruf der Sub-Page: die Sub-Pages sind async Server
 * Components mit Supabase-Roundtrip, ihr Mount kann je nach Verbindung 300-800 ms
 * dauern. Hing der Start daran, stand der aufgeblasene Klon so lange still in der
 * Luft — aus einer Bewegung wurden drei Ereignisse. Deshalb steht das Ziel schon
 * beim Tap fest (vorausberechnet, siehe predictedTarget) und der Flug hängt an
 * keiner Netz-Latenz mehr.
 *
 * „landed“: der Klon sitzt auf dem Landeplatz und hält still, falls die Sub-Page
 * noch lädt. Gewartet wird am Ziel, nicht auf halber Strecke — das liest sich als
 * „angekommen, Seite lädt“ statt als Hänger.
 *
 * „arriving“ (SETTLE_MS): der Klon blendet aus, das echte Icon blendet ein.
 * Reduced motion: sofort navigieren, kein Klon.
 *
 * Die Bewegung selbst läuft komplett in CSS (globals.css, Animationen mit
 * animation-delay), nicht über Timer: zwischen NAVIGATE_AT und Flugstart ist der
 * Main-Thread mit der RSC-Antwort beschäftigt, ein dort verspätet feuernder Timer
 * wäre wieder ein sichtbarer Hänger. Die Timer hier führen nur noch Buch über die
 * Phase; jittern sie, verschiebt sich allenfalls der Crossfade-Moment.
 */

type Phase = "idle" | "pushing" | "traveling" | "landed" | "arriving";

/** Mittelpunkt in Viewport-Koordinaten + gerenderte Kantenlänge (px). */
export type ZoomRect = { x: number; y: number; size: number };

type Flight = {
  from: ZoomRect;
  /** Steht schon beim Tap fest — gemessen (Cache) oder vorausberechnet. */
  to: ZoomRect;
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

/** Etappe 1: Dauer und Ziel-Scale des Kamera-Push. Beides speist über
 *  Custom Properties auch die CSS-Animation der Bühne (BoosterHubStage →
 *  .booster-cells-zoom in globals.css), damit die Zahlen nur hier stehen. */
export const PUSH_MS = 420;
export const PUSH_SCALE = 2.4;
/** Navigation kurz VOR dem Ende von Etappe 1: die Bühne ist zu diesem Zeitpunkt
 *  schon auf Opacity 0 (die Keyframes ziehen die Opacity bis 65 % durch), der
 *  Wechsel ist also unsichtbar — und die Sub-Page bekommt einen Vorsprung beim
 *  Mounten. */
const NAVIGATE_AT = 340;
/** Etappe 2: Reisedauer des Klons vom Tap-Punkt auf den Landeplatz. Startet
 *  direkt am Push-Ende, wo die beschleunigende Push-Kurve am schnellsten ist —
 *  die Reise übernimmt mit Schwung, kein Frame Stillstand dazwischen. */
const TRAVEL_MS = 520;
/** Übergabe auf das echte Icon, danach verschwindet das Overlay. */
const SETTLE_MS = 260;
/** Notbremse für „landed“: falls arrive() nie feuert (Navigation hängt/schlägt
 *  fehl, z.B. auf wackliger Verbindung — PWA mit OfflineBanner, offline ist ein
 *  erwarteter Zustand), löst sich der Klon nach dieser Wartezeit trotzdem auf,
 *  statt den User vor einem schwebenden Icon sitzen zu lassen. */
const HOLD_MAX_MS = 4000;

/** Zielgröße des Klons = size-24 (96 px) des Modul-Icons. */
const TARGET_SIZE = 96;

/**
 * Abstand vom oberen Viewport-Rand (unterhalb der Safe Area) zum Mittelpunkt des
 * Modul-Icons. Alle fünf Booster-Sub-Pages bauen ihren Einstiegs-Screen gleich
 * auf, der Landeplatz ist damit rechenbar statt gemeldet:
 *
 *   61  SubPageHeader — py-3 (12 + 12) + size-9 Zurück-Pfeil (36) + border-b (1);
 *       keiner der fünf Header setzt `subtitle`, die Zeilenhöhe des Titels
 *       (text-lg → 28) bleibt also unter der des Zurück-Pfeils
 * + 24  Content-Wrapper py-6
 * +  4  ModuleIcon-Wrapper pt-1
 * + 48  halbe Icon-Höhe (size-24)
 *
 * Der Wert ist nur der Startwert: ab der zweiten Reise einer Session gewinnt der
 * gemessene Rect aus arrive() (lastTargetRef), die Vorhersage heilt sich also
 * selbst, falls das Layout wandert.
 */
const LANDING_Y = 137;

/** `env(safe-area-inset-top)` einmalig ausmessen. Bewusst über eine Wegwerf-Probe
 *  und nicht über den Layout-Wrapper: der Hub kann gescrollt sein, dessen
 *  Bounding-Rect wäre dann verschoben. */
let safeTopCache: number | null = null;
function safeAreaTop(): number {
  if (safeTopCache !== null) return safeTopCache;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  safeTopCache = probe.getBoundingClientRect().height;
  probe.remove();
  return safeTopCache;
}

/** Der vorausberechnete Landeplatz: mittig, direkt unter dem SubPageHeader. */
function predictedTarget(): ZoomRect {
  return {
    x: window.innerWidth / 2,
    y: safeAreaTop() + LANDING_Y,
    size: TARGET_SIZE,
  };
}

type ZoomValue = {
  phase: Phase;
  /** transform-origin der laufenden Reise, in Bühnen-Koordinaten. */
  stageOrigin: { x: number; y: number } | null;
  /** true, solange der Klon die Signatur trägt (Push, Reise UND das Warten auf
   *  dem Landeplatz) — das echte Icon hält sich so lange zurück. Endet mit dem
   *  Beginn der Übergabe, nicht erst mit dem Verschwinden des Overlays: so
   *  überlappen der Fade-out des Klons und der Fade-in des echten Icons, statt
   *  sequenziell hintereinander zu laufen (sonst ein sichtbares Loch ohne jedes
   *  Icon dazwischen). */
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
  // „Die Sub-Page ist da“ — entkoppelt von der Phase, weil die Meldung vor,
  // während oder nach der Reise eintreffen kann.
  const pageReadyRef = useRef(false);
  // Der zuletzt GEMESSENE Landeplatz. Der Provider lebt im persistenten
  // Booster-Layout, ab der zweiten Reise einer Session fliegt der Klon damit auf
  // den echten Rect statt auf die Vorhersage.
  const lastTargetRef = useRef<ZoomRect | null>(null);
  // Startzeitpunkt der Bewegung. Ob ein Ziel-Wechsel noch erlaubt ist, hängt an
  // dieser Uhr und NICHT an der Phase: die CSS-Animation startet punktgenau bei
  // PUSH_MS, der Phasen-Timer kann dagegen verspätet feuern (Main-Thread ist um
  // NAVIGATE_AT mit der RSC-Antwort beschäftigt). In genau diesem Jitter-Fenster
  // wäre „Phase ist noch pushing“ eine Lüge — ein Retarget würde die laufende
  // Animation springen lassen.
  const startedAtRef = useRef(0);

  const set = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // Timer nur beim Unmount des Providers aufräumen (Provider lebt im
  // Booster-Layout, überlebt normalerweise die ganze Session — dies fängt
  // z.B. Fast-Refresh/StrictMode-Remounts ab).
  useEffect(() => {
    // Die Array-Instanz beim Mount festhalten: sie wird nur befüllt (push) und
    // an Ort und Stelle geleert, nie ersetzt — der Cleanup sieht deshalb
    // garantiert alle Timer, ohne beim Unmount auf einen dann evtl. anderen
    // ref.current zugreifen zu müssen.
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
      // Aus „idle“ heraus kann kein Timer mehr etwas ausrichten (die
      // Watchdog-Timer prüfen ihre Phase). Sie hier trotzdem abzuräumen hält die
      // Liste über eine lange Session kurz — in place geleert, die Instanz
      // bleibt also die, die der Unmount-Cleanup festhält.
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current.length = 0;

      startedAtRef.current = performance.now();
      setFlight({
        from: o.rect,
        to: lastTargetRef.current ?? predictedTarget(),
        variant: o.variant,
        stageOrigin: stageOriginFor(o.rect),
      });
      arrivedRef.current = false;
      pageReadyRef.current = false;
      set("pushing");

      timers.current.push(window.setTimeout(() => navigate(), NAVIGATE_AT));
      // Etappe 2 startet nach der Uhr. Die Bewegung selbst hängt an der
      // CSS-animation-delay, dieser Timer schreibt nur die Phase fort.
      timers.current.push(window.setTimeout(() => set("traveling"), PUSH_MS));
      timers.current.push(
        window.setTimeout(() => {
          if (pageReadyRef.current) {
            set("arriving");
            finish();
            return;
          }
          // Sub-Page noch nicht da → auf dem Landeplatz warten, nicht in der Luft.
          set("landed");
          timers.current.push(
            window.setTimeout(() => {
              if (phaseRef.current === "landed") {
                set("arriving");
                finish();
              }
            }, HOLD_MAX_MS),
          );
        }, PUSH_MS + TRAVEL_MS),
      );
    },
    [reduced, set, finish],
  );

  const arrive = useCallback(
    (target: ZoomRect | null) => {
      const p = phaseRef.current;
      if (p === "idle" || p === "arriving") return;
      if (arrivedRef.current) return;
      arrivedRef.current = true;
      pageReadyRef.current = true;
      if (target) lastTargetRef.current = target;

      if (target && performance.now() - startedAtRef.current < PUSH_MS) {
        // Der Flug steht noch in seiner animation-delay-Phase: ein Wechsel der
        // Ziel-Koordinaten ist hier gratis, die Animation startet unverändert
        // und fliegt den gemessenen Rect an. Nach dem Start dagegen KEIN
        // Retarget mehr — ein Koordinaten-Wechsel mitten in der laufenden
        // Animation würde springen statt zu korrigieren. Die Landung läuft dann
        // zu Ende, die Rest-Abweichung schluckt der Crossfade (und die nächste
        // Reise fliegt dank lastTargetRef ohnehin den gemessenen Rect an).
        setFlight((f) => (f ? { ...f, to: target } : f));
      }
      if (p === "landed") {
        // Der Klon wartet schon auf dem Landeplatz → sofort übergeben.
        set("arriving");
        finish();
      }
    },
    [set, finish],
  );

  return (
    <ZoomContext.Provider
      value={{
        phase,
        stageOrigin: flight?.stageOrigin ?? null,
        flying: phase !== "idle" && phase !== "arriving",
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
  if (phase === "idle" || !flight) return null;

  const Art = BOOSTER_ART[flight.variant];
  const dx = flight.to.x - flight.from.x;
  const dy = flight.to.y - flight.from.y;
  // Die beiden Scale-Ebenen multiplizieren sich: die äußere wächst auf
  // PUSH_SCALE, die innere zieht danach auf die Endgröße zurück. Deshalb ist der
  // Zielwert der inneren Ebene relativ zur äußeren.
  const landScale = flight.to.size / flight.from.size / PUSH_SCALE;

  return (
    <div aria-hidden data-phase={phase} className="booster-zoom-overlay fixed inset-0 z-[80]">
      {/* Drei Ebenen, weil `scale` zwei Etappen mit verschiedenen Kurven braucht
          und eine Property nur eine Animation trägt: außen die Reise (translate),
          in der Mitte das Wachsen, innen das Zurückziehen auf Icon-Größe. Alle
          Dauern, Ziele und Skalen stehen nur in dieser Datei und reichen als
          Custom Properties nach unten durch (siehe globals.css). */}
      <div
        className="booster-zoom-travel absolute"
        style={
          {
            left: `${flight.from.x}px`,
            top: `${flight.from.y}px`,
            width: `${flight.from.size}px`,
            height: `${flight.from.size}px`,
            "--zoom-dx": `${dx}px`,
            "--zoom-dy": `${dy}px`,
            "--zoom-push-ms": `${PUSH_MS}ms`,
            "--zoom-travel-ms": `${TRAVEL_MS}ms`,
            "--zoom-settle-ms": `${SETTLE_MS}ms`,
            "--zoom-push-scale": `${PUSH_SCALE}`,
            "--zoom-land-scale": `${landScale}`,
          } as CSSProperties
        }
      >
        <div className="booster-zoom-push size-full">
          <div
            className="booster-zoom-clone size-full"
            style={{ opacity: phase === "arriving" ? 0 : 1 }}
          >
            <Art className="size-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
