/**
 * Die Schranke vor den fünf Werten des Kompasses — als reines Modul, damit sie
 * unter `node --test` fällt.
 *
 * Sie stand nahezu wortgleich zweimal in `actions.ts`: einmal in Schritt 1
 * (`saveHypothesisAction`), einmal in Schritt 3
 * (`saveAdjustedHypothesisAction`). „Nahezu" ist der Punkt — die beiden
 * Fassungen prüfen **unterschiedlich**, und genau das war die Stelle, an der
 * ein Entdoppler die Unterschiede versehentlich einebnet.
 *
 * `requireDistinct` macht die Wahl sichtbar, statt sie zu treffen: Schritt 1
 * prüft nur „genau fünf", Schritt 3 zusätzlich „fünf unterschiedliche". Ob die
 * Asymmetrie bleiben soll, ist eine eigene Entscheidung und ein eigenes
 * Ticket — hier wird sie nur benannt.
 *
 * Auch die **Meldung** bleibt beim Aufrufer. Das Modul sagt, was nicht stimmt;
 * wie das dem Nutzer gesagt wird, steht neben der Action, die es sagt.
 */

// Werte-Slugs/-Labels sind Kurzstrings; custom Werte sind erlaubt, daher wird
// nur Typ + Länge geprüft (nicht gegen die values-bank).
const MAX_VALUE_LEN = 100;

/** Obergrenze gegen manipulierte FormData-Payloads (vor der Anzahl-Prüfung). */
const MAX_VALUES = 20;

/** Der Kompass trägt genau fünf Werte. */
const COMPASS_SIZE = 5;

/** Was an einer Auswahl nicht stimmen kann. */
export type ValueSelectionProblem =
  /** Das Feld fehlt oder ist leer. */
  | "missing"
  /** Kein JSON, kein Array, oder ein Element passt nicht zur Shape. */
  | "malformed"
  /** Nicht die geforderten fünf (bei `requireDistinct` auch: nicht fünf verschiedene). */
  | "count";

/** Geprüfte Liste oder der Grund, warum es keine gibt. */
export type ValueSelection =
  | { problem: null; values: string[] }
  | { problem: ValueSelectionProblem; values: null };

/** Prüft, dass ein geparstes Werte-Array nur Kurzstrings enthält. */
function isValueList(values: unknown): values is string[] {
  return (
    Array.isArray(values) &&
    values.length <= MAX_VALUES &&
    values.every((v) => typeof v === "string" && v.length <= MAX_VALUE_LEN)
  );
}

/**
 * Das FormData-Feld der Werte-Auswahl parsen und prüfen.
 *
 * `requireDistinct` ist keine Härtungs-Option, sondern die eine Stelle, an der
 * die beiden Aufrufer sich unterscheiden — in Schritt 1 verhindert allein der
 * Client Duplikate, in Schritt 3 traut die Action ihm ausdrücklich nicht.
 */
export function readValueSelection(
  raw: FormDataEntryValue | null,
  { requireDistinct }: { requireDistinct: boolean },
): ValueSelection {
  if (typeof raw !== "string" || !raw) {
    return { problem: "missing", values: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { problem: "malformed", values: null };
  }

  if (!isValueList(parsed)) {
    return { problem: "malformed", values: null };
  }
  if (parsed.length !== COMPASS_SIZE) {
    return { problem: "count", values: null };
  }
  if (requireDistinct && new Set(parsed).size !== COMPASS_SIZE) {
    return { problem: "count", values: null };
  }

  return { problem: null, values: parsed };
}
