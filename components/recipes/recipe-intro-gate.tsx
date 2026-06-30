"use client";

import { useState } from "react";

import { markRecipeIntroSeenAction } from "@/app/(app)/recipes/actions";
import { RecipeIntro } from "@/components/recipes/recipe-intro";
import { RecipeIntroCollapsible } from "@/components/recipes/recipe-intro-collapsible";
import type { IntroCard } from "@/lib/utils/recipe-intros";

type RecipeIntroGateProps = {
  slug: string;
  cards: IntroCard[] | null;
  introSeen: boolean;
  children: React.ReactNode;
  /** Wird aufgerufen, sobald die Intro-Sequenz durchgeklickt/übersprungen wurde
   *  (optimistisch, vor der Persistenz). Erlaubt dem Aufrufer, weitere UI sofort
   *  freizugeben, die sonst an der server-gelieferten `introSeen`-Prop hinge. */
  onSeen?: () => void;
};

/**
 * Hybrid-Intro-Gate für Server-gerenderte Rezept-Hubs (z.B. /recipes/values):
 * - Beim ersten Mal (intro_seen == false) wird die durchklickbare Sequenz als
 *   erste Ansicht gezeigt; onComplete/onSkip markiert sie als gesehen und gibt
 *   den Hub frei.
 * - Danach steht oben der eingeklappte "Worum geht's?"-Collapsible über dem Hub.
 *
 * Ohne Karten (anderer Slug der [slug]-Route) wird einfach children gerendert.
 */
export function RecipeIntroGate({
  slug,
  cards,
  introSeen,
  children,
  onSeen,
}: RecipeIntroGateProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!cards || cards.length === 0) {
    return <>{children}</>;
  }

  const handleSeen = () => {
    setDismissed(true);
    onSeen?.();
    // Persistiert geräteübergreifend; UI reagiert bereits optimistisch.
    void markRecipeIntroSeenAction(slug);
  };

  if (!introSeen && !dismissed) {
    return (
      <div className="flex min-h-svh flex-col justify-center">
        <RecipeIntro cards={cards} onComplete={handleSeen} onSkip={handleSeen} />
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-6">
        <div className="max-w-prose">
          <RecipeIntroCollapsible cards={cards} />
        </div>
      </div>
      {children}
    </>
  );
}
