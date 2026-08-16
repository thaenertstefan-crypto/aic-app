"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Json,
  TablesInsert,
  TablesUpdate,
} from "@/lib/supabase/database.types";
import type { ActionState } from "@/lib/types/action-state";
import type { BetItem, WantItem, YinYangContent } from "@/lib/types/db-json";
import { dbError } from "@/lib/utils/db-error";
import { serverTodayKey } from "@/lib/server/timezone";
import {
  TEXT_MAX_LONG,
  TEXT_MAX_SHORT,
  tooLong,
} from "@/lib/utils/form-validation";

// ─── Wants-Rezept: kanonische Actions ───────────────────────────────────
// Alle Schreibzugriffe auf die wants-Tabelle (eine Zeile pro User, zwei
// JSONB-Arrays: wants + bets) laufen hier durch — Muster bill-of-rights.
// Das Yin-&-Yang-Audit landet als journal_entries-Zeile (template_type
// "yin_yang"); die KI-Hypothesen trägt /api/wants-distiller dort nach.

// Obergrenzen für die JSONB-Arrays: schützt vor manipulierten
// FormData-Payloads (beliebige Objekte / Riesen-Texte).
const MAX_WANTS = 100;
const MAX_BETS = 100;

/** Prüft ein einzelnes Element auf die WantItem-Shape (inkl. Text-Cap). */
function isWantItem(value: unknown): value is WantItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.text === "string" &&
    tooLong(v.text, TEXT_MAX_SHORT) === null &&
    typeof v.active === "boolean" &&
    (v.title === undefined ||
      v.title === null ||
      (typeof v.title === "string" && tooLong(v.title, TEXT_MAX_SHORT) === null)) &&
    (v.distance === undefined || v.distance === "nah" || v.distance === "fern") &&
    (v.valueId === undefined || v.valueId === null || typeof v.valueId === "string") &&
    (v.source === undefined || v.source === "ai" || v.source === "own")
  );
}

/** Prüft ein einzelnes Element auf die BetItem-Shape (inkl. Text-Cap). */
function isBetItem(value: unknown): value is BetItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.text === "string" &&
    tooLong(v.text, TEXT_MAX_SHORT) === null &&
    (v.status === "open" || v.status === "tried") &&
    (v.wantId === undefined || v.wantId === null || typeof v.wantId === "string") &&
    (v.journalEntryId === undefined ||
      v.journalEntryId === null ||
      typeof v.journalEntryId === "string") &&
    (v.source === undefined || v.source === "ai" || v.source === "own")
  );
}

/** FormData-Feld als JSON-Array parsen und elementweise validieren. */
function parseItems<T>(
  raw: FormDataEntryValue | null,
  max: number,
  guard: (value: unknown) => value is T,
): T[] | null {
  if (typeof raw !== "string" || !raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length > max || !parsed.every(guard)) {
    return null;
  }
  return parsed;
}

/** Optionale Baseline-IDs (Löschungen vs. parallele Adds — s. mergeIntoColumn). */
function parsePreviousIds(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

type WantsRowClient = SupabaseClient<Database>;

/**
 * Reload-vor-Write-Merge auf eine der beiden JSONB-Spalten: DB-Elemente, die
 * der Client weder kannte (previousIds) noch mitschickt, wurden parallel
 * angelegt und bleiben erhalten; Elemente aus previousIds, die jetzt fehlen,
 * sind echte Löschungen.
 */
async function mergeIntoColumn<T extends { id: string }>(
  supabase: WantsRowClient,
  userId: string,
  column: "wants" | "bets",
  incoming: T[],
  previousIds: string[],
): Promise<{ error: string | null; merged: T[] }> {
  const { data: existing } = await supabase
    .from("wants")
    .select(`id, ${column}`)
    .eq("user_id", userId)
    .maybeSingle<{ id: string } & Record<"wants" | "bets", unknown>>();

  const dbItems = ((existing?.[column] as T[] | null) ?? []) as T[];
  const incomingIds = new Set(incoming.map((item) => item.id));
  const previousIdSet = new Set(previousIds);
  const concurrentAdds = dbItems.filter(
    (item) => !incomingIds.has(item.id) && !previousIdSet.has(item.id),
  );
  const merged: T[] = [...incoming, ...concurrentAdds];
  // JSONB-Spalten sind in den generierten Typen `Json`; der Cast bleibt bewusst.
  const jsonMerged = merged as unknown as Json;

  if (existing) {
    const updatePayload: TablesUpdate<"wants"> =
      column === "wants"
        ? { wants: jsonMerged, updated_at: new Date().toISOString() }
        : { bets: jsonMerged, updated_at: new Date().toISOString() };
    const { error: updateError } = await supabase
      .from("wants")
      .update(updatePayload)
      .eq("id", existing.id);
    if (updateError) return { error: dbError(updateError, "wants"), merged };
  } else {
    const insertPayload: TablesInsert<"wants"> =
      column === "wants"
        ? { user_id: userId, wants: jsonMerged }
        : { user_id: userId, bets: jsonMerged };
    const { error: insertError } = await supabase
      .from("wants")
      .insert(insertPayload);
    if (insertError) return { error: dbError(insertError, "wants"), merged };
  }

  return { error: null, merged };
}

// ─── Get all data for the page ─────────────────────────────────────────

export type WantsData = {
  wants: WantItem[] | null;
  bets: BetItem[] | null;
  introSeen: boolean;
};

export async function getWantsData(): Promise<{
  error: string | null;
  data: WantsData | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", data: null };
  }

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

  return {
    error: null,
    data: {
      wants: (row?.wants as WantItem[] | null) ?? null,
      bets: (row?.bets as BetItem[] | null) ?? null,
      introSeen: Boolean(introRow),
    },
  };
}

