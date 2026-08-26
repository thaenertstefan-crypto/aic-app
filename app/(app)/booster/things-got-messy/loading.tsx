import { BoosterScaffold } from "@/components/booster/booster-scaffold";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_TITLES } from "@/lib/content/labels";

/** Das Gerüst von Things Got Messy: der Einstieg ist das Erzählfeld mit
 *  seiner Frage und dem Weiter-Knopf. */
export default function ThingsGotMessyLoading() {
  return (
    <BoosterScaffold title={PAGE_TITLES.thingsGotMessy}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-9 w-full" />
    </BoosterScaffold>
  );
}
