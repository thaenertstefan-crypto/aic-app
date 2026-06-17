"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { IntroCard } from "@/lib/utils/recipe-intros";

type RecipeIntroProps = {
  cards: IntroCard[];
  onComplete: () => void;
  onSkip?: () => void;
};

// ─── Progress Dots (Stil aus dem Overthinking-Wizard) ─────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2" role="group" aria-label="Fortschritt">
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <div
            key={i}
            className={`size-2.5 rounded-full transition-all duration-500 ${
              isDone
                ? "bg-primary"
                : isActive
                  ? "bg-primary/70 ring-2 ring-primary/30"
                  : "bg-muted-foreground/20"
            }`}
            aria-label={`Karte ${i + 1}${isDone ? " – gelesen" : isActive ? " – aktuell" : ""}`}
          />
        );
      })}
    </div>
  );
}

// ─── Intro-Sequenz ────────────────────────────────────────────────────

/**
 * Durchklickbare Einleitungs-Sequenz für ein Rezept. Zeigt eine Karte nach
 * der anderen mit Fortschritts-Punkten; auf der letzten Karte ruft der
 * Primärbutton onComplete. Optionaler "Überspringen"-Link via onSkip.
 */
export function RecipeIntro({ cards, onComplete, onSkip }: RecipeIntroProps) {
  const [index, setIndex] = useState(0);

  if (cards.length === 0) return null;

  const card = cards[index];
  const isLast = index === cards.length - 1;

  const goNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-8">
      <ProgressDots total={cards.length} current={index} />

      <Card
        key={index}
        className="border-primary/30 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out"
      >
        <CardContent className="flex flex-col gap-3 pt-(--card-spacing)">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            {card.title}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {card.body}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-4">
        <Button size="lg" className="w-full gap-1" onClick={goNext}>
          {isLast ? "Los geht's" : "Weiter"}
          <ChevronRight className="size-4" />
        </Button>

        {onSkip && (
          <Button variant="link" size="sm" onClick={onSkip} className="text-muted-foreground">
            Überspringen
          </Button>
        )}
      </div>
    </div>
  );
}
