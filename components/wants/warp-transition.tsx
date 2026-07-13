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
 * „Der Sturz" — der Warp-Übergang von /me/wants hinunter in die Sternschmiede.
 *
 * Das Overlay lebt im gemeinsamen Layout (app/(app)/me/wants/layout.tsx), damit
 * seine CSS-Animation den Routenwechsel überlebt: Layouts bleiben bei Navigation
 * zwischen Kind-Routen erhalten, also läuft ein einmal gestarteter Warp
 * durchgehend weiter, während darunter navigiert wird.
 *
 * Ablauf: dive() → phase "diving" (Sterne strecken sich zu Abwärts-Streifen, der
 * Wash deckt die Navigation), nach ACCEL_MS wird navigiert. Die Schmiede ruft
 * beim Mount arrive() → phase "arriving" (Streifen lösen sich auf, Glut wischt
 * weg, Overlay blendet auf 0). Bei reduced motion: sofort navigieren, kein Warp.
 */

type Phase = "idle" | "diving" | "arriving";
// Richtung der Kamerafahrt: "down" = Sturz in die Schmiede (wants→schmiede),
// "up" = Aufstieg zurück in den Sternenhimmel (schmiede→wants).
type Direction = "down" | "up";

// Navigation mitten im Exit der Quell-Seite; das Overlay überbrückt die Mount-Naht.
const ACCEL_MS = 500;
// Reiner Streifen-Tunnel-Beat: Phase bleibt so lange auf "diving" (Streifen
// loopen weiter), beide Seiten sind off-screen — der prominente Tunnel-Moment.
const TUNNEL_MS = 420;
// Dauer der Auflösung/Ankunft, bevor das Overlay wieder verschwindet.
const DECEL_MS = 760;

type WarpValue = {
  phase: Phase;
  direction: Direction;
  /** Sturz in die Schmiede (wants→schmiede); navigiert nach der Beschleunigung. */
  dive: (navigate: () => void) => void;
  /** Aufstieg zurück zu den Sternen (schmiede→wants); Sturz rückwärts. */
  ascend: (navigate: () => void) => void;
  /** Von der Zielseite beim Mount aufgerufen; no-op ohne laufenden Sturz. */
  arrive: () => void;
};

const WarpContext = createContext<WarpValue | null>(null);

export function useWarp(): WarpValue {
  const ctx = useContext(WarpContext);
  if (!ctx) {
    throw new Error("useWarp muss innerhalb von <WarpProvider> verwendet werden");
  }
  return ctx;
}

/**
 * Zentrale Zuordnung: welche Seiten-Slide-Klasse trägt eine Seite gerade?
 * Je nach Richtung ist eine Seite Quelle (slidet raus) und die andere Ziel
 * (hält off-screen → slidet rein). `idle` → keine Klasse (normaler Load).
 */
export function warpPageClass(
  role: "wants" | "schmiede",
  phase: Phase,
  direction: Direction,
): string {
  const source = direction === "down" ? "wants" : "schmiede";
  if (role === source) {
    // Quelle fährt raus (nur während "diving"; danach unmountet die Seite).
    if (phase !== "diving") return "";
    return direction === "down" ? "warp-page-exit" : "warp-page-exit-down";
  }
  // Ziel: erst off-screen halten (diving inkl. Tunnel), dann hereinfahren.
  if (phase === "diving") return direction === "down" ? "warp-page-below" : "warp-page-above";
  if (phase === "arriving") return direction === "down" ? "warp-page-enter" : "warp-page-enter-down";
  return "";
}

export function WarpProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [direction, setDirection] = useState<Direction>("down");
  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<number[]>([]);

  const set = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // Gemeinsamer Start für beide Richtungen: Phase "diving", nach ACCEL_MS
  // navigieren. Reduced motion → sofort navigieren (kein Warp).
  const start = useCallback(
    (dir: Direction, navigate: () => void) => {
      if (phaseRef.current !== "idle") return;
      setDirection(dir);
      if (reduced) {
        navigate();
        return;
      }
      set("diving");
      const t = window.setTimeout(() => navigate(), ACCEL_MS);
      timers.current.push(t);
    },
    [reduced, set],
  );

  const dive = useCallback((navigate: () => void) => start("down", navigate), [start]);
  const ascend = useCallback((navigate: () => void) => start("up", navigate), [start]);

  const arrive = useCallback(() => {
    if (phaseRef.current !== "diving") return;
    // Erst den Tunnel-Beat halten (Phase bleibt "diving" → Streifen loopen,
    // beide Seiten off-screen), dann ankommen und das Overlay auflösen.
    const t1 = window.setTimeout(() => {
      set("arriving");
      const t2 = window.setTimeout(() => set("idle"), DECEL_MS);
      timers.current.push(t2);
    }, TUNNEL_MS);
    timers.current.push(t1);
  }, [set]);

  return (
    <WarpContext.Provider value={{ phase, direction, dive, ascend, arrive }}>
      {children}
      <WarpOverlay phase={phase} direction={direction} />
    </WarpContext.Provider>
  );
}

// Deterministisches Streifenfeld (kein Math.random → kein Hydration-Mismatch).
// Dicht über Breite UND Höhe verteilt, mit versetzten Delays → beim Endlos-Loop
// ein durchgehend gefüllter, aufwärts fließender Tunnel.
const STREAK_COUNT = 48;
const STREAKS = Array.from({ length: STREAK_COUNT }, (_, i) => ({
  id: i,
  // gestreute, nicht bandende Horizontalverteilung
  left: (i * 37 + (i % 5) * 6) % 100,
  // über die volle Höhe streuen (0–110%), damit der Tunnel überall gefüllt ist
  top: (i * 29 + (i % 4) * 11) % 110,
  // Ruhelänge des Streifens (wird per scaleY gestreckt)
  len: 60 + (i % 5) * 22,
  delayMs: (i % 8) * 55,
  durMs: 460 + (i % 5) * 70,
  // dünn/dick für Tiefe
  width: i % 4 === 0 ? 3.5 : i % 2 === 0 ? 2.5 : 1.5,
}));

function WarpOverlay({ phase, direction }: { phase: Phase; direction: Direction }) {
  if (phase === "idle") return null;

  return (
    <div
      aria-hidden
      data-phase={phase}
      data-direction={direction}
      className="warp-overlay fixed inset-0 z-[80]"
      style={{ pointerEvents: "auto" }}
    >
      {/* Wash: dunkel oben → warme Glut unten. Deckt beim Sturz die Navigation. */}
      <div className="warp-wash absolute inset-0" />

      {/* Streifenfeld — Sterne, die sich zu Lichtlinien strecken. */}
      <div className="absolute inset-0 overflow-hidden">
        {STREAKS.map((s) => (
          <span
            key={s.id}
            className="warp-streak"
            style={
              {
                left: `${s.left}%`,
                top: `${s.top}%`,
                height: `${s.len}px`,
                width: `${s.width}px`,
                animationDelay: `${s.delayMs}ms`,
                "--warp-dur": `${s.durMs}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
