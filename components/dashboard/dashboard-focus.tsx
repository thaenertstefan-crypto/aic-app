"use client";

import { moodTier } from "@/lib/utils/mood";
import { DASHBOARD_DESTINATIONS } from "@/lib/content/dashboard-destinations";
import { MoodCheckin } from "@/app/(app)/dashboard/mood-checkin";
import { DailyFocus } from "@/components/dashboard/daily-focus";
import { useMoodScore } from "@/components/dashboard/mood-score-context";
import type { Recommendation } from "@/lib/dashboard/next-bild";

/** Low-Tier-Empfehlung — Ausstieg aus dem Gedankenkarussell statt "weitermachen". */
const OVERTHINKING_PRIMARY: Recommendation = {
  key: "overthinking",
  title: "Raus aus dem Gedankenkarussell",
  subtitle: "Sortiere deine Gedanken und finde deinen nächsten Schritt",
  cta: { label: "Los geht's", href: "/booster/overthinking" },
};

type DashboardFocusProps = {
  initialScore: number | null;
  /** Das nächste Bild für "normale" Stimmung (server-berechnet, KAN-56). */
  normalPrimary: Recommendation;
};

/**
 * Verbindet Mood-Check-in und Tages-Fokus client-seitig: Die getippte Stimmung
 * steuert Empfehlung und Frage sofort, ohne auf den Server-Roundtrip zu warten.
 * Das Speichern passiert weiterhin per Server-Action im Hintergrund.
 */
export function DashboardFocus({
  initialScore,
  normalPrimary,
}: DashboardFocusProps) {
  const { score, setScore } = useMoodScore();

  const tier = moodTier(score);
  const primary = tier === "low" ? OVERTHINKING_PRIMARY : normalPrimary;
  // Die Frage steht nur über einem Angebot: "Sollen wir weitermachen?" über
  // einer Karte ohne CTA (dem Endzustands-Kompass) wäre eine Frage, die die
  // Seite selbst nicht beantwortet.
  const showQuestion = score !== null && primary.cta !== undefined;
  // Nichts steht doppelt auf der Seite: Wohin die Empfehlungskarte gerade
  // führt, fällt aus der Liste. Deshalb sind es sieben oder acht Sätze — je
  // nachdem, ob die Karte ein Ziel empfiehlt, das auch hier steht. Ein Layout,
  // das auf genau acht baut, wäre falsch.
  //
  // Gefiltert wird nur bei einem CTA: im Endzustand *nennt* die Karte den
  // Kompass, aber sie führt nicht dorthin. Ihn dann auch aus den Quicklinks zu
  // nehmen, machte ihn vom Dashboard aus unerreichbar — der Filter verhindert
  // Dopplung, nicht Zugang.
  const alternatives = DASHBOARD_DESTINATIONS.filter(
    (d) => !primary.cta || d.key !== primary.key,
  );

  return (
    <div className="space-y-13" data-e2e="dashboard-focus">
      <MoodCheckin initialScore={initialScore} onSelect={setScore} />
      <DailyFocus
        tier={tier}
        primary={primary}
        showQuestion={showQuestion}
        alternatives={alternatives}
      />
    </div>
  );
}
