import { Skeleton } from "@/components/ui/skeleton";
import {
  ZEILEN_H,
  ZELLEN_H,
  zeilenAnker,
  zeilenSeite,
} from "@/lib/kopfwetter/buehne";

/** Das Gerüst des Kopfwetter-Hubs: Titel, die Frage darunter, und der Weg aus
 *  fünf Wetter-Systemen — auf denselben Koordinaten wie die fertige Bühne, damit
 *  beim Wechsel nichts springt.
 *
 *  Ohne Druckfeld: die Karte ist der Inhalt, nicht das Gerüst. Deshalb hängt das
 *  Gerüst nur an `buehne.ts` — `druckfeld.ts` zu importieren würde beim Laden
 *  das ganze Isobaren-Feld rechnen, für eine Zehntelsekunde, in der es nicht
 *  gezeigt wird.
 *
 *  Die Bühne selbst (`BoosterHubStage`) bleibt draußen: sie trägt die Blende
 *  des Abflugs, und von einem Gerüst fliegt niemand ab.
 *  Der Nachthimmel steht ohnehin schon — er hängt im Layout. */
export default function BoosterLoading() {
  return (
    <div className="p-4">
      <header className="relative z-10 space-y-3">
        <Skeleton className="h-12 w-56" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </header>

      <div className="relative -mx-4 mt-6">
        <div className="relative" style={{ height: ZELLEN_H }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const links = zeilenSeite(i) === "left";
            return (
              <div key={i} className="absolute" style={zeilenAnker(i)}>
                <div
                  style={{ height: ZEILEN_H }}
                  className={`flex w-[min(17rem,82vw)] items-center gap-3 rounded-xl px-3 ${
                    links ? "flex-row" : "flex-row-reverse"
                  }`}
                >
                  <Skeleton className="size-16 shrink-0 rounded-full" />
                  <Skeleton className="h-5 flex-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
