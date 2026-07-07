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

/** `journal_entries.content` bei template_type "bill_of_rights" (Vorschlag
 *  generieren). Neue Einträge (Regel-Duell ab Juli 2026): `prompt1` (Situation)
 *  + `old_rule` (KI-benannte alte Regel). Alt-Einträge können stattdessen
 *  `prompt2`/`prompt3` aus früheren Formular-Versionen tragen (nur noch lesend
 *  in formatBillOfRights). */
export type BillOfRightsContent = {
  prompt1?: string;
  /** Neue Einträge: einfühlsame KI-Einschätzung der Situation. */
  ai_analysis?: string;
  /** Neue Einträge: die alte Regel, gegen die das Recht formuliert wurde. */
  old_rule?: string;
  /** Nur Alt-Einträge. */
  prompt2?: string;
  /** Nur Alt-Einträge: „Wie hättest du idealerweise gehandelt?". */
  prompt3?: string;
};

/** `journal_entries.content` bei template_type "free" (freier Eintrag). */
export type FreeEntryContent = {
  title?: string;
  body: string;
};

/** `journal_entries.content` bei template_type "messy_moment" (Things Got Messy).
 *  Alt-Einträge (Formular-Version bis Juli 2026) haben `guilt_type` (+ ggf.
 *  `conflicting_rules`) vom User selbst; neue Einträge stattdessen die
 *  KI-Felder (von /api/messy-guilt-coach nachgetragen) + das User-Feedback.
 *  Diskriminator alt/neu: Präsenz von `guilt_type`. */
export type MessyMomentContent = {
  messy_when: string;
  /** Nur Alt-Einträge: vom User benannte Regeln im Konflikt. */
  conflicting_rules?: string;
  /** Nur Alt-Einträge: Selbst-Einordnung des Users. */
  guilt_type?: "healthy" | "unhealthy" | "unsure";
  /** Neue Einträge: KI-Vermutung; null, wenn die KI keinen validen Wert lieferte. */
  ai_guilt_guess?: "healthy" | "unhealthy" | null;
  /** Neue Einträge: KI-Benennung der zwei Regeln im Konflikt (ein Satz). */
  ai_rules_conflict?: string | null;
  /** Neue Einträge: Antwort auf „Fühlt sich das stimmig an?". */
  guilt_feedback?: "agree" | "disagree" | null;
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
