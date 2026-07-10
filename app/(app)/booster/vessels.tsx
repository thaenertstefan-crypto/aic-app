/**
 * Die Gefäße des Apotheken-Regals — je Booster eine eigene Silhouette
 * (Erlenmeyerkolben, Tiegel, Phiole, …) mit dem Modul-Motiv als „Essenz".
 * Handgebaute SVGs im Stil der /me-Ornamente (CompassArt, SealArt): Gold-
 * Linienzeichnung, eine langsame Mikro-Animation pro Gefäß (bs-*-Klassen,
 * reduced-motion-Fallback liegt zentral in globals.css). Alle teilen den
 * Koordinatenraum 0 0 56 64 und stehen unten auf ~y57, damit sie im Regal
 * auf einer Linie stehen.
 */

const STROKE = "var(--primary)";

function VesselSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 56 64" className="size-14" aria-hidden="true">
      {children}
    </svg>
  );
}

/** Overthinking — Erlenmeyerkolben, in dem eine Gedankenspirale schwingt. */
export function SpiralFlask() {
  return (
    <VesselSvg>
      <path d="M22,7 h12" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <path
        d="M24,7 v12 L13,46 a7,7 0 0 0 6.5,9.5 h17 a7,7 0 0 0 6.5,-9.5 L32,19 V7"
        fill="none"
        stroke={STROKE}
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <path
        d="M17.5,41.5 h21 l2.3,6 a5.5,5.5 0 0 1 -5.1,7 h-15.4 a5.5,5.5 0 0 1 -5.1,-7 z"
        fill={STROKE}
        opacity="0.16"
      />
      {/* Halbkreis-Spirale: jeder Bogen ist eine halbe Drehung mit kleinerem
          Radius (6 → 4.5 → 3 → 1.5), Endpunkt = Start + 2r. */}
      <path
        className="bs-sway"
        d="M22,47 a6,6 0 0 1 12,0 a4.5,4.5 0 0 1 -9,0 a3,3 0 0 1 6,0 a1.5,1.5 0 0 1 -3,0"
        fill="none"
        stroke={STROKE}
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.85"
      />
    </VesselSvg>
  );
}

/** Things Got Messy — bauchiger Vorratstiegel, das Gekrakel schwappt darin. */
export function MessyJar() {
  return (
    <VesselSvg>
      <circle cx="28" cy="8" r="2" fill={STROKE} opacity="0.65" />
      <rect x="17" y="11" width="22" height="4" rx="2" fill="none" stroke={STROKE} strokeWidth="1.3" opacity="0.55" />
      <path
        d="M17.5,15 c-5,6 -6,31 3,41 h15 c9,-10 8,-35 3,-41 z"
        fill="none"
        stroke={STROKE}
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <path
        d="M15.5,42 c1,7.5 3,11 6.5,13.5 h12 c3.5,-2.5 5.5,-6 6.5,-13.5 z"
        fill={STROKE}
        opacity="0.16"
      />
      <path
        className="bs-sway"
        d="M19,37 l5,-6 l4,8 l5,-9 l5,6"
        fill="none"
        stroke={STROKE}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </VesselSvg>
  );
}

/** Nein-Trainer — hohe, verkorkte Phiole; das × ist die dosierte Absage. */
export function NoVial() {
  return (
    <VesselSvg>
      <rect x="23.5" y="6" width="9" height="6" rx="1.2" fill={STROKE} opacity="0.65" />
      <rect x="21" y="12" width="14" height="45" rx="7" fill="none" stroke={STROKE} strokeWidth="1.4" opacity="0.55" />
      <rect x="23.5" y="36" width="9" height="18.5" rx="4.5" fill={STROKE} opacity="0.16" />
      <path d="M23.5,36 h9" stroke={STROKE} strokeWidth="1" opacity="0.4" />
      <g className="bs-glow">
        <path
          d="M24.5,23 l7,7 M31.5,23 l-7,7"
          stroke={STROKE}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>
    </VesselSvg>
  );
}

/** Schattenseite — offener Tiegel mit Mond-Essenz, Funken glimmen darüber. */
export function ShadowPot() {
  return (
    <VesselSvg>
      <circle className="bs-ember" cx="23" cy="27" r="1.3" fill={STROKE} opacity="0.9" />
      <circle className="bs-ember bs-ember-2" cx="33.5" cy="24.5" r="1" fill={STROKE} opacity="0.9" />
      <ellipse cx="28" cy="34" rx="14" ry="4.5" fill="none" stroke={STROKE} strokeWidth="1.4" opacity="0.55" />
      <path
        d="M14,34 c0,14 6.5,23 14,23 c7.5,0 14,-9 14,-23"
        fill={STROKE}
        fillOpacity="0.1"
        stroke={STROKE}
        strokeWidth="1.4"
        opacity="0.55"
      />
      <path
        d="M31.5,45.5 a5.8,5.8 0 1 1 -6.3,-6.3 a7.2,7.2 0 1 0 6.3,6.3"
        fill={STROKE}
        opacity="0.8"
      />
    </VesselSvg>
  );
}

/** Confidence-Boost — Rundkolben mit Lilac-Essenz, Bläschen steigen auf. */
export function ConfidenceFlask() {
  return (
    <VesselSvg>
      <path d="M23.5,7 h9" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <path
        d="M25.5,7 v13.5 a12.5,12.5 0 1 0 5,0 V7"
        fill="none"
        stroke={STROKE}
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <circle cx="28" cy="41.5" r="8.5" fill="var(--cleanser-confidence)" opacity="0.42" />
      <circle className="bs-bubble" cx="26" cy="44" r="1.4" fill="var(--cleanser-confidence)" opacity="0.9" />
      <circle className="bs-bubble bs-bubble-2" cx="30.5" cy="46" r="1" fill="var(--cleanser-confidence)" opacity="0.9" />
    </VesselSvg>
  );
}

/** Promise Keeper — kleines Vorratsglas, versiegelt mit einem Wachs-Haken
 *  (Familienähnlichkeit zum §-Siegel der Bill of Rights auf /me). */
export function PromiseJar() {
  return (
    <VesselSvg>
      <path d="M19,15 a9,7 0 0 1 18,0" fill="none" stroke={STROKE} strokeWidth="1.4" opacity="0.55" />
      <path d="M17.5,15 h21" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      <path
        d="M18.5,15 c-4,9 -4,32 3,41.5 h13 c7,-9.5 7,-32.5 3,-41.5"
        fill="none"
        stroke={STROKE}
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <g className="bs-glow">
        <circle cx="28" cy="38" r="7.5" fill={STROKE} opacity="0.95" />
        <path
          d="M24.6,38.2 l2.4,2.6 l4.6,-5.4"
          fill="none"
          stroke="var(--primary-foreground)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </VesselSvg>
  );
}
