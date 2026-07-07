"use client";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { Mascot } from "@/components/brand/mascot";

// Die Overlays liegen im selben 0 0 64 64-Koordinatenraum wie das Mascot-Gesicht:
// Augen bei (22,27) & (42,27) mit Sklera-Radius 7, Mund um (32,42).
// Leitmotiv: das reflexhaft rausgerutschte „Ja" (Karte 0) → der goldene
// Hell-yes-Stern als Maßstab (Karte 1) → das Schild, das sich Schicht für
// Schicht aufbaut (Karte 2) → das fertige Schild mit Häkchen (Karte 3).

// ─── Karte 0: „Kennst du das?" — das „Ja", das schon draußen ist ─────
// Sorgenvolles Gesicht, der Blob schwankt unruhig (tgm-sway, generische
// Rotation). Neben dem Mund ploppt immer wieder eine kleine Sprechblase auf —
// das Ja war schneller als das Nachdenken. Reduced: Blase statisch.

function BlurtOverlay({ reduced }: { reduced: boolean }) {
  return (
    <g
      style={
        reduced
          ? { transformBox: "view-box", transformOrigin: "46px 44px", opacity: 0.9 }
          : {
              transformBox: "view-box",
              transformOrigin: "46px 44px",
              animation: "sn-blurt 3s ease-out infinite",
            }
      }
    >
      {/* Sprechblase rechts neben dem Mund */}
      <ellipse
        cx={48}
        cy={42.5}
        rx={5.5}
        ry={4}
        fill="#FBF6EA"
        stroke="var(--primary-foreground)"
        strokeWidth={0.7}
      />
      <path
        d="M43.5,44.5 L41,46.5 L44.5,45.8 Z"
        fill="#FBF6EA"
        stroke="var(--primary-foreground)"
        strokeWidth={0.5}
        strokeLinejoin="round"
      />
      {/* „Ja!" als Striche angedeutet — kein Text-Rendering nötig */}
      <path
        d="M46.5,41 v2.4 q0,1 -1,1"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth={0.9}
        strokeLinecap="round"
      />
      <path
        d="M49,44.4 q0.2,-3 1.6,-3.4 q1.4,0.4 1.6,3.4 M49.4,43.2 h2.4"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth={0.9}
        strokeLinecap="round"
        strokeLinejoin="round"
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
        gazeX={2}
        overlay={<BlurtOverlay reduced={reduced} />}
      />
    </div>
  );
}

// ─── Karte 1: „Hell yes!" — der goldene Maßstab ──────────────────────
// Nachdenkliches Gesicht, Blick nach oben zu einem goldenen Stern, der sanft
// anschwillt: Nur was so strahlt, verdient ein Ja. Reduced: Stern statisch.

function HellYesStarOverlay({ reduced }: { reduced: boolean }) {
  return (
    <g
      style={
        reduced
          ? { transformBox: "view-box", transformOrigin: "32px 9px" }
          : {
              transformBox: "view-box",
              transformOrigin: "32px 9px",
              animation: "sn-star-swell 2.4s ease-in-out infinite",
            }
      }
    >
      <path
        d="M32,4 L33.6,7.4 L37.4,7.9 L34.7,10.5 L35.3,14.2 L32,12.4 L28.7,14.2 L29.3,10.5 L26.6,7.9 L30.4,7.4 Z"
        fill="#E7B65E"
        stroke="#FBF6EA"
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      {/* Kleine Funken links und rechts */}
      <path d="M24,10 l1.4,0 M24.7,9.3 l0,1.4" stroke="#E7B65E" strokeWidth={0.7} strokeLinecap="round" />
      <path d="M38.6,10 l1.4,0 M39.3,9.3 l0,1.4" stroke="#E7B65E" strokeWidth={0.7} strokeLinecap="round" />
    </g>
  );
}

function Card1Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="thinking"
      size="md"
      gazeX={0}
      gazeY={-2.5}
      overlay={<HellYesStarOverlay reduced={reduced} />}
    />
  );
}

// ─── Karte 2: „Die vier Schichten" — das Schild baut sich auf ────────
// Neugieriges Gesicht, Blick nach unten auf ein Schild im Bauch, dessen vier
// Schichten nacheinander einblenden (animation-delay-Staffelung).
// Reduced: alle Schichten statisch sichtbar.

const SHIELD_CX = 32;
const SHIELD_TOP = 45;

function LayerShieldOverlay({ reduced }: { reduced: boolean }) {
  const layerYs = [48.2, 51, 53.8, 56.6];
  const layerWidths = [9, 8.2, 6.6, 4.2];

  return (
    <>
      {/* Schild-Kontur */}
      <path
        d={`M${SHIELD_CX - 5.5},${SHIELD_TOP} h11 v7.5 q0,4.5 -5.5,7 q-5.5,-2.5 -5.5,-7 Z`}
        fill="rgba(251,246,234,0.55)"
        stroke="var(--primary-foreground)"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {/* Vier Schichten von oben nach unten */}
      {layerYs.map((y, i) => (
        <line
          key={y}
          x1={SHIELD_CX - layerWidths[i] / 2}
          y1={y}
          x2={SHIELD_CX + layerWidths[i] / 2}
          y2={y}
          stroke={i === 3 ? "#E7B65E" : "var(--primary-foreground)"}
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={reduced ? 0.75 : undefined}
          style={
            reduced
              ? undefined
              : {
                  opacity: 0,
                  animation: `sn-layer-in 4s ease-out ${0.4 + i * 0.55}s infinite`,
                }
          }
        />
      ))}
    </>
  );
}

function Card2Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="curious"
      size="md"
      gazeX={0}
      gazeY={2.8}
      overlay={<LayerShieldOverlay reduced={reduced} />}
    />
  );
}

// ─── Karte 3: „Was dich erwartet" — das fertige Schild ───────────────
// Lächelndes Gesicht; im Bauch das komplette Schild mit goldenem Häkchen:
// das gute Nein ist bereit. Statisch, ruhiger Abschluss.

function ReadyShieldOverlay() {
  return (
    <g>
      <path
        d={`M${SHIELD_CX - 5.5},${SHIELD_TOP} h11 v7.5 q0,4.5 -5.5,7 q-5.5,-2.5 -5.5,-7 Z`}
        fill="#FBF6EA"
        stroke="var(--primary-foreground)"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <path
        d="M28.5,51.5 L31,54 L35.8,48.8"
        fill="none"
        stroke="#E7B65E"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

function Card3Mascot() {
  return (
    <Mascot expression="smile" size="md" gazeY={1} overlay={<ReadyShieldOverlay />} />
  );
}

// ─── Öffentliche Komponente ───────────────────────────────────────────

/**
 * Rendert den zum jeweiligen Intro-Karten-Index passenden animierten
 * Mascot für den Nein-Trainer (rausgerutschtes „Ja" → Hell-yes-Stern →
 * Schichten-Schild → fertiges Schild).
 * Wird als renderMascot-Prop an <RecipeIntro> übergeben.
 */
export function SayingNoIntroMascot({ index }: { index: number }) {
  const reduced = useReducedMotion();

  if (index === 0) return <Card0Mascot reduced={reduced} />;
  if (index === 1) return <Card1Mascot reduced={reduced} />;
  if (index === 2) return <Card2Mascot reduced={reduced} />;
  return <Card3Mascot />;
}
