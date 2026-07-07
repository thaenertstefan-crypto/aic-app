import { hasSeenRecipeIntro } from "@/app/(app)/recipes/actions";
import { SayingNoWizard } from "./saying-no-wizard";

export default async function SayingNoPage() {
  // Hybrid-Intro: beim ersten Mal Sequenz, danach über den Info-Button.
  const introSeen = await hasSeenRecipeIntro("saying-no");

  return <SayingNoWizard introSeen={introSeen} />;
}
