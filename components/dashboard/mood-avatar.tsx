"use client";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import type { MoodFace } from "@/lib/utils/mood";

/**
 * A single soft "mood blob" avatar whose face and breathing tempo reflect the
 * selected mood. The blob's organic shape stays fixed — only the face (eyes,
 * lids, mouth, cheeks) and the breathing speed change.
 *
 * Respects `prefers-reduced-motion`: when active, the blob holds still.
 */

type FaceShape = {
  /** Lid height — how far the eyelids slide down over the eyes. */
  lid: number;
  /** Pupil horizontal/vertical offset (a downward, inward gaze reads as sad). */
  dx: number;
  dy: number;
  /** Mouth path + stroke weight. */
  mouthD: string;
  mouthWidth: number;
  /** Cheek blush opacity. */
  cheek: number;
};

const FACES: Record<MoodFace, FaceShape> = {
  sorrowStrong: { lid: 7, dx: 1.3, dy: 2, mouthD: "M22,38.5 Q32,35.5 42,38.5", mouthWidth: 3, cheek: 0 },
  sorrowMild: { lid: 3.5, dx: 0.6, dy: 1, mouthD: "M24,37.5 Q32,36.5 40,37.5", mouthWidth: 2.6, cheek: 0 },
  smile: { lid: 1, dx: 0, dy: 0, mouthD: "M23,37 Q32,42.5 41,37", mouthWidth: 3, cheek: 0 },
  happy: { lid: 0, dx: 0, dy: 0, mouthD: "M20,36 Q32,47 44,36", mouthWidth: 3.2, cheek: 0 },
  radiant: { lid: 0, dx: 0, dy: 0, mouthD: "M18,35 Q32,50 46,35", mouthWidth: 3.5, cheek: 0.4 },
};

const SCLERA = "#FBF6EA";

export function MoodAvatar({
  face,
  pulseSeconds,
}: {
  face: MoodFace;
  pulseSeconds: number;
}) {
  const reduced = useReducedMotion();
  const f = FACES[face];

  return (
    <div className="relative size-24">
      {/* Halo: a soft warm glow behind the blob. */}
      <div
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          inset: "-9px",
          background: "var(--primary)",
          opacity: 0.18,
          boxShadow: "0 0 24px 6px rgba(231,182,94,0.35)",
        }}
      />

      {/* Blob body: fixed organic shape, breathes via animation. */}
      <div
        className="absolute inset-0"
        style={{
          background: "var(--primary)",
          border: "2px solid var(--chart-2)",
          borderRadius: "58% 42% 55% 45% / 48% 52% 45% 55%",
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
          {/* Cheeks */}
          <ellipse cx={9} cy={33} rx={5} ry={3.5} fill="var(--celebrate)" opacity={f.cheek} />
          <ellipse cx={55} cy={33} rx={5} ry={3.5} fill="var(--celebrate)" opacity={f.cheek} />

          {/* Sclera */}
          <circle cx={20} cy={27} r={7} fill={SCLERA} />
          <circle cx={44} cy={27} r={7} fill={SCLERA} />

          {/* Pupils */}
          <circle cx={20 + f.dx} cy={27 + f.dy} r={3} fill="var(--primary-foreground)" />
          <circle cx={44 - f.dx} cy={27 + f.dy} r={3} fill="var(--primary-foreground)" />

          {/* Highlights (upper-left of each pupil) */}
          <circle cx={20 + f.dx - 1} cy={27 + f.dy - 1} r={1} fill="white" />
          <circle cx={44 - f.dx - 1} cy={27 + f.dy - 1} r={1} fill="white" />

          {/* Lids sliding down from the top */}
          <rect x={12} y={20} width={16} height={f.lid} fill="var(--primary)" />
          <rect x={36} y={20} width={16} height={f.lid} fill="var(--primary)" />

          {/* Mouth */}
          <path
            d={f.mouthD}
            stroke="var(--primary-foreground)"
            strokeWidth={f.mouthWidth}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
