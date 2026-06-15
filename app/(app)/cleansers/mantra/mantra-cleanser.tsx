"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { logCleanserCheckinAction, type CleanserCheckinState } from "./actions";

const MANTRA = "Ich bin nicht für jeden";

// Overthinking-Gedanke → Reframe, jeweils endend auf das Mantra.
const SITUATIONS = [
  {
    thought: "Eine Person im Meeting hat skeptisch geschaut.",
    reframe:
      "Vielleicht hatte sie einfach einen schlechten Tag. Ich muss nicht jeden überzeugen — ich bin nicht für jeden.",
  },
  {
    thought: "Jemand hat meine Nachricht stundenlang nicht beantwortet.",
    reframe:
      "Das sagt nichts über meinen Wert. Nicht jede Verbindung muss passen — ich bin nicht für jeden.",
  },
  {
    thought: "Ich habe das Gefühl, mich ständig erklären zu müssen.",
    reframe:
      "Ich darf sein, wie ich bin. Wer mich versteht, versteht mich — ich bin nicht für jeden.",
  },
  {
    thought: "Eine Kollegin mag meine Art anscheinend nicht.",
    reframe:
      "Das ist okay. Ich will nicht gefallen, ich will echt sein — ich bin nicht für jeden.",
  },
];

const INITIAL_STATE: CleanserCheckinState = { error: null, success: false };

function SituationCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActive(index);
  };

  const scrollTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, SITUATIONS.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="w-full">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SITUATIONS.map((s, i) => (
          <div key={i} className="w-full shrink-0 snap-center px-1">
            <Card className="h-full bg-card/60">
              <CardContent className="space-y-4 py-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                    Der Gedanke
                  </p>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    „{s.thought}“
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    Der Reframe
                  </p>
                  <p className="text-base leading-relaxed text-foreground">
                    {s.reframe}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Vorherige Situation"
          disabled={active === 0}
          onClick={() => scrollTo(active - 1)}
        >
          <ChevronLeft />
        </Button>

        <div className="flex items-center gap-2" role="group" aria-label="Situationen">
          {SITUATIONS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Situation ${i + 1}`}
              aria-current={i === active}
              onClick={() => scrollTo(i)}
              className={`size-2 rounded-full transition-colors ${
                i === active ? "bg-amber-500" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Nächste Situation"
          disabled={active === SITUATIONS.length - 1}
          onClick={() => scrollTo(active + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

export function MantraCleanser({
  doneToday,
  streak,
}: {
  doneToday: boolean;
  streak: number;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    logCleanserCheckinAction,
    INITIAL_STATE,
  );

  // Optimistic done-state: either it was already done, or this session just logged it.
  const done = doneToday || state.success;
  const displayStreak = doneToday ? streak : state.success ? streak + 1 : streak;

  // Re-sync server data once the check-in succeeds for the first time.
  useEffect(() => {
    if (state.success && !doneToday) {
      router.refresh();
    }
  }, [state.success, doneToday, router]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-10 px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-10">
        {/* Mantra */}
        <Card className="w-full border-amber-200/60 bg-card dark:border-amber-800/50">
          <CardContent className="flex min-h-[40svh] flex-col items-center justify-center gap-4 py-6 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
              Dein Mantra
            </p>
            <p className="font-heading text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl">
              {MANTRA}
            </p>
          </CardContent>
        </Card>

        {/* Beispiel-Situationen */}
        <SituationCarousel />

        {/* Check-in */}
        <div className="flex w-full flex-col items-center gap-3">
          {done ? (
            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2"
              disabled
            >
              <Check className="text-amber-600 dark:text-amber-400" />
              Schon erledigt heute
            </Button>
          ) : (
            <form action={formAction} className="w-full">
              <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                {isPending ? "Einen Moment…" : "Heute reflektiert"}
              </Button>
            </form>
          )}

          {displayStreak > 0 ? (
            <p className="text-sm text-muted-foreground">
              🔥 {displayStreak} {displayStreak === 1 ? "Tag" : "Tage"} in Folge
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/70">Heute startest du.</p>
          )}

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
