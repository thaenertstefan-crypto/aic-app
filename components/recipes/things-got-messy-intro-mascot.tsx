"use client";

import { Mascot } from "@/components/brand/mascot";
import {
  mascotPerCard,
  SwayingMascot,
  UNEASE_SWAY,
  useMascotMotion,
} from "@/components/recipes/intro-mascot";

// Die Overlays liegen im selben 0 0 64 64-Koordinatenraum wie das Mascot-Gesicht:
// Augen bei (22,27) & (42,27) mit Sklera-Radius 7, Mund um (32,42).
// Leitmotiv: das Gedanken-Knäuel nach dem messy Moment (Karte 0) → der
// Schuld-Kompass, der zwischen gesund und ungesund einpendelt (Karte 1) →
// das Bill of Rights, das um ein Recht wächst (Karte 2).

// ─── Karte 0: „Es ist passiert." — Gedanken-Knäuel + Schweißtropfen ──
// Sorgenvolles Gesicht, der Blob schwankt unruhig. Über dem Kopf zeichnet sich
// in einer Schleife ein verworrenes Gedanken-Knäuel, an der Schläfe perlt ein
// Schweißtropfen herab. Reduced: statisches Knäuel, kein Schwanken, Tropfen
// statisch.

function MessOverlay() {
  const motionStyle = useMascotMotion();

  return (
    <>
      {/* Gedanken-Knäuel über dem Kopf: verworrene Schleifen, die sich in
          einer Loop-Animation „zusammenziehen" (Draw-in via dashoffset). */}
      <path
        d="M23,12 Q28,5 33,10 Q38,15 31,15 Q24,15 29,9 Q34,3 39,9 Q43,14 37,13"
        pathLength={30}
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={30}
        opacity={0.55}
        style={motionStyle({
          animation: "tgm-scribble 3s ease-in-out infinite",
          still: { strokeDashoffset: 0 },
        })}
      />

      {/* Schweißtropfen an der Schläfe, perlt leicht herab */}
      <path
        d="M49.5,16 Q51.3,18.6 51.3,20 A1.8,1.8 0 1 1 47.7,20 Q47.7,18.6 49.5,16 Z"
        fill="#FBF6EA"
        stroke="var(--primary-foreground)"
        strokeWidth={0.5}
        opacity={0.9}
        style={motionStyle({
          origin: [49.5, 19],
          animation: "tgm-drop 3s ease-in-out infinite",
        })}
      />
    </>
  );
}

function Card0Mascot() {
  return (
    <SwayingMascot animation={UNEASE_SWAY}>
      <Mascot
        expression="sorrowMild"
        size="md"
        gazeY={-1}
        overlay={<MessOverlay />}
      />
    </SwayingMascot>
  );
}

// ─── Karte 1: „Gesunde und ungesunde Schuld." — der Schuld-Kompass ───
// Nachdenkliches Gesicht, Blick nach unten auf einen Kompass im Bauch. Der hat
// zwei Pole: oben ein goldener Punkt (gesunde Schuld — der Kompass, der zur
// Wiedergutmachung zeigt), unten ein dunkler Punkt (ungesunde Schuld — die
// alte Regel). Die Nadel pendelt zwischen beiden und rastet oben auf Gold ein.
// Reduced: Nadel statisch auf Gold.

const COMPASS_CX = 32;
const COMPASS_CY = 54;
const RING_R = 5.5;
const NEEDLE_LEN = 4.6;

