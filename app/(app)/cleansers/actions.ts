"use server";

import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/utils/db-error";

// ─── Cleanser-Intro "schon gesehen?"-Status ────────────────────────────
//
// Merkt pro User & Cleanser-Slug, ob die "Worum geht's?"-Intro schon gesehen
// wurde (Tabelle cleanser_intro_seen). Muster analog zu recipes/actions.ts
// (hasSeenRecipeIntro / markRecipeIntroSeenAction).

/**
 * Lesepfad: liefert alle Cleanser-Slugs, deren Intro der eingeloggte User
 * bereits gesehen hat. Leeres Array, wenn niemand angemeldet ist.
 */
export async function getSeenCleanserIntros(): Promise<string[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("cleanser_intro_seen")
    .select("cleanser_slug")
    .eq("user_id", user.id);

  return (data ?? []).map((r) => r.cleanser_slug as string);
}

/**
 * Markiert die Intro eines Cleansers als gesehen (Upsert pro user_id +
 * cleanser_slug). Idempotent; aus Client-Komponenten aufrufbar.
 */
export async function markCleanserIntroSeenAction(
  slug: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein." };
  }

  const { error } = await supabase.from("cleanser_intro_seen").upsert(
    {
      user_id: user.id,
      cleanser_slug: slug,
    },
    { onConflict: "user_id,cleanser_slug" },
  );

  return { error: error ? dbError(error, "cleanser_intro_seen") : null };
}
