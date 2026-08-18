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
import type { DailyValueContent, ValueEvalContent } from "@/lib/types/db-json";
import { serverTodayKey } from "@/lib/server/timezone";
import { TEXT_MAX_LONG, tooLong } from "@/lib/utils/form-validation";
import type { Tables } from "@/lib/supabase/database.types";
import {
  patchJournalContent,
  readJournalContent,
} from "@/lib/utils/journal-content";
import { recipeSlugFor } from "@/lib/utils/journal-recipe-slug";
import { type SavedEntryId, savedEntryId } from "@/lib/recipes/saved-entry";
import {
  evaluationPhase,
  hypothesisIsLocked,
  HYPOTHESIS_LOCKED,
  type CycleStand,
  type EvaluationPhase,
} from "@/lib/recipes/values/evaluation-phase";
import type { JourneyStand } from "@/lib/recipes/values/journey-steps";
import {
  readValueSelection,
  type ValueSelectionProblem,
} from "@/lib/recipes/values/value-selection";

/**
 * Woran ein Durchlauf hängt: jüngster Fortschritt, jüngste Hypothesen-Version.
 *
 * Gelesen von Schritt 1 (Sperre) und der Auswertung (Bühne). Was daraus folgt,
 * entscheidet `cycleIsComplete` — hier steht nur, was dafür gelesen wird.
 */
async function readCycleStand({
  supabase,
  user,
}: ActionContext): Promise<CycleStand> {
  const [{ data: progress }, { data: hypothesisRow }] = await Promise.all([
    supabase
      .from("user_recipe_progress")
      .select("status, cycle_number")
      .eq("user_id", user.id)
      .eq("recipe_slug", "values")
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("values_hypothesis")
      .select("version")
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    status: progress?.status ?? null,
    hypothesisVersion: hypothesisRow?.version ?? 1,
    cycleNumber: progress?.cycle_number ?? 1,
  };
}

/** Die Nummer des laufenden Durchlaufs — der Filterwert jedes Werte-Reads. */
async function readCycleNumber(ctx: ActionContext): Promise<number> {
  const { data } = await ctx.supabase
    .from("user_recipe_progress")
    .select("cycle_number")
    .eq("user_id", ctx.user.id)
    .eq("recipe_slug", "values")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.cycle_number ?? 1;
}

/**
 * Save the values hypothesis (Step 1 of Recipe #1).
 * - Upserts into values_hypothesis (version 1)
 * - Advances user_recipe_progress to step 2
 *
 * **Nur im laufenden Durchlauf.** Ist der Durchlauf abgeschlossen, weist die
 * Action ab, statt zu schreiben: sie trifft immer `version = 1`, während der
 * Kompass ab der Anpassung aus einer höheren Version gelesen wird — ein
 * Schreibvorgang landete also in einer Zeile, die niemand mehr anzeigt (KAN-19).
 * Das Formular sperrt schon vorher; diese Prüfung ist das serverseitige
 * Gegenstück für einen veralteten Client.
 *
 * Die Nutzlast ist „ist gespeichert": die Form läuft über `useActionState` und
 * zeigt danach einen Completion-Screen. Deren Anfangszustand ist `ok(false)` —
 * `error === null` allein hieße dort schon „geschafft", bevor überhaupt
 * abgeschickt wurde.
 */
export async function saveHypothesisAction(
  _prevState: ActionResult<boolean>,
  formData: FormData,
): Promise<ActionResult<boolean>> {
  return withUser(async (ctx) => {
    const { supabase, user } = ctx;

    if (hypothesisIsLocked(await readCycleStand(ctx))) {
      return failed(HYPOTHESIS_LOCKED);
    }

    // Schritt 1 prüft nur die Anzahl: Duplikate verhindert hier allein die
    // Auswahl im Client (hypothesis-form.tsx). Schritt 3 prüft strenger —
    // die Asymmetrie steht als Parameter da, sie ist keine Nachlässigkeit.
    const selection = readValueSelection(formData.get("values"), {
      requireDistinct: false,
    });
    if (selection.problem !== null) {
      const message: Record<ValueSelectionProblem, string> = {
        missing: "Keine Werte ausgewählt.",
        malformed: "Ungültiges Format der ausgewählten Werte.",
        count: "Bitte genau 5 Werte auswählen.",
      };
      return failed(message[selection.problem]);
    }
    const values = selection.values;

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
        return dbFailed(updateError, "values");
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
        return dbFailed(insertError, "values");
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
        return dbFailed(updateError, "values");
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
        return dbFailed(insertError, "values");
      }
    }

    // Kein Redirect mehr — die Form zeigt nach Erfolg einen Completion-Screen
    // (grüner Haken + Werte-Liste) und verlinkt von dort auf die Journey-Übersicht.
    return ok(true);
  });
}

