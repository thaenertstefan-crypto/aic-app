/** Bogenkreise des Siegelrands: 12 Kreise auf Radius 21 um (28,28). */
const SEAL_SCALLOPS = Array.from({ length: 12 }, (_, k) => {
  const rad = (Math.PI * (k * 30)) / 180;
  return {
    cx: +(28 + 21 * Math.cos(rad)).toFixed(2),
    cy: +(28 + 21 * Math.sin(rad)).toFixed(2),
  };
});

/**
 * Goldenes Wachssiegel mit §-Prägung, leicht schräg aufgedrückt — das Motiv der
 * Bill of Rights. Es thront frei über der Fläche, die es besiegelt, und
 * überlappt sie nie: die Urkunde auf `/me/bill-of-rights`, die Glaskarte der
 * Ergebnisseite von „Recht generieren".
 *
 * Der Schein ist ein statischer `drop-shadow` auf dem SVG selbst, keine
 * Opacity-Ebene — das ist der Grund, warum er über einer `backdrop-filter`-
 * Fläche auf iOS nicht geistert.
 *
 * Geschwister: [SealArt](../brand/me-ornaments.tsx) ist die Hub-Variante mit
 * Stempel-Einzug und pulsierendem Sage-Glühen; hier im Modul steht das Siegel
 * still.
 */
export function BillOfRightsSeal() {
  return (
    <svg
      viewBox="0 0 56 56"
      className="size-14 -rotate-6"
      style={{
        filter:
          "drop-shadow(0 0 10px color-mix(in srgb, var(--primary) 45%, transparent))",
      }}
      aria-hidden="true"
    >
      {SEAL_SCALLOPS.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r="4" fill="var(--primary)" opacity="0.9" />
      ))}
      <circle cx="28" cy="28" r="21" fill="var(--primary)" opacity="0.95" />
      <circle
        cx="28"
        cy="28"
        r="15"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="1"
        opacity="0.3"
      />
      <text
        x="28"
        y="34"
        textAnchor="middle"
        fontSize="17"
        fontFamily="var(--font-heading)"
        fontWeight="600"
        fill="var(--primary-foreground)"
      >
        §
      </text>
    </svg>
  );
}
