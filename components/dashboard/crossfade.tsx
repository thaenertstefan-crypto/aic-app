"use client";

import { useEffect, useState, type ReactNode } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/** Halbe Überblendung in ms — out + in ≈ 0,5 s gesamt (wie focus-question.tsx). */
const FADE_MS = 250;

/**
 * Blendet beliebige `children` beim Wechsel des `token` sanft über: aktuellen
 * Inhalt ausblenden, tauschen, neuen Inhalt einblenden. Respektiert
 * `prefers-reduced-motion` (dann sofortiger Wechsel ohne Animation).
 *
 * Das Einblenden hängt bewusst am `shown.token`-Wechsel (Effect 2) und nicht am
 * Tausch-Effect (Effect 1), damit es nicht von dessen Cleanup abgebrochen wird.
 */
export function Crossfade({
  token,
  children,
  className,
}: {
  token: string;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<{ token: string; node: ReactNode }>({
    token,
    node: children,
  });
  const [visible, setVisible] = useState(true);

  // Effect 1 — auf token-Wechsel reagieren: aktuellen Inhalt ausblenden, dann tauschen.
  useEffect(() => {
    if (reduced || token === shown.token) return;

    const fadeOut = requestAnimationFrame(() => setVisible(false));
    const swap = setTimeout(() => setShown({ token, node: children }), FADE_MS);

    return () => {
      cancelAnimationFrame(fadeOut);
      clearTimeout(swap);
    };
  }, [token, children, reduced, shown.token]);

  // Effect 2 — neuen Inhalt einblenden, sobald getauscht wurde.
  useEffect(() => {
    if (reduced) return;

    const fadeIn = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(fadeIn);
  }, [shown.token, reduced]);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "transition-opacity",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      {shown.node}
    </div>
  );
}
