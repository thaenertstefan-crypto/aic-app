import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-6 p-4">
      {/* Header / avatar */}
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>

      {/* Two info cards */}
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardContent className="flex flex-col items-center gap-2 py-1">
              <Skeleton className="size-4" />
              <Skeleton className="h-7 w-8" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
