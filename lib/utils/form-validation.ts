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
