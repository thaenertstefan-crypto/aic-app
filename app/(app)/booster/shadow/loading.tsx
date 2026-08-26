import { BoosterScaffold } from "@/components/booster/booster-scaffold";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_TITLES } from "@/lib/content/labels";

/** Das Gerüst der Schattenseite: der Einstieg stellt zwei Wege zur Wahl —
 *  Shadow Journal oder Wut-Spaziergang. */
export default function ShadowLoading() {
  return (
    <BoosterScaffold title={PAGE_TITLES.shadow}>
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </BoosterScaffold>
  );
}
