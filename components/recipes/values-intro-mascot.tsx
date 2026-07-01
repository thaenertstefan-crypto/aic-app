"use client";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { Mascot } from "@/components/brand/mascot";

// Die Overlays liegen im selben 0 0 64 64-Koordinatenraum wie das Mascot-Gesicht:
// Augen bei (22,27) & (42,27) mit Sklera-Radius 7, Mund um (32,42).
// Leitmotiv über alle 3 Karten: ein KOMPASS (Karte 0 wackelt → Karte 1 rastet
// auf Norden ein). Der Kompass sitzt im oberen Kopfbereich (Mittelpunkt 32,12),
// damit er innerhalb des Blobs liegt und nicht beschnitten wird.

const COMPASS_CX = 32;
const COMPASS_CY = 12;

// Ring + Mittelpin des Kompasses (ohne Nadel) — für Karte 0 und 1 geteilt.
function CompassRing() {
  return (
    <>
      <circle
        cx={COMPASS_CX}
        cy={COMPASS_CY}
        r={7}
        fill="rgba(251,246,234,0.55)"
        stroke="var(--primary-foreground)"
        strokeWidth={1.1}
      />
      {/* Nord-Markierung */}
      <circle cx={COMPASS_CX} cy={COMPASS_CY - 5.6} r={0.7} fill="var(--primary-foreground)" opacity={0.5} />
    </>
  );
}

// Kompassnadel (Norden = nach oben). Nord-Hälfte gold, Süd-Hälfte hell.
function CompassNeedle() {
  return (
    <>
      <path d={`M${COMPASS_CX},${COMPASS_CY - 5.5} L${COMPASS_CX - 2},${COMPASS_CY} L${COMPASS_CX + 2},${COMPASS_CY} Z`} fill="#E7B65E" />
      <path d={`M${COMPASS_CX},${COMPASS_CY + 5.5} L${COMPASS_CX - 2},${COMPASS_CY} L${COMPASS_CX + 2},${COMPASS_CY} Z`} fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.4} />
      <circle cx={COMPASS_CX} cy={COMPASS_CY} r={1.1} fill="var(--primary-foreground)" />
    </>
  );
}

// ─── Karte 0: „Schon mal das Gefühl gehabt?" ─────────────────────────
// Sorgenvolles Standardgesicht + Kompass, dessen Nadel unruhig hin- und
// herwackelt und NIE einrastet. Der ganze Blob schwankt langsam (val-drift).
// = „navigiert auf gut Glück". Reduced: Nadel statisch schief, kein Schwanken.

function CompassOverlay0({ reduced }: { reduced: boolean }) {
  return (
    <>
      <CompassRing />
      <g
        style={
          reduced
            ? { transformBox: "view-box", transformOrigin: `${COMPASS_CX}px ${COMPASS_CY}px`, transform: "rotate(28deg)" }
            : {
                transformBox: "view-box",
                transformOrigin: `${COMPASS_CX}px ${COMPASS_CY}px`,
                animation: "val-needle-wobble 2.6s ease-in-out infinite",
              }
        }
      >
        <CompassNeedle />
      </g>
    </>
  );
}

function Card0Mascot({ reduced }: { reduced: boolean }) {
  return (
    <div
      style={
        reduced
          ? { display: "inline-block" }
          : {
              display: "inline-block",
              transformOrigin: "center",
              animation: "val-drift 4.5s ease-in-out infinite",
            }
      }
    >
      <Mascot
        expression="sorrowMild"
        size="md"
        gazeY={-1.5}
        overlay={<CompassOverlay0 reduced={reduced} />}
      />
    </div>
  );
}

// ─── Karte 1: „Deine Werte." — der innere Kompass ────────────────────
// Derselbe Kompass, aber die Nadel schwingt gedämpft ein und RASTET AUF
// NORDEN. Im Einrast-Moment ein kurzer goldener Puls. Ausdruck hellt auf
// (curious), Blick ruhig/gerade. = der Aha-Moment.
// Reduced: Nadel statisch auf Norden + statischer Glow.

