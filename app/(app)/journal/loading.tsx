import { Skeleton } from "@/components/ui/skeleton";
import { JournalListSkeleton } from "@/components/journal/journal-list-skeleton";

export default function JournalLoading() {
  return (
    <div className="p-4">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20" />
        ))}
      </div>

      {/* Entry cards — dieselben Platzhalter wie beim Tab-Wechsel im Hub. */}
      <div className="mt-6">
        <JournalListSkeleton />
      </div>
    </div>
  );
}
