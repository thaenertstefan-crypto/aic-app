/**
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
