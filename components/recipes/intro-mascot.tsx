"use client";

import type { ComponentType, CSSProperties, ReactNode } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

// Die geteilte Mechanik der sieben Intro-Maskottchen — und nur die Mechanik.
// Die SVG-Zeichnungen bleiben in ihren jeweiligen Dateien: sie sind der
// eigentliche Wert und ähneln einander gerade nicht (siehe ADR-0001). Was sich
// hier sammelt, ist das Drumherum, das vorher in jeder Datei nachgebaut stand:
// welche Zeichnung zu welchem Index gehört, und wie eine Bewegung sich
// abschaltet, wenn das System „Bewegung reduzieren" meldet.

/**
 * Der unruhige Schwank des ganzen Blobs — die Karte-0-Geste für „aus dem
 * Gleichgewicht", geteilt von things-got-messy, shadow und saying-no.
 * Keyframe: `mascot-sway` in app/globals.css.
 */
export const UNEASE_SWAY = "mascot-sway 3.2s ease-in-out infinite";

/**
 * Bündelt die Karten-Maskottchen einer Übung zu der einen Komponente, die
 * <RecipeIntro renderMascot> erwartet: Index rein, Zeichnung raus. Die
 * Reihenfolge im Array ist die Zuordnung.
 *
 *   export const ShadowIntroMascot = mascotPerCard([Card0Mascot, Card1Mascot]);
 *
 * Jenseits der letzten Zeichnung bleibt die letzte stehen. Das ist kein
 * Notnagel, sondern der Normalfall bei `saying-no`: fünf Textkarten, vier
 * Zeichnungen — die letzte trägt den Abschluss über zwei Karten.
 */
export function mascotPerCard(
  cards: readonly ComponentType[],
): ComponentType<{ index: number }> {
  return function IntroMascot({ index }) {
    const Card = cards[Math.min(index, cards.length - 1)];
    return <Card />;
  };
}

/** Was ein bewegtes Overlay-Teil braucht, um sich selbst abschalten zu können. */
type MascotMotion = {
  /** `animation`-Kurzschreibweise; der Keyframe steht in app/globals.css. */
  animation: string;
  /**
   * Drehpunkt im 0 0 64 64-Raum des Mascot-Gesichts (Augen bei (22,27) und
   * (42,27), Mund um (32,42)). Bringt `transformBox: "view-box"` mit — ohne das
   * rechnet der Browser den Ursprung gegen die Bounding-Box des Teils statt
   * gegen den Gesichtsraum, und das Teil wandert beim Drehen aus.
   */
  origin?: readonly [x: number, y: number];
  /**
   * Gilt nur mit laufender Animation: Startwerte wie `opacity: 0` — oder ein
   * anderer Bezugsrahmen als `origin`, etwa `transformBox: "fill-box"` für
   * Teile, die sich um sich selbst drehen statt um einen Punkt im Gesicht.
   */
  running?: CSSProperties;
  /** Gilt stattdessen bei „Bewegung reduzieren": der sinnvolle Endzustand. */
  still?: CSSProperties;
};

/**
 * Gibt den Stilbauer für bewegte Overlay-Teile zurück: einmal
 * `prefers-reduced-motion` lesen, dann pro Teil entscheiden, ob der Keyframe
 * läuft oder der Ruhezustand gilt.
 *
 *   const motionStyle = useMascotMotion();
 *   <g style={motionStyle({
 *     origin: [32, 10],
 *     animation: "sh-cloud 3.6s ease-in-out infinite",
 *     still: { opacity: 0.5 },
 *   })}>
 *
 * Ein Bauer statt eines Hooks pro Teil, weil manche Overlays ihre Teile über
 * eine Schleife aufziehen — dort wäre ein Hook-Aufruf pro Teil nicht erlaubt.
 */
export function useMascotMotion() {
  const reduced = useReducedMotion();

  return ({
    animation,
    origin,
    running,
    still,
  }: MascotMotion): CSSProperties | undefined => {
    if (reduced) return still;

    return {
      ...(origin && {
        transformBox: "view-box" as const,
        transformOrigin: `${origin[0]}px ${origin[1]}px`,
      }),
      ...running,
      animation,
    };
  };
}

/**
 * Der ganze Blob schwankt. Sitzt bewusst außen um das Maskottchen statt in
 * ihm: der Blob atmet innen weiter, das Schwanken legt sich darüber.
 */
export function SwayingMascot({
  animation,
  children,
}: {
  animation: string;
  children: ReactNode;
}) {
  const motionStyle = useMascotMotion();

  return (
    // `origin` bleibt leer: der Schwank sitzt auf einem HTML-Element, nicht im
    // Gesichtsraum — der Drehpunkt ist die Mitte des Blobs.
    <div
      style={{
        display: "inline-block",
        ...motionStyle({ animation, running: { transformOrigin: "center" } }),
      }}
    >
      {children}
    </div>
  );
}
