/**
 * Schmale, explizit definierte Shapes für die JSONB-Spalten der Datenbank.
 *
 * Die generierten Supabase-Typen (lib/supabase/database.types.ts) liefern
 * JSONB-Spalten nur als `Json`. Statt an jeder Lesestelle ein eigenes inline-
 * Literal zu casten, leben die konkreten Element-Shapes hier zentral — so gibt
 * es pro Form genau EINE Quelle, und ein Cast (`row.col as RightItem[]`) bleibt
 * bewusst und dokumentiert.
 */

/** Element von `bill_of_rights.rights` (JSONB-Array). */
export type RightItem = {
  id: string;
  text: string;
  active: boolean;
};

/** `journal_entries.content` bei template_type "daily_value" (Werte-Tagebuch). */
export type DailyValueContent = {
  happenings: string;
  response: string;
};

/** `journal_entries.content` bei template_type "value_eval" (Werte-Auswertung). */
export type ValueEvalContent = {
  positive_reflection: string;
  negative_reflection: string;
};

/** `journal_entries.content` bei template_type "free" (freier Eintrag). */
export type FreeEntryContent = {
  title?: string;
  body: string;
};

/** `journal_entries.content` bei template_type "messy_moment" (Things Got Messy). */
export type MessyMomentContent = {
  messy_when: string;
  conflicting_rules: string;
  guilt_type: "healthy" | "unhealthy" | "unsure";
};

/** `journal_entries.content` bei template_type "overthinking" (Grübelspirale).
 *  Alt-Einträge können zusätzlich `what_it_would_mean`, `current_problem` und
 *  `new_problem` enthalten (nur noch lesend in formatOverthinking). */
export type OverthinkingContent = {
  problem: string;
  why_levels: string[];
  /** Die in Schritt 6 angezeigte KI-Frage; leer, wenn die KI nicht antwortete. */
  challenger_question: string;
  what_if_wrong: string;
  reframed_problem: string;
  decision: string;
};
