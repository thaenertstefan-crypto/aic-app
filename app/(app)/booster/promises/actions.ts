"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/utils/db-error";
import { utcDateKey } from "@/lib/utils/date";
import { computeStreak } from "@/lib/utils/streak";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CreatePromiseState = {
  error: string | null;
  success: boolean;
};

export type TogglePromiseState = {
  error: string | null;
  success: boolean;
  /** Whether today's completion was just added (vs. removed). */
  doneToday: boolean;
  /** Streak after the toggle. */
  currentStreak: number;
  /** Set to 7/14/30 when this toggle landed exactly on a milestone (drives the celebration). */
  milestone: number | null;
};

export type EndPromiseState = {
  error: string | null;
  success: boolean;
};

const VALID_TARGET_DAYS = [7, 14, 30] as const;
const MILESTONES = [7, 14, 30] as const;

/**
 * Recompute a promise's streak straight from its completion rows — robust for
 * both directions of the toggle (mark + undo).
 *
 * `current` counts consecutive days ending today (or yesterday if today isn't
 * completed yet), walking backwards one day at a time. `last` is the most
 * recent completed date, or null when there are none.
 */
async function recomputeStreak(
  supabase: SupabaseClient,
  promiseId: string,
): Promise<{ current: number; last: string | null }> {
  const { data: rows } = await supabase
    .from("promise_completions")
    .select("completed_date")
    .eq("promise_id", promiseId)
    .order("completed_date", { ascending: false });

  const dates = new Set((rows ?? []).map((r) => r.completed_date as string));
  if (dates.size === 0) {
    return { current: 0, last: null };
  }

  const doneToday = dates.has(utcDateKey());
  const current = computeStreak(dates, doneToday);

  // `last` = max date in the set (rows are ordered desc, so the first one).
  const last = (rows?.[0]?.completed_date as string) ?? null;

  return { current, last };
}

/**
 * Create a new self-promise. Following the cookbook's specificity advice, the
 * description should be a concrete, situation-bound commitment.
 */
export async function createPromiseAction(
  _prevState: CreatePromiseState,
  formData: FormData,
): Promise<CreatePromiseState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", success: false };
  }

  const description = String(formData.get("description") ?? "").trim();
  if (!description) {
    return { error: "Bitte beschreibe dein Promise.", success: false };
  }

  const parsedDays = Number(formData.get("target_days"));
  const target_days = (VALID_TARGET_DAYS as readonly number[]).includes(
    parsedDays,
  )
    ? parsedDays
    : 30;

  const { error } = await supabase.from("promises").insert({
    user_id: user.id,
    description,
    target_days,
  });

  if (error) {
    return { error: dbError(error, "promises"), success: false };
  }

  revalidatePath("/booster/promises");
  return { error: null, success: true };
}

/**
 * Toggle today's completion for a promise. Adds the day if missing, removes it
 * if present, then recomputes the streak from the remaining rows. The
 * celebration only fires when a freshly added day lands the streak on a milestone.
 */
export async function togglePromiseCompletionAction(
  _prevState: TogglePromiseState,
  formData: FormData,
): Promise<TogglePromiseState> {
  const failed = (error: string): TogglePromiseState => ({
    error,
    success: false,
    doneToday: false,
    currentStreak: 0,
    milestone: null,
  });

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failed("Du musst angemeldet sein.");
  }

  const promiseId = String(formData.get("promise_id") ?? "");
  if (!promiseId) {
    return failed("Promise nicht gefunden.");
  }

  // Defense-in-Depth: zusätzlich zur RLS explizit auf den Eigentümer filtern,
  // damit eine fremde promise_id aus dem Client-FormData ins Leere läuft.
  const { data: promise } = await supabase
    .from("promises")
    .select("id, longest_streak")
    .eq("id", promiseId)
    .eq("user_id", user.id)
    .single();

  if (!promise) {
    return failed("Promise nicht gefunden.");
  }

  const today = utcDateKey();

  const { data: existing } = await supabase
    .from("promise_completions")
    .select("id")
    .eq("promise_id", promiseId)
    .eq("completed_date", today)
    .maybeSingle();

  let doneToday: boolean;

  if (existing) {
    const { error } = await supabase
      .from("promise_completions")
      .delete()
      .eq("id", existing.id);
    if (error) {
      return failed(dbError(error, "promise_completions"));
    }
    doneToday = false;
  } else {
    const { error } = await supabase
      .from("promise_completions")
      .insert({ promise_id: promiseId, completed_date: today });
    // 23505 = unique_violation → already completed today, treat as done.
    if (error && error.code !== "23505") {
      return failed(dbError(error, "promise_completions"));
    }
    doneToday = true;
  }

  const { current, last } = await recomputeStreak(supabase, promiseId);
  const longest = Math.max(promise.longest_streak ?? 0, current);

  const { error: updateError } = await supabase
    .from("promises")
    .update({
      current_streak: current,
      longest_streak: longest,
      last_completed: last,
    })
    .eq("id", promiseId)
    .eq("user_id", user.id);

  if (updateError) {
    return failed(dbError(updateError, "promises"));
  }

  const milestone =
    doneToday && (MILESTONES as readonly number[]).includes(current)
      ? current
      : null;

  revalidatePath("/booster/promises");
  return { error: null, success: true, doneToday, currentStreak: current, milestone };
}

/** Mark a promise as no longer active ("Promise beenden"). */
export async function endPromiseAction(
  _prevState: EndPromiseState,
  formData: FormData,
): Promise<EndPromiseState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", success: false };
  }

  const promiseId = String(formData.get("promise_id") ?? "");
  if (!promiseId) {
    return { error: "Promise nicht gefunden.", success: false };
  }

  const { error } = await supabase
    .from("promises")
    .update({ active: false })
    .eq("id", promiseId)
    .eq("user_id", user.id);

  if (error) {
    return { error: dbError(error, "promises"), success: false };
  }

  revalidatePath("/booster/promises");
  return { error: null, success: true };
}
