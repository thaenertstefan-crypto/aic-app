import { useEffect, useRef, type RefObject } from "react";

import { useScrollLock } from "./use-scroll-lock";

/**
 * Sicheres Superset der Focusables beider Wants-Dialoge:
 * - `input`/`textarea`/`select` für den Edit-Modus der Sternenkarte,
 * - `:not([tabindex="-1"])` schließt inerte Flächen aus (z. B. den als
 *   Screenreader-inert markierten Backdrop-Schließen-Button der Funken-Sky).
 */
const FOCUSABLE_SELECTOR =
  'a[href]:not([tabindex="-1"]),button:not([disabled]):not([tabindex="-1"]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Verhalten einer hand-gerollten, per Portal an `document.body` gehängten
 * Fokus-Ebene (Wants-Sternfokus, Sternschmiede-Funken) an EINER Stelle:
 *
 * 1. **Scroll-Lock** der Seite dahinter, solange `open`.
 * 2. **Fokus reinziehen** beim Öffnen — mit `preventScroll`, sonst scrollt
 *    `focus()` die Seite ans Dokumentende (Portal hängt am body-Ende; das war
 *    der 21.07.-„Aufplopp"-Bug).
 * 3. **Tab-Falle**: Fokus wandert nicht hinter das Overlay; Escape ruft
 *    `onEscape` (der Aufrufer entscheidet: schließen oder erst Edit verlassen).
 * 4. **Fokus zurück** auf den auslösenden Trigger beim Schließen — ebenfalls
 *    `preventScroll` (nicht zum evtl. weit unten liegenden Auslöser scrollen).
 *
 * Der Aufrufer besitzt weiterhin `dialogRef` (der gerenderte Portal-Container mit
 * `tabIndex={-1}`) und `triggerRef` (das auslösende Element, auf das der Fokus
 * zurückkehrt — beim Öffnen selbst setzen). `onEscape` darf sich frei je Render
 * ändern (per Ref festgehalten), ohne die Key-Listener neu zu abonnieren.
 */
export function useDialogFocus({
  open,
  dialogRef,
  triggerRef,
  onEscape,
}: {
  open: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  onEscape: () => void;
}): void {
  // Seite hinter dem Dialog scroll-sperren.
  useScrollLock(open);

  // onEscape stabil halten: der Key-Listener soll nicht bei jeder Render-Änderung
  // des Callbacks neu abonnieren (der Aufrufer gibt oft eine Inline-Closure rein).
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  // Fokus reinziehen (preventScroll!), Tab einsperren, Escape delegiert an onEscape.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const raf = requestAnimationFrame(() => dialog?.focus({ preventScroll: true }));

    function focusables(): HTMLElement[] {
      if (!dialog) return [];
      return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const els = focusables();
      if (els.length === 0) {
        e.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, dialogRef]);

  // Beim Schließen den Fokus auf den auslösenden Trigger zurück. Beim Erst-Mount
  // (open=false, triggerRef leer) ein No-Op; nach dem Schließen wird der Trigger
  // genullt, damit ein wiederholtes Rendern im Zu-Zustand nicht erneut fokussiert.
  useEffect(() => {
    if (open) return;
    const trigger = triggerRef.current;
    if (trigger && document.body.contains(trigger)) trigger.focus({ preventScroll: true });
    triggerRef.current = null;
  }, [open, triggerRef]);
}
