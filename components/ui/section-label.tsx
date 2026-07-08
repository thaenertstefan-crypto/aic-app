import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A quiet section/field label set in the serif voice (Fraunces).
 *
 * Replaces the tracked-uppercase "eyebrow" pattern: no `uppercase`, no wide
 * tracking, full-opacity muted so it clears WCAG AA on the plum surfaces.
 * These labels ("Der Gedanke", "Dein Little Bet", …) are voice, not chrome —
 * the serif is where the app is warm (see DESIGN.md, Serif-Is-Voice Rule).
 */
export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p
      className={cn(
        "font-heading text-sm font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
