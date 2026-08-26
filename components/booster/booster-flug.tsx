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
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { BOOSTER_ART, type CellVariant } from "@/components/booster/booster-art";
import {
  BUEHNE_AUS_MS,
  HALTEN_MAX_MS,
  HIN_MS,
  RUECK_MS,
  UEBERGABE_MS,
  WURF,
  alsCss,
  flugVektor,
  landeplatz,
  umgekehrt,
  type FlugRect,
} from "@/lib/kopfwetter/flug";

/**
 * „Der Wurf“ — der Flug zwischen Kopfwetter-Hub und Booster-Übung (KAN-60).
 *
 * Der Musterfall der Regel „ein Gegenstand überlebt die Reise“ (KAN-30): das
 * Wetter-Motiv der angetippten Zelle reist auf **einer** geraden Linie zum
 * Landeplatz unter dem SubPageHeader und wächst dabei **genau einmal** von
 * 64 px auf 96 px. Kein Kamera-Push, kein Zwischenhalt, keine zweite Kurve.
 * Die Zahlen stehen in `lib/kopfwetter/flug.ts`, die Bewegung in `globals.css`.
 *
 * Das Overlay lebt im geteilten booster/layout.tsx, damit es den Routenwechsel
 * überlebt (Layouts bleiben bei Navigation zwischen Kind-Routen erhalten) — die
 * iOS-Standalone-PWA rendert die View-Transitions-API nicht.
 *
 * **Eine** Bewegung, vier Phasen — die Richtung steht nicht in der Phase,
 * sondern am Flug (`richtung`). Hin- und Rückweg sind dieselbe Bahn, sonst wäre
 * es nicht dieselbe Bewegung:
 *
 * „travelling“ (0 … HIN_MS bzw. RUECK_MS): der Klon liegt auf dem Startpunkt
 * und reist zum Ziel. Beim Hinflug blendet die Hub-Bühne dabei aus
 * (BUEHNE_AUS_MS, reine Opacity), und an deren Ende wird navigiert — vorher
 * wäre der Wechsel sichtbar, später verlöre die Sub-Page Zeit zum Mounten. Das
 * Ziel steht schon beim Start fest (vorausberechnet), der Flug hängt an keiner
 * Netz-Latenz. Beim Rückflug wird sofort navigiert: der Hub ist das Ziel und
 * muss stehen, wenn der Klon landet.
 *
 * „landed“: nur auf dem Hinweg. Der Klon sitzt auf dem Landeplatz und hält
 * still, falls die Sub-Page noch lädt. Gewartet wird am Ziel, nicht auf halber
 * Strecke — das liest sich als „angekommen, Seite lädt“ statt als Hänger.
 *
 * „arriving“ (UEBERGABE_MS): der Klon blendet aus, das echte Icon blendet ein.
 *
 * Reduced motion: sofort navigieren, kein Klon.
 *
 * Warum die Bewegung in CSS läuft und nicht über Timer: mitten im Flug liegt
 * die Navigation, wo der Main-Thread mit der RSC-Antwort beschäftigt ist; ein
 * dort verspätet feuernder Timer wäre genau der Stillstand, den dieser Übergang
 * loswerden soll. Die Timer hier führen nur noch Buch über die Phase; jittern
 * sie, verschiebt sich allenfalls der Crossfade-Moment.
 *
 * Warum der Klon im Portal am `body` hängt und nicht im Baum darunter: der
 * generische Übergang (KAN-53) blendet bei der Heimkehr das `main` ein, und
 * zwei Opacity-Ebenen übereinander multiplizieren ihre Alphas — der Klon
 * verschwände hinter der Blende der Seite, in die er gerade fliegt.
 */

type Phase = "idle" | "travelling" | "landed" | "arriving";

type Richtung = "hin" | "zurueck";

type Flug = {
  from: FlugRect;
  /** Steht schon beim Start fest — gemessen (Cache) oder vorausberechnet. */
  to: FlugRect;
  variant: CellVariant;
  richtung: Richtung;
};

/** Der gemerkte Abflug: ohne ihn gibt es keinen Rückflug. */
type Abflug = { rect: FlugRect; variant: CellVariant };

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

function vorhergesagterLandeplatz(): FlugRect {
  return landeplatz(window.innerWidth, safeAreaTop());
}

