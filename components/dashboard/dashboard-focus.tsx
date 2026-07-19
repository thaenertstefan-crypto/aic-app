"use client";

import { moodTier } from "@/lib/utils/mood";
import { MoodCheckin } from "@/app/(app)/dashboard/mood-checkin";
import {
  DailyFocus,
  type Destination,
  type PrimaryRecommendation,
} from "@/components/dashboard/daily-focus";
import { useMoodScore } from "@/components/dashboard/mood-score-context";

/** Low-Tier-Empfehlung — Ausstieg aus dem Gedankenkarussell statt "weitermachen". */
const OVERTHINKING_PRIMARY: PrimaryRecommendation = {
  key: "overthinking",
  title: "Raus aus dem Gedankenkarussell",
  subtitle: "Sortiere deine Gedanken und finde deinen nächsten Schritt",
  cta: "Los geht's",
  href: "/booster/overthinking",
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
  const { score, setScore } = useMoodScore();

  const tier = moodTier(score);
  const primary = tier === "low" ? OVERTHINKING_PRIMARY : normalPrimary;
  const showQuestion = score !== null && primary !== null;
  const alternatives = allDestinations.filter((d) => d.key !== primary?.key);

  return (
    <div className="space-y-14">
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
