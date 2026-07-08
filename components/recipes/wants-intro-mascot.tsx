"use client";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { Mascot } from "@/components/brand/mascot";

// Die Overlays liegen im selben 0 0 64 64-Koordinatenraum wie das Mascot-Gesicht:
// Augen bei (22,27) & (42,27) mit Sklera-Radius 7, Mund um (32,42).
// Leitmotiv: fremde Ziele prasseln von außen ein (Karte 0) → der eigene Funke
// im Bauch (Karte 1) → das Yin-&-Yang-Audit (Karte 2) → Little Bets als
// Experiment im Kolben (Karte 3).

// Bauch-Zentrum (knapp unter dem Mund, innerhalb des Blobs).
const BELLY_CX = 32;
const BELLY_CY = 53;

// ─── Karte 0: „Wessen Ziele jagst du eigentlich?" ─────────────────────
// Kleine Pfeile prasseln von allen Seiten auf den Blob ein — die Wants der
// anderen. Bedrängter Blick. Reduced: statische Pfeile ohne Puls.

function InboundArrow({
  x,
  y,
  angle,
  delay,
  reduced,
}: {
  x: number;
  y: number;
  angle: number;
  delay: number;
  reduced: boolean;
}) {
  // Pfeil zeigt Richtung Blob-Zentrum; gezeichnet als Linie + Spitze.
  return (
    <g
      transform={`translate(${x},${y}) rotate(${angle})`}
      stroke="var(--primary-foreground)"
      strokeWidth={1.2}
      strokeLinecap="round"
      opacity={0.5}
    >
      <line x1={0} y1={0} x2={5} y2={0} />
      <path d="M1.6,-1.8 L0,0 L1.6,1.8" fill="none" />
      {!reduced && (
        <animate
          attributeName="opacity"
          values="0.2;0.6;0.2"
          dur="2.4s"
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      )}
    </g>
  );
}

function NoiseArrowsOverlay({ reduced }: { reduced: boolean }) {
  return (
    <>
      <InboundArrow x={6} y={14} angle={35} delay={0} reduced={reduced} />
      <InboundArrow x={58} y={12} angle={150} delay={0.6} reduced={reduced} />
      <InboundArrow x={3} y={40} angle={0} delay={1.2} reduced={reduced} />
      <InboundArrow x={61} y={44} angle={185} delay={0.3} reduced={reduced} />
      <InboundArrow x={14} y={5} angle={65} delay={0.9} reduced={reduced} />
      <InboundArrow x={50} y={3} angle={115} delay={1.5} reduced={reduced} />
    </>
  );
}

function Card0Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="sorrowMild"
      size="md"
      gazeX={-1.5}
      overlay={<NoiseArrowsOverlay reduced={reduced} />}
    />
  );
}

// ─── Karte 1: „Du bist, was du willst." — der eigene Funke im Bauch ──
// Ein goldener Funke glimmt im Bauch — die intrinsischen Wants sind längst
// da, sie liegen nur verschüttet. Blick nach unten auf den Funken.
// Reduced: statischer Funke ohne Puls.

function SparkOverlay({ reduced }: { reduced: boolean }) {
  // Vierstrahliger Funke (Rauten-Stern) im Bauch.
  const r = 3.6;
  const inner = 1.1;
  const points = [
    [BELLY_CX, BELLY_CY - r],
    [BELLY_CX + inner, BELLY_CY - inner],
    [BELLY_CX + r, BELLY_CY],
    [BELLY_CX + inner, BELLY_CY + inner],
    [BELLY_CX, BELLY_CY + r],
    [BELLY_CX - inner, BELLY_CY + inner],
    [BELLY_CX - r, BELLY_CY],
    [BELLY_CX - inner, BELLY_CY - inner],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  return (
    <>
      {/* Weicher Glow hinter dem Funken */}
      <circle cx={BELLY_CX} cy={BELLY_CY} r={5} fill="#E7B65E" opacity={0.25}>
        {!reduced && (
          <animate
            attributeName="opacity"
            values="0.15;0.4;0.15"
            dur="3s"
            repeatCount="indefinite"
          />
        )}
      </circle>
      <polygon points={points} fill="#E7B65E">
        {!reduced && (
          <animate
            attributeName="opacity"
            values="0.7;1;0.7"
            dur="3s"
            repeatCount="indefinite"
          />
        )}
      </polygon>
    </>
  );
}

function Card1Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="curious"
      size="md"
      gazeY={2.5}
      overlay={<SparkOverlay reduced={reduced} />}
    />
  );
}

// ─── Karte 2: „Yin & Yang" — das Audit-Symbol im Bauch ────────────────
// Klassisches Yin-Yang-Zeichen, das sich ganz langsam dreht — die zwei
// Seiten derselben Wahrheit (Mühsal & Flow). Reduced: statisch.

