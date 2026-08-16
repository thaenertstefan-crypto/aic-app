"use server";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/types/action-state";
import type { DailyValueContent, ValueEvalContent } from "@/lib/types/db-json";
import { dbError } from "@/lib/utils/db-error";
import { serverTodayKey } from "@/lib/server/timezone";
import { TEXT_MAX_LONG, tooLong } from "@/lib/utils/form-validation";
import type { Tables } from "@/lib/supabase/database.types";
import {
  patchJournalContent,
  readJournalContent,
} from "@/lib/utils/journal-content";

// Werte-Slugs/-Labels sind Kurzstrings; custom Werte sind erlaubt, daher wird
// nur Typ + Länge geprüft (nicht gegen die values-bank).
const MAX_VALUE_LEN = 100;

/** Prüft, dass ein geparstes Werte-Array nur Kurzstrings enthält (max. 20). */
function isValueList(values: unknown): values is string[] {
  return (
    Array.isArray(values) &&
    values.length <= 20 &&
    values.every((v) => typeof v === "string" && v.length <= MAX_VALUE_LEN)
  );
}

/**
 * Save the values hypothesis (Step 1 of Recipe #1).
 * - Upserts into values_hypothesis (version 1)
 * - Advances user_recipe_progress to step 2
 */
export async function saveHypothesisAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um deine Werte zu speichern." };
  }

  const valuesRaw = formData.get("values");
  if (!valuesRaw || typeof valuesRaw !== "string") {
    return { error: "Keine Werte ausgewählt." };
  }

  let values: unknown;
  try {
    values = JSON.parse(valuesRaw);
  } catch {
    return { error: "Ungültiges Format der ausgewählten Werte." };
  }

  if (!isValueList(values)) {
    return { error: "Ungültiges Format der ausgewählten Werte." };
  }
  if (values.length !== 5) {
    return { error: "Bitte genau 5 Werte auswählen." };
  }

  // --- Save to values_hypothesis (upsert by user_id + version 1) ---
  const { data: existingHypothesis } = await supabase
    .from("values_hypothesis")
    .select("id")
    .eq("user_id", user.id)
    .eq("version", 1)
    .maybeSingle();

  if (existingHypothesis) {
    const { error: updateError } = await supabase
      .from("values_hypothesis")
      .update({ values })
      .eq("id", existingHypothesis.id);

    if (updateError) {
      return { error: dbError(updateError, "values") };
    }
  } else {
    const { error: insertError } = await supabase
      .from("values_hypothesis")
      .insert({
        user_id: user.id,
        values,
        version: 1,
        confirmed: false,
      });

    if (insertError) {
      return { error: dbError(insertError, "values") };
    }
  }

  // --- Advance user_recipe_progress to step 2 ---
  const { data: existingProgress } = await supabase
    .from("user_recipe_progress")
    .select("started_at, id")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingProgress) {
    const { error: updateError } = await supabase
      .from("user_recipe_progress")
      .update({
        current_step: 2,
        status: "in_progress",
        started_at: existingProgress.started_at ?? new Date().toISOString(),
      })
      .eq("id", existingProgress.id);

    if (updateError) {
      return { error: dbError(updateError, "values") };
    }
  } else {
    // Shouldn't happen normally (user would have started the recipe first),
    // but handle gracefully by creating progress row.
    const { error: insertError } = await supabase
      .from("user_recipe_progress")
      .insert({
        user_id: user.id,
        recipe_slug: "values",
        current_step: 2,
        status: "in_progress",
        started_at: new Date().toISOString(),
        cycle_number: 1,
      });

    if (insertError) {
      return { error: dbError(insertError, "values") };
    }
  }

  // Kein Redirect mehr — die Form zeigt nach Erfolg einen Completion-Screen
  // (grüner Haken + Werte-Liste) und verlinkt von dort auf die Journey-Übersicht.
  return { error: null, success: true };
}

/**
 * Fetch the user's previously selected values (Step 1), if any.
 * Used to pre-fill the hypothesis form when revisiting the step.
 */
