"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  getJournalConfig,
  getContentSections,
  formatDateDE,
  type JournalEntryRow,
} from "@/lib/utils/journal";

type Props = {
  entry: JournalEntryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function JournalDetailDialog({ entry, open, onOpenChange }: Props) {
  // Guard: the dialog is always mounted by the parent, but `entry` is null
  // until the user selects one. Bail out before touching entry.* fields.
  if (!entry) return null;

  const config = getJournalConfig(entry.template_type);
  const Icon = config.icon;
  const sections = getContentSections(entry.template_type, entry.content);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          {/* Icon + label row */}
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
              <Icon className="size-4 text-primary" />
            </div>
            <DialogTitle>{config.label}</DialogTitle>
          </div>

          {/* Date */}
          <p className="text-xs text-muted-foreground">
            {formatDateDE(entry.entry_date)}
          </p>
        </DialogHeader>

        <Separator />

        {/* Content sections */}
        <div className="space-y-4">
          {sections.length > 0 ? (
            sections.map((section, i) => (
              <div key={i}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {section.label}
                </p>
                {section.value ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {section.value}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">—</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm italic text-muted-foreground">
              Keine Inhalte vorhanden.
            </p>
          )}
        </div>

        {/* AI insights */}
        {entry.ai_insights && (
          <>
            <Separator />
            <div className="rounded-lg bg-primary/5 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                KI-Einsicht
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {entry.ai_insights}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}