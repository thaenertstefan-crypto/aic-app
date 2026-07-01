"use client";

import { useId } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { Mascot } from "@/components/brand/mascot";

// Leitmotiv über alle 3 Karten:
//   geschlucktes „Nein" → „ja" (Karte 0) → alte Regeln (Karte 1) → altes Regelwerk
//   wird durchgestrichen & neues geschrieben (Karte 2).
// Karte 0 nutzt das Mascot-Overlay (kleine Sprechblase im Blob). Karten 1 & 2
// rendern Schriftrollen als Geschwister VOR/UNTER dem Blob (nicht geclippt),
// damit sie über das Maskottchen hinausragen können und das Gesicht oben frei
// bleibt. Sequenz-Animationen laufen per SMIL (spielen einmal, frieren ein);
// bei prefers-reduced-motion wird kein <animate> gerendert und ein sinnvoller
// Endzustand statisch gezeigt.

// ─── Karte 0: „Da war doch was." ─────────────────────────────────────
// Sorgenvolles Gesicht + Sprechblase rechts vom Mund: „Nein" tippt Buchstabe für
// Buchstabe herein, wird kurz vor dem letzten „n" durchgestrichen, dann steht
// „ja" da. Reduced: durchgestrichenes „Nein", statisch (kein „ja").

function SpeechBubbleOverlay({ reduced }: { reduced: boolean }) {
  const uid = useId();
  const typeClip = `bor-type-${uid}`;

  return (
    <>
      {/* Schwänzchen zum Mund (unten-links) */}
      <path d="M40,45 L34,44 L41,41 Z" fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.6} />
      {/* Blase rechts vom Mund */}
      <rect x={35} y={34} width={18} height={12} rx={3.5} fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.7} />

      <defs>
        <clipPath id={typeClip}>
          <rect x={37} y={36} width={reduced ? 15 : 0} height={9}>
            {!reduced && (
              <animate
                attributeName="width"
                values="0;3.8;7.6;11.4;15"
                keyTimes="0;0.25;0.5;0.75;1"
                calcMode="discrete"
                dur="1.6s"
                begin="0.2s"
                fill="freeze"
              />
            )}
          </rect>
        </clipPath>
      </defs>

      {/* „Nein" (getippt) + Durchstreichung — blendet später aus */}
      <g>
        {!reduced && <animate attributeName="opacity" from="1" to="0" begin="2.3s" dur="0.4s" fill="freeze" />}
        <g clipPath={`url(#${typeClip})`}>
          <text x={37} y={42.5} fontSize={6} fontWeight={700} fill="var(--primary-foreground)">
            Nein
          </text>
        </g>
        <line
          x1={36.5}
          y1={40.5}
          x2={50}
          y2={40.5}
          stroke="var(--destructive)"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeDasharray={15}
          strokeDashoffset={reduced ? 0 : 15}
        >
          {!reduced && <animate attributeName="stroke-dashoffset" values="15;0" dur="0.45s" begin="1.5s" fill="freeze" />}
        </line>
      </g>

      {/* „ja" — erscheint zum Schluss */}
      <text x={44} y={42.5} textAnchor="middle" fontSize={6} fontWeight={700} fill="var(--primary-foreground)" opacity={0}>
        {!reduced && <animate attributeName="opacity" from="0" to="1" begin="2.5s" dur="0.4s" fill="freeze" />}
        ja
      </text>
    </>
  );
}

function Card0Mascot({ reduced }: { reduced: boolean }) {
  return (
    <Mascot
      expression="sorrowMild"
      size="md"
      overlay={<SpeechBubbleOverlay reduced={reduced} />}
    />
  );
}

// ─── Schriftrolle (geteiltes Design für Karte 1 & 2) ─────────────────
// Pergament mit gerollten Kanten oben/unten, jede Zeile beginnt mit „§".
// mode="none": statisch. mode="strike": Regeln werden durchgestrichen.
// mode="write": Regeln werden von oben nach unten „geschrieben" (clip-Reveal).

