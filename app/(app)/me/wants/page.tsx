import { getWantsData } from "@/app/(app)/recipes/wants/actions";

import { WantsMe } from "./wants-me";

export default async function MeWantsPage() {
  const { data } = await getWantsData();

  return (
    <WantsMe
      initialWants={data?.wants ?? []}
      initialBets={data?.bets ?? []}
      introSeen={data?.introSeen ?? true}
    />
  );
}
