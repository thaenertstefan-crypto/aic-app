"use client";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { Mascot } from "@/components/brand/mascot";

// Die Overlays liegen im selben 0 0 64 64-Koordinatenraum wie das Mascot-Gesicht:
// Augen bei (22,27) & (42,27) mit Sklera-Radius 7, Mund um (32,42).
// Leitmotiv: die dunkle Wolke, die im Verborgenen wächst (Karte 0) → der kleine
// Schatten-Begleiter, der raus darf (Karte 1) → das Schloss als Privatsphäre-
// Versprechen (Karte 2) → die kleine Flamme des Loslassens (Karte 3).

// ─── Karte 0: „Da ist etwas, das du nicht zeigst." ────────────────────
// Aufgesetztes Lächeln, aber über dem Kopf verdichtet sich pulsierend eine
// dunkle Wolke — der runtergeschluckte Groll. Reduced: Wolke statisch.

function StormCloudOverlay({ reduced }: { reduced: boolean }) {
  return (
    <g
      style={
        reduced
          ? { transformBox: "view-box", transformOrigin: "32px 10px", opacity: 0.5 }
          : {
              transformBox: "view-box",
              transformOrigin: "32px 10px",
              animation: "sh-cloud 3.6s ease-in-out infinite",
            }
      }
    >
      {/* Wolke aus drei überlappenden Bögen */}
      <path
        d="M24,13 a4,4 0 0 1 4,-4 a4.5,4.5 0 0 1 8,-1 a4,4 0 0 1 4.5,5 Z"
        fill="var(--primary-foreground)"
        opacity={0.55}
      />
      {/* Kleiner Blitz aus der Wolke */}
      <path
        d="M31,14 l2.4,0 -1.6,2.6 2,0 -3.4,4 1,-3 -1.8,0 Z"
        fill="#E7B65E"
        opacity={0.9}
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
              animation: "tgm-sway 3.2s ease-in-out infinite",
            }
      }
    >
      <Mascot
        expression="sorrowMild"
        size="md"
        gazeY={-1}
        overlay={<StormCloudOverlay reduced={reduced} />}
      />
    </div>
  );
}

// ─── Karte 1: „Deine Schattenseite darf mal raus." ────────────────────
// Neugieriger Blick zur Seite: neben dem Mascot lugt ein kleiner dunkler
// Schatten-Blob hervor — nicht bedrohlich, eher ein vergessener Begleiter.

function ShadowBuddyOverlay({ reduced }: { reduced: boolean }) {
  return (
    <g
      style={
        reduced
          ? { transformBox: "view-box", transformOrigin: "54px 52px" }
          : {
              transformBox: "view-box",
              transformOrigin: "54px 52px",
              animation: "sh-peek 3.4s ease-in-out infinite",
            }
      }
    >
      {/* Kleiner Schatten-Blob rechts unten */}
      <ellipse cx={54} cy={54} rx={6.5} ry={5.5} fill="var(--primary-foreground)" opacity={0.5} />
      {/* Zwei helle Augen */}
      <circle cx={52} cy={52.5} r={1.1} fill="#FBF6EA" />
      <circle cx={56.5} cy={52.5} r={1.1} fill="#FBF6EA" />
      <circle cx={52.3} cy={52.7} r={0.5} fill="var(--primary-foreground)" />
      <circle cx={56.8} cy={52.7} r={0.5} fill="var(--primary-foreground)" />
    </g>
  );
}

function Card1Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="curious"
      size="md"
      gazeX={3}
      gazeY={2}
      overlay={<ShadowBuddyOverlay reduced={reduced} />}
    />
  );
}

// ─── Karte 2: „Hier liest niemand mit." — das Schloss ─────────────────
// Ruhiges Gesicht, im Bauch ein goldenes Schloss. Statisch — Vertrauen
// braucht keine Animation.

function LockOverlay() {
  const cx = 32;
  const y = 48;

  return (
    <g>
      {/* Bügel */}
      <path
        d={`M${cx - 3},${y + 2} v-2.5 a3,3 0 0 1 6,0 v2.5`}
        fill="none"
        stroke="#E7B65E"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {/* Körper */}
      <rect
        x={cx - 4.5}
        y={y + 2}
        width={9}
        height={7.5}
        rx={1.6}
        fill="#E7B65E"
        stroke="#FBF6EA"
        strokeWidth={0.6}
      />
      {/* Schlüsselloch */}
      <circle cx={cx} cy={y + 5} r={1} fill="var(--primary-foreground)" />
      <line
        x1={cx}
        y1={y + 5.8}
        x2={cx}
        y2={y + 7.4}
        stroke="var(--primary-foreground)"
        strokeWidth={0.9}
        strokeLinecap="round"
      />
    </g>
  );
}

function Card2Mascot() {
  return (
    <Mascot expression="smile" size="md" gazeY={2.5} overlay={<LockOverlay />} />
  );
}

// ─── Karte 3: „Was dich erwartet" — die kleine Flamme ─────────────────
// Zuversichtliches Gesicht; im Bauch eine sanft flackernde Flamme:
// verbrennen als Befreiung, nicht als Zerstörung. Reduced: statisch.

function FlameOverlay({ reduced }: { reduced: boolean }) {
  return (
    <g
      style={
        reduced
          ? { transformBox: "view-box", transformOrigin: "32px 53px" }
          : {
              transformBox: "view-box",
              transformOrigin: "32px 53px",
              animation: "sh-flicker 1.8s ease-in-out infinite",
            }
      }
    >
      <path
        d="M32,45 Q35.5,49 35.5,52.5 A3.5,3.5 0 1 1 28.5,52.5 Q28.5,49 32,45 Z"
        fill="#E7B65E"
        stroke="#FBF6EA"
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      <path
        d="M32,49.5 Q33.6,51.4 33.6,53 A1.6,1.6 0 1 1 30.4,53 Q30.4,51.4 32,49.5 Z"
        fill="#FBF6EA"
        opacity={0.85}
      />
    </g>
  );
}

function Card3Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="happy"
      size="md"
      gazeY={1.5}
      overlay={<FlameOverlay reduced={reduced} />}
    />
  );
}

// ─── Öffentliche Komponente ───────────────────────────────────────────

/**
 * Rendert den zum jeweiligen Intro-Karten-Index passenden animierten
 * Mascot für die Schattenseite (dunkle Wolke → Schatten-Begleiter →
 * Schloss → Flamme). Wird als renderMascot-Prop an <RecipeIntro> übergeben.
 */
export function ShadowIntroMascot({ index }: { index: number }) {
  const reduced = useReducedMotion();

  if (index === 0) return <Card0Mascot reduced={reduced} />;
  if (index === 1) return <Card1Mascot reduced={reduced} />;
  if (index === 2) return <Card2Mascot />;
  return <Card3Mascot reduced={reduced} />;
}
