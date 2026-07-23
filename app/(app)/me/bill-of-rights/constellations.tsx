/**
 * Dezente Sternbilder als Bill-of-Rights-Szene — rein atmosphärisch über dem
 * geteilten SkyBackdrop. Mehrere stilisierte Sternbilder, deren Sterne durch
 * feine gestrichelte Linien verbunden sind: die „Regeln", nach denen man den
 * Alltag navigiert. Bewusst KEIN Kompass (= Werte) und KEINE pulsenden
 * Wegpunkte mehr — nur ruhige, verbundene Sterne.
 *
 * Modulfarbe der Bill of Rights ist Sage (DESIGN.md) und lebt hier sehr
 * gedämpft in den Verbindungslinien; die Sterne selbst sind gedämpftes
 * Foreground. Gold bleibt unangetastet (Aktionsfarbe).
 *
 * Rein gemalt (SVG), kein backdrop-filter. Komplett statisch (kein Pulsieren) —
 * damit dezent und reduced-motion trivial erfüllt.
 */

type Constellation = { pts: [number, number][]; edges: [number, number][] };

// Drei Sternbilder in die Randzonen gelegt (oben, Mitte-rechts, unten-links),
// damit der zentrale Urkunden-Bereich frei bleibt. Koordinaten im viewBox-Raum.
const CONSTELLATIONS: Constellation[] = [
  // W-Form oben
  {
    pts: [
      [70, 150],
      [120, 90],
      [175, 150],
      [230, 95],
      [285, 160],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  // Schöpfkellen-Form Mitte-rechts
  {
    pts: [
      [250, 380],
      [300, 360],
      [330, 400],
      [280, 420],
      [360, 350],
      [375, 305],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [2, 4],
      [4, 5],
    ],
  },
  // Drachen-Form unten-links
  {
    pts: [
      [70, 610],
      [130, 570],
      [160, 650],
      [95, 700],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 2],
    ],
  },
];

// Ein, zwei Sterne pro Sternbild etwas größer für Tiefe.
const BIGGER = new Set(["0-1", "1-4", "2-0"]);

export function Constellations() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 800"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      {CONSTELLATIONS.map((c, ci) => (
        <g key={ci}>
          {/* Verbindungslinien: Sage (Modulfarbe), sehr gedämpft + gestrichelt */}
          {c.edges.map(([a, b], ei) => (
            <line
              key={ei}
              x1={c.pts[a][0]}
              y1={c.pts[a][1]}
              x2={c.pts[b][0]}
              y2={c.pts[b][1]}
              stroke="var(--success)"
              strokeWidth={1}
              strokeDasharray="2 5"
              strokeLinecap="round"
              opacity={0.13}
            />
          ))}
          {/* Sterne: gedämpftes Foreground, statisch */}
          {c.pts.map(([x, y], pi) => (
            <circle
              key={pi}
              cx={x}
              cy={y}
              r={BIGGER.has(`${ci}-${pi}`) ? 2.4 : 1.8}
              fill="var(--foreground)"
              opacity={0.3}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
