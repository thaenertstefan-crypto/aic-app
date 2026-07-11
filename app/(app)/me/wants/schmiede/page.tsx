import { getWantsData } from "@/app/(app)/recipes/wants/actions";

import { Sternschmiede } from "./sternschmiede";

export default async function SternschmiedePage() {
  const { data } = await getWantsData();
  const hasSterne = (data?.wants ?? []).some((w) => w.active);

  return <Sternschmiede hasSterne={hasSterne} />;
}
