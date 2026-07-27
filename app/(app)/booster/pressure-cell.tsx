/**
 * Eine Druckzelle des Kopfwetter-Hubs: konzentrische, geschwungene Gold-
 * Isobaren, in deren Auge das Booster-Icon sitzt — statt der „T"/„H"-Lettern
 * einer synoptischen Karte. Fünf handgesetzte Zellen (CELLS), je Booster eine.
 *
 * Aufbau: Jede Zelle ist eine glatte analytische Kontur — eine Ellipse (rx,ry)
 * mit einem sanften Komma-Faktor (bulge zu bulgeDir), an N Winkeln gesampelt
 * und per Catmull-Rom verbunden. Weil der Radius eine glatte Funktion ist,
 * entstehen fließende, nicht-eiförmige und nicht-wackelige Linien. Die inneren
 * Ringe sind gleichmäßig herunterskalierte Kopien (scales, außen→innen) → sie
 * laufen parallel, kreuzen sich nie und halten überall denselben Abstand.
 *
 * Ausbuchtung zeigt zur Blattmitte: authored mit bulge nach rechts;
 * side="right" wird horizontal gespiegelt (scaleX(-1)). Koordinatenraum
 * 200×160, Icon-Auge bei (100,80). Der langsame Drift (kw-cell-drift) sitzt
 * eine Ebene höher in page.tsx, damit Icon + Text als Einheit mitziehen.
 * Rein dekorativ.
 */
const CX = 100;
const CY = 80;
/** Punkte pro Kontur — hoch genug, dass der Catmull-Rom die Funktion glatt trifft. */
const SAMPLES = 24;

type Cell = {
  /** Horizontaler / vertikaler Grund-Radius (rx > ry = breiter als hoch). */
  rx: number;
  ry: number;
  /** Stärke des Komma-Versatzes (klein halten, ~0.1–0.15, sonst Beulen). */
  bulge: number;
  /** Richtung des Versatzes in Radiant (0 = rechts, negativ = nach oben). */
  bulgeDir: number;
  /** Neigung der ganzen Zelle in Grad (Fluss-Richtung des Tiefs). */
  tilt: number;
  /** Skalierungsfaktoren außen→innen; arithmetische Schritte = gleiche Abstände. */
  scales: number[];
};

/** Auf 1 Nachkommastelle runden — hält die Pfad-Strings kompakt. */
const q = (n: number) => Math.round(n * 10) / 10;

/** Glatter Radius am Winkel a: Ellipse × sanfter Komma-Faktor. */
function radiusAt(c: Cell, a: number): number {
  const ell = 1 / Math.hypot(Math.cos(a) / c.rx, Math.sin(a) / c.ry);
  return ell * (1 + c.bulge * Math.cos(a - c.bulgeDir));
}

/** Punkte der (skalierten) Kontur auf ihren Winkeln um das Auge (CX,CY). */
function ringPoints(c: Cell, scale: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let k = 0; k < SAMPLES; k++) {
    const a = (k / SAMPLES) * Math.PI * 2;
    const r = scale * radiusAt(c, a);
    pts.push([CX + r * Math.cos(a), CY + r * Math.sin(a)]);
  }
  return pts;
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
 * Fünf handgesetzte Zellen: breiter als hoch (ry < rx) → begrenzter vertikaler
 * Ausschlag, damit diagonale Nachbarn weniger kollidieren. bulge klein für
 * glatte Linien. scales so gewählt, dass der innerste Ring das Icon frei
 * umschließt (kleinster Innen-Radius ≳ 26; im Build-Script gegengeprüft).
 */
const CELLS = {
  overthinking: { rx: 100, ry: 66, bulge: 0.13, bulgeDir: -0.5, tilt: -5, scales: [1, 0.72, 0.45] },
  sayingNo: { rx: 106, ry: 60, bulge: 0.14, bulgeDir: 0.15, tilt: 4, scales: [1, 0.73, 0.47] },
  messy: { rx: 98, ry: 66, bulge: 0.11, bulgeDir: 0.35, tilt: -4, scales: [1, 0.72, 0.45] },
  shadow: { rx: 102, ry: 62, bulge: 0.14, bulgeDir: -0.2, tilt: 7, scales: [1, 0.73, 0.47] },
  confidence: { rx: 108, ry: 60, bulge: 0.14, bulgeDir: 0.1, tilt: -6, scales: [1, 0.73, 0.47] },
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
        className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-64 -translate-x-1/2 -translate-y-1/2"
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
                d={smoothClosedPath(ringPoints(cell, s))}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.1"
                strokeOpacity={0.18 + (i / last) * 0.3}
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
