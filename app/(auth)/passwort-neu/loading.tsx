import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst der Passwort-Karte. Sie steht im Karten-Slot der Auth-Bühne;
 *  Himmel und Maskottchen bringt das Layout mit. */
export default function PasswortNeuLoading() {
  return (
    <Card size="sm">
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="mt-1 h-8 w-full" />
      </CardContent>
    </Card>
  );
}
