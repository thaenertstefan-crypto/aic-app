"use client";

import { useState } from "react";

import { markRecipeIntroSeenAction } from "@/app/(app)/recipes/actions";
import { RecipeIntro } from "@/components/recipes/recipe-intro";
import { ValuesIntroMascot } from "@/components/recipes/values-intro-mascot";
import { BillOfRightsIntroMascot } from "@/components/recipes/bill-of-rights-intro-mascot";
import { ThingsGotMessyIntroMascot } from "@/components/recipes/things-got-messy-intro-mascot";
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
 * Erst-Intro-Gate für Server-gerenderte Rezept-Hubs (z.B. /recipes/values):
 * - Beim ersten Mal (intro_seen == false) wird die durchklickbare Sequenz als
 *   erste Ansicht gezeigt; onComplete/onSkip markiert sie als gesehen und gibt
 *   den Hub frei.
 * - Danach werden einfach die children gerendert; die Intro-Texte sind für
 *   Wiederkehrer über das Info-Icon im Header nachlesbar (IntroInfoButton).
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
    // Der Gate ist "use client" und kennt den Slug — deshalb dispatcht er das
    // per-Karten-Maskottchen selbst (die Server-Component-Aufrufer dürfen keine
    // Funktions-Prop übergeben).
    const renderMascot =
      slug === "values"
        ? (i: number) => <ValuesIntroMascot index={i} />
        : slug === "bill-of-rights"
          ? (i: number) => <BillOfRightsIntroMascot index={i} />
          : slug === "things-got-messy"
            ? (i: number) => <ThingsGotMessyIntroMascot index={i} />
            : undefined;

    return (
      <div className="flex min-h-svh flex-col justify-center">
        <RecipeIntro
          cards={cards}
          onComplete={handleSeen}
          onSkip={handleSeen}
          renderMascot={renderMascot}
        />
      </div>
    );
  }

  return <>{children}</>;
}