/** Was Schritt 1 beim Öffnen vorfindet. */
export type HypothesisStand = {
  /** Der aktuelle Kompass, oder `null`, wenn noch keiner gewählt wurde. */
  values: string[] | null;
  /**
   * Nur noch anzeigen, nicht mehr ändern. Schritt 1 ist einmalig — ein neuer
   * Durchlauf beginnt über `startNewCycleAction` beim Journal, nicht hier.
   */
  locked: boolean;
};

/**
 * Fetch the user's previously selected values (Step 1), if any.
 * Used to pre-fill the hypothesis form when revisiting the step.
 *
 * Liefert zusätzlich den Sperr-Zustand, damit die Seite nach einem
 * abgeschlossenen Durchlauf keinen Speichern-Weg mehr anbietet, der ins Leere
 * schreiben würde (KAN-19).
 */
export async function getHypothesisData(): Promise<HypothesisStand> {
  const result = await withUser(async (ctx) => {
    const { supabase, user } = ctx;

    const [{ data: hypothesisRow }, stand] = await Promise.all([
      supabase
        .from("values_hypothesis")
        .select("values")
        .eq("user_id", user.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      readCycleStand(ctx),
    ]);

    return ok({
      values: (hypothesisRow?.values as string[]) ?? null,
      locked: hypothesisIsLocked(stand),
    });
  });

  // Nicht angemeldet oder DB-Fehler: leer und offen — dieselbe Vorsicht wie
  // bisher, die Action prüft die Sperre ohnehin noch einmal selbst.
  return result.error === null ? result.data : { values: null, locked: false };
}

// ─── Journey-Übersicht ───────────────────────────────────────────────

/**
 * Was die Sternenkarte der Werte-Reise braucht — **gefiltert auf den laufenden
 * Durchlauf**.
 *
 * Die Übersicht las das früher selbst und dabei ungefiltert: sie zählte alle
 * `daily_value`-Einträge und meldete im zweiten Durchlauf die sieben Tage des
 * ersten als erledigt, während Journal und Auswertung daneben schon
 * zyklus-scharf lasen (KAN-21). Deshalb steht der Read jetzt hier bei den
 * anderen — und die Regel darüber in `journey-steps.ts`.
 */
export async function getJourneyStand(): Promise<JourneyStand> {
  const result = await withUser<JourneyStand>(async ({ supabase, user }) => {
    // Der Fortschritt zuerst und allein: an seiner `cycle_number` hängt der
    // Filter des Eintrags-Reads darunter.
    const { data: progress } = await supabase
      .from("user_recipe_progress")
      .select("status, cycle_number")
      .eq("user_id", user.id)
      .eq("recipe_slug", "values")
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const cycleNumber = progress?.cycle_number ?? 1;

    const [{ data: hypothesisRow }, { data: dailyEntries }, today] =
      await Promise.all([
        supabase
          .from("values_hypothesis")
          .select("version")
          .eq("user_id", user.id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("journal_entries")
          .select("entry_date")
          .eq("user_id", user.id)
          .eq("recipe_slug", recipeSlugFor("daily_value"))
          .eq("template_type", "daily_value")
          .eq("cycle_number", cycleNumber),
        serverTodayKey(),
      ]);

    return ok({
      status: progress?.status ?? null,
      cycleNumber,
      hypothesisVersion: hypothesisRow?.version ?? 1,
      hasHypothesisRow: hypothesisRow !== null,
      // `entry_date` ist nullable. Ein Eintrag ohne Datum ist kein
      // Reflexionstag — er fällt raus, statt per Cast als einer zu gelten.
      entryDates: (dailyEntries ?? [])
        .map((e) => e.entry_date)
        .filter((d): d is string => d !== null),
      today,
    });
  });

  if (result.error === null) return result.data;

  // Nicht angemeldet oder DB-Fehler: eine leere Karte. Kein Stern leuchtet,
  // nichts wird fälschlich als erledigt gemeldet.
  return {
    status: null,
    cycleNumber: 1,
    hypothesisVersion: 1,
    hasHypothesisRow: false,
    entryDates: [],
    today: await serverTodayKey(),
  };
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
 *
 * Bewusst **kein** `ActionResult`: der Aufrufer ist eine Server-Komponente, die
 * die Seite direkt aus diesen Daten rendert. Echte Lesefehler werfen weiterhin
 * (Segment-Error-Boundary) — abgelaufene Sitzung fällt auf den Leerzustand
 * zurück, denselben, den ein User ohne Einträge sieht.
 */
export async function getJournalData(
  preloaded?: JournalDataPreload,
): Promise<JournalPageData> {
  const result = await withUser<JournalPageData>(async (ctx) => {
    const { supabase, user } = ctx;

    // Nur die Einträge des laufenden Durchlaufs: ohne diesen Filter fand ein
    // zweiter Durchlauf die sieben Tage des ersten vor und stand sofort auf
    // 7/7 (KAN-20).
    const cycleNumber = await readCycleNumber(ctx);

    // Journal-Einträge werden immer frisch gelesen.
    const entriesQuery = supabase
      .from("journal_entries")
      .select(JOURNAL_ENTRY_SELECT)
      .eq("user_id", user.id)
      .eq("recipe_slug", recipeSlugFor("daily_value"))
      .eq("template_type", "daily_value")
      .eq("cycle_number", cycleNumber)
      .order("entry_date", { ascending: true });

    // Schnellpfad: progress + hypothesis vom Aufrufer übernommen → nur entries.
    if (preloaded) {
      const { data: entries, error: entriesError } = await entriesQuery;
      if (entriesError) {
        throw new Error(
          `getJournalData: read failed (${entriesError.code ?? "unknown"})`,
        );
      }
      return ok({
        hypothesis: preloaded.hypothesisValues,
        entries: toJournalEntries(entries),
        startedAt: preloaded.progress?.started_at ?? null,
        currentStep: preloaded.progress?.current_step ?? 1,
      });
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
      throw new Error(
        `getJournalData: read failed (${readError.code ?? "unknown"})`,
      );
    }

    return ok({
      hypothesis: (hypothesisRow?.values as string[]) ?? null,
      entries: toJournalEntries(entries),
      startedAt: progress?.started_at ?? null,
      currentStep: progress?.current_step ?? 1,
    });
  });

  return result.error === null
    ? result.data
    : { hypothesis: null, entries: [], startedAt: null, currentStep: 1 };
}

/**
 * Save (create or update) a daily journal entry for Recipe #1.
 * - Upserts into journal_entries by (user_id, entry_date, template_type)
 * - After saving, if 7+ entries exist, advances user_recipe_progress to step 3
 */
export async function saveJournalEntryAction(
  formData: FormData,
): Promise<ActionResult> {
  return withUser(async (ctx) => {
    const { supabase, user } = ctx;
    const cycleNumber = await readCycleNumber(ctx);

    // entry_date serverseitig in der User-Zeitzone bestimmen (nicht dem Client
    // vertrauen) — damit Schreiben und Gating dieselbe Tagesgrenze nutzen.
    const entryDate = await serverTodayKey();
    const happenings = formData.get("happenings");

    if (!happenings || typeof happenings !== "string") {
      return failed("Bitte beschreib, was heute passiert ist.");
    }
    const lengthError = tooLong(happenings, TEXT_MAX_LONG);
    if (lengthError) {
      return failed(lengthError);
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
        .eq("recipe_slug", recipeSlugFor("daily_value"))
        .eq("template_type", "daily_value")
        .maybeSingle();

      if (!target) {
        return failed("Der Eintrag konnte nicht gefunden werden.");
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
        return dbFailed(updateError, "values");
      }

      revalidatePath("/me/values/journey/journal");
      return ok();
    }

    // Check if an entry already exists for this date
    const { data: existingEntry } = await supabase
      .from("journal_entries")
      .select("id, content")
      .eq("user_id", user.id)
      .eq("entry_date", entryDate)
      .eq("template_type", "daily_value")
      .eq("cycle_number", cycleNumber)
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
        return dbFailed(updateError, "values");
      }
    } else {
      // Insert new entry — frischer Eintrag hat nichts zu bewahren.
      const { error: insertError } = await supabase
        .from("journal_entries")
        .insert({
          user_id: user.id,
          recipe_slug: recipeSlugFor("daily_value"),
          template_type: "daily_value",
          entry_date: entryDate,
          cycle_number: cycleNumber,
          content: { happenings },
        });

      if (insertError) {
        return dbFailed(insertError, "values");
      }
    }

    // After save, count entries — if 7+, advance to step 3
    const { count } = await supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("recipe_slug", recipeSlugFor("daily_value"))
      .eq("template_type", "daily_value")
      .eq("cycle_number", cycleNumber);

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
          return dbFailed(advanceError, "values");
        }
      }
    }

    revalidatePath("/me/values/journey/journal");
    return ok();
  });
}

