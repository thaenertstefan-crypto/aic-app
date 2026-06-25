import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * Liefert den aktuell angemeldeten User, token-validierend über
 * supabase.auth.getUser() — pro Request memoisiert (React.cache).
 *
 * Warum React.cache und NICHT Next-16 `use cache`/cacheLife:
 * cache() dedupliziert nur INNERHALB eines Render-/Request-Passes und
 * persistiert NICHT über Requests hinweg. Genau das ist hier gewünscht —
 * ein auth-/user-spezifisches Ergebnis darf niemals cross-request gecacht
 * werden (Sicherheitsrisiko). Mehrere Aufrufe im selben Page-Render teilen
 * sich so denselben getUser()-Roundtrip.
 *
 * Hinweis: Server Actions und API-Routen laufen je in EIGENEM Request-Kontext;
 * dort findet keine Cross-Aufruf-Deduplizierung statt (auch nicht gewollt).
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
