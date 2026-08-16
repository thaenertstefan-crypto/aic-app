/**
 * Befüllt den festen E2E-Test-Account mit einer vollständigen Werte-Woche,
 * damit /me/values/journey/evaluation nicht auf /me/values/journey/journal
 * redirected (siehe lib/recipes/values/actions.ts getEvaluationData()
 * + app/(app)/me/values/journey/evaluation/page.tsx):
 *
 *   - Redirect passiert, wenn weniger als 7 journal_entries mit
 *     recipe_slug="values" + template_type="daily_value" existieren
 *     (page.tsx: `if (data.entries.length < 7) redirect(...)`).
 *   - getEvaluationData() liest dafür die neuesten 7 Zeilen (order by
 *     created_at desc, limit 7) — ein reiner Zeilen-Count, keine
 *     Datums-Dedupe. Die Journey-Übersicht (me/values/journey/page.tsx)
 *     zählt für die Stufen-Anzeige zusätzlich DISTINCT entry_date, daher
 *     seedet dieses Skript 7 Einträge mit 7 unterschiedlichen Tagen, nicht
 *     nur 7 Zeilen.
 *   - Zusätzlich legt es eine Werte-Hypothese (values_hypothesis, 5 Werte
 *     aus der Werte-Bank) an, weil die Auswertung ohne Hypothese zwar nicht
 *     redirected, aber inhaltlich eine leere Werte-Liste zeigen würde — ein
 *     echter Nutzer hat an diesem Punkt der Übung immer eine Hypothese.
 *
 * Meldet sich mit E2E_EMAIL/E2E_PASSWORD (aus .env.local) über den
 * öffentlichen anon key an. Row Level Security beschränkt daraufhin jede
 * Operation auf genau diese eine User-id — das Skript sieht (und berührt)
 * keine Daten anderer User. Idempotent: bestehende Hypothese/Einträge
 * werden übersprungen statt dupliziert. Kein delete/truncate — nur Insert.
 *
 * Verwendung:
 *   node scripts/e2e/seed-values-week.mjs
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

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
  const raw = await readFile(path.join(ROOT, ".env.local"), "utf8");
  // .env.local ist CRLF-terminiert (Windows) — auf \r?\n splitten, sonst
  // matcht das End-of-Line-`$` in der Regex nie (trailing \r zählt in JS als
  // eigener Line-Terminator, den `.` nicht konsumiert).
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

/** 5 Werte-ids aus lib/utils/values-bank.ts (VALUES_BANK) für die Hypothese. */
const HYPOTHESIS_VALUE_IDS = [
  "authenticity",
  "self-compassion",
  "courage",
  "connection",
  "growth",
];

/**
 * 7 warme, unterschiedliche Reflexions-Einträge (chronologisch, ältester
 * zuerst) — jeder eine kleine, plausible Alltagsszene mit einem Werte-Bezug,
 * keine Platzhaltertexte.
 */
const DAILY_ENTRIES = [
  "Im Meeting habe ich meine Meinung gesagt, obwohl ich sonst eher abgewartet hätte, was die anderen zuerst sagen. Danach war ich stolz auf mich, auch wenn kurz die Stimme im Kopf kam, ich hätte lieber still bleiben sollen.",
  "Meine Schwester hat angerufen, mitten im Stress, und ich habe mir trotzdem die Zeit genommen zuzuhören, ohne auf die Uhr zu schauen. Danach hat sich der ganze Nachmittag ruhiger angefühlt.",
  "Ich habe einen Fehler im Bericht gefunden, den ich schon abgeschickt hatte, und bin direkt zu meiner Chefin gegangen, statt es stillschweigend zu korrigieren. Es war unangenehm, aber ich fühle mich ehrlicher mit mir selbst.",
  "Nach der Arbeit wollte ich eigentlich noch drei weitere Aufgaben erledigen, habe mich dann aber bewusst aufs Sofa gesetzt und nichts getan. Das schlechte Gewissen kam trotzdem kurz vorbei, ist aber auch wieder gegangen.",
  "Ein Kollege hat meine Idee ziemlich direkt kritisiert, und mein erster Impuls war, mich zu rechtfertigen. Stattdessen habe ich tief durchgeatmet und gefragt, was genau er meint. Das Gespräch danach war klarer als sonst.",
  "Ich habe mich für den Kurs angemeldet, den ich mir schon lange nicht zugetraut habe. Beim Klick auf „Anmelden“ war die Angst da, aber auch eine Neugier, die am Ende stärker war.",
  "Am Wochenende habe ich spontan Freunde eingeladen, obwohl die Wohnung nicht aufgeräumt war. Am Ende war es der schönste Abend seit Wochen — niemand hat das Chaos überhaupt bemerkt.",
];

