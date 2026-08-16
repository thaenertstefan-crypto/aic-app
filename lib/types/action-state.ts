/**
 * Altbestand. Für neue Actions gilt `ActionResult<T>` aus `lib/actions/` — es
 * trägt die Invariante, die hier fehlt: `{ error: null, success: false }` ist
 * mit diesem Typ darstellbar, obwohl es den Zustand nie gab. Die fünf
 * bestehenden Nutzer migrieren eigene Tickets; bis dahin bleibt dieser Typ.
 *
 * Gemeinsamer Rückgabe-/State-Typ für Server-Actions, die mit `useActionState`
 * verwendet werden.
 *
 * `success` ist optional: Actions, die nur einen Fehler-/Erfolgsstatus brauchen,
 * geben `{ error }` zurück; Actions mit explizitem Erfolgsübergang im Client
 * (z. B. Phasenwechsel) setzen zusätzlich `success`.
 */
export type ActionState = {
  error: string | null;
  success?: boolean;
};
