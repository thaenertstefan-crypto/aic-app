/**
 * Eine Druckzelle des Kopfwetter-Hubs: konzentrische, geschwungene Gold-
 * Isobaren, in deren Auge das Booster-Icon sitzt — statt der „T"/„H"-Lettern
 * einer synoptischen Karte. Fünf handgezeichnete Ring-Sets (CELLS), je Booster
 * eins; jeder Ring ist eine eigene asymmetrische Kontur (kein prozeduraler
 * Generator, die Radien sind pro Zelle und Quadrant handgesetzt). Die Ringe
 * liegen absolut hinter dem Icon und glühen über .iso-glow. Rein dekorativ.
 *
 * Ausbuchtung zeigt zur Blattmitte: authored mit rR > rL (bulge nach rechts);
 * side="right" wird horizontal gespiegelt (scaleX(-1)), sodass die Ausbuchtung
 * dort nach links zeigt. Der Koordinatenraum ist 200×160, das Icon-Auge liegt
 * bei (100,80). Der langsame Drift (kw-cell-drift) sitzt eine Ebene höher in
 * page.tsx, damit Icon + Text als Einheit mitziehen.
 */
/** Kreis→Bezier-Konstante für einen 4-Segment-Bezier-Pfad. */
const K = 0.5523;

/**
 * Ein Ring mit vier getrennten Kardinal-Radien (rechts/links/oben/unten) um
 * (cx,cy). Getrennte Radien brechen die Ellipsen-Symmetrie → geschwungenes,
 * nieren-/eiförmiges Isobar statt perfektem Kreis. `rot` kippt den Ring extra
 * gegen die Zell-Neigung, damit die Ringe leicht gegeneinander „wackeln".
 */
type Ring = {
  cx: number;
  cy: number;
  rR: number;
  rL: number;
  rT: number;
  rB: number;
  rot?: number;
};
type Cell = { tilt: number; rings: Ring[] };

/** Geschlossener, asymmetrischer Bezier-Pfad mit vier Quadranten-Radien. */
function blob({ cx, cy, rR, rL, rT, rB }: Ring): string {
  const kR = K * rR;
  const kL = K * rL;
  const kT = K * rT;
  const kB = K * rB;
  return [
    `M${cx + rR},${cy}`,
    `C${cx + rR},${cy + kB} ${cx + kR},${cy + rB} ${cx},${cy + rB}`,
    `C${cx - kL},${cy + rB} ${cx - rL},${cy + kB} ${cx - rL},${cy}`,
    `C${cx - rL},${cy - kT} ${cx - kL},${cy - rT} ${cx},${cy - rT}`,
    `C${cx + kR},${cy - rT} ${cx + rR},${cy - kT} ${cx + rR},${cy}`,
    "Z",
  ].join(" ");
}

/**
 * Fünf handgesetzte Ring-Sets, außen → innen. Leitlinien: jeder Ring deutlich
 * elongiert (nie rR≈rL≈rT≈rB, sonst wirkt er rund); rR > rL = Ausbuchtung zur
 * Blattmitte; kleine rot-Variation pro Ring bricht die Zielscheibe auf. Der
 * innerste Ring sitzt zentriert (cx=100) und groß genug, dass das Icon-Auge
 * frei darin sitzt (Radien ~26–34, nicht am Icon knabbernd).
 */
const CELLS = {
  overthinking: {
    tilt: -8,
    rings: [
      { cx: 110, cy: 80, rR: 70, rL: 54, rT: 60, rB: 66, rot: 0 },
      { cx: 106, cy: 80, rR: 52, rL: 40, rT: 45, rB: 49, rot: 4 },
      { cx: 103, cy: 80, rR: 39, rL: 31, rT: 34, rB: 37, rot: -3 },
      { cx: 100, cy: 80, rR: 32, rL: 27, rT: 27, rB: 29, rot: 6 },
    ],
  },
  sayingNo: {
    tilt: 4,
    rings: [
      { cx: 116, cy: 79, rR: 84, rL: 60, rT: 44, rB: 50, rot: -2 },
      { cx: 109, cy: 80, rR: 60, rL: 43, rT: 33, rB: 37, rot: 4 },
      { cx: 100, cy: 80, rR: 34, rL: 29, rT: 26, rB: 28, rot: -3 },
    ],
  },
  messy: {
    tilt: -4,
    rings: [
      { cx: 112, cy: 81, rR: 68, rL: 52, rT: 54, rB: 60, rot: 3 },
      { cx: 108, cy: 80, rR: 52, rL: 39, rT: 42, rB: 46, rot: -4 },
      { cx: 104, cy: 80, rR: 38, rL: 30, rT: 32, rB: 35, rot: 5 },
      { cx: 100, cy: 80, rR: 32, rL: 27, rT: 27, rB: 29, rot: -2 },
    ],
  },
  shadow: {
    tilt: 8,
    rings: [
      { cx: 114, cy: 80, rR: 72, rL: 54, rT: 52, rB: 58, rot: -3 },
      { cx: 107, cy: 80, rR: 50, rL: 38, rT: 38, rB: 42, rot: 5 },
      { cx: 100, cy: 80, rR: 34, rL: 28, rT: 27, rB: 29, rot: -4 },
    ],
  },
  confidence: {
    tilt: -6,
    rings: [
      { cx: 118, cy: 79, rR: 86, rL: 60, rT: 42, rB: 48, rot: 2 },
      { cx: 110, cy: 80, rR: 60, rL: 42, rT: 32, rB: 36, rot: -4 },
      { cx: 100, cy: 80, rR: 34, rL: 28, rT: 26, rB: 28, rot: 3 },
    ],
  },
} satisfies Record<string, Cell>;

export type CellVariant = keyof typeof CELLS;

export function PressureCell({
  art,
  side,
  variant,
}: {
  art: React.ReactNode;
  side: "left" | "right";
  variant: CellVariant;
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
          {cell.rings.map((r, i) => (
            <path
              key={i}
              d={blob(r)}
              transform={`rotate(${cell.tilt + (r.rot ?? 0)} 100 80)`}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="1.1"
              strokeOpacity={0.22 + (i / last) * 0.28}
            />
          ))}
        </svg>
      </span>

      {/* Das Icon im Auge des Tiefs */}
      <span className="relative">{art}</span>
    </span>
  );
}
