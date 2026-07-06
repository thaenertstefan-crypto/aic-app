import { hasSeenRecipeIntro } from "@/app/(app)/recipes/actions";
import { ThingsGotMessyWizard } from "./things-got-messy-wizard";

export default async function ThingsGotMessyPage() {
  // Hybrid-Intro: beim ersten Mal Sequenz, danach über den Info-Button.
  const introSeen = await hasSeenRecipeIntro("things-got-messy");

  return <ThingsGotMessyWizard introSeen={introSeen} />;
}
