"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";

import { saveMoodCheckinAction, type MoodCheckinState } from "./actions";

const MOODS: { score: number; emoji: string; label: string }[] = [
  { score: 1, emoji: "😞", label: "Sehr schwer" },
  { score: 2, emoji: "😕", label: "Eher schwer" },
  { score: 3, emoji: "😐", label: "Geht so" },
  { score: 4, emoji: "🙂", label: "Gut" },
  { score: 5, emoji: "😄", label: "Richtig gut" },
];

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

export function MoodCheckin({ initialScore }: { initialScore: number | null }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    saveMoodCheckinAction,
    INITIAL_STATE,
  );

  // Optimistic selection: highlight the tapped mood immediately.
  const [selected, setSelected] = useState<number | null>(initialScore);

  // Re-sync server data once a check-in is saved (so a reload keeps the choice).
  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

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

        <form action={formAction} className="flex justify-between gap-2">
          {MOODS.map((mood) => {
            const isActive = selected === mood.score;
            return (
              <button
                key={mood.score}
                type="submit"
                name="mood_score"
                value={mood.score}
                aria-label={mood.label}
                aria-pressed={isActive}
                onClick={() => setSelected(mood.score)}
                disabled={isPending}
                className={`flex flex-1 items-center justify-center rounded-xl border py-2.5 text-2xl transition-all disabled:opacity-60 ${
                  isActive
                    ? "border-primary bg-primary/10 scale-105"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
              >
                <span aria-hidden>{mood.emoji}</span>
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
