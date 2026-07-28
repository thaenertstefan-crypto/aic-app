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
 * WICHTIG — was dieser Test NICHT abdeckt: WebKit auf Windows ist nicht
 * iOS Safari. backdrop-filter-Compositing, lvh/svh im Standalone-PWA-Modus
 * und das Fehlen der View-Transitions-API in der iOS-PWA lassen sich hier
 * nicht reproduzieren. Der Test fängt Layout, Abstände, Scroll-Position und
 * harte Render-Fehler — nicht die iOS-spezifischen Compositing-Bugs.
 */

import { mkdir, rm, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { webkit, devices } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

/** Routen, die ohne Vorbedingungen erreichbar sind. */
const DEFAULT_ROUTES = [
  "/dashboard",
  "/me",
  "/me/values",
  "/me/wants",
  "/me/wants/schmiede",
  "/me/bill-of-rights",
  "/booster",
  "/booster/confidence",
  "/booster/overthinking",
  "/booster/saying-no",
  "/booster/shadow",
  "/booster/things-got-messy",
  "/journal",
  "/profile",
  "/settings",
];

/** Routen ohne Login — werden vor dem Anmelden abgefahren. */
const PUBLIC_ROUTES = ["/login", "/signup"];

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
  const routes = arg("routes", "")
    ? arg("routes", "").split(",").map(normalize).filter((r) => r !== "/")
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

  async function visit(route, label) {
    errors = [];
    const name = (label ?? route).replace(/^\//, "").replace(/\//g, "_") || "root";
    let status = "ok";
    try {
      const res = await page.goto(`${base}${route}`, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
      if (res && res.status() >= 400) status = `HTTP ${res.status()}`;
      await page.waitForTimeout(SETTLE_MS);
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
    }
    // Redirect erkennen: wer nicht eingeloggt ist, landet auf /login.
    const landed = new URL(page.url()).pathname;
    results.push({ route, landed, status, errors: [...errors] });
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
    console.log(`${bad ? "✗" : "✓"} ${r.route}${redirected}   ${r.status}`);
    for (const e of r.errors.slice(0, 5)) console.log(`      ${e}`);
  }
  console.log(
    `\n${results.length - failed}/${results.length} Routen sauber gerendert.`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
