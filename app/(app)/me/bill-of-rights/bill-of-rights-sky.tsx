import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";

import { Constellations } from "./constellations";

/**
 * Szene der Bill of Rights: der geteilte, neutrale Nachthimmel (SkyBackdrop,
 * ohne score) plus dezente Sternbilder (Constellations) darüber. Beide Ebenen
 * sind fix, -z-10 und dekorativ; die Szene wird von der Client-Komponente
 * gerendert und unmountet bei Navigation weg (gleiche Konvention wie SkyBackdrop
 * auf Dashboard/Wants).
 */
export function BillOfRightsSky() {
  return (
    <>
      <SkyBackdrop />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <Constellations />
      </div>
    </>
  );
}
