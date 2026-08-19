/**
 * Die Paarung `template_type → recipe_slug` für die Query-Achse — getrennt von
 * `JOURNAL_TEMPLATE_MAP` in `journal-chrome.ts`, die dieselbe Paarung für die
 * Anzeige trägt (Icon, Label) und für `free` bewusst `""` statt `null` führt,
 * weil ein Filter-Tab nie auf `""` matcht. `JOURNAL_TEMPLATE_MAP` liest ihren
 * `recipeSlug` aus dieser Datei, damit die Paarung selbst nur einmal steht.
 *
 * NICHT jede Stelle, die `journal_entries` filtert, soll `recipe_slug` setzen:
 * `saveJournalEntryAction` filtert das Tages-Gating bewusst nur über
 * `(user_id, entry_date, template_type)`, ohne Slug — das bleibt so.
 */
import type { TemplateType } from "./journal-content.ts";

export const RECIPE_SLUG_BY_TEMPLATE = {
  daily_value: "values",
  value_eval: "values",
  yin_yang: "wants",
  little_bet: "wants",
  bill_of_rights: "bill-of-rights",
  messy_moment: "things-got-messy",
  overthinking: "overthinking",
  saying_no: "saying-no",
  shadow: "shadow",
  free: null,
} as const satisfies Record<TemplateType, string | null>;

/**
 * Der `recipe_slug`-Filterwert zu einem `template_type` — `null` für `free`,
 * genau wie die Spalte es in der DB trägt.
 *
 * Generisch über den konkreten `template_type` statt `TemplateType => string |
 * null`: Supabase' `.eq()` akzeptiert kein `null` (dafür ist `.is()` da), und
 * jeder bekannte Aufruf außer `recipeSlugFor("free")` liefert ohnehin nie
 * `null`. Mit einem literalen Argument bleibt der Rückgabetyp literal — `tsc`
 * lehnt `.eq("recipe_slug", recipeSlugFor("free"))` deshalb zu Recht ab,
 * statt es durchzuwinken und zur Laufzeit auf `.is()` zu hoffen.
 */
export function recipeSlugFor<T extends TemplateType>(
  templateType: T,
): (typeof RECIPE_SLUG_BY_TEMPLATE)[T] {
  return RECIPE_SLUG_BY_TEMPLATE[templateType];
}
