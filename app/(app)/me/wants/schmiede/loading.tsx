import { ForgeBackdrop } from "@/components/backdrops/forge-backdrop";
import { SubPageScaffold } from "@/components/layout/sub-page-scaffold";
import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst der Sternschmiede: Begrüßung, die Konstellation offener Funken,
 *  die Zeile für den eigenen Funken. Die Esse brennt schon — sie gehört zum
 *  Rahmen, nicht zum Inhalt. */
export default function SternschmiedeLoading() {
  return (
    <SubPageScaffold
      backHref="/me/wants"
      title="Sternschmiede"
      backdrop={<ForgeBackdrop />}
    >
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      {/* Die schwebenden Funken über der Esse */}
      <Skeleton className="h-48 w-full rounded-xl" />

      {/* Eigener Funke */}
      <div className="flex items-start gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="size-9 shrink-0" />
      </div>
    </SubPageScaffold>
  );
}
