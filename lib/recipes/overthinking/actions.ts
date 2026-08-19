"use server";

import {
  dbFailed,
  failed,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
import { writeProgress } from "@/lib/recipes/progress";
import { serverTodayKey } from "@/lib/server/timezone";
import { TEXT_MAX_LONG, tooLong } from "@/lib/utils/form-validation";
import { recipeSlugFor } from "@/lib/utils/journal-recipe-slug";
import type { OverthinkingContent } from "@/lib/types/db-json";

// Die Warum-Leiter hat im Wizard max. 3 Ebenen; 10 lässt Luft für Formate von
// morgen, blockt aber manipulierte Riesen-Arrays.
const MAX_WHY_LEVELS = 10;

/**
 * Save the completed overthinking exercise as a journal entry,
 * then mark the recipe as completed.
 */
export async function saveOverthinkingAction(
  formData: FormData,
): Promise<ActionResult> {
  const problem = formData.get("problem") as string | null;
  const whyLevelsRaw = formData.get("why_levels") as string | null;
  const challengerQuestion = formData.get("challenger_question") as string | null;
  const whatIfWrong = formData.get("what_if_wrong") as string | null;
  const reframedProblem = formData.get("reframed_problem") as string | null;
  const decision = formData.get("decision") as string | null;

  if (!problem) {
    return failed("Bitte beschreib dein Problem kurz.");
  }
  if (!decision) {
    return failed("Bitte notier deinen nächsten Schritt, bevor du abschließt.");
  }

  const lengthError =
    tooLong(problem, TEXT_MAX_LONG) ??
    tooLong(challengerQuestion ?? "", TEXT_MAX_LONG) ??
    tooLong(whatIfWrong ?? "", TEXT_MAX_LONG) ??
    tooLong(reframedProblem ?? "", TEXT_MAX_LONG) ??
    tooLong(decision, TEXT_MAX_LONG);
  if (lengthError) {
    return failed(lengthError);
  }

  let whyLevels: string[] = [];
  try {
    const parsed: unknown = whyLevelsRaw ? JSON.parse(whyLevelsRaw) : [];
    if (Array.isArray(parsed)) {
      whyLevels = parsed
        .filter((v): v is string => typeof v === "string")
        .slice(0, MAX_WHY_LEVELS)
        .map((v) => v.slice(0, TEXT_MAX_LONG));
    }
  } catch {
    // ignore parse errors, default to empty
  }

  const content: OverthinkingContent = {
    problem,
    why_levels: whyLevels,
    challenger_question: challengerQuestion ?? "",
    what_if_wrong: whatIfWrong ?? "",
    reframed_problem: reframedProblem ?? "",
    decision,
  };

  return withUser(async (ctx) => {
    const { supabase, user } = ctx;
    // Upsert journal_entries for this user + recipe + template_type
    const { data: existingEntry } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("user_id", user.id)
      .eq("recipe_slug", recipeSlugFor("overthinking"))
      .eq("template_type", "overthinking")
      .maybeSingle();

    if (existingEntry) {
      const { error: updateError } = await supabase
        .from("journal_entries")
        .update({ content })
        .eq("id", existingEntry.id);

      if (updateError) {
        return dbFailed(updateError, "overthinking");
      }
    } else {
      const { error: insertError } = await supabase
        .from("journal_entries")
        .insert({
          user_id: user.id,
          recipe_slug: recipeSlugFor("overthinking"),
          template_type: "overthinking",
          content,
          entry_date: await serverTodayKey(),
        });

      if (insertError) {
        return dbFailed(insertError, "overthinking");
      }
    }

    // Abgeschlossen heißt hier: Schritt 8, die letzte Bühne der Übung. Welcher
    // Schritt das ist, weiß nur die Übung — der Rest steht in writeProgress.
    return writeProgress(ctx, "overthinking", (row, now) => ({
      current_step: 8,
      status: "completed",
      completed_at: now,
      // Nur auf einer neuen Zeile: hier beginnt der Durchlauf. Eine bestehende
      // behält ihr `started_at` — auch die vom Intro-Gate, die bewusst keins
      // trägt, weil die Intro anzusehen kein Start ist.
      ...(row ? {} : { started_at: now }),
    }));
  });
}