"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { RightItem, SayingNoContent } from "@/lib/types/db-json";
import { dbError } from "@/lib/utils/db-error";
import { serverTodayKey } from "@/lib/server/timezone";
import { saveRightsAction } from "@/app/(app)/recipes/bill-of-rights/actions";
import {
  TEXT_MAX_LONG,
  TEXT_MAX_SHORT,
  tooLong,
} from "@/lib/utils/form-validation";

// ─── Nein-Trainer ───────────────────────────────────────────────────────
// Geführtes Mini-Rezept im Kopfwetter (Saying 'No' Blueprint).
// Einträge werden als journal_entries mit recipe_slug='saying-no' und
// template_type='saying_no' gespeichert. Nach dem ersten Speichern markiert
// die Action das Rezept als abgeschlossen (wie Things Got Messy: wiederholbar,
// Badge zeigt "Abgeschlossen"). Die KI-Felder trägt /api/saying-no-coach nach.

export type SayingNoActionState = {
  error: string | null;
  success: boolean;
  /** ID des frisch angelegten Eintrags — Input für /api/saying-no-coach. */
  entryId: string | null;
};

/**
 * Save a new Nein-Trainer entry (always inserts a new row — im Übungsmodus
 * ist jedes Szenario ein eigener Eintrag), then mark the recipe as completed.
 */
export async function saveSayingNoEntryAction(
  _prevState: SayingNoActionState,
  formData: FormData,
): Promise<SayingNoActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um zu speichern.", success: false, entryId: null };
  }

  const mode = formData.get("mode") as string | null;
  const situation = (formData.get("situation") as string | null)?.trim() ?? "";
  const draft = (formData.get("draft") as string | null)?.trim() ?? "";
  const scenarioSource = formData.get("scenario_source") as string | null;
  const hellYes = formData.get("hell_yes") as string | null;

  if (mode !== "real" && mode !== "practice") {
    return { error: "Das hat gerade nicht geklappt. Versuch es noch einmal.", success: false, entryId: null };
  }
  if (!situation) {
    return { error: "Es fehlt die Situation, um die es geht.", success: false, entryId: null };
  }
  if (!draft) {
    return { error: "Schreib zuerst dein Nein auf.", success: false, entryId: null };
  }

  const lengthError = tooLong(situation, TEXT_MAX_LONG) ?? tooLong(draft, TEXT_MAX_LONG);
  if (lengthError) {
    return { error: lengthError, success: false, entryId: null };
  }

  // Blueprint-Check + verbesserte Version liefert die KI danach —
  // /api/saying-no-coach trägt ai_checklist/ai_improved nach.
  const content: SayingNoContent = {
    mode,
    situation,
    draft,
  };
  if (mode === "practice" && (scenarioSource === "ai" || scenarioSource === "static")) {
    content.scenario_source = scenarioSource;
  }
  if (mode === "real" && (hellYes === "true" || hellYes === "false")) {
    content.hell_yes = hellYes === "true";
  }

  const { data: inserted, error: insertError } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      recipe_slug: "saying-no",
      template_type: "saying_no",
      content,
      entry_date: await serverTodayKey(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: dbError(insertError, "saying-no"), success: false, entryId: null };
  }

  // Rezept-Fortschritt auf "completed" setzen (höchster Zyklus).
  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_slug", "saying-no")
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
      return { error: dbError(updateError, "saying-no"), success: false, entryId: null };
    }
  } else {
    const { error: progressInsertError } = await supabase
      .from("user_recipe_progress")
      .insert({
        user_id: user.id,
        recipe_slug: "saying-no",
        current_step: 1,
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        cycle_number: 1,
      });

    if (progressInsertError) {
      return { error: dbError(progressInsertError, "saying-no"), success: false, entryId: null };
    }
  }

  return { error: null, success: true, entryId: inserted.id };
}

export type FinalNoActionState = {
  error: string | null;
  success: boolean;
};

/**
 * Merge-Update auf einen bestehenden Eintrag: entweder der Zweitversuch
 * (draft2, vor der zweiten Feedback-Runde) oder das finale Nein
 * (final_no + final_source, beim Betreten des Abschluss-Screens).
 * Merged immer in content — nie ersetzen, sonst sind situation/draft weg.
 */
export async function saveFinalNoAction(
  _prevState: FinalNoActionState,
  formData: FormData,
): Promise<FinalNoActionState> {
  const entryId = (formData.get("entryId") as string | null)?.trim() ?? "";
  const draft2 = (formData.get("draft2") as string | null)?.trim() ?? "";
  const finalNo = (formData.get("final_no") as string | null)?.trim() ?? "";
  const finalSource = formData.get("final_source") as string | null;

  if (!entryId || (!draft2 && !finalNo)) {
    return { error: "Das hat gerade nicht geklappt. Versuch es noch einmal.", success: false };
  }

  const lengthError =
    (draft2 ? tooLong(draft2, TEXT_MAX_LONG) : null) ??
    (finalNo ? tooLong(finalNo, TEXT_MAX_LONG) : null);
  if (lengthError) {
    return { error: lengthError, success: false };
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
    .eq("recipe_slug", "saying-no")
    .eq("template_type", "saying_no")
    .maybeSingle();

  if (!row) {
    return { error: "Wir konnten deinen Eintrag nicht finden.", success: false };
  }

  const merged: SayingNoContent = {
    ...(row.content as SayingNoContent),
  };
  if (draft2) {
    merged.draft2 = draft2;
  }
  if (finalNo) {
    merged.final_no = finalNo;
    merged.final_source =
      finalSource === "own" || finalSource === "ai" || finalSource === "edited"
        ? finalSource
        : "own";
  }

  const { error: updateError } = await supabase
    .from("journal_entries")
    .update({ content: merged })
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: dbError(updateError, "saying-no"), success: false };
  }

  revalidatePath("/journal");
  return { error: null, success: true };
}

export type AcceptRightActionState = {
  error: string | null;
  success: boolean;
};

/**
 * KI-Vorschlag aus dem Abschluss-Screen übernehmen: hängt das (ggf. vom User
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
