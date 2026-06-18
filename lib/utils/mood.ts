export type MoodFace = "sorrowStrong" | "sorrowMild" | "smile" | "happy" | "radiant";

export const MOOD_LABELS: Record<number, string> = {
  1: "Erschöpft",
  2: "Angespannt",
  3: "Im Gleichgewicht",
  4: "Stark",
  5: "Strahlend",
};

export const MOOD_FACES: Record<number, MoodFace> = {
  1: "sorrowStrong",
  2: "sorrowMild",
  3: "smile",
  4: "happy",
  5: "radiant",
};

export const MOOD_PULSE_SECONDS: Record<number, number> = {
  1: 4.4,
  2: 3.7,
  3: 3.0,
  4: 2.3,
  5: 1.7,
};

/** "low" = Score 1–2, sonst "normal". null (noch kein Check-in heute)
 *  zählt bewusst als "normal" — siehe mood-checkin.tsx für die Begründung. */
export function moodTier(score: number | null): "low" | "normal" {
  return score !== null && score <= 2 ? "low" : "normal";
}
