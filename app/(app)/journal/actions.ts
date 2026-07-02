"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { dbError } from "@/lib/utils/db-error";
import { serverTodayKey } from "@/lib/server/timezone";
import {
  JOURNAL_PAGE_SIZE,
  toJournalListItem,
  type JournalListItem,
} from "@/lib/utils/journal";
import {
  TEXT_MAX_LONG,
  TEXT_MAX_SHORT,
  tooLong,
} from "@/lib/utils/form-validation";

/** Spalten für die schlanke Listenansicht. content wird nur zur serverseitigen
 *  Vorschau-Berechnung gelesen und verlässt den Server nicht (ai_insights gar nicht). */
const JOURNAL_LIST_SELECT =
  "id, template_type, recipe_slug, entry_date, created_at, content";

type JournalListRow = {
  id: string;
  template_type: string;
  recipe_slug: string | null;
  entry_date: string;
  created_at: string;
  content: Record<string, unknown>;
};

/**
 * Lädt eine Seite der Journal-Liste (schlanke Items, nach created_at absteigend).
 * Ohne Cursor = erste Seite (für die Server-Komponente); mit beforeCreatedAt =
 * Keyset-Pagination für "Mehr laden" vom Client.
 * hasMore wird über das (PAGE_SIZE + 1)-Probe-Element ermittelt.
 */
export async function getJournalPage(
  beforeCreatedAt?: string,
): Promise<{ items: JournalListItem[]; hasMore: boolean }> {
  const user = await getCachedUser();
  if (!user) return { items: [], hasMore: false };

  const supabase = await createClient();
  let query = supabase
    .from("journal_entries")
    .select(JOURNAL_LIST_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(JOURNAL_PAGE_SIZE + 1);

  if (beforeCreatedAt) {
    query = query.lt("created_at", beforeCreatedAt);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`getJournalPage: read failed (${error.code ?? "unknown"})`);
  }

  const rows = (data as JournalListRow[]) ?? [];
  const hasMore = rows.length > JOURNAL_PAGE_SIZE;
  return {
    items: rows.slice(0, JOURNAL_PAGE_SIZE).map(toJournalListItem),
    hasMore,
  };
}

/**
 * Lädt den Voll-Inhalt eines einzelnen Eintrags (content + ai_insights) — erst
 * beim Öffnen des Detail-Dialogs, statt für alle Einträge vorab. Owner-Check
 * über user_id zusätzlich zur RLS.
 */
export async function getJournalEntryDetail(
  id: string,
): Promise<{ content: Record<string, unknown>; ai_insights: string | null } | null> {
  const user = await getCachedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("journal_entries")
    .select("content, ai_insights")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return {
    content: (data.content as Record<string, unknown>) ?? {},
    ai_insights: data.ai_insights ?? null,
  };
}

export type FreeEntryState = {
  error: string | null;
};

/**
 * Speichert einen freien, rezeptunabhängigen Journaleintrag. Titel + Text
 * gehen gemeinsam in content (die Tabelle hat keine title-Spalte).
 */
export async function createFreeEntryAction(
  _prevState: FreeEntryState,
  formData: FormData,
): Promise<FreeEntryState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um zu speichern." };
  }

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const body = (formData.get("body") as string | null)?.trim() ?? "";

  if (!body) {
    return { error: "Bitte schreib ein paar Worte, bevor du speicherst." };
  }
  const lengthError =
    tooLong(title, TEXT_MAX_SHORT) ?? tooLong(body, TEXT_MAX_LONG);
  if (lengthError) {
    return { error: lengthError };
  }

  const content: { title?: string; body: string } = { body };
  if (title) content.title = title;

  const { error } = await supabase.from("journal_entries").insert({
    user_id: user.id,
    recipe_slug: null,
    template_type: "free",
    content,
    entry_date: await serverTodayKey(),
  });

  if (error) {
    return { error: dbError(error, "journal_entries") };
  }

  revalidatePath("/journal");
  redirect("/journal");
}
