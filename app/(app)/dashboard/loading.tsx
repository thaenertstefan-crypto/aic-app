import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4">
      {/* Greeting */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>

      {/* Mood check-in */}
      <Card>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <div className="flex justify-between gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="size-11 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current recipe */}
      <Card>
        <CardContent className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>

      {/* Daily right */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </CardContent>
      </Card>

      {/* Streaks */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardContent className="flex flex-col items-center gap-2 py-1">
              <Skeleton className="size-4" />
              <Skeleton className="h-7 w-8" />
              <Skeleton className="h-3 w-14" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col items-center gap-2 py-1">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
