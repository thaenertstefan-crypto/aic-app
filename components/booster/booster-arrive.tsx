"use client";

import { useEffect } from "react";

import { useBoosterZoom } from "@/components/booster/booster-zoom";

/**
 * Von jeder Booster-Sub-Page beim Mount gerendert: löst die Ankunft des
 * Zoom-Übergangs aus (no-op bei Direkt-Load, weil dann kein Zoom läuft).
 */
export function BoosterArrive() {
  const { arrive } = useBoosterZoom();
  useEffect(() => {
    arrive();
  }, [arrive]);
  return null;
}
