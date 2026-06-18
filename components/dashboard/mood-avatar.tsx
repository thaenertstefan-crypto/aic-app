"use client";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import type { MoodFace } from "@/lib/utils/mood";

/**
 * A single soft "mood blob" avatar whose face and breathing tempo reflect the
 * selected mood. The blob is a frosted, gold-tinted glass surface (matching the
 * app's `.glass-card` glassmorphism) in an organic blob shape, with a soft
 * golden aura behind it for a gentle glow — visually related to the ambient
 * backdrop blobs (see `ambient-blobs.tsx`). Its shape stays fixed; only the face
 * (eyes, pupil gaze, mouth, cheeks) and the breathing speed change.
 *
 * Respects `prefers-reduced-motion`: when active, the blob holds still.
 */

/** Organic blob outline, shared by aura + body so they stay in register. */
const BLOB_RADIUS = "58% 42% 55% 45% / 48% 52% 45% 55%";

type FaceShape = {
  /** Pupil horizontal/vertical offset (a downward, inward gaze reads as sad). */
  dx: number;
  dy: number;
  /** Mouth path + stroke weight (stroke weight only used for closed mouths). */
  mouthD: string;
  mouthWidth: number;
  /** When true, the mouth is rendered as a filled open laugh (with a tongue)
   *  instead of a thin stroke. */
  mouthOpen?: boolean;
  /** When true, the eyes are drawn as upward "laughing" arcs instead of
   *  sclera + pupils (used for the most joyful moods). */
  eyesClosed?: boolean;
  /** Cheek blush opacity. */
  cheek: number;
};

const FACES: Record<MoodFace, FaceShape> = {
  sorrowStrong: { dx: 1.3, dy: 2, mouthD: "M22,38.5 Q32,35.5 42,38.5", mouthWidth: 3, cheek: 0 },
  sorrowMild: { dx: 0.6, dy: 1, mouthD: "M24,37.5 Q32,36.5 40,37.5", mouthWidth: 2.6, cheek: 0 },
  smile: { dx: 0, dy: 0, mouthD: "M23,37 Q32,42.5 41,37", mouthWidth: 3, cheek: 0 },
  happy: { dx: 0, dy: 0, mouthD: "M20,36 Q32,47 44,36", mouthWidth: 3.2, eyesClosed: true, cheek: 0.4 },
  radiant: { dx: 0, dy: 0, mouthD: "M18,35 Q32,50 46,35", mouthWidth: 3.5, mouthOpen: true, eyesClosed: true, cheek: 0.55 },
};

const SCLERA = "#FBF6EA";

/** Sclera center x (left eye); the right eye mirrors at 64 - EYE_X. Tighter than
 *  the old 20/44 so the eyes don't read as too wide-set. */
const EYE_X = 22;
/** Shared horizontal pupil offset so the blob gazes slightly to the side instead
 *  of staring straight at the viewer. (Separate from per-face `dx`, which makes
 *  the pupils converge for "sad".) */
const GAZE_X = -1.3;
/** Vertical shift for the mouth — gives it more room below the eyes. */
const MOUTH_DY = 5;

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
      {/* Aura: a larger, blurred gold blob that gives the soft glow of the
          ambient backdrop blobs. Pulses gently on its own (opacity + scale). */}
      <div
        aria-hidden="true"
        className="absolute"
        style={{
          inset: "-12px",
          background: "var(--primary)",
          borderRadius: BLOB_RADIUS,
          opacity: 0.45,
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

      {/* Blob body: a frosted, gold-tinted glass surface (matches the app's
          .glass-card) in an organic blob shape; breathes via animation. */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius: BLOB_RADIUS,
          background: "rgba(231,182,94,0.20)",
          border: "1px solid rgba(255,255,255,0.22)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: "0 0 24px 4px rgba(231,182,94,0.30)",
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
        {/* Transparent face layer — the glass body shows through behind it. */}
        <svg viewBox="0 0 64 64" aria-hidden="true" className="size-full">
          <defs>
            {/* Soft rosé glow for the cheeks: full colour at the centre, fading
                to transparent — reads as a blush glow rather than a solid dot. */}
            <radialGradient id="cheekGlow">
              <stop offset="0%" stopColor="var(--celebrate)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--celebrate)" stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* Cheeks (rosé glow) */}
          <ellipse cx={10} cy={34} rx={7} ry={6} fill="url(#cheekGlow)" opacity={f.cheek} />
          <ellipse cx={54} cy={34} rx={7} ry={6} fill="url(#cheekGlow)" opacity={f.cheek} />

          {/* Eyes — upward "laughing" arcs when closed, otherwise sclera +
              pupils + highlights. */}
          {f.eyesClosed ? (
            <>
              <path
                d={`M${EYE_X - 5.5},28 Q${EYE_X},24 ${EYE_X + 5.5},28`}
                stroke="var(--primary-foreground)"
                strokeWidth={2.6}
                strokeLinecap="round"
                fill="none"
              />
              <path
                d={`M${64 - EYE_X - 5.5},28 Q${64 - EYE_X},24 ${64 - EYE_X + 5.5},28`}
                stroke="var(--primary-foreground)"
                strokeWidth={2.6}
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            <>
              {/* Sclera */}
              <circle cx={EYE_X} cy={27} r={7} fill={SCLERA} />
              <circle cx={64 - EYE_X} cy={27} r={7} fill={SCLERA} />

              {/* Pupils */}
              <circle cx={EYE_X + f.dx + GAZE_X} cy={27 + f.dy} r={4} fill="var(--primary-foreground)" />
              <circle cx={64 - EYE_X - f.dx + GAZE_X} cy={27 + f.dy} r={4} fill="var(--primary-foreground)" />

              {/* Highlights (upper-left of each pupil) */}
              <circle cx={EYE_X + f.dx + GAZE_X - 1.3} cy={27 + f.dy - 1.3} r={1.3} fill="white" />
              <circle cx={64 - EYE_X - f.dx + GAZE_X - 1.3} cy={27 + f.dy - 1.3} r={1.3} fill="white" />
            </>
          )}

          {/* Mouth — open laugh (filled + tongue) for happy moods, otherwise a
              thin closed stroke. */}
          {f.mouthOpen ? (
            <>
              <defs>
                <clipPath id="moodMouthClip">
                  <path d={f.mouthD} />
                </clipPath>
              </defs>
              <g transform={`translate(0 ${MOUTH_DY})`}>
                {/* Mouth opening (dark fill; rounded corners). */}
                <path
                  d={f.mouthD}
                  fill="var(--primary-foreground)"
                  stroke="var(--primary-foreground)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                {/* Tongue, clipped to the mouth so it can't spill out. Kept
                    small + slightly translucent so it stays subtle. */}
                <ellipse
                  cx={32}
                  cy={41}
                  rx={3.8}
                  ry={2.2}
                  fill="var(--celebrate)"
                  opacity={0.85}
                  clipPath="url(#moodMouthClip)"
                />
              </g>
            </>
          ) : (
            <path
              d={f.mouthD}
              transform={`translate(0 ${MOUTH_DY})`}
              stroke="var(--primary-foreground)"
              strokeWidth={f.mouthWidth}
              strokeLinecap="round"
              fill="none"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
