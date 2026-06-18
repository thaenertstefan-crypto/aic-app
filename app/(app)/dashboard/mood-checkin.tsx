"use client";

import { useActionState, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { MoodAvatar } from "@/components/dashboard/mood-avatar";
import {
  MOOD_FACES,
  MOOD_LABELS,
  MOOD_PULSE_SECONDS,
} from "@/lib/utils/mood";

import { saveMoodCheckinAction, type MoodCheckinState } from "./actions";

const MOODS: { score: number; label: string }[] = Object.entries(
  MOOD_LABELS,
).map(([score, label]) => ({ score: Number(score), label }));

// Encouraging, judgment-free message per score — low scores get warmth, not pity.
const MESSAGES: Record<number, string> = {
  1: "Schwere Tage gehören dazu. Schön, dass du trotzdem hier bist. 🤍",
  2: "Auch zähe Tage dürfen sein. Sei heute sanft mit dir.",
  3: "Mittendrin ist völlig okay. Ein Schritt nach dem anderen.",
  4: "Schön, dass es heute gut läuft. Genieß diesen Moment.",
  5: "Wunderbar — nimm den Schwung mit in den Tag! ✨",
};

const INITIAL_STATE: MoodCheckinState = {
  error: null,
  success: false,
  score: null,
};

export function MoodCheckin({
  initialScore,
  onSelect,
}: {
  initialScore: number | null;
  /** Bubbles the tapped score up so the focus can react instantly. */
  onSelect?: (score: number) => void;
}) {
  const [state, formAction] = useActionState(
    saveMoodCheckinAction,
    INITIAL_STATE,
  );

  // Optimistic selection: highlight the tapped mood immediately.
  const [selected, setSelected] = useState<number | null>(initialScore);

  return (
    <Card variant="glass">
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="font-heading text-lg font-medium text-foreground">
            Wie geht&apos;s dir heute?
          </p>
          <p className="text-sm text-muted-foreground">
            Ein kurzer Check-in für dich — ganz ohne Bewertung.
          </p>
        </div>

        <div className="flex justify-center">
          <MoodAvatar
            face={MOOD_FACES[selected ?? 3]}
            pulseSeconds={MOOD_PULSE_SECONDS[selected ?? 3]}
          />
        </div>

        <form
          action={formAction}
          className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {MOODS.map((mood) => {
            const isActive = selected === mood.score;
            return (
              <button
                key={mood.score}
                type="submit"
                name="mood_score"
                value={mood.score}
                aria-pressed={isActive}
                onClick={() => {
                  setSelected(mood.score);
                  onSelect?.(mood.score);
                }}
                className={`shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "border-primary bg-primary/10 scale-105"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
              >
                {mood.label}
              </button>
            );
          })}
        </form>

        {selected !== null && (
          <p className="text-sm text-muted-foreground">{MESSAGES[selected]}</p>
        )}

        <FormError message={state.error} />
      </CardContent>
    </Card>
  );
}
