"use server";

import { createClient } from "@/lib/supabase/server";

export type BillOfRightsActionState = {
  error: string | null;
  success: boolean;
};

export type RightsData = {
  journalEntry: {
    prompt1: string;
    prompt2: string;
    prompt3: string;
  } | null;
  rights: { id: string; text: string; active: boolean }[] | null;
  progress: {
    status: string;
    current_step: number;
  } | null;
  introSeen: boolean;
};

// ─── Get all data for the page ─────────────────────────────────────────

export async function getBillOfRightsData(): Promise<{
  error: string | null;
  data: RightsData | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", data: null };
  }

  // Fetch journal entry
  const { data: entry } = await supabase
    .from("journal_entries")
    .select("content")
    .eq("user_id", user.id)
    .eq("recipe_slug", "bill-of-rights")
    .eq("template_type", "bill_of_rights")
    .maybeSingle();

  // Fetch bill of rights
  const { data: bor } = await supabase
    .from("bill_of_rights")
    .select("rights")
    .eq("user_id", user.id)
    .maybeSingle();

  // Fetch progress
  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("status, current_step")
    .eq("user_id", user.id)
    .eq("recipe_slug", "bill-of-rights")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Intro "schon gesehen?" — gilt pro Slug, sobald irgendeine Zeile intro_seen=true hat.
  const { data: introRow } = await supabase
    .from("user_recipe_progress")
    .select("intro_seen")
    .eq("user_id", user.id)
    .eq("recipe_slug", "bill-of-rights")
    .eq("intro_seen", true)
    .limit(1)
    .maybeSingle();

  return {
    error: null,
    data: {
      journalEntry: entry?.content as RightsData["journalEntry"],
      rights: (bor?.rights as { id: string; text: string; active: boolean }[]) ?? null,
      progress: progress ? { status: progress.status, current_step: progress.current_step } : null,
      introSeen: Boolean(introRow),
    },
  };
}

// ─── Save Reflection (journal entry) ────────────────────────────────────

export async function saveReflectionAction(
  _prevState: BillOfRightsActionState,
  formData: FormData,
): Promise<BillOfRightsActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um zu speichern.", success: false };
  }

  const prompt1 = formData.get("prompt1") as string | null;
  const prompt2 = formData.get("prompt2") as string | null;
  const prompt3 = formData.get("prompt3") as string | null;

  if (!prompt1?.trim()) {
    return { error: "Bitte beschreib kurz, was diese Woche passiert ist.", success: false };
  }

  const content = {
    prompt1: prompt1 ?? "",
    prompt2: prompt2 ?? "",
    prompt3: prompt3 ?? "",
  };

  // Upsert journal_entries
  const { data: existingEntry } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_slug", "bill-of-rights")
    .eq("template_type", "bill_of_rights")
    .maybeSingle();

  if (existingEntry) {
    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({ content })
      .eq("id", existingEntry.id);

    if (updateError) {
      return { error: updateError.message, success: false };
    }
  } else {
    const { error: insertError } = await supabase
      .from("journal_entries")
      .insert({
        user_id: user.id,
        recipe_slug: "bill-of-rights",
        template_type: "bill_of_rights",
        content,
        entry_date: new Date().toISOString().slice(0, 10),
      });

    if (insertError) {
      return { error: insertError.message, success: false };
    }
  }

  // Mark progress as in_progress if not yet started
  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("recipe_slug", "bill-of-rights")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (progress && progress.status === "not_started") {
    await supabase
      .from("user_recipe_progress")
      .update({ status: "in_progress", current_step: 1 })
      .eq("id", progress.id);
  } else if (!progress) {
    // Create a new progress row if none exists
    await supabase.from("user_recipe_progress").insert({
      user_id: user.id,
      recipe_slug: "bill-of-rights",
      current_step: 1,
      status: "in_progress",
      started_at: new Date().toISOString(),
      cycle_number: 1,
    });
  }

  return { error: null, success: true };
}

// ─── Save Rights ────────────────────────────────────────────────────────

