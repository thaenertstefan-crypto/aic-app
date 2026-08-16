import "server-only";

import { getCachedUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";

import { type ActionResult, failed, SESSION_EXPIRED } from "./action-result.ts";

/**
 * Der gemeinsame Einstieg für Server-Actions.
 *
 * Vorher begannen 41 von 49 Actions mit derselben Präambel — Client bauen,
 * `auth.getUser()`, Null-Prüfung — in 25 verschiedenen Schreibweisen. Die
 * häufigste kam siebenmal vor. Dieses Modul ist die eine Schreibweise; die
 * Ergebnisform steht daneben in `action-result.ts`.
 *
 * Bewusst ohne eigene Laufzeit-Tests: der Einstieg braucht Supabase, ist also
 * nicht rein im Sinne der Testregel in CODING_STANDARDS.md. Der Gewinn hier
 * ist Lokalität und eine Fehlermeldung statt vier — nicht Prüfbarkeit.
 *
 * Bestehende Aufrufer sind absichtlich noch nicht migriert; das passiert in
 * zwei Folge-Tickets. Bis dahin stehen `lib/types/action-state.ts` und die
 * rohen `auth.getUser()`-Präambeln unverändert daneben.
 */

// Aus den Quellen abgeleitet statt nachgeschrieben: ein handgepflegter
// Client-/User-Typ würde beim nächsten Supabase-Update stillschweigend falsch.
type ServerClient = Awaited<ReturnType<typeof createClient>>;
type SignedInUser = NonNullable<Awaited<ReturnType<typeof getCachedUser>>>;

/** Was eine Action von `withUser` bekommt: fertiger Client, sicher angemeldeter User. */
export type ActionContext = {
  supabase: ServerClient;
  user: SignedInUser;
};

/**
 * Führt `run` mit Client und angemeldetem User aus. Ist niemand angemeldet,
 * läuft `run` gar nicht erst und das Ergebnis ist `failed(SESSION_EXPIRED)`.
 *
 * ```ts
 * export async function saveThing() {
 *   return withUser(async ({ supabase, user }) => {
 *     const { error } = await supabase.from("things").insert({ user_id: user.id });
 *     return error ? dbFailed(error, "things") : ok();
 *   });
 * }
 * ```
 *
 * Absichtlich **ohne** try/catch um `run`: `redirect()` und `notFound()` von
 * Next arbeiten über geworfene Kontroll-Fehler. Ein pauschaler Fang würde die
 * schlucken und die Navigation stillschweigend verschwinden lassen.
 */
export async function withUser<T>(
  run: (ctx: ActionContext) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  // getCachedUser statt supabase.auth.getUser(): innerhalb eines Render-Passes
  // teilen sich mehrere Aufrufe denselben token-validierenden Roundtrip. Dass
  // getCachedUser dafür intern einen eigenen Client baut, ist der Preis — eine
  // Client-Konstruktion ist reines Objekt-Bauen, der gesparte getUser() ein
  // Netzwerk-Roundtrip.
  const user = await getCachedUser();
  if (!user) return failed(SESSION_EXPIRED);

  const supabase = await createClient();
  return run({ supabase, user });
}
