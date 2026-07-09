"use client";

import { useActionState, useState } from "react";

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
  2: "Auch zähe Tage dürfen sein. Sei heute sanft mit dir. 🫶",
  3: "Schön, in deiner Mitte zu sein — aus dieser Ruhe heraus kann der Tag wachsen. 🌿",
  4: "Schön, dass es heute gut läuft. Genieß diesen Moment. ☀️",
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

  // Optimistic selection: highlight the tapped mood immediately. Ohne Check-in
  // heute starten wir auf „Im Gleichgewicht" (Score 3) als ruhiger Default.
  const [selected, setSelected] = useState<number | null>(initialScore ?? 3);

  return (
    // Bewusster Rhythmus statt gleichförmiger 32px-Abstände: Prompt bekommt Luft,
    // das Maskottchen (emotionales Zentrum) atmet oben, Buttons folgen enger, und
    // die warme Antwort hängt dicht an den Buttons, auf die sie reagiert.
    <div>
      <p className="font-heading text-lg font-medium text-foreground">
        Wie geht&apos;s dir heute?
      </p>

      <div className="mt-10 flex justify-center">
        <div className="mascot-drift">
          <MoodAvatar
            face={MOOD_FACES[selected ?? 3]}
            pulseSeconds={MOOD_PULSE_SECONDS[selected ?? 3]}
          />
        </div>
      </div>

      <form
        action={formAction}
        className="mt-8 -mx-1 -my-1 flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              className={`inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-[transform,background-color,border-color] duration-150 ease-out ${
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
        <p className="mt-3 text-sm text-muted-foreground">
          {MESSAGES[selected]}
        </p>
      )}

      <FormError message={state.error} className="mt-4" />
    </div>
  );
}
