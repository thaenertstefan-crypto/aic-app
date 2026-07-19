"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { localDateKey } from "@/lib/utils/date";

const STORAGE_KEY = "aic_reminder_date";

function todayStr(): string {
  // Browser-lokaler Tag genügt: rein clientseitiges "einmal pro Tag".
  return localDateKey();
}

/** Ensure a right reads as a full affirmation sentence. */
function asAffirmation(text: string): string {
  return text.startsWith("Ich habe das Recht")
    ? text
    : `Ich habe das Recht, ${text}`;
}

/**
 * Tägliches Reminder-Overlay: zeigt einmal pro Tag (nach dem ersten
 * Dashboard-Besuch) ein zufälliges aktives Bill-of-Rights-Recht mit langsamem
 * Fade-in. Rendert nichts, wenn keine aktiven Rechte existieren oder heute schon
 * gezeigt wurde. Die Entscheidung fällt clientseitig (localStorage), daher
 * server-seitig zunächst `null`.
 */
export function DailyReminderScreen({ rights }: { rights: string[] }) {
  const reduced = useReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [right, setRight] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [showButton, setShowButton] = useState(false);

  // Schließt den Reminder; das native `close`-Event räumt den State auf (unten).
  const dismiss = () => dialogRef.current?.close();

  // Entscheiden, ob heute angezeigt wird (einmal beim Mount).
  useEffect(() => {
    if (rights.length === 0) return;

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage nicht verfügbar → Reminder einfach überspringen.
      return;
    }
    if (stored === todayStr()) return;

    // Direkt als "heute gezeigt" markieren, damit er bei einem Reload nicht
    // erneut aufpoppt (1×/Tag).
    try {
      localStorage.setItem(STORAGE_KEY, todayStr());
    } catch {
      // ignore
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Entscheidung hängt an localStorage und muss post-mount fallen (SSR kennt den "heute schon gezeigt?"-Stand nicht)
    setRight(rights[Math.floor(Math.random() * rights.length)]);
  }, [rights]);

  // Fade-in + Timer, sobald ein Recht gewählt wurde.
  useEffect(() => {
    if (!right) return;

    // Als echtes modales <dialog> öffnen → Fokus-Trap, Esc-to-close und
    // Top-Layer-Stacking übernimmt der Browser.
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();

    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reduced-Motion-Zweig: sofort sichtbar statt Fade-in, feuert einmal pro gewähltem Recht
      setVisible(true);
      setShowButton(true);
      return;
    }

    const raf = requestAnimationFrame(() => setVisible(true));
    const btnTimer = setTimeout(() => setShowButton(true), 2000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(btnTimer);
    };
  }, [right, reduced]);

  if (!right) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Heutiger Reminder"
      onClose={() => {
        setRight(null);
        setVisible(false);
        setShowButton(false);
      }}
      className="m-0 max-h-none max-w-none border-0 bg-transparent p-0 text-foreground backdrop:bg-background"
    >
      {/* Tap überall schließt (wie zuvor); Esc greift jetzt zusätzlich nativ. */}
      <div
        onClick={dismiss}
        className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-background px-6"
      >
        <p
          className="text-lg font-medium text-primary"
          style={{
            textShadow:
              "0 0 18px color-mix(in srgb, var(--primary) 55%, transparent)",
          }}
        >
          Heutiger Reminder
        </p>

        <p
          className={cn(
            "mx-auto max-w-sm text-center font-affirmation text-2xl leading-relaxed text-foreground",
            !reduced && "transition-opacity",
            visible ? "opacity-100" : "opacity-0",
          )}
          style={
            reduced
              ? undefined
              : {
                  transitionDuration: "3000ms",
                  transitionTimingFunction: "ease-in",
                }
          }
        >
          {asAffirmation(right)}
        </p>

        <Button
          aria-hidden={!showButton}
          tabIndex={showButton ? undefined : -1}
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className={cn(
            !reduced && "transition-opacity duration-500",
            showButton ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          Weiter
        </Button>

        {/* Leiser Ausweg-Hinweis: signalisiert von Anfang an, dass der ganze
            Screen antippbar ist — sonst wirkt die Sekunde bis zum „Weiter"-Button
            wie ein eingefrorener Ladezustand. Am unteren Rand, damit der zentrale
            Affirmations-Moment ungestört bleibt; aria-hidden, weil SR-Nutzer:innen
            Esc und den Button haben. */}
        <p
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-8 text-center text-sm text-muted-foreground",
            !reduced && "transition-opacity duration-500",
            visible ? "opacity-100" : "opacity-0",
          )}
        >
          Tippen, um fortzufahren
        </p>
      </div>
    </dialog>
  );
}