function Scroll({
  width,
  lines,
  mode,
  reduced,
}: {
  width: number;
  lines: number;
  mode: "none" | "strike" | "write";
  reduced: boolean;
}) {
  const uid = useId();
  const writeClip = `bor-scroll-write-${uid}`;
  const height = (width * 64) / 48;
  const ys = lines === 2 ? [24, 38] : [19, 29, 39];

  return (
    <svg width={width} height={height} viewBox="0 0 48 64" fill="none" aria-hidden="true">
      {mode === "write" && (
        <defs>
          <clipPath id={writeClip}>
            <rect x={0} y={9} width={48} height={reduced ? 48 : 0}>
              {!reduced && <animate attributeName="height" values="0;48" dur="2.4s" begin="0.15s" fill="freeze" />}
            </rect>
          </clipPath>
        </defs>
      )}

      {/* Pergament */}
      <rect x={7} y={11} width={34} height={42} rx={1.5} fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.9} />
      {/* Obere Rolle */}
      <rect x={3} y={6} width={42} height={8} rx={4} fill="#F0E6CC" stroke="var(--primary-foreground)" strokeWidth={0.9} />
      <line x1={7} y1={10} x2={41} y2={10} stroke="var(--primary-foreground)" strokeWidth={0.5} opacity={0.35} />
      {/* Untere Rolle */}
      <rect x={3} y={50} width={42} height={8} rx={4} fill="#F0E6CC" stroke="var(--primary-foreground)" strokeWidth={0.9} />
      <line x1={7} y1={54} x2={41} y2={54} stroke="var(--primary-foreground)" strokeWidth={0.5} opacity={0.35} />

      {/* Zeilen: „§" + Regel-Strich */}
      <g clipPath={mode === "write" ? `url(#${writeClip})` : undefined}>
        {ys.map((ly, i) => (
          <g key={i}>
            <text x={10} y={ly + 2.4} fontSize={7} fontWeight={700} fill="var(--primary-foreground)">
              §
            </text>
            <line x1={17} y1={ly} x2={40} y2={ly} stroke="var(--primary-foreground)" strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
          </g>
        ))}
      </g>

      {/* Durchstreichungen (nur strike-Modus) */}
      {mode === "strike" &&
        ys.map((ly, i) => (
          <line
            key={`strike-${i}`}
            x1={14}
            y1={ly}
            x2={40}
            y2={ly}
            stroke="var(--destructive)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeDasharray={28}
            strokeDashoffset={reduced ? 0 : 28}
          >
            {!reduced && <animate attributeName="stroke-dashoffset" values="28;0" dur="0.9s" begin={`${0.3 + i * 0.25}s`} fill="freeze" />}
          </line>
        ))}
    </svg>
  );
}

// ─── Karte 1: „Deine inneren Regeln." — eine Schriftrolle ────────────
// Gesicht wie Karte 0 (sorrowMild). Eine Schriftrolle ragt unter dem Blob
// hervor; jede Zeile mit „§". Statisch (keine Durchstreichung).

function Card1Mascot() {
  return (
    <div className="flex flex-col items-center">
      <Mascot expression="sorrowMild" size="md" />
      <div className="-mt-3">
        <Scroll width={62} lines={3} mode="none" reduced={false} />
      </div>
    </div>
  );
}

// ─── Karte 2: „Was dich erwartet" — zwei Schriftrollen ───────────────
// Lächelndes Gesicht. Zwei Rollen nebeneinander (ragen seitlich hinaus):
// links wird das alte Regelwerk durchgestrichen, rechts werden neue Regeln
// nach und nach geschrieben.

function Card2Mascot({ reduced }: { reduced: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <Mascot expression="smile" size="md" />
      <div className="-mt-3 flex items-start gap-1.5">
        <Scroll width={50} lines={2} mode="strike" reduced={reduced} />
        <Scroll width={50} lines={2} mode="write" reduced={reduced} />
      </div>
    </div>
  );
}

// ─── Öffentliche Komponente ───────────────────────────────────────────

/**
 * Rendert den zum jeweiligen Intro-Karten-Index passenden animierten
 * Mascot für das Bill-of-Rights-Rezept (Nein→ja → alte Regeln → altes Regelwerk
 * durchstreichen & neues schreiben). Wird als renderMascot-Prop an <RecipeIntro>
 * übergeben.
 */
export function BillOfRightsIntroMascot({ index }: { index: number }) {
  const reduced = useReducedMotion();

  if (index === 0) return <Card0Mascot reduced={reduced} />;
  if (index === 1) return <Card1Mascot />;
  return <Card2Mascot reduced={reduced} />;
}
