import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";
import { SubPageScaffold } from "@/components/layout/sub-page-scaffold";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_TITLES } from "@/lib/content/labels";

/** Das Gerüst des Sternenhimmels: Überschrift, die Sternkarte, die zwei Wege
 *  zu einem neuen Stern. Der Himmel selbst steht schon — er hängt an keiner
 *  Abfrage. */
export default function MeWantsLoading() {
  return (
    <SubPageScaffold
      backHref="/me"
      title={PAGE_TITLES.meWants}
      backdrop={<SkyBackdrop />}
    >
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Die Sternkarte */}
      <Skeleton className="h-64 w-full rounded-xl" />

      {/* Sternensuche · Eigener Stern */}
      <div className="flex gap-3">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>

      <div className="flex flex-1 flex-col justify-center pt-2">
        <Skeleton className="mx-auto h-4 w-40" />
      </div>
    </SubPageScaffold>
  );
}
