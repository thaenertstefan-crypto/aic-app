import { hasSeenRecipeIntro } from "@/app/(app)/recipes/actions";
import { OverthinkingWizard } from "./overthinking-wizard";

export default async function OverthinkingPage() {
  // Hybrid-Intro (Schritt 6.10): beim ersten Mal Sequenz, danach Collapsible.
  const introSeen = await hasSeenRecipeIntro("overthinking");

  return <OverthinkingWizard introSeen={introSeen} />;
}
