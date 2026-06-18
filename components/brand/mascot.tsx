"use client";

import { useId } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import type { MoodFace } from "@/lib/utils/mood";

export type MascotExpression = MoodFace | "curious" | "thinking";
export type MascotSize = "sm" | "md" | "lg";

const BLOB_RADIUS = "58% 42% 55% 45% / 48% 52% 45% 55%";

type FaceShape = {
  dx: number;
  dy: number;
  mouthD: string;
  mouthWidth: number;
  mouthOpen?: boolean;
  eyesClosed?: boolean;
  cheek: number;
};

const FACES: Record<MascotExpression, FaceShape> = {
  sorrowStrong: { dx: 1.3, dy: 2, mouthD: "M22,38.5 Q32,35.5 42,38.5", mouthWidth: 3, cheek: 0 },
  sorrowMild: { dx: 0.6, dy: 1, mouthD: "M24,37.5 Q32,36.5 40,37.5", mouthWidth: 2.6, cheek: 0 },
  smile: { dx: 0, dy: 0, mouthD: "M23,37 Q32,42.5 41,37", mouthWidth: 3, cheek: 0 },
  happy: { dx: 0, dy: 0, mouthD: "M20,36 Q32,47 44,36", mouthWidth: 3.2, eyesClosed: true, cheek: 0.4 },
  radiant: { dx: 0, dy: 0, mouthD: "M18,35 Q32,50 46,35", mouthWidth: 3.5, mouthOpen: true, eyesClosed: true, cheek: 0.55 },
  // Neu — für Kontexte außerhalb des Mood-Checkins:
  curious: { dx: 0, dy: -0.5, mouthD: "M24,37 Q32,40 40,37", mouthWidth: 2.8, cheek: 0.15 },
  thinking: { dx: 1, dy: -2, mouthD: "M25,38 Q32,37.5 39,38", mouthWidth: 2.4, cheek: 0 },
};

const SCLERA = "#FBF6EA";
const EYE_X = 22;
const MOUTH_DY = 5;

const SIZE_CLASSES: Record<MascotSize, string> = {
  sm: "size-14",
  md: "size-24",
  lg: "size-32",
};

