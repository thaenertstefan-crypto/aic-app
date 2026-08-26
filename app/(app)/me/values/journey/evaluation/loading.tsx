import { SubPageScaffold } from "@/components/layout/sub-page-scaffold";
import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst der Auswertung: die Überschrift des Rückblicks und die sieben
 *  eingeklappten Tage. */
export default function EvaluationLoading() {
  return (
    <SubPageScaffold backHref="/me/values/journey" title="Auswertung">
      <div className="space-y-2">
        <Skeleton className="h-5 w-56" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>

      <Skeleton className="mt-auto h-9 w-full" />
    </SubPageScaffold>
  );
}
