import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst der Einstellungen: Kopf, die vier Bilanz-Zeilen, der Abmelden-
 *  Knopf. */
export default function SettingsLoading() {
  return (
    <div className="space-y-6 p-4">
      <header className="space-y-3">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-72" />
      </header>

      <Card>
        <CardContent className="divide-y divide-border py-0">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-baseline justify-between gap-4 py-3"
            >
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-6 w-8" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Skeleton className="h-8 w-full" />
    </div>
  );
}
