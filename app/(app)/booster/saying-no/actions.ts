"use server";

import { revalidatePath } from "next/cache";

import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
import type { SayingNoContent } from "@/lib/types/db-json";
import { serverTodayKey } from "@/lib/server/timezone";
import { TEXT_MAX_LONG, tooLong } from "@/lib/utils/form-validation";
import { patchJournalContent } from "@/lib/utils/journal-content";

// ─── Nein-Trainer ───────────────────────────────────────────────────────
// Geführtes Mini-Rezept im Kopfwetter (Saying 'No' Blueprint).
// Einträge werden als journal_entries mit recipe_slug='saying-no' und
// template_type='saying_no' gespeichert. Nach dem ersten Speichern markiert
// die Action das Rezept als abgeschlossen (wie Things Got Messy: wiederholbar,
// Badge zeigt "Abgeschlossen"). Die KI-Felder trägt /api/saying-no-coach nach.

/**
 * Save a new Nein-Trainer entry (always inserts a new row — im Übungsmodus
 * ist jedes Szenario ein eigener Eintrag), then mark the recipe as completed.
 *
 * Die Nutzlast ist die ID des frischen Eintrags — Input für
 * /api/saying-no-coach.
 */
export async function saveSayingNoEntryAction(
  formData: FormData,
): Promise<ActionResult<string>> {
  const mode = formData.get("mode") as string | null;
  const situation = (formData.get("situation") as string | null)?.trim() ?? "";
  const draft = (formData.get("draft") as string | null)?.trim() ?? "";
  const scenarioSource = formData.get("scenario_source") as string | null;
  const hellYes = formData.get("hell_yes") as string | null;

  if (mode !== "real" && mode !== "practice") {
    return failed("Das hat gerade nicht geklappt. Versuch es noch einmal.");
  }
  if (!situation) {
    return failed("Es fehlt die Situation, um die es geht.");
  }
  if (!draft) {
    return failed("Schreib zuerst dein Nein auf.");
  }

  const lengthError = tooLong(situation, TEXT_MAX_LONG) ?? tooLong(draft, TEXT_MAX_LONG);
  if (lengthError) {
    return failed(lengthError);
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

  return withUser(async ({ supabase, user }) => {
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
      return dbFailed(insertError, "saying-no");
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
        return dbFailed(updateError, "saying-no");
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
        return dbFailed(progressInsertError, "saying-no");
      }
    }

    return ok(inserted.id);
  });
}

/**
 * Merge-Update auf einen bestehenden Eintrag: entweder der Zweitversuch
 * (draft2, vor der zweiten Feedback-Runde) oder das finale Nein
 * (final_no + final_source, beim Betreten des Abschluss-Screens).
 * Merged immer in content — nie ersetzen, sonst sind situation/draft weg.
 */
export async function saveFinalNoAction(
  formData: FormData,
): Promise<ActionResult> {
  const entryId = (formData.get("entryId") as string | null)?.trim() ?? "";
  const draft2 = (formData.get("draft2") as string | null)?.trim() ?? "";
  const finalNo = (formData.get("final_no") as string | null)?.trim() ?? "";
  const finalSource = formData.get("final_source") as string | null;

  if (!entryId || (!draft2 && !finalNo)) {
    return failed("Das hat gerade nicht geklappt. Versuch es noch einmal.");
  }

  const lengthError =
    (draft2 ? tooLong(draft2, TEXT_MAX_LONG) : null) ??
    (finalNo ? tooLong(finalNo, TEXT_MAX_LONG) : null);
  if (lengthError) {
    return failed(lengthError);
  }

  const result = await withUser(async ({ supabase, user }) => {
    const { data: row } = await supabase
      .from("journal_entries")
      .select("content")
      .eq("id", entryId)
      .eq("user_id", user.id)
      .eq("recipe_slug", "saying-no")
      .eq("template_type", "saying_no")
      .maybeSingle();

    if (!row) {
      return failed("Wir konnten deinen Eintrag nicht finden.");
    }

    const patch: Partial<SayingNoContent> = {};
    if (draft2) {
      patch.draft2 = draft2;
    }
    if (finalNo) {
      patch.final_no = finalNo;
      patch.final_source =
        finalSource === "own" || finalSource === "ai" || finalSource === "edited"
          ? finalSource
          : "own";
    }
    const merged = patchJournalContent("saying_no", row.content, patch);

    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({ content: merged })
      .eq("id", entryId)
      .eq("user_id", user.id);

    return updateError ? dbFailed(updateError, "saying-no") : ok();
  });

  if (result.error !== null) return result;

  revalidatePath("/journal");
  return result;
}
