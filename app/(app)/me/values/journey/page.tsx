import { getJourneyStand } from "@/lib/recipes/values/actions";
import { journeySteps } from "@/lib/recipes/values/cycle";

import { ValuesJourneyClient } from "./values-journey-client";

export default async function ValuesJourneyPage() {
  const { cycle, days } = await getJourneyStand();
  const { completed, currentStep } = journeySteps(cycle, days);

  return (
    <ValuesJourneyClient completedSteps={completed} currentStep={currentStep} />
  );
}
