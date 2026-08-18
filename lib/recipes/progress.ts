/**
 * Der eine Weg zur Fortschritts-Zeile — Lesen, Schreiben und die zwei Fragen,
 * die eine Liste solcher Zeilen beantworten kann.
 *
 * `user_recipe_progress` wurde an 43 Stellen in 13 Dateien angefasst, und
 * neunmal stand derselbe Tanz: die jüngste Zeile per
 * `order("cycle_number").limit(1).maybeSingle()` holen, existiert sie per `id`
 * updaten, sonst mit `started_at` und `cycle_number: 1` inserten. Neunmal
 * dieselbe Reihenfolge, neunmal eine eigene Schreibweise — und in einer davon
 * ein wörtlich mitkopierter Kommentar, der auf `startRecipeAction` verwies, eine
 * Funktion, die es längst nicht mehr gibt.
 *
 * **`order("cycle_number").limit(1)` ist keine Zier.** Seit `startNewCycleAction`
 * eine zweite Zeile pro Slug anlegt, ist „irgendeine Zeile" der falsche
 * Durchlauf — dieselbe Defektklasse wie KAN-19 bis KAN-22. Wer hier liest,
 * bekommt die Sortierung geschenkt, statt sie mitschreiben zu müssen.
 *
 * **Was NICHT hier steht:** was „Rezept abgeschlossen" heißt. Das ist bei
 * Shadow `current_step: 1`, bei Overthinking `8`, bei Wants gar nichts — die
 * Form der Übung, und die bleibt bei der Übung (ADR-0001). Dieses Modul kennt
 * nur die Zeile, nicht die Bedeutung ihrer Felder.
 *
 * **Rein im Sinne der Testregel bleibt nur die untere Hälfte.** `latestPerSlug`
 * und `everCompletedSlugs` haben ihren Test daneben. Die drei IO-Funktionen
 * haben keinen — sie brauchen Supabase. Damit `node --test` die Datei trotzdem
 * laden kann, kommt hier kein unreiner Import zur Laufzeit an: `ActionContext`
 * als `import type`, Supabase über `ctx.supabase`, `ok`/`dbFailed` aus dem
 * ausdrücklich reinen `action-result.ts`.
 */

import type { ActionContext } from "../actions/with-user.ts";
import { dbFailed, ok, type ActionResult } from "../actions/action-result.ts";
import type { Tables, TablesUpdate } from "../supabase/database.types.ts";

/** Die Tabelle — einmal benannt, damit `dbFailed` überall denselben Kontext trägt. */
const TABLE = "user_recipe_progress";

/**
 * Die gelesene Zeile — `null`, wenn es für den Slug noch keine gibt.
 *
 * Bewusst die **ganze** Zeile und kein konfigurierbarer Select: die neun
 * Aufrufstellen lasen sieben verschiedene Spaltenlisten (`"id"`,
 * `"id, status"`, `"started_at, id"`, `"status, cycle_number"`, …), und jede
 * war eine Gelegenheit, die eine Spalte zu vergessen, an der die eigene Regel
 * hängt. Eine Zeile dieser Tabelle ist neun schmale Spalten; sie ganz zu holen
 * kostet nichts, was das Nachdenken darüber wert wäre.
 */
export type ProgressRow = Tables<typeof TABLE> | null;

/**
 * Die zu schreibende Nutzlast, oder `null` für „die Zeile bleibt unangetastet".
 *
 * Es ist **eine** Nutzlast für beide Fälle: gibt es eine Zeile, ist sie der
 * Update-Patch; gibt es keine, sind es die Felder der neuen Zeile.
 */
export type ProgressWrite = TablesUpdate<typeof TABLE> | null;

/**
 * Was nach diesem Vorgang in der Zeile stehen soll — entschieden aus dem, was
 * schon drinsteht.
 *
 * Eine Funktion statt eines fertigen Objekts, weil fünf der neun Aufrufstellen
 * die bestehende Zeile brauchen, um zu entscheiden: Wants und Bill of Rights
 * lesen `status`, Schritt 1 der Werte `started_at`, das Journal `current_step`,
 * das Intro-Gate schreibt beim Anlegen etwas anderes als beim Ändern. Dass der
 * Zeitstempel mitkommt, ist der zweite Grund: vorher rief eine einzige Action
 * `new Date().toISOString()` bis zu dreimal auf, sodass `started_at` und
 * `completed_at` derselben Zeile um Millisekunden auseinanderlagen.
 */
export type ProgressWriter = (row: ProgressRow, now: string) => ProgressWrite;

/**
 * Die jüngste Fortschritts-Zeile eines Slugs — der laufende Durchlauf.
 *
 * Kein `ActionResult`: für einen **lesenden** Aufrufer sind ein Lesefehler und
 * „es gibt noch keine Zeile" dieselbe Antwort (`null`) — er zeigt dann den
 * Anfangszustand. Genau so lasen es die neun Stellen vorher auch, alle mit
 * verworfenem `error`.
 *
 * Für einen **schreibenden** Aufrufer sind die beiden Fälle nicht dasselbe;
 * `writeProgress` nimmt darum `selectLatest` und prüft den Fehler.
 */
export async function readProgress(
  ctx: ActionContext,
  slug: string,
): Promise<ProgressRow> {
  return (await selectLatest(ctx, slug)).data;
}

/**
 * Derselbe Query, aber mit dem Lesefehler — nur `writeProgress` braucht ihn.
 *
 * Der Unterschied ist nicht kosmetisch: **ein verschluckter Lesefehler sieht
 * aus wie „es gibt noch keine Zeile"**, und der Schreiber unten leitet daraus
 * ab, dass er inserten muss. Eine kurze Störung legte damit eine zweite Zeile
 * an, statt die vorhandene zu ändern — ein zweiter Durchlauf, den niemand
 * begonnen hat. Das Loch stand vorher an allen neun Aufrufstellen; hier ist es
 * einmal zugemacht.
 */
