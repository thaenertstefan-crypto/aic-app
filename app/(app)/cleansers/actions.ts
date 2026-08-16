"use server";

import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
import { getCleanserIntro } from "@/lib/utils/cleanser-intros";

// ─── Cleanser-Intro "schon gesehen?"-Status ────────────────────────────
//
// Merkt pro User & Cleanser-Slug, ob die "Worum geht's?"-Intro schon gesehen
// wurde (Tabelle cleanser_intro_seen). Muster analog zu recipes/actions.ts
// (hasSeenRecipeIntro / markRecipeIntroSeenAction).

/**
 * Lesepfad: liefert alle Cleanser-Slugs, deren Intro der eingeloggte User
 * bereits gesehen hat.
 *
 * Bewusst **kein** `ActionResult`: der Aufrufer ist eine Server-Komponente, die
 * daraus nur ein `introSeen`-Flag zieht. „Nichts gesehen" ist die richtige
 * Antwort auf jeden Fehlerfall — ein Ergebnis zum Auspacken würde jedem
 * Aufrufer einen Zweig aufzwingen, in dem er dasselbe täte.
 */
export async function getSeenCleanserIntros(): Promise<string[]> {
  const result = await withUser(async ({ supabase, user }) => {
    const { data } = await supabase
      .from("cleanser_intro_seen")
      .select("cleanser_slug")
      .eq("user_id", user.id);

    return ok((data ?? []).map((r) => r.cleanser_slug));
  });

  return result.error === null ? result.data : [];
}

/**
 * Markiert die Intro eines Cleansers als gesehen (Upsert pro user_id +
 * cleanser_slug). Idempotent; aus Client-Komponenten aufrufbar.
 */
export async function markCleanserIntroSeenAction(
  slug: string,
): Promise<ActionResult> {
  return withUser(async ({ supabase, user }) => {
    // Slug kommt aus Client-Komponenten — nur bekannte Cleanser zulassen.
    if (!getCleanserIntro(slug)) {
      return failed("Unbekannte Übung.");
    }

    const { error } = await supabase.from("cleanser_intro_seen").upsert(
      {
        user_id: user.id,
        cleanser_slug: slug,
      },
      { onConflict: "user_id,cleanser_slug" },
    );

    return error ? dbFailed(error, "cleanser_intro_seen") : ok();
  });
}
