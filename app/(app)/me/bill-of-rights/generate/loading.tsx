import { SubPageScaffold } from "@/components/layout/sub-page-scaffold";
import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst von „Recht generieren": die Einleitung, die Frage nach dem
 *  inneren Konflikt und ihr Feld — nicht die Rechte-Liste der Elternseite. */
export default function GenerateRightLoading() {
  return (
    <SubPageScaffold backHref="/me/bill-of-rights" title="Recht generieren">
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="mt-auto h-8 w-full" />
    </SubPageScaffold>
  );
}
