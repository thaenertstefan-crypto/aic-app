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

// Bei ~ACCEL_MS ist der Wash nahezu deckend → Navigation verbirgt den Mount-Flash.
const ACCEL_MS = 500;
// Dauer der Auflösung/Ankunft, bevor das Overlay wieder verschwindet.
const DECEL_MS = 760;

type WarpValue = {
  phase: Phase;
  /** Löst den Sturz aus und navigiert nach der Beschleunigung. */
  dive: (navigate: () => void) => void;
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

export function WarpProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<number[]>([]);

  const set = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const dive = useCallback(
    (navigate: () => void) => {
      if (phaseRef.current !== "idle") return;
      // Reduced motion: kein Warp — direkt navigieren.
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

  const arrive = useCallback(() => {
    if (phaseRef.current !== "diving") return;
    set("arriving");
    const t = window.setTimeout(() => set("idle"), DECEL_MS);
    timers.current.push(t);
  }, [set]);

  return (
    <WarpContext.Provider value={{ phase, dive, arrive }}>
      {children}
      <WarpOverlay phase={phase} />
    </WarpContext.Provider>
  );
}

// Deterministisches Streifenfeld (kein Math.random → kein Hydration-Mismatch).
// Verteilt über die Breite, mit versetzten Startpunkten/Delays für den Stream.
const STREAK_COUNT = 30;
const STREAKS = Array.from({ length: STREAK_COUNT }, (_, i) => ({
  id: i,
  // gestreute, nicht bandende Horizontalverteilung
  left: (i * 37 + (i % 5) * 6) % 100,
  // Startversatz oberhalb des Bildes, gestaffelt
  top: -12 - (i % 7) * 9,
  // Ruhelänge des Streifens (wird per scaleY gestreckt)
  len: 40 + (i % 4) * 26,
  delayMs: (i % 6) * 35,
  durMs: 460 + (i % 5) * 70,
  // dünn/dick für Tiefe
  width: i % 3 === 0 ? 2.5 : 1.5,
}));

function WarpOverlay({ phase }: { phase: Phase }) {
  if (phase === "idle") return null;

  return (
    <div
      aria-hidden
      data-phase={phase}
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