type FlugValue = {
  phase: Phase;
  /** Die Hub-Bühne blendet aus — nur beim Hinflug, nie bei der Heimkehr. */
  buehneAus: boolean;
  /** true, solange der Klon die Signatur trägt (Reise UND Warten) — das echte
   *  Modul-Icon hält sich so lange zurück. Endet mit dem Beginn der Übergabe,
   *  nicht erst mit dem Verschwinden des Overlays: so überlappen der Fade-out
   *  des Klons und der Fade-in des echten Icons, statt sequenziell
   *  hintereinander zu laufen (sonst ein sichtbares Loch ohne jedes Icon). */
  flying: boolean;
  /** Die Hub-Zelle, deren Motiv gerade als Klon nach Hause unterwegs ist. Ihr
   *  eigenes Icon bleibt so lange leer — sonst stünde der Gegenstand doppelt im
   *  Bild, einmal fliegend und einmal schon angekommen. */
  heimkehr: CellVariant | null;
  starteFlug: (
    o: { rect: FlugRect; variant: CellVariant },
    navigate: () => void,
  ) => void;
  arrive: (target: FlugRect | null) => void;
  /** Steht ein gemerkter Abflug für einen Rückflug bereit? Der Zurück-Pfeil
   *  entscheidet daran, ob er als Flug oder als schlichter Link rendert. */
  kannZurueck: boolean;
  /** Der Rückweg. Ohne gemerkten Abflug (Direkt-Load, Reload, Homescreen)
   *  bleibt es bei `normal` — das ist die Regel, kein Sonderfall: es gibt
   *  keinen Start, auf den man zurückfliegen könnte. */
  flyBack: (normal: () => void) => void;
};

const FlugContext = createContext<FlugValue | null>(null);

export function useBoosterFlug(): FlugValue {
  const ctx = useContext(FlugContext);
  if (!ctx) {
    throw new Error("useBoosterFlug muss innerhalb von <BoosterFlugProvider> verwendet werden");
  }
  return ctx;
}

export function BoosterFlugProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [flug, setFlug] = useState<Flug | null>(null);
  // Der gemerkte Abflug lebt als State, nicht als Ref: der Zurück-Pfeil rendert
  // je nachdem als Button (Rückflug) oder als Link (kein Rückflug) und muss
  // davon erfahren. Er kann sich nur ändern, während der Hub steht — von einer
  // Sub-Page aus führt kein Weg zu einer anderen.
  const [abflug, setAbflug] = useState<Abflug | null>(null);
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
  // den echten Rect statt auf die Vorhersage — und der Rückflug startet dort, wo
  // das Icon wirklich saß.
  const lastTargetRef = useRef<FlugRect | null>(null);

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

  /**
   * Bricht einen laufenden Flug ab und räumt seine Timer weg.
   *
   * Der Grund ist nicht Ordnungsliebe: der offene Navigations-Timer des
   * laufenden Flugs schöbe sonst gleich darauf SEINE Route über die eben
   * angestoßene — der neue Tap wäre wirkungslos, obwohl er sichtbar navigiert
   * hat. Aus „idle“ heraus ist der Aufruf ein no-op und hält bloß die
   * Timer-Liste über eine lange Session kurz; sie wird in place geleert, die
   * Instanz bleibt also die, die der Unmount-Cleanup festhält.
   */
  const brichAb = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current.length = 0;
    if (phaseRef.current !== "idle") {
      set("idle");
      setFlug(null);
    }
  }, [set]);

  const finish = useCallback(() => {
    const t = window.setTimeout(() => {
      set("idle");
      setFlug(null);
    }, UEBERGABE_MS);
    timers.current.push(t);
  }, [set]);

  const starteFlug = useCallback(
    (o: { rect: FlugRect; variant: CellVariant }, navigate: () => void) => {
      const lief = phaseRef.current !== "idle";
      brichAb();

      if (lief || reduced) {
        // Ein zweiter Tap, während noch ein Flug läuft (oder Bewegung
        // abbestellt): der neue Tap gewinnt und navigiert normal. Ein zweiter
        // Klon, der vom eben ausgeblendeten Hub startet, hätte keinen sichtbaren
        // Abflugpunkt mehr.
        //
        // Und kein gemerkter Abflug: dieser Eintritt kam nicht über einen Flug.
        // Bliebe der Abflug des ersten Taps stehen, flöge der Zurück-Pfeil auf
        // der neuen Seite das Motiv der alten auf deren Zelle zurück.
        setAbflug(null);
        navigate();
        return;
      }

      setFlug({
        from: o.rect,
        to: lastTargetRef.current ?? vorhergesagterLandeplatz(),
        variant: o.variant,
        richtung: "hin",
      });
      // Der Start-Rect des Hinflugs IST das Ziel des Rückflugs.
      setAbflug({ rect: o.rect, variant: o.variant });
      arrivedRef.current = false;
      pageReadyRef.current = false;
      set("travelling");

      // Navigiert wird am Ende der Bühnen-Blende: davor wäre der Wechsel
      // sichtbar, danach verlöre die Sub-Page Zeit zum Mounten. Der Klon fliegt
      // darüber hinweg und deckt den Wechsel ab.
      timers.current.push(window.setTimeout(() => navigate(), BUEHNE_AUS_MS));
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
            }, HALTEN_MAX_MS),
          );
        }, HIN_MS),
      );
    },
    [reduced, set, finish, brichAb],
  );

  const arrive = useCallback(
    (target: FlugRect | null) => {
      const p = phaseRef.current;
      // Gemeldet wird nur der Hinweg. Beim Rückflug ist der Hub das Ziel, und
      // der meldet nichts: die Melder (ModuleIcon, BoosterArrive) stehen auf den
      // Sub-Pages, und `arrivedRef` steht seit dem Hinflug ohnehin auf true.
      if (p === "idle" || p === "arriving") return;
      if (arrivedRef.current) return;
      arrivedRef.current = true;
      pageReadyRef.current = true;
      // Die Selbstheilung: der gemessene Rect gewinnt — aber erst für die
      // nächste Reise. Der Flug steht in keiner Delay-Phase mehr, in der ein
      // Ziel-Wechsel gratis wäre; ein Koordinaten-Wechsel mitten in der
      // laufenden Animation würde springen statt zu korrigieren. Die
      // Rest-Abweichung schluckt der Crossfade.
      if (target) lastTargetRef.current = target;

      if (p === "landed") {
        // Der Klon wartet schon auf dem Landeplatz → sofort übergeben.
        set("arriving");
        finish();
      }
    },
    [set, finish],
  );

  const flyBack = useCallback(
    (normal: () => void) => {
      if (!abflug) {
        // Kein gemerkter Abflug (Direkt-Load, Reload, vom Homescreen): es gibt
        // keinen Start, auf den man zurückfliegen könnte.
        normal();
        return;
      }
      // Ein noch laufender Hinflug wird abgebrochen — der Rückweg gewinnt.
      brichAb();
      // Ein Abflug, ein Rückflug: hiermit verbraucht. Ein zweiter Zurück-Tap
      // fällt auf den normalen Weg zurück, statt ein zweites Mal auf dieselbe
      // Zelle zu fliegen.
      setAbflug(null);

      // `back()` statt `push("/booster")` — und zwar auf JEDEM Weg von hier ab,
      // auch ohne Klon: der Eintritt kam über einen Flug, es gibt also einen
      // History-Eintritt, und nur `back()` stellt die Scroll-Position des Hubs
      // wieder her. Ohne sie stimmt der gemerkte Rect nicht mehr.
      router.back();

      if (reduced) return;

      setFlug({
        from: lastTargetRef.current ?? vorhergesagterLandeplatz(),
        to: abflug.rect,
        variant: abflug.variant,
        richtung: "zurueck",
      });
      set("travelling");
      timers.current.push(
        window.setTimeout(() => {
          set("arriving");
          finish();
        }, RUECK_MS),
      );
    },
    [reduced, abflug, set, finish, brichAb, router],
  );

  return (
    <FlugContext.Provider
      value={{
        phase,
        buehneAus: phase !== "idle" && flug?.richtung === "hin",
        flying: phase === "travelling" || phase === "landed",
        heimkehr:
          phase === "travelling" && flug?.richtung === "zurueck"
            ? flug.variant
            : null,
        kannZurueck: abflug !== null,
        starteFlug,
        arrive,
        flyBack,
      }}
    >
      {children}
      <BoosterFlugOverlay phase={phase} flug={flug} />
    </FlugContext.Provider>
  );
}

