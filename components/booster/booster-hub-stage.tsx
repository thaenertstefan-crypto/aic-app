"use client";

import type { CSSProperties, ReactNode } from "react";

import {
  PUSH_MS,
  PUSH_SCALE,
  STAGE_ATTR,
  useBoosterZoom,
} from "@/components/booster/booster-zoom";

/**
 * Die Bühne des Kopfwetter-Hubs: alles, was beim Zoom-Übergang am Tap-Punkt
 * verankert nach außen strömt — Titel, Untertitel UND Zellen. Vorher trug nur
 * der Zellen-Container den Push, der Seitenkopf blieb während des Übergangs
 * stehen.
 *
 * Zwei Ebenen mit verschiedenen Aufgaben: der äußere Wrapper clippt (sonst
 * vergrößert die skalierte Bühne den Scroll-Overflow des Dokuments und die
 * Seite bekommt für die Dauer der Animation eine Scrollhöhe), die innere Box
 * skaliert. Ihren transform-origin bekommt sie fertig aus dem Zoom-Kontext —
 * berechnet in zoomInto(), also schon im selben Render, in dem die Push-Klasse
 * gesetzt wird.
 */
export function BoosterHubStage({ children }: { children: ReactNode }) {
  const { phase, stageOrigin } = useBoosterZoom();
  const pushing = phase === "pushing";

  return (
    <div className={pushing ? "booster-stage-clip" : undefined}>
      <div
        {...{ [STAGE_ATTR]: "" }}
        className={pushing ? "booster-cells-zoom" : undefined}
        style={
          pushing
            ? ({
                transformOrigin: stageOrigin
                  ? `${stageOrigin.x}px ${stageOrigin.y}px`
                  : undefined,
                "--zoom-push-ms": `${PUSH_MS}ms`,
                "--zoom-push-scale": `${PUSH_SCALE}`,
              } as CSSProperties)
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
