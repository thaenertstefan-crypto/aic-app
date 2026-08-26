import { BoosterScaffold } from "@/components/booster/booster-scaffold";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_TITLES } from "@/lib/content/labels";

/** Das Gerüst des Confidence-Boosts: Überschrift, Fortschritt, die Karte mit
 *  dem Atemkreis, der Weiter-Knopf. */
export default function ConfidenceLoading() {
  return (
    <BoosterScaffold title={PAGE_TITLES.confidence} maxWidth="md">
      <div className="space-y-2">
        <Skeleton className="mx-auto h-7 w-64" />
        <Skeleton className="mx-auto h-4 w-full" />
        <Skeleton className="mx-auto h-4 w-4/5" />
      </div>
      <div className="flex justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="size-2 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-9 w-full" />
    </BoosterScaffold>
  );
}
