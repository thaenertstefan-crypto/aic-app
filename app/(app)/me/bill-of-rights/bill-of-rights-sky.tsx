import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";

import { CourseLine } from "./course-line";

/**
 * Szene der Bill of Rights: der geteilte, neutrale Nachthimmel (SkyBackdrop,
 * ohne score) plus „Der gesteuerte Kurs" (CourseLine) darüber. Beide Ebenen sind
 * fix, -z-10 und dekorativ; die Szene wird von der Client-Komponente gerendert
 * und unmountet bei Navigation weg (gleiche Konvention wie SkyBackdrop auf
 * Dashboard/Wants).
 */
export function BillOfRightsSky() {
  return (
    <>
      <SkyBackdrop />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <CourseLine />
      </div>
    </>
  );
}