function BoosterFlugOverlay({ phase, flug }: { phase: Phase; flug: Flug | null }) {
  if (phase === "idle" || !flug) return null;

  const Art = BOOSTER_ART[flug.variant];
  const { dx, dy, scale } = flugVektor(flug.from, flug.to);
  const zurueck = flug.richtung === "zurueck";

  return createPortal(
    <div aria-hidden data-phase={phase} className="booster-flug-overlay fixed inset-0 z-[80]">
      {/* EINE Ebene, eine Bewegung, eine Skalierung — mehr braucht der Wurf
          nicht. Der Mittelpunkt sitzt über left/top statt über ein konstantes
          `translate: -50% -50%`: so bleibt die eigenständige Property
          `translate` allein für die Reise frei und `scale` allein fürs Wachsen,
          beide auf demselben Element. (`scale` wird vor `translate` angewandt,
          der Mittelpunkt wandert also genau um dx/dy und wächst um sich selbst.)
          Alle Zahlen reichen als Custom Properties nach unten durch, damit sie
          nur an einer Stelle stehen.

          Der `key` auf der Richtung: wechselt ein laufender Hinflug direkt in
          einen Rückflug (Zurück-Tap, während der Klon noch reist), bleibt ohne
          ihn dasselbe DOM-Element stehen — und eine laufende Animation startet
          nicht neu, nur weil sich ihre Custom Properties ändern. Der Klon
          spränge auf den neuen Endwert, statt zurückzufliegen. */}
      <div
        key={flug.richtung}
        className="booster-flug-klon absolute"
        style={
          {
            left: `${flug.from.x - flug.from.size / 2}px`,
            top: `${flug.from.y - flug.from.size / 2}px`,
            width: `${flug.from.size}px`,
            height: `${flug.from.size}px`,
            opacity: phase === "arriving" ? 0 : 1,
            "--flug-dx": `${dx}px`,
            "--flug-dy": `${dy}px`,
            "--flug-scale": `${scale}`,
            "--flug-ms": `${zurueck ? RUECK_MS : HIN_MS}ms`,
            "--flug-kurve": alsCss(zurueck ? umgekehrt(WURF) : WURF),
            "--flug-uebergabe-ms": `${UEBERGABE_MS}ms`,
          } as CSSProperties
        }
      >
        <Art className="size-full" />
      </div>
    </div>,
    document.body,
  );
}
