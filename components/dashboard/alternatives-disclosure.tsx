"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { Destination } from "@/lib/content/dashboard-destinations";

/**
 * Stellt die Alternativen bewusst zurück: standardmäßig eingeklappt, damit die
 * primäre Gold-Empfehlung die einzige offene Handlung bleibt (ein Ziel pro
 * Screen). Ein leiser Text-Trigger öffnet die Liste erst auf ausdrücklichen
 * Wunsch — Entscheidungslast entsteht nur, wenn sie gesucht wird.
 *
 * Aufgeklappt stehen **alle** Sätze untereinander, ohne Blättern. Ein
 * Quicklink, den man erwürfeln muss, ist keiner: Wer „Ich will zu etwas Nein
 * sagen“ sucht, findet ihn hier beim ersten Hinsehen. Die Scrolltiefe, die das
 * kostet, ist auf dem Dashboard ausdrücklich erlaubt — es ist ein ruhiger
 * Moment, keine Fläche, die auf einen Screen passen muss.
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
        className="flex w-full items-center gap-1.5 rounded-md text-left text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <ul
          id={panelId}
          className={cn(
            "space-y-2",
            !reduced &&
              "animate-in fade-in slide-in-from-top-1 duration-200 ease-out",
          )}
        >
          {destinations.map((destination) => (
            <li key={destination.key}>
              {/* items-center statt items-start: Die beiden langen Sätze
                  umbrechen bei 375 px auf zwei Zeilen, und der Chevron soll
                  dann mittig zur ganzen Zeile stehen, nicht an der ersten. */}
              <Link
                href={destination.href}
                className="flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <span className="text-sm font-medium text-foreground">
                  {destination.sentence}
                </span>
                <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