/** True, sobald der User irgendeine Werte-Hypothese hat (bestätigt ODER nicht) —
 *  Basis für den weichen Nudge vor dem Wants-Audit. */
export async function hasValuesHypothesis(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("values_hypothesis")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

// ─── Save Wants ─────────────────────────────────────────────────────────

/** Liefert zusätzlich das gemergte Array zurück, damit der Client seinen
 *  State mit dem Server-Stand synchronisieren kann. */
export type SaveWantsState = ActionState & {
  wants?: WantItem[];
};

export async function saveWantsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<SaveWantsState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um zu speichern.", success: false };
  }

  const incomingRaw = parseItems(formData.get("wants"), MAX_WANTS, isWantItem);
  if (!incomingRaw) {
    return { error: "Ungültiges Format.", success: false };
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

  const { error: mergeError, merged } = await mergeIntoColumn(
    supabase,
    user.id,
    "wants",
    incoming,
    previousIds,
  );
  if (mergeError) {
    return { error: mergeError, success: false };
  }

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
      return { error: dbError(progressError, "wants"), success: false };
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
      return { error: dbError(progressError, "wants"), success: false };
    }
  }

  return { error: null, success: true, wants: merged };
}

// ─── Save Bets ──────────────────────────────────────────────────────────

export type SaveBetsState = ActionState & {
  bets?: BetItem[];
};

export async function saveBetsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<SaveBetsState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um zu speichern.", success: false };
  }

  const incomingRaw = parseItems(formData.get("bets"), MAX_BETS, isBetItem);
  if (!incomingRaw) {
    return { error: "Ungültiges Format.", success: false };
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

  const { error: mergeError, merged } = await mergeIntoColumn(
    supabase,
    user.id,
    "bets",
    incoming,
    previousIds,
  );
  if (mergeError) {
    return { error: mergeError, success: false };
  }

  return { error: null, success: true, bets: merged };
}

// ─── Yin-&-Yang-Audit speichern ─────────────────────────────────────────

export type YinYangActionState = {
  error: string | null;
  success: boolean;
  /** ID des frisch angelegten Eintrags — Input für /api/wants-distiller. */
  entryId: string | null;
};

/**
 * Speichert das Audit als neuen Journal-Eintrag (jeder Durchlauf ein eigener
 * Eintrag — auch beim Re-Run) und setzt den Fortschritt auf in_progress,
 * ohne einen bereits abgeschlossenen Durchlauf zurückzustufen.
 */
export async function saveYinYangEntryAction(
  _prevState: YinYangActionState,
  formData: FormData,
): Promise<YinYangActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um zu speichern.", success: false, entryId: null };
  }

  const yin = (formData.get("yin") as string | null)?.trim() ?? "";
  const yang = (formData.get("yang") as string | null)?.trim() ?? "";
  const principles = (formData.get("principles") as string | null)?.trim() ?? "";
  const tagtraum = (formData.get("tagtraum") as string | null)?.trim() ?? "";

  if (!yin || !yang) {
    return {
      error: "Beide Seiten gehören zum Audit — füll bitte Yin und Yang aus.",
      success: false,
      entryId: null,
    };
  }

  const lengthError =
    tooLong(yin, TEXT_MAX_LONG) ??
    tooLong(yang, TEXT_MAX_LONG) ??
    (principles ? tooLong(principles, TEXT_MAX_LONG) : null) ??
    (tagtraum ? tooLong(tagtraum, TEXT_MAX_LONG) : null);
  if (lengthError) {
    return { error: lengthError, success: false, entryId: null };
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
      recipe_slug: "wants",
      template_type: "yin_yang",
      content,
      entry_date: await serverTodayKey(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: dbError(insertError, "wants"), success: false, entryId: null };
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
        return { error: dbError(updateError, "wants"), success: false, entryId: null };
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
      return { error: dbError(progressError, "wants"), success: false, entryId: null };
    }
  }

  return { error: null, success: true, entryId: inserted.id };
}
