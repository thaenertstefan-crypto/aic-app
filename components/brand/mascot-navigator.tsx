import { Mascot } from "@/components/brand/mascot";
import { cn } from "@/lib/utils";

/** Sextant als Requisite — eigenes kleines SVG im 0 0 40 40-Raum. Lehnt unten
 *  rechts am Blob an (Rotation am Wrapper), liegt außerhalb des Blobs und wird
 *  daher nicht beschnitten. Gedämpfte Messing-/Holztöne, kein Gold (bleibt
 *  Aktionsfarbe). Ein Bogenrahmen mit Gradbogen, Indexarm und Fernrohr am Apex —
 *  das Instrument, mit dem man den Weg nach den Sternen findet. */
const NavigatorSextant = (
  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
    {/* Rahmen: Apex oben, zwei Schenkel zum Bogensegment unten */}
    <path
      d="M20 7 L8.5 30.5 A 15 15 0 0 0 31.5 30.5 Z"
      fill="none"
      stroke="#a8843f"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    {/* Gradbogen-Innenkante (dünn, dunkler) */}
    <path
      d="M11.5 29 A 11 11 0 0 0 28.5 29"
      fill="none"
      stroke="rgba(74,46,22,0.55)"
      strokeWidth="1"
    />
    {/* Indexarm vom Apex zum Bogen */}
    <line
      x1="20"
      y1="8.5"
      x2="26"
      y2="30"
      stroke="#6f4a28"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Fernrohr am Apex */}
    <rect
      x="19"
      y="6"
      width="12"
      height="3.4"
      rx="1.7"
      transform="rotate(-12 19 6)"
      fill="#6f4a28"
    />
  </svg>
);

/**
 * Maskottchen als Navigator: der Blob mit würdevollem, leicht gesenktem Blick und
 * einem kleinen Sextanten, der unten rechts anlehnt (findet den Weg nach den
 * Sternen — die Metapher der Bill of Rights). Kein Kostüm, kein Kopfstück:
 * „Begleiter statt Richter". Nur für /me/bill-of-rights gedacht.
 */
export function MascotNavigator({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative mx-auto", className)}
      style={{ width: 120, height: 112 }}
      aria-hidden="true"
    >
      {/* Maskottchen, würdevoller Blick leicht nach unten */}
      <Mascot
        size="md"
        expression="smile"
        gazeX={0}
        gazeY={1}
        className="absolute left-1/2 top-0 -translate-x-1/2"
      />

      {/* Sextant, schräg unten rechts angelehnt */}
      <div className="absolute bottom-0 right-0 rotate-[-30deg]">
        {NavigatorSextant}
      </div>
    </div>
  );
}
