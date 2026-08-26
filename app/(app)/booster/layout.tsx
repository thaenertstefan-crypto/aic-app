import type { ReactNode } from "react";

import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";
import { BoosterFlugProvider } from "@/components/booster/booster-flug";

/**
 * Gemeinsames Layout für den Kopfwetter-Hub UND alle Booster-Sub-Pages. Es
 * hostet den Zoom-Übergang: weil dieses Layout bei der Navigation zwischen den
 * Kind-Routen erhalten bleibt, überlebt das Overlay den Routenwechsel und die
 * Animation läuft durchgehend weiter.
 *
 * Aus demselben Grund hängt auch der Nachthimmel hier und nicht mehr auf der
 * Hub-Seite: als Seiten-Kind verschwand er beim Routenwechsel schlagartig — der
 * Hintergrund „ploppte“ beim Eintauchen. Im Layout gehört er der ganzen
 * Kopfwetter-Zone und wechselt gar nicht mehr.
 */
export default function BoosterLayout({ children }: { children: ReactNode }) {
  return (
    <BoosterFlugProvider>
      <SkyBackdrop />
      {children}
    </BoosterFlugProvider>
  );
}
