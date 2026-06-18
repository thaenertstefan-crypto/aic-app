import { cn } from "@/lib/utils";
import {
  ReframeAnimation,
  type ReframePair,
} from "@/components/auth/reframe-animation";

const DEFAULT_HEADLINE = "Willkommen im Club, den niemand zugibt zu brauchen.";
const DEFAULT_SUBLINE =
  "Fast jeder kennt die Stimme im Kopf, die sagt „du bist nicht gut genug“. Hier lernst du, ihr nicht mehr zu glauben — mit kleinen Übungen, die wirklich etwas verändern.";

type BrandPanelProps = {
  headline?: string;
  subline?: string;
  pairs?: ReframePair[];
  className?: string;
};

/**
 * Emotionale Brand-Seite für die Auth-Seiten: selbstbewusste Headline, warme
 * Subline und das animierte Reframe als Hero-Element. Layout-unabhängig —
 * wird in Teil 2 ins Split-Layout gesetzt.
 */
export function BrandPanel({
  headline = DEFAULT_HEADLINE,
  subline = DEFAULT_SUBLINE,
  pairs,
  className,
}: BrandPanelProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-linear-to-br from-secondary via-accent/60 to-background",
        className,
      )}
    >
      {/* Weiche Blob-Form für etwas Tiefe — rein dekorativ. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 -z-10 size-64 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="flex flex-col gap-6 p-8 sm:p-10">
        <h1 className="font-heading text-4xl font-semibold leading-tight text-balance text-foreground md:text-5xl">
          {headline}
        </h1>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          {subline}
        </p>
        <ReframeAnimation pairs={pairs} className="mt-2" />
      </div>
    </div>
  );
}
