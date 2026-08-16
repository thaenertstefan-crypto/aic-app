import { getWantsData, hasValuesHypothesis } from "@/lib/recipes/wants/actions";

import { WantsJourney } from "./wants-journey";

export default async function WantsJourneyPage() {
  const [{ data }, hasValues] = await Promise.all([
    getWantsData(),
    hasValuesHypothesis(),
  ]);

  return (
    <WantsJourney
      introSeen={data?.introSeen ?? true}
      hasValuesHypothesis={hasValues}
    />
  );
}