export async function saveRightsAction(
  _prevState: BillOfRightsActionState,
  formData: FormData,
): Promise<BillOfRightsActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um zu speichern.", success: false };
  }

  const rightsRaw = formData.get("rights") as string | null;
  if (!rightsRaw) {
    return { error: "Keine Rechte zum Speichern erhalten.", success: false };
  }

  let rights: { id: string; text: string; active: boolean }[];
  try {
    rights = JSON.parse(rightsRaw);
  } catch {
    return { error: "Ungültiges Format.", success: false };
  }

  // Upsert bill_of_rights
  const { data: existing } = await supabase
    .from("bill_of_rights")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from("bill_of_rights")
      .update({
        rights,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      return { error: updateError.message, success: false };
    }
  } else {
    const { error: insertError } = await supabase
      .from("bill_of_rights")
      .insert({
        user_id: user.id,
        rights,
      });

    if (insertError) {
      return { error: insertError.message, success: false };
    }
  }

  // Update progress: mark completed if 3+ rights
  const completed = rights.filter((r) => r.active).length >= 3;

  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("recipe_slug", "bill-of-rights")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (progress) {
    const update: Record<string, string | number> = { current_step: 2 };
    if (completed && progress.status !== "completed") {
      update.status = "completed";
      update.completed_at = new Date().toISOString();
    } else if (!completed && progress.status === "not_started") {
      update.status = "in_progress";
    }
    await supabase.from("user_recipe_progress").update(update).eq("id", progress.id);
  } else {
    const insert: Record<string, string | number | boolean> = {
      user_id: user.id,
      recipe_slug: "bill-of-rights",
      current_step: 2,
      status: completed ? "completed" : "in_progress",
      started_at: new Date().toISOString(),
      cycle_number: 1,
    };
    if (completed) {
      insert.completed_at = new Date().toISOString();
    }
    await supabase.from("user_recipe_progress").insert(insert);
  }

  return { error: null, success: true };
}

// ─── Messy Moments ──────────────────────────────────────────────────────

export type MessyMomentEntry = {
  id: string;
  entry_date: string;
  content: {
    messy_when: string;
    conflicting_rules: string;
    guilt_type: "healthy" | "unhealthy" | "unsure";
  };
};

export type MessyMomentsData = {
  entries: MessyMomentEntry[];
};

/**
 * Fetch all messy moment journal entries for the current user.
 */
export async function getMessyMoments(): Promise<MessyMomentsData> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { entries: [] };
  }

  const { data: entries } = await supabase
    .from("journal_entries")
    .select("id, entry_date, content")
    .eq("user_id", user.id)
    .eq("recipe_slug", "bill-of-rights")
    .eq("template_type", "messy_moment")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  return {
    entries: (entries as MessyMomentEntry[]) ?? [],
  };
}

export type MessyMomentActionState = {
  error: string | null;
  success: boolean;
};

/**
 * Save a new messy moment entry (always inserts a new row).
 */
export async function saveMessyMomentAction(
  _prevState: MessyMomentActionState,
  formData: FormData,
): Promise<MessyMomentActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um zu speichern.", success: false };
  }

  const messyWhen = formData.get("messy_when") as string | null;
  const conflictingRules = formData.get("conflicting_rules") as string | null;
  const guiltType = formData.get("guilt_type") as string | null;

  if (!messyWhen?.trim()) {
    return { error: "Bitte beschreib kurz, wann es diese Woche 'messy' geworden ist.", success: false };
  }

  if (!guiltType || !["healthy", "unhealthy", "unsure"].includes(guiltType)) {
    return { error: "Bitte wähl aus, ob die Schuld gesund oder ungesund war.", success: false };
  }

  const content = {
    messy_when: messyWhen.trim(),
    conflicting_rules: conflictingRules?.trim() ?? "",
    guilt_type: guiltType,
  };

  const { error: insertError } = await supabase.from("journal_entries").insert({
    user_id: user.id,
    recipe_slug: "bill-of-rights",
    template_type: "messy_moment",
    content,
    entry_date: new Date().toISOString().slice(0, 10),
  });

  if (insertError) {
    return { error: insertError.message, success: false };
  }

  // Mark progress as in_progress if not yet started
  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("recipe_slug", "bill-of-rights")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (progress && progress.status === "not_started") {
    await supabase
      .from("user_recipe_progress")
      .update({ status: "in_progress", current_step: 1 })
      .eq("id", progress.id);
  } else if (!progress) {
    await supabase.from("user_recipe_progress").insert({
      user_id: user.id,
      recipe_slug: "bill-of-rights",
      current_step: 1,
      status: "in_progress",
      started_at: new Date().toISOString(),
      cycle_number: 1,
    });
  }

  return { error: null, success: true };
}