function GuiltCompassOverlay() {
  const motionStyle = useMascotMotion();

  return (
    <>
      {/* Ziffernblatt */}
      <circle
        cx={COMPASS_CX}
        cy={COMPASS_CY}
        r={RING_R}
        fill="rgba(251,246,234,0.55)"
        stroke="var(--primary-foreground)"
        strokeWidth={1.1}
      />

      {/* Pol „gesund" (oben, gold) und Pol „ungesund" (unten, dunkel) */}
      <circle cx={COMPASS_CX} cy={COMPASS_CY - (RING_R - 1.2)} r={0.8} fill="#E7B65E" />
      <circle cx={COMPASS_CX} cy={COMPASS_CY + (RING_R - 1.2)} r={0.7} fill="var(--primary-foreground)" opacity={0.55} />

      {/* Goldener Puls am Gesund-Pol beim Einrasten */}
      <circle
        cx={COMPASS_CX}
        cy={COMPASS_CY - NEEDLE_LEN}
        r={2.2}
        fill="#E7B65E"
        style={motionStyle({
          origin: [COMPASS_CX, COMPASS_CY - NEEDLE_LEN],
          animation: "tgm-pole-pulse 3.6s ease-out infinite",
          running: { opacity: 0 },
          still: { opacity: 0.85 },
        })}
      />

      {/* Nadel: pendelt zwischen den Polen, rastet oben ein */}
      <g
        style={motionStyle({
          origin: [COMPASS_CX, COMPASS_CY],
          animation: "tgm-needle-decide 3.6s ease-in-out infinite",
          still: { transform: "rotate(0deg)" },
        })}
      >
        <path d={`M${COMPASS_CX},${COMPASS_CY - NEEDLE_LEN} L${COMPASS_CX - 1.8},${COMPASS_CY} L${COMPASS_CX + 1.8},${COMPASS_CY} Z`} fill="#E7B65E" />
        <path d={`M${COMPASS_CX},${COMPASS_CY + NEEDLE_LEN} L${COMPASS_CX - 1.8},${COMPASS_CY} L${COMPASS_CX + 1.8},${COMPASS_CY} Z`} fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.4} />
        <circle cx={COMPASS_CX} cy={COMPASS_CY} r={1} fill="var(--primary-foreground)" />
      </g>
    </>
  );
}

function Card1Mascot() {
  return (
    <Mascot
      expression="thinking"
      size="md"
      gazeX={0}
      gazeY={2.8}
      overlay={<GuiltCompassOverlay />}
    />
  );
}

// ─── Karte 2: „Was dich erwartet" — dein Bill of Rights wächst ───────
// Lächelndes Gesicht; im Bauch ein kleines Dokument mit drei Zeilen (das Bill
// of Rights) und einem goldenen Plus-Badge: aus dem messy Moment wird
// vielleicht ein neues Recht. Statisch, ruhiger Abschluss.

function GrowingRightsOverlay() {
  const docX = 26.5;
  const docY = 46;

  return (
    <g>
      {/* Dokument */}
      <rect x={docX} y={docY} width={11} height={13} rx={1.4} fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.7} />

      {/* Drei Rechte-Zeilen */}
      <line x1={docX + 2} y1={docY + 3.2} x2={docX + 9} y2={docY + 3.2} stroke="var(--primary-foreground)" strokeWidth={0.9} strokeLinecap="round" opacity={0.7} />
      <line x1={docX + 2} y1={docY + 6.2} x2={docX + 9} y2={docY + 6.2} stroke="var(--primary-foreground)" strokeWidth={0.9} strokeLinecap="round" opacity={0.7} />
      <line x1={docX + 2} y1={docY + 9.2} x2={docX + 6.5} y2={docY + 9.2} stroke="var(--primary-foreground)" strokeWidth={0.9} strokeLinecap="round" opacity={0.7} />

      {/* Goldenes Plus-Badge: ein neues Recht kommt dazu */}
      <circle cx={docX + 11} cy={docY + 1} r={2.6} fill="#E7B65E" stroke="#FBF6EA" strokeWidth={0.6} />
      <line x1={docX + 9.7} y1={docY + 1} x2={docX + 12.3} y2={docY + 1} stroke="var(--primary-foreground)" strokeWidth={0.8} strokeLinecap="round" />
      <line x1={docX + 11} y1={docY - 0.3} x2={docX + 11} y2={docY + 2.3} stroke="var(--primary-foreground)" strokeWidth={0.8} strokeLinecap="round" />
    </g>
  );
}

function Card2Mascot() {
  return (
    <Mascot
      expression="smile"
      size="md"
      gazeY={1}
      overlay={<GrowingRightsOverlay />}
    />
  );
}

// ─── Öffentliche Komponente ───────────────────────────────────────────

/**
 * Rendert den zum jeweiligen Intro-Karten-Index passenden animierten
 * Mascot für das Things-Got-Messy-Rezept (Gedanken-Knäuel → Schuld-Kompass
 * → wachsendes Bill of Rights).
 * Wird als renderMascot-Prop an <RecipeIntro> übergeben.
 */
export const ThingsGotMessyIntroMascot = mascotPerCard([
  Card0Mascot,
  Card1Mascot,
  Card2Mascot,
]);
