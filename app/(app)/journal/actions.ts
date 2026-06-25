"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/utils/db-error";

export type FreeEntryState = {
  error: string | null;
};

/**
 * Speichert einen freien, rezeptunabhängigen Journaleintrag. Titel + Text
 * gehen gemeinsam in content (die Tabelle hat keine title-Spalte).
 */
export async function createFreeEntryAction(
  _prevState: FreeEntryState,
  formData: FormData,
): Promise<FreeEntryState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um zu speichern." };
  }

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const body = (formData.get("body") as string | null)?.trim() ?? "";

  if (!body) {
    return { error: "Bitte schreib ein paar Worte, bevor du speicherst." };
  }

  const content: { title?: string; body: string } = { body };
  if (title) content.title = title;

  const { error } = await supabase.from("journal_entries").insert({
    user_id: user.id,
    recipe_slug: null,
    template_type: "free",
    content,
    entry_date: new Date().toISOString().slice(0, 10),
  });

  if (error) {
    return { error: dbError(error, "journal_entries") };
  }

  revalidatePath("/journal");
  redirect("/journal");
}
