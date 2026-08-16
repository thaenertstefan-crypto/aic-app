"use server";

import { revalidatePath } from "next/cache";

import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
import { serverTodayKey } from "@/lib/server/timezone";
import { DEFAULT_CARDS, DEFAULT_MANTRA } from "./defaults";

const MANTRA_MAX = 120;
const CARD_MAX = 200;
const REVALIDATE_PATH = "/booster/confidence";

// Karte für die UI: DB-Zeilen haben eine id, Default-Karten nicht (id: null).
export type MantraCardData = {
  id: string | null;
  thought: string;
  reframe: string;
};
export type MantraData = { mantra: string; cards: MantraCardData[] };

const defaultCards = (): MantraCardData[] =>
  DEFAULT_CARDS.map((c) => ({ id: null, thought: c.thought, reframe: c.reframe }));

/**
 * Log today's "Heute reflektiert" check-in for the daily mantra ritual.
 * Idempotent: a unique constraint on (user_id, cleanser_slug, date) means
 * a second insert for the same day is treated as "already done", not an error.
 *
 * WICHTIG: Der Slug bleibt "mantra", obwohl das Ritual seit dem Merge unter
 * /booster/confidence lebt — so bleiben die bestehenden Streaks der Nutzer
 * erhalten. Nicht "aufräumen"!
 *
 * Die Nutzlast ist „heute erledigt": das Ritual schaltet danach optimistisch
 * auf den Erledigt-Zustand und braucht dafür ein Signal, das sich vom
 * Anfangszustand des Formulars unterscheidet.
 */
export async function logCleanserCheckinAction(
  _prevState: ActionResult<boolean>,
  _formData: FormData,
): Promise<ActionResult<boolean>> {
  return withUser(async ({ supabase, user }) => {
    const today = await serverTodayKey();

    const { error } = await supabase.from("cleanser_checkins").insert({
      user_id: user.id,
      cleanser_slug: "mantra",
      date: today,
    });

    // 23505 = unique_violation → schon heute erledigt, kein echter Fehler.
    if (error && error.code !== "23505") {
      return dbFailed(error, "mantra");
    }

    return ok(true);
  });
}

/**
 * Stiller Check-in beim Abschluss des Moment-Flows („Gleich bin ich dran").
 * Bewusst OHNE Streak-UI — ein Akut-Werkzeug soll keinen Täglich-Nutzen-Anreiz
 * setzen; die Daten liegen nur für spätere Statistiken vor. Der Client ruft
 * fire-and-forget auf und wertet das Ergebnis nie aus (23505 = heute schon
 * geloggt ist hier schlicht egal).
 */
export async function logMomentFlowCheckin(): Promise<ActionResult> {
  return withUser(async ({ supabase, user }) => {
    const today = await serverTodayKey();

    const { error } = await supabase.from("cleanser_checkins").insert({
      user_id: user.id,
      cleanser_slug: "confidence",
      date: today,
    });

    if (error && error.code !== "23505") {
      return dbFailed(error, "confidence");
    }

    return ok();
  });
}

/**
 * Lädt Mantra + Reframe-Karten des eingeloggten Users.
 *
 * Fallback-Strategie: Hat der User noch kein eigenes Mantra bzw. keine eigenen
 * Karten, werden die Default-Konstanten zurückgegeben (Karten dann mit
 * `id: null`, damit die UI sie als nicht-DB-gestützt erkennen kann).
 *
 * Bewusst **kein** `ActionResult`: die Defaults sind die Antwort auf jedes
 * „nichts da" — auch auf „keine Sitzung mehr". Ein Ergebnis zum Auspacken
 * würde die Server-Komponente zwingen, diesen Fallback ein zweites Mal
 * hinzuschreiben.
 */
export async function getMantraData(): Promise<MantraData> {
  const result = await withUser(async ({ supabase, user }) => {
    const { data: mantraRow } = await supabase
      .from("user_mantra")
      .select("text")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: cardRows } = await supabase
      .from("mantra_cards")
      .select("id, thought, reframe")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    const cards: MantraCardData[] =
      cardRows && cardRows.length > 0 ? cardRows : defaultCards();

    return ok({ mantra: mantraRow?.text ?? DEFAULT_MANTRA, cards });
  });

  return result.error === null
    ? result.data
    : { mantra: DEFAULT_MANTRA, cards: defaultCards() };
}

