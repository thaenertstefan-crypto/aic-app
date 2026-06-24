"use client";

import { useState } from "react";

import { moodTier } from "@/lib/utils/mood";
import { MoodCheckin } from "@/app/(app)/dashboard/mood-checkin";
import {
  DailyFocus,
  type Destination,
  type PrimaryRecommendation,
} from "@/components/dashboard/daily-focus";

/** Low-Tier-Empfehlung — eine kurze Mantra-Pause statt "weitermachen". */
const MANTRA_PRIMARY: PrimaryRecommendation = {
  key: "mantra",
  title: "Ich bin nicht für jeden",
  subtitle: "30 Sekunden Mantra-Pause",
  cta: "Kurz durchatmen",
  href: "/booster/mantra",
};

type DashboardFocusProps = {
  initialScore: number | null;
  /** Recipe-basierte Empfehlung für "normale" Stimmung (server-berechnet). */
  normalPrimary: PrimaryRecommendation | null;
  /** Greift nur, wenn normalPrimary === null. */
  fallbackMessage: string;
  /** Volle Liste aller Anlaufstellen (ungefiltert). */
  allDestinations: Destination[];
};

/**
 * Verbindet Mood-Check-in und Tages-Fokus client-seitig: Die getippte Stimmung
 * steuert Empfehlung und Frage sofort, ohne auf den Server-Roundtrip zu warten.
 * Das Speichern passiert weiterhin per Server-Action im Hintergrund.
 */
export function DashboardFocus({
  initialScore,
  normalPrimary,
  fallbackMessage,
  allDestinations,
}: DashboardFocusProps) {
  const [score, setScore] = useState<number | null>(initialScore);

  const tier = moodTier(score);
  const primary = tier === "low" ? MANTRA_PRIMARY : normalPrimary;
  const showQuestion = score !== null && primary !== null;
  const alternatives = allDestinations.filter((d) => d.key !== primary?.key);

  return (
    <div className="space-y-6">
      <MoodCheckin initialScore={initialScore} onSelect={setScore} />
      <DailyFocus
        tier={tier}
        primary={primary}
        fallbackMessage={fallbackMessage}
        showQuestion={showQuestion}
        alternatives={alternatives}
      />
    </div>
  );
}
