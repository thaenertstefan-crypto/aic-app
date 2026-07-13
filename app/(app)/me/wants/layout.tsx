import type { ReactNode } from "react";

import { WarpProvider } from "@/components/wants/warp-transition";

/**
 * Gemeinsames Layout für /me/wants UND /me/wants/schmiede. Es hostet den
 * Warp-Übergang: weil dieses Layout bei der Navigation zwischen beiden
 * Kind-Routen erhalten bleibt, überlebt das Warp-Overlay (in WarpProvider)
 * den Routenwechsel und die Animation läuft durchgehend weiter.
 */
export default function WantsLayout({ children }: { children: ReactNode }) {
  return <WarpProvider>{children}</WarpProvider>;
}
