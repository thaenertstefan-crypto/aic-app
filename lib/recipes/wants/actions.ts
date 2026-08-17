"use server";

import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser, type ActionContext } from "@/lib/actions/with-user";
import type {
  Json,
  TablesInsert,
  TablesUpdate,
} from "@/lib/supabase/database.types";
import type { BetItem, WantItem, YinYangContent } from "@/lib/types/db-json";
import { serverTodayKey } from "@/lib/server/timezone";
import { TEXT_MAX_LONG, tooLong } from "@/lib/utils/form-validation";
import { recipeSlugFor } from "@/lib/utils/journal-recipe-slug";
import { type SavedEntryId, savedEntryId } from "@/lib/recipes/saved-entry";
import {
  MAX_BETS,
  MAX_WANTS,
  isBetItem,
  isWantItem,
  mergeItems,
  parseItems,
  parsePreviousIds,
} from "@/lib/recipes/wants/items";

// ─── Wants-Rezept: kanonische Actions ───────────────────────────────────
// Alle Schreibzugriffe auf die wants-Tabelle (eine Zeile pro User, zwei
// JSONB-Arrays: wants + bets) laufen hier durch — Muster bill-of-rights.
// Das Yin-&-Yang-Audit landet als journal_entries-Zeile (template_type
// "yin_yang"); die KI-Hypothesen trägt /api/wants-distiller dort nach.

/**
 * Lesen, mergen, schreiben — die eine Spalte auf einmal.
 *
 * Die Regel selbst steht in `mergeItems` (lib/recipes/wants/items.ts) und ist
 * dort getestet; hier bleibt nur der Datenzugriff drumherum.
 *
 * Die Nutzlast ist das gemergte Array — genau das, was beide Aufrufer
 * anschließend an den Client zurückgeben.
 */
// Die zweite Hälfte der Schranke ist der Grund, warum kein Cast mehr nötig
// ist: sie sagt aus, was die JSONB-Spalte ohnehin verlangt — die Elemente
// müssen JSON sein. Vorher stand dafür ein `as unknown as Json`, das die Frage
// nur überging.
async function mergeIntoColumn<
  T extends { id: string } & { [key: string]: Json | undefined },
>(
  { supabase, user }: ActionContext,
  column: "wants" | "bets",
  incoming: T[],
  previousIds: string[],
): Promise<ActionResult<T[]>> {
  const { data: existing } = await supabase
    .from("wants")
    .select(`id, ${column}`)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string } & Record<"wants" | "bets", unknown>>();

  const dbItems = ((existing?.[column] as T[] | null) ?? []) as T[];
  const merged = mergeItems(dbItems, incoming, previousIds);
  const jsonMerged: Json = merged;

  if (existing) {
    const updatePayload: TablesUpdate<"wants"> =
      column === "wants"
        ? { wants: jsonMerged, updated_at: new Date().toISOString() }
        : { bets: jsonMerged, updated_at: new Date().toISOString() };
    const { error: updateError } = await supabase
      .from("wants")
      .update(updatePayload)
      .eq("id", existing.id);
    if (updateError) return dbFailed(updateError, "wants");
  } else {
    const insertPayload: TablesInsert<"wants"> =
      column === "wants"
        ? { user_id: user.id, wants: jsonMerged }
        : { user_id: user.id, bets: jsonMerged };
    const { error: insertError } = await supabase
      .from("wants")
      .insert(insertPayload);
    if (insertError) return dbFailed(insertError, "wants");
  }

  return ok(merged);
}

// ─── Get all data for the page ─────────────────────────────────────────

export type WantsData = {
  wants: WantItem[] | null;
  bets: BetItem[] | null;
  introSeen: boolean;
};

export async function getWantsData(): Promise<ActionResult<WantsData>> {
  return withUser(async ({ supabase, user }) => {
    const { data: row } = await supabase
      .from("wants")
      .select("wants, bets")
      .eq("user_id", user.id)
      .maybeSingle();

    // Intro "schon gesehen?" — gilt pro Slug, sobald irgendeine Zeile intro_seen=true hat.
    const { data: introRow } = await supabase
      .from("user_recipe_progress")
      .select("intro_seen")
      .eq("user_id", user.id)
      .eq("recipe_slug", "wants")
      .eq("intro_seen", true)
      .limit(1)
      .maybeSingle();

    return ok({
      wants: (row?.wants as WantItem[] | null) ?? null,
      bets: (row?.bets as BetItem[] | null) ?? null,
      introSeen: Boolean(introRow),
    });
  });
}

/**
 * True, sobald der User irgendeine Werte-Hypothese hat (bestätigt ODER nicht) —
 * Basis für den weichen Nudge vor dem Wants-Audit.
 *
 * Bewusst **kein** `ActionResult`: der Aufrufer reicht den Boolean direkt als
 * Prop weiter. „Noch keine Hypothese" ist die richtige Antwort auf jeden
 * Fehlerfall — der Nudge zu viel ist harmlos, ein Ergebnis zum Auspacken
 * zwänge dem Aufrufer einen Zweig auf, in dem er dasselbe täte.
 */
export async function hasValuesHypothesis(): Promise<boolean> {
  const result = await withUser(async ({ supabase, user }) => {
    const { data } = await supabase
      .from("values_hypothesis")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    return ok(Boolean(data));
  });

  return result.error === null ? result.data : false;
}

// ─── Save Wants ─────────────────────────────────────────────────────────

/** Die Nutzlast ist das gemergte Array — der Client synchronisiert seinen
 *  State damit auf den Server-Stand. */
