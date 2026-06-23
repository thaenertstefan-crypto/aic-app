"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { IntroCard } from "@/lib/utils/recipe-intros";
import { cn } from "@/lib/utils";

type RecipeIntroCollapsibleProps = {
  cards: IntroCard[];
  title?: string;
};

/**
 * Eingeklappter "ℹ️ Worum geht's?"-Block für Wiederkehrer (Schritt 6.10).
 * Zeigt dieselben Intro-Karten wie die Sequenz, hier statisch untereinander.
 */
export function RecipeIntroCollapsible({
  cards,
  title = "Worum geht's?",
}: RecipeIntroCollapsibleProps) {
  const [open, setOpen] = useState(false);

  if (cards.length === 0) return null;

  return (
    <Card className="border-primary/30">
      {/* Extra-pt nur im aufgeklappten Zustand. Eingeklappt würde es zusätzlich
          zum py der Card oben doppeltes Padding erzeugen — die obere Hälfte
          wirkte dann größer als die untere. */}
      <CardContent className={cn(open && "pt-(--card-spacing)")}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 text-left"
        >
          <Info className="size-4 shrink-0 text-primary" />
          <span className="flex-1 font-heading text-sm font-semibold text-foreground">
            {title}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="mt-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {cards.map((card, i) => (
              <div key={i} className="flex flex-col gap-1">
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
