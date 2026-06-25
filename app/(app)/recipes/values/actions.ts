"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/types/action-state";
import { dbError } from "@/lib/utils/db-error";

/**
 * Save the values hypothesis (Step 1 of Recipe #1).
 * - Upserts into values_hypothesis (version 1)
 * - Advances user_recipe_progress to step 2
 */
export async function saveHypothesisAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um deine Werte zu speichern." };
  }

  const valuesRaw = formData.get("values");
  if (!valuesRaw || typeof valuesRaw !== "string") {
    return { error: "Keine Werte ausgewählt." };
  }

  let values: string[];
  try {
    values = JSON.parse(valuesRaw);
  } catch {
    return { error: "Ungültiges Format der ausgewählten Werte." };
  }

  if (!Array.isArray(values) || values.length !== 5) {
    return { error: "Bitte genau 5 Werte auswählen." };
  }

  // --- Save to values_hypothesis (upsert by user_id + version 1) ---
  const { data: existingHypothesis } = await supabase
    .from("values_hypothesis")
    .select("id")
    .eq("user_id", user.id)
    .eq("version", 1)
    .maybeSingle();

  if (existingHypothesis) {
    const { error: updateError } = await supabase
      .from("values_hypothesis")
      .update({ values })
      .eq("id", existingHypothesis.id);

    if (updateError) {
      return { error: dbError(updateError, "values") };
    }
  } else {
    const { error: insertError } = await supabase
      .from("values_hypothesis")
      .insert({
        user_id: user.id,
        values,
        version: 1,
        confirmed: false,
      });

    if (insertError) {
      return { error: dbError(insertError, "values") };
    }
  }

  // --- Advance user_recipe_progress to step 2 ---
  const { data: existingProgress } = await supabase
    .from("user_recipe_progress")
    .select("started_at, id")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingProgress) {
    const { error: updateError } = await supabase
      .from("user_recipe_progress")
      .update({
        current_step: 2,
        status: "in_progress",
        started_at: existingProgress.started_at ?? new Date().toISOString(),
      })
      .eq("id", existingProgress.id);

    if (updateError) {
      return { error: dbError(updateError, "values") };
    }
  } else {
    // Shouldn't happen normally (user would have started the recipe first),
    // but handle gracefully by creating progress row.
    const { error: insertError } = await supabase
      .from("user_recipe_progress")
      .insert({
        user_id: user.id,
        recipe_slug: "values",
        current_step: 2,
        status: "in_progress",
        started_at: new Date().toISOString(),
        cycle_number: 1,
      });

    if (insertError) {
      return { error: dbError(insertError, "values") };
    }
  }

  // Kein Redirect mehr — die Form zeigt nach Erfolg einen Completion-Screen
  // (grüner Haken + Werte-Liste) und verlinkt von dort auf die Journey-Übersicht.
  return { error: null, success: true };
}

/**
 * Fetch the user's previously selected values (Step 1), if any.
 * Used to pre-fill the hypothesis form when revisiting the step.
 */
export async function getHypothesisData(): Promise<string[] | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: hypothesisRow } = await supabase
    .from("values_hypothesis")
    .select("values")
    .eq("user_id", user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (hypothesisRow?.values as string[]) ?? null;
}

// ─── Journal (Step 2) ────────────────────────────────────────────────

export type JournalEntry = {
  id: string;
  entry_date: string;
  content: { happenings: string; response: string };
};

export type JournalPageData = {
  hypothesis: string[] | null;
  entries: JournalEntry[];
  startedAt: string | null;
  currentStep: number;
};

/**
 * Fetch all data needed for the journal page (Step 2 of Recipe #1).
 */
export async function getJournalData(): Promise<JournalPageData> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { hypothesis: null, entries: [], startedAt: null, currentStep: 1 };
  }

  // Fetch latest values hypothesis
  const { data: hypothesisRow } = await supabase
    .from("values_hypothesis")
    .select("values")
    .eq("user_id", user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch journal entries for this recipe
  const { data: entries } = await supabase
    .from("journal_entries")
    .select("id, entry_date, content")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .eq("template_type", "daily_value")
    .order("entry_date", { ascending: true });

  // Fetch user progress
  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("started_at, current_step")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    hypothesis: (hypothesisRow?.values as string[]) ?? null,
    entries: (entries as JournalEntry[]) ?? [],
    startedAt: progress?.started_at ?? null,
    currentStep: progress?.current_step ?? 1,
  };
}

/**
 * Save (create or update) a daily journal entry for Recipe #1.
 * - Upserts into journal_entries by (user_id, entry_date, template_type)
 * - After saving, if 7+ entries exist, advances user_recipe_progress to step 3
 */
