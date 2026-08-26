import { BoosterScaffold } from "@/components/booster/booster-scaffold";
import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst von Overthinking: Schritt-Punkte, die Schritt-Überschrift und
 *  das erste Feld. */
export default function OverthinkingLoading() {
  return (
    <BoosterScaffold title="Overthinking">
      <div className="flex justify-center gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="size-2 rounded-full" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="mx-auto h-3 w-28" />
        <Skeleton className="mx-auto h-5 w-56" />
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-9 w-full" />
    </BoosterScaffold>
  );
}
