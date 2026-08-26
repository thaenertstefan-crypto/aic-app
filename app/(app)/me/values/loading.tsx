import { SubPageScaffold } from "@/components/layout/sub-page-scaffold";
import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst der Werte-Seite: Einleitung, Kompassrose, Gold-CTA am Fuß. */
export default function MeValuesLoading() {
  return (
    <SubPageScaffold backHref="/me" title="Meine Werte">
      <div className="space-y-2">
        <Skeleton className="mx-auto h-4 w-full" />
        <Skeleton className="mx-auto h-4 w-full" />
        <Skeleton className="mx-auto h-4 w-11/12" />
        <Skeleton className="mx-auto h-4 w-3/4" />
      </div>

      {/* Die Kompassrose */}
      <div className="flex justify-center py-4">
        <Skeleton className="size-56 rounded-full" />
      </div>

      <Skeleton className="mt-auto h-8 w-full" />
    </SubPageScaffold>
  );
}
