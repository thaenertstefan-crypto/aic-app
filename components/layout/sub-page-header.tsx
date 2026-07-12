import { ViewTransition } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface SubPageHeaderProps {
  backHref: string;
  title: string;
  subtitle?: string;
  /** Optionaler rechtsbündiger Slot, z.B. ein Info-Icon. */
  action?: React.ReactNode;
  /** View-Transition-Typen für die Zurück-Navigation (z.B. ["forge-up"]). */
  backTransitionTypes?: string[];
}

export function SubPageHeader({
  backHref,
  title,
  subtitle,
  action,
  backTransitionTypes,
}: SubPageHeaderProps) {
  return (
    // Header animiert nur beim Sternschmiede-Übergang: alter Header slidet mit
    // dem Inhalt hoch/runter raus, neuer Header fadet ein. Alle anderen
    // Navigationen: default "none" → keine Animation.
    <ViewTransition
      enter={{ "forge-down": "forge-header-in", "forge-up": "forge-header-in", default: "none" }}
      exit={{ "forge-down": "forge-out-up", "forge-up": "forge-out-down", default: "none" }}
      default="none"
    >
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          marginTop: "calc(env(safe-area-inset-top, 0px) * -1)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <Link
            href={backHref}
            aria-label="Zurück"
            transitionTypes={backTransitionTypes}
            className="-ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-lg font-semibold text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </header>
    </ViewTransition>
  );
}
