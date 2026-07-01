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
      {/* Sprechblasen-Pfeil oben-links, zeigt hoch zum Mund */}
      <path d="M30,45.5 L34,45.5 L28,41.5 Z" fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.6} />
      {/* Blase unter dem Mund */}
      <rect x={25} y={45} width={19} height={11} rx={3.5} fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.7} />

      <defs>
        <clipPath id={typeClip}>
          <rect x={27} y={46.5} width={reduced ? 15 : 0} height={9}>
            {!reduced && (
              <animate
                attributeName="width"
                values="0;0;3.8;7.6;11.4;15;15;0"
                keyTimes="0;0.03;0.09;0.16;0.24;0.30;0.9;1"
                calcMode="discrete"
                dur="6s"
                repeatCount="indefinite"
              />
            )}
          </rect>
        </clipPath>
      </defs>

      {/* „Nein" (getippt) + Durchstreichung — blendet zur Wortmitte aus */}
      <g opacity={1}>
        {!reduced && (
          <animate
            attributeName="opacity"
            values="1;1;0;0;1"
            keyTimes="0;0.42;0.48;0.98;1"
            dur="6s"
            repeatCount="indefinite"
          />
        )}
        <g clipPath={`url(#${typeClip})`}>
          <text x={27} y={52} fontSize={6} fontWeight={700} fill="var(--primary-foreground)">
            Nein
          </text>
        </g>
        <line
          x1={26.5}
          y1={50}
          x2={40}
          y2={50}
          stroke="var(--destructive)"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeDasharray={15}
          strokeDashoffset={reduced ? 0 : 15}
        >
          {!reduced && (
            <animate
              attributeName="stroke-dashoffset"
              values="15;15;0;0;15"
              keyTimes="0;0.26;0.34;0.98;1"
              dur="6s"
              repeatCount="indefinite"
            />
          )}
        </line>
      </g>

      {/* „ja" — erscheint zum Schluss */}
      <text x={34.5} y={52} textAnchor="middle" fontSize={6} fontWeight={700} fill="var(--primary-foreground)" opacity={0}>
        {!reduced && (
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes="0;0.46;0.52;0.94;1"
            dur="6s"
            repeatCount="indefinite"
          />
        )}
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

      {/* Durchstreichung (nur strike-Modus): eine diagonale Linie über die Rolle */}
      {mode === "strike" && (
        <line
          x1={8}
          y1={14}
          x2={40}
          y2={50}
          stroke="var(--destructive)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={49}
          strokeDashoffset={reduced ? 0 : 49}
        >
          {!reduced && <animate attributeName="stroke-dashoffset" values="49;0" dur="0.9s" begin="0.4s" fill="freeze" />}
        </line>
      )}
    </svg>
  );
}

// Kleiner goldener Pfeil (zeigt nach rechts) – für Karte 2 zwischen den Rollen.
function GoldArrow() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <line x1={2} y1={9} x2={13} y2={9} stroke="#E7B65E" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M11,4 L16,9 L11,14" fill="none" stroke="#E7B65E" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Karte 1: „Deine inneren Regeln." — eine Schriftrolle ────────────
// Gesicht wie Karte 0 (sorrowMild). Eine Schriftrolle ragt unter dem Blob
// hervor; jede Zeile mit „§". Statisch (keine Durchstreichung).

function Card1Mascot() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative z-10">
        <Scroll width={62} lines={3} mode="none" reduced={false} />
      </div>
      <Mascot expression="sorrowMild" size="md" className="-mt-8" />
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
      <div className="relative z-10 flex items-center gap-1">
        <Scroll width={50} lines={2} mode="strike" reduced={reduced} />
        <GoldArrow />
        <Scroll width={50} lines={2} mode="write" reduced={reduced} />
      </div>
      <Mascot expression="smile" size="md" className="-mt-8" />
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
