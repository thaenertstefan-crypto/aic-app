"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { zoneOf } from "@/lib/utils/zone";

/**
 * Setzt einen Zone-Marker auf <body> abhängig von der Route, damit
 * globals.css eine Farbzone (z. B. Schmiede-Rosé) über Seiteninhalt UND
 * Bottom-Nav legen kann. Rein präsentativ, rendert nichts.
 *
 * Welche Route in welcher Zone liegt, steht in `lib/utils/zone.ts` — der
 * Funkenflug stellt dieselbe Frage und muss dieselbe Antwort bekommen.
 */
export function ZoneTheme() {
  const pathname = usePathname();

  useEffect(() => {
    if (zoneOf(pathname) === "schmiede") {
      document.body.dataset.zone = "schmiede";
    } else {
      delete document.body.dataset.zone;
    }
    return () => {
      delete document.body.dataset.zone;
    };
  }, [pathname]);

  return null;
}