/** Mantra speichern (genau eins pro User, via unique(user_id)-Upsert). */
export async function saveMantraAction(text: string): Promise<ActionResult> {
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    return failed("Bitte gib ein Mantra ein.");
  }
  if (trimmed.length > MANTRA_MAX) {
    return failed(`Maximal ${MANTRA_MAX} Zeichen.`);
  }

  const result = await withUser(async ({ supabase, user }) => {
    const { error } = await supabase.from("user_mantra").upsert(
      {
        user_id: user.id,
        text: trimmed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return error ? dbFailed(error, "mantra") : ok();
  });

  if (result.error !== null) return result;

  revalidatePath(REVALIDATE_PATH);
  return result;
}

/** Validiert ein Gedanke/Reframe-Paar; gibt eine Fehlermeldung oder null zurück. */
function validateCardFields(
  thought: string,
  reframe: string,
): string | null {
  if (!thought.trim() || !reframe.trim()) {
    return "Bitte fülle beide Felder aus.";
  }
  if (thought.trim().length > CARD_MAX || reframe.trim().length > CARD_MAX) {
    return `Maximal ${CARD_MAX} Zeichen je Feld.`;
  }
  return null;
}

/** Neue Reframe-Karte am Ende der Liste anlegen. */
export async function addCardAction(
  thought: string,
  reframe: string,
): Promise<ActionResult> {
  const validationError = validateCardFields(thought ?? "", reframe ?? "");
  if (validationError) {
    return failed(validationError);
  }

  const result = await withUser(async ({ supabase, user }) => {
    // Nächste sort_order ans Ende.
    const { data: last } = await supabase
      .from("mantra_cards")
      .select("sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = (last?.sort_order ?? -1) + 1;

    const { error } = await supabase.from("mantra_cards").insert({
      user_id: user.id,
      thought: thought.trim(),
      reframe: reframe.trim(),
      sort_order,
    });

    return error ? dbFailed(error, "mantra") : ok();
  });

  if (result.error !== null) return result;

  revalidatePath(REVALIDATE_PATH);
  return result;
}

/** Eigene Reframe-Karte bearbeiten. */
export async function updateCardAction(
  id: string,
  thought: string,
  reframe: string,
): Promise<ActionResult> {
  if (!id) {
    return failed("Karte nicht gefunden.");
  }

  const validationError = validateCardFields(thought ?? "", reframe ?? "");
  if (validationError) {
    return failed(validationError);
  }

  const result = await withUser(async ({ supabase, user }) => {
    // RLS scoped auf den Owner; der user_id-Filter ist zusätzliche Absicherung.
    const { error } = await supabase
      .from("mantra_cards")
      .update({ thought: thought.trim(), reframe: reframe.trim() })
      .eq("id", id)
      .eq("user_id", user.id);

    return error ? dbFailed(error, "mantra") : ok();
  });

  if (result.error !== null) return result;

  revalidatePath(REVALIDATE_PATH);
  return result;
}

/** Eigene Reframe-Karte löschen. */
export async function deleteCardAction(id: string): Promise<ActionResult> {
  if (!id) {
    return failed("Karte nicht gefunden.");
  }

  const result = await withUser(async ({ supabase, user }) => {
    const { error } = await supabase
      .from("mantra_cards")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return error ? dbFailed(error, "mantra") : ok();
  });

  if (result.error !== null) return result;

  revalidatePath(REVALIDATE_PATH);
  return result;
}

/**
 * Materialisiert die Default-Karten als eigene Zeilen des Users und gibt sie
 * (mit echten IDs, in Reihenfolge) zurück. Wird beim ersten Bearbeiten/Löschen/
 * Hinzufügen aufgerufen, solange der User noch auf den Fallback-Defaults sitzt.
 *
 * Idempotent: Hat der User bereits Karten, werden diese unverändert
 * zurückgegeben (kein Doppel-Seed bei Races/Doppelklicks).
 */
export async function seedDefaultCardsAction(): Promise<
  ActionResult<MantraCardData[]>
> {
  return withUser(async ({ supabase, user }) => {
    const { data: existing } = await supabase
      .from("mantra_cards")
      .select("id, thought, reframe")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    // Schon materialisiert → unverändert zurück, ohne die Seite zu invalidieren.
    if (existing && existing.length > 0) {
      return ok<MantraCardData[]>(existing);
    }

    const rows = DEFAULT_CARDS.map((c, i) => ({
      user_id: user.id,
      thought: c.thought,
      reframe: c.reframe,
      sort_order: i,
    }));

    const { data: inserted, error } = await supabase
      .from("mantra_cards")
      .insert(rows)
      .select("id, thought, reframe, sort_order");

    if (error || !inserted) {
      return dbFailed(error, "mantra_cards.insert");
    }

    const cards: MantraCardData[] = [...inserted]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((r) => ({ id: r.id, thought: r.thought, reframe: r.reframe }));

    revalidatePath(REVALIDATE_PATH);
    return ok(cards);
  });
}
