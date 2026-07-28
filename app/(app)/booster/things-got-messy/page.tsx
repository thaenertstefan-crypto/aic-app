import { hasSeenRecipeIntro } from "@/app/(app)/recipes/actions";
import { BoosterArrive } from "@/components/booster/booster-arrive";
import { ThingsGotMessyWizard } from "./things-got-messy-wizard";

export default async function ThingsGotMessyPage() {
  // Hybrid-Intro: beim ersten Mal Sequenz, danach über den Info-Button.
  const introSeen = await hasSeenRecipeIntro("things-got-messy");

  return (
    <>
      <BoosterArrive />
      <ThingsGotMessyWizard introSeen={introSeen} />
    </>
  );
}
