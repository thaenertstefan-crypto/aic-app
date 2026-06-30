"use client";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Golden glühender Lade-Spinner. Zentrales Visual, das sowohl der globale
 * `NavigationSpinner` als auch andere Lade-Übergänge (z.B. Onboarding-Abschluss)
 * verwenden. Respektiert `prefers-reduced-motion` (pulsiert statt zu drehen).
 */
export function Spinner({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <span
      className={cn(
        "block size-10 rounded-full border-[3px] border-primary/25 border-t-primary",
        reduced ? "animate-pulse" : "animate-spin",
        className,
      )}
      style={{ filter: "drop-shadow(0 0 10px rgba(231,182,94,0.55))" }}
    />
  );
}

/**
 * Vollbild-Overlay mit zentriertem {@link Spinner} — für Übergänge, bei denen der
 * ganze Screen blockiert lädt (Navigation, Server-Action + Hard-Navigation).
 */
export function SpinnerOverlay({ label = "Lädt …" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
    >
      <Spinner />
    </div>
  );
}
