import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface SubPageHeaderProps {
  backHref: string;
  title: string;
  subtitle?: string;
  /** Optionaler rechtsbündiger Slot, z.B. ein Info-Icon. */
  action?: React.ReactNode;
}

export function SubPageHeader({
  backHref,
  title,
  subtitle,
  action,
}: SubPageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-xl"
      // Bridge the safe-area top inset: the negative margin cancels the layout's
      // safe-area padding so the glass bar fills up to the very top edge (under
      // the notch, ambient blobs showing through), while the matching padding
      // keeps the back arrow + title below the status bar.
      style={{
        marginTop: "calc(env(safe-area-inset-top, 0px) * -1)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
        <Link
          href={backHref}
          aria-label="Zurück"
          className="-ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading text-base font-semibold text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
