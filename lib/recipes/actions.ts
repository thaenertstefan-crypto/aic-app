"use server";

import { failed, ok, type ActionResult } from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
import { writeProgress } from "@/lib/recipes/progress";
import { getRecipeBySlug } from "@/lib/utils/recipes";

// ─── Rezept-Intro "schon gesehen?"-Status (Schritt 6.10) ────────────────

/**
 * Liest, ob der User die Intro-Sequenz dieses Rezepts schon gesehen hat.
 * intro_seen gilt pro recipe_slug (nicht pro Zyklus): gesehen, sobald
 * IRGENDEINE Fortschritts-Zeile dieses Slugs intro_seen = true hat.
 *
 * Bewusst **kein** `ActionResult`: der Aufrufer ist eine Server-Komponente, die
 * daraus nur ein `introSeen`-Flag zieht. „Noch nicht gesehen" ist die richtige
 * Antwort auf jeden Fehlerfall — ein Ergebnis zum Auspacken würde jedem
 * Aufrufer einen Zweig aufzwingen, in dem er dasselbe täte.
 */
export async function hasSeenRecipeIntro(slug: string): Promise<boolean> {
  const result = await withUser(async ({ supabase, user }) => {
    const { data } = await supabase
      .from("user_recipe_progress")
      .select("intro_seen")
      .eq("user_id", user.id)
      .eq("recipe_slug", slug)
      .eq("intro_seen", true)
      .limit(1)
      .maybeSingle();

    return ok(Boolean(data));
  });

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
