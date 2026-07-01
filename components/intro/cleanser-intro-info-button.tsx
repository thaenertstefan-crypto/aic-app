"use client";

import { useEffect, useState } from "react";

import {
  getSeenCleanserIntros,
  markCleanserIntroSeenAction,
} from "@/app/(app)/cleansers/actions";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { getCleanserIntro } from "@/lib/utils/cleanser-intros";

type CleanserIntroInfoButtonProps = {
  slug: string;
};

/**
 * Info-Icon für Cleanser (mantra/promises/confidence) inkl. "schon gesehen?"-
 * Status (DB, geräteübergreifend). Ersetzt die frühere CleanserIntroSection.
 *
 * - Erstbesuch (Slug noch nicht in cleanser_intro_seen): Overlay öffnet sich
 *   einmal automatisch und der Slug wird als gesehen markiert.
 * - Danach: nur noch per Tap aufs Icon.
 *
 * Self-read: lädt den Status selbst per Server-Action, damit die Komponente
 * auch in Client-Component-Seiten (z.B. confidence) ohne Server-Boundary
 * funktioniert. Solange der Status unbekannt ist, wird nichts gerendert.
 */
export function CleanserIntroInfoButton({ slug }: CleanserIntroInfoButtonProps) {
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

  return (
    <IntroInfoButton
      cards={[{ title: "", body: intro.body }]}
      title={intro.title}
      defaultOpen={!seen}
    />
  );
}
