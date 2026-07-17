"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ShadowContent } from "@/lib/types/db-json";
import { dbError } from "@/lib/utils/db-error";
import { serverTodayKey } from "@/lib/server/timezone";
import { TEXT_MAX_LONG, tooLong } from "@/lib/utils/form-validation";

// ─── Schattenseite ──────────────────────────────────────────────────────
// Ventil-Rezept im Kopfwetter (Shadow Journal / Rage Walk).
// Privatsphäre-Garantie: Einträge (template_type 'shadow') werden von KEINER
// KI-Route gelesen und tragen `private: true` (unterdrückt die Text-Vorschau
// in der Journal-Liste). Beim „Verbrennen" wird gar nichts gespeichert —
// dann markiert nur markShadowDoneAction das Rezept als abgeschlossen.

export type ShadowActionState = {
  error: string | null;
  success: boolean;
};

/** Rezept-Fortschritt auf "completed" setzen (höchster Zyklus) — geteilt
 *  zwischen Behalten, Verbrennen und Rage Walk ohne Notiz. */
async function completeShadowProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("recipe_slug", "shadow")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (progress) {
    const { error } = await supabase
      .from("user_recipe_progress")
      .update({
        current_step: 1,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", progress.id);
    return error ? dbError(error, "shadow") : null;
  }

  const { error } = await supabase.from("user_recipe_progress").insert({
    user_id: userId,
    recipe_slug: "shadow",
    current_step: 1,
    status: "completed",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    cycle_number: 1,
  });
  return error ? dbError(error, "shadow") : null;
}

/**
 * „Behalten": Save a shadow entry (always inserts a new row), then mark the
 * recipe as completed. Kein entryId-Rückgabewert nötig — es folgt nie ein
 * KI-Call auf diesen Eintrag.
 */
export async function saveShadowEntryAction(
  _prevState: ShadowActionState,
  formData: FormData,
): Promise<ShadowActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um zu speichern.", success: false };
  }

  const body = (formData.get("body") as string | null)?.trim() ?? "";
  const mode = formData.get("mode") as string | null;

  if (!body) {
    return { error: "Es gibt noch nichts zu behalten — schreib erst etwas.", success: false };
  }
  const lengthError = tooLong(body, TEXT_MAX_LONG);
  if (lengthError) {
    return { error: lengthError, success: false };
  }

  const content: ShadowContent = {
    body,
    private: true,
    mode: mode === "walk" ? "walk" : "journal",
  };

  const { error: insertError } = await supabase.from("journal_entries").insert({
    user_id: user.id,
    recipe_slug: "shadow",
    template_type: "shadow",
    content,
    entry_date: await serverTodayKey(),
  });

  if (insertError) {
    return { error: dbError(insertError, "shadow"), success: false };
  }

  const progressError = await completeShadowProgress(supabase, user.id);
  if (progressError) {
    return { error: progressError, success: false };
  }

  revalidatePath("/journal");
  return { error: null, success: true };
}

/**
 * „Verbrennen" bzw. Rage Walk ohne Notiz: NICHTS wird gespeichert — nur der
 * Rezept-Fortschritt wird abgeschlossen. Fire-and-forget vom Client.
 */
export async function markShadowDoneAction(): Promise<ShadowActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Du musst angemeldet sein.", success: false };

  const progressError = await completeShadowProgress(supabase, user.id);
  return { error: progressError, success: progressError === null };
}
