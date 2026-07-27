/**
 * Atmosphärischer Grund des Kopfwetter-Hubs: ein wertungsfreier Tiefen-Verlauf,
 * damit die Druckzellen (siehe pressure-cell.tsx) nicht auf flachem Schwarz
 * schweben. Die Isobaren selbst leben jetzt pro Booster in den PressureCells;
 * dieser Hintergrund trägt nur noch die weiche Tiefe. Rein dekorativ.
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
    </svg>
  );
}