export async function getHypothesisData(): Promise<string[] | null> {
  const user = await getCachedUser();

  if (!user) return null;

  const supabase = await createClient();
  const { data: hypothesisRow } = await supabase
    .from("values_hypothesis")
    .select("values")
    .eq("user_id", user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (hypothesisRow?.values as string[]) ?? null;
}

// ─── Journal (Step 2) ────────────────────────────────────────────────

export type JournalEntry = {
  id: string;
  entry_date: string;
  content: DailyValueContent;
};

/** Die Spalten, aus denen ein `JournalEntry` gelesen wird — `template_type`
 *  gehört dazu, weil ohne die Diskriminante nichts zu verengen ist. */
const JOURNAL_ENTRY_SELECT = "id, entry_date, template_type, content";

/** Genau die Spalten aus `JOURNAL_ENTRY_SELECT`, aus den generierten Typen
 *  abgeleitet statt nachgebaut. */
type JournalEntrySelection = Pick<
  Tables<"journal_entries">,
  "id" | "entry_date" | "template_type" | "content"
>;

/**
 * DB-Zeilen auf den geprüften Shape ziehen.
 *
 * Eine Zeile, die sich nicht als `daily_value` lesen lässt, bleibt trotzdem in
 * der Liste — mit leerem Text, also genau dem, was vor der Verengung zu sehen
 * war. Sie wegzulassen wäre teurer als es aussieht: an der LÄNGE dieser Liste
 * hängen zwei Gates (`evaluation/page.tsx` leitet unter 7 Einträgen zurück,
 * `journal-form.tsx` schaltet ab 7 frei), während der Fortschritt in
 * `saveJournalEntryAction` per DB-`count(*)` zählt. Eine gefilterte Liste
 * ließe beide Zähler auseinanderlaufen: „7 von 7“ im Journal, und die
 * Auswertung wirft trotzdem zurück.
 */
function toJournalEntries(
  rows: JournalEntrySelection[] | null,
): JournalEntry[] {
  return (rows ?? []).map((row) => {
    const entry = readJournalContent(row.template_type, row.content);
    return {
      id: row.id,
      entry_date: row.entry_date ?? "",
      content:
        entry.template === "daily_value" ? entry.content : { happenings: "" },
    };
  });
}

export type JournalPageData = {
  hypothesis: string[] | null;
  entries: JournalEntry[];
  startedAt: string | null;
  currentStep: number;
};

/**
 * Optional vorgeladene Daten, die der Aufrufer (z. B. die Rezept-Detailseite)
 * bereits geholt hat — werden durchgereicht, um doppelte Round-Trips zu
 * vermeiden. Wird `preloaded` übergeben, holt getJournalData nur noch die
 * Journal-Einträge frisch; progress/hypothesis stammen aus dem Aufrufer.
 */
type JournalDataPreload = {
  progress: { started_at: string | null; current_step: number | null } | null;
  hypothesisValues: string[] | null;
};

/**
 * Fetch all data needed for the journal page (Step 2 of Recipe #1).
 */
export async function getJournalData(
  preloaded?: JournalDataPreload,
): Promise<JournalPageData> {
  const user = await getCachedUser();

  if (!user) {
    return { hypothesis: null, entries: [], startedAt: null, currentStep: 1 };
  }

  const supabase = await createClient();

  // Journal-Einträge werden immer frisch gelesen.
  const entriesQuery = supabase
    .from("journal_entries")
    .select(JOURNAL_ENTRY_SELECT)
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .eq("template_type", "daily_value")
    .order("entry_date", { ascending: true });

  // Schnellpfad: progress + hypothesis vom Aufrufer übernommen → nur entries.
  if (preloaded) {
    const { data: entries, error: entriesError } = await entriesQuery;
    if (entriesError) {
      throw new Error(`getJournalData: read failed (${entriesError.code ?? "unknown"})`);
    }
    return {
      hypothesis: preloaded.hypothesisValues,
      entries: toJournalEntries(entries),
      startedAt: preloaded.progress?.started_at ?? null,
      currentStep: preloaded.progress?.current_step ?? 1,
    };
  }

  // Standalone: die drei unabhängigen Reads parallel statt seriell.
  const [
    { data: hypothesisRow, error: hypothesisError },
    { data: entries, error: entriesError },
    { data: progress, error: progressError },
  ] = await Promise.all([
    supabase
      .from("values_hypothesis")
      .select("values")
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    entriesQuery,
    supabase
      .from("user_recipe_progress")
      .select("started_at, current_step")
      .eq("user_id", user.id)
      .eq("recipe_slug", "values")
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Echte Lesefehler an die Segment-Error-Boundary geben statt als Leerzustand.
  const readError = hypothesisError ?? entriesError ?? progressError;
  if (readError) {
    throw new Error(`getJournalData: read failed (${readError.code ?? "unknown"})`);
  }

  return {
    hypothesis: (hypothesisRow?.values as string[]) ?? null,
    entries: toJournalEntries(entries),
    startedAt: progress?.started_at ?? null,
    currentStep: progress?.current_step ?? 1,
  };
}

/**
 * Save (create or update) a daily journal entry for Recipe #1.
 * - Upserts into journal_entries by (user_id, entry_date, template_type)
 * - After saving, if 7+ entries exist, advances user_recipe_progress to step 3
 */
export async function saveJournalEntryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um einen Eintrag zu speichern." };
  }

  // entry_date serverseitig in der User-Zeitzone bestimmen (nicht dem Client
  // vertrauen) — damit Schreiben und Gating dieselbe Tagesgrenze nutzen.
  const entryDate = await serverTodayKey();
  const happenings = formData.get("happenings");

  if (!happenings || typeof happenings !== "string") {
    return { error: "Bitte beschreib, was heute passiert ist." };
  }
  const lengthError = tooLong(happenings, TEXT_MAX_LONG);
  if (lengthError) {
    return { error: lengthError };
  }

  // Bearbeitung eines bestehenden (auch vergangenen) Eintrags: update-only per
  // id — kein Insert, damit das Tages-Gating nicht über ein Client-Datum
  // umgangen werden kann. Der Eintrag muss dem User gehören.
  const entryIdRaw = formData.get("entry_id");
  if (typeof entryIdRaw === "string" && entryIdRaw.length > 0) {
    const { data: target } = await supabase
      .from("journal_entries")
      .select("id, content")
      .eq("id", entryIdRaw)
      .eq("user_id", user.id)
      .eq("recipe_slug", "values")
      .eq("template_type", "daily_value")
      .maybeSingle();

    if (!target) {
      return { error: "Der Eintrag konnte nicht gefunden werden." };
    }

    // Merge statt Überschreiben: Alt-Einträge tragen noch ein `response`-Feld
    // im JSONB-content, das hier sonst beim Speichern verloren ginge.
    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({
        content: patchJournalContent("daily_value", target.content, {
          happenings,
        }),
      })
      .eq("id", target.id);

    if (updateError) {
      return { error: dbError(updateError, "values") };
    }

    revalidatePath("/me/values/journey/journal");
    return { error: null };
  }

  // Check if an entry already exists for this date
  const { data: existingEntry } = await supabase
    .from("journal_entries")
    .select("id, content")
    .eq("user_id", user.id)
    .eq("entry_date", entryDate)
    .eq("template_type", "daily_value")
    .maybeSingle();

  if (existingEntry) {
    // Update existing entry — merge, see Kommentar oben.
    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({
        content: patchJournalContent("daily_value", existingEntry.content, {
          happenings,
        }),
      })
      .eq("id", existingEntry.id);

    if (updateError) {
      return { error: dbError(updateError, "values") };
    }
  } else {
    // Insert new entry — frischer Eintrag hat nichts zu bewahren.
    const { error: insertError } = await supabase
      .from("journal_entries")
      .insert({
        user_id: user.id,
        recipe_slug: "values",
        template_type: "daily_value",
        entry_date: entryDate,
        content: { happenings },
      });

    if (insertError) {
      return { error: dbError(insertError, "values") };
    }
  }

  // After save, count entries — if 7+, advance to step 3
  const { count } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .eq("template_type", "daily_value");

  if (count !== null && count >= 7) {
    const { data: progress } = await supabase
      .from("user_recipe_progress")
      .select("id, current_step")
      .eq("user_id", user.id)
      .eq("recipe_slug", "values")
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (progress && (progress.current_step ?? 1) < 3) {
      const { error: advanceError } = await supabase
        .from("user_recipe_progress")
        .update({ current_step: 3 })
        .eq("id", progress.id);
      if (advanceError) {
        return { error: dbError(advanceError, "values") };
      }
    }
  }

  revalidatePath("/me/values/journey/journal");
  return { error: null };
}

// ─── Evaluation (Step 3) ───────────────────────────────────────────

export type ValueEvalEntry = {
  id: string;
  content: ValueEvalContent;
  aiInsights: string | null;
} | null;

export type EvaluationPageData = {
  hypothesis: string[];
  hypothesisVersion: number;
  entries: JournalEntry[];
  valueEvalEntry: ValueEvalEntry;
  progress: {
    id: string;
    cycleNumber: number | null;
    startedAt: string | null;
    status: string | null;
  } | null;
  phase: "reflection" | "adjust" | "complete";
};

/**
 * Fetch all data needed for the evaluation page (Step 3 of Recipe #1).
 * - Computes which phase the user should see (reflection / adjust / complete)
 * - Redirects to journal if fewer than 7 entries exist
 */
export async function getEvaluationData(): Promise<EvaluationPageData> {
  const user = await getCachedUser();

  if (!user) {
    return {
      hypothesis: [],
      hypothesisVersion: 1,
      entries: [],
      valueEvalEntry: null,
      progress: null,
      phase: "reflection",
    };
  }

  const supabase = await createClient();

  // Die vier unabhängigen Reads parallel statt seriell.
  // Hinweis zu den Einträgen: die letzten 7 nach created_at zu zählen hält dies
  // konsistent mit dem Journal-Schritt (der "Zur Auswertung" ab 7 Einträgen
  // freischaltet) und mit der journal-analysis-Route — statt nach
  // entry_date >= started_at zu filtern (was das Test-Backdating in
  // journal-form.tsx bricht).
  const [
    { data: progress },
    { data: hypothesisRow },
    { data: entries },
    { data: evalRow },
  ] = await Promise.all([
    supabase
      .from("user_recipe_progress")
      .select("id, cycle_number, started_at, status")
      .eq("user_id", user.id)
      .eq("recipe_slug", "values")
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("values_hypothesis")
      .select("values, version")
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("journal_entries")
      .select(JOURNAL_ENTRY_SELECT)
      .eq("user_id", user.id)
      .eq("recipe_slug", "values")
      .eq("template_type", "daily_value")
      .order("created_at", { ascending: false })
      .limit(7),
    supabase
      .from("journal_entries")
      .select("id, template_type, content, ai_insights")
      .eq("user_id", user.id)
      .eq("recipe_slug", "values")
      .eq("template_type", "value_eval")
      .maybeSingle(),
  ]);

  const hypothesis = (hypothesisRow?.values as string[]) ?? [];
  const hypothesisVersion = hypothesisRow?.version ?? 1;

  // Show them in chronological order.
  const cycleEntries = toJournalEntries(entries).reverse();

  // Die Zeile trägt die Phase der Auswertung, auch wenn ihr content (noch)
  // nicht lesbar ist — deshalb bleibt der Eintrag bestehen und nur der content
  // fällt auf die leere Reflexion zurück, wie bisher bei fehlendem content.
  const evalContent = evalRow
    ? readJournalContent(evalRow.template_type, evalRow.content)
    : null;
  const valueEvalEntry: ValueEvalEntry = evalRow
    ? {
        id: evalRow.id,
        content:
          evalContent?.template === "value_eval"
            ? evalContent.content
            : { positive_reflection: "", negative_reflection: "" },
        aiInsights: evalRow.ai_insights ?? null,
      }
    : null;

  // Compute phase
  const status = progress?.status ?? "not_started";
  let phase: "reflection" | "adjust" | "complete";

  if (status === "completed" || hypothesisVersion > 1) {
    phase = "complete";
  } else if (valueEvalEntry) {
    phase = "adjust";
  } else {
    phase = "reflection";
  }

  return {
    hypothesis,
    hypothesisVersion,
    entries: cycleEntries,
    valueEvalEntry,
    progress: progress
      ? {
          id: progress.id,
          cycleNumber: progress.cycle_number,
          startedAt: progress.started_at,
          status: progress.status,
        }
      : null,
    phase,
  };
}

/**
 * Save the evaluation reflection (Phase 1 of Step 3).
 * Upserts a journal_entries row with template_type='value_eval'.
 * Returns success so the client can transition to the adjust phase.
 */
export async function saveEvalReflectionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", success: false };
  }

  // Beide Felder sind FREIWILLIG (Bühne A sagt das auch so). Die Zeile wird
  // trotzdem angelegt: sie trägt die Phase der Auswertung UND ist der
  // Speicherort für das KI-Ergebnis.
  const positiveRaw = formData.get("positive_reflection");
  const negativeRaw = formData.get("negative_reflection");
  const positiveReflection = typeof positiveRaw === "string" ? positiveRaw : "";
  const negativeReflection = typeof negativeRaw === "string" ? negativeRaw : "";

  const lengthError =
    tooLong(positiveReflection, TEXT_MAX_LONG) ??
    tooLong(negativeReflection, TEXT_MAX_LONG);
  if (lengthError) {
    return { error: lengthError, success: false };
  }

  // Check if value_eval entry already exists
  const { data: existing } = await supabase
    .from("journal_entries")
    .select("id, content")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .eq("template_type", "value_eval")
    .maybeSingle();

  if (existing) {
    // Merge statt Überschreiben: im content können bereits ai_confirmed /
    // ai_suggested stehen, die hier sonst verloren gingen.
    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({
        content: patchJournalContent("value_eval", existing.content, {
          positive_reflection: positiveReflection,
          negative_reflection: negativeReflection,
        }),
      })
      .eq("id", existing.id);

    if (updateError) {
      return { error: dbError(updateError, "values"), success: false };
    }
  } else {
    const { error: insertError } = await supabase.from("journal_entries").insert(
      {
        user_id: user.id,
        recipe_slug: "values",
        template_type: "value_eval",
        content: {
          positive_reflection: positiveReflection,
          negative_reflection: negativeReflection,
        },
      },
    );

    if (insertError) {
      return { error: dbError(insertError, "values"), success: false };
    }
  }

  return { error: null, success: true };
}

