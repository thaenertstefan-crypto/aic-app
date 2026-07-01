"use client";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { Mascot } from "@/components/brand/mascot";

// Die Overlays liegen im selben 0 0 64 64-Koordinatenraum wie das Mascot-Gesicht:
// Augen bei (22,27) & (42,27) mit Sklera-Radius 7, Mund um (32,42).
// Leitmotiv über alle 3 Karten:
//   geschlucktes Wort → durchgestrichene Regel → entrollte Urkunde.
// Das „Nein" (Karte 0) wird zur durchgestrichenen Regel (Karte 1) und
// schließlich zu einer frischen Recht-Zeile auf der Urkunde (Karte 2).

// ─── Karte 0: „Da war doch was." ─────────────────────────────────────
// Sorgenvolles Gesicht + eine kleine Sprechblase „Nein" nahe dem Mund:
// sie taucht auf, hebt sich kurz und wird dann nach unten gezogen und
// verblasst (= geschluckt, Loop). Ein blasses Zahnrad deutet den
// Autopiloten an. Reduced: halb-verblasste Blase, statisch.

function SwallowOverlay({ reduced }: { reduced: boolean }) {
  return (
    <>
      {/* Blasses Autopilot-Zahnrad (unten links im Blob) */}
      <g
        style={
          reduced
            ? { transformBox: "view-box", transformOrigin: "13px 34px" }
            : {
                transformBox: "view-box",
                transformOrigin: "13px 34px",
                animation: "spin-cw 9s linear infinite",
              }
        }
      >
        <circle cx={13} cy={34} r={3} fill="none" stroke="var(--primary-foreground)" strokeWidth={1.5} strokeDasharray="1.1 1.5" opacity={0.16} />
        <circle cx={13} cy={34} r={1} fill="none" stroke="var(--primary-foreground)" strokeWidth={0.6} opacity={0.16} />
      </g>

      {/* Sprechblase „Nein" – hebt sich, wird geschluckt, verblasst */}
      <g
        style={
          reduced
            ? { transformBox: "view-box", transform: "translateY(4px)", opacity: 0.4 }
            : {
                transformBox: "view-box",
                animation: "bor-swallow 2.8s ease-in-out infinite",
              }
        }
      >
        <path d="M30,41.5 L32,45 L34,41.5 Z" fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.6} />
        <rect x={25} y={35} width={14} height={7} rx={3.5} fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.6} />
        <text x={32} y={40.2} textAnchor="middle" fontSize={4} fontWeight={700} fill="var(--primary-foreground)">
          Nein
        </text>
      </g>
    </>
  );
}

function Card0Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="sorrowMild"
      size="md"
      overlay={<SwallowOverlay reduced={reduced} />}
    />
  );
}

// ─── Karte 1: „Deine inneren Regeln." — Heuristiken ──────────────────
// Ein Regel-Täfelchen im Stirnbereich mit ein paar Strich-Zeilen; die
// harte Regel bekommt einen Durchstreich-Strich, der quer drübergezeichnet
// wird (stroke-dashoffset-Reveal). = „Regeln kann man umschreiben."
// Reduced: bereits durchgestrichene Regel, statisch.

function RuleTabletOverlay({ reduced }: { reduced: boolean }) {
  return (
    <>
      {/* Täfelchen (im Fenster-Bereich, überdeckt die Augen nicht) */}
      <rect x={21} y={5} width={22} height={13} rx={2.5} fill="rgba(251,246,234,0.92)" stroke="var(--primary-foreground)" strokeWidth={0.7} />

      {/* Regel-Zeilen (Strich-Text) */}
      <line x1={24} y1={9} x2={40} y2={9} stroke="var(--primary-foreground)" strokeWidth={1} strokeLinecap="round" opacity={0.55} />
      <line x1={24} y1={12} x2={40} y2={12} stroke="var(--primary-foreground)" strokeWidth={1} strokeLinecap="round" opacity={0.55} />
      <line x1={24} y1={15} x2={36} y2={15} stroke="var(--primary-foreground)" strokeWidth={1} strokeLinecap="round" opacity={0.55} />

      {/* Durchstreich-Strich über der mittleren (harten) Regel */}
      <line
        x1={23}
        y1={11.6}
        x2={41}
        y2={12.4}
        stroke="var(--destructive)"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeDasharray={22}
        style={
          reduced
            ? { strokeDashoffset: 0, opacity: 1 }
            : { animation: "bor-strike 2.6s ease-in-out infinite" }
        }
      />
    </>
  );
}

