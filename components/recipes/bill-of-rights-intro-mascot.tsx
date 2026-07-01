"use client";

import { useId, type CSSProperties } from "react";

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
      <path d="M35,48.5 L39,48.5 L31,43.5 Z" fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.6} />
      {/* Blase unter/rechts vom Mund */}
      <rect x={29} y={48} width={19} height={11} rx={3.5} fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.7} />

      <defs>
        <clipPath id={typeClip}>
          <rect x={31} y={49.5} width={reduced ? 15 : 0} height={9}>
            {!reduced && (
              <animate
                attributeName="width"
                values="0;0;3.8;7.6;11.4;15;15;0;0"
                keyTimes="0;0.05;0.11;0.17;0.23;0.29;0.44;0.46;1"
                calcMode="discrete"
                dur="6s"
                repeatCount="indefinite"
              />
            )}
          </rect>
        </clipPath>
      </defs>

      {/* „Nein" (getippt) + Durchstreichung — blendet zur Wortmitte aus,
          endet auf opacity 0 (kein Full-Nein-Blitz am Loop-Seam) */}
      <g opacity={1}>
        {!reduced && (
          <animate
            attributeName="opacity"
            values="1;1;0;0"
            keyTimes="0;0.40;0.46;1"
            dur="6s"
            repeatCount="indefinite"
          />
        )}
        <g clipPath={`url(#${typeClip})`}>
          <text x={31} y={55} fontSize={6} fontWeight={700} fill="var(--primary-foreground)">
            Nein
          </text>
        </g>
        <line
          x1={30.5}
          y1={53}
          x2={44}
          y2={53}
          stroke="var(--destructive)"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeDasharray={15}
          strokeDashoffset={reduced ? 0 : 15}
        >
          {!reduced && (
            <animate
              attributeName="stroke-dashoffset"
              values="15;15;0;0;15;15"
              keyTimes="0;0.25;0.33;0.44;0.46;1"
              dur="6s"
              repeatCount="indefinite"
            />
          )}
        </line>
      </g>

      {/* „ja" — erscheint zum Schluss und verschwindet langsam vor dem Loop */}
      <text x={38.5} y={55} textAnchor="middle" fontSize={6} fontWeight={700} fill="var(--primary-foreground)" opacity={0}>
        {!reduced && (
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes="0;0.46;0.52;0.90;1"
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
  const ys = lines === 2 ? [25, 38] : [21, 30, 39];

  return (
    <svg width={width} height={height} viewBox="0 0 48 64" fill="none" aria-hidden="true">
      {mode === "write" && (
        <defs>
          <clipPath id={writeClip}>
            <rect x={0} y={13} width={48} height={reduced ? 40 : 0}>
              {!reduced && (
                <animate
                  attributeName="height"
                  values="0;0;40;40;0"
                  keyTimes="0;0.08;0.5;0.9;1"
                  dur="5s"
                  repeatCount="indefinite"
                />
              )}
            </rect>
          </clipPath>
        </defs>
      )}

      {/* Papierblatt */}
      <rect x={8} y={13} width={32} height={38} rx={1.5} fill="#FBF6EA" stroke="var(--primary-foreground)" strokeWidth={0.9} />
      {/* Leicht aufgerollte Lippe oben */}
      <path d="M8,13 Q24,9 40,13 Q24,16.5 8,13 Z" fill="#EFE4C8" stroke="var(--primary-foreground)" strokeWidth={0.7} />
      {/* Leicht aufgerollte Lippe unten */}
      <path d="M8,51 Q24,55 40,51 Q24,47.5 8,51 Z" fill="#EFE4C8" stroke="var(--primary-foreground)" strokeWidth={0.7} />

      {/* Zeilen: „§" + Regel-Strich */}
      <g clipPath={mode === "write" ? `url(#${writeClip})` : undefined}>
        {ys.map((ly, i) => (
          <g key={i}>
            <text x={10} y={ly + 2.4} fontSize={7} fontWeight={700} fill="var(--primary-foreground)">
              §
            </text>
            <line x1={16} y1={ly} x2={37} y2={ly} stroke="var(--primary-foreground)" strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
          </g>
        ))}
      </g>

      {/* Durchstreichung (nur strike-Modus): eine diagonale Linie über die Rolle */}
      {mode === "strike" && (
        <line
          x1={10}
          y1={15}
          x2={38}
          y2={49}
          stroke="var(--destructive)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={45}
          strokeDashoffset={reduced ? 0 : 45}
        >
          {!reduced && (
            <animate
              attributeName="stroke-dashoffset"
              values="45;45;0;0;45"
              keyTimes="0;0.1;0.45;0.9;1"
              dur="5s"
              repeatCount="indefinite"
            />
          )}
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

// Atmet synchron mit dem Blob (gleiche Keyframe/Dauer wie mood-breathe), unten
// am Kopf verankert. Bei reduced keine Bewegung.
function breathingStyle(reduced: boolean): CSSProperties | undefined {
  return reduced
    ? undefined
    : {
        transformOrigin: "center bottom",
        animation: "mood-breathe 3s ease-in-out infinite",
      };
}

function Card1Mascot({ reduced }: { reduced: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative z-10" style={breathingStyle(reduced)}>
        <Scroll width={62} lines={3} mode="none" reduced={reduced} />
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
      <div className="relative z-10 flex items-center gap-1" style={breathingStyle(reduced)}>
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
  if (index === 1) return <Card1Mascot reduced={reduced} />;
  return <Card2Mascot reduced={reduced} />;
}
