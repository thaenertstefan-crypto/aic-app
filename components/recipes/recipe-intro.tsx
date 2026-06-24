"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import type { IntroCard } from "@/lib/utils/recipe-intros";

type RecipeIntroProps = {
  cards: IntroCard[];
  onComplete: () => void;
  onSkip?: () => void;
  renderMascot?: (index: number) => React.ReactNode;
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
export function RecipeIntro({ cards, onComplete, onSkip, renderMascot }: RecipeIntroProps) {
  const [index, setIndex] = useState(0);

  // Bei jedem Kartenwechsel an den Seitenanfang springen.
  useScrollTopOnChange(index);

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

  const goBack = () => setIndex((i) => Math.max(0, i - 1));

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">

      {/* Mascot-Slot — nur wenn prop vorhanden */}
      {renderMascot && (
        <div className="flex justify-center">
          {renderMascot(index)}
        </div>
      )}

      {/* Karte */}
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

      {/* Fortschrittspunkte — jetzt UNTER der Karte */}
      <ProgressDots total={cards.length} current={index} />

      {/* Navigation: Zurück + Weiter nebeneinander */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          onClick={goBack}
          disabled={index === 0}
          aria-label="Zurück"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Button size="lg" className="flex-1 gap-1" onClick={goNext}>
          {isLast ? "Los geht's" : "Weiter"}
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Überspringen-Link (optional) */}
      {onSkip && (
        <Button
          variant="link"
          size="sm"
          onClick={onSkip}
          className="self-center text-muted-foreground"
        >
          Überspringen
        </Button>
      )}
    </div>
  );
}
