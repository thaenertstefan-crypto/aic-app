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

/** Element von `wants.wants` (JSONB-Array): ein bestätigtes Want. */
export type WantItem = {
  id: string;
  /** Beschreibung des Sterns („Es macht mir Spaß …“). */
  text: string;
  active: boolean;
  /** Sternname (2–3 Worte); null bei Bestandsdaten — Label fällt dann auf den gekürzten Text zurück. */
  title?: string | null;
  /** Tagtraum-Sterne stehen weiter weg; fehlend = "nah". */
  distance?: "nah" | "fern";
  /** Verlinkter bestätigter Wert (values-bank-id bzw. "custom:…"); null ohne Passung. */
  valueId?: string | null;
  /** Herkunft: KI-Hypothese oder selbst formuliert. */
  source?: "ai" | "own";
};

/** Element von `wants.bets` (JSONB-Array): ein Little-Bet-Experiment. */
export type BetItem = {
  id: string;
  text: string;
  /** Want, aus dem das Experiment abgeleitet ist; null bei freien Bets. */
  wantId?: string | null;
  status: "open" | "tried";
  /** Reflexions-Eintrag (template_type "little_bet"), sobald reflektiert. */
  journalEntryId?: string | null;
  /** Herkunft: KI-Vorschlag oder selbst angelegt. */
  source?: "ai" | "own";
};

/** `journal_entries.content` bei template_type "yin_yang" (Wants-Audit). */
export type YinYangContent = {
  /** „Wofür nimmst du Mühsal in Kauf?“ */
  yin: string;
  /** „Was bringt dich in Flow?“ */
  yang: string;
  /** Optional: kognitive Prinzipien hinter den Flow-Aktivitäten. */
  principles?: string;
  /** Optional: „Wovon tagträumst du?“ — Quelle der fernen Sterne. */
  tagtraum?: string;
  /** Von /api/wants-distiller nachgetragen: die KI-Hypothesen (Provenienz). */
  ai_wants?: { text: string; value_id: string | null }[];
};

/** `journal_entries.content` bei template_type "little_bet" (Bet-Reflexion). */
export type LittleBetContent = {
  /** Snapshot des Bet-Texts zum Reflexionszeitpunkt. */
  bet_text: string;
  /** Wie war das Erlebnis? Erwartungen erfüllt, Sicht verändert? */
  experience: string;
  liked?: string;
  disliked?: string;
  /** Leute & Vibe als 3-Wege-Einschätzung. */
  vibe?: "energized" | "neutral" | "drained";
  /** Hat der Bet deine Wants verändert oder bestätigt? */
  changed_wants?: string;
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

/** Blueprint-Check des Nein-Trainers: pro Schicht true = eingehalten. */
export type SayingNoChecklist = {
  /** Schicht 1: keine langen Rechtfertigungs-Ketten. */
  complete_sentence: boolean;
  /** Schicht 2: keine Entschuldigungen. */
  no_apology: boolean;
  /** Schicht 3: Wärme/Wertschätzung vorhanden. */
  warmth: boolean;
  /** Schicht 4: kein „aber" nach der Wärme. */
  no_but: boolean;
};

/** `journal_entries.content` bei template_type "saying_no" (Nein-Trainer).
 *  Die KI-Felder trägt /api/saying-no-coach nach dem ersten Speichern nach
 *  (null, wenn die KI keinen validen Wert lieferte). */
export type SayingNoContent = {
  mode: "real" | "practice";
  /** real: die echte Anfrage; practice: das angezeigte Szenario. */
  situation: string;
  /** Nur practice: kam das Szenario von der KI oder aus dem statischen Pool? */
  scenario_source?: "ai" | "static";
  /** Nur real: Antwort auf die Hell-yes-Frage (false = es ist ein Nein). */
  hell_yes?: boolean;
  /** Erster Entwurf des Neins. */
  draft: string;
  /** Zweitversuch nach dem KI-Feedback (max. ein Re-Submit). */
  draft2?: string;
  ai_checklist?: SayingNoChecklist | null;
  /** Verbesserte Version der KI. */
  ai_improved?: string | null;
  /** Das final gewählte Nein. */
  final_no?: string;
  /** Woher final_no stammt: eigener Entwurf, KI-Version oder editierte KI-Version. */
  final_source?: "own" | "ai" | "edited";
};

/** `journal_entries.content` bei template_type "shadow" (Schattenseite).
 *  Privatsphäre-Garantie: Diese Einträge werden NIE an die KI geschickt —
 *  keine KI-Route liest template_type "shadow", und `private: true` schaltet
 *  zusätzlich die Text-Vorschau in der Journal-Liste ab (extractPreview). */
export type ShadowContent = {
  body: string;
  /** Immer true — Marker für Vorschau-Unterdrückung + KI-Ausschluss. */
  private: true;
  /** Woher der Eintrag stammt: Schreibfläche oder Notiz nach dem Rage Walk. */
  mode?: "journal" | "walk";
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
