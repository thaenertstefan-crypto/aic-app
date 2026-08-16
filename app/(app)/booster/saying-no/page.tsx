import { hasSeenRecipeIntro } from "@/lib/recipes/actions";
import { BoosterArrive } from "@/components/booster/booster-arrive";
import { SayingNoWizard } from "./saying-no-wizard";

export default async function SayingNoPage() {
  // Hybrid-Intro: beim ersten Mal Sequenz, danach über den Info-Button.
  const introSeen = await hasSeenRecipeIntro("saying-no");

  return (
    <>
      <BoosterArrive />
      <SayingNoWizard introSeen={introSeen} />
    </>
  );
}
