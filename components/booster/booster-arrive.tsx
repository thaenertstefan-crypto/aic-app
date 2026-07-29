"use client";

import { useEffect } from "react";

import { useBoosterZoom } from "@/components/booster/booster-zoom";

/**
 * Von jeder Booster-Sub-Page beim Mount gerendert: löst die Ankunft des
 * Zoom-Übergangs aus (no-op bei Direkt-Load, weil dann kein Zoom läuft).
 *
 * Meldet bewusst `null` — „diese Seite hat kein Modul-Icon". `arrive()` greift
 * nur aus der Phase "zooming" heraus, die erste Meldung gewinnt also. Weil
 * beide Melder im selben Mount-Zyklus laufen und die Effekt-Reihenfolge (von
 * unten nach oben im Baum) nicht garantiert, dass ModuleIcon zuerst dran ist,
 * meldet BoosterArrive einen Frame später: rendert die Seite ein Modul-Icon,
 * hat dieses seinen Rect bis dahin abgesetzt und dieser Aufruf ist ein no-op.
 */
export function BoosterArrive() {
  const { arrive } = useBoosterZoom();
  useEffect(() => {
    const raf = requestAnimationFrame(() => arrive(null));
    return () => cancelAnimationFrame(raf);
  }, [arrive]);
  return null;
}