// ─── Evaluation (Step 3) ───────────────────────────────────────────

export type ValueEvalEntry = {
  /**
   * Der Beleg des Eintrags. Serverseitig gelesen, also genauso gültig wie der
   * aus einer Speicher-Action — der Wiederbesuch braucht ihn, um die
   * KI-Auswertung noch einmal anstoßen zu können (s. lib/recipes/saved-entry.ts).
   */
  id: SavedEntryId;
  content: ValueEvalContent;
  aiInsights: string | null;
} | null;

export type EvaluationPageData = {
  hypothesis: string[];
  entries: JournalEntry[];
  valueEvalEntry: ValueEvalEntry;
  progress: {
    id: string;
    cycleNumber: number | null;
    startedAt: string | null;
    status: string | null;
  } | null;
  phase: EvaluationPhase;
};

/**
 * Fetch all data needed for the evaluation page (Step 3 of Recipe #1).
 *
 * Die Bühne rechnet `evaluationPhase` aus (lib/recipes/values/evaluation-phase.ts);
 * hier steht nur, was dafür gelesen wird. Der Zugang zur Auswertung hängt am
 * Journal-Schritt, der „Zur Auswertung“ ab 7 Einträgen freischaltet — diese
 * Funktion leitet nirgendwohin um.
 */
