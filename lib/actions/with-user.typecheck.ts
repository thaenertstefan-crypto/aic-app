/**
 * Typ-Test für `withUser` — läuft nie, wird nur von `npx tsc --noEmit` geprüft.
 *
 * Bewusst NICHT `*.test.ts`: `node --test` würde die Datei einsammeln und am
 * `server-only`-Import scheitern. Die reine Hälfte des Moduls hat einen echten
 * Laufzeit-Test in `action-result.test.ts`; hier steht nur, was `withUser`
 * selbst betrifft — dass `T` durch den Callback bis zum Ergebnis durchläuft
 * und der Kontext trägt, was eine Action braucht.
 *
 * Solange die Aufrufer nicht migriert sind (zwei Folge-Tickets), hat `withUser`
 * null echte Nutzer und der Compiler prüft sonst nichts daran. Diese Datei darf
 * weg, sobald echte Actions dasselbe beweisen.
 */
import { dbFailed, failed, ok } from "./action-result.ts";
import { withUser } from "./with-user.ts";

/** Nutzlast läuft durch: der Callback gibt string[], das Ergebnis trägt string[]. */
export async function payloadFlowsThrough() {
  const result = await withUser(async ({ supabase, user }) => {
    const { data, error } = await supabase
      .from("user_recipe_progress")
      .select("recipe_slug")
      .eq("user_id", user.id);

    if (error) return dbFailed(error, "user_recipe_progress");
    if (!data.length) return failed("Noch nichts da.");
    return ok(data.map((row) => row.recipe_slug));
  });

  if (result.error !== null) return result.error;
  const slugs: string[] = result.data;
  return slugs;
}

/** Schreibende Action ohne Nutzlast: ActionResult<null>, kein data-Ballast. */
export async function writeWithoutPayload() {
  const result = await withUser(async ({ supabase, user }) => {
    const { error } = await supabase
      .from("user_recipe_progress")
      .update({ intro_seen: true })
      .eq("user_id", user.id);

    return error ? dbFailed(error, "user_recipe_progress") : ok();
  });

  // @ts-expect-error — kein success-Feld mehr; der dritte Zustand ist weg.
  void result.success;

  return result.error;
}
