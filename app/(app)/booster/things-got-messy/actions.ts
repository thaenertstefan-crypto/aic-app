"use server";

import { revalidatePath } from "next/cache";

import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
import type { MessyMomentContent } from "@/lib/types/db-json";
import { serverTodayKey } from "@/lib/server/timezone";
import { TEXT_MAX_LONG, tooLong } from "@/lib/utils/form-validation";
import { patchJournalContent } from "@/lib/utils/journal-content";
import { recipeSlugFor } from "@/lib/utils/journal-recipe-slug";

// ─── Things Got Messy ───────────────────────────────────────────────────
// Geführtes Mini-Rezept im Kopfwetter. Einträge werden als
// journal_entries mit recipe_slug='things-got-messy' gespeichert;
// template_type bleibt 'messy_moment' (der Journal-Formatter formatMessyMoment
// ist darauf gekeyed). Nach dem Speichern markiert die Action das Rezept als
// abgeschlossen (wie Overthinking: wiederholbar, Badge zeigt "Abgeschlossen").

/**
 * Save a new "Things Got Messy" reflection (always inserts a new row),
 * then mark the recipe as completed.
 *
 * Die Nutzlast ist die ID des frischen Eintrags — Input für
 * /api/messy-guilt-coach.
 */
export async function saveMessyMomentAction(
  formData: FormData,
): Promise<ActionResult<string>> {
  const messyWhen = formData.get("messy_when") as string | null;

  if (!messyWhen?.trim()) {
    return failed("Bitte erzähl kurz, was passiert ist.");
  }

  const lengthError = tooLong(messyWhen, TEXT_MAX_LONG);
  if (lengthError) {
    return failed(lengthError);
  }

  // Einordnung (gesund/ungesund) + Regel-Konflikt liefert die KI danach —
  // /api/messy-guilt-coach trägt ai_guilt_guess/ai_rules_conflict nach.
  const content = {
    messy_when: messyWhen.trim(),
  } satisfies MessyMomentContent;

  return withUser(async ({ supabase, user }) => {
    const { data: inserted, error: insertError } = await supabase
      .from("journal_entries")
      .insert({
        user_id: user.id,
        recipe_slug: recipeSlugFor("messy_moment"),
        template_type: "messy_moment",
        content,
        entry_date: await serverTodayKey(),
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return dbFailed(insertError, "things-got-messy");
    }

    // Rezept-Fortschritt auf "completed" setzen (höchster Zyklus).
    const { data: progress } = await supabase
      .from("user_recipe_progress")
      .select("id")
      .eq("user_id", user.id)
      .eq("recipe_slug", "things-got-messy")
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (progress) {
      const { error: updateError } = await supabase
        .from("user_recipe_progress")
        .update({
          current_step: 1,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", progress.id);

      if (updateError) {
        return dbFailed(updateError, "things-got-messy");
      }
    } else {
      const { error: progressInsertError } = await supabase
        .from("user_recipe_progress")
        .insert({
          user_id: user.id,
          recipe_slug: "things-got-messy",
          current_step: 1,
          status: "completed",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          cycle_number: 1,
        });

      if (progressInsertError) {
        return dbFailed(progressInsertError, "things-got-messy");
      }
    }

    return ok(inserted.id);
  });
}

/**
 * Antwort auf „Fühlt sich das stimmig an?" am Ergebnis-Screen: schreibt
 * guilt_feedback ins content-JSONB des Eintrags. Ein erneuter Tap
 * überschreibt einfach (Single-User, kein Concurrency-Thema).
 */
export async function saveGuiltFeedbackAction(
  formData: FormData,
): Promise<ActionResult> {
  const entryId = (formData.get("entryId") as string | null)?.trim() ?? "";
  const feedback = formData.get("feedback") as string | null;

  if (!entryId || (feedback !== "agree" && feedback !== "disagree")) {
    return failed("Das hat gerade nicht geklappt. Versuch es noch einmal.");
  }

  const result = await withUser(async ({ supabase, user }) => {
    const { data: row } = await supabase
      .from("journal_entries")
      .select("content")
      .eq("id", entryId)
      .eq("user_id", user.id)
      .eq("recipe_slug", recipeSlugFor("messy_moment"))
      .eq("template_type", "messy_moment")
      .maybeSingle();

    if (!row) {
      return failed("Wir konnten deinen Eintrag nicht finden.");
    }

    const merged = patchJournalContent("messy_moment", row.content, {
      guilt_feedback: feedback,
    });

    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({ content: merged })
      .eq("id", entryId)
      .eq("user_id", user.id);

    return updateError ? dbFailed(updateError, "things-got-messy") : ok();
  });

  if (result.error !== null) return result;

  revalidatePath("/journal");
  return result;
}
