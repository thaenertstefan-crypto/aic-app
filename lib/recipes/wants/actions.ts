"use server";

import { revalidatePath } from "next/cache";

import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { dbError } from "@/lib/utils/db-error";
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
import {
  MOMENT_BROKEN_CALL,
  deletedStarIds,
  groupMomentsByStar,
  isMomentOrigin,
  momentTextError,
  parseBornMoments,
  toStarMoment,
  type MomentsByStar,
  type NewMoment,
  type StarMoment,
} from "@/lib/recipes/wants/moments";
import { ANSWER_MAX, filledAnswers } from "@/lib/recipes/wants/state";
import { readIntroSeen, writeProgress } from "@/lib/recipes/progress";
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
  /** Momente des Nutzers, nach Stern geschlagen; leeres Verzeichnis, wenn es keine gibt. */
  moments: MomentsByStar;
  introSeen: boolean;
};

export async function getWantsData(): Promise<ActionResult<WantsData>> {
  return withUser(async (ctx) => {
    const { supabase, user } = ctx;
    const { data: row } = await supabase
      .from("wants")
      .select("wants, bets")
      .eq("user_id", user.id)
      .maybeSingle();

    return ok({
      wants: (row?.wants as WantItem[] | null) ?? null,
      bets: (row?.bets as BetItem[] | null) ?? null,
      moments: await readMoments(ctx),
      introSeen: await readIntroSeen(ctx, "wants"),
    });
  });
}

// ─── Momente ────────────────────────────────────────────────────────────
// Ein Moment ist ein Beleg an einem Stern: „das hier habe ich gelebt". Er
// gehört genau einem Stern und wird nie über Sterne hinweg gelesen — deshalb
// liegt er in `star_moments` ohne Fremdschlüssel auf den Stern (ADR-0007) und
// wird hier zusammen mit den Sternen geholt statt über einen eigenen Umweg.
//
// Die drei Schreib-Actions nehmen getippte Argumente statt FormData: die
// Oberfläche entscheidet KAN-37, und die vom Client erzeugte id — an der die
// Idempotenz hängt — soll nicht erst durch ein String-Feld.

const MOMENTS_TABLE = "star_moments";

/**
 * Alle Momente des Nutzers, nach Stern geschlagen.
 *
 * Eine Abfrage mehr neben den Sternen, dafür hat die Fokus-Ebene sie ohne
 * eigenen Umweg — und sie ist die einzige Stelle, die sie zeigt.
 *
 * Sortiert wird nach `star_id, created_at` — nicht, weil die Reihenfolge der
 * Sterne jemanden interessiert (die Gruppierung wirft sie ohnehin weg),
 * sondern weil das genau der Index `(user_id, star_id, created_at)` ist. Damit
 * *kann* Postgres die Reihenfolge aus dem Index nehmen statt nachzusortieren;
 * nach `created_at` allein bliebe ihm nur der Sort. Ob er den Index-Scan auch
 * wählt, entscheidet er nach Zeilenzahl — bei einer noch leeren Tabelle ist
 * ihm ein Bitmap-Scan mit Sort billiger, und das ist in Ordnung.
 *
 * Innerhalb eines Sterns kommen die Momente so oder so in der Reihenfolge, in
 * der sie entstanden sind — nur darauf kommt es an.
 *
 * Waisen (Momente gelöschter Sterne) kommen hier mit durch und landen unter
 * einem Schlüssel, nach dem niemand fragt. Das ist die erlaubte Seite von
 * ADR-0007 — kein Defekt, nur unsichtbarer Müll.
 *
 * **Kein `ActionResult`:** der Aufrufer reicht das Verzeichnis direkt weiter.
 * „Noch keine Momente" ist die richtige Antwort auf jeden Fehlerfall — die
 * Sterne stehen trotzdem am Himmel, und ein Ergebnis zum Auspacken zwänge
 * `getWantsData` einen Zweig auf, in dem es dasselbe täte.
 */
async function readMoments({
  supabase,
  user,
}: ActionContext): Promise<MomentsByStar> {
  const { data, error } = await supabase
    .from(MOMENTS_TABLE)
    .select("id, star_id, text, origin, created_at")
    .eq("user_id", user.id)
    .order("star_id", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    if (error) dbError(error, MOMENTS_TABLE);
    return {};
  }

  return groupMomentsByStar(data.map(toStarMoment));
}

/**
 * Die Momente gelöschter Sterne mitnehmen — **best effort**.
 *
 * Müllabfuhr, keine Bedingung: Waisen sind nach ADR-0007 ausdrücklich erlaubt,
 * weil Momente nie über Sterne hinweg gelesen werden. Schlägt das Löschen
 * fehl, ist der Stern trotzdem weg und der Schreibvorgang erfolgreich — nur
 * der Server-Log weiß davon. Darum gibt diese Funktion nichts zurück, was ein
 * Aufrufer prüfen könnte.
 */
