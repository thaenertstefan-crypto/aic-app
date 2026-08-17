"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { Json } from "@/lib/supabase/database.types";
import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
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
import { recipeSlugFor } from "@/lib/utils/journal-recipe-slug";

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
 *
 * Bewusst **kein** `ActionResult`: das ist ein Lesepfad, den beide Aufrufer
 * direkt in ihre Liste destrukturieren. Ein DB-Fehler wirft weiterhin (die
 * Fehlergrenze der Route soll ihn sehen, nicht eine stille leere Liste); die
 * leere Seite bleibt allein die Antwort auf „keine Sitzung mehr".
 */
export async function getJournalPage(
  beforeCreatedAt?: string,
): Promise<{ items: JournalListItem[]; hasMore: boolean }> {
  const result = await withUser(async ({ supabase, user }) => {
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
    return ok({
      items: rows.slice(0, JOURNAL_PAGE_SIZE).map(toJournalListItem),
      hasMore: rows.length > JOURNAL_PAGE_SIZE,
    });
  });

  return result.error === null ? result.data : { items: [], hasMore: false };
}

/**
 * Lädt den Voll-Inhalt eines einzelnen Eintrags (content + ai_insights) — erst
 * beim Öffnen des Detail-Dialogs, statt für alle Einträge vorab. Owner-Check
 * über user_id zusätzlich zur RLS.
 *
 * Bewusst **kein** `ActionResult`: der Dialog kennt genau zwei Zustände, „lädt"
 * und „liegt vor". `null` trägt „gibt es nicht (mehr)" schon; ein zweiter
 * Leer-Zustand mit eigener Meldung wäre für denselben leeren Dialog.
 */
export async function getJournalEntryDetail(
  id: string,
): Promise<{ content: Json; ai_insights: string | null } | null> {
  const result = await withUser(async ({ supabase, user }) => {
    const { data } = await supabase
      .from("journal_entries")
      .select("content, ai_insights")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) return ok(null);
    // Roh weiterreichen: verengt wird erst in getContentSections, zusammen mit
    // dem template_type — ohne den ist der content nur eine Form ohne Bedeutung.
    return ok({
      content: data.content,
      ai_insights: data.ai_insights ?? null,
    });
  });

  return result.error === null ? result.data : null;
}

/**
 * Speichert einen freien, rezeptunabhängigen Journaleintrag. Titel + Text
 * gehen gemeinsam in content (die Tabelle hat keine title-Spalte).
 */
export async function createFreeEntryAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const body = (formData.get("body") as string | null)?.trim() ?? "";

  if (!body) {
    return failed("Bitte schreib ein paar Worte, bevor du speicherst.");
  }
  const lengthError =
    tooLong(title, TEXT_MAX_SHORT) ?? tooLong(body, TEXT_MAX_LONG);
  if (lengthError) {
    return failed(lengthError);
  }

  const content: { title?: string; body: string } = { body };
  if (title) content.title = title;

  const result = await withUser(async ({ supabase, user }) => {
    const { error } = await supabase.from("journal_entries").insert({
      user_id: user.id,
      recipe_slug: recipeSlugFor("free"),
      template_type: "free",
      content,
      entry_date: await serverTodayKey(),
    });

    return error ? dbFailed(error, "journal_entries") : ok();
  });

  if (result.error !== null) return result;

  revalidatePath("/journal");
  redirect("/journal");
}
