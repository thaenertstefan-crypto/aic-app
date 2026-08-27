import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Die Platzhalter-Karten der Journal-Liste — drei Zeilen im Maßstab der
 * echten: Icon-Kreis, Titel, Datum, zwei Vorschauzeilen.
 *
 * Sie stehen an zwei Stellen: `app/(app)/journal/loading.tsx` (die Seite lädt)
 * und im Hub beim Tab-Wechsel (die Liste tauscht sich aus). Beide Male ist es
 * dieselbe Wartezeit auf dieselbe Liste, also darf es nicht zweimal
 * dieselbe Klassenkette sein — driftet eine, wackelt die Fläche zwischen
 * Seitenaufruf und Filterwechsel.
 *
 * Bewusst **kein** Funkenflug: der ist der Maßstab fürs Warten auf die KI
 * (KAN-52). Hier tauscht sich eine Liste aus, und dafür ist der Zeilen-Maßstab
 * der ruhigere.
 */
export function JournalListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} size="sm">
          <CardContent className="flex items-start gap-3 pt-(--card-spacing)">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
