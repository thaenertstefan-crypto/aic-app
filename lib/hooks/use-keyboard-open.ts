"use client";

import { useEffect, useState } from "react";

import { isKeyboardOpen } from "@/lib/utils/keyboard-open";

/** Was den Fokus tragen und dabei eine Tastatur aufziehen kann. */
const EDITABLE = "input, textarea, [contenteditable]:not([contenteditable='false'])";

/**
 * Steht die Bildschirmtastatur gerade im Bild?
 *
 * Sammelt die beiden Signale ein, die `isKeyboardOpen` gegeneinander abwägt —
 * das Warum steht dort. Hier steht, **wann** gemessen wird und warum die
 * beiden Richtungen unterschiedlich schnell sind.
 *
 * Gemessen wird bei jedem Fokuswechsel und bei jedem Schritt der Tastatur-
 * Animation: `visualViewport`-`resize`/`scroll` feuern währenddessen mehrfach,
 * ein Abschluss-Signal gibt es nicht (`scrollend` fehlt in Safari). Also wird
 * jeder Schritt gelesen, statt auf ein Ende zu warten.
 *
 * **Verstecken sofort, Zeigen erst nach Rückfrage.** Beim Sprung von einem Feld
 * ins nächste ist der Fokus einen Wimpernschlag lang beim `<body>`, und WebKit
 * gibt ihn nicht immer im selben Task weiter. Wer diesen Moment für sich nimmt,
 * blendet die Leiste für einen Frame ein und gleich wieder aus. Ein „zu“ wird
 * deshalb erst einen Frame später übernommen und vorher noch einmal gemessen;
 * ist der Fokus bis dahin im nächsten Feld gelandet, passiert gar nichts. Ein
 * „offen“ gilt sofort — dort ist die Tastatur schon da.
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const measure = () => {
      const active = document.activeElement;
      return isKeyboardOpen({
        editableFocused: active instanceof HTMLElement && active.matches(EDITABLE),
        layoutHeight: window.innerHeight,
        visualHeight: viewport.height,
        visualOffsetTop: viewport.offsetTop,
      });
    };

    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      if (measure()) setOpen(true);
      else frame = requestAnimationFrame(() => setOpen(measure()));
    };

    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    window.addEventListener("focusin", sync);
    window.addEventListener("focusout", sync);

    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      window.removeEventListener("focusin", sync);
      window.removeEventListener("focusout", sync);
    };
  }, []);

  return open;
}
