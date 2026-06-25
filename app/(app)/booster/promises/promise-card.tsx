"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { utcDateKey } from "@/lib/utils/date";

import {
  endPromiseAction,
  togglePromiseCompletionAction,
  type EndPromiseState,
  type TogglePromiseState,
} from "./actions";
import type { Promise as PromiseRow } from "./promises-cleanser";

const TOGGLE_INITIAL: TogglePromiseState = {
  error: null,
  success: false,
  doneToday: false,
  currentStreak: 0,
  milestone: null,
};

const END_INITIAL: EndPromiseState = { error: null, success: false };

/** Add `n` days to an ISO date string (YYYY-MM-DD), UTC-stable. */
function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return utcDateKey(d);
}

export function PromiseCard({
  promise,
  completedDates,
  todayISO,
  onMilestone,
}: {
  promise: PromiseRow;
  completedDates: string[];
  todayISO: string;
  onMilestone: (milestone: number) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const serverDone = completedDates.includes(todayISO);
  // Optimistic view of "done today" + streak. `useOptimistic` automatically
  // reverts to the server values once the post-toggle refresh lands (or if the
  // action fails), so no syncing effect is needed.
  const [optimistic, setOptimistic] = useOptimistic({
    done: serverDone,
    streak: promise.current_streak,
  });

  const completedSet = useMemo(() => {
    const set = new Set(completedDates);
    if (optimistic.done) set.add(todayISO);
    else set.delete(todayISO);
    return set;
  }, [completedDates, optimistic.done, todayISO]);

  function handleToggle() {
    const next = !optimistic.done;
    startTransition(async () => {
      setOptimistic({
        done: next,
        streak: Math.max(0, optimistic.streak + (next ? 1 : -1)),
      });
      const fd = new FormData();
      fd.set("promise_id", promise.id);
      const res = await togglePromiseCompletionAction(TOGGLE_INITIAL, fd);
      if (res.success) {
        if (res.milestone) onMilestone(res.milestone);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-2">
        {/* Header: description + end action */}
        <div className="flex items-start justify-between gap-3">
          <p className="font-heading text-base leading-snug font-medium text-foreground">
            {promise.description}
          </p>
          <EndPromiseButton promiseId={promise.id} />
        </div>

        {/* Streak line */}
        <div className="flex items-baseline gap-2">
          <Flame
            className={cn(
              "size-5 shrink-0 self-center",
              optimistic.streak > 0
                ? "text-celebrate"
                : "text-muted-foreground/40",
            )}
          />
          {optimistic.streak > 0 ? (
            <p className="text-sm text-foreground">
              <span className="text-base font-semibold">
                {optimistic.streak}
              </span>{" "}
              {optimistic.streak === 1 ? "Tag" : "Tage"} in Folge
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Heute startest du.</p>
          )}
          {promise.longest_streak > optimistic.streak && (
            <span className="ml-auto text-xs text-muted-foreground/70">
              Längste Serie: {promise.longest_streak}
            </span>
          )}
        </div>

        {/* Progress grid */}
        <StreakGrid
          startDate={promise.start_date}
          targetDays={promise.target_days}
          completedSet={completedSet}
          todayISO={todayISO}
        />

        {/* Toggle */}
        <Button
          onClick={handleToggle}
          disabled={isPending}
          variant={optimistic.done ? "default" : "outline"}
          size="lg"
          className="w-full gap-2"
        >
          {optimistic.done ? (
            <>
              <Check />
              Heute erledigt
            </>
          ) : (
            "Heute erledigt"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function StreakGrid({
  startDate,
  targetDays,
  completedSet,
  todayISO,
}: {
  startDate: string;
  targetDays: number;
  completedSet: Set<string>;
  todayISO: string;
}) {
  const cells = Array.from({ length: targetDays }, (_, i) => {
    const date = addDaysISO(startDate, i);
    return {
      date,
      done: completedSet.has(date),
      isToday: date === todayISO,
      isFuture: date > todayISO,
    };
  });

  return (
    <div
      className="flex flex-wrap gap-1"
      role="img"
      aria-label={`${completedSet.size} von ${targetDays} Tagen erledigt`}
    >
      {cells.map((cell) => (
        <span
          key={cell.date}
          className={cn(
            "size-3.5 rounded-[3px] transition-colors",
            cell.done && "bg-celebrate",
            !cell.done && cell.isFuture && "bg-muted/50",
            !cell.done && !cell.isFuture && "border border-muted-foreground/25",
            cell.isToday && "ring-2 ring-celebrate ring-offset-1 ring-offset-background",
          )}
        />
      ))}
    </div>
  );
}

function EndPromiseButton({ promiseId }: { promiseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleEnd() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("promise_id", promiseId);
      const res = await endPromiseAction(END_INITIAL, fd);
      if (res.success) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="-mr-1.5 shrink-0 text-muted-foreground"
          >
            Beenden
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promise beenden?</DialogTitle>
          <DialogDescription>
            Dein Fortschritt bleibt gespeichert, aber das Promise verschwindet
            aus deiner aktiven Liste.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Abbrechen</DialogClose>
          <Button
            variant="destructive"
            onClick={handleEnd}
            disabled={isPending}
          >
            {isPending ? "Einen Moment…" : "Beenden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
