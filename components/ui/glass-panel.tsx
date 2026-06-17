import * as React from "react";

import { AmbientBlobs } from "@/components/ui/ambient-blobs";
import { cn } from "@/lib/utils";

type GlassPanelProps = {
  /** Outer shell — override shadow/radius/padding for the hero surface. */
  className?: string;
  /** Content layer (sits above the blobs) — e.g. "space-y-3". */
  contentClassName?: string;
  children: React.ReactNode;
};

/**
 * Hero glass surface: a frosted `.glass-panel` with slowly drifting
 * `<AmbientBlobs />` behind the content.
 *
 * Use sparingly — 1–2 hero moments per screen (see Phase 7.5). backdrop-filter
 * plus blurred layers are not free on older mobile devices, so this is not meant
 * for every card.
 *
 * The blobs are absolutely positioned and clipped by the relative + overflow
 * container; the content rides on its own `relative z-10` layer so it paints
 * above them.
 */
export function GlassPanel({
  className,
  contentClassName,
  children,
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        "glass-panel relative overflow-hidden rounded-xl p-4 shadow-md shadow-primary/5",
        className,
      )}
    >
      <AmbientBlobs />
      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </div>
  );
}
