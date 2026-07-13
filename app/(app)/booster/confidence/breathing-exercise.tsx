"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// 4-7-8-Atemübung — genutzt vom „Gleich bin ich dran"-Flow (Atem-Schritt).
// ---------------------------------------------------------------------------

type Phase = "einatmen" | "halten" | "ausatmen";

const PHASE_LABEL: Record<Phase, string> = {
  einatmen: "Einatmen",
  halten: "Halten",
  ausatmen: "Ausatmen",
};

/** Phasendauern in Sekunden — die 4-7-8-Atmung. */
const PHASE_SECONDS: Record<Phase, number> = {
  einatmen: 4,
  halten: 7,
  ausatmen: 8,
};

const TOTAL_CYCLES = 4;

export function BreathingExercise({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState<Phase>("einatmen");
  const [secondsLeft, setSecondsLeft] = useState(PHASE_SECONDS.einatmen);
  const [cycle, setCycle] = useState(0);
  const [runId, setRunId] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }

  function switchPhase(next: Phase) {
    setPhase(next);
    setSecondsLeft(PHASE_SECONDS[next]);
  }

  function scheduleCyclePhases() {
    switchPhase("einatmen");
    timeoutsRef.current.push(setTimeout(() => switchPhase("halten"), 4000));
    timeoutsRef.current.push(setTimeout(() => switchPhase("ausatmen"), 11000));
  }

  function start() {
    clearTimers();
    setDone(false);
    setRunning(true);
    setCycle(1);
    setRunId((id) => id + 1);
    scheduleCyclePhases();

    // Sichtbarer Sekunden-Countdown. Die Phasen-Timeouts setzen ihn bei jedem
    // Wechsel hart zurück, damit sich über 4 Runden kein Drift aufsummiert;
    // Math.max verhindert eine 0 im letzten Tick vor dem Wechsel.
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(1, s - 1));
    }, 1000);

    let current = 1;
    intervalRef.current = setInterval(() => {
      current += 1;
      if (current > TOTAL_CYCLES) return;
      setCycle(current);
      scheduleCyclePhases();
    }, 19000);
  }

  function handleAnimationEnd() {
    clearTimers();
    setRunning(false);
    setDone(true);
    onDone?.();
  }

  // Clean up any running timers when the component unmounts.
  useEffect(() => () => clearTimers(), []);

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="flex h-48 w-48 items-center justify-center">
        {/* Der Kreis IST der Start-Button (Muster: CountdownCircle im
            Overthinking-Wizard) — kein separater Button darunter. */}
        <button
          key={runId}
          type="button"
          onClick={start}
          disabled={running}
          aria-label={done ? "Atemübung nochmal starten" : "Atemübung starten"}
          onAnimationEnd={running ? handleAnimationEnd : undefined}
          style={
            running
              ? {
                  animationName: "breathe478",
                  animationDuration: "19s",
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: TOTAL_CYCLES,
                }
              : undefined
          }
          className="flex size-40 items-center justify-center rounded-full bg-cleanser-confidence/20 text-center text-cleanser-confidence outline-none transition-transform focus-visible:ring-2 focus-visible:ring-cleanser-confidence/40 focus-visible:ring-offset-2 enabled:cursor-pointer enabled:hover:scale-[1.02] enabled:active:scale-[0.98]"
        >
          {running ? (
            <span className="flex flex-col items-center gap-0.5">
              <span className="font-heading text-lg font-medium">
                {PHASE_LABEL[phase]}
              </span>
              <span className="font-heading text-3xl font-semibold tabular-nums">
                {secondsLeft}
              </span>
            </span>
          ) : (
            <span className="font-heading text-lg font-medium">
              {done ? "Nochmal?" : "Start"}
            </span>
          )}
        </button>
      </div>

      <p className="h-5 text-sm text-muted-foreground">
        {running ? `Runde ${cycle} von ${TOTAL_CYCLES}` : ""}
      </p>

      {done ? (
        <p className="text-center text-base text-foreground">
          Vier Runden geschafft. Spürst du den Unterschied? Dein Nervensystem
          ist jetzt ein Stück ruhiger.
        </p>
      ) : (
        <p className="text-center text-base text-muted-foreground">
          Tippe auf den Kreis: 4 Sekunden einatmen, 7 Sekunden halten,
          8 Sekunden ausatmen — vier Runden lang.
        </p>
      )}
    </div>
  );
}
