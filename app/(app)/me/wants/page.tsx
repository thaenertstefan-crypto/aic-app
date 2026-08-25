import { getWantsData } from "@/lib/recipes/wants/actions";

import { WantsMe } from "./wants-me";

export default async function MeWantsPage() {
  const { data } = await getWantsData();

  return (
    <WantsMe
      initialWants={data?.wants ?? []}
      initialMoments={data?.moments ?? {}}
      introSeen={data?.introSeen ?? true}
    />
  );
}
