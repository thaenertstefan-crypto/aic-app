"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { SubPageHeader } from "@/components/layout/sub-page-header";
import { CleanserIntroSection } from "@/components/cleansers/cleanser-intro-section";
import { Button } from "@/components/ui/button";

type TextExercise = {
  title: string;
  short: string;
  detail: string;
};

const EXERCISES: TextExercise[] = [
  {
    title: "Pause-Knopf",
    short: "Kurz innehalten statt sofort losreden.",
    detail:
      "Drück innerlich auf Pause, bevor du antwortest. Eine Sekunde Stille fühlt sich für dich endlos an — für dein Gegenüber wirkt sie ruhig und souverän. Atme einmal durch, dann sprich. So vermeidest du Füllwörter und hastiges Gerede.",
  },
  {
    title: "„Ich weiß es nicht“",
    short: "Zugeben, statt zu bluffen.",
    detail:
      "Wenn du etwas nicht weißt, sag es offen: „Das weiß ich gerade nicht — ich finde es heraus.“ Das wirkt nicht schwach, sondern glaubwürdig. Wer ehrlich mit Wissenslücken umgeht, dem glaubt man auch den Rest.",
  },
  {
    title: "Nicht „nur“",
    short: "Wörter streichen, die dich kleinmachen.",
    detail:
      "Achte auf Mini-Wörter wie „nur“, „eigentlich“, „vielleicht“ oder „ich glaube“. Sie schwächen deine Aussage ab, ohne dass du es merkst. Sag „Ich habe eine Frage“ statt „Ich hätte da vielleicht nur eine kurze Frage“.",
  },
  {
    title: "Stimme kontrollieren",
    short: "Tempo runter, Sätze klar beenden.",
    detail:
      "Sprich langsamer, als sich richtig anfühlt, und lass deine Sätze am Ende nach unten gehen — nicht fragend nach oben. Eine ruhige, tiefe Stimme signalisiert Sicherheit. Tief in den Bauch atmen hilft dir dabei.",
  },
];

function ExerciseCard({
  number,
  title,
  short,
  children,
}: {
  number: number;
  title: string;
  short: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-border bg-card transition-colors open:border-cleanser-confidence/30">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cleanser-confidence/15 text-sm font-semibold text-cleanser-confidence">
          {number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-base font-medium text-foreground">
            {title}
          </span>
          <span className="block truncate text-sm text-muted-foreground">
            {short}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-4 py-3 text-base leading-relaxed text-foreground">
        {children}
      </div>
    </details>
  );
}

type Phase = "einatmen" | "halten" | "ausatmen";

const PHASE_LABEL: Record<Phase, string> = {
  einatmen: "Einatmen",
  halten: "Halten",
  ausatmen: "Ausatmen",
};

const TOTAL_CYCLES = 4;

function BreathingExercise() {
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

export default function ConfidenceCleanserPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/booster" title="Showstopper Confidence" />
      <div className="mx-auto w-full max-w-lg space-y-6 px-4 py-6">
        <CleanserIntroSection slug="confidence" />

      <div className="space-y-3">
        {EXERCISES.map((exercise, index) => (
          <ExerciseCard
            key={exercise.title}
            number={index + 1}
            title={exercise.title}
            short={exercise.short}
          >
            {exercise.detail}
          </ExerciseCard>
        ))}

        <ExerciseCard
          number={5}
          title="Inneren Caveman trainieren"
          short="Atemübung (4-7-8), um runterzufahren."
        >
          <p className="mb-3">
            Vor einem Auftritt schaltet dein Körper auf Alarm. Mit der 4-7-8-Atmung
            beruhigst du deinen inneren Höhlenmenschen und kommst zurück in die
            Ruhe.
          </p>
          <BreathingExercise />
        </ExerciseCard>
      </div>
      </div>
    </div>
  );
}