function CompassOverlay1({ reduced }: { reduced: boolean }) {
  return (
    <>
      <CompassRing />

      {/* Goldener Puls am Nordpunkt beim Einrasten */}
      <circle
        cx={COMPASS_CX}
        cy={COMPASS_CY - 5.5}
        r={2.4}
        fill="#E7B65E"
        style={
          reduced
            ? { transformBox: "view-box", transformOrigin: `${COMPASS_CX}px ${COMPASS_CY - 5.5}px`, opacity: 0.85 }
            : {
                transformBox: "view-box",
                transformOrigin: `${COMPASS_CX}px ${COMPASS_CY - 5.5}px`,
                opacity: 0,
                animation: "val-north-pulse 3.2s ease-out infinite",
              }
        }
      />

      {/* Nadel: rastet auf Norden ein */}
      <g
        style={
          reduced
            ? { transformBox: "view-box", transformOrigin: `${COMPASS_CX}px ${COMPASS_CY}px`, transform: "rotate(0deg)" }
            : {
                transformBox: "view-box",
                transformOrigin: `${COMPASS_CX}px ${COMPASS_CY}px`,
                animation: "val-needle-settle 3.2s cubic-bezier(0.34,1.2,0.64,1) infinite",
              }
        }
      >
        <CompassNeedle />
      </g>
    </>
  );
}

function Card1Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="curious"
      size="md"
      gazeX={0}
      gazeY={-1.5}
      overlay={<CompassOverlay1 reduced={reduced} />}
    />
  );
}

// ─── Karte 2: „Was dich erwartet" — wie ein Wissenschaftler ──────────
// Nachdenkliches Gesicht (thinking) + eine Lupe, die langsam horizontal
// über die Augen scannt; dahinter eine leicht vergrößerte Pupille.
// = „echte Beobachtung von dir selbst". Reduced: Lupe statisch, kein Scan.

function LoupeOverlay({ reduced }: { reduced: boolean }) {
  // Lupe scannt in Augenhöhe (y≈27). Ruhe-/Startposition über dem linken Auge.
  const lensCx = 22;
  const lensCy = 27;

  return (
    <g
      style={
        reduced
          ? undefined
          : {
              transformBox: "view-box",
              transformOrigin: `${lensCx}px ${lensCy}px`,
              animation: "val-loupe-pan 3.6s ease-in-out infinite",
            }
      }
    >
      {/* Vergrößerte Pupille hinter der Linse */}
      <circle cx={lensCx} cy={lensCy} r={3} fill="var(--primary-foreground)" opacity={0.9} />
      <circle cx={lensCx - 1} cy={lensCy - 1} r={0.9} fill="white" opacity={0.9} />

      {/* Linsen-Glas + Ring */}
      <circle cx={lensCx} cy={lensCy} r={5.2} fill="rgba(255,255,255,0.16)" stroke="var(--primary-foreground)" strokeWidth={1.4} />
      <circle cx={lensCx} cy={lensCy} r={5.2} fill="none" stroke="#E7B65E" strokeWidth={0.5} opacity={0.5} />

      {/* Griff */}
      <line
        x1={lensCx + 3.7}
        y1={lensCy + 3.7}
        x2={lensCx + 8}
        y2={lensCy + 8}
        stroke="var(--primary-foreground)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </g>
  );
}

function Card2Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="thinking"
      size="md"
      overlay={<LoupeOverlay reduced={reduced} />}
    />
  );
}

// ─── Öffentliche Komponente ───────────────────────────────────────────

/**
 * Rendert den zum jeweiligen Intro-Karten-Index passenden animierten
 * Mascot für das Werte-Rezept (Kompass-Leitmotiv).
 * Wird als renderMascot-Prop an <RecipeIntro> übergeben.
 */
export function ValuesIntroMascot({ index }: { index: number }) {
  const reduced = useReducedMotion();

  if (index === 0) return <Card0Mascot reduced={reduced} />;
  if (index === 1) return <Card1Mascot reduced={reduced} />;
  return <Card2Mascot reduced={reduced} />;
}
