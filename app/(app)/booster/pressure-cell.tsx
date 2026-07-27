/**
 * Eine Druckzelle des Kopfwetter-Hubs: konzentrische, geschwungene Gold-
 * Isobaren, in deren Auge das Booster-Icon sitzt — statt der „T"/„H"-Lettern
 * einer synoptischen Karte. Fünf handgezeichnete Ring-Sets (CELLS), je Booster
 * eins; jeder Ring ist eine eigene ovale Kontur (kein prozeduraler Generator,
 * die Radien sind pro Zelle handgesetzt). Die Ringe liegen absolut hinter Icon
 * und Text, driften langsam seitlich (kw-cell-drift; reduced-motion-Fallback
 * zentral in globals.css) und glühen über .iso-glow. Rein dekorativ.
 *
 * Ausbuchtung zeigt zur Blattmitte: side="left" bucht nach rechts aus,
 * side="right" wird horizontal gespiegelt (scaleX(-1)). Der Koordinatenraum
 * ist 200×160, das Icon-Auge liegt bei (100,80).
 */
import type { CSSProperties } from "react";

/** Kreis→Bezier-Konstante für einen 4-Segment-Oval-Pfad. */
const K = 0.5523;

type Ring = { cx: number; cy: number; rx: number; ry: number };
type Cell = { tilt: number; rings: Ring[] };

/** Geschlossener, ovaler Bezier-Pfad um (cx,cy) mit Radien rx,ry. */
function oval({ cx, cy, rx, ry }: Ring): string {
  const kx = K * rx;
  const ky = K * ry;
  return [
    `M${cx + rx},${cy}`,
    `C${cx + rx},${cy + ky} ${cx + kx},${cy + ry} ${cx},${cy + ry}`,
    `C${cx - kx},${cy + ry} ${cx - rx},${cy + ky} ${cx - rx},${cy}`,
    `C${cx - rx},${cy - ky} ${cx - kx},${cy - ry} ${cx},${cy - ry}`,
    `C${cx + kx},${cy - ry} ${cx + rx},${cy - ky} ${cx + rx},${cy}`,
    "Z",
  ].join(" ");
}

/**
 * Fünf handgesetzte Ring-Sets. Äußere Ringe stehen weiter rechts (cx > 100) =
 * Ausbuchtung zur Blattmitte; der innerste Ring hugt das Auge (cx ≈ 100). Jede
 * Zelle hat eigene Aspekt-/Kippung-Charakteristik. Reihenfolge: außen → innen.
 */
const CELLS = {
  overthinking: {
    tilt: -10,
    rings: [
      { cx: 108, cy: 80, rx: 60, ry: 66 },
      { cx: 105, cy: 80, rx: 44, ry: 48 },
      { cx: 103, cy: 80, rx: 29, ry: 31 },
      { cx: 101, cy: 80, rx: 15, ry: 16 },
    ],
  },
  sayingNo: {
    tilt: 4,
    rings: [
      { cx: 116, cy: 78, rx: 80, ry: 46 },
      { cx: 110, cy: 79, rx: 56, ry: 33 },
      { cx: 104, cy: 80, rx: 32, ry: 20 },
    ],
  },
  messy: {
    tilt: -3,
    rings: [
      { cx: 112, cy: 82, rx: 70, ry: 58 },
      { cx: 108, cy: 81, rx: 52, ry: 43 },
      { cx: 104, cy: 80, rx: 34, ry: 28 },
      { cx: 101, cy: 80, rx: 17, ry: 14 },
    ],
  },
  shadow: {
    tilt: 9,
    rings: [
      { cx: 114, cy: 80, rx: 66, ry: 60 },
      { cx: 109, cy: 80, rx: 47, ry: 42 },
      { cx: 104, cy: 80, rx: 28, ry: 25 },
    ],
  },
  confidence: {
    tilt: -6,
    rings: [
      { cx: 118, cy: 78, rx: 82, ry: 44 },
      { cx: 111, cy: 79, rx: 57, ry: 31 },
      { cx: 105, cy: 80, rx: 31, ry: 18 },
    ],
  },
} satisfies Record<string, Cell>;

export function PressureCell({
  art,
  side,
  variant,
  phase = 0,
}: {
  art: React.ReactNode;
  side: "left" | "right";
  variant: keyof typeof CELLS;
  phase?: number;
}) {
  const cell = CELLS[variant];
  const last = cell.rings.length - 1;

  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center">
      {/* Lilac-Kern (Druckzentrum) hinter dem Icon */}
      <span
        aria-hidden="true"
        className="kw-cell-glow absolute inset-0 rounded-full blur-md"
      />

      {/* Isobaren-Ringe: absolut, größer als die Icon-Box, hinter dem Icon */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-60 -translate-x-1/2 -translate-y-1/2"
      >
        <svg
          viewBox="0 0 200 160"
          className="iso-glow size-full overflow-visible"
          style={{ transform: side === "right" ? "scaleX(-1)" : undefined }}
        >
          <g
            className="kw-cell-drift"
            style={{ animationDelay: `${phase * -1.7}s` } as CSSProperties}
          >
            {cell.rings.map((r, i) => (
              <path
                key={i}
                d={oval(r)}
                transform={`rotate(${cell.tilt} 100 80)`}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.1"
                strokeOpacity={0.22 + (i / last) * 0.28}
              />
            ))}
          </g>
        </svg>
      </span>

      {/* Das Icon im Auge des Tiefs */}
      <span className="relative">{art}</span>
    </span>
  );
}
