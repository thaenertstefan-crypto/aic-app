// scripts/check-transitions.mjs
// Motion-Gate gegen den Tailwind-v4-Footgun: `translate-`/`scale-`/`rotate-`
// kompilieren in TW v4 zu EIGENEN CSS-Properties (translate/scale/rotate), nicht
// zu `transform`. Wer sie bewegt, aber `transform` in `transition-[…]` listet,
// bekommt einen Sprung statt einer Animation. Dieses Gate flaggt genau diese
// Kombination. Exit 1 bei Verstößen. Vorbild: check-contrast.mjs.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["app", "components", "lib"];

// className-Ausdrücke laufen über mehrere Zeilen / durch cn() / Template-Literals,
// darum ein Zeichen-Fenster um den Treffer statt zeilenweise (mood-checkin:
// Transition und scale-105 stehen in verschiedenen Zeilen desselben className).
const WINDOW = 400;

// `transition-[…]`-Gruppe, deren Inhalt das Wort `transform` enthält.
const TRANSITION_TRANSFORM = /transition-\[[^\]]*transform[^\]]*\]/g;
// Bewegtes Utility (mit optionalem Prefix wie `active:`/`-`, arbitrary values ok).
const MOVING_UTILITY = /(?:^|[\s"'`{:])(-?(?:translate|scale|rotate)-[^\s"'`}]*)/;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
const violations = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(TRANSITION_TRANSFORM)) {
    const start = Math.max(0, m.index - WINDOW);
    const end = Math.min(src.length, m.index + m[0].length + WINDOW);
    const util = src.slice(start, end).match(MOVING_UTILITY);
    if (util) {
      violations.push({
        rel: relative(ROOT, file).replace(/\\/g, "/"),
        line: lineOf(src, m.index),
        transition: m[0],
        util: util[1],
      });
    }
  }
}

// ── Regel 2: die Bewegungs-Grammatik (KAN-30/KAN-53) ────────────────────
// Ein Übergang ist entweder ein FLUG (ein Gegenstand überlebt die Reise, das
// inszeniert ein Overlay) oder ein EINBLENDEN: ~200 ms reine Opacity, kein
// Slide. Ein Slide behauptet eine Richtung, die es zwischen zwei Nav-Tabs oder
// zwei Bühnen einer Übung nicht gibt.
//
// Geprüft wird der Routenbaum plus die geteilten Übungs-Bausteine. Das ist
// bewusst NICHT die ganze App: unter components/ liegen auch Widgets, die sich
// an Ort und Stelle aufdecken (eine Disclosure klappt auf, ein Wort tauscht,
// der Willkommens-Stagger nach dem Login) — das sind keine Übergänge von A
// nach B, und die Grammatik regiert sie nicht. Dieses Gate fängt also den
// Rückfall dort, wo Seiten und Bühnen tatsächlich geschrieben werden; ein
// Slide, den jemand in eine Widget-Datei schreibt, bleibt Sache des Reviews.
const GRAMMAR_DIRS = ["app", join("components", "recipes")];
// Der Slide, den die Grammatik abgeschafft hat — in jeder Distanz und Richtung.
const SLIDE_UTILITY = /(?:^|[\s"'`{:])(slide-in-from-[^\s"'`}]*)/g;

const grammarFiles = GRAMMAR_DIRS.flatMap((d) => walk(join(ROOT, d)));
const slides = [];

for (const file of grammarFiles) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(SLIDE_UTILITY)) {
    slides.push({
      rel: relative(ROOT, file).replace(/\\/g, "/"),
      line: lineOf(src, m.index),
      util: m[1],
    });
  }
}

if (violations.length === 0 && slides.length === 0) {
  console.log(`PASS  Motion-Gate: keine transition-[…transform…]-Footguns in ${files.length} .tsx-Dateien`);
  console.log(`PASS  Bewegungs-Grammatik: kein Slide auf Seiten und Bühnen in ${grammarFiles.length} .tsx-Dateien`);
  process.exit(0);
}

for (const v of violations) {
  console.log(`FAIL  ${v.rel}:${v.line}  ${v.transition} neben \`${v.util}\` — Transition muss die bewegte Property (translate/scale/rotate) nennen, nicht \`transform\``);
}
for (const s of slides) {
  console.log(`FAIL  ${s.rel}:${s.line}  \`${s.util}\` — Seiten und Bühnen blenden ein (Klasse \`einblenden\`), sie sliden nicht. Trägt ein Gegenstand die Reise mit, ist es ein Flug und gehört in ein Overlay.`);
}
process.exit(1);
