import { SubPageScaffold } from "@/components/layout/sub-page-scaffold";
import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst des neuen Eintrags: Titelfeld, das große Textfeld, der
 *  Speichern-Knopf am Fuß. Ohne dieses eigene Gerüst erbte die Seite das der
 *  Journal-Liste und zeigte Karten, die hier nie kommen. */
export default function NewJournalEntryLoading() {
  return (
    <SubPageScaffold backHref="/journal" title="Neuer Eintrag">
      <div className="flex flex-1 flex-col gap-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-1 flex-col space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="min-h-[200px] flex-1 w-full" />
        </div>
        <Skeleton className="h-8 w-full" />
      </div>
    </SubPageScaffold>
  );
}
