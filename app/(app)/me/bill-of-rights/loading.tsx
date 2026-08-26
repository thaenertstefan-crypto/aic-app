import { SubPageScaffold } from "@/components/layout/sub-page-scaffold";
import { Skeleton } from "@/components/ui/skeleton";

import { BillOfRightsSky } from "./bill-of-rights-sky";

/** Das Gerüst der Bill of Rights: Siegel über der Urkunde, darunter die
 *  Rechte-Zeilen und die zwei Wege, ein neues zu bekommen. */
export default function BillOfRightsLoading() {
  return (
    <SubPageScaffold
      backHref="/me"
      title="Meine Bill of Rights"
      backdrop={<BillOfRightsSky />}
    >
      {/* Das Gold-Siegel thront über der Urkunde. */}
      <div className="flex justify-center">
        <Skeleton className="size-20 rounded-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="mx-auto h-4 w-full" />
        <Skeleton className="mx-auto h-4 w-4/5" />
      </div>

      {/* Die Urkunde */}
      <div className="space-y-4 rounded-xl px-4 py-6 ring-1 ring-foreground/10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ))}
      </div>

      {/* Recht generieren · Selbst schreiben */}
      <div className="mt-auto flex gap-3">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </SubPageScaffold>
  );
}
