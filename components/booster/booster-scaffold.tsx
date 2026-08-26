import type { ReactNode } from "react";

import { SubPageHeader } from "@/components/layout/sub-page-header";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Das Gerüst einer Booster-Übung — der Einstiegs-Screen in seinem ersten
 * Frame. Alle fünf Übungen teilen sich denselben Kopf: Header, die Signatur
 * des Wetter-Systems mittig darunter, ein Satz. Was darunter kommt, bringt
 * jede Übung als `children` selbst mit.
 *
 * Der Landeplatz des Icons bleibt **leer** (nur reservierte Höhe): dort landet
 * der Klon des Kopfwetter-Zooms, und ein pulsendes Skelett darunter wäre ein
 * zweites Motiv an derselben Stelle. Die Höhe steht trotzdem, damit das echte
 * `ModuleIcon` beim Eintreffen nichts verschiebt.
 */
export function BoosterScaffold({
  title,
  maxWidth = "lg",
  children,
}: {
  title: string;
  /** Spaltenbreite der Übung — `confidence` steht enger als die anderen. */
  maxWidth?: "md" | "lg";
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <SubPageHeader backHref="/booster" title={title} />
      <div
        className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 ${
          maxWidth === "md" ? "max-w-md" : "max-w-lg"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          {/* Landeplatz des Zoom-Klons — reservierte Höhe, kein Skelett. */}
          <div className="flex justify-center pb-2 pt-1">
            <div className="size-24" />
          </div>
          <Skeleton className="h-4 w-4/5" />
        </div>
        {children}
      </div>
    </div>
  );
}
