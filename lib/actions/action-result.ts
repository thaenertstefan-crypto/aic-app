import { dbError } from "../utils/db-error.ts";

/**
 * Die eine Ergebnisform für Server-Actions — und die eine Meldung für
 * „nicht angemeldet".
 *
 * Vorher trugen 49 Server-Actions 38 verschiedene Rückgabeformen: mal
 * `{ error }`, mal `{ error, success }`, mal `{ error, success, entryId }`,
 * dazu nacktes `null`, `false`, `[]` und `return;`. Dieses Modul ist die eine
 * Form.
 *
 * Bewusst getrennt von `with-user.ts`: hier steht nichts, was Supabase oder
 * `next/headers` braucht. Dadurch bleibt das Modul rein, ist von überall
 * importierbar — auch aus Client-Komponenten — und fällt unter die Testregel
 * aus CODING_STANDARDS.md statt daran vorbei.
 */

/**
 * Der Fehlerfall. Eigener Name, weil Helfer, die nur scheitern können
 * (`failed`, `dbFailed`), ihn als Rückgabetyp brauchen — er ist auf jedes
 * `ActionResult<T>` zuweisbar, egal was `T` ist.
 */
export type ActionFailure = { error: string; data: null };

/**
 * Die Ergebnisform aller Server-Actions. Sie trägt die Invariante:
 * **`error === null` genau dann, wenn die Action durchgelaufen ist.**
 *
 * Deshalb gibt es hier kein `success`-Feld. Das alte `ActionState` konnte
 * `{ error: null, success: false }` ausdrücken — einen Zustand, den es nie
 * gab, den aber jeder Aufrufer mitprüfen musste. `error` allein entscheidet.
 *
 * **Die Prüfung ist `result.error === null`, nicht `if (!result.error)`.**
 * Nur die erste verengt: `null` ist ein Unit-Typ und damit eine Diskriminante,
 * `string` ist es nicht — TypeScript kann `""` nicht ausschließen und lässt
 * `data` bei einer Truthiness-Prüfung als `T | null` stehen. Das heutige
 * Idiom der 41 Actions ist `if (error)`; beim Migrieren ist das die Stelle,
 * an der es sich ändert.
 */
export type ActionResult<T = null> = { error: null; data: T } | ActionFailure;

/**
 * Die eine Meldung für „nicht angemeldet".
 *
 * Alle betroffenen Seiten liegen hinter Auth — der Fall tritt praktisch nur bei
 * abgelaufener Sitzung ein. „Du musst angemeldet sein" las sich dort wie ein
 * Vorwurf für etwas, das der Nutzer nicht getan hat. Bewusste Copy-Änderung,
 * kein Nebeneffekt der Entdopplung.
 */
export const SESSION_EXPIRED = "Deine Sitzung ist abgelaufen — melde dich neu an.";

/** Erfolg ohne Nutzlast. */
export function ok(): ActionResult<null>;
/** Erfolg mit Nutzlast. */
export function ok<T>(data: T): ActionResult<T>;
export function ok(data: unknown = null): ActionResult<unknown> {
  return { error: null, data };
}

/** Misserfolg mit einer Meldung, die so beim Nutzer ankommt — also deutsch und warm. */
export function failed(message: string): ActionFailure {
  return { error: message, data: null };
}

/**
 * Misserfolg aus einem DB-/Supabase-Fehler: loggt den echten Fehler
 * serverseitig und gibt dem Client die generische Meldung. Rohe
 * `error.message`-Texte dürfen den Server nicht verlassen — sie tragen
 * Tabellen-, Spalten- und Constraint-Namen.
 */
export function dbFailed(error: unknown, context?: string): ActionFailure {
  return failed(dbError(error, context));
}
