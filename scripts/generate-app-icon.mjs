// Generiert die PWA-App-Icons für „Anti Imposter Club" aus einem handgeschriebenen
// Master-SVG (1024×1024) und rastert sie mit @resvg/resvg-js zu statischen PNGs.
//
//   node scripts/generate-app-icon.mjs
//
// Optik-Referenzen im Code:
//   - Farben / Blob-Optik:   components/ui/app-backdrop.tsx, app/globals.css (:root)
//   - Wordmark-Stil:         components/brand/logo.tsx (font-heading font-bold tracking-tight)
//   - Maskottchen-Geometrie: components/brand/mascot.tsx (Blob, Gesicht, Aura, „curious")

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Marken-Tokens (aus app/globals.css) ─────────────────────────────────────
const AUBERGINE = "#1B1726"; // --background
const GOLD = "#E7B65E"; // --primary
const ROSE = "#C97B84"; // --celebrate
const INK = "#F3EFFA"; // --foreground (Wordmark)
const SCLERA = "#FBF6EA"; // Augen-Weiß
const PUPIL = "#2B1B06"; // --primary-foreground (Pupillen/Mund)

const SIZE = 1024; // Master-Koordinatenraum
const CENTER = SIZE / 2;

// Fraunces-700 (Family-Name "Fraunces") wird resvg per fontFiles übergeben —
// deterministisch, unabhängig von System-Fonts.
const FONT_PATH = resolve(__dirname, "assets", "Fraunces-Bold.ttf");

// ── Maskottchen-Blob-Pfad ───────────────────────────────────────────────────
// Nachbau von BLOB_RADIUS "58% 42% 55% 45% / 48% 52% 45% 55%" (mascot.tsx) als
// SVG-Pfad im 64×64-Raum. Ecken: (horizontaler, vertikaler) Radius je Ecke.
function blobPath() {
  const S = 64;
  const TLx = 0.58 * S,
    TLy = 0.48 * S;
  const TRx = 0.42 * S,
    TRy = 0.52 * S;
  const BRx = 0.55 * S,
    BRy = 0.45 * S;
  const BLx = 0.45 * S,
    BLy = 0.55 * S;
  return [
    `M ${TLx} 0`,
    `L ${S - TRx} 0`,
    `A ${TRx} ${TRy} 0 0 1 ${S} ${TRy}`,
    `L ${S} ${S - BRy}`,
    `A ${BRx} ${BRy} 0 0 1 ${S - BRx} ${S}`,
    `L ${BLx} ${S}`,
    `A ${BLx} ${BLy} 0 0 1 0 ${S - BLy}`,
    `L 0 ${TLy}`,
    `A ${TLx} ${TLy} 0 0 1 ${TLx} 0`,
    "Z",
  ].join(" ");
}

// Maskottchen (64×64-Raum), Ausdruck „curious", Blick nach oben zum Logo.
function mascotFace() {
  const EYE_X = 22;
  const gazeX = 0;
  const gazeY = -3.5; // Blick hoch
  const dx = 0,
    dy = -0.5; // curious
  const MOUTH_DY = 5;
  const px = (x) => x + dx + gazeX;
  const py = 27 + dy + gazeY;
  return `
    <!-- Wangen (celebrate, dezent) -->
    <ellipse cx="10" cy="34" rx="7" ry="6" fill="${ROSE}" opacity="0.12"/>
    <ellipse cx="54" cy="34" rx="7" ry="6" fill="${ROSE}" opacity="0.12"/>
    <!-- Augen -->
    <circle cx="${EYE_X}" cy="27" r="7" fill="${SCLERA}"/>
    <circle cx="${64 - EYE_X}" cy="27" r="7" fill="${SCLERA}"/>
    <circle cx="${px(EYE_X)}" cy="${py}" r="4" fill="${PUPIL}"/>
    <circle cx="${px(64 - EYE_X)}" cy="${py}" r="4" fill="${PUPIL}"/>
    <circle cx="${px(EYE_X) - 1.3}" cy="${py - 1.3}" r="1.3" fill="#fff"/>
    <circle cx="${px(64 - EYE_X) - 1.3}" cy="${py - 1.3}" r="1.3" fill="#fff"/>
    <!-- Mund (curious) -->
    <path d="M24,37 Q32,40 40,37" transform="translate(0 ${MOUTH_DY})"
      stroke="${PUPIL}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
  `;
}

// ── Master-SVG ──────────────────────────────────────────────────────────────
function buildSvg({ maskable }) {
  const s = maskable ? 0.8 : 1.0; // maskable: Vordergrund in die Safe-Zone
  const fg = `translate(${CENTER} ${CENTER}) scale(${s}) translate(${-CENTER} ${-CENTER})`;

  // Maskottchen im 64-Raum → Master-Raum. Breite ~384px, unten mittig verankert,
  // so tief, dass die untere Hälfte über den Boden (y=SIZE) ragt und geclippt wird.
  const k = 10.8; // 64 * 10.8 ≈ 691px
  const mx = CENTER - 32 * k; // x=32 → Mitte
  const my = SIZE - 40 * k; // y=40 sitzt auf dem Boden → obere ~62% sichtbar
  const mascotXf = `translate(${mx} ${my}) scale(${k})`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
    <clipPath id="blobClip"><path d="${blobPath()}"/></clipPath>
  </defs>

  <!-- Auberginen-Hintergrund, randlos & einfarbig -->
  <rect width="${SIZE}" height="${SIZE}" fill="${AUBERGINE}"/>

  <!-- Vordergrund (bei maskable in die Safe-Zone skaliert) -->
  <g transform="${fg}">
    <!-- Wordmark: großes „AIC" -->
    <g fill="${INK}" font-family="Fraunces" font-weight="700" text-anchor="middle">
      <text x="${CENTER}" y="400" font-size="320" letter-spacing="-6">AIC</text>
    </g>

    <!-- Maskottchen: von unten halb angeschnitten, Blick nach oben -->
    <g transform="${mascotXf}">
      <!-- Gold-Aura hinter dem Blob (dezenter Glow) -->
      <path d="${blobPath()}" fill="${GOLD}" opacity="0.22" filter="url(#soft)"
        transform="translate(-3 -3) scale(1.09)"/>
      <!-- Blob-Körper: voll gold -->
      <path d="${blobPath()}" fill="${GOLD}"
        stroke="rgba(255,255,255,0.24)" stroke-width="1"/>
      <!-- Gesicht, vom Blob beschnitten -->
      <g clip-path="url(#blobClip)">${mascotFace()}</g>
    </g>
  </g>
</svg>`;
}

// ── Rasterung ───────────────────────────────────────────────────────────────
function renderPng(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    font: { fontFiles: [FONT_PATH], loadSystemFonts: false, defaultFontFamily: "Fraunces" },
    background: AUBERGINE,
  });
  return resvg.render().asPng();
}

const anySvg = buildSvg({ maskable: false });
const maskableSvg = buildSvg({ maskable: true });

const outputs = [
  { svg: anySvg, size: 192, path: "public/icons/web-app-manifest-192x192.png" },
  { svg: anySvg, size: 512, path: "public/icons/web-app-manifest-512x512.png" },
  { svg: maskableSvg, size: 512, path: "public/icons/web-app-manifest-maskable-512x512.png" },
  { svg: anySvg, size: 180, path: "public/icons/apple-icon-180.png" },
];

for (const { svg, size, path } of outputs) {
  const out = resolve(ROOT, path);
  writeFileSync(out, renderPng(svg, size));
  console.log(`✓ ${path} (${size}×${size})`);
}
console.log("Fertig.");
