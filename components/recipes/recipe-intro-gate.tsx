"use client";

import { useState } from "react";

import { markRecipeIntroSeenAction } from "@/lib/recipes/actions";
import { RecipeIntro } from "@/components/recipes/recipe-intro";
import { BillOfRightsIntroMascot } from "@/components/recipes/bill-of-rights-intro-mascot";
import { OverthinkingIntroMascot } from "@/components/recipes/overthinking-intro-mascot";
import { SayingNoIntroMascot } from "@/components/recipes/saying-no-intro-mascot";
import { ShadowIntroMascot } from "@/components/recipes/shadow-intro-mascot";
import { ThingsGotMessyIntroMascot } from "@/components/recipes/things-got-messy-intro-mascot";
import { ValuesIntroMascot } from "@/components/recipes/values-intro-mascot";
import { WantsIntroMascot } from "@/components/recipes/wants-intro-mascot";
import { RECIPE_INTROS, type RecipeIntroSlug } from "@/lib/utils/recipe-intros";

/**
 * Slug → Karten-Maskottchen.
 *
 * Dieses Modul ist "use client" und kennt den Slug — deshalb schlägt es das
 * Maskottchen hier selbst nach, statt es sich als Funktions-Prop reichen zu
 * lassen: Server-Component-Aufrufer wie /me/values dürfen keine Funktion
 * übergeben. Der Zwang ist echt, aber er verlangt eine Tabelle, keine
 * Ternär-Kette — `Record<RecipeIntroSlug, …>` heißt: wer in RECIPE_INTROS eine
 * Übung ergänzt und hier keine Zeile, bekommt einen Typfehler statt einer
 * still fehlenden Animation.
 */
const INTRO_MASCOTS: Record<RecipeIntroSlug, React.ComponentType<{ index: number }>> = {
  values: ValuesIntroMascot,
  wants: WantsIntroMascot,
  "bill-of-rights": BillOfRightsIntroMascot,
  overthinking: OverthinkingIntroMascot,
  "saying-no": SayingNoIntroMascot,
  shadow: ShadowIntroMascot,
  "things-got-messy": ThingsGotMessyIntroMascot,
};

/**
 * Die Intro-Sequenz als Bühne: füllt den Platz, den ihr der Aufrufer lässt,
 * und zentriert die Karte darin.
 */
function RecipeIntroStage({
  slug,
  onSeen,
}: {
  slug: RecipeIntroSlug;
  onSeen: () => void;
}) {
  const Mascot = INTRO_MASCOTS[slug];

  return (
    // data-e2e: der E2E-Lauf muss unterscheiden können, ob eine Route ihren
    // eigentlichen Inhalt zeigt oder (noch) die Erst-Intro-Sequenz — genau
    // daran ist am 29.07. ein grüner Lauf vorbeigelaufen. Siehe
    // scripts/e2e/verify.mjs. Ohne Laufzeit-Wirkung.
    <div className="flex flex-1 flex-col justify-center" data-e2e="recipe-intro">
      <RecipeIntro
        cards={RECIPE_INTROS[slug]}
        onComplete={onSeen}
        onSkip={onSeen}
        renderMascot={(index) => <Mascot index={index} />}
      />
    </div>
  );
}

/**
 * Der gemeinsame Zustand beider Einstiege: „muss die Sequenz noch gezeigt
 * werden" plus die Bühne, die es tut. Bleibt modul-intern — nach außen gehen
 * nur die zwei Einstiege darunter.
 */
function useIntroState(
  slug: RecipeIntroSlug,
  introSeen: boolean,
  onSeen?: () => void,
) {
  const [dismissed, setDismissed] = useState(false);

  const markSeen = () => {
    setDismissed(true);
    onSeen?.();
    // Persistiert geräteübergreifend; UI reagiert bereits optimistisch.
    void markRecipeIntroSeenAction(slug);
  };

  return {
    pending: !introSeen && !dismissed,
    stage: <RecipeIntroStage slug={slug} onSeen={markSeen} />,
  };
}

/**
 * Erst-Intro für Übungen, deren Render aus vielen frühen Returns besteht (die
 * Booster-Wizards, die Wants-Journey). Sie können ihren Inhalt nicht in
 * <RecipeIntroGate> wickeln, brauchen aber dieselbe Mechanik — also kommt sie
 * von hier statt aus einem Nachbau pro Übung.
 *
 *   const intro = useRecipeIntro("shadow", introSeen);
 *   …
 *   if (intro.pending) return intro.page(<SubPageHeader … />);
 *
 * @param onSeen wird aufgerufen, sobald die Sequenz durchgeklickt/übersprungen
 *   wurde (optimistisch, vor der Persistenz).
 */
export function useRecipeIntro(
  slug: RecipeIntroSlug,
  introSeen: boolean,
  onSeen?: () => void,
) {
  const { pending, stage } = useIntroState(slug, introSeen, onSeen);

  return {
    /** true, solange die Sequenz noch die eigentliche Übung verdeckt. */
    pending,
    /**
     * Die Sequenz als ganze Seite, mit der Kopfzeile der Route darüber. Die
     * Kopfzeile gehört der Route, nicht der Übung — Rückweg und Titel
     * unterscheiden sich pro Einstieg, deshalb kommt sie von außen.
     *
     * `lvh`, weil die Bühne in der iOS-Standalone-PWA sonst kürzer als der
     * Bildschirm rechnet und unten ein Streifen Body-Hintergrund stehen bleibt.
     */
    page: (header: React.ReactNode) => (
      <div className="flex min-h-lvh flex-col">
        {header}
        {stage}
      </div>
    ),
  };
}

type RecipeIntroGateProps = {
  slug: RecipeIntroSlug;
  introSeen: boolean;
  children: React.ReactNode;
  /** Wird aufgerufen, sobald die Intro-Sequenz durchgeklickt/übersprungen wurde
   *  (optimistisch, vor der Persistenz). Erlaubt dem Aufrufer, weitere UI sofort
   *  freizugeben, die sonst an der server-gelieferten `introSeen`-Prop hinge. */
  onSeen?: () => void;
};

/**
 * Erst-Intro-Gate für Server-gerenderte Rezept-Hubs (/me/values, /me/wants,
 * /me/bill-of-rights):
 * - Beim ersten Mal (intro_seen == false) wird die durchklickbare Sequenz als
 *   erste Ansicht gezeigt; onComplete/onSkip markiert sie als gesehen und gibt
 *   den Hub frei.
 * - Danach werden einfach die children gerendert; die Intro-Texte sind für
 *   Wiederkehrer über das Info-Icon im Header nachlesbar (IntroInfoButton).
 *
 * Die Hubs setzen ihre Kopfzeile selbst — und zwar über dem Gate, damit sie
 * während der Intro stehen bleibt. Deshalb füllt die Bühne hier nur den
 * verbleibenden Platz, statt noch einmal eine volle Bildschirmhöhe zu fordern.
 */
export function RecipeIntroGate({
  slug,
  introSeen,
  children,
  onSeen,
}: RecipeIntroGateProps) {
  const { pending, stage } = useIntroState(slug, introSeen, onSeen);

  return pending ? stage : <>{children}</>;
}