function selectLatest({ supabase, user }: ActionContext, slug: string) {
  return supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", user.id)
    .eq("recipe_slug", slug)
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();
}

/**
 * Alle Fortschritts-Zeilen des Users, über alle Slugs und Durchläufe hinweg —
 * eine Abfrage für die Flächen, die den Gesamtstand zeigen (Dashboard,
 * Einstellungen).
 *
 * Was daraus folgt, beantworten `latestPerSlug` und `everCompletedSlugs`; die
 * sind rein und getestet.
 *
 * **Wirft bei einem echten Lesefehler** — anders als `readProgress`, und aus
 * einem Grund: dort ist „es gibt noch keine Zeile" eine Antwort, mit der jeder
 * Aufrufer etwas anfängt. Hier wäre die leere Liste eine Lüge — das Dashboard
 * meldete „noch nichts angefangen", die Einstellungen „0 Übungen geschafft",
 * und beides sähe für den User aus, als wären seine Daten weg. Der Wurf landet
 * in der Segment-Error-Boundary (`app/(app)/error.tsx`), die genau dafür da ist.
 */
export async function readAllProgress({
  supabase,
  user,
}: ActionContext): Promise<Tables<typeof TABLE>[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`readAllProgress: read failed (${error.code ?? "unknown"})`);
  }

  return data ?? [];
}

/**
 * Der Update-oder-Insert-Tanz, genau einmal.
 *
 * `write` bekommt die jüngste Zeile und entscheidet daraus die Nutzlast; gibt
 * es die Zeile, geht sie als Patch per `id` hinein, sonst als neue Zeile.
 * Liefert `write` ein `null`, passiert nichts — der Erfolgsfall „es gab nichts
 * zu schreiben".
 *
 * **Der Schreiber setzt genau ein Feld selbst: `cycle_number: 1`.** `status`,
 * `started_at`, `completed_at` und `current_step` kommen aus der Nutzlast, auch
 * beim Anlegen. Das ist wichtig wegen `markRecipeIntroSeenAction`: deren Insert
 * setzt bewusst `status: "not_started"` und **kein** `started_at`, damit das
 * bloße Ansehen der Intro nicht als „gestartet" zählt. Ein hier eingebauter
 * `started_at`-Default würde diese Regel still brechen.
 *
 * `cycle_number` ist die eine Ausnahme, weil sie nichts über die Übung sagt:
 * eine erste Zeile ist der erste Durchlauf. Eine Nutzlast darf sie trotzdem
 * überschreiben — `startNewCycleAction` tut genau das.
 */
export async function writeProgress(
  ctx: ActionContext,
  slug: string,
  write: ProgressWriter,
): Promise<ActionResult> {
  // Hier wird der Lesefehler ausdrücklich geprüft statt verschluckt: „konnte
  // nicht gelesen werden" und „gibt es nicht" führen zu entgegengesetzten
  // Schreibvorgängen (s. `selectLatest`).
  const { data: row, error: readError } = await selectLatest(ctx, slug);
  if (readError) return dbFailed(readError, TABLE);

  const payload = write(row, new Date().toISOString());
  if (payload === null) return ok();

  const { supabase, user } = ctx;
  const { error } = row
    ? await supabase.from(TABLE).update(payload).eq("id", row.id)
    : await supabase.from(TABLE).insert({
        user_id: user.id,
        recipe_slug: slug,
        cycle_number: 1,
        ...payload,
      });

  return error ? dbFailed(error, TABLE) : ok();
}

/**
 * Pro Slug die Zeile mit der höchsten `cycle_number` — der laufende Durchlauf,
 * aus einer bereits gelesenen Liste.
 *
 * Das Dashboard griff hier ein `.find()` und bekam damit **irgendeine** Zeile
 * des Slugs. Solange es pro Slug nur eine gab, stimmte das zufällig; seit
 * `startNewCycleAction` eine zweite anlegt, konnte es der abgeschlossene erste
 * Durchlauf sein — dann meldete das Dashboard „geschafft" über einen
 * Durchlauf, der gerade lief.
 *
 * Strukturell getypt statt auf die ganze Zeile: die Funktion liest genau zwei
 * Spalten, und das soll man ihrer Signatur ansehen.
 */
export function latestPerSlug<
  T extends Pick<Tables<typeof TABLE>, "recipe_slug" | "cycle_number">,
>(rows: readonly T[]): Map<string, T> {
  const latest = new Map<string, T>();

  for (const row of rows) {
    const seen = latest.get(row.recipe_slug);
    if (!seen || row.cycle_number > seen.cycle_number) {
      latest.set(row.recipe_slug, row);
    }
  }

  return latest;
}

/**
 * Die Slugs, die **irgendwann** abgeschlossen wurden — „wie viele Übungen hast
 * du geschafft".
 *
 * Ausdrücklich nicht `latestPerSlug` plus Status-Prüfung: wer einen zweiten
 * Werte-Durchlauf beginnt, hat den ersten trotzdem geschafft. Zwei benannte
 * Fragen an dieselbe gelesene Liste, statt eines `.find()` auf dem Dashboard
 * und eines `new Set()` in den Einstellungen.
 */
export function everCompletedSlugs<
  T extends Pick<Tables<typeof TABLE>, "recipe_slug" | "status">,
>(rows: readonly T[]): Set<string> {
  return new Set(
    rows.filter((row) => row.status === "completed").map((row) => row.recipe_slug),
  );
}
