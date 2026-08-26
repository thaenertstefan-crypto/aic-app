import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";
import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst des Me-Hubs: Titel, Untertitel und der mäandernde Weg aus drei
 *  Szenen — links, rechts, links, wie ihn `MeHub` legt. */
export default function MeLoading() {
  return (
    <div className="space-y-6 p-4">
      <header className="space-y-3">
        <Skeleton className="h-12 w-28" />
        <Skeleton className="h-4 w-60" />
      </header>

      <div className="relative -mx-4 overflow-x-clip">
        <SkyBackdrop />
        <div className="relative z-10 flex flex-col gap-16 px-4 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className={i % 2 === 0 ? "self-start" : "self-end"}>
              <div
                className={`flex w-[min(17rem,76vw)] items-center gap-4 rounded-xl px-3 py-4 ${
                  i % 2 === 0 ? "flex-row" : "flex-row-reverse"
                }`}
              >
                <Skeleton className="size-16 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
