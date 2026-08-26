import { SubPageScaffold } from "@/components/layout/sub-page-scaffold";
import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst der Werteentdeckung: die Sternbild-Karte, über die der Weg
 *  läuft, und der Knopf zum nächsten Stern. */
export default function ValuesJourneyLoading() {
  return (
    <SubPageScaffold backHref="/me/values" title="Werteentdeckung">
      <Skeleton className="aspect-[3/4] w-full rounded-xl" />
      <Skeleton className="mt-auto h-8 w-full" />
    </SubPageScaffold>
  );
}
