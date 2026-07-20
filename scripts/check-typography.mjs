// scripts/check-typography.mjs
// Typografie-Gate für deutsche Anführungszeichen im GERENDERTEN Text: ein
// öffnendes „ (U+201E) muss mit " (U+201C) schließen, nicht mit ASCII-" (U+0022).
// Bewusst eng auf die User-facing Fläche begrenzt — JSX-Textknoten und die
// gerenderten Attribute (aria-label/title/placeholder/alt). Kommentare und
// KI-Prompt-Strings sind absichtlich ausgenommen: dort ist die Glyphe egal, und
// ein breites Gate würde >100 harmlose Stellen flaggen ohne einen echten Bug.
// Exit 1 bei Verstößen. Vorbild: check-contrast.mjs.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["app", "components", "lib"];

// „ (U+201E) … Inhalt ohne „ / " / ASCII-" … dann ASCII-" (U+0022) als Schließer.
const BAD = "„[^„“\"]*\"";
// Nur zählen, wenn dieses Muster in gerendertem Kontext steht:
const JSX_TEXT = new RegExp(`>[^<>]*${BAD}[^<>]*<`);
const RENDERED_ATTR = new RegExp(`(?:aria-label|title|placeholder|alt)=\\{?["\`][^"\`]*${BAD}`);
const BAD_RE = new RegExp(BAD);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
const violations = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // ganze Kommentarzeile überspringen
    if (!BAD_RE.test(line)) return;
    if (JSX_TEXT.test(line) || RENDERED_ATTR.test(line)) {
      const snippet = line.trim();
      violations.push({
        rel: relative(ROOT, file).replace(/\\/g, "/"),
        line: i + 1,
        snippet: snippet.length > 70 ? `${snippet.slice(0, 67)}…` : snippet,
      });
    }
  });
}

if (violations.length === 0) {
  console.log(`PASS  Typografie-Gate: kein ASCII-Schließzeichen nach „ im gerenderten Text (${files.length} Dateien)`);
  process.exit(0);
}

for (const v of violations) {
  console.log(`FAIL  ${v.rel}:${v.line}  ${v.snippet} — mit " (U+201C) schließen, nicht ASCII-"`);
}
process.exit(1);
