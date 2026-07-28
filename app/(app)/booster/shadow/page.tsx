import { hasSeenRecipeIntro } from "@/app/(app)/recipes/actions";
import { BoosterArrive } from "@/components/booster/booster-arrive";
import { ShadowWizard } from "./shadow-wizard";

export default async function ShadowPage() {
  // Hybrid-Intro: beim ersten Mal Sequenz, danach über den Info-Button.
  const introSeen = await hasSeenRecipeIntro("shadow");

  return (
    <>
      <BoosterArrive />
      <ShadowWizard introSeen={introSeen} />
    </>
  );
}
