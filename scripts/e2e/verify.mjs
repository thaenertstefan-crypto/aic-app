/**
 * Visueller Smoke-Test gegen einen laufenden Dev- oder Prod-Server.
 *
 * Meldet sich einmal mit dem festen E2E-Account an (siehe .env.local) und
 * fährt danach eine Liste von Routen ab: pro Route ein Screenshot bei 375px
 * plus Mitschnitt von Console- und Page-Errors.
 *
 * Verwendung:
 *   npm run dev            # in einem zweiten Terminal
 *   npm run e2e
 *   npm run e2e -- --routes=/me/wants,/me/wants/schmiede
 *   npm run e2e -- --base=https://<deploy>.vercel.app
 *
 * ZUSTANDS-ZUSICHERUNG: Eine Route, die erfolgreich den FALSCHEN Zustand
 * rendert, war früher „ok". Genau daran ist am 29.07. ein grüner Lauf
 * vorbeigelaufen — /me/wants und /me/wants/schmiede meldeten „ok", auf dem Bild
 * standen aber die Intro-Sequenz und ein Leer-Zustand; die Sternenkarte, um die
 * es ging, war gar nicht zu sehen. Deshalb trägt jede Route optional einen
 * `expect`-Marker (muss sichtbar sein) und einen `reject`-Marker (darf NICHT
 * sichtbar sein), beide als `data-e2e`-Attribut im Markup. Bewusst Attribute
 * statt Textfragmente: die deutsche Copy ändert sich in diesem Projekt
 * ständig, Text-Marker würden bei jeder Copy-Runde brechen.
 *
 * Neben den Markern gibt es `noScroll` — die Zusicherung, dass eine Route in
 * die Fläche zwischen Safe-Area und Bottom-Nav passt und das Dokument gar
 * nicht erst höher wird als der Viewport. Ein Marker kann das nicht sagen:
 * Playwrights `isVisible()` heißt „im DOM und mit Fläche", nicht „im Bild" —
 * ein Button unter der Kante gilt dort als sichtbar. Genau daran ist KAN-64
 * vorbeigelaufen.
 *
 * WICHTIG — was dieser Test NICHT abdeckt: WebKit auf Windows ist nicht
 * iOS Safari. backdrop-filter-Compositing, lvh/svh im Standalone-PWA-Modus
 * und das Fehlen der View-Transitions-API in der iOS-PWA lassen sich hier
 * nicht reproduzieren. Der Test fängt Layout, Abstände, Scroll-Position und
 * harte Render-Fehler — nicht die iOS-spezifischen Compositing-Bugs.
 * Und Routen OHNE `expect` bleiben weiterhin reiner Smoke-Test: dass sie grün
 * sind, sagt nur, dass sie überhaupt gerendert haben.
 */