/**
 * Save adjusted values (Phase 2 of Step 3).
 * - Creates a NEW values_hypothesis row with version+1 (preserving history)
 * - Marks user_recipe_progress as completed
 * - Returns success so the client can transition to the complete phase
 */
export async function saveAdjustedHypothesisAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", success: false };
  }

  const valuesRaw = formData.get("values");
  if (!valuesRaw || typeof valuesRaw !== "string") {
    return { error: "Keine Werte angegeben.", success: false };
  }

  let values: unknown;
  try {
    values = JSON.parse(valuesRaw);
  } catch {
    return { error: "Ungültiges Format der Werte.", success: false };
  }

  if (!isValueList(values)) {
    return { error: "Ungültiges Format der Werte.", success: false };
  }
  // Der Kompass trägt genau fünf Werte — die Tausch-Mechanik in Bühne B hält
  // die Anzahl clientseitig konstant, hier steht das Gegenstück dazu. Zusätzlich
  // auf fünf UNTERSCHIEDLICHE Werte prüfen: die Tausch-Kette (Wert raus, ein
  // anderer rein für ihn, der erste per "Rückgängig" zurück) kann clientseitig
  // ein Duplikat erzeugen, das die Längenprüfung allein nicht fängt.
  if (values.length !== 5 || new Set(values).size !== 5) {
    return {
      error: "Bitte genau 5 unterschiedliche Werte auswählen.",
      success: false,
    };
  }

  const originalVersionRaw = formData.get("original_version");
  const originalVersion = parseInt(
    typeof originalVersionRaw === "string" ? originalVersionRaw : "",
    10,
  );
  const newVersion = isNaN(originalVersion) ? 2 : originalVersion + 1;

  // Insert new hypothesis row
  const { error: insertError } = await supabase
    .from("values_hypothesis")
    .insert({
      user_id: user.id,
      values,
      version: newVersion,
      confirmed: true,
    });

  if (insertError) {
    return { error: dbError(insertError, "values"), success: false };
  }

  // Mark recipe progress as completed
  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (progress) {
    const { error: updateError } = await supabase
      .from("user_recipe_progress")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", progress.id);

    if (updateError) {
      return { error: dbError(updateError, "values"), success: false };
    }
  }

  revalidatePath("/me/values/journey/evaluation");
  return { error: null, success: true };
}

