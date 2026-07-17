/**
 * Die Wetter-Motive des Kopfwetter-Hubs — je Booster ein Ausschnitt des
 * Nachthimmels (Windwirbel, Wolkenbank, Schirm im Regen, …) statt der
 * früheren Gefäß-Ornamente. Handgebaute SVGs im Stil der /me-Ornamente:
 * Gold-Linienzeichnung, das lebendige Akzent-Element in Lilac (Kopfwetter-
 * Modulfarbe), eine langsame Mikro-Animation pro Motiv (bs-*-Klassen,
 * reduced-motion-Fallback liegt zentral in globals.css). Alle teilen den
 * Koordinatenraum 0 0 56 64 wie zuvor die Gefäße.
 */

const STROKE = "var(--primary)";
const ACCENT = "var(--cleanser-confidence)";

function WeatherSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 56 64" className="size-14" aria-hidden="true">
      {children}
    </svg>
  );
}

/** Overthinking — die Gedankenspirale als Windwirbel, Böen queren sie. */
export function WindSwirl() {
  return (
    <WeatherSvg>
      <path d="M7,20 h13" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      <path d="M36,52 h13" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      <path d="M40,16 h9" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.25" />
      {/* Halbkreis-Spirale wie im alten Kolben: halbe Drehungen mit
          schrumpfendem Radius (12 → 9 → 6 → 3), Endpunkt = Start + 2r. */}
      <path
        className="bs-sway"
        d="M16,36 a12,12 0 0 1 24,0 a9,9 0 0 1 -18,0 a6,6 0 0 1 12,0 a3,3 0 0 1 -6,0"
        fill="none"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </WeatherSvg>
  );
}

/** Things Got Messy — zwei schwere Wolkenbänke übereinander: alles zu viel. */
export function CloudStack() {
  return (
    <WeatherSvg>
      {/* Hintere Wolkenbank */}
      <g fill={STROKE} opacity="0.14">
        <circle cx="20" cy="22" r="7" />
        <circle cx="31" cy="19" r="8" />
        <circle cx="40" cy="24" r="6" />
        <rect x="13" y="21" width="33" height="8" rx="4" />
      </g>
      {/* Vordere, schwere Wolke — schwankt langsam */}
      <g className="bs-sway">
        <g fill={STROKE} opacity="0.3">
          <circle cx="19" cy="40" r="8" />
          <circle cx="30" cy="36" r="10" />
          <circle cx="39" cy="42" r="7" />
          <rect x="11" y="40" width="35" height="10" rx="5" />
        </g>
      </g>
      {/* Ein Lilac-Riss in der Wolkendecke — es bleibt Wetter, kein Zustand. */}
      <path className="bs-ember" d="M22,52 h12" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
    </WeatherSvg>
  );
}

/** Nein-Trainer — Schirm im Regen: die freundliche Grenze, an der es abperlt. */
export function UmbrellaRain() {
  return (
    <WeatherSvg>
      <path className="bs-rain" d="M10,10 l-1.5,5" stroke={ACCENT} strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      <path className="bs-rain bs-rain-2" d="M28,5 l-1.5,5" stroke={ACCENT} strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      <path className="bs-rain bs-rain-3" d="M45,11 l-1.5,5" stroke={ACCENT} strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      {/* Schirm: Spitze, Kuppel, Bogen-Saum, Stock mit Griff */}
      <path d="M28,17 v-4" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <path
        d="M10,35 a18,18 0 0 1 36,0"
        fill={STROKE}
        fillOpacity="0.16"
        stroke={STROKE}
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path d="M10,35 a6,6 0 0 0 12,0 a6,6 0 0 0 12,0 a6,6 0 0 0 12,0" fill="none" stroke={STROKE} strokeWidth="1.4" opacity="0.7" />
      <path d="M28,35 v16 a4.5,4.5 0 0 1 -9,0" fill="none" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
    </WeatherSvg>
  );
}

/** Schattenseite — Gewitterwolke, der Blitz ist die Entladung (Dampf ablassen). */
export function StormCloud() {
  return (
    <WeatherSvg>
      <g fill={STROKE} opacity="0.28">
        <circle cx="20" cy="26" r="8" />
        <circle cx="31" cy="22" r="9" />
        <circle cx="39" cy="28" r="6.5" />
        <rect x="12" y="26" width="33" height="9" rx="4.5" />
      </g>
      <path
        className="bs-ember"
        d="M30,37 l-6,10 h6 l-5,10"
        fill="none"
        stroke={ACCENT}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle className="bs-ember bs-ember-2" cx="38" cy="42" r="1.2" fill={ACCENT} opacity="0.9" />
    </WeatherSvg>
  );
}

/** Confidence-Boost — die Wolke zieht beiseite, dahinter steht der Stern schon. */
export function ClearingStar() {
  return (
    <WeatherSvg>
      <circle cx="16" cy="18" r="1.1" fill={STROKE} opacity="0.45" />
      <circle cx="24" cy="10" r="0.9" fill={STROKE} opacity="0.35" />
      {/* Vierzack-Stern (Lilac), glüht wie die alte Confidence-Essenz */}
      <g
        className="bs-glow"
        style={{ "--scene-glow": "var(--cleanser-confidence)" } as React.CSSProperties}
      >
        <path
          d="M36,12 l2.6,6.9 6.9,2.6 -6.9,2.6 -2.6,6.9 -2.6,-6.9 -6.9,-2.6 6.9,-2.6 z"
          fill={ACCENT}
          opacity="0.9"
        />
      </g>
      {/* Abziehende Wolke unten links */}
      <g fill={STROKE} opacity="0.2">
        <circle cx="17" cy="44" r="7.5" />
        <circle cx="27" cy="40" r="9" />
        <circle cx="35" cy="46" r="6" />
        <rect x="10" y="44" width="31" height="8.5" rx="4.25" />
      </g>
    </WeatherSvg>
  );
}
