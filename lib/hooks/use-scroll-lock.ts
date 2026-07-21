import { useEffect } from "react";

/**
 * Sperrt das Seiten-Scrollen, solange `active` true ist — für Vollbild-Overlays
 * (z. B. der Stern-Fokus), damit die Seite dahinter (inkl. sticky Bottom-Nav)
 * nicht mitscrollt. Stellt den vorherigen overflow-Wert beim Verlassen wieder her.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
