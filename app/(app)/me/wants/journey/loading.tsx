import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_TITLES } from "@/lib/content/labels";

import { JourneyStage } from "./journey-stage";

/** Das Gerüst der Sternensuche: dieselbe Bühne wie jeder Schritt der Reise —
 *  Fokus-Himmel, Header, eine mittige Frage mit ihren Antwortfeldern. */
export default function WantsJourneyLoading() {
  return (
    <JourneyStage
      backHref="/me/wants"
      title={PAGE_TITLES.wants}
      mascot={null}
      stepKey="geruest"
    >
      <div className="flex flex-1 flex-col items-center gap-6">
        <div className="flex w-full flex-col items-center gap-3">
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <div className="w-full space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="mt-auto h-9 w-full" />
      </div>
    </JourneyStage>
  );
}
