"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type ValuesActionState = {
  error: string | null;
};

/**
 * Save the values hypothesis (Step 1 of Recipe #1).
 * - Upserts into values_hypothesis (version 1)
 * - Advances user_recipe_progress to step 2
 */
export async function saveHypothesisAction(
  _prevState: ValuesActionState,
  formData: FormData,
): Promise<ValuesActionState> {
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
      return { error: updateError.message };
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
      return { error: insertError.message };
    }
  }

  // --- Advance user_recipe_progress to step 2 ---
  const { data: existingProgress } = await supabase
    .from("user_recipe_progress")
    .select("*")
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
      return { error: updateError.message };
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
      return { error: insertError.message };
    }
  }

  redirect("/recipes/values/journal");
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

export type JournalActionState = {
  error: string | null;
};

/**
 * Save (create or update) a daily journal entry for Recipe #1.
 * - Upserts into journal_entries by (user_id, entry_date, template_type)
 * - After saving, if 7+ entries exist, advances user_recipe_progress to step 3
 */
export async function saveJournalEntryAction(
  _prevState: JournalActionState,
  formData: FormData,
): Promise<JournalActionState> {
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
      return { error: updateError.message };
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
      return { error: insertError.message };
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

  revalidatePath("/recipes/values/journal");
  return { error: null };
}

/**
 * Wrapper for use with plain `<form action={fn}>` in server components.
 */
export async function saveHypothesis(formData: FormData): Promise<void> {
  await saveHypothesisAction({ error: null }, formData);
}

// ─── Evaluation (Step 3) ───────────────────────────────────────────

export type EvaluationEntry = {
  id: string;
  entry_date: string;
  content: { happenings: string; response: string };
};

export type ValueEvalEntry = {
  id: string;
  content: { positive_reflection: string; negative_reflection: string };
} | null;

export type EvaluationPageData = {
  hypothesis: string[];
  hypothesisVersion: number;
  entries: EvaluationEntry[];
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

  // Fetch daily_value entries scoped to this cycle's started_at date
  const { data: entries } = await supabase
    .from("journal_entries")
    .select("id, entry_date, content")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .eq("template_type", "daily_value")
    .order("entry_date", { ascending: true });

  // Scope entries to current cycle by date
  const startedAtDate = progress?.started_at
    ? progress.started_at.slice(0, 10)
    : null;
  const cycleEntries = startedAtDate
    ? (entries as EvaluationEntry[]).filter(
        (e) => e.entry_date >= startedAtDate,
      )
    : (entries as EvaluationEntry[]) ?? [];

  // Fetch existing value_eval entry (if any)
  const { data: evalRow } = await supabase
    .from("journal_entries")
    .select("id, content")
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

export type EvalReflectionState = {
  error: string | null;
  success: boolean;
};

/**
 * Save the evaluation reflection (Phase 1 of Step 3).
 * Upserts a journal_entries row with template_type='value_eval'.
 * Returns success so the client can transition to the adjust phase.
 */
export async function saveEvalReflectionAction(
  _prevState: EvalReflectionState,
  formData: FormData,
): Promise<EvalReflectionState> {
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
      return { error: updateError.message, success: false };
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
      return { error: insertError.message, success: false };
    }
  }

  return { error: null, success: true };
}

export type AdjustedHypothesisState = {
  error: string | null;
  success: boolean;
};

/**
 * Save adjusted values (Phase 2 of Step 3).
 * - Creates a NEW values_hypothesis row with version+1 (preserving history)
 * - Marks user_recipe_progress as completed
 * - Returns success so the client can transition to the complete phase
 */
export async function saveAdjustedHypothesisAction(
  _prevState: AdjustedHypothesisState,
  formData: FormData,
): Promise<AdjustedHypothesisState> {
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

  const originalVersion = parseInt(
    formData.get("original_version") as string,
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
    return { error: insertError.message, success: false };
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
      return { error: updateError.message, success: false };
    }
  }

  revalidatePath("/recipes/values/evaluation");
  return { error: null, success: true };
}

export type NewCycleState = {
  error: string | null;
};

/**
 * Start a new 7-day journal cycle (Phase 3 CTA).
 * Creates a new user_recipe_progress row with cycle_number+1,
 * current_step=2 (skip hypothesis), then redirects to the journal.
 */
export async function startNewCycleAction(
  _prevState: NewCycleState,
  _formData: FormData,
): Promise<NewCycleState> {
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
    return { error: insertError.message };
  }

  redirect("/recipes/values/journal");
}