import { Skeleton } from "@/components/ui/skeleton";

/** Das Gerüst des Kopfwetter-Hubs: Titel, die Frage darunter, und der
 *  mäandernde Weg aus fünf Wetter-Zellen.
 *
 *  Die Bühne selbst (`BoosterHubStage`) bleibt draußen: sie meldet dem
 *  Zoom-Übergang ihren Ursprung, und ein Gerüst hat keinen Tap-Punkt zu
 *  melden. Der Nachthimmel steht ohnehin schon — er hängt im Layout. */
export default function BoosterLoading() {
  return (
    <div className="space-y-6 p-4">
      <header className="space-y-3">
        <Skeleton className="h-12 w-56" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </header>

      <div className="relative -mx-4 overflow-x-clip">
        <div className="relative z-10 flex flex-col gap-16 px-4 py-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={i % 2 === 0 ? "self-start" : "self-end"}>
              <div
                className={`flex w-[min(17rem,82vw)] items-center gap-3 rounded-xl px-3 py-3 ${
                  i % 2 === 0 ? "flex-row" : "flex-row-reverse"
                }`}
              >
                <Skeleton className="size-16 shrink-0 rounded-full" />
                <Skeleton className="h-5 flex-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
