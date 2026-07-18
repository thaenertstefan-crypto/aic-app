"use client";

import { createContext, useContext, useState } from "react";

type MoodScoreContextValue = {
  score: number | null;
  setScore: (score: number) => void;
};

const MoodScoreContext = createContext<MoodScoreContextValue | null>(null);

/**
 * Teilt den optimistisch getippten Mood-Score zwischen Check-in/Fokus und dem
 * Himmel (DashboardSky). Nötig, weil der fixe SkyBackdrop außerhalb des
 * DashboardReveal leben muss (transform-Ancestor bricht position: fixed),
 * der Score aber im Reveal getippt wird.
 */
export function MoodScoreProvider({
  initialScore,
  children,
}: {
  initialScore: number | null;
  children: React.ReactNode;
}) {
  const [score, setScore] = useState<number | null>(initialScore);
  return (
    <MoodScoreContext.Provider value={{ score, setScore }}>
      {children}
    </MoodScoreContext.Provider>
  );
}

export function useMoodScore(): MoodScoreContextValue {
  const ctx = useContext(MoodScoreContext);
  if (!ctx) throw new Error("useMoodScore braucht einen MoodScoreProvider.");
  return ctx;
}