export async function saveJournalEntryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um einen Eintrag zu speichern." };
  }

  const entryDate = formData.get("entry_date");
  const happenings = formData.get("happenings");
  const response = formData.get("response");

  if (!entryDate || typeof entryDate !== "string") {
    return { error: "Kein Datum angegeben." };
  }
  if (!happenings || typeof happenings !== "string") {
    return { error: "Bitte beschreib, was heute passiert ist." };
  }
  if (!response || typeof response !== "string") {
    return { error: "Bitte teil deine Gedanken und Gefühle dazu mit." };
  }

  const content = { happenings, response };

  // Check if an entry already exists for this date
  const { data: existingEntry } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("entry_date", entryDate)
    .eq("template_type", "daily_value")
    .maybeSingle();

  if (existingEntry) {
    // Update existing entry
    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({ content })
      .eq("id", existingEntry.id);

    if (updateError) {
      return { error: dbError(updateError, "values") };
    }
  } else {
    // Insert new entry
    const { error: insertError } = await supabase
      .from("journal_entries")
      .insert({
        user_id: user.id,
        recipe_slug: "values",
        template_type: "daily_value",
        entry_date: entryDate,
        content,
      });

    if (insertError) {
      return { error: dbError(insertError, "values") };
    }
  }

  // After save, count entries — if 7+, advance to step 3
  const { count } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .eq("template_type", "daily_value");

  if (count !== null && count >= 7) {
    const { data: progress } = await supabase
      .from("user_recipe_progress")
      .select("id, current_step")
      .eq("user_id", user.id)
      .eq("recipe_slug", "values")
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (progress && progress.current_step < 3) {
      await supabase
        .from("user_recipe_progress")
        .update({ current_step: 3 })
        .eq("id", progress.id);
    }
  }

  revalidatePath("/me/values/journey/journal");
  return { error: null };
}

/**
 * Wrapper for use with plain `<form action={fn}>` in server components.
 */
export async function saveHypothesis(formData: FormData): Promise<void> {
  await saveHypothesisAction({ error: null }, formData);
}

// ─── Evaluation (Step 3) ───────────────────────────────────────────

export type ValueEvalEntry = {
  id: string;
  content: { positive_reflection: string; negative_reflection: string };
  aiInsights: string | null;
} | null;

export type EvaluationPageData = {
  hypothesis: string[];
  hypothesisVersion: number;
  entries: JournalEntry[];
  valueEvalEntry: ValueEvalEntry;
  progress: {
    id: string;
    cycleNumber: number;
    startedAt: string;
    status: string;
  } | null;
  phase: "reflection" | "adjust" | "complete";
};

/**
 * Fetch all data needed for the evaluation page (Step 3 of Recipe #1).
 * - Computes which phase the user should see (reflection / adjust / complete)
 * - Redirects to journal if fewer than 7 entries exist
 */
export async function getEvaluationData(): Promise<EvaluationPageData> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      hypothesis: [],
      hypothesisVersion: 1,
      entries: [],
      valueEvalEntry: null,
      progress: null,
      phase: "reflection",
    };
  }

  // Fetch user progress for this recipe
  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("id, cycle_number, started_at, status")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch latest values hypothesis
  const { data: hypothesisRow } = await supabase
    .from("values_hypothesis")
    .select("values, version")
    .eq("user_id", user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hypothesis = (hypothesisRow?.values as string[]) ?? [];
  const hypothesisVersion = (hypothesisRow?.version as number) ?? 1;

  // Fetch the most recent 7 daily_value entries — the current cycle.
  // Counting the latest 7 by created_at keeps this consistent with the journal
  // step (which unlocks "Zur Auswertung" once 7 entries exist) and with the
  // journal-analysis API route, instead of filtering by entry_date >= started_at
  // (which the test-only back-dating in journal-form.tsx breaks).
  const { data: entries } = await supabase
    .from("journal_entries")
    .select("id, entry_date, content")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .eq("template_type", "daily_value")
    .order("created_at", { ascending: false })
    .limit(7);

  // Show them in chronological order.
  const cycleEntries = ((entries as JournalEntry[]) ?? []).slice().reverse();

  // Fetch existing value_eval entry (if any)
  const { data: evalRow } = await supabase
    .from("journal_entries")
    .select("id, content, ai_insights")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .eq("template_type", "value_eval")
    .maybeSingle();

  const valueEvalEntry: ValueEvalEntry = evalRow
    ? {
        id: evalRow.id,
        content: (evalRow.content as {
          positive_reflection: string;
          negative_reflection: string;
        }) ?? { positive_reflection: "", negative_reflection: "" },
        aiInsights: (evalRow.ai_insights as string | null) ?? null,
      }
    : null;

  // Compute phase
  const status = progress?.status ?? "not_started";
  let phase: "reflection" | "adjust" | "complete";

  if (status === "completed" || hypothesisVersion > 1) {
    phase = "complete";
  } else if (valueEvalEntry) {
    phase = "adjust";
  } else {
    phase = "reflection";
  }

  return {
    hypothesis,
    hypothesisVersion,
    entries: cycleEntries,
    valueEvalEntry,
    progress: progress
      ? {
          id: progress.id,
          cycleNumber: progress.cycle_number,
          startedAt: progress.started_at,
          status: progress.status,
        }
      : null,
    phase,
  };
}

