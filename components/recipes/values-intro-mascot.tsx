"use client";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { Mascot } from "@/components/brand/mascot";

// Die Overlays liegen im selben 0 0 64 64-Koordinatenraum wie das Mascot-Gesicht:
// Augen bei (22,27) & (42,27) mit Sklera-Radius 7, Mund um (32,42).
// Leitmotiv: mulmiges Bauchgefühl (Karte 0) → der innere Kompass im Bauch rastet
// auf Norden ein (Karte 1) → genaue Selbstbeobachtung mit der Lupe (Karte 2).

// Kompass sitzt im unteren Blob-Bereich („Bauch"), knapp unter dem Mund und
// innerhalb des Blobs.
const COMPASS_CX = 32;
const COMPASS_CY = 49;
const RING_R = 5.5;
const NEEDLE_LEN = 4.6;

// ─── Karte 0: „Schon mal das Gefühl gehabt?" — mulmiges Bauchgefühl ──
// Sorgenvolles Gesicht, Blick leicht nach unten zum Bauch. Im Bauch churnt es
// (wellige Linien undulieren), und der ganze Blob schwankt unruhig.
// = „ein komisches Gefühl im Bauch". Reduced: Wellen statisch, kein Schwanken.

function BellyChurnOverlay({ reduced }: { reduced: boolean }) {
  return (
    <g
      style={
        reduced
          ? undefined
          : {
              transformBox: "view-box",
              transformOrigin: `${COMPASS_CX}px ${COMPASS_CY}px`,
              animation: "val-belly-churn 3.2s ease-in-out infinite",
            }
      }
    >
      <path
        d="M25,47 Q28.5,45.3 32,47 Q35.5,48.7 39,47"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.4}
      />
      <path
        d="M25,50.5 Q28.5,52.2 32,50.5 Q35.5,48.8 39,50.5"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.3}
      />
    </g>
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
              animation: "val-unease-sway 4s ease-in-out infinite",
            }
      }
    >
      <Mascot
        expression="sorrowMild"
        size="md"
        gazeY={1.2}
        overlay={<BellyChurnOverlay reduced={reduced} />}
      />
    </div>
  );
}

// ─── Karte 1: „Deine Werte." — der innere Kompass im Bauch ───────────
// Kompass im Bauch; die Nadel schwingt gedämpft ein und RASTET AUF NORDEN, mit
// kurzem goldenem Puls. Das Maskottchen schaut nach unten auf seinen Kompass,
// Ausdruck hellt auf (curious). = der Aha-Moment.
// Reduced: Nadel statisch auf Norden + statischer Glow.

// Ring + Mittelpin des Bauch-Kompasses (ohne Nadel).
function CompassRing() {
  return (
    <>
      <circle
        cx={COMPASS_CX}
        cy={COMPASS_CY}
        r={RING_R}
        fill="rgba(251,246,234,0.55)"
        stroke="var(--primary-foreground)"
        strokeWidth={1.1}
      />
      {/* Nord-Markierung */}
      <circle cx={COMPASS_CX} cy={COMPASS_CY - (RING_R - 1.2)} r={0.6} fill="var(--primary-foreground)" opacity={0.5} />
    </>
  );
}

// Kompassnadel (Norden = nach oben). Nord-Hälfte gold, Süd-Hälfte hell.
function CompassNeedle() {
  return (
    <>
      <path d={`M${COMPASS_CX},${COMPASS_CY - NEEDLE_LEN} L${COMPASS_CX - 1.8},${COMPASS_CY} L${COMPASS_CX + 1.8},${COMPASS_CY} Z`} fill="#E7B65E" />
      <path d={`M${COMPASS_CX},${COMPASS_CY + NEEDLE_LEN} L${COMPASS_CX - 1.8},${COMPASS_CY} L${COMPASS_CX + 1.8},${COMPASS_CY} Z`} fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.4} />
      <circle cx={COMPASS_CX} cy={COMPASS_CY} r={1} fill="var(--primary-foreground)" />
    </>
  );
}

function CompassOverlay1({ reduced }: { reduced: boolean }) {
  return (
    <>
      <CompassRing />

      {/* Goldener Puls am Nordpunkt beim Einrasten */}
      <circle
        cx={COMPASS_CX}
        cy={COMPASS_CY - NEEDLE_LEN}
        r={2.2}
        fill="#E7B65E"
        style={
          reduced
            ? { transformBox: "view-box", transformOrigin: `${COMPASS_CX}px ${COMPASS_CY - NEEDLE_LEN}px`, opacity: 0.85 }
            : {
                transformBox: "view-box",
                transformOrigin: `${COMPASS_CX}px ${COMPASS_CY - NEEDLE_LEN}px`,
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
      gazeY={2.8}
      overlay={<CompassOverlay1 reduced={reduced} />}
    />
  );
}

// ─── Karte 2: „Was dich erwartet" — wie ein Wissenschaftler ──────────
// Lächelndes Gesicht; eine Lupe sitzt fix über dem linken Auge, das dahinter
// vergrößert erscheint (größer als das rechte Auge). Statisch, kein Scan.
// = „echte Beobachtung von dir selbst".

function LoupeOverlay() {
  const lensCx = 22;
  const lensCy = 27;

  return (
    <g>
      {/* Vergrößertes linkes Auge (überdeckt das reale r7/r4-Auge → wirkt größer) */}
      <circle cx={lensCx} cy={lensCy} r={9} fill="#FBF6EA" />
      <circle cx={lensCx - 1.3} cy={lensCy} r={5} fill="var(--primary-foreground)" />
      <circle cx={lensCx - 2.6} cy={lensCy - 1.6} r={1.6} fill="white" />

      {/* Linsen-Glas + Ring */}
      <circle cx={lensCx} cy={lensCy} r={9.5} fill="rgba(255,255,255,0.14)" stroke="var(--primary-foreground)" strokeWidth={1.6} />
      <circle cx={lensCx} cy={lensCy} r={9.5} fill="none" stroke="#E7B65E" strokeWidth={0.5} opacity={0.5} />

      {/* Griff */}
      <line
        x1={lensCx + 6.7}
        y1={lensCy + 6.7}
        x2={lensCx + 11}
        y2={lensCy + 11}
        stroke="var(--primary-foreground)"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  );
}

function Card2Mascot() {
  return (
    <Mascot
      expression="smile"
      size="md"
      overlay={<LoupeOverlay />}
    />
  );
}

// ─── Öffentliche Komponente ───────────────────────────────────────────

/**
 * Rendert den zum jeweiligen Intro-Karten-Index passenden animierten
 * Mascot für das Werte-Rezept (mulmiges Bauchgefühl → innerer Kompass → Lupe).
 * Wird als renderMascot-Prop an <RecipeIntro> übergeben.
 */
export function ValuesIntroMascot({ index }: { index: number }) {
  const reduced = useReducedMotion();

  if (index === 0) return <Card0Mascot reduced={reduced} />;
  if (index === 1) return <Card1Mascot reduced={reduced} />;
  return <Card2Mascot />;
}
