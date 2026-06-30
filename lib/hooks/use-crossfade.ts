"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/** Halbe Überblendung in ms — out + in ≈ 0,5 s gesamt. */
export const CROSSFADE_MS = 250;

/**
 * Geteilte Out→Swap→In-Überblendung. Beide Dashboard-Fader (Fokus-Frage und
 * Empfehlungskarte) laufen darüber, damit sie bei einem Stimmungswechsel exakt
 * synchron und mit identischem Timing überblenden — sie können nicht mehr
 * gegeneinander driften.
 *
 * Ablauf bei Token-Wechsel: sichtbaren Inhalt ausblenden (CROSSFADE_MS, volle
 * Dauer abgewartet) → tauschen → neuen Inhalt einblenden. Es ist immer nur ein
 * Inhalt im DOM; alter und neuer Zustand sind nie gleichzeitig mit opacity > 0
 * sichtbar — der Swap läuft erst, wenn das Ausblenden wirklich auf opacity 0
 * angekommen ist.
 *
 * Der Swap wird NICHT direkt per `setTimeout(CROSSFADE_MS)` ausgelöst: dieser
 * Timer liefe gegen die gleich lange CSS-Transition (die erst beim nächsten
 * Paint startet) und feuerte ein, zwei Frames zu früh — der alte Inhalt würde
 * getauscht, während er noch teil-sichtbar ist (kurze Überlagerung). Stattdessen
 * starten wir den Timer erst nach einem doppelten requestAnimationFrame, also
 * sobald der opacity-0-Zustand gepaintet (= die Ausblend-Transition begonnen)
 * ist. So spannt die volle CROSSFADE_MS garantiert die komplette Ausblendung ab.
 *
 * Der Out-Effect hängt bewusst NUR am `token` (einem Primitive), nicht am
 * `value`: Die Karte übergibt `children` als `value` — neue Objekt-Identität bei
 * jedem Parent-Render. Stünde `value` in den Dependencies, würde ein Re-Render
 * mitten in der Überblendung den Timer der Karte neu starten und sie aus dem
 * Takt mit der Frage (stabiler String-`value`) bringen. Der jeweils neueste
 * `value` wird stattdessen über eine Ref gelesen und erst beim Swap übernommen.
 *
 * Das Einblenden nutzt ein doppeltes requestAnimationFrame: so ist der
 * opacity-0-Zustand des neuen Inhalts garantiert gepaintet, bevor auf opacity-100
 * umgeschaltet wird (sonst „springt" der neue Inhalt ohne Übergang hinein).
 *
 * Respektiert `prefers-reduced-motion` (sofortiger Wechsel ohne Animation).
 */
export function useCrossfade<T>(token: string, value: T) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<{ token: string; value: T }>({
    token,
    value,
  });
  const [visible, setVisible] = useState(true);

  // Neuesten value halten, ohne ihn in die Effect-Dependencies aufzunehmen.
  const latestValue = useRef(value);
  latestValue.current = value;

  // Out → tauschen, sobald sich der Token ändert.
  useEffect(() => {
    if (reduced || token === shown.token) return;

    setVisible(false); // läuft post-paint, blendet den sichtbaren Inhalt aus

    // Den Swap erst nach VOLLSTÄNDIGEM Ausblenden auslösen: per doppeltem rAF
    // warten, bis der opacity-0-Zustand tatsächlich gepaintet ist (= die CSS-
    // Transition hat begonnen), und erst dann die volle Transition-Dauer. So
    // läuft der Timer nicht mehr gegen die CSS-Transition — der alte Inhalt ist
    // garantiert auf opacity 0, bevor getauscht wird.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        timer = setTimeout(
          () => setShown({ token, value: latestValue.current }),
          CROSSFADE_MS,
        );
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      if (timer) clearTimeout(timer);
    };
  }, [token, reduced, shown.token]);

  // In → neuen Inhalt einblenden, nachdem getauscht (und opacity-0 gepaintet) wurde.
  useEffect(() => {
    if (reduced) return;

    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [shown.token, reduced]);

  return { shown, visible, reduced };
}
