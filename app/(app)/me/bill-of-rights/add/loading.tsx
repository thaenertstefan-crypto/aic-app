import { SubPageScaffold } from "@/components/layout/sub-page-scaffold";
import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst von „Recht hinzufügen": das Feld mit dem festen Satzanfang und
 *  der Knopf darunter — nicht die Rechte-Liste der Elternseite. */
export default function AddRightLoading() {
  return (
    <SubPageScaffold backHref="/me/bill-of-rights" title="Recht hinzufügen">
      <div className="flex flex-1 flex-col gap-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
        <Skeleton className="mt-auto h-8 w-full" />
      </div>
    </SubPageScaffold>
  );
}