import { mkdir, rm, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { webkit, devices } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

/**
 * Routen, die ohne Vorbedingungen erreichbar sind.
 *
 * `expect` — `data-e2e`-Marker, der sichtbar sein MUSS. Fehlt er, ist die Route
 *   rot, auch wenn sie sauber gerendert hat.
 * `reject` — Marker, der NICHT sichtbar sein darf (typisch: die Erst-Intro-
 *   Sequenz, die den eigentlichen Inhalt verdeckt).
 * `noScroll` — das Dokument darf nicht höher werden als der Viewport. Nur für
 *   Routen, die wirklich nichts zu scrollen haben; eine Übung mit langem
 *   Inhalt scrollt zu Recht.
 * Ohne eine dieser drei Angaben bleibt es beim reinen Smoke-Test (Status +
 * Console-Fehler).
 *
 * Die Marker setzen einen bestückten Account voraus: `/me/wants` zeigt die
 * Sternenkarte nur mit Wants, `/me/wants/schmiede` den Funken-Himmel nur mit
 * offenen Funken. Genau das ist der Punkt — ohne Daten sagt der Lauf nichts
 * über Layout, und dann soll er das auch melden statt grün zu sein.
 */
const DEFAULT_ROUTES = [
  { path: "/dashboard", expect: "dashboard-focus" },
  { path: "/me" },
  { path: "/me/values", reject: "recipe-intro" },
  // Der Marker sitzt auf dem Bühnen-Container: er sagt zu, dass die Auswertung
  // wirklich eine ihrer vier Bühnen zeigt statt still auf /journal zu
  // redirecten (das passiert bei weniger als 7 Einträgen). Die einzelnen
  // Bühnen tragen zusätzlich `evaluation-rueckblick`,
  // `evaluation-erkenntnisse`, `evaluation-feier` und
  // `evaluation-erkenntnis-rueckblick`.
  { path: "/me/values/journey/evaluation", expect: "evaluation" },
  { path: "/me/wants", expect: "star-map", reject: "recipe-intro" },
  { path: "/me/wants/schmiede", expect: "funken-sky" },
  { path: "/me/bill-of-rights", reject: "recipe-intro" },
  // Der Funkenflug (KAN-61) darf im Ruhezustand NICHT stehen: er hat eine
  // Schwelle von 250 ms und erscheint nur, während wir an der KI hängen. Ein
  // sichtbarer Marker auf der frisch geladenen Seite hieße, dass ein
  // Wartezustand in den Ruhezustand geleckt ist.
  { path: "/me/bill-of-rights/generate", reject: "funkenflug" },
  { path: "/booster", expect: "booster-cells" },
  // Der Booster startet seit KAN-43 direkt im Wizard: `expect` sichert zu,
  // dass wirklich Schritt 1 steht, `reject`, dass es nicht die Erst-Intro ist.
  // Voraussetzung ist die `cleanser_intro_seen`-Zeile ("confidence-boost") des
  // E2E-Accounts — fehlt sie, ist der Lauf rot und die Ursache Datendrift.
  {
    path: "/booster/confidence",
    expect: "confidence-wizard",
    reject: "recipe-intro",
  },
  { path: "/booster/overthinking" },
  { path: "/booster/saying-no" },
  { path: "/booster/shadow" },
  { path: "/booster/things-got-messy" },
  // Die Filter-Tabs verschwinden, solange nichts zu filtern ist (KAN-63). Der
  // E2E-Account hat Einträge, also sichern die beiden Marker dieselbe Bedingung
  // von beiden Seiten: die Tabs müssen stehen, und das Logbuch darf nicht
  // erscheinen. Den leeren Zustand selbst sieht dieser Lauf naturgemäß nie.
  { path: "/journal", expect: "journal-tabs", reject: "journal-logbuch" },
  // Titel, Textarea und ein Button — die Seite hat nichts zu scrollen, und
  // „Eintrag speichern" muss ohne Scrollen erreichbar sein (KAN-64).
  { path: "/journal/new", noScroll: true },
  { path: "/profile" },
  { path: "/settings" },
];

/** Routen ohne Login — werden vor dem Anmelden abgefahren. */
const PUBLIC_ROUTES = [{ path: "/login" }, { path: "/signup" }];

/** Zeit nach dem Laden, damit Einblend-Animationen durchlaufen sind. */
const SETTLE_MS = 1200;

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

/** Liest E2E_EMAIL/E2E_PASSWORD aus .env.local, ohne dotenv-Abhängigkeit. */
async function loadEnv() {
  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) return;
  const raw = await readFile(path.join(ROOT, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

async function main() {
  await loadEnv();

  const base = arg("base", "http://localhost:3000").replace(/\/$/, "");
  const outDir = path.resolve(ROOT, arg("out", "scripts/e2e/shots"));
  // Git Bash (MSYS) bläht ein führendes "/foo" zu "C:/Program Files/Git/foo"
  // auf. Deshalb den Pfad-Anteil ab dem letzten "Git/" abschneiden und einen
  // fehlenden führenden Slash ergänzen — so funktioniert beides:
  //   --routes=/dashboard,/me/wants   und   --routes=dashboard,me/wants
  const normalize = (r) => {
    const cleaned = r.replace(/^.*[/\\]Git[/\\]/i, "").trim();
    return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  };
  // Per --routes übergebene Pfade erben die Marker aus DEFAULT_ROUTES, sofern
  // dort einer hinterlegt ist — sonst würde ein gezielter Einzel-Lauf die
  // Zusicherung stillschweigend verlieren.
  const routes = arg("routes", "")
    ? arg("routes", "")
        .split(",")
        .map(normalize)
        .filter((r) => r !== "/")
        .map((p) => DEFAULT_ROUTES.find((r) => r.path === p) ?? { path: p })
    : DEFAULT_ROUTES;

  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    console.error(
      "E2E_EMAIL/E2E_PASSWORD fehlen. Erwartet in .env.local oder als Umgebungsvariable.",
    );
    process.exit(2);
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const browser = await webkit.launch();
  const context = await browser.newContext({
    ...devices["iPhone 13 Mini"],
    viewport: { width: 375, height: 812 },
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();

  /** Pro Route gesammelte Fehler; wird vor jedem goto zurückgesetzt. */
  let errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });

  const results = [];

  /** Sichtbarkeit eines data-e2e-Markers, ohne auf ihn zu warten. */
  async function markerVisible(marker) {
    return page.locator(`[data-e2e="${marker}"]`).first().isVisible();
  }

  /** Wie viele px das Dokument höher ist als der Viewport (0 = kein Scroll). */
  async function scrollOverflow() {
    return page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
  }

  async function visit({ path: route, expect, reject, noScroll }) {
    errors = [];
    const name = route.replace(/^\//, "").replace(/\//g, "_") || "root";
    let status = "ok";
    // null = Route trägt keine Zusicherung, zählt also nicht als abgesichert.
    let asserted = expect || reject || noScroll ? true : null;
    try {
      const res = await page.goto(`${base}${route}`, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
      if (res && res.status() >= 400) status = `HTTP ${res.status()}`;
      await page.waitForTimeout(SETTLE_MS);

      // Zustands-Zusicherung VOR den Screenshots: schlägt sie fehl, zeigen die
      // Bilder trotzdem, was stattdessen zu sehen war — das ist die Diagnose.
      if (status === "ok" && reject && (await markerVisible(reject))) {
        status = `ZUSTAND: „${reject}" sichtbar — Route zeigt nicht ihren Inhalt`;
        asserted = false;
      }
      if (status === "ok" && expect && !(await markerVisible(expect))) {
        status = `ZUSTAND: „${expect}" fehlt`;
        asserted = false;
      }
      if (status === "ok" && noScroll) {
        // 1 px Toleranz gegen subpixel-Rundung an den Rahmen. Die Zahl ist die
        // Untergrenze, nicht das Maß: `env(safe-area-inset-*)` ist in diesem
        // WebKit 0, am Notch kommt der obere Inset noch obendrauf.
        const overflow = await scrollOverflow();
        if (overflow > 1) {
          status = `ZUSTAND: Seite ist ${overflow}px zu hoch und scrollt`;
          asserted = false;
        }
      }
      // Zwei Aufnahmen pro Route. Der Viewport-Shot zeigt, was auf dem Gerät
      // wirklich zu sehen ist — bei fullPage wandert die fixe Bottom-Nav ans
      // Seitenende und überdeckt dort Inhalt, was Abschneiden vortäuscht.
      await page.screenshot({ path: path.join(outDir, `${name}.png`) });
      await page.screenshot({
        path: path.join(outDir, `${name}.full.png`),
        fullPage: true,
      });
    } catch (err) {
      status = `FEHLER: ${err.message.split("\n")[0]}`;
      if (asserted !== null) asserted = false;
    }
    // Redirect erkennen: wer nicht eingeloggt ist, landet auf /login.
    const landed = new URL(page.url()).pathname;
    results.push({ route, landed, status, asserted, errors: [...errors] });
  }

  for (const route of PUBLIC_ROUTES) await visit(route);

  // Anmelden. Der Redirect nach dem Submit ist eine Server-Action.
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30_000,
    }),
    page.click('button[type="submit"]'),
  ]);

  for (const route of routes) await visit(route);

  await browser.close();

  // Bericht
  let failed = 0;
  console.log(`\nScreenshots: ${path.relative(ROOT, outDir)}\n`);
  for (const r of results) {
    const redirected = r.landed !== r.route ? `  → ${r.landed}` : "";
    const bad = r.status !== "ok" || r.errors.length > 0;
    if (bad) failed++;
    // „·" statt „✓": gerendert, aber ohne Zusicherung — reiner Smoke-Test.
    const glyph = bad ? "✗" : r.asserted ? "✓" : "·";
    console.log(`${glyph} ${r.route}${redirected}   ${r.status}`);
    for (const e of r.errors.slice(0, 5)) console.log(`      ${e}`);
  }

  // Zwei getrennte Zahlen. Nur die zweite sagt etwas darüber aus, ob die Seiten
  // das Richtige gezeigt haben — die erste sagt bloß, dass sie gerendert haben.
  const assertedOk = results.filter((r) => r.asserted === true).length;
  const assertedTotal = results.filter((r) => r.asserted !== null).length;
  console.log(
    `\n${results.length - failed}/${results.length} Routen sauber gerendert.`,
  );
  console.log(
    `${assertedOk}/${assertedTotal} Routen mit zugesichertem Zustand ` +
      `(${results.length - assertedTotal} nur Smoke-Test, mit „·" markiert).`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
