"use server";

import { ok, failed, type ActionResult } from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
import { readIntroSeen, writeProgress } from "@/lib/recipes/progress";
import { getRecipeBySlug } from "@/lib/utils/recipes";

// ─── Rezept-Intro "schon gesehen?"-Status (Schritt 6.10) ────────────────

/**
 * Liest, ob der User die Intro-Sequenz dieses Rezepts schon gesehen hat —
 * die `withUser`-Hülle um `readIntroSeen` für Server-Komponenten, die keinen
 * `ctx` zur Hand haben.
 *
 * Bewusst **kein** `ActionResult`: der Aufrufer zieht daraus nur ein
 * `introSeen`-Flag. Ein Ergebnis zum Auspacken würde ihm einen Zweig
 * aufzwingen, in dem er dasselbe täte wie bei „nicht angemeldet".
 */
export async function hasSeenRecipeIntro(slug: string): Promise<boolean> {
  const result = await withUser(async (ctx) => ok(await readIntroSeen(ctx, slug)));
  return result.error === null ? result.data : false;
}

/**
 * Markiert die Intro eines Rezepts als gesehen. Setzt das Flag auf der Zeile
 * mit der höchsten cycle_number; existiert noch keine Zeile (Intro vor dem
 * ersten Start), wird eine mit status "not_started" angelegt — so wird das
 * bloße Ansehen der Intro nicht fälschlich als "gestartet/fortsetzen" gewertet.
 * Aus Client-Komponenten aufrufbar.
 */
export async function markRecipeIntroSeenAction(
  slug: string,
): Promise<ActionResult> {
  return withUser(async (ctx) => {
    // Slug kommt aus Client-Komponenten — nur bekannte Rezepte zulassen.
    if (!getRecipeBySlug(slug)) {
      return failed("Unbekanntes Rezept.");
    }

    return writeProgress(ctx, slug, (row) =>
      row
        ? { intro_seen: true }
        : // Noch keine Zeile — anlegen, ohne das Rezept als gestartet zu
          // markieren. Kein `started_at`: die Intro anzusehen ist kein Start,
          // und `writeProgress` setzt von sich aus nur `cycle_number`.
          { current_step: 1, status: "not_started", intro_seen: true },
    );
  });
}
