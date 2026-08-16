"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser, type ActionContext } from "@/lib/actions/with-user";
import { serverTodayKey } from "@/lib/server/timezone";
import { saveRightsAction } from "@/lib/recipes/bill-of-rights/actions";
import type { BillOfRightsContent, RightItem } from "@/lib/types/db-json";
import {
  TEXT_MAX_LONG,
  TEXT_MAX_SHORT,
  tooLong,
} from "@/lib/utils/form-validation";

/** Schreibt das KOMPLETTE Array über die kanonische saveRightsAction zurück
 *  (upsert + BoR-Progress). */
async function persistRights(rights: RightItem[]): Promise<ActionResult> {
  const fd = new FormData();
  fd.set("rights", JSON.stringify(rights));
  const res = await saveRightsAction(fd);
  return res.error !== null ? failed(res.error) : ok();
}

/** Hängt ein Recht ans bestehende Array des Users an und schreibt es zurück. */
async function appendRight(
  { supabase, user }: ActionContext,
  text: string,
): Promise<ActionResult> {
  const { data } = await supabase
    .from("bill_of_rights")
    .select("rights")
    .eq("user_id", user.id)
    .maybeSingle();

  const rights = (data?.rights as RightItem[] | null) ?? [];
  return persistRights([
    ...rights,
    { id: crypto.randomUUID(), text, active: true },
  ]);
}

/** Manuelles Hinzufügen eines Rechts (Add-Seite). */
export async function appendRightAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const text = (formData.get("text") as string | null)?.trim() ?? "";
  if (!text) return failed("Bitte schreib zuerst dein Recht auf.");
  const lengthError = tooLong(text, TEXT_MAX_SHORT);
  if (lengthError) return failed(lengthError);

  const result = await withUser((ctx) => appendRight(ctx, text));
  if (result.error !== null) return result;

  revalidatePath("/me/bill-of-rights");
  redirect("/me/bill-of-rights");
}

/**
 * KI-Vorschlag übernehmen: Reflexion (Situation + alte Regel) + gewähltes
 * Recht als Journaleintrag (mit ai_insights) speichern und das Recht ans
 * Array anhängen.
 */
export async function saveGeneratedRightAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const prompt1 = (formData.get("prompt1") as string | null)?.trim() ?? "";
  const aiAnalysis = (formData.get("ai_analysis") as string | null)?.trim() ?? "";
  const oldRule = (formData.get("old_rule") as string | null)?.trim() ?? "";
  const text = (formData.get("text") as string | null)?.trim() ?? "";

  if (!text) return failed("Der Vorschlag ist leer.");
  const lengthError =
    tooLong(text, TEXT_MAX_SHORT) ??
    tooLong(prompt1, TEXT_MAX_LONG) ??
    tooLong(aiAnalysis, TEXT_MAX_LONG) ??
    tooLong(oldRule, TEXT_MAX_SHORT);
  if (lengthError) return failed(lengthError);

  const content: BillOfRightsContent = {
    prompt1,
    ...(aiAnalysis ? { ai_analysis: aiAnalysis } : {}),
    ...(oldRule ? { old_rule: oldRule } : {}),
  };

  const result = await withUser(async (ctx) => {
    const { supabase, user } = ctx;

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
      if (error) return dbFailed(error, "bill-of-rights");
    } else {
      const { error } = await supabase.from("journal_entries").insert({
        user_id: user.id,
        recipe_slug: "bill-of-rights",
        template_type: "bill_of_rights",
        content,
        ai_insights: text,
        entry_date: await serverTodayKey(),
      });
      if (error) return dbFailed(error, "bill-of-rights");
    }

    return appendRight(ctx, text);
  });
  if (result.error !== null) return result;

  revalidatePath("/me/bill-of-rights");
  redirect("/me/bill-of-rights");
}
