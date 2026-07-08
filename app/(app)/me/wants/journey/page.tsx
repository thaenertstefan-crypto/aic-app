import { getWantsData } from "@/app/(app)/recipes/wants/actions";

import { WantsJourney } from "./wants-journey";

export default async function WantsJourneyPage() {
  const { data } = await getWantsData();

  return <WantsJourney introSeen={data?.introSeen ?? true} />;
}
