"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRecipeBySlug, getRecipeStepPath } from "@/lib/utils/recipes";

export type RecipeActionState = {
  error: string | null;
};

/**
 * Wrapper around startOrContinueRecipeAction for use with plain `<form action={fn}>`
 * (server components). Discards the prevState argument that useActionState expects.
 */
export async function startRecipeAction(formData: FormData): Promise<void> {
  await startOrContinueRecipeAction({ error: null }, formData);
}

export async function startOrContinueRecipeAction(
  _prevState: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um ein Rezept zu starten." };
  }

  const recipeSlug = formData.get("recipeSlug") as string;
  if (!recipeSlug) {
    return { error: "Kein Rezept angegeben." };
  }

  // Check for existing progress — pick the highest cycle_number
  const { data: existing } = await supabase
    .from("user_recipe_progress")
    .select("*")
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
        return { error: updateError.message };
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
      return { error: insertError.message };
    }
  }

  // Redirect to the recipe's actual exercise page
  const recipe = getRecipeBySlug(recipeSlug);
  redirect(recipe?.startPath ?? `/recipes/${recipeSlug}`);
}