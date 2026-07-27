/**
 * Eine Druckzelle des Kopfwetter-Hubs: konzentrische, geschwungene Gold-
 * Isobaren, in deren Auge das Booster-Icon sitzt — statt der „T"/„H"-Lettern
 * einer synoptischen Karte. Fünf handgezeichnete Ring-Sets (CELLS), je Booster
 * eins.
 *
 * Aufbau: Jede Zelle definiert EINE geschwungene Grund-Kontur (outline: Radius
 * an 10 gleichmäßig verteilten Winkeln), aus der die inneren Ringe als
 * gleichmäßig herunterskalierte Kopien entstehen (scales, außen→innen). Weil
 * alle Ringe dieselbe skalierte Kontur sind, laufen sie parallel — sie kreuzen
 * sich nie und halten überall denselben Abstand. Die Kontur wird als glatter,
 * geschlossener Catmull-Rom-Spline gezeichnet → fließend, nicht eiförmig.
 *
 * Ausbuchtung zeigt zur Blattmitte: authored mit größeren Radien rechts;
 * side="right" wird horizontal gespiegelt (scaleX(-1)). Koordinatenraum
 * 200×160, Icon-Auge bei (100,80). Der langsame Drift (kw-cell-drift) sitzt
 * eine Ebene höher in page.tsx, damit Icon + Text als Einheit mitziehen.
 * Rein dekorativ.
 */
const CX = 100;
const CY = 80;

type Cell = {
  /** Neigung der ganzen Zelle in Grad (Fluss-Richtung des Tiefs). */
  tilt: number;
  /** Radius an 10 gleichmäßig verteilten Winkeln (0°=rechts, im Uhrzeigersinn). */
  outline: number[];
  /** Skalierungsfaktoren außen→innen; arithmetische Schritte = gleiche Abstände. */
  scales: number[];
};

/** Auf 1 Nachkommastelle runden — hält die Pfad-Strings kompakt. */
const q = (n: number) => Math.round(n * 10) / 10;

/** Punkte der (skalierten) Kontur auf ihren Winkeln um das Auge (CX,CY). */
function ringPoints(outline: number[], scale: number): [number, number][] {
  const n = outline.length;
  return outline.map((r, k) => {
    const a = (k / n) * Math.PI * 2;
    return [CX + scale * r * Math.cos(a), CY + scale * r * Math.sin(a)];
  });
}

/** Glatter, geschlossener Catmull-Rom-Spline durch alle Punkte als Bezier. */
function smoothClosedPath(pts: [number, number][]): string {
  const n = pts.length;
  const d = [`M${q(pts[0][0])},${q(pts[0][1])}`];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C${q(c1x)},${q(c1y)} ${q(c2x)},${q(c2y)} ${q(p2[0])},${q(p2[1])}`);
  }
  d.push("Z");
  return d.join(" ");
}

/**
 * Fünf handgesetzte Zellen. outline-Werte variieren sanft (kein Sprung > ~25 %
 * zwischen Nachbarn → keine Knicke) und sind rechts größer (Ausbuchtung zur
 * Blattmitte). scales sind so gewählt, dass der innerste Ring das Icon frei
 * umschließt (kleinster Innen-Radius ≳ 26) und die Abstände gleichmäßig sind.
 */
const CELLS = {
  overthinking: {
    tilt: -8,
    outline: [108, 100, 92, 90, 94, 88, 92, 98, 96, 104],
    scales: [1, 0.76, 0.52, 0.32],
  },
  sayingNo: {
    tilt: 5,
    outline: [118, 98, 76, 74, 94, 106, 88, 72, 76, 110],
    scales: [1, 0.67, 0.37],
  },
  messy: {
    tilt: -4,
    outline: [104, 98, 96, 92, 96, 90, 94, 100, 96, 102],
    scales: [1, 0.76, 0.52, 0.32],
  },
  shadow: {
    tilt: 8,
    outline: [110, 100, 88, 86, 92, 96, 90, 96, 94, 106],
    scales: [1, 0.65, 0.34],
  },
  confidence: {
    tilt: -6,
    outline: [120, 100, 78, 74, 96, 108, 90, 72, 78, 112],
    scales: [1, 0.66, 0.37],
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
  const last = cell.scales.length - 1;

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
        className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-72 -translate-x-1/2 -translate-y-1/2"
      >
        <svg
          viewBox="0 0 200 160"
          className="iso-glow size-full overflow-visible"
          style={{ transform: side === "right" ? "scaleX(-1)" : undefined }}
        >
          <g transform={`rotate(${cell.tilt} ${CX} ${CY})`}>
            {cell.scales.map((s, i) => (
              <path
                key={i}
                d={smoothClosedPath(ringPoints(cell.outline, s))}
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
