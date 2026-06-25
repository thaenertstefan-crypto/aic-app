"use server";

import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/utils/db-error";
import { utcDateKey } from "@/lib/utils/date";

// ─── Things Got Messy ───────────────────────────────────────────────────
// Eigenständige Übung in der Kopf-Apotheke. Einträge werden als journal_entries
// mit recipe_slug='things-got-messy' gespeichert; template_type bleibt
// 'messy_moment' (der Journal-Formatter formatMessyMoment ist darauf gekeyed).

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
 * Fetch all "Things Got Messy" journal entries for the current user.
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
    .eq("recipe_slug", "things-got-messy")
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
 * Save a new "Things Got Messy" reflection (always inserts a new row).
 * Bewusst entkoppelt: berührt user_recipe_progress NICHT mehr.
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
    recipe_slug: "things-got-messy",
    template_type: "messy_moment",
    content,
    entry_date: utcDateKey(),
  });

  if (insertError) {
    return { error: dbError(insertError, "things-got-messy"), success: false };
  }

  return { error: null, success: true };
}
