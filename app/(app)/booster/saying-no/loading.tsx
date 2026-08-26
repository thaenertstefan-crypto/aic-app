import { BoosterScaffold } from "@/components/booster/booster-scaffold";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_TITLES } from "@/lib/content/labels";

/** Das Gerüst des Nein-Trainers: der Einstieg fragt, womit geübt wird —
 *  echte Situation oder Trockenübung. */
export default function SayingNoLoading() {
  return (
    <BoosterScaffold title={PAGE_TITLES.sayingNo}>
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </BoosterScaffold>
  );
}
