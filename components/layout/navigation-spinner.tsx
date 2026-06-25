"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/** Verzögerung, bevor der Spinner erscheint — verhindert Aufblitzen bei
 *  geprefetchter/instant Navigation. */
const SHOW_DELAY_MS = 150;
/** Notbremse: falls eine Navigation nie committet (z. B. Klick auf die bereits
 *  aktive Seite), den Spinner trotzdem wieder ausblenden. */
const SAFETY_TIMEOUT_MS = 8000;

/**
 * Globaler Navigations-Spinner. Zeigt einen zentrierten, golden glühenden
 * Spinner über dem Screen, sobald eine interne Navigation startet, und blendet
 * ihn aus, sobald die neue Seite da ist (`pathname` ändert sich).
 *
 * Start wird über einen Capture-Click-Listener auf qualifizierten internen
 * Links erkannt — deckt alle `<Link>`-Navigationen ab (Bottom-Nav, Karten,
 * Listen). Programmatische `router.push()`-Navigationen aus Buttons werden
 * bewusst nicht erfasst; diese Flows haben eigene Ladezustände.
 */
export function NavigationSpinner() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [pending, setPending] = useState(false);

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  // Navigationsstart über Klicks auf interne Links erkennen (Capture-Phase, damit
  // wir auch dann feuern, wenn ein Handler den Klick später stoppt).
  useEffect(() => {
    const clearTimers = () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      showTimer.current = null;
      safetyTimer.current = null;
    };

    const onClick = (e: MouseEvent) => {
      // Nur primärer Klick ohne Modifier (sonst öffnet der Browser neuen Tab o. Ä.).
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const anchor = (e.target as Element | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      // Externe / andere Origin ignorieren; gleiche URL ignorieren.
      let dest: URL;
      try {
        dest = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (dest.origin !== window.location.origin) return;
      if (dest.pathname === window.location.pathname) return;

      clearTimers();
      showTimer.current = setTimeout(() => setPending(true), SHOW_DELAY_MS);
      safetyTimer.current = setTimeout(() => {
        clearTimers();
        setPending(false);
      }, SAFETY_TIMEOUT_MS);
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      clearTimers();
    };
  }, []);

  // Navigation fertig: pathname hat sich geändert → Spinner aus.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (showTimer.current) clearTimeout(showTimer.current);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    showTimer.current = null;
    safetyTimer.current = null;
    setPending(false);
  }, [pathname]);

  if (!pending) return null;

  return (
    <div
      role="status"
      aria-label="Lädt …"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
    >
      <span
        className={cn(
          "block size-10 rounded-full border-[3px] border-primary/25 border-t-primary",
          !reduced && "animate-spin",
          reduced && "animate-pulse",
        )}
        style={{ filter: "drop-shadow(0 0 10px rgba(231,182,94,0.55))" }}
      />
    </div>
  );
}
