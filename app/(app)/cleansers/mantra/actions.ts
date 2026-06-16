"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CARDS, DEFAULT_MANTRA } from "./defaults";

export type CleanserCheckinState = {
  error: string | null;
  success: boolean;
};

const MANTRA_MAX = 120;
const CARD_MAX = 200;
const REVALIDATE_PATH = "/cleansers/mantra";

export type MantraActionState = { error: string | null; success: boolean };

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
 * Log today's "Heute reflektiert" check-in for the mantra cleanser.
 * Idempotent: a unique constraint on (user_id, cleanser_slug, date) means
 * a second insert for the same day is treated as "already done", not an error.
 */
export async function logCleanserCheckinAction(
  _prevState: CleanserCheckinState,
  _formData: FormData,
): Promise<CleanserCheckinState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", success: false };
  }

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("cleanser_checkins").insert({
    user_id: user.id,
    cleanser_slug: "mantra",
    date: today,
  });

  // 23505 = unique_violation → schon heute erledigt, kein echter Fehler.
  if (error && error.code !== "23505") {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}

/**
 * Lädt Mantra + Reframe-Karten des eingeloggten Users.
 *
 * Fallback-Strategie: Hat der User noch kein eigenes Mantra bzw. keine eigenen
 * Karten, werden die Default-Konstanten zurückgegeben (Karten dann mit
 * `id: null`, damit die UI sie als nicht-DB-gestützt erkennen kann).
 */
export async function getMantraData(): Promise<MantraData> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { mantra: DEFAULT_MANTRA, cards: defaultCards() };
  }

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

  const cards =
    cardRows && cardRows.length > 0
      ? (cardRows as MantraCardData[])
      : defaultCards();

  return { mantra: mantraRow?.text ?? DEFAULT_MANTRA, cards };
}

/** Mantra speichern (genau eins pro User, via unique(user_id)-Upsert). */
export async function saveMantraAction(
  text: string,
): Promise<MantraActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", success: false };
  }

  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    return { error: "Bitte gib ein Mantra ein.", success: false };
  }
  if (trimmed.length > MANTRA_MAX) {
    return { error: `Maximal ${MANTRA_MAX} Zeichen.`, success: false };
  }

  const { error } = await supabase.from("user_mantra").upsert(
    {
      user_id: user.id,
      text: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath(REVALIDATE_PATH);
  return { error: null, success: true };
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
): Promise<MantraActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", success: false };
  }

  const validationError = validateCardFields(thought ?? "", reframe ?? "");
  if (validationError) {
    return { error: validationError, success: false };
  }

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

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath(REVALIDATE_PATH);
  return { error: null, success: true };
}

/** Eigene Reframe-Karte bearbeiten. */
export async function updateCardAction(
  id: string,
  thought: string,
  reframe: string,
): Promise<MantraActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", success: false };
  }

  if (!id) {
    return { error: "Karte nicht gefunden.", success: false };
  }

  const validationError = validateCardFields(thought ?? "", reframe ?? "");
  if (validationError) {
    return { error: validationError, success: false };
  }

  // RLS scoped auf den Owner; der user_id-Filter ist zusätzliche Absicherung.
  const { error } = await supabase
    .from("mantra_cards")
    .update({ thought: thought.trim(), reframe: reframe.trim() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath(REVALIDATE_PATH);
  return { error: null, success: true };
}

/** Eigene Reframe-Karte löschen. */
export async function deleteCardAction(
  id: string,
): Promise<MantraActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", success: false };
  }

  if (!id) {
    return { error: "Karte nicht gefunden.", success: false };
  }

  const { error } = await supabase
    .from("mantra_cards")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath(REVALIDATE_PATH);
  return { error: null, success: true };
}

/**
 * Materialisiert die Default-Karten als eigene Zeilen des Users und gibt sie
 * (mit echten IDs, in Reihenfolge) zurück. Wird beim ersten Bearbeiten/Löschen/
 * Hinzufügen aufgerufen, solange der User noch auf den Fallback-Defaults sitzt.
 *
 * Idempotent: Hat der User bereits Karten, werden diese unverändert
 * zurückgegeben (kein Doppel-Seed bei Races/Doppelklicks).
 */
export async function seedDefaultCardsAction(): Promise<{
  error: string | null;
  cards: MantraCardData[];
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", cards: [] };
  }

  const { data: existing } = await supabase
    .from("mantra_cards")
    .select("id, thought, reframe")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (existing && existing.length > 0) {
    return { error: null, cards: existing as MantraCardData[] };
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
    return { error: error?.message ?? "Konnte Karten nicht anlegen.", cards: [] };
  }

  const cards: MantraCardData[] = [...inserted]
    .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
    .map((r) => ({ id: r.id, thought: r.thought, reframe: r.reframe }));

  revalidatePath(REVALIDATE_PATH);
  return { error: null, cards };
}
