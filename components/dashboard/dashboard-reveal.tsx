"use client";

import { Children, useEffect, useState, type ReactNode } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/** sessionStorage-Schlüssel, gesetzt direkt vor dem Login/Signup-Redirect. */
export const POST_LOGIN_KEY = "aic:post-login";
/** Flag nur honorieren, wenn es jünger als das ist (vermeidet Spuk-Animation). */
const MAX_AGE_MS = 10_000;
/** Abstand zwischen den einzelnen Abschnitten beim Einblenden. */
const STAGGER_MS = 500;

type DashboardRevealProps = {
  children: ReactNode;
};

/**
 * Blendet die einzelnen Dashboard-Abschnitte direkt nach dem Login von oben
 * nach unten nacheinander ein (~0,5 s Abstand). Gegatet über ein kurzlebiges
 * sessionStorage-Flag, damit nur der erste Aufruf nach dem Login animiert —
 * normale Navigation zeigt das Dashboard sofort komplett.
 *
 * Die Entscheidung fällt im Lazy-Initializer (Client-Mount nach dem Login ist
 * eine Client-Navigation, kein Hydration-Schritt) → kein Aufblitzen.
 */
export function DashboardReveal({ children }: DashboardRevealProps) {
  const reduced = useReducedMotion();
  const [stagger] = useState(() => {
    if (typeof window === "undefined") return false;
    const raw = sessionStorage.getItem(POST_LOGIN_KEY);
    const ts = raw ? Number(raw) : NaN;
    return Number.isFinite(ts) && Date.now() - ts < MAX_AGE_MS;
  });

  // Flag einmalig verbrauchen, damit es bei der nächsten Navigation nicht erneut greift.
  useEffect(() => {
    if (stagger) sessionStorage.removeItem(POST_LOGIN_KEY);
  }, [stagger]);

  if (!stagger || reduced) {
    return <>{children}</>;
  }

  return Children.map(children, (child, i) => (
    <div
      className="animate-in fade-in slide-in-from-top-3"
      style={{
        animationDelay: `${i * STAGGER_MS}ms`,
        animationDuration: `${STAGGER_MS}ms`,
        animationFillMode: "both",
      }}
    >
      {child}
    </div>
  ));
}
