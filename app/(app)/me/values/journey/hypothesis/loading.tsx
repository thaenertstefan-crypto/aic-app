import { SubPageScaffold } from "@/components/layout/sub-page-scaffold";
import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst der Werte-Hypothese: der Satz über dem Kompass, die fünf
 *  Wertekarten, der Weiter-Knopf. */
export default function HypothesisLoading() {
  return (
    <SubPageScaffold backHref="/me/values/journey" title="Werte">
      <Skeleton className="h-4 w-4/5" />

      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>

      <Skeleton className="mt-auto h-9 w-full" />
    </SubPageScaffold>
  );
}
