import { getJourneyStand } from "@/lib/recipes/values/actions";
import { journeySteps } from "@/lib/recipes/values/journey-steps";

import { ValuesJourneyClient } from "./values-journey-client";

export default async function ValuesJourneyPage() {
  const { completed, currentStep } = journeySteps(await getJourneyStand());

  return (
    <ValuesJourneyClient completedSteps={completed} currentStep={currentStep} />
  );
}
