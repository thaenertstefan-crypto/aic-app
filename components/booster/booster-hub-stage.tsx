"use client";

import type { CSSProperties, ReactNode } from "react";

import { useBoosterFlug } from "@/components/booster/booster-flug";
import { BUEHNE_AUS_MS } from "@/lib/kopfwetter/flug";

/**
 * Die Bühne des Kopfwetter-Hubs: alles, was beim Abflug zurückbleibt — Titel,
 * Untertitel UND Zellen. Sie **blendet aus**, sonst nichts (KAN-60).
 *
 * Früher skalierte sie am Tap-Punkt verankert nach außen, als Kamera-Push. Der
 * war ein Rechenfehler: das Zell-Icon misst 64 px, der Landeplatz 96 px, der
 * Klon muss **einmal** um 1,5 wachsen — der Push schob 64 → 154 → 96 dazwischen
 * und machte aus einer Bewegung drei Ereignisse. Mit ihm sind der
 * transform-origin, der Clip-Wrapper (nichts skaliert mehr, also wächst auch
 * kein Scroll-Overflow) und die gestapelten Scale-Ebenen entfallen.
 *
 * Warum die Blende trotzdem hier hängt und nicht im generischen Übergang
 * (KAN-53): der blendet nur **ein**. Eine Fläche, die vor der Navigation
 * verschwinden soll, muss ihr Verschwinden selbst tragen — der Wechsel kommt
 * erst danach.
 *
 * Nur beim Hinflug: bei der Heimkehr ist der Hub das **Ziel**, und ein Ziel,
 * das beim Landen ausblendet, wäre die Bewegung genau falsch herum.
 */
export function BoosterHubStage({ children }: { children: ReactNode }) {
  const { buehneAus } = useBoosterFlug();

  return (
    <div
      className={buehneAus ? "booster-buehne-aus" : undefined}
      // Der `both`-Fill hält den Endzustand (Opacity 0), bis die Seite wirklich
      // wechselt: die Navigation läuft am Ende der Blende an, der Hub ist bis
      // dahin noch gemountet und würde sonst schlagartig wieder aufploppen.
      style={
        buehneAus
          ? ({ "--buehne-aus-ms": `${BUEHNE_AUS_MS}ms` } as CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
