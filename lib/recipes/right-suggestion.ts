/**
 * Der Rechts-Vorschlag, wie ihn der Client liest.
 *
 * Zwei Übungen laufen auf dieselbe Frage hinaus — „Nein sagen" und „Things got
 * messy": passt ein bestehendes Recht aus dem Bill of Rights, oder braucht es
 * ein neues? Serverseitig beantwortet das `lib/anthropic/right-match.ts`; hier
 * steht die Gegenseite, das Lesen der Antwort im Browser.
 *
 * Vorher stand in beiden Wizards dieselbe Zeile, die den Vorschlag ungeprüft
 * castete und nur `text` auf „nicht leer" ansah. Der Typ war dort zweimal
 * getrennt getippt. Beides steht jetzt einmal: die Form kommt als
 * `RightResult` aus dem Modul, das sie erzeugt, und `readRightSuggestion`
 * verengt darauf — es wirft nie, im Zweifel ist der Vorschlag `null`.
 */

import type { RightResult } from "../anthropic/right-match.ts";

/** Passendes bestehendes Recht, neuer Vorschlag oder nichts. Dieselbe Form,
 *  die die Route schickt — deshalb hier ein Alias und kein zweiter Typ. */
export type RightSuggestion = RightResult;

/** Verengt die Route-Antwort auf einen Vorschlag, den die Bühne zeigen kann. */
export function readRightSuggestion(value: unknown): RightSuggestion {
  if (!value || typeof value !== "object") return null;
  const raw = value as { type?: unknown; id?: unknown; text?: unknown };

  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (!text) return null;

  if (raw.type === "existing" && typeof raw.id === "string") {
    return { type: "existing", id: raw.id, text };
  }
  if (raw.type === "new") {
    return { type: "new", text };
  }
  return null;
}