function Card1Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="curious"
      size="md"
      gazeY={-1.5}
      overlay={<RuleTabletOverlay reduced={reduced} />}
    />
  );
}

// ─── Karte 2: „Was dich erwartet" — dein Bill of Rights ──────────────
// Eine kleine Urkunde entrollt sich (scaleY-Reveal): Kopfzeile + zwei
// „Ich habe das Recht…"-Strich-Zeilen + ein Siegel/Stern. Kurzer Sparkle.
// = Empowerment als Abschluss. Reduced: Urkunde voll entrollt, statisch.

function CertificateOverlay({ reduced }: { reduced: boolean }) {
  return (
    <>
      {/* Urkunde – rollt sich von oben auf */}
      <g
        style={
          reduced
            ? { transformBox: "view-box", transformOrigin: "32px 4px", opacity: 1 }
            : {
                transformBox: "view-box",
                transformOrigin: "32px 4px",
                animation: "bor-unfurl 5s ease-in-out infinite",
              }
        }
      >
        <rect x={22} y={4} width={20} height={15} rx={1.5} fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.7} />
        {/* Kopfzeile */}
        <rect x={25} y={6.5} width={14} height={2} rx={1} fill="var(--primary-foreground)" opacity={0.85} />
        {/* „Ich habe das Recht…"-Strich-Zeilen */}
        <line x1={25} y1={11} x2={39} y2={11} stroke="var(--primary-foreground)" strokeWidth={0.9} strokeLinecap="round" opacity={0.5} />
        <line x1={25} y1={13.5} x2={36} y2={13.5} stroke="var(--primary-foreground)" strokeWidth={0.9} strokeLinecap="round" opacity={0.5} />
        {/* Siegel/Stern */}
        <path d="M35.5,15 L36.2,16.7 L38,16.9 L36.7,18.1 L37,19.8 L35.5,18.9 L34,19.8 L34.3,18.1 L33,16.9 L34.8,16.7 Z" fill="#E7B65E" stroke="var(--primary-foreground)" strokeWidth={0.3} />
      </g>

      {/* Sparkle beim Entrollen */}
      <path
        d="M40,5 L40.7,6.8 L42.5,7.5 L40.7,8.2 L40,10 L39.3,8.2 L37.5,7.5 L39.3,6.8 Z"
        fill="var(--celebrate)"
        style={
          reduced
            ? { transformBox: "view-box", transformOrigin: "40px 7.5px", opacity: 0.8 }
            : {
                transformBox: "view-box",
                transformOrigin: "40px 7.5px",
                opacity: 0,
                animation: "bor-sparkle 5s ease-out infinite",
              }
        }
      />
    </>
  );
}

function Card2Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="happy"
      size="md"
      overlay={<CertificateOverlay reduced={reduced} />}
    />
  );
}

// ─── Öffentliche Komponente ───────────────────────────────────────────

/**
 * Rendert den zum jeweiligen Intro-Karten-Index passenden animierten
 * Mascot für das Bill-of-Rights-Rezept (geschlucktes Wort → durchgestrichene
 * Regel → entrollte Urkunde). Wird als renderMascot-Prop an <RecipeIntro>
 * übergeben.
 */
export function BillOfRightsIntroMascot({ index }: { index: number }) {
  const reduced = useReducedMotion();

  if (index === 0) return <Card0Mascot reduced={reduced} />;
  if (index === 1) return <Card1Mascot reduced={reduced} />;
  return <Card2Mascot reduced={reduced} />;
}
