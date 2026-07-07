import { hasSeenRecipeIntro } from "@/app/(app)/recipes/actions";
import { ShadowWizard } from "./shadow-wizard";

export default async function ShadowPage() {
  // Hybrid-Intro: beim ersten Mal Sequenz, danach über den Info-Button.
  const introSeen = await hasSeenRecipeIntro("shadow");

  return <ShadowWizard introSeen={introSeen} />;
}
