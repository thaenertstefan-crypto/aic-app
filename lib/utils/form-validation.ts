/**
 * Tiny helpers for German native form-validation messages — no dependency.
 *
 * Native HTML5 validation (`required`, `type="email"`, `minLength`) already
 * blocks submit; these just make the browser bubble show a warm German message
 * instead of the browser-default text.
 *
 * Usage:
 *   <Input
 *     required
 *     onInvalid={invalidMessage("Bitte gib deine E-Mail-Adresse ein.")}
 *     onInput={clearValidity}
 *   />
 */

type InputEl = HTMLInputElement | HTMLTextAreaElement;

export function invalidMessage(message: string) {
  return (e: React.FormEvent<InputEl>) => {
    e.currentTarget.setCustomValidity(message);
  };
}

export function clearValidity(e: React.FormEvent<InputEl>) {
  e.currentTarget.setCustomValidity("");
}

/* ------------------------------------------------------------------ */
/*  Serverseitige Längen-Caps für Freitext-Felder                     */
/* ------------------------------------------------------------------ */

/** Kurzfelder: Namen, Rechte, Promise-Beschreibungen, Titel. */
export const TEXT_MAX_SHORT = 300;
/** Lange Felder: Journal-/Reflexionstexte. */
export const TEXT_MAX_LONG = 5000;

/**
 * Serverseitiger Längen-Check für Server Actions: gibt bei Überlänge eine
 * warme deutsche Fehlermeldung zurück, sonst null. Die Client-Formulare
 * begrenzen meist schon per maxLength — das hier ist die Absicherung dahinter.
 */
export function tooLong(value: string, max: number): string | null {
  return value.length > max
    ? `Dein Text ist etwas lang geraten (maximal ${max} Zeichen). Kürze ihn bitte ein wenig.`
    : null;
}