/**
 * Start a new 7-day journal cycle (Phase 3 CTA).
 * Creates a new user_recipe_progress row with cycle_number+1,
 * current_step=2 (skip hypothesis), then redirects to the journal.
 *
 * HINWEIS (Phase 13.12): Der zugehörige CTA ist in der UI vorerst deaktiviert,
 * weil Journal-Einträge noch nicht pro Zyklus abgegrenzt sind (F-CYCLE). Diese
 * Action bleibt als Export erhalten und wird mit der sauberen Zyklus-Logik in
 * einer eigenen Session reaktiviert.
 */
export async function startNewCycleAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein." };
  }

  // Get current highest cycle_number
  const { data: latestProgress } = await supabase
    .from("user_recipe_progress")
    .select("cycle_number")
    .eq("user_id", user.id)
    .eq("recipe_slug", "values")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const newCycleNumber = (latestProgress?.cycle_number ?? 0) + 1;

  // Create new progress row for the new cycle
  const { error: insertError } = await supabase
    .from("user_recipe_progress")
    .insert({
      user_id: user.id,
      recipe_slug: "values",
      current_step: 2,
      status: "in_progress",
      started_at: new Date().toISOString(),
      cycle_number: newCycleNumber,
    });

  if (insertError) {
    return { error: dbError(insertError, "values") };
  }

  redirect("/me/values/journey/journal");
}