/**
 * Validierung der Antwort von /api/wants-distiller.
 *
 * Der Grund für diese Datei ist `parseQuotes`. Seit KAN-45 soll die Auswertung
 * dem Aufwand gerecht werden, und der Hebel dafür ist **Wiedererkennung**: man
 * liest unter jedem nahen Stern die eigenen Worte wieder, aus denen er
 * destilliert wurde. Das Modell liefert diese Worte aber NICHT — es liefert
 * nur Zeiger darauf (Frage + Nummer des Antwortfelds), und der Wortlaut wird
 * hier gegen die gespeicherten Antwortfelder aufgelöst.
 *
 * Das ist dieselbe Bauart wie ADR-0005 beim fernen Stern und dieselbe, die
 * KAN-36 für die Momente am Stern festgeschrieben hat: **der Wortlaut läuft
 * nie durch das Modell.** Ein Prompt ist eine Bitte, keine Garantie — ein
 * wörtliches Zitat, das das Modell abtippt, ist eine Paraphrase, sobald es
 * einen Tippfehler glattzieht. Ein aufgelöster Zeiger ist der Wortlaut. Und
 * ein Zeiger daneben verliert nichts: dann steht dort das leicht falsche
 * Antwortfeld, statt dass die Person sich in einer Erfindung wiedererkennen
 * soll.
 *
 * Bewusst ohne `@/`-Imports: Kappen und Antwortfelder kommen als Parameter
 * herein. So bleibt die Datei mit purem Node prüfbar.
 */

import { getValueLabel } from "../utils/values-bank.ts";
import { readModelJson, readText } from "./model-json.ts";

/** Die zwei Fragen, deren Antwortfelder einen nahen Stern füttern können.
 *  Die Tagtraum-Frage fehlt mit Absicht: aus ihr entsteht der ferne Stern,
 *  und der IST schon der Wortlaut (ADR-0005) — ein Zitat darunter wäre eine
 *  Kopie des Sterns unter dem Stern. */
export type QuoteField = "yin" | "yang";

/** Die Antwortfelder, gegen die Zeiger aufgelöst werden — in derselben
 *  Reihenfolge, in der sie im Prompt nummeriert standen. */
export type AnswerSource = Record<QuoteField, string[]>;

/** Ein destillierter Stern (value gegen die DB-Werte aufgelöst). Immer nah:
 *  ferne Sterne baut der Client aus den Antwortfeldern selbst (ADR-0005),
 *  das Modell kann gar keinen mehr liefern. */
export type WantSuggestion = {
  text: string;
  title: string | null;
  /** Der konkrete Anker — eigenes Feld, nicht „— z. B. …“ im Satz. */
  example: string | null;
  valueId: string | null;
  valueLabel: string | null;
  /** Seit KAN-45 ein kleiner Absatz, nicht mehr ein Satz. */
  reason: string | null;
  question: string | null;
  /** Die Antwortfelder, aus denen dieser Stern destilliert ist — wörtlich,
   *  aus den Zeigern des Modells aufgelöst. Leer ist ein gültiger Fall. */
  quotes: string[];
};

export type DistillerResult = {
  comment: string;
  wants: WantSuggestion[];
  /** Ein Name je fernem Stern, in der Reihenfolge der Antwortfelder. */
  farTitles: (string | null)[];
};

/** Ein Titel ist eine Überschrift, kein Satz. */
export const MAX_TITLE_LEN = 60;

/** Ein Absatz, keine Abhandlung: 2–4 Sätze passen darunter, eine Seite nicht.
 *  Der Deckel ist die Zusage aus der Abnahme von KAN-45 — ein Absatz pro
 *  Stern darf die Sterne-Bühne nicht sprengen. Der Prompt nennt bewusst KEINE
 *  Zeichenzahl daneben: zwei Zahlen für eine Regel driften auseinander, und
 *  die kleinere von beiden schneidet dann mitten im Satz. */
export const MAX_REASON_LEN = 600;

/** Mehr Belege als so trägt ein aufgeklappter Stern nicht, ohne dass der Satz
 *  darüber untergeht. Wer mehr Spuren hat, bekommt mehr Sterne — das ist der
 *  andere Hebel desselben Tickets, nicht ein längerer Beleg-Stapel. */
export const MAX_QUOTES_PER_WANT = 3;

/**
 * Wie viele nahe Sterne höchstens eingelesen werden.
 *
 * Das ist ein **Schutz vor einer entgleisten Antwort, keine Regel über
 * Sterne** — ein naher Stern ist destilliert, er hängt nicht an einem
 * Antwortfeld, also gibt es keine Boxen-Rechnung, aus der sich die Zahl
 * herleiten ließe. Sie steht deshalb weit über allem, was ein Audit hergibt.
 *
 * Und sie steht **im Prompt** (der interpoliert sie von hier): eine stille
 * Kappung hinter dem Rücken des Modells ist genau der Fehler, den KAN-45
 * abgeschafft hat — vorher fielen bei 9 die hinteren Sterne lautlos weg.
 */
export const MAX_WANTS_OUT = 12;

