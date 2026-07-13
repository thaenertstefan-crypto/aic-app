"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// 4-7-8-Atemübung — genutzt vom „Gleich bin ich dran"-Flow (Atem-Schritt).
// ---------------------------------------------------------------------------

type Phase = "einatmen" | "halten" | "ausatmen";

const PHASE_LABEL: Record<Phase, string> = {
  einatmen: "Einatmen",
  halten: "Halten",
  ausatmen: "Ausatmen",
};

const TOTAL_CYCLES = 4;

export function BreathingExercise({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState<Phase>("einatmen");
  const [cycle, setCycle] = useState(0);
  const [runId, setRunId] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }

  function scheduleCyclePhases() {
    setPhase("einatmen");
    timeoutsRef.current.push(setTimeout(() => setPhase("halten"), 4000));
    timeoutsRef.current.push(setTimeout(() => setPhase("ausatmen"), 11000));
  }

  function start() {
    clearTimers();
    setDone(false);
    setRunning(true);
    setCycle(1);
    setRunId((id) => id + 1);
    scheduleCyclePhases();

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
        <div
          key={runId}
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
          className="flex size-40 items-center justify-center rounded-full bg-cleanser-confidence/20 text-center text-cleanser-confidence"
        >
          <span className="font-heading text-lg font-medium">
            {done ? "Geschafft!" : running ? PHASE_LABEL[phase] : "Bereit?"}
          </span>
        </div>
      </div>

      <p className="h-5 text-sm text-muted-foreground">
        {running ? `Runde ${cycle} von ${TOTAL_CYCLES}` : ""}
      </p>

      {done ? (
        <p className="text-center text-base text-foreground">
          Vier Runden geschafft. Spürst du den Unterschied? Dein Nervensystem ist
          jetzt ein Stück ruhiger.
        </p>
      ) : (
        <p className="text-center text-base text-muted-foreground">
          4 Sekunden einatmen, 7 Sekunden halten, 8 Sekunden ausatmen — vier
          Runden lang. Folge einfach dem Kreis.
        </p>
      )}

      {!running &&
        (done ? (
          <Button variant="outline" onClick={start}>
            Nochmal
          </Button>
        ) : (
          <Button onClick={start}>Start</Button>
        ))}
    </div>
  );
}