function YinYangOverlay({ reduced }: { reduced: boolean }) {
  const R = 5.5;
  const half = R / 2;

  return (
    <g
      style={
        reduced
          ? undefined
          : {
              transformBox: "view-box",
              transformOrigin: `${BELLY_CX}px ${BELLY_CY}px`,
            }
      }
    >
      {/* Grundkreis (helle Seite) */}
      <circle
        cx={BELLY_CX}
        cy={BELLY_CY}
        r={R}
        fill="#FBF6EA"
        stroke="var(--primary-foreground)"
        strokeWidth={0.9}
      />
      {/* Dunkle Hälfte mit S-Kurve */}
      <path
        d={`M${BELLY_CX},${BELLY_CY - R}
            A${R},${R} 0 0 1 ${BELLY_CX},${BELLY_CY + R}
            A${half},${half} 0 0 1 ${BELLY_CX},${BELLY_CY}
            A${half},${half} 0 0 0 ${BELLY_CX},${BELLY_CY - R}
            Z`}
        fill="var(--primary-foreground)"
      />
      {/* Punkte */}
      <circle cx={BELLY_CX} cy={BELLY_CY - half} r={0.9} fill="var(--primary-foreground)" />
      <circle cx={BELLY_CX} cy={BELLY_CY + half} r={0.9} fill="#FBF6EA" />
      {!reduced && (
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${BELLY_CX} ${BELLY_CY}`}
          to={`360 ${BELLY_CX} ${BELLY_CY}`}
          dur="18s"
          repeatCount="indefinite"
        />
      )}
    </g>
  );
}

function Card2Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="smile"
      size="md"
      gazeY={2.5}
      overlay={<YinYangOverlay reduced={reduced} />}
    />
  );
}

// ─── Karte 3: „Was dich erwartet" — Little Bets als Experiment ────────
// Ein Erlenmeyerkolben im Bauch, in dem es golden blubbert: kleine Wetten,
// echte Daten. Zuversichtlicher Blick. Reduced: Bläschen statisch.

function FlaskOverlay({ reduced }: { reduced: boolean }) {
  const cx = BELLY_CX;
  const topY = BELLY_CY - 5;
  const bottomY = BELLY_CY + 4;

  return (
    <g>
      {/* Kolben-Umriss */}
      <path
        d={`M${cx - 1.6},${topY} L${cx - 1.6},${topY + 3.5} L${cx - 4.6},${bottomY - 1}
            A1.6,1.6 0 0 0 ${cx - 3.2},${bottomY + 1} L${cx + 3.2},${bottomY + 1}
            A1.6,1.6 0 0 0 ${cx + 4.6},${bottomY - 1} L${cx + 1.6},${topY + 3.5} L${cx + 1.6},${topY} Z`}
        fill="rgba(251,246,234,0.55)"
        stroke="var(--primary-foreground)"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {/* Füllstand */}
      <path
        d={`M${cx - 3.4},${bottomY - 2.6} L${cx - 4.6},${bottomY - 1} A1.6,1.6 0 0 0 ${cx - 3.2},${bottomY + 1} L${cx + 3.2},${bottomY + 1} A1.6,1.6 0 0 0 ${cx + 4.6},${bottomY - 1} L${cx + 3.4},${bottomY - 2.6} Z`}
        fill="#E7B65E"
        opacity={0.8}
      />
      {/* Bläschen */}
      <circle cx={cx - 1} cy={bottomY - 3.6} r={0.7} fill="#E7B65E" opacity={0.7}>
        {!reduced && (
          <animate
            attributeName="cy"
            values={`${bottomY - 3};${topY + 2.5}`}
            dur="2.6s"
            repeatCount="indefinite"
          />
        )}
        {!reduced && (
          <animate
            attributeName="opacity"
            values="0.7;0"
            dur="2.6s"
            repeatCount="indefinite"
          />
        )}
      </circle>
      <circle cx={cx + 1.4} cy={bottomY - 4.4} r={0.5} fill="#E7B65E" opacity={0.6}>
        {!reduced && (
          <animate
            attributeName="cy"
            values={`${bottomY - 3.4};${topY + 2}`}
            dur="3.4s"
            begin="0.9s"
            repeatCount="indefinite"
          />
        )}
        {!reduced && (
          <animate
            attributeName="opacity"
            values="0.6;0"
            dur="3.4s"
            begin="0.9s"
            repeatCount="indefinite"
          />
        )}
      </circle>
    </g>
  );
}

function Card3Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="happy"
      size="md"
      overlay={<FlaskOverlay reduced={reduced} />}
    />
  );
}

// ─── Öffentliche Komponente ───────────────────────────────────────────

/**
 * Rendert den zum jeweiligen Intro-Karten-Index passenden animierten
 * Mascot für das Wants-Rezept (fremde Ziele → eigener Funke → Yin & Yang →
 * Little-Bets-Kolben). Wird als renderMascot-Prop an <RecipeIntro> übergeben.
 */
export function WantsIntroMascot({ index }: { index: number }) {
  const reduced = useReducedMotion();

  if (index === 0) return <Card0Mascot reduced={reduced} />;
  if (index === 1) return <Card1Mascot reduced={reduced} />;
  if (index === 2) return <Card2Mascot reduced={reduced} />;
  return <Card3Mascot reduced={reduced} />;
}