/**
 * Save the evaluation reflection (Phase 1 of Step 3).
 * Upserts a journal_entries row with template_type='value_eval'.
 * Returns success so the client can transition to the adjust phase.
 */
export async function saveEvalReflectionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", success: false };
  }

  const positiveReflection = formData.get("positive_reflection");
  const negativeReflection = formData.get("negative_reflection");

  if (!positiveReflection || typeof positiveReflection !== "string") {
    return { error: "Bitte beantworte die erste Frage.", success: false };
  }
  if (!negativeReflection || typeof negativeReflection !== "string") {
    return { error: "Bitte beantworte die zweite Frage.", success: false };
  }

  const content = {
    positive_reflection: positiveReflection,
    negative_reflection: negativeReflection,
  };

  // Check if value_eval entry already exists
  const { data: existing } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .eq("template_type", "value_eval")
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({ content })
      .eq("id", existing.id);

    if (updateError) {
      return { error: dbError(updateError, "values"), success: false };
    }
  } else {
    const { error: insertError } = await supabase.from("journal_entries").insert(
      {
        user_id: user.id,
        recipe_slug: "values",
        template_type: "value_eval",
        content,
      },
    );

    if (insertError) {
      return { error: dbError(insertError, "values"), success: false };
    }
  }

  return { error: null, success: true };
}

/**
 * Save adjusted values (Phase 2 of Step 3).
 * - Creates a NEW values_hypothesis row with version+1 (preserving history)
 * - Marks user_recipe_progress as completed
 * - Returns success so the client can transition to the complete phase
 */
export async function saveAdjustedHypothesisAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", success: false };
  }

  const valuesRaw = formData.get("values");
  if (!valuesRaw || typeof valuesRaw !== "string") {
    return { error: "Keine Werte angegeben.", success: false };
  }

  let values: string[];
  try {
    values = JSON.parse(valuesRaw);
  } catch {
    return { error: "Ungültiges Format der Werte.", success: false };
  }

  if (!Array.isArray(values) || values.length === 0) {
    return { error: "Bitte mindestens einen Wert angeben.", success: false };
  }

  const originalVersionRaw = formData.get("original_version");
  const originalVersion = parseInt(
    typeof originalVersionRaw === "string" ? originalVersionRaw : "",
    10,
  );
  const newVersion = isNaN(originalVersion) ? 2 : originalVersion + 1;

  // Insert new hypothesis row
  const { error: insertError } = await supabase
    .from("values_hypothesis")
    .insert({
      user_id: user.id,
      values,
      version: newVersion,
      confirmed: true,
    });

  if (insertError) {
    return { error: dbError(insertError, "values"), success: false };
  }

  // Mark recipe progress as completed
  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (progress) {
    const { error: updateError } = await supabase
      .from("user_recipe_progress")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", progress.id);

    if (updateError) {
      return { error: dbError(updateError, "values"), success: false };
    }
  }

  revalidatePath("/me/values/journey/evaluation");
  return { error: null, success: true };
}

/**
 * Start a new 7-day journal cycle (Phase 3 CTA).
 * Creates a new user_recipe_progress row with cycle_number+1,
 * current_step=2 (skip hypothesis), then redirects to the journal.
 */
export async function startNewCycleAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein." };
  }

  // Get current highest cycle_number
  const { data: latestProgress } = await supabase
    .from("user_recipe_progress")
    .select("cycle_number")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const newCycleNumber = (latestProgress?.cycle_number ?? 0) + 1;

  // Create new progress row for the new cycle
  const { error: insertError } = await supabase
    .from("user_recipe_progress")
    .insert({
      user_id: user.id,
      recipe_slug: "values",
      current_step: 2,
      status: "in_progress",
      started_at: new Date().toISOString(),
      cycle_number: newCycleNumber,
    });

  if (insertError) {
    return { error: dbError(insertError, "values") };
  }

  redirect("/me/values/journey/journal");
}