export function Mascot({
  expression,
  pulseSeconds = 3,
  size = "md",
  gazeX = -1.3,
  gazeY = 0,
  breathing = false,
  className,
}: {
  expression: MascotExpression;
  pulseSeconds?: number;
  size?: MascotSize;
  /** Horizontaler Pupillen-Offset. Negative Werte blicken nach links —
   *  z. B. wenn der Mascot von rechts ins Bild kommt und zur Mitte
   *  schaut. Default entspricht exakt dem bisherigen festen Wert. */
  gazeX?: number;
  /** Vertikaler Pupillen-Offset. Negative Werte blicken nach oben —
   *  z. B. wenn der Mascot von unten zur Karte hochschaut. */
  gazeY?: number;
  /** Ausatmen-Choreografie: blendet zwischen Ruhe-Gesicht und Ausatem-Gesicht
   *  (Augen zu + „O"-Mund) über und senkt dabei kurz den Kopf. Überschreibt das
   *  statische Gesicht der Expression. */
  breathing?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const uid = useId();
  const f = FACES[expression];

  return (
    <div
      className={`relative ${SIZE_CLASSES[size]} ${className ?? ""}`}
      style={
        breathing && !reduced
          ? {
              animationName: "mascot-exhale-dip",
              animationDuration: `${pulseSeconds}s`,
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
            }
          : undefined
      }
    >
      {/* Aura — 1:1 aus mood-avatar.tsx übernommen */}
      <div
        aria-hidden="true"
        className="absolute"
        style={{
          inset: "-12px",
          background: "var(--primary)",
          borderRadius: BLOB_RADIUS,
          opacity: 0.28,
          filter: "blur(14px)",
          ...(reduced
            ? {}
            : {
                animationName: "mood-glow",
                animationDuration: `${pulseSeconds}s`,
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
              }),
        }}
      />

      {/* Blob-Körper */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius: BLOB_RADIUS,
          background: "rgba(231,182,94,0.10)",
          border: "1px solid rgba(255,255,255,0.22)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: "0 0 20px 2px rgba(231,182,94,0.16)",
          transition: "all 400ms ease",
          ...(reduced
            ? {}
            : {
                animationName: "mood-breathe",
                animationDuration: `${pulseSeconds}s`,
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
              }),
        }}
      >
        <svg viewBox="0 0 64 64" aria-hidden="true" className="size-full">
          <defs>
            <radialGradient id={`cheekGlow-${uid}`}>
              <stop offset="0%" stopColor="var(--celebrate)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--celebrate)" stopOpacity={0} />
            </radialGradient>
          </defs>

          <ellipse cx={10} cy={34} rx={7} ry={6} fill={`url(#cheekGlow-${uid})`} opacity={f.cheek} />
          <ellipse cx={54} cy={34} rx={7} ry={6} fill={`url(#cheekGlow-${uid})`} opacity={f.cheek} />

          {breathing ? (
            <>
              {/* Ruhe-Gesicht: offene Augen + sanftes Lächeln (Einatmen-Phase). */}
              <g
                style={
                  reduced
                    ? undefined
                    : {
                        animationName: "mascot-face-rest",
                        animationDuration: `${pulseSeconds}s`,
                        animationTimingFunction: "ease-in-out",
                        animationIterationCount: "infinite",
                      }
                }
              >
                <circle cx={EYE_X} cy={27} r={7} fill={SCLERA} />
                <circle cx={64 - EYE_X} cy={27} r={7} fill={SCLERA} />
                <circle cx={EYE_X + gazeX} cy={27 + gazeY} r={4} fill="var(--primary-foreground)" />
                <circle cx={64 - EYE_X + gazeX} cy={27 + gazeY} r={4} fill="var(--primary-foreground)" />
                <circle cx={EYE_X + gazeX - 1.3} cy={27 + gazeY - 1.3} r={1.3} fill="white" />
                <circle cx={64 - EYE_X + gazeX - 1.3} cy={27 + gazeY - 1.3} r={1.3} fill="white" />
                <path d="M23,37 Q32,42.5 41,37" transform={`translate(0 ${MOUTH_DY})`} stroke="var(--primary-foreground)" strokeWidth={3} strokeLinecap="round" fill="none" />
              </g>

              {/* Ausatem-Gesicht: Augen entspannt zu + „O"-Mund. Bei reduced
                  motion entfällt es ganz (kein Wechsel). */}
              {!reduced && (
                <g
                  style={{
                    opacity: 0,
                    animationName: "mascot-face-exhale",
                    animationDuration: `${pulseSeconds}s`,
                    animationTimingFunction: "ease-in-out",
                    animationIterationCount: "infinite",
                  }}
                >
                  <path d={`M${EYE_X - 5},27.5 Q${EYE_X},30.5 ${EYE_X + 5},27.5`} stroke="var(--primary-foreground)" strokeWidth={2.4} strokeLinecap="round" fill="none" />
                  <path d={`M${64 - EYE_X - 5},27.5 Q${64 - EYE_X},30.5 ${64 - EYE_X + 5},27.5`} stroke="var(--primary-foreground)" strokeWidth={2.4} strokeLinecap="round" fill="none" />
                  <ellipse cx={32} cy={42} rx={2.8} ry={3.6} stroke="var(--primary-foreground)" strokeWidth={2} fill="none" />
                </g>
              )}
            </>
          ) : (
            <>
              {f.eyesClosed ? (
                <>
                  <path d={`M${EYE_X - 5.5},28 Q${EYE_X},24 ${EYE_X + 5.5},28`} stroke="var(--primary-foreground)" strokeWidth={2.6} strokeLinecap="round" fill="none" />
                  <path d={`M${64 - EYE_X - 5.5},28 Q${64 - EYE_X},24 ${64 - EYE_X + 5.5},28`} stroke="var(--primary-foreground)" strokeWidth={2.6} strokeLinecap="round" fill="none" />
                </>
              ) : (
                <>
                  <circle cx={EYE_X} cy={27} r={7} fill={SCLERA} />
                  <circle cx={64 - EYE_X} cy={27} r={7} fill={SCLERA} />
                  <circle cx={EYE_X + f.dx + gazeX} cy={27 + f.dy + gazeY} r={4} fill="var(--primary-foreground)" />
                  <circle cx={64 - EYE_X - f.dx + gazeX} cy={27 + f.dy + gazeY} r={4} fill="var(--primary-foreground)" />
                  <circle cx={EYE_X + f.dx + gazeX - 1.3} cy={27 + f.dy + gazeY - 1.3} r={1.3} fill="white" />
                  <circle cx={64 - EYE_X - f.dx + gazeX - 1.3} cy={27 + f.dy + gazeY - 1.3} r={1.3} fill="white" />
                </>
              )}

              {f.mouthOpen ? (
                <>
                  <defs>
                    <clipPath id={`moodMouthClip-${uid}`}>
                      <path d={f.mouthD} />
                    </clipPath>
                  </defs>
                  <g transform={`translate(0 ${MOUTH_DY})`}>
                    <path d={f.mouthD} fill="var(--primary-foreground)" stroke="var(--primary-foreground)" strokeWidth={2} strokeLinejoin="round" />
                    <ellipse cx={32} cy={41} rx={3.8} ry={2.2} fill="var(--celebrate)" opacity={0.85} clipPath={`url(#moodMouthClip-${uid})`} />
                  </g>
                </>
              ) : (
                <path d={f.mouthD} transform={`translate(0 ${MOUTH_DY})`} stroke="var(--primary-foreground)" strokeWidth={f.mouthWidth} strokeLinecap="round" fill="none" />
              )}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
