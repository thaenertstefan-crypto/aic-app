"use client";

import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { IntroCard } from "@/lib/utils/recipe-intros";

type IntroInfoButtonProps = {
  cards: IntroCard[];
  title?: string;
  /** Öffnet das Overlay beim Mount einmal automatisch (z.B. Cleanser-Erstbesuch). */
  defaultOpen?: boolean;
};

/**
 * Info-Icon (rechts im Seiten-Header), das die Intro-Texte einer Übung in
 * einem scrollbaren Overlay zum Nachlesen zeigt. Löst die frühere
 * "Worum geht's?"-Kachel (recipe-intro-collapsible / cleanser-intro) ab.
 */
export function IntroInfoButton({
  cards,
  title = "Worum geht's?",
  defaultOpen = false,
}: IntroInfoButtonProps) {
  if (cards.length === 0) return null;

  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={title}
            className="-mr-2 shrink-0 text-muted-foreground hover:text-foreground"
          />
        }
      >
        <Info className="size-5" />
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Info className="size-4 shrink-0 text-primary" />
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {cards.map((card, i) => (
            <div key={i} className="flex flex-col gap-1">
              {card.title && (
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  {card.title}
                </h3>
              )}
              <p className="text-base leading-relaxed text-muted-foreground">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
