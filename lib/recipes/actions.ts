"use server";

import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
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
  return withUser(async ({ supabase, user }) => {
    // Slug kommt aus Client-Komponenten — nur bekannte Rezepte zulassen.
    if (!getRecipeBySlug(slug)) {
      return failed("Unbekanntes Rezept.");
    }

    // Höchste cycle_number-Zeile für (user, slug) holen
    const { data: existing } = await supabase
      .from("user_recipe_progress")
      .select("id")
      .eq("user_id", user.id)
      .eq("recipe_slug", slug)
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("user_recipe_progress")
        .update({ intro_seen: true })
        .eq("id", existing.id);
      return error ? dbFailed(error, "user_recipe_progress") : ok();
    }

    // Noch keine Zeile — anlegen, ohne das Rezept als gestartet zu markieren.
    const { error } = await supabase.from("user_recipe_progress").insert({
      user_id: user.id,
      recipe_slug: slug,
      current_step: 1,
      status: "not_started",
      cycle_number: 1,
      intro_seen: true,
    });

    return error ? dbFailed(error, "user_recipe_progress") : ok();
  });
}