async function sweepMomentsOfDeletedStars(
  { supabase, user }: ActionContext,
  starIds: string[],
): Promise<void> {
  if (starIds.length === 0) return;

  const { error } = await supabase
    .from(MOMENTS_TABLE)
    .delete()
    .eq("user_id", user.id)
    .in("star_id", starIds);

  if (error) dbError(error, `${MOMENTS_TABLE} sweep`);
}

/**
 * Die Momente, mit denen neue Sterne geboren werden — **eine** Anweisung.
 *
 * **Eine** Anweisung, weil ein Bulk-Insert kein „halb" hat: entweder alle
 * Zeilen stehen oder keine. Ein `upsert` je Moment hätte genau das — nach
 * einem Abbruch mittendrin stünde ein Teil der Belege, und niemand wüsste
 * welcher.
 *
 * `onConflict: "id"` ist die zweite Hälfte: die ids kommen vom Client und
 * überleben dort einen Fehlschlag (`WantsState.bornMoments`). Tippt die Person
 * nach einem Fehler noch einmal — oder ging nur die Antwort verloren —, trifft
 * die Wiederholung auf dieselben ids und schreibt keine Zeile mehr. Ohne diese
 * beiden Hälften stünde jeder Beleg zweimal unter seinem Stern.
 *
 * **Kein `ActionResult`:** wie die Müllabfuhr daneben ist das kein Grund, das
 * Speichern scheitern zu lassen. Der Stern ist geschrieben, und ein Stern ohne
 * seine ersten Momente ist kein Defekt, sondern ein Stern, den der Nutzer
 * selbst belegt — die Fokus-Ebene kann beides. Ein Fehlschlag hier gegen den
 * geglückten Stern einzutauschen wäre der teurere Fehler.
 */
async function writeBornMoments(
  { supabase, user }: ActionContext,
  moments: NewMoment[],
): Promise<void> {
  if (moments.length === 0) return;

  const { error } = await supabase.from(MOMENTS_TABLE).upsert(
    moments.map((m) => ({
      id: m.id,
      user_id: user.id,
      star_id: m.starId,
      text: m.text,
      origin: m.origin,
    })),
    { onConflict: "id" },
  );

  if (error) dbError(error, `${MOMENTS_TABLE} born`);
}

/**
 * Einen Moment anlegen.
 *
 * **Die id kommt vom Client**, und das Anlegen ist deshalb idempotent: derselbe
 * Aufruf zweimal erzeugt eine Zeile, keine zwei. Stern und Moment entstehen im
 * selben Schreibvorgang, aber in zwei Anweisungen — nach einem Teilfehler darf
 * die Wiederholung nichts verdoppeln.
 *
 * Die Nutzlast ist der geschriebene Moment: der Client bekommt `created_at`
 * vom Server, statt es zu raten.
 */
export async function addMomentAction(
  moment: NewMoment,
): Promise<ActionResult<StarMoment>> {
  const text = moment.text.trim();
  const textError = momentTextError(text);
  if (textError) return failed(textError);
  if (!moment.id.trim() || !moment.starId.trim()) {
    return failed(MOMENT_BROKEN_CALL);
  }
  // Der Typ sagt MomentOrigin, aber eine Server-Action ist eine offene
  // HTTP-Fläche — was ankommt, hat den Typ nie durchlaufen.
  if (!isMomentOrigin(moment.origin)) {
    return failed(MOMENT_BROKEN_CALL);
  }

  const result = await withUser(async ({ supabase, user }) => {
    const { data, error } = await supabase
      .from(MOMENTS_TABLE)
      .upsert(
        {
          id: moment.id,
          user_id: user.id,
          star_id: moment.starId,
          text,
          origin: moment.origin,
        },
        { onConflict: "id" },
      )
      .select("id, star_id, text, origin, created_at")
      .single();

    if (error || !data) return dbFailed(error, MOMENTS_TABLE);

    return ok(toStarMoment(data));
  });

  if (result.error !== null) return result;

  revalidatePath("/me/wants");
  return result;
}

/** Den Text eines Moments ändern. `origin` und `created_at` bleiben, wie sie sind. */
export async function updateMomentAction(
  id: string,
  text: string,
): Promise<ActionResult> {
  const trimmed = text.trim();
  const textError = momentTextError(trimmed);
  if (textError) return failed(textError);
  if (!id.trim()) {
    return failed(MOMENT_BROKEN_CALL);
  }

  const result = await withUser(async ({ supabase, user }) => {
    const { error } = await supabase
      .from(MOMENTS_TABLE)
      .update({ text: trimmed })
      .eq("id", id)
      .eq("user_id", user.id);

    return error ? dbFailed(error, MOMENTS_TABLE) : ok();
  });

  if (result.error !== null) return result;

  revalidatePath("/me/wants");
  return result;
}

