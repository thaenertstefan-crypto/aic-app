import type { ReactNode } from "react";

import { BoosterZoomProvider } from "@/components/booster/booster-zoom";

/**
 * Gemeinsames Layout für den Kopfwetter-Hub UND alle Booster-Sub-Pages. Es
 * hostet den Zoom-Übergang: weil dieses Layout bei der Navigation zwischen den
 * Kind-Routen erhalten bleibt, überlebt das Overlay den Routenwechsel und die
 * Animation läuft durchgehend weiter.
 */
export default function BoosterLayout({ children }: { children: ReactNode }) {
  return <BoosterZoomProvider>{children}</BoosterZoomProvider>;
}