function utcDateKey(date) {
  return date.toISOString().slice(0, 10);
}

/** Kandidaten-Tage, jüngster zuerst: gestern, vorgestern, … (bis zu `count`). */
function recentDayCandidates(count) {
  const out = [];
  const base = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - i);
    out.push(utcDateKey(d));
  }
  return out;
}

async function main() {
  await loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!url || !anonKey || !email || !password) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / E2E_EMAIL / E2E_PASSWORD fehlen. Erwartet in .env.local.",
    );
    process.exit(2);
  }

  const supabase = createClient(url, anonKey);

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });
  if (signInError || !signInData.user) {
    console.error("Login fehlgeschlagen:", signInError?.message ?? "kein User zurückgegeben");
    process.exit(1);
  }
  const userId = signInData.user.id;
  console.log(`Angemeldet als ${email} (user_id ${userId}).`);

  // ─── 1) Werte-Hypothese ─────────────────────────────────────────────
  const { data: existingHyp, error: hypReadError } = await supabase
    .from("values_hypothesis")
    .select("id, values, version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (hypReadError) {
    console.error("Lesefehler values_hypothesis:", hypReadError.message);
    process.exit(1);
  }

  if (existingHyp) {
    const n = Array.isArray(existingHyp.values) ? existingHyp.values.length : "?";
    console.log(
      `Werte-Hypothese bereits vorhanden (Version ${existingHyp.version}, ${n} Werte) — übersprungen.`,
    );
  } else {
    const { error: hypInsertError } = await supabase.from("values_hypothesis").insert({
      user_id: userId,
      values: HYPOTHESIS_VALUE_IDS,
      version: 1,
      confirmed: true,
    });
    if (hypInsertError) {
      console.error("Insert-Fehler values_hypothesis:", hypInsertError.message);
      process.exit(1);
    }
    console.log(`Werte-Hypothese angelegt: ${HYPOTHESIS_VALUE_IDS.join(", ")}.`);
  }

  // ─── 2) 7 Reflexions-Einträge (daily_value) ────────────────────────
  const { data: existingEntries, error: entriesReadError } = await supabase
    .from("journal_entries")
    .select("id, entry_date")
    .eq("user_id", userId)
    .eq("recipe_slug", "values")
    .eq("template_type", "daily_value");
  if (entriesReadError) {
    console.error("Lesefehler journal_entries:", entriesReadError.message);
    process.exit(1);
  }

  const existingCount = existingEntries?.length ?? 0;
  const existingDates = new Set((existingEntries ?? []).map((e) => e.entry_date));
  console.log(
    `${existingCount} bestehende Reflexions-Einträge gefunden (${existingDates.size} unterschiedliche Tage).`,
  );

  const need = Math.max(0, 7 - existingCount);
  let insertedCount = 0;

  if (need === 0) {
    console.log("Bereits 7 oder mehr Einträge vorhanden — keine neuen Einträge nötig.");
  } else {
    // Kandidaten-Pool großzügig wählen (30 Tage zurück), damit auch dann
    // genug freie Tage übrig bleiben, wenn einzelne Tage im Zielfenster
    // schon belegt sind.
    const candidates = recentDayCandidates(30)
      .filter((d) => !existingDates.has(d))
      .reverse(); // älteste zuerst, für eine chronologisch aufsteigende Woche

    const datesToInsert = candidates.slice(0, need);

    if (datesToInsert.length < need) {
      console.error(
        `Konnte nur ${datesToInsert.length} von ${need} benötigten freien Tagen finden — Skript bricht ab, statt unvollständig zu seeden.`,
      );
      process.exit(1);
    }

    const rows = datesToInsert.map((entry_date, i) => ({
      user_id: userId,
      recipe_slug: "values",
      template_type: "daily_value",
      entry_date,
      content: { happenings: DAILY_ENTRIES[i % DAILY_ENTRIES.length] },
    }));

    const { error: insertError } = await supabase.from("journal_entries").insert(rows);
    if (insertError) {
      console.error("Insert-Fehler journal_entries:", insertError.message);
      process.exit(1);
    }
    insertedCount = rows.length;
    console.log(
      `${rows.length} neue Reflexions-Einträge angelegt (${datesToInsert[0]} … ${datesToInsert[datesToInsert.length - 1]}).`,
    );
  }

  console.log(
    `Fertig. Insgesamt ${existingCount + insertedCount} Reflexions-Einträge für die Werte-Übung (Ziel: ≥ 7).`,
  );

  await supabase.auth.signOut();
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});
