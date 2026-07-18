"use client";

import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";
import { useMoodScore } from "@/components/dashboard/mood-score-context";

/** Dashboard-Variante des Himmels: reagiert auf den live getippten
 *  Check-in-Score; ohne Check-in gilt „Ruhig" (Score 3) als Default. */
export function DashboardSky() {
  const { score } = useMoodScore();
  return <SkyBackdrop score={score ?? 3} />;
}
