"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { CleanserIntro as CleanserIntroData } from "@/lib/utils/cleanser-intros";

type CleanserIntroProps = {
  intro: CleanserIntroData;
  defaultOpen?: boolean;
};

/**
 * Leichter, eingeklappter "ℹ️ Worum geht's?"-Block für ein Cleanser.
 * Zeigt im Header den Titel und klappt darunter eine kurze Erklärung auf.
 * Stil angelehnt an components/recipes/recipe-intro-collapsible.tsx.
 */
export function CleanserIntro({ intro, defaultOpen = false }: CleanserIntroProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="border-primary/30">
      <CardContent className="pt-(--card-spacing)">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 text-left"
        >
          <Info className="size-4 shrink-0 text-primary" />
          <span className="flex-1 font-heading text-sm font-semibold text-foreground">
            {intro.title}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-300">
            {intro.body}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