export async function getEvaluationData(): Promise<EvaluationPageData> {
  const result = await withUser<EvaluationPageData>(
    async ({ supabase, user }) => {
      // Der Fortschritt zuerst und allein: an seiner `cycle_number` hängen die
      // Filter der drei folgenden Reads. Vor KAN-20 liefen alle vier parallel,
      // weil keiner den Durchlauf kannte — und genau das war der Defekt.
      const { data: progress } = await supabase
        .from("user_recipe_progress")
        .select("id, cycle_number, started_at, status")
        .eq("user_id", user.id)
        .eq("recipe_slug", "values")
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      const cycleNumber = progress?.cycle_number ?? 1;

      // Die drei übrigen Reads parallel statt seriell.
      // Hinweis zu den Einträgen: die letzten 7 nach created_at zu zählen hält dies
      // konsistent mit dem Journal-Schritt (der "Zur Auswertung" ab 7 Einträgen
      // freischaltet) und mit der journal-analysis-Route — statt nach
      // entry_date >= started_at zu filtern (was das Test-Backdating in
      // journal-form.tsx bricht).
      const [{ data: hypothesisRow }, { data: entries }, { data: evalRow }] =
        await Promise.all([
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
            .eq("recipe_slug", recipeSlugFor("daily_value"))
            .eq("template_type", "daily_value")
            .eq("cycle_number", cycleNumber)
            .order("created_at", { ascending: false })
            .limit(7),
          // Eine `value_eval`-Zeile JE DURCHLAUF. Ohne den Filter fand der
          // zweite Durchlauf die Reflexion des ersten — und hätte sie beim
          // Speichern überschrieben (KAN-20).
          supabase
            .from("journal_entries")
            .select("id, template_type, content, ai_insights")
            .eq("user_id", user.id)
            .eq("recipe_slug", recipeSlugFor("value_eval"))
            .eq("template_type", "value_eval")
            .eq("cycle_number", cycleNumber)
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
            id: savedEntryId(evalRow.id),
            content:
              evalContent?.template === "value_eval"
                ? evalContent.content
                : { positive_reflection: "", negative_reflection: "" },
            aiInsights: evalRow.ai_insights ?? null,
          }
        : null;

      const phase = evaluationPhase({
        status: progress?.status ?? null,
        hypothesisVersion,
        cycleNumber,
        hasEvalEntry: valueEvalEntry !== null,
      });

      return ok({
        hypothesis,
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
      });
    },
  );

  // Abgelaufene Sitzung fällt auf den Leerzustand zurück — dieselbe Ansicht,
  // die ein User ohne Auswertung sieht.
  return result.error === null
    ? result.data
    : {
        hypothesis: [],
        entries: [],
        valueEvalEntry: null,
        progress: null,
        phase: "reflection",
      };
}

/**
 * Save the evaluation reflection (Phase 1 of Step 3).
 * Upserts a journal_entries row with template_type='value_eval'.
 *
 * Die Nutzlast ist der Beleg der Zeile — und trägt damit beides: die Bühne der
 * Auswertung wird daraus ABGELEITET (s. evaluation-form.tsx, `data !== null`
 * unterscheidet den Anfangszustand `ok(null)` von einem erfolgreichen Lauf),
 * und /api/journal-analysis bekommt genau darüber seinen Eintrag. Vorher war
 * die Nutzlast ein nacktes `true`, und die Auswertungs-Route musste die Zeile
 * selbst suchen — fand sie keine, schrieb sie ihr Ergebnis still nirgendwohin.
 */
export async function saveEvalReflectionAction(
  _prevState: ActionResult<SavedEntryId | null>,
  formData: FormData,
): Promise<ActionResult<SavedEntryId | null>> {
  return withUser(async (ctx) => {
    const { supabase, user } = ctx;
    const cycleNumber = await readCycleNumber(ctx);
    // Beide Felder sind FREIWILLIG (Bühne A sagt das auch so). Die Zeile wird
    // trotzdem angelegt: sie trägt die Phase der Auswertung UND ist der
    // Speicherort für das KI-Ergebnis.
    const positiveRaw = formData.get("positive_reflection");
    const negativeRaw = formData.get("negative_reflection");
    const positiveReflection =
      typeof positiveRaw === "string" ? positiveRaw : "";
    const negativeReflection =
      typeof negativeRaw === "string" ? negativeRaw : "";

    const lengthError =
      tooLong(positiveReflection, TEXT_MAX_LONG) ??
      tooLong(negativeReflection, TEXT_MAX_LONG);
    if (lengthError) {
      return failed(lengthError);
    }

    // Check if value_eval entry already exists
    const { data: existing } = await supabase
      .from("journal_entries")
      .select("id, content")
      .eq("user_id", user.id)
      .eq("recipe_slug", recipeSlugFor("value_eval"))
      .eq("template_type", "value_eval")
      .eq("cycle_number", cycleNumber)
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
        return dbFailed(updateError, "values");
      }

      return ok(savedEntryId(existing.id));
    }

    const { data: inserted, error: insertError } = await supabase
      .from("journal_entries")
      .insert({
        user_id: user.id,
        recipe_slug: recipeSlugFor("value_eval"),
        template_type: "value_eval",
        cycle_number: cycleNumber,
        content: {
          positive_reflection: positiveReflection,
          negative_reflection: negativeReflection,
        },
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return dbFailed(insertError, "values");
    }

    return ok(savedEntryId(inserted.id));
  });
}

