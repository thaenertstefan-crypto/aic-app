"use client";

import type { ReactNode } from "react";

import { Mascot } from "@/components/brand/mascot";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { FocusSky } from "@/app/(app)/me/wants/focus-sky";

/**
 * Persistente Bühne der Sternensuche: der Nachthimmel und das Eck-Maskottchen
 * bleiben über alle Schritte stehen (kein Re-Mount), nur der Vordergrund
 * (children) wechselt. Der Schrittwechsel spielt eine leise Enter-Animation
 * (fade + rise), key-getrieben über `stepKey`. Reduced motion: kein Enter.
 */
export function JourneyStage({
  backHref,
  title,
  subtitle,
  headerAction,
  mascot,
  stepKey,
  children,
}: {
  backHref: string;
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  mascot?: { expression: React.ComponentProps<typeof Mascot>["expression"]; gazeX?: number; gazeY?: number } | null;
  stepKey: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-lvh flex-col overflow-hidden">
      {/* Persistenter Himmel — bleibt über alle Schritte stehen. */}
      <FocusSky />

      <div className="relative z-10 flex flex-1 flex-col">
        <SubPageHeader backHref={backHref} title={title} subtitle={subtitle} action={headerAction} />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-24 pt-6">
          {/* Nur der Vordergrund animiert beim Schrittwechsel. */}
          <div
            key={stepKey}
            className="flex flex-1 flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
          >
            {children}
          </div>
        </div>
      </div>

      {/* Persistentes Eck-Maskottchen — schaut der Szene zu, re-mountet nicht. */}
      {mascot && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-0">
          <Mascot size="sm" expression={mascot.expression} gazeX={mascot.gazeX} gazeY={mascot.gazeY} />
        </div>
      )}
    </div>
  );
}
