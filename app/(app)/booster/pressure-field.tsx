/**
 * Atmosphärischer Grund des Kopfwetter-Hubs: eine sichtbare synoptische
 * Druckkarte. Glühende Gold-Isobaren durchziehen die Fläche und binden die
 * Wettersysteme zu EINER Wetterlage; eine driftende Lilac-Front und ein
 * sanfter, wertungsfreier Tiefenverlauf geben Räumlichkeit. Rein dekorativ.
 *
 * preserveAspectRatio="none" streckt den 100×100-Raum auf die (dynamische)
 * Container-Höhe; vector-effect="non-scaling-stroke" hält die Linien dabei
 * sauber (keine Strichverzerrung). Der Glow läuft über die pixelbasierte
 * CSS-Utility .iso-glow. Front-Drift = bs-sway (reduced-motion-Fallback
 * liegt zentral in globals.css).
 */
export function PressureField() {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <defs>
        <linearGradient id="kw-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--background)" stopOpacity="0" />
          <stop offset="100%" stopColor="#0f0c1a" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Wertungsfreier Tiefenverlauf — kein „schlecht→gut"-Gefälle */}
      <rect x="0" y="0" width="100" height="100" fill="url(#kw-depth)" />

      {/* Isobaren — glühende, fast-vertikale Gold-Linien, die die Systeme binden */}
      <g
        className="iso-glow"
        fill="none"
        stroke="var(--primary)"
        strokeOpacity="0.4"
        strokeWidth="1.1"
      >
        <path d="M18,-4 C 30,25 8,55 22,104" vectorEffect="non-scaling-stroke" />
        <path d="M40,-4 C 54,28 34,60 46,104" vectorEffect="non-scaling-stroke" />
        <path d="M62,-4 C 74,24 58,58 70,104" vectorEffect="non-scaling-stroke" />
        <path d="M84,-4 C 94,30 80,62 90,104" vectorEffect="non-scaling-stroke" />
      </g>

      {/* Lilac-Front, driftet langsam quer */}
      <path
        className="bs-sway"
        d="M-4,30 Q 40,14 104,26"
        fill="none"
        stroke="var(--cleanser-confidence)"
        strokeOpacity="0.5"
        strokeWidth="1.2"
        strokeDasharray="1 3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
