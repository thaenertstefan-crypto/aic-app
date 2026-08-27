/**
 * Stellt den Defekt aus KAN-69 im Test-Account nach: ein Journal, in dem die
 * Treffer eines Filters **ausschließlich jenseits der ersten Seite** liegen.
 *
 * Warum es dieses Skript braucht: der Defekt ist latent. Er zeigt sich erst ab
 * `JOURNAL_PAGE_SIZE + 1` Einträgen, und der Test-Account hat weniger. Ohne
 * Daten lässt sich weder der alte Fehler nachstellen noch die Reparatur
 * abnehmen — man sähe unter jedem Tab dasselbe wie vorher und wüsste nichts.
 *
 * Was es anlegt:
 *   - eine volle erste Seite freier Einträge mit **jungem** `created_at`,
 *   - eine Handvoll Schattenseite-Einträge mit **altem** `created_at`.
 *
 * Damit liegen die Schattenseite-Treffer garantiert hinter der ersten Seite
 * von „Alle". Vor der Reparatur sagte der Tab „In „Schattenseite" liegt noch
 * nichts." und rendert dazu kein „Mehr laden" — die Sackgasse. Danach zeigt er
 * die Einträge und eine Zählzeile, die den Bestand nennt.
 *
 * Meldet sich mit E2E_EMAIL/E2E_PASSWORD (aus .env.local) über den
 * öffentlichen anon key an; Row Level Security beschränkt jede Operation auf
 * genau diese eine User-id. Idempotent: ein zweiter Lauf legt nichts doppelt
 * an. Jede Zeile trägt `SEED_MARKER` im content, damit `--clean` exakt die
 * eigenen Zeilen trifft und nie einen echten Eintrag.
 *
 * Verwendung:
 *   node scripts/e2e/seed-journal-page-2.mjs
 *   node scripts/e2e/seed-journal-page-2.mjs --clean
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { JOURNAL_PAGE_SIZE } from "../../lib/journal/hub-state.ts";
import { recipeSlugFor } from "../../lib/utils/journal-recipe-slug.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

/**
 * Steht im content jeder angelegten Zeile. Er ist die einzige Handhabe für
 * `--clean` — deshalb ein Wortlaut, den kein Mensch je tippt.
 */
const SEED_MARKER = "e2e-seed:journal-page-2";

/** So viele Schattenseite-Einträge liegen hinter der ersten Seite. */
const SHADOW_COUNT = 3;

/** Ein Puffer über die Seitengröße hinaus, damit die erste Seite sicher voll ist. */
const FILLER_COUNT = JOURNAL_PAGE_SIZE + 5;

/**
 * Liest Supabase-URL/-Key + E2E-Zugangsdaten aus .env.local, ohne
 * dotenv-Abhängigkeit (analog zu scripts/e2e/verify.mjs loadEnv()).
 */
async function loadEnv() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.E2E_EMAIL &&
    process.env.E2E_PASSWORD
  ) {
    return;
  }
  // .env.local ist CRLF-terminiert (Windows) — auf \r?\n splitten, sonst
  // matcht das End-of-Line-`$` in der Regex nie.
  const raw = await readFile(path.join(ROOT, ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

/** Trägt die Zeile unseren Marker? `content` ist JSONB, also frei geformt. */
function isSeeded(row) {
  return JSON.stringify(row.content ?? {}).includes(SEED_MARKER);
}

async function main() {
  await loadEnv();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_EMAIL,
    password: process.env.E2E_PASSWORD,
  });
  if (authError) {
    console.error("Anmeldung fehlgeschlagen:", authError.message);
    process.exit(1);
  }
  const userId = auth.user.id;

  const { data: rows, error: readError } = await supabase
    .from("journal_entries")
    .select("id, content")
    .eq("user_id", userId);
  if (readError) {
    console.error("Lesefehler journal_entries:", readError.message);
    process.exit(1);
  }

  const seeded = (rows ?? []).filter(isSeeded);

  // ─── --clean: nur die eigenen Zeilen, nie einen echten Eintrag ──────
  if (process.argv.includes("--clean")) {
    if (seeded.length === 0) {
      console.log("Keine Seed-Zeilen gefunden — nichts zu tun.");
      return;
    }
    const { error: deleteError } = await supabase
      .from("journal_entries")
      .delete()
      .in("id", seeded.map((r) => r.id));
    if (deleteError) {
      console.error("Lösch-Fehler journal_entries:", deleteError.message);
      process.exit(1);
    }
    console.log(`${seeded.length} Seed-Zeilen entfernt.`);
    return;
  }

  // ─── Seeden ────────────────────────────────────────────────────────
  if (seeded.length > 0) {
    console.log(
      `${seeded.length} Seed-Zeilen bereits vorhanden — übersprungen. ` +
        "Zum Neuaufbau erst mit --clean räumen.",
    );
    return;
  }

  // Ein fester Bezugspunkt statt `Date.now()`: die Einträge sollen bei jedem
  // Lauf dieselben Daten tragen, damit ein Screenshot vergleichbar bleibt.
  const base = Date.parse("2026-08-20T12:00:00Z");
  const HOUR = 3_600_000;

  const shadowRows = Array.from({ length: SHADOW_COUNT }, (_, i) => ({
    user_id: userId,
    // Über `recipeSlugFor`, nicht als Literal: seit KAN-69 filtert die Liste
    // über `recipe_slug`, und der hilfsweise Match im Client ist weg. Damit
    // trägt der Slug die Zuordnung allein — ein getipptes Literal hier wäre
    // eine zweite, stille Wahrheit.
    recipe_slug: recipeSlugFor("shadow"),
    template_type: "shadow",
    entry_date: "2026-08-01",
    // Alt: diese Einträge müssen hinter die erste Seite rutschen.
    created_at: new Date(base - (100 - i) * HOUR).toISOString(),
    content: { note: `${SEED_MARKER} — Schattenseite ${i + 1}` },
  }));

  const fillerRows = Array.from({ length: FILLER_COUNT }, (_, i) => ({
    user_id: userId,
    recipe_slug: recipeSlugFor("free"),
    template_type: "free",
    entry_date: "2026-08-20",
    // Jung: diese Einträge füllen die erste Seite von „Alle".
    created_at: new Date(base + i * 60_000).toISOString(),
    content: {
      title: `${SEED_MARKER} — Füllzeile ${i + 1}`,
      body: `Ein freier Eintrag, der die erste Seite füllt. ${SEED_MARKER}`,
    },
  }));

  const { error: insertError } = await supabase
    .from("journal_entries")
    .insert([...shadowRows, ...fillerRows]);
  if (insertError) {
    console.error("Insert-Fehler journal_entries:", insertError.message);
    process.exit(1);
  }

  console.log(
    `${fillerRows.length} freie Füll-Einträge und ${shadowRows.length} ` +
      "Schattenseite-Einträge angelegt.",
  );
  console.log(
    `Seitengröße ist ${JOURNAL_PAGE_SIZE} — die Schattenseite-Treffer liegen ` +
      "damit vollständig hinter der ersten Seite.",
  );
  console.log("Aufräumen: node scripts/e2e/seed-journal-page-2.mjs --clean");
}

await main();
