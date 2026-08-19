"use server";

import { revalidatePath } from "next/cache";

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
import type {
  BetItem,
  LittleBetContent,
  WantItem,
  YinYangContent,
} from "@/lib/types/db-json";
import { serverTodayKey } from "@/lib/server/timezone";
import {
  TEXT_MAX_LONG,
  TEXT_MAX_SHORT,
  tooLong,
} from "@/lib/utils/form-validation";
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
import { writeProgress } from "@/lib/recipes/progress";
import {
  nextAuditProgress,
  nextWantsProgress,
} from "@/lib/recipes/wants/progress";

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

    // Abgeschlossen, sobald mindestens ein Want existiert. Seit dem Wegfall von
    // „loslassen" kann kein Want mehr erlöschen (active bleibt immer true),
    // darum ist das Gate schlicht „gibt es Sterne". Little Bets gaten nicht.
    const progressResult = await writeProgress(ctx, "wants", (progress, now) =>
      nextWantsProgress(progress, merged.length > 0, now),
    );
    if (progressResult.error !== null) return progressResult;

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
  return withUser(async (ctx) => {
    const { supabase, user } = ctx;
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

    const progressResult = await writeProgress(ctx, "wants", nextAuditProgress);
    if (progressResult.error !== null) return progressResult;

    return ok(savedEntryId(inserted.id));
  });
}

// ─── Little-Bet-Reflexion speichern ────────────────────────────────────

/**
 * Reflexion zu einem Little Bet speichern: legt einen Journal-Eintrag
 * (template_type "little_bet") an und markiert den Bet in der wants-Zeile als
 * „tried" (mit Verweis auf den Eintrag). Der Bet-Update läuft über die
 * kanonische saveBetsAction (Reload-vor-Write-Merge), damit parallele
 * Änderungen auf einem anderen Gerät erhalten bleiben.
 *
 * Die Nutzlast ist „ist gespeichert": der Client zeigt danach eine warme
 * Abschluss-Ansicht statt eines Redirects und braucht dafür ein Signal, das
 * sich vom Anfangszustand des Formulars unterscheidet.
 */
export async function saveBetReflectionAction(
  _prev: ActionResult<boolean>,
  formData: FormData,
): Promise<ActionResult<boolean>> {
  const betId = (formData.get("betId") as string | null)?.trim() ?? "";
  const experience = (formData.get("experience") as string | null)?.trim() ?? "";
  const liked = (formData.get("liked") as string | null)?.trim() ?? "";
  const disliked = (formData.get("disliked") as string | null)?.trim() ?? "";
  const vibeRaw = (formData.get("vibe") as string | null)?.trim() ?? "";
  const changedWants = (formData.get("changed_wants") as string | null)?.trim() ?? "";

  if (!betId) return failed("Das hat gerade nicht geklappt. Versuch es noch einmal.");
  if (!experience) return failed("Erzähl kurz, wie das Experiment war.");

  const lengthError =
    tooLong(experience, TEXT_MAX_LONG) ??
    (liked ? tooLong(liked, TEXT_MAX_LONG) : null) ??
    (disliked ? tooLong(disliked, TEXT_MAX_LONG) : null) ??
    (changedWants ? tooLong(changedWants, TEXT_MAX_LONG) : null);
  if (lengthError) return failed(lengthError);

  const result = await withUser(async ({ supabase, user }) => {
    const { data: row } = await supabase
      .from("wants")
      .select("bets")
      .eq("user_id", user.id)
      .maybeSingle();

    const bets = (row?.bets as BetItem[] | null) ?? [];
    const bet = bets.find((b) => b.id === betId);
    if (!bet) {
      return failed("Wir konnten dieses Experiment nicht finden.");
    }

    const vibe =
      vibeRaw === "energized" || vibeRaw === "neutral" || vibeRaw === "drained"
        ? vibeRaw
        : undefined;

    const content: LittleBetContent = {
      bet_text: bet.text.slice(0, TEXT_MAX_SHORT),
      experience,
      ...(liked ? { liked } : {}),
      ...(disliked ? { disliked } : {}),
      ...(vibe ? { vibe } : {}),
      ...(changedWants ? { changed_wants: changedWants } : {}),
    };

    const { data: inserted, error: insertError } = await supabase
      .from("journal_entries")
      .insert({
        user_id: user.id,
        recipe_slug: recipeSlugFor("little_bet"),
        template_type: "little_bet",
        content,
        entry_date: await serverTodayKey(),
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return dbFailed(insertError, "wants");
    }

    // Bet als ausprobiert markieren (komplettes Array über die kanonische Action
    // zurückschreiben — alle ids bleiben, also identischer Merge).
    const updatedBets: BetItem[] = bets.map((b) =>
      b.id === betId
        ? { ...b, status: "tried" as const, journalEntryId: inserted.id }
        : b,
    );

    const fd = new FormData();
    fd.set("bets", JSON.stringify(updatedBets));
    const res = await saveBetsAction(fd);
    if (res.error !== null) return failed(res.error);

    return ok(true);
  });

  if (result.error !== null) return result;

  // Kein Server-Redirect: der Client zeigt eine warme Abschluss-Ansicht
  // (Feier + „Zu deinen Sternen"), wie Journey und Schmiede. revalidatePath
  // hält /me/wants frisch, sobald dorthin navigiert wird.
  revalidatePath("/me/wants");
  return result;
}
