export type MoodFace = "sorrowStrong" | "sorrowMild" | "smile" | "happy" | "radiant";

/** Wetterbericht-Skala: Stimmung als Kopfwetter. Wetter wird festgestellt,
 *  nie bewertet — die Labels beschreiben den Himmel, keinen Erfolg. */
export const MOOD_LABELS: Record<number, string> = {
  1: "Stürmisch",
  2: "Bewölkt",
  3: "Ruhig",
  4: "Klar",
  5: "Sternenklar",
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
