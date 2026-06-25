/**
 * Generische, warme Fehlerausgabe für DB-/Server-Action-Fehler.
 *
 * Rohe Supabase-`error.message`-Texte sollen nicht an den Client gelangen
 * (Info-Disclosure: Tabellen-/Spalten-/Constraint-Namen) und passen mit ihrem
 * englischen Wortlaut nicht in die deutsche, warme UI. Stattdessen wird der
 * echte Fehler serverseitig geloggt und dem Client eine einheitliche deutsche
 * Meldung zurückgegeben.
 *
 * Vorbild: friendlyAuthError in app/(auth)/auth.actions.ts (Auth-Fehler haben
 * ihre eigene, feinere Zuordnung und bleiben unverändert).
 */
const GENERIC_DB_ERROR =
  "Das hat gerade nicht geklappt – bitte versuch es noch einmal.";

export function dbError(error: unknown, context?: string): string {
  console.error(`[db-error]${context ? ` ${context}` : ""}`, error);
  return GENERIC_DB_ERROR;
}
