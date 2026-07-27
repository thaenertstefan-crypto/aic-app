"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Setzt einen Zone-Marker auf <body> abhängig von der Route, damit
 * globals.css eine Farbzone (z. B. Schmiede-Rosé) über Seiteninhalt UND
 * Bottom-Nav legen kann. Rein präsentativ, rendert nichts.
 */
export function ZoneTheme() {
  const pathname = usePathname();

  useEffect(() => {
    const schmiede = pathname.startsWith("/me/wants/schmiede");
    if (schmiede) {
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
