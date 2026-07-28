"use client";

import { useId } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { Mascot } from "@/components/brand/mascot";

// Archimedische Spirale (~1,5 Windungen) um (0,0), als Pfad relativ zum
// Augenzentrum — wird über cx/cy an die jeweilige Augenposition verschoben.
function spiralPath(cx: number, cy: number): string {
  const a = 0.64;
  const turns = 3 * Math.PI; // 1,5 Umdrehungen
  const steps = 24;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (turns * i) / steps;
    const r = a * t;
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)} `;
  }
  return d.trim();
}

// Die Overlays liegen im selben 0 0 64 64-Koordinatenraum wie das Mascot-Gesicht:
// Augen bei (22,27) & (42,27) mit Sklera-Radius 7, Mund um (32,42).

// ─── Karte 0: Spiralaugen + offener Mund ─────────────────────────────
// Derselbe Glas-Blob-Mascot, nur mit hypnotischen Spiralaugen (links spin-cw,
// rechts spin-ccw – desync) und offenem „O"-Mund. Der ganze Blob taumelt sanft
// (ot-sway). Reduced-motion: statische Spirale, kein Taumeln.

function SpiralFace({ reduced }: { reduced: boolean }) {
  return (
    <>
      {/* Sklera (das Standardgesicht ist via hideFace ausgeblendet) */}
      <circle cx={22} cy={27} r={7} fill="#FBF6EA" />
      <circle cx={42} cy={27} r={7} fill="#FBF6EA" />

      {/* Linkes Auge: Spirale im Uhrzeigersinn, Drehung um exaktes Augenzentrum */}
      <g
        style={
          reduced
            ? undefined
            : {
                transformBox: "view-box",
                transformOrigin: "22px 27px",
                animation: "spin-cw 2s linear infinite",
              }
        }
      >
        <path d={spiralPath(22, 27)} fill="none" stroke="var(--primary-foreground)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={22} cy={27} r={1.3} fill="var(--primary-foreground)" />
      </g>

      {/* Rechtes Auge: Spirale gegen den Uhrzeigersinn */}
      <g
        style={
          reduced
            ? undefined
            : {
                transformBox: "view-box",
                transformOrigin: "42px 27px",
                animation: "spin-ccw 2.5s linear infinite",
              }
        }
      >
        <path d={spiralPath(42, 27)} fill="none" stroke="var(--primary-foreground)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={42} cy={27} r={1.3} fill="var(--primary-foreground)" />
      </g>

      {/* Offener „O"-Mund */}
      <ellipse cx={32} cy={43} rx={2.4} ry={3.2} fill="none" stroke="var(--primary-foreground)" strokeWidth={2} />
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
              animation: "ot-sway 2.8s ease-in-out infinite",
            }
      }
    >
      <Mascot
        expression="smile"
        size="md"
        hideFace
        overlay={<SpiralFace reduced={reduced} />}
      />
    </div>
  );
}

// ─── Karte 1: Schwarzmalen – Fenster im Kopf ─────────────────────────
// Derselbe Mascot mit seinem normalen, besorgten Gesicht (sorrowMild) und einem
// kleinen Fenster im Stirnbereich: der Unterbewusstseins-Schatten malt ein
// „Horrorszenario" auf eine Mini-Leinwand. Reduced-motion: statische Szene.

function MindWindow({ reduced }: { reduced: boolean }) {
  const uid = useId();
  const softId = `ot-mind-soft-${uid}`;

  return (
    <>
      {/* Weiche Kanten: Blur-Filter nur auf den Fenster-Rahmen */}
      <defs>
        <filter id={softId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      {/* Fenster ins Unterbewusstsein (über den Augen) — gefederte Kanten */}
      <g filter={`url(#${softId})`}>
        <rect x={20} y={5} width={24} height={14} rx={3} fill="#140B2E" />
        <rect
          x={20} y={5} width={24} height={14} rx={3}
          fill="none" stroke="#E7B65E" strokeWidth={0.7} strokeDasharray="3 2" opacity={0.35}
        />
      </g>

      {/* Leinwand */}
      <rect x={36} y={8} width={6} height={8} rx={0.5} fill="#FBF6EA" stroke="#C4B5A5" strokeWidth={0.4} />

      {/* Horror-Scribbles (stroke-dashoffset-Animation) */}
      <path
        d="M37,10.5 Q38.5,9 40,10.5 Q41.5,12 41,13"
        fill="none" stroke="var(--destructive)" strokeWidth={0.8} strokeDasharray="26"
        style={reduced ? undefined : { animation: "scribble-a 2.2s ease-in-out infinite" }}
      />
      <path
        d="M37,13.8 Q39,12.4 41,13.8"
        fill="none" stroke="var(--destructive)" strokeWidth={0.8} strokeDasharray="18"
        style={reduced ? undefined : { animation: "scribble-b 2.2s ease-in-out 0.55s infinite" }}
      />

      {/* Kleiner Maler (Schatten-Self), bobbt auf/ab */}
      <g
        style={
          reduced
            ? undefined
            : {
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: "painter-bob 2s ease-in-out infinite",
              }
        }
      >
        <ellipse cx={27} cy={13} rx={3} ry={2.8} fill="#4A2B8A" />
        <circle cx={25.9} cy={12.4} r={0.6} fill="#FBF6EA" />
        <circle cx={28.1} cy={12.4} r={0.6} fill="#FBF6EA" />
        <path d="M25.8,14.2 Q27,15 28.2,14.2" fill="none" stroke="#FBF6EA" strokeWidth={0.5} strokeLinecap="round" />

        {/* Pinselarm: Pivot am Schultergelenk (29,13.5) */}
        <g
          style={
            reduced
              ? undefined
              : {
                  transformBox: "fill-box",
                  transformOrigin: "0% 100%",
                  animation: "paint-arm 1.1s ease-in-out infinite",
                }
          }
        >
          <line x1={29} y1={13.5} x2={34} y2={11.5} stroke="#4A2B8A" strokeWidth={1.3} strokeLinecap="round" />
          <line x1={34} y1={11.5} x2={35.6} y2={10.4} stroke="#6B4C1A" strokeWidth={0.9} strokeLinecap="round" />
          <circle cx={36} cy={10.1} r={1} fill="var(--celebrate)" />
        </g>
      </g>
    </>
  );
}

function Card1Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="sorrowMild"
      size="md"
      gazeY={-1.5}
      overlay={<MindWindow reduced={reduced} />}
    />
  );
}

// ─── Karte 2: Breathing ───────────────────────────────────────────────
// Nutzt die bestehende <Mascot>-Komponente mit breathing={true} —
// dieselbe Animation und denselben Timing wie im Overthinking-Wizard
// ab Schritt 6 (mascot-exhale-dip / mascot-face-rest / mascot-face-exhale).

function Card2Mascot() {
  return (
    <Mascot
      expression="smile"
      breathing={true}
      breathingDelay={-4}
      size="md"
      pulseSeconds={11.5}
    />
  );
}

// ─── Öffentliche Komponente ───────────────────────────────────────────

/**
 * Rendert den zum jeweiligen Intro-Karten-Index passenden animierten
 * Mascot für das Overthinking-Rezept.
 * Wird als renderMascot-Prop an <RecipeIntro> übergeben.
 */
export function OverthinkingIntroMascot({ index }: { index: number }) {
  const reduced = useReducedMotion();

  if (index === 0) return <Card0Mascot reduced={reduced} />;
  if (index === 1) return <Card1Mascot reduced={reduced} />;
  return <Card2Mascot />;
}
