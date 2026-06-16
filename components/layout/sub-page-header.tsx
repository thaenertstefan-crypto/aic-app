import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface SubPageHeaderProps {
  backHref: string;
  title: string;
  subtitle?: string;
}

export function SubPageHeader({ backHref, title, subtitle }: SubPageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
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
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
