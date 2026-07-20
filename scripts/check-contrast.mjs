// scripts/check-contrast.mjs
// Kontrast-Gate für das Token-System: parst app/globals.css (:root) und prüft
// die Kernpaarungen der Spec „Kerze anzünden". Exit 1 bei Verstößen.
import { readFileSync } from "node:fs";

// Oberer Endpunkt des Body-Verlaufs (lebt visuell in app-backdrop.tsx —
// hier gespiegelt, damit das Gate ihn mitprüft).
export const GRADIENT_TOP = "#131020";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const root = css.match(/:root\s*\{([\s\S]*?)\}/)[1];
const token = (name) => {
  const m = root.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`Token --${name} nicht als Hex in :root gefunden`);
  return m[1];
};

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const lum = ([r, g, b]) => {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const cr = (a, b) => {
  const [hi, lo] = [lum(hex(a)), lum(hex(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const bg = token("background"), card = token("card"),
  fg = token("foreground"), mutedFg = token("muted-foreground"),
  primary = token("primary"), primaryFg = token("primary-foreground"),
  destructiveText = token("destructive-text");

const checks = [
  ["Card vs. Verlauf oben (Flächen-Schritt)", cr(card, GRADIENT_TOP), 1.29],
  ["Card vs. Background (Flächen-Schritt)", cr(card, bg), 1.29],
  ["Moonlight auf Card (Body-Text)", cr(fg, card), 4.5],
  ["Lavender auf Card (Sekundär-Text)", cr(mutedFg, card), 4.5],
  ["Gold-Ink auf Gold (CTA-Text)", cr(primaryFg, primary), 4.5],
  ["Gold auf Background (CTA-Fläche)", cr(primary, bg), 3.0],
  ["Gold auf Card (CTA auf Karte)", cr(primary, card), 3.0],
  // Solide Card als Proxy für die getönte bg-destructive/10-Fläche des aktiven
  // „Ersetzen"-Toggles (liegt minimal darüber, also konservativ).
  ["Destructive-Text auf Card (Ersetzen-Toggle)", cr(destructiveText, card), 4.5],
];

let failed = false;
for (const [name, ratio, min] of checks) {
  const ok = ratio >= min;
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${ratio.toFixed(2)}:1 (min ${min}:1)`);
}
process.exit(failed ? 1 : 0);
