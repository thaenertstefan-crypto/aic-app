"use server";

import { revalidatePath } from "next/cache";

import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser, type ActionContext } from "@/lib/actions/with-user";
import type { ShadowContent } from "@/lib/types/db-json";
import { serverTodayKey } from "@/lib/server/timezone";
import { TEXT_MAX_LONG, tooLong } from "@/lib/utils/form-validation";
import { recipeSlugFor } from "@/lib/utils/journal-recipe-slug";

// ─── Schattenseite ──────────────────────────────────────────────────────
// Ventil-Rezept im Kopfwetter (Shadow Journal / Rage Walk).
// Privatsphäre-Garantie: Einträge (template_type 'shadow') werden von KEINER
// KI-Route gelesen und tragen `private: true` (unterdrückt die Text-Vorschau
// in der Journal-Liste). Beim „Verbrennen" wird gar nichts gespeichert —
// dann markiert nur markShadowDoneAction das Rezept als abgeschlossen.

/** Rezept-Fortschritt auf "completed" setzen (höchster Zyklus) — geteilt
 *  zwischen Behalten, Verbrennen und Rage Walk ohne Notiz. */
async function completeShadowProgress({
  supabase,
  user,
}: ActionContext): Promise<ActionResult> {
  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_slug", "shadow")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (progress) {
    const { error } = await supabase
      .from("user_recipe_progress")
      .update({
        current_step: 1,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", progress.id);
    return error ? dbFailed(error, "shadow") : ok();
  }

  const { error } = await supabase.from("user_recipe_progress").insert({
    user_id: user.id,
    recipe_slug: "shadow",
    current_step: 1,
    status: "completed",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    cycle_number: 1,
  });
  return error ? dbFailed(error, "shadow") : ok();
}

/**
 * „Behalten": Save a shadow entry (always inserts a new row), then mark the
 * recipe as completed. Keine Nutzlast nötig — es folgt nie ein KI-Call auf
 * diesen Eintrag.
 */
export async function saveShadowEntryAction(
  formData: FormData,
): Promise<ActionResult> {
  const body = (formData.get("body") as string | null)?.trim() ?? "";
  const mode = formData.get("mode") as string | null;

  if (!body) {
    return failed("Es gibt noch nichts zu behalten — schreib erst etwas.");
  }
  const lengthError = tooLong(body, TEXT_MAX_LONG);
  if (lengthError) {
    return failed(lengthError);
  }

  const content: ShadowContent = {
    body,
    private: true,
    mode: mode === "walk" ? "walk" : "journal",
  };

  const result = await withUser(async (ctx) => {
    const { error: insertError } = await ctx.supabase
      .from("journal_entries")
      .insert({
        user_id: ctx.user.id,
        recipe_slug: recipeSlugFor("shadow"),
        template_type: "shadow",
        content,
        entry_date: await serverTodayKey(),
      });

    if (insertError) {
      return dbFailed(insertError, "shadow");
    }

    return completeShadowProgress(ctx);
  });

  if (result.error !== null) return result;

  revalidatePath("/journal");
  return result;
}

/**
 * „Verbrennen" bzw. Rage Walk ohne Notiz: NICHTS wird gespeichert — nur der
 * Rezept-Fortschritt wird abgeschlossen. Fire-and-forget vom Client.
 */
export async function markShadowDoneAction(): Promise<ActionResult> {
  return withUser(completeShadowProgress);
}
