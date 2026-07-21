import { getWantsData } from "@/app/(app)/recipes/wants/actions";

import { Sternschmiede } from "./sternschmiede";

export default async function SternschmiedePage() {
  const { data } = await getWantsData();
  // Seit dem Wegfall von „loslassen" kann kein Stern mehr erlöschen (active
  // bleibt immer true) — das Gate ist schlicht „gibt es überhaupt Sterne".
  const hasSterne = (data?.wants ?? []).length > 0;

  return (
    <Sternschmiede hasSterne={hasSterne} initialBets={data?.bets ?? []} />
  );
}