/** Die Feldreihenfolge, die der System-Prompt vorschreibt. */
const FIELD_ORDER = ["comment", "wants", "titles"] as const;

/** Was `parseDistillerOutput` braucht, um die Antwort des Modells gegen die
 *  Wirklichkeit der Person zu prüfen. */
export type DistillerOptions = {
  /** Die bestätigten Werte — eine id außerhalb davon wird zu null. */
  valueIds: Set<string>;
  /** Die Antwortfelder, gegen die die Zitat-Zeiger aufgelöst werden. Leer
   *  heißt: es gibt keine Feldgrenzen (Alt-Eintrag), also keine Belege. */
  answers: AnswerSource;
  /** Wie viele ferne Sterne der Client gebaut hat — so viele Namen kommen
   *  zurück, positionsgebunden. */
  farCount: number;
  maxTextLen: number;
};

function isQuoteField(value: unknown): value is QuoteField {
  return value === "yin" || value === "yang";
}

/**
 * Zeiger auf Antwortfelder in den Wortlaut auflösen.
 *
 * `nr` ist 1-basiert, weil es im Prompt als `nr`-Attribut so dasteht. Alles,
 * was nicht auf ein ausgefülltes Feld zeigt, fällt weg statt zu werfen: ein
 * halluzinierter Zeiger kostet ein Zitat, nie den Stern. Dubletten fallen
 * ebenfalls weg — dasselbe Feld zweimal unter einem Stern liest sich wie ein
 * Fehler, nicht wie zwei Belege.
 */
export function parseQuotes(raw: unknown, answers: AnswerSource): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (out.length >= MAX_QUOTES_PER_WANT) break;
    if (!item || typeof item !== "object") continue;
    const { frage, nr } = item as Record<string, unknown>;
    if (!isQuoteField(frage)) continue;
    if (typeof nr !== "number" || !Number.isInteger(nr)) continue;

    const text = answers[frage][nr - 1]?.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }

  return out;
}

/** Validiert die wants-Liste des Modells; value_ids werden IMMER gegen die
 *  bestätigten Werte der Person aufgelöst — unbekannte ids werden zu null. */
function parseWants(
  raw: unknown,
  options: DistillerOptions,
): WantSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const wants: WantSuggestion[] = [];

  for (const item of raw.slice(0, MAX_WANTS_OUT)) {
    if (!item || typeof item !== "object") continue;
    const fields = item as Record<string, unknown>;
    const text = readText(fields, "text", options.maxTextLen);
    if (!text) continue;

    const rawValueId = readText(fields, "value_id");
    const valueId =
      rawValueId && options.valueIds.has(rawValueId) ? rawValueId : null;

    wants.push({
      text,
      title: readText(fields, "title", MAX_TITLE_LEN),
      example: readText(fields, "example", options.maxTextLen),
      valueId,
      valueLabel: valueId ? getValueLabel(valueId) : null,
      reason: readText(fields, "reason", MAX_REASON_LEN),
      question: readText(fields, "question", options.maxTextLen),
      quotes: parseQuotes(fields.quotes, options.answers),
    });
  }

  return wants;
}

/**
 * Die Namen für die fernen Sterne — positionsgebunden.
 *
 * `count` ist die Zahl der fernen Sterne, die der Client gebaut hat. Liefert
 * das Modell weniger (oder Unsinn an einer Stelle), bleibt dort `null`: der
 * Stern steht trotzdem, ihm fehlt nur der Name.
 */
export function parseTitles(raw: unknown, count: number): (string | null)[] {
  const list: unknown[] = Array.isArray(raw) ? raw : [];
  return Array.from({ length: count }, (_, i) => {
    const value = list[i];
    if (typeof value !== "string") return null;
    const title = value.trim().slice(0, MAX_TITLE_LEN);
    return title || null;
  });
}

/**
 * Parse the model output. Die Wants-Liste ist per Anker nicht rettbar — bei
 * kaputtem JSON degradiert die Antwort deshalb gestuft auf comment-only, und
 * die UI wechselt in den manuellen Modus. Erst wenn auch der Kommentar fehlt,
 * ist es ein Ausfall (`null` → 502).
 *
 * Umgekehrt gilt seit der Vereinheitlichung: Wants OHNE Kommentar sind ein
 * gültiges Ergebnis (vorher 502). Die Sterne sind die Nutzlast dieser Übung —
 * sie wegzuwerfen, weil das Rahmen-Sätzchen fehlt, wäre der teurere Fehler.
 * Gleiche Regel wie in `sternschmiede-result.ts`.
 */
export function parseDistillerOutput(
  raw: string,
  options: DistillerOptions,
): DistillerResult | null {
  const output = readModelJson(raw, { fieldOrder: FIELD_ORDER });
  if (!output) return null;

  const comment = readText(output.fields, "comment");
  const isJson = output.source === "json";
  const wants = isJson ? parseWants(output.fields.wants, options) : [];
  const farTitles = parseTitles(
    isJson ? output.fields.titles : null,
    options.farCount,
  );

  if (!comment && wants.length === 0) return null;
  return { comment: comment ?? "", wants, farTitles };
}
