"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { SectionLabel } from "@/components/ui/section-label";
import { getJournalEntryDetail } from "@/app/(app)/journal/actions";
import {
  getJournalConfig,
  getContentSections,
  formatDateDE,
  type JournalListItem,
} from "@/lib/utils/journal";

type Props = {
  entry: JournalListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Detail = {
  content: Record<string, unknown>;
  ai_insights: string | null;
};

export function JournalDetailDialog({ entry, open, onOpenChange }: Props) {
  // Voll-Inhalt (content + ai_insights) wird erst beim Öffnen pro Eintrag
  // nachgeladen — die Liste trägt nur die schlanke Vorschau.
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entry || !open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Detail beim Schließen verwerfen, damit beim nächsten Öffnen kein fremder Eintrag aufblitzt
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    getJournalEntryDetail(entry.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entry, open]);

  // Guard: the dialog is always mounted by the parent, but `entry` is null
  // until the user selects one. Bail out before touching entry.* fields.
  if (!entry) return null;

  const config = getJournalConfig(entry.template_type);
  const Icon = config.icon;
  const sections = detail
    ? getContentSections(entry.template_type, detail.content)
    : [];

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

        {loading ? (
          <p className="text-sm italic text-muted-foreground">Lädt …</p>
        ) : (
          <>
            {/* Content sections */}
            <div className="space-y-4">
              {sections.length > 0 ? (
                sections.map((section, i) => (
                  <div key={i}>
                    <SectionLabel className="mb-1">{section.label}</SectionLabel>
                    {section.value ? (
                      <p className="whitespace-pre-wrap text-base leading-relaxed">
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
            {detail?.ai_insights && (
              <>
                <Separator />
                <div className="rounded-lg bg-primary/5 p-3">
                  <SectionLabel className="mb-1">KI-Einsicht</SectionLabel>
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
                    {detail.ai_insights}
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
