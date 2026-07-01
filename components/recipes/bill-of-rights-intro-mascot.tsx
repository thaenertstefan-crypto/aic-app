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
  const parchGrad = `bor-parch-${uid}`;
  const rollGrad = `bor-roll-${uid}`;
  const height = (width * 64) / 48;
  const ys = lines === 2 ? [26, 38] : [22, 30, 38];

  return (
    <svg width={width} height={height} viewBox="0 0 48 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={parchGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FDF8ED" />
          <stop offset="1" stopColor="#F1E5C9" />
        </linearGradient>
        <linearGradient id={rollGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2DCA4" />
          <stop offset="1" stopColor="#E3BE79" />
        </linearGradient>
        {mode === "write" && (
          <clipPath id={writeClip}>
            <rect x={0} y={16} width={48} height={reduced ? 34 : 0}>
              {!reduced && (
                <animate
                  attributeName="height"
                  values="0;0;34;34;0"
                  keyTimes="0;0.08;0.5;0.9;1"
                  dur="5s"
                  repeatCount="indefinite"
                />
              )}
            </rect>
          </clipPath>
        )}
      </defs>

      {/* Pergament-Körper (geschwungene, S-förmige Seiten) */}
      <path
        d="M12,14 C9,25 14,39 11,50 C20,52 28,52 37,50 C34,39 39,25 36,14 C28,12 20,12 12,14 Z"
        fill={`url(#${parchGrad})`}
        stroke="#CE9A4E"
        strokeWidth={1}
      />
      {/* Dezenter Highlight links, der der Schwung-Kante folgt */}
      <path d="M13,17 C11,27 15,39 12,48" fill="none" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" opacity={0.4} />

      {/* Zeilen: „§" + Regel-Strich */}
      <g clipPath={mode === "write" ? `url(#${writeClip})` : undefined}>
        {ys.map((ly, i) => (
          <g key={i}>
            <text x={12} y={ly + 2.4} fontSize={6.5} fontWeight={700} fill="var(--primary-foreground)">
              §
            </text>
            <line x1={17} y1={ly} x2={34} y2={ly} stroke="var(--primary-foreground)" strokeWidth={1.3} strokeLinecap="round" opacity={0.6} />
          </g>
        ))}
      </g>

      {/* Durchstreichung (nur strike-Modus): diagonale Linie über das Blatt */}
      {mode === "strike" && (
        <line
          x1={12}
          y1={18}
          x2={35}
          y2={46}
          stroke="var(--destructive)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={37}
          strokeDashoffset={reduced ? 0 : 37}
        >
          {!reduced && (
            <animate
              attributeName="stroke-dashoffset"
              values="37;37;0;0;37"
              keyTimes="0;0.1;0.45;0.9;1"
              dur="5s"
              repeatCount="indefinite"
            />
          )}
        </line>
      )}

      {/* Obere Rolle — schmales Band, dezenter Curl oben-rechts */}
      <rect x={11} y={10.5} width={26} height={3.6} rx={1.8} fill={`url(#${rollGrad})`} stroke="#CE9A4E" strokeWidth={0.8} />
      <circle cx={36} cy={12.3} r={3.4} fill={`url(#${rollGrad})`} stroke="#CE9A4E" strokeWidth={0.8} />
      <path d="M36,9.9 A2.4,2.4 0 1 1 34,11.2" fill="none" stroke="#B7823A" strokeWidth={0.7} strokeLinecap="round" opacity={0.7} />
      <circle cx={36} cy={12.3} r={0.9} fill="#FDF8ED" stroke="#CE9A4E" strokeWidth={0.4} />

      {/* Untere Rolle — nur schmales Band (Curl entfernt) */}
      <rect x={11} y={49.9} width={26} height={3.6} rx={1.8} fill={`url(#${rollGrad})`} stroke="#CE9A4E" strokeWidth={0.8} />
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
