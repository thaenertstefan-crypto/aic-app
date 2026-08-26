"use client";

import { useEffect, useRef } from "react";

import { BOOSTER_ART, type CellVariant } from "@/components/booster/booster-art";
import { useBoosterFlug } from "@/components/booster/booster-flug";
import { UEBERGABE_MS } from "@/lib/kopfwetter/flug";

/**
 * Das Modul-Icon der Übung: sitzt auf der ERSTEN Seite jeder Booster-Übung
 * direkt unter dem (unveränderten) SubPageHeader und trägt dort die Signatur des
 * Wetter-Systems — dasselbe Motiv, das auf dem Hub angetippt wurde.
 *
 * Meldet beim Mount seinen DOM-Rect an den Zoom-Kontext, damit der fliegende
 * Klon exakt darauf landet, und bleibt unsichtbar, solange der Klon die Signatur
 * trägt (sonst stünden zwei Icons übereinander).
 *
 * Bewusst NICHT auf der Intro-Sequenz: dort sitzt das Intro-Maskottchen über der
 * Karte, zwei Signaturen auf einer Seite wären zu viel.
 */
export function ModuleIcon({ variant }: { variant: CellVariant }) {
  const { arrive, flying } = useBoosterFlug();
  const ref = useRef<HTMLDivElement>(null);
  const Art = BOOSTER_ART[variant];

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      arrive(null);
      return;
    }
    const r = el.getBoundingClientRect();
    arrive({ x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.width });
  }, [arrive]);

  return (
    <div className="flex justify-center pb-2 pt-1">
      <div
        ref={ref}
        className="transition-opacity ease-out"
        style={{
          opacity: flying ? 0 : 1,
          transitionDuration: `${UEBERGABE_MS}ms`,
        }}
      >
        {/* Größe hängt an lib/kopfwetter/flug.ts (ZIEL_PX + LANDE_Y) — beim
            Ändern dort mitziehen, sonst verfehlt der fliegende Klon die Landung. */}
        <Art className="size-24" />
      </div>
    </div>
  );
}