/**
 * Save adjusted values (Phase 2 of Step 3).
 * - Creates a NEW values_hypothesis row with version+1 (preserving history)
 * - Marks user_recipe_progress as completed
 *
 * Die Nutzlast ist „ist gespeichert" — dieselbe Begründung wie bei
 * saveEvalReflectionAction: die Feier-Bühne hängt genau daran.
 */
export async function saveAdjustedHypothesisAction(
  _prevState: ActionResult<boolean>,
  formData: FormData,
): Promise<ActionResult<boolean>> {
  return withUser(async (ctx) => {
    const { supabase, user } = ctx;
    // Anders als Schritt 1 traut diese Action dem Client ausdrücklich nicht:
    // die Tausch-Kette in Bühne B (Wert raus, ein anderer rein für ihn, der
    // erste per „Rückgängig“ zurück) kann clientseitig ein Duplikat erzeugen,
    // das die Anzahl-Prüfung allein nicht fängt.
    const selection = readValueSelection(formData.get("values"), {
      requireDistinct: true,
    });
    if (selection.problem !== null) {
      const message: Record<ValueSelectionProblem, string> = {
        missing: "Keine Werte angegeben.",
        malformed: "Ungültiges Format der Werte.",
        count: "Bitte genau 5 unterschiedliche Werte auswählen.",
      };
      return failed(message[selection.problem]);
    }
    const values = selection.values;

    // Serverseitig abgeleitet statt aus dem Formular gelesen: die neue Fassung
    // ist immer die nächste nach der jüngsten. Ein Client-Wert könnte auf eine
    // bestehende Version zeigen und die Historie überschreiben — und weil
    // `version` seit KAN-20 die Durchlauf-Nummer trägt, ist eine falsche
    // Version zugleich ein falscher Durchlauf.
    const { hypothesisVersion } = await readCycleStand(ctx);
    const newVersion = hypothesisVersion + 1;

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
      return dbFailed(insertError, "values");
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
        return dbFailed(updateError, "values");
      }
    }

    revalidatePath("/me/values/journey/evaluation");
    return ok(true);
  });
}

/**
 * Start a new 7-day journal cycle (Phase 3 CTA).
 * Creates a new user_recipe_progress row with cycle_number+1,
 * current_step=2 (skip hypothesis), then redirects to the journal.
 *
 * Der CTA dazu sitzt auf der Rückkehr-Bühne der Auswertung — bewusst nicht im
 * Feier-Moment. Seit KAN-20 sind Journal-Einträge über `cycle_number` pro
 * Durchlauf abgegrenzt; vorher wäre der neue Durchlauf sofort auf 7/7 gestanden.
 */
export async function startNewCycleAction(): Promise<ActionResult> {
  return withUser(async ({ supabase, user }) => {
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
      return dbFailed(insertError, "values");
    }

    // Wirft einen Kontroll-Fehler statt zurückzukehren — withUser fängt
    // bewusst nichts, damit genau das durchkommt.
    redirect("/me/values/journey/journal");
  });
}
