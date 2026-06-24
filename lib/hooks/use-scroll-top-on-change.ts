"use client";

import { useEffect } from "react";

/**
 * Scrollt bei jeder Änderung von `key` an den Seitenanfang — für mehrstufige
 * Flows (Wizards/Karten), die den sichtbaren Inhalt per State wechseln statt zu
 * navigieren. Das globale ScrollToTop (components/layout/scroll-to-top.tsx)
 * greift nur bei Pathname-Wechsel, deshalb braucht es hier einen eigenen Anker.
 *
 * `behavior: "instant"` ist gewünscht (kein smooth-Scroll, auch unter
 * prefers-reduced-motion) — konsistent zur globalen ScrollToTop-Komponente.
 */
export function useScrollTopOnChange(key: unknown) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [key]);
}