/**
 * Einen Moment löschen — hart, ohne Zwischenzustand.
 *
 * „Loslassen" ist bei den Sternen absichtlich weggefallen; es hier als
 * `active`-Flag neu einzuführen wäre ein Rückschritt.
 */
export async function deleteMomentAction(id: string): Promise<ActionResult> {
  if (!id.trim()) {
    return failed(MOMENT_BROKEN_CALL);
  }

  const result = await withUser(async ({ supabase, user }) => {
    const { error } = await supabase
      .from(MOMENTS_TABLE)
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return error ? dbFailed(error, MOMENTS_TABLE) : ok();
  });

  if (result.error !== null) return result;

  revalidatePath("/me/wants");
  return result;
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
      example: w.example?.trim() ? w.example.trim() : null,
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

    // Die Sterne sind geschrieben — was der Client gelöscht hat, ist jetzt weg
    // und seine Momente sind Müll. Bewusst ohne Prüfung des Ergebnisses: die
    // Müllabfuhr darf das Speichern nicht scheitern lassen (ADR-0007).
    await sweepMomentsOfDeletedStars(
      ctx,
      deletedStarIds(
        previousIds,
        incoming.map((w) => w.id),
      ),
    );

    // Und die Momente, mit denen die neuen Sterne geboren werden (KAN-58) —
    // nach dem Merge, damit sie an Sternen hängen, die es wirklich gibt, und
    // nach der Müllabfuhr, damit keine Reihenfolge sie wieder abräumt.
    //
    // Die Sterne-Bühne der Sternensuche ist der einzige Aufrufer, der hier
    // etwas mitschickt; ein Speichern aus der Sternenkarte lässt das Feld weg
    // und schreibt keine.
    await writeBornMoments(
      ctx,
      parseBornMoments(
        formData.get("moments"),
        new Set(merged.map((w) => w.id)),
      ),
    );

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
 * Ein FormData-Feld mit den Antwortfeldern einer Frage.
 *
 * Fehlt oder taugt es nicht, ist die Liste leer — der zusammengefügte Lesetext
 * steht ja trotzdem. Ein harter Ausfall wäre hier der teurere Fehler: die
 * Lesefunktion muss fehlende Listen ohnehin tragen (Alt-Einträge).
 * `filledAnswers` ist dieselbe Rechnung wie im Client, damit die Namen aus dem
 * Destillat später an den richtigen Sternen sitzen.
 */
function parseAnswers(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return filledAnswers(parsed.filter((a): a is string => typeof a === "string"));
}

/** Der Deckel je Antwortfeld — die Client-Textarea hält ihn schon ein. */
function answersTooLong(answers: string[]): string | null {
  for (const answer of answers) {
    const error = tooLong(answer, ANSWER_MAX);
    if (error) return error;
  }
  return null;
}

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

    // Dieselben Antworten noch einmal als Liste: der zusammengefügte String
    // bleibt der Lesetext, die Feldgrenzen stehen nur hier.
    const yinAnswers = parseAnswers(formData.get("yin_answers"));
    const yangAnswers = parseAnswers(formData.get("yang_answers"));
    const tagtraumAnswers = parseAnswers(formData.get("tagtraum_answers"));

    if (!yin || !yang) {
      return failed(
        "Beide Seiten gehören zum Audit — füll bitte Yin und Yang aus.",
      );
    }

    const lengthError =
      tooLong(yin, TEXT_MAX_LONG) ??
      tooLong(yang, TEXT_MAX_LONG) ??
      (principles ? tooLong(principles, TEXT_MAX_LONG) : null) ??
      (tagtraum ? tooLong(tagtraum, TEXT_MAX_LONG) : null) ??
      answersTooLong(yinAnswers) ??
      answersTooLong(yangAnswers) ??
      answersTooLong(tagtraumAnswers);
    if (lengthError) {
      return failed(lengthError);
    }

    const content: YinYangContent = { yin, yang };
    if (yinAnswers.length > 0) {
      content.yin_answers = yinAnswers;
    }
    if (yangAnswers.length > 0) {
      content.yang_answers = yangAnswers;
    }
    if (principles) {
      content.principles = principles;
    }
    if (tagtraum) {
      content.tagtraum = tagtraum;
    }
    if (tagtraumAnswers.length > 0) {
      content.tagtraum_answers = tagtraumAnswers;
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
