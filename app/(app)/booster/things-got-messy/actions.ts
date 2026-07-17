"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { MessyMomentContent, RightItem } from "@/lib/types/db-json";
import { dbError } from "@/lib/utils/db-error";
import { serverTodayKey } from "@/lib/server/timezone";
import { saveRightsAction } from "@/app/(app)/recipes/bill-of-rights/actions";
import {
  TEXT_MAX_LONG,
  TEXT_MAX_SHORT,
  tooLong,
} from "@/lib/utils/form-validation";

// ─── Things Got Messy ───────────────────────────────────────────────────
// Geführtes Mini-Rezept im Kopfwetter. Einträge werden als
// journal_entries mit recipe_slug='things-got-messy' gespeichert;
// template_type bleibt 'messy_moment' (der Journal-Formatter formatMessyMoment
// ist darauf gekeyed). Nach dem Speichern markiert die Action das Rezept als
// abgeschlossen (wie Overthinking: wiederholbar, Badge zeigt "Abgeschlossen").

export type MessyMomentActionState = {
  error: string | null;
  success: boolean;
  /** ID des frisch angelegten Eintrags — Input für /api/messy-guilt-coach. */
  entryId: string | null;
};

/**
 * Save a new "Things Got Messy" reflection (always inserts a new row),
 * then mark the recipe as completed.
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
    return { error: "Du musst angemeldet sein, um zu speichern.", success: false, entryId: null };
  }

  const messyWhen = formData.get("messy_when") as string | null;

  if (!messyWhen?.trim()) {
    return { error: "Bitte erzähl kurz, was passiert ist.", success: false, entryId: null };
  }

  const lengthError = tooLong(messyWhen, TEXT_MAX_LONG);
  if (lengthError) {
    return { error: lengthError, success: false, entryId: null };
  }

  // Einordnung (gesund/ungesund) + Regel-Konflikt liefert die KI danach —
  // /api/messy-guilt-coach trägt ai_guilt_guess/ai_rules_conflict nach.
  const content = {
    messy_when: messyWhen.trim(),
  } satisfies MessyMomentContent;

  const { data: inserted, error: insertError } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      recipe_slug: "things-got-messy",
      template_type: "messy_moment",
      content,
      entry_date: await serverTodayKey(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: dbError(insertError, "things-got-messy"), success: false, entryId: null };
  }

  // Rezept-Fortschritt auf "completed" setzen (höchster Zyklus).
  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_slug", "things-got-messy")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (progress) {
    const { error: updateError } = await supabase
      .from("user_recipe_progress")
      .update({
        current_step: 1,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", progress.id);

    if (updateError) {
      return { error: dbError(updateError, "things-got-messy"), success: false, entryId: null };
    }
  } else {
    const { error: progressInsertError } = await supabase
      .from("user_recipe_progress")
      .insert({
        user_id: user.id,
        recipe_slug: "things-got-messy",
        current_step: 1,
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        cycle_number: 1,
      });

    if (progressInsertError) {
      return { error: dbError(progressInsertError, "things-got-messy"), success: false, entryId: null };
    }
  }

  return { error: null, success: true, entryId: inserted.id };
}

export type GuiltFeedbackActionState = {
  error: string | null;
  success: boolean;
};

/**
 * Antwort auf „Fühlt sich das stimmig an?" am Ergebnis-Screen: schreibt
 * guilt_feedback ins content-JSONB des Eintrags. Ein erneuter Tap
 * überschreibt einfach (Single-User, kein Concurrency-Thema).
 */
export async function saveGuiltFeedbackAction(
  _prevState: GuiltFeedbackActionState,
  formData: FormData,
): Promise<GuiltFeedbackActionState> {
  const entryId = (formData.get("entryId") as string | null)?.trim() ?? "";
  const feedback = formData.get("feedback") as string | null;

  if (!entryId || (feedback !== "agree" && feedback !== "disagree")) {
    return { error: "Das hat gerade nicht geklappt. Versuch es noch einmal.", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Du musst angemeldet sein.", success: false };

  const { data: row } = await supabase
    .from("journal_entries")
    .select("content")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .eq("recipe_slug", "things-got-messy")
    .eq("template_type", "messy_moment")
    .maybeSingle();

  if (!row) {
    return { error: "Wir konnten deinen Eintrag nicht finden.", success: false };
  }

  const merged: MessyMomentContent = {
    ...(row.content as MessyMomentContent),
    guilt_feedback: feedback,
  };

  const { error: updateError } = await supabase
    .from("journal_entries")
    .update({ content: merged })
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: dbError(updateError, "things-got-messy"), success: false };
  }

  revalidatePath("/journal");
  return { error: null, success: true };
}

export type AcceptRightActionState = {
  error: string | null;
  success: boolean;
};

/**
 * KI-Vorschlag aus dem Ergebnis-Screen übernehmen: hängt das (ggf. vom User
 * editierte) Recht ans Bill of Rights an. Läuft über die kanonische
 * saveRightsAction (Validierung, MAX_RIGHTS, Merge, BoR-Progress) — bewusst
 * ohne Redirect, damit der Wizard auf seinem Abschluss-Screen bleibt.
 */
export async function acceptSuggestedRightAction(
  _prevState: AcceptRightActionState,
  formData: FormData,
): Promise<AcceptRightActionState> {
  const text = (formData.get("text") as string | null)?.trim() ?? "";
  if (!text) return { error: "Der Vorschlag ist leer.", success: false };
  const lengthError = tooLong(text, TEXT_MAX_SHORT);
  if (lengthError) return { error: lengthError, success: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Du musst angemeldet sein.", success: false };

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

  const fd = new FormData();
  fd.set("rights", JSON.stringify(updated));
  const res = await saveRightsAction({ error: null, success: false }, fd);
  if (res.error) return { error: res.error, success: false };

  revalidatePath("/me/bill-of-rights");
  return { error: null, success: true };
}
