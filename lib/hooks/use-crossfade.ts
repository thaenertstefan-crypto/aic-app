"use client";

import { useEffect, useState } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/** Halbe Überblendung in ms — out + in ≈ 0,5 s gesamt. */
export const CROSSFADE_MS = 250;

/**
 * Geteilte Out→Swap→In-Überblendung. Beide Dashboard-Fader (Fokus-Frage und
 * Empfehlungskarte) laufen darüber, damit sie bei einem Stimmungswechsel exakt
 * synchron und mit identischem Timing überblenden — sie können nicht mehr
 * gegeneinander driften.
 *
 * Ablauf bei Token-Wechsel: sichtbaren Inhalt ausblenden (CROSSFADE_MS) →
 * tauschen → neuen Inhalt einblenden. Es ist immer nur ein Inhalt im DOM; alter
 * und neuer Zustand sind nie gleichzeitig mit opacity > 0 sichtbar.
 *
 * Das Einblenden nutzt bewusst ein doppeltes requestAnimationFrame: so ist der
 * opacity-0-Zustand des neuen Inhalts garantiert gepaintet, bevor auf opacity-100
 * umgeschaltet wird (sonst „springt" der neue Inhalt ohne Übergang hinein und
 * wirkt wie eine Überlagerung mit dem ausgehenden Fade).
 *
 * Respektiert `prefers-reduced-motion` (sofortiger Wechsel ohne Animation).
 *
 * @param emptyToken Optionaler Token, der „nichts sichtbar" markiert. Steht
 *   gerade dieser Token, entfällt die Ausblende-Phase und es wird sofort
 *   getauscht (kein 250-ms-Leerlauf, bevor erstmals Inhalt erscheint).
 */
export function useCrossfade<T>(token: string, value: T, emptyToken?: string) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<{ token: string; value: T }>({
    token,
    value,
  });
  const [visible, setVisible] = useState(true);

  // Out → tauschen, sobald sich der Token ändert.
  useEffect(() => {
    if (reduced || token === shown.token) return;

    // Ist gerade nichts sichtbar, entfällt die Ausblende-Phase (sofort tauschen).
    if (emptyToken !== undefined && shown.token === emptyToken) {
      setShown({ token, value });
      return;
    }

    setVisible(false); // läuft post-paint, blendet den sichtbaren Inhalt aus
    const swap = setTimeout(() => setShown({ token, value }), CROSSFADE_MS);
    return () => clearTimeout(swap);
  }, [token, value, reduced, shown.token, emptyToken]);

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
