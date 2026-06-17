"use client";

import { useEffect, useState } from "react";

import {
  getSeenCleanserIntros,
  markCleanserIntroSeenAction,
} from "@/app/(app)/cleansers/actions";
import { CleanserIntro } from "@/components/cleansers/cleanser-intro";
import { getCleanserIntro } from "@/lib/utils/cleanser-intros";

type CleanserIntroSectionProps = {
  slug: string;
};

/**
 * Bindet den "Worum geht's?"-Intro eines Cleansers ein und kapselt den
 * "schon gesehen?"-Status (DB, geräteübergreifend).
 *
 * - Erstbesuch (Slug noch nicht in cleanser_intro_seen): Intro aufgeklappt,
 *   und beim ersten Anzeigen wird der Slug als gesehen markiert.
 * - Danach: eingeklappt, jederzeit über den Header aufklappbar.
 *
 * Self-read: lädt den Status selbst per Server-Action, damit die Komponente
 * auch in Client-Component-Seiten (z.B. confidence) ohne Server-Boundary
 * funktioniert. Solange der Status unbekannt ist, wird nichts gerendert.
 */
export function CleanserIntroSection({ slug }: CleanserIntroSectionProps) {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    getSeenCleanserIntros().then((slugs) => {
      if (!active) return;
      const hasSeen = slugs.includes(slug);
      setSeen(hasSeen);
      if (!hasSeen) {
        // Erstes Anzeigen zählt als gesehen — optimistisch, UI reagiert sofort.
        void markCleanserIntroSeenAction(slug);
      }
    });

    return () => {
      active = false;
    };
  }, [slug]);

  if (seen === null) return null;

  const intro = getCleanserIntro(slug);
  if (!intro) return null;

  return <CleanserIntro intro={intro} defaultOpen={!seen} />;
}
