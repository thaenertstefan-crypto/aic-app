"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types/action-state";
import { dbError } from "@/lib/utils/db-error";

export type RightsData = {
  rights: { id: string; text: string; active: boolean }[] | null;
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

  // Fetch bill of rights
  const { data: bor } = await supabase
    .from("bill_of_rights")
    .select("rights")
    .eq("user_id", user.id)
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
      rights: (bor?.rights as { id: string; text: string; active: boolean }[]) ?? null,
      introSeen: Boolean(introRow),
    },
  };
}

// ─── Save Rights ────────────────────────────────────────────────────────

export async function saveRightsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um zu speichern.", success: false };
  }

  const rightsRaw = formData.get("rights");
  if (typeof rightsRaw !== "string" || !rightsRaw) {
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
      return { error: dbError(updateError, "bill-of-rights"), success: false };
    }
  } else {
    const { error: insertError } = await supabase
      .from("bill_of_rights")
      .insert({
        user_id: user.id,
        rights,
      });

    if (insertError) {
      return { error: dbError(insertError, "bill-of-rights"), success: false };
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
    const { error: progressError } = await supabase
      .from("user_recipe_progress")
      .update(update)
      .eq("id", progress.id);
    if (progressError) {
      return { error: dbError(progressError, "bill-of-rights"), success: false };
    }
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
    const { error: progressError } = await supabase
      .from("user_recipe_progress")
      .insert(insert);
    if (progressError) {
      return { error: dbError(progressError, "bill-of-rights"), success: false };
    }
  }

  return { error: null, success: true };
}
