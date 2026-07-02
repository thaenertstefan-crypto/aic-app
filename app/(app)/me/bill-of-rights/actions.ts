"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/utils/db-error";
import { serverTodayKey } from "@/lib/server/timezone";
import { saveRightsAction } from "@/app/(app)/recipes/bill-of-rights/actions";
import type { RightItem } from "@/lib/types/db-json";
import {
  TEXT_MAX_LONG,
  TEXT_MAX_SHORT,
  tooLong,
} from "@/lib/utils/form-validation";

export type MeRightsState = { error: string | null };

async function loadRights(): Promise<{ userId: string | null; rights: RightItem[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, rights: [] };

  const { data } = await supabase
    .from("bill_of_rights")
    .select("rights")
    .eq("user_id", user.id)
    .maybeSingle();

  return { userId: user.id, rights: (data?.rights as RightItem[] | null) ?? [] };
}

/** Schreibt das KOMPLETTE Array über die kanonische saveRightsAction zurück
 *  (upsert + BoR-Progress). */
async function persistRights(rights: RightItem[]): Promise<string | null> {
  const fd = new FormData();
  fd.set("rights", JSON.stringify(rights));
  const res = await saveRightsAction({ error: null, success: false }, fd);
  return res.error;
}

/** Manuelles Hinzufügen eines Rechts (Add-Seite). */
export async function appendRightAction(
  _prev: MeRightsState,
  formData: FormData,
): Promise<MeRightsState> {
  const text = (formData.get("text") as string | null)?.trim() ?? "";
  if (!text) return { error: "Bitte schreib zuerst dein Recht auf." };
  const lengthError = tooLong(text, TEXT_MAX_SHORT);
  if (lengthError) return { error: lengthError };

  const { userId, rights } = await loadRights();
  if (!userId) return { error: "Du musst angemeldet sein." };

  const updated: RightItem[] = [
    ...rights,
    { id: crypto.randomUUID(), text, active: true },
  ];

  const error = await persistRights(updated);
  if (error) return { error };

  revalidatePath("/me/bill-of-rights");
  redirect("/me/bill-of-rights");
}

/**
 * KI-Vorschlag übernehmen: Reflexion (prompt1..3) + finalen Vorschlag als
 * Journaleintrag (mit ai_insights) speichern und das Recht ans Array anhängen.
 */
export async function saveGeneratedRightAction(
  _prev: MeRightsState,
  formData: FormData,
): Promise<MeRightsState> {
  const prompt1 = (formData.get("prompt1") as string | null)?.trim() ?? "";
  const prompt3 = (formData.get("prompt3") as string | null)?.trim() ?? "";
  const text = (formData.get("text") as string | null)?.trim() ?? "";

  if (!text) return { error: "Der Vorschlag ist leer." };
  const lengthError =
    tooLong(text, TEXT_MAX_SHORT) ??
    tooLong(prompt1, TEXT_MAX_LONG) ??
    tooLong(prompt3, TEXT_MAX_LONG);
  if (lengthError) return { error: lengthError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Du musst angemeldet sein." };

  const content = { prompt1, prompt3 };

  // Journaleintrag upserten (ein bill_of_rights-Eintrag pro User) — mit ai_insights.
  const { data: existingEntry } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_slug", "bill-of-rights")
    .eq("template_type", "bill_of_rights")
    .maybeSingle();

  if (existingEntry) {
    const { error } = await supabase
      .from("journal_entries")
      .update({ content, ai_insights: text })
      .eq("id", existingEntry.id);
    if (error) return { error: dbError(error, "bill-of-rights") };
  } else {
    const { error } = await supabase.from("journal_entries").insert({
      user_id: user.id,
      recipe_slug: "bill-of-rights",
      template_type: "bill_of_rights",
      content,
      ai_insights: text,
      entry_date: await serverTodayKey(),
    });
    if (error) return { error: dbError(error, "bill-of-rights") };
  }

  // Recht ans bestehende Array anhängen.
  const { data: bor } = await supabase
    .from("bill_of_rights")
    .select("rights")
    .eq("user_id", user.id)
    .maybeSingle();
  const rights = (bor?.rights as RightItem[] | null) ?? [];
  const updated: RightItem[] = [
    ...rights,
    { id: crypto.randomUUID(), text, active: true },
  ];

  const persistError = await persistRights(updated);
  if (persistError) return { error: persistError };

  revalidatePath("/me/bill-of-rights");
  redirect("/me/bill-of-rights");
}
