"use server";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { dbError } from "@/lib/utils/db-error";
import { redirect } from "next/navigation";
import { getRecipeBySlug, getRecipeStepPath } from "@/lib/utils/recipes";

export type RecipeActionState = {
  error: string | null;
};

/**
 * Wrapper around startOrContinueRecipeAction for use with plain `<form action={fn}>`
 * (server components). Discards the prevState argument that useActionState expects.
 * Fehler dürfen hier nicht stumm versanden (kein useActionState-Feedback) —
 * stattdessen an die Segment-Error-Boundary werfen.
 */
export async function startRecipeAction(formData: FormData): Promise<void> {
  const result = await startOrContinueRecipeAction({ error: null }, formData);
  if (result?.error) {
    throw new Error(`startRecipeAction: ${result.error}`);
  }
}

export async function startOrContinueRecipeAction(
  _prevState: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  const user = await getCachedUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um ein Rezept zu starten." };
  }

  const supabase = await createClient();

  const recipeSlug = formData.get("recipeSlug") as string;
  if (!recipeSlug) {
    return { error: "Kein Rezept angegeben." };
  }

  // Nur bekannte, verfügbare Rezepte akzeptieren — sonst legen manipulierte
  // FormData-Requests Junk-Zeilen in user_recipe_progress an.
  const recipe = getRecipeBySlug(recipeSlug);
  if (!recipe || !recipe.available) {
    return { error: "Unbekanntes Rezept." };
  }

  // Check for existing progress — pick the highest cycle_number
  const { data: existing } = await supabase
    .from("user_recipe_progress")
    .select("id, status, current_step")
    .eq("user_id", user.id)
    .eq("recipe_slug", recipeSlug)
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Row exists — set to in_progress if it was not_started
    if (existing.status === "not_started") {
      const { error: updateError } = await supabase
        .from("user_recipe_progress")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        return { error: dbError(updateError, "user_recipe_progress") };
      }
    }

    // Resume at the step the user last reached, instead of always restarting.
    redirect(getRecipeStepPath(recipeSlug, existing.current_step ?? 1));
  } else {
    // Create a new progress row
    const { error: insertError } = await supabase
      .from("user_recipe_progress")
      .insert({
        user_id: user.id,
        recipe_slug: recipeSlug,
        current_step: 1,
        status: "in_progress",
        started_at: new Date().toISOString(),
        cycle_number: 1,
      });

    if (insertError) {
      return { error: dbError(insertError, "user_recipe_progress") };
    }
  }

  // Redirect to the recipe's actual exercise page
  redirect(recipe.startPath);
}

// ─── Rezept-Intro "schon gesehen?"-Status (Schritt 6.10) ────────────────

/**
 * Liest, ob der User die Intro-Sequenz dieses Rezepts schon gesehen hat.
 * intro_seen gilt pro recipe_slug (nicht pro Zyklus): gesehen, sobald
 * IRGENDEINE Fortschritts-Zeile dieses Slugs intro_seen = true hat.
 */
export async function hasSeenRecipeIntro(slug: string): Promise<boolean> {
  const user = await getCachedUser();

  if (!user) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_recipe_progress")
    .select("intro_seen")
    .eq("user_id", user.id)
    .eq("recipe_slug", slug)
    .eq("intro_seen", true)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
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
): Promise<{ error: string | null }> {
  const user = await getCachedUser();

  if (!user) {
    return { error: "Du musst angemeldet sein." };
  }

  // Slug kommt aus Client-Komponenten — nur bekannte Rezepte zulassen.
  if (!getRecipeBySlug(slug)) {
    return { error: "Unbekanntes Rezept." };
  }

  const supabase = await createClient();
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
    return { error: error ? dbError(error, "user_recipe_progress") : null };
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

  return { error: error ? dbError(error, "user_recipe_progress") : null };
}