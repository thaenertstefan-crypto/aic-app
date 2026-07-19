"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { SuggestionShuffle } from "@/components/dashboard/suggestion-shuffle";
import type { Destination } from "@/components/dashboard/daily-focus";

/**
 * Stellt die Alternativen bewusst zurück: standardmäßig eingeklappt, damit die
 * primäre Gold-Empfehlung die einzige offene Handlung bleibt (ein Ziel pro
 * Screen). Ein leiser Text-Trigger öffnet die Vorschlagsgruppe erst auf
 * ausdrücklichen Wunsch — Entscheidungslast entsteht nur, wenn sie gesucht wird.
 *
 * Bewusst getrennt von der Crossfade-/Kopfwetter-Motion des Fokus-Blocks: das
 * Auf-/Zuklappen ist eine lokale Disclosure-Geste (kurzer Fade, bei reduzierter
 * Bewegung sofort), kein Teil der Stimmungs-Überblendung. Der offene Zustand
 * überlebt einen Tier-Wechsel bewusst — wer Alternativen aufgeklappt hat, will
 * sie nicht bei jedem Mood-Tap wieder verlieren.
 */
export function AlternativesDisclosure({
  destinations,
}: {
  destinations: Destination[];
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-1.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        …oder brauchst du gerade was anderes?
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0",
            !reduced && "transition-transform duration-200 ease-out",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          id={panelId}
          className={cn(
            !reduced &&
              "animate-in fade-in slide-in-from-top-1 duration-200 ease-out",
          )}
        >
          <SuggestionShuffle destinations={destinations} />
        </div>
      )}
    </div>
  );
}