export async function saveWantsAction(
  formData: FormData,
): Promise<ActionResult<WantItem[]>> {
  return withUser(async (ctx) => {
    const incomingRaw = parseItems(
      formData.get("wants"),
      MAX_WANTS,
      isWantItem,
    );
    if (!incomingRaw) {
      return failed("Ungültiges Format.");
    }

    // Auf die bekannte Shape normalisieren — keine Fremd-Properties ins JSONB.
    const incoming: WantItem[] = incomingRaw.map((w) => ({
      id: w.id,
      text: w.text,
      active: w.active,
      title: w.title?.trim() ? w.title.trim() : null,
      distance: w.distance ?? "nah",
      valueId: w.valueId ?? null,
      source: w.source ?? "own",
    }));

    const previousIds = parsePreviousIds(formData.get("previousIds"));

    const mergeResult = await mergeIntoColumn(
      ctx,
      "wants",
      incoming,
      previousIds,
    );
    if (mergeResult.error !== null) return mergeResult;
    const merged = mergeResult.data;

    const { supabase, user } = ctx;

    // Fortschritt: abgeschlossen, sobald mindestens ein Want existiert. Seit dem
    // Wegfall von „loslassen" kann kein Want mehr erlöschen (active bleibt immer
    // true), darum ist das Gate schlicht „gibt es Sterne". Little Bets gaten nicht.
    const completed = merged.length > 0;

    const { data: progress } = await supabase
      .from("user_recipe_progress")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("recipe_slug", "wants")
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (progress) {
      const update: TablesUpdate<"user_recipe_progress"> = { current_step: 2 };
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
        return dbFailed(progressError, "wants");
      }
    } else {
      const insert: TablesInsert<"user_recipe_progress"> = {
        user_id: user.id,
        recipe_slug: "wants",
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
        return dbFailed(progressError, "wants");
      }
    }

    return ok(merged);
  });
}

// ─── Save Bets ──────────────────────────────────────────────────────────

export async function saveBetsAction(
  formData: FormData,
): Promise<ActionResult<BetItem[]>> {
  return withUser(async (ctx) => {
    const incomingRaw = parseItems(formData.get("bets"), MAX_BETS, isBetItem);
    if (!incomingRaw) {
      return failed("Ungültiges Format.");
    }

    const incoming: BetItem[] = incomingRaw.map((b) => ({
      id: b.id,
      text: b.text,
      wantId: b.wantId ?? null,
      status: b.status,
      journalEntryId: b.journalEntryId ?? null,
      source: b.source ?? "own",
    }));

    const previousIds = parsePreviousIds(formData.get("previousIds"));

    return mergeIntoColumn(ctx, "bets", incoming, previousIds);
  });
}

// ─── Yin-&-Yang-Audit speichern ─────────────────────────────────────────

/**
 * Speichert das Audit als neuen Journal-Eintrag (jeder Durchlauf ein eigener
 * Eintrag — auch beim Re-Run) und setzt den Fortschritt auf in_progress,
 * ohne einen bereits abgeschlossenen Durchlauf zurückzustufen.
 *
 * Die Nutzlast ist der Beleg des frisch angelegten Eintrags — der einzige Weg
 * zu /api/wants-distiller und /api/wants-refiner, und damit die geschriebene
 * Fassung von „erst speichern, dann auswerten" (s. lib/recipes/saved-entry.ts).
 */
export async function saveYinYangEntryAction(
  formData: FormData,
): Promise<ActionResult<SavedEntryId>> {
  return withUser(async ({ supabase, user }) => {
    const yin = (formData.get("yin") as string | null)?.trim() ?? "";
    const yang = (formData.get("yang") as string | null)?.trim() ?? "";
    const principles =
      (formData.get("principles") as string | null)?.trim() ?? "";
    const tagtraum = (formData.get("tagtraum") as string | null)?.trim() ?? "";

    if (!yin || !yang) {
      return failed(
        "Beide Seiten gehören zum Audit — füll bitte Yin und Yang aus.",
      );
    }

    const lengthError =
      tooLong(yin, TEXT_MAX_LONG) ??
      tooLong(yang, TEXT_MAX_LONG) ??
      (principles ? tooLong(principles, TEXT_MAX_LONG) : null) ??
      (tagtraum ? tooLong(tagtraum, TEXT_MAX_LONG) : null);
    if (lengthError) {
      return failed(lengthError);
    }

    const content: YinYangContent = { yin, yang };
    if (principles) {
      content.principles = principles;
    }
    if (tagtraum) {
      content.tagtraum = tagtraum;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("journal_entries")
      .insert({
        user_id: user.id,
        recipe_slug: recipeSlugFor("yin_yang"),
        template_type: "yin_yang",
        content,
        entry_date: await serverTodayKey(),
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return dbFailed(insertError, "wants");
    }

    const { data: progress } = await supabase
      .from("user_recipe_progress")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("recipe_slug", "wants")
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (progress) {
      if (progress.status !== "completed") {
        const { error: updateError } = await supabase
          .from("user_recipe_progress")
          .update({ current_step: 1, status: "in_progress" })
          .eq("id", progress.id);
        if (updateError) {
          return dbFailed(updateError, "wants");
        }
      }
    } else {
      const { error: progressError } = await supabase
        .from("user_recipe_progress")
        .insert({
          user_id: user.id,
          recipe_slug: "wants",
          current_step: 1,
          status: "in_progress",
          started_at: new Date().toISOString(),
          cycle_number: 1,
        });
      if (progressError) {
        return dbFailed(progressError, "wants");
      }
    }

    return ok(savedEntryId(inserted.id));
  });
}
