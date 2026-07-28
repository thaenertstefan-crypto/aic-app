import { hasSeenRecipeIntro } from "@/app/(app)/recipes/actions";
import { BoosterArrive } from "@/components/booster/booster-arrive";
import { OverthinkingWizard } from "./overthinking-wizard";

export default async function OverthinkingPage() {
  // Hybrid-Intro (Schritt 6.10): beim ersten Mal Sequenz, danach Collapsible.
  const introSeen = await hasSeenRecipeIntro("overthinking");

  return (
    <>
      <BoosterArrive />
      <OverthinkingWizard introSeen={introSeen} />
    </>
  );
}
