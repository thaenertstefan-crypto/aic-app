import { SubPageScaffold } from "@/components/layout/sub-page-scaffold";
import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst des Reflexionstages: die drei Fragen mit ihren Feldern und der
 *  Speichern-Knopf. Der Tag im Titel hängt an den Daten — bis er da ist,
 *  wartet dort ein Balken. */
export default function ValuesJournalLoading() {
  return (
    <SubPageScaffold backHref="/me/values/journey" title="Reflexion">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-28 w-full" />
        </div>
      ))}

      <Skeleton className="mt-auto h-9 w-full" />
    </SubPageScaffold>
  );
}
