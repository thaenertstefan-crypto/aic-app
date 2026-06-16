"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { DraftRestoreBanner } from "@/components/offline/draft-restore-banner";
import { useFormDraft } from "@/lib/hooks/use-form-draft";
import { getValueLabel } from "@/lib/utils/values-bank";

import {
  saveJournalEntryAction,
  type JournalActionState,
  type JournalPageData,
} from "../actions";

type JournalDraft = { happenings: string; response: string };

// ─── Date helpers ───────────────────────────────────────────────────

function getTodayKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getDateRange(startKey: string): string[] {
  const start = getDateFromKey(startKey);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  });
}

function getWeekdayShort(key: string): string {
  const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  return weekdays[getDateFromKey(key).getDay()];
}

function formatDateDE(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}.${m}.${y}`;
}

// ─── Microcopy ──────────────────────────────────────────────────────

const ENCOURAGEMENTS = [
  "Kurz und ehrlich – das reicht.",
  "Nur ein paar Sätze. Du schaffst das.",
  "Kein Roman nötig – deine Gedanken zählen.",
  "Dranbleiben. Heute ist wieder ein Tag.",
  "Schon wieder ein Tag – leg los.",
  "Reflektieren, nicht perfektionieren.",
  "Dein Ich von heute wird es dir später danken.",
];

function randomEncouragement(): string {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}

// ─── Props ──────────────────────────────────────────────────────────

interface JournalFormProps {
  initialData: JournalPageData;
}

// ─── Component ──────────────────────────────────────────────────────

export function JournalForm({ initialData }: JournalFormProps) {
  const { hypothesis, entries, startedAt, currentStep } = initialData;
  const todayKey = getTodayKey();

  // Build entry lookup by date
  const entryByDate = new Map<string, { id: string; happenings: string; response: string }>();
  for (const e of entries) {
    const content = e.content as { happenings?: string; response?: string } | null;
    entryByDate.set(e.entry_date, {
      id: e.id,
      happenings: content?.happenings ?? "",
      response: content?.response ?? "",
    });
  }

  // Determine 7-day range
  const startKey = startedAt ? startedAt.slice(0, 10) : todayKey;
  const dayKeys = getDateRange(startKey);
  const entryCount = entries.length;
  const isComplete = entryCount >= 7 && currentStep >= 3;

  // Today's entry
  const todayEntry = entryByDate.get(todayKey) ?? null;
  const [isEditing, setIsEditing] = useState(false);
  const [encouragement] = useState(randomEncouragement);

  // Reset editing state when today's entry changes (after revalidate)
  useEffect(() => {
    if (!todayEntry) {
      setIsEditing(false);
    }
  }, [todayEntry]);

  // Offline draft safety net
  const { pendingDraft, saveDraft, clearDraft, dismissPendingDraft } =
    useFormDraft<JournalDraft>("values-journal");
  // Values pulled from a restored draft. Applied via `defaultValue`, so the
  // form is remounted with `formKey` whenever a draft is restored.
  const [restoredDraft, setRestoredDraft] = useState<JournalDraft | null>(null);
  const [formKey, setFormKey] = useState(0);

  const handleRestoreDraft = () => {
    if (pendingDraft) {
      setRestoredDraft(pendingDraft);
      setFormKey((k) => k + 1);
      // If a saved entry is showing read-only, switch to the editable form.
      if (todayEntry) setIsEditing(true);
    }
    dismissPendingDraft();
  };

  // Form action — wraps the server action to fall back to a local draft when
  // the request can't reach the server (offline or network error).
  const [state, formAction, pending] = useActionState(
    async (prev: JournalActionState, formData: FormData) => {
      const draft: JournalDraft = {
        happenings: (formData.get("happenings") as string) ?? "",
        response: (formData.get("response") as string) ?? "",
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        saveDraft(draft);
        return {
          error:
            "Du bist offline – dein Eintrag wurde als Entwurf gesichert und wartet, bis du wieder Verbindung hast.",
        };
      }

      try {
        const result = await saveJournalEntryAction(prev, formData);
        if (!result.error) clearDraft();
        return result;
      } catch {
        saveDraft(draft);
        return {
          error:
            "Speichern fehlgeschlagen – dein Eintrag wurde als Entwurf gesichert. Versuch es später noch einmal.",
        };
      }
    },
    { error: null },
  );

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      {/* Header */}
      <header className="mb-6">
        <p className="max-w-prose text-base text-muted-foreground">
          {isComplete
            ? "Du hast alle 7 Tage ausgefüllt!"
            : "Halt deine Gedanken fest – ganz ohne Druck."}
        </p>
      </header>

      {/* Values hypothesis reminder */}
      {hypothesis && hypothesis.length > 0 && (
        <Card size="sm" className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-1.5 pt-[--card-spacing]">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Deine Werte:
            </span>
            {hypothesis.map((v) => (
              <span
                key={v}
                className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
              >
                {getValueLabel(v)}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 7-day progress tracker */}
      <div className="mb-8" role="group" aria-label="7-Tage-Fortschritt">
        <p className="mb-3 text-sm font-medium text-foreground">
          Tag {Math.min(entryCount + 1, 7)} von 7
        </p>
        <div className="flex items-center justify-between gap-1">
          {dayKeys.map((key, i) => {
            const hasEntry = entryByDate.has(key);
            const isActive = key === todayKey && !hasEntry && !isComplete;
            const isToday = key === todayKey;

            return (
              <div key={key} className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200
                    ${
                      hasEntry
                        ? "bg-amber-400 text-amber-900 shadow-sm dark:bg-amber-500 dark:text-amber-950"
                        : isActive
                          ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-background bg-muted text-muted-foreground"
                          : "bg-muted text-muted-foreground"
                    }
                    ${isToday && !hasEntry ? "animate-pulse" : ""}
                  `}
                  aria-label={`Tag ${i + 1}${hasEntry ? " – erledigt" : isActive ? " – heute" : ""}`}
                >
                  {i + 1}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {getWeekdayShort(key)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Draft restore prompt */}
      {pendingDraft && (
        <div className="mb-6">
          <DraftRestoreBanner onRestore={handleRestoreDraft} onDiscard={clearDraft} />
        </div>
      )}

      {/* Error banner */}
      <FormError message={state.error} className="mb-6" />

      {/* Completion state */}
      {isComplete ? (
        <div className="mt-4 space-y-6">
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="space-y-3 pt-(--card-spacing)">
              <p className="text-center text-lg font-semibold text-amber-800 dark:text-amber-200">
                🎉 7 Tage voll!
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Du hast eine ganze Woche lang deine Gedanken und Gefühle festgehalten.
                Jetzt wird es spannend – schau dir an, welche Muster sich zeigen.
              </p>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" render={<Link href="/recipes/values/evaluation" />}>
            Zur Auswertung
          </Button>
        </div>
      ) : (
        <>
          {/* Journal entry form / read-only view */}
          <div className="space-y-4">
            {todayEntry && !isEditing ? (
              /* ── Read-only view ── */
              <Card>
                <CardContent className="space-y-4 pt-(--card-spacing)">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-base font-semibold">
                      Heute, {formatDateDE(todayKey)}
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      Bearbeiten
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Was ist heute passiert?
                    </Label>
                    <p className="whitespace-pre-wrap rounded-lg bg-muted/50 px-3 py-2 text-sm leading-relaxed">
                      {todayEntry.happenings || "—"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Welche Gedanken, Gefühle, Reaktionen kamen dabei auf?
                    </Label>
                    <p className="whitespace-pre-wrap rounded-lg bg-muted/50 px-3 py-2 text-sm leading-relaxed">
                      {todayEntry.response || "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* ── Form ── */
              <form key={formKey} action={formAction} className="space-y-5">
                <input type="hidden" name="entry_date" value={todayKey} />

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{encouragement}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="happenings" className="text-sm font-medium">
                    Was ist heute passiert?
                  </Label>
                  <Textarea
                    id="happenings"
                    name="happenings"
                    placeholder="z. B. ein Gespräch, eine Situation, ein Moment, der hängen geblieben ist …"
                    defaultValue={restoredDraft?.happenings ?? todayEntry?.happenings ?? ""}
                    rows={4}
                    required
                    disabled={pending}
                    className="min-h-[100px] resize-y"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response" className="text-sm font-medium">
                    Welche Gedanken, Gefühle, Reaktionen kamen dabei auf?
                  </Label>
                  <Textarea
                    id="response"
                    name="response"
                    placeholder="Hast du was gefühlt, das dich überrascht hat? War da Freude, Frust, Stolz, Verwirrung?"
                    defaultValue={restoredDraft?.response ?? todayEntry?.response ?? ""}
                    rows={4}
                    required
                    disabled={pending}
                    className="min-h-[100px] resize-y"
                  />
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  type="submit"
                  disabled={pending}
                >
                  {pending
                    ? "Wird gespeichert …"
                    : todayEntry
                      ? "Änderungen speichern"
                      : "Eintrag speichern"}
                </Button>

                {isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setIsEditing(false)}
                    disabled={pending}
                  >
                    Abbrechen
                  </Button>
                )}
              </form>
            )}
          </div>

          {/* Entry count progress note */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {entryCount < 7
              ? `Noch ${7 - entryCount} ${7 - entryCount === 1 ? "Eintrag" : "Einträge"} bis zur Auswertung`
              : ""}
          </p>
        </>
      )}
    </div>
  );
}