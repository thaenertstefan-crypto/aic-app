"use client";

import { useState, type ReactNode } from "react";

/**
 * „Einblenden" — der eine generische Übergang der App (KAN-30, KAN-53).
 *
 * Wie er aussieht, steht in `globals.css` (`--einblenden-dur`, ~200 ms reine
 * Opacity). Hier steht nur, **wann** er läuft.
 *
 * Ein Routenwechsel und ein Bühnenwechsel sind für den Nutzer dasselbe
 * Ereignis — Route-oder-Bühne ist eine Implementierungs-Tatsache. Deshalb
 * sehen sie gleich aus, und deshalb steht die Bewegung genau einmal (in
 * `globals.css`).
 *
 * Sie hat zwei Anhängepunkte, je nachdem, was beim Wechsel passiert:
 *
 * - **Das Element wird neu montiert** (jede Bühne einer Übung): die Klasse
 *   `einblenden` genügt — ein frisches DOM-Element startet seine Animation
 *   von selbst.
 * - **Das Element bleibt stehen** (das `main` der App, die Auth-Karte): dafür
 *   ist dieses Modul da. Ohne Neumontage muss die Animation von Hand neu
 *   angestoßen werden, und zwar ohne den Teilbaum wegzuwerfen.
 */

/** Der Takt, unter dem ein Element gerade steht. `undefined` = keine
 *  Animation (erster Auftritt: es gibt kein A, von dem getragen würde). */
export type Takt = "a" | "b" | undefined;

/**
 * Kippt bei jedem Wechsel von `token` den Takt. In `globals.css` hängt an
 * jedem Takt eine eigene Keyframe-Regel, also wechselt mit dem Takt der
 * `animation-name` — und die Animation startet neu, **ohne** dass irgendetwas
 * neu montiert werden muss.
 *
 * Das `setStand` steht absichtlich im Render-Rumpf und nicht in einem Effekt:
 * React nennt das „adjusting state when props change" — die eigene State-Zeile
 * der gerade rendernden Komponente, bewacht von einem Vergleich, der genau
 * einmal zuschlägt. React verwirft den Render sofort und wiederholt ihn, das
 * Attribut steht also **im selben Commit** wie der neue Inhalt. Ein Effekt
 * liefe erst nach dem Paint — der neue Inhalt blitzte einen Frame lang voll
 * deckend auf, bevor die Blende anfinge.
 *
 * Warum nicht schlicht `key={token}`? Weil das den ganzen Teilbaum wegwirft.
 * Bei einem Routenwechsel nähme es die verschachtelten Layouts mit — und mit
 * ihnen das Overlay, das gerade einen Flug trägt.
 *
 * `stillhalten` beantwortet für einen konkreten Wechsel die Frage „trägt den
 * schon jemand anders?". Sagt es ja, bleibt der Takt stehen: zwei
 * Opacity-Blenden übereinander multiplizieren ihre Alphas, und die Bewegung,
 * die eigentlich zählt, verschwände hinter der generischen.
 */
export function useTakt(
  token: string,
  stillhalten?: (alt: string, neu: string) => boolean,
): Takt {
  const [stand, setStand] = useState<{ token: string; takt: Takt }>({
    token,
    takt: undefined,
  });

  if (stand.token !== token) {
    setStand({
      token,
      takt: stillhalten?.(stand.token, token)
        ? stand.takt
        : stand.takt === "a"
          ? "b"
          : "a",
    });
  }

  return stand.takt;
}

/**
 * Blendet seinen Inhalt ein, sooft `token` wechselt — für Flächen, die den
 * Wechsel überstehen und deshalb nicht von selbst neu animieren. Beim ersten
 * Auftritt passiert nichts: ein Übergang trägt von A nach B, und beim ersten
 * Auftritt gibt es kein A.
 */
export function Einblenden({
  token,
  className,
  children,
}: {
  token: string;
  className?: string;
  children: ReactNode;
}) {
  const takt = useTakt(token);

  return (
    <div data-einblenden={takt} className={className}>
      {children}
    </div>
  );
}
