import { SubPageScaffold } from "@/components/layout/sub-page-scaffold";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_TITLES } from "@/lib/content/labels";

/** Das Gerüst der Funken-Reflexion: Maskottchen und Frage, die Karte mit dem
 *  Funken, darunter das Formular. */
export default function ReflectLoading() {
  return (
    <SubPageScaffold backHref="/me/wants" title={PAGE_TITLES.meWants}>
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="h-7 w-56" />
      </div>

      {/* Dein Funke */}
      <div className="space-y-2 rounded-xl px-4 py-4 ring-1 ring-foreground/10">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-56" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-full" />
      </div>
    </SubPageScaffold>
  );
}
