/**
 * Die Regeln, nach denen ein Stern oder ein Little Bet in die JSONB-Spalten
 * `wants.wants` / `wants.bets` kommt — als reines Modul, damit sie unter
 * `node --test` fallen.
 *
 * Der Grund für diese Datei ist `mergeItems`. Die Rechnung saß vorher zwischen
 * einem `select` und einem `update` in `actions.ts` eingeklemmt und war damit
 * unprüfbar, obwohl sie die folgenreichste Regel der Übung trägt: sie
 * entscheidet, ob ein parallel angelegter Stern erhalten bleibt oder still
 * verschwindet. Hier steht sie ohne Datenzugriff daneben; `mergeIntoColumn`
 * liest, ruft, schreibt.
 *
 * Die vier Schranken darüber (`isWantItem`, `isBetItem`, `parseItems`,
 * `parsePreviousIds`) waren schon rein, nur weder exportiert noch getestet.
 */

import type { BetItem, WantItem } from "../../types/db-json.ts";
import { TEXT_MAX_SHORT, tooLong } from "../../utils/form-validation.ts";

// Obergrenzen für die JSONB-Arrays: schützt vor manipulierten
// FormData-Payloads (beliebige Objekte / Riesen-Texte).
export const MAX_WANTS = 100;
export const MAX_BETS = 100;

/** Prüft ein einzelnes Element auf die WantItem-Shape (inkl. Text-Cap). */
export function isWantItem(value: unknown): value is WantItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.text === "string" &&
    tooLong(v.text, TEXT_MAX_SHORT) === null &&
    typeof v.active === "boolean" &&
    (v.title === undefined ||
      v.title === null ||
      (typeof v.title === "string" && tooLong(v.title, TEXT_MAX_SHORT) === null)) &&
    (v.distance === undefined || v.distance === "nah" || v.distance === "fern") &&
    (v.valueId === undefined || v.valueId === null || typeof v.valueId === "string") &&
    (v.source === undefined || v.source === "ai" || v.source === "own")
  );
}

/** Prüft ein einzelnes Element auf die BetItem-Shape (inkl. Text-Cap). */
export function isBetItem(value: unknown): value is BetItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.text === "string" &&
    tooLong(v.text, TEXT_MAX_SHORT) === null &&
    (v.status === "open" || v.status === "tried") &&
    (v.wantId === undefined || v.wantId === null || typeof v.wantId === "string") &&
    (v.journalEntryId === undefined ||
      v.journalEntryId === null ||
      typeof v.journalEntryId === "string") &&
    (v.source === undefined || v.source === "ai" || v.source === "own")
  );
}

/** FormData-Feld als JSON-Array parsen und elementweise validieren. */
export function parseItems<T>(
  raw: FormDataEntryValue | null,
  max: number,
  guard: (value: unknown) => value is T,
): T[] | null {
  if (typeof raw !== "string" || !raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length > max || !parsed.every(guard)) {
    return null;
  }
  return parsed;
}

/** Optionale Baseline-IDs (Löschungen vs. parallele Adds — s. mergeItems). */
export function parsePreviousIds(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Der Reload-vor-Write-Merge auf eine der beiden JSONB-Spalten.
 *
 * Die Frage, die hier beantwortet wird: Ein Element steht in der DB, aber nicht
 * im Eingehenden — hat der Nutzer es gelöscht, oder kennt dieser Client es
 * schlicht nicht? `previousIds` ist die Antwort. Es ist der Stand, den der
 * Client beim Laden gesehen hat:
 *
 * - in `previousIds` und jetzt nicht mehr dabei → **echte Löschung**, fällt weg;
 * - weder gekannt noch mitgeschickt → **parallel angelegt** (zweiter Tab,
 *   anderes Gerät), bleibt erhalten.
 *
 * Fehlt `previousIds` ganz, ist jedes DB-Element ein paralleler Add und nichts
 * wird gelöscht — die sichere Seite der Rechnung.
 *
 * Über Eindeutigkeit entscheidet der Merge nicht: doppelte IDs im Eingehenden
 * kommen durch, wie sie kamen.
 */
export function mergeItems<T extends { id: string }>(
  dbItems: T[],
  incoming: T[],
  previousIds: string[],
): T[] {
  const incomingIds = new Set(incoming.map((item) => item.id));
  const previousIdSet = new Set(previousIds);
  const concurrentAdds = dbItems.filter(
    (item) => !incomingIds.has(item.id) && !previousIdSet.has(item.id),
  );
  return [...incoming, ...concurrentAdds];
}
