"use server";

import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
import { serverTodayKey } from "@/lib/server/timezone";
import { TEXT_MAX_LONG, tooLong } from "@/lib/utils/form-validation";
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

  return withUser(async ({ supabase, user }) => {
    // Upsert journal_entries for this user + recipe + template_type
    const { data: existingEntry } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("user_id", user.id)
      .eq("recipe_slug", "overthinking")
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
          recipe_slug: "overthinking",
          template_type: "overthinking",
          content,
          entry_date: await serverTodayKey(),
        });

      if (insertError) {
        return dbFailed(insertError, "overthinking");
      }
    }

    // Mark progress as completed with current_step = 8
    const { data: progress } = await supabase
      .from("user_recipe_progress")
      .select("id")
      .eq("user_id", user.id)
      .eq("recipe_slug", "overthinking")
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (progress) {
      const { error: updateError } = await supabase
        .from("user_recipe_progress")
        .update({
          current_step: 8,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", progress.id);

      if (updateError) {
        return dbFailed(updateError, "overthinking");
      }
    } else {
      // Shouldn't happen (recipe was started via startRecipeAction), but handle gracefully
      const { error: insertError } = await supabase
        .from("user_recipe_progress")
        .insert({
          user_id: user.id,
          recipe_slug: "overthinking",
          current_step: 8,
          status: "completed",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          cycle_number: 1,
        });

      if (insertError) {
        return dbFailed(insertError, "overthinking");
      }
    }

    return ok();
  });
}