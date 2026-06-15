import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecipesLoading() {
  return (
    <div className="p-4">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-5 w-72" />
      </div>

      {/* Recipe grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
