"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { FormError } from "@/components/ui/form-error";
import { SubPageHeader } from "@/components/layout/sub-page-header";

import {
  getMessyMoments,
  saveMessyMomentAction,
  type MessyMomentEntry,
} from "../actions";

// ─── Date helpers ───────────────────────────────────────────────────

function formatDateDE(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

function preview(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + " …";
}

function guiltLabel(value: string): string {
  switch (value) {
    case "healthy":
      return "gesund";
    case "unhealthy":
      return "ungesund";
    case "unsure":
      return "bin mir nicht sicher";
    default:
      return value;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function MessyPage() {
  const [entries, setEntries] = useState<MessyMomentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [messyWhen, setMessyWhen] = useState("");
  const [conflictingRules, setConflictingRules] = useState("");
  const [guiltType, setGuiltType] = useState<string>("");

  // ── Load entries on mount ────────────────────────────────────────

  const loadEntries = async () => {
    const result = await getMessyMoments();
    setEntries(result.entries);
    setLoading(false);
  };

  useEffect(() => {
    loadEntries();
  }, []);

  // ── Form action ──────────────────────────────────────────────────

  const [state, formAction, pending] = useActionState(saveMessyMomentAction, {
    error: null,
    success: false,
  });

  // Reset form after successful save
  useEffect(() => {
    if (state.success) {
      setMessyWhen("");
      setConflictingRules("");
      setGuiltType("");
      loadEntries();
    }
  }, [state.success]);

  // ── Loading ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col">
        <SubPageHeader backHref="/recipes/bill-of-rights" title="Messy Moment" />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-6">
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-7 w-48" />
            <Skeleton className="mx-auto h-4 w-64" />
          </div>
          <Card>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/recipes/bill-of-rights" title="Messy Moment" />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-6">
        {/* Intro */}
        <div className="flex flex-col gap-3 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Momente, in denen du nicht nach deinen eigenen Regeln gehandelt hast – das passiert.
            Hier kannst du sie reflektieren, ohne dich zu verurteilen.
          </p>
        </div>

        {/* Error banner */}
        <FormError message={state.error} />

        {/* ── Form ────────────────────────────────────────────────── */}
        <form className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="messy_when" className="text-base font-medium">
              Wann ist es diese Woche &bdquo;messy&ldquo; geworden – wann bist du nicht nach deinem
              Bill of Rights gegangen?
            </Label>
            <Textarea
              id="messy_when"
              name="messy_when"
              value={messyWhen}
              onChange={(e) => setMessyWhen(e.target.value)}
              placeholder="Zum Beispiel: Ich habe Ja gesagt, obwohl ich Nein meinte …"
              rows={3}
              required
              disabled={pending}
              className="min-h-[100px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conflicting_rules" className="text-base font-medium">
              Welche Regel(n) waren im Konflikt miteinander?
            </Label>
            <Textarea
              id="conflicting_rules"
              name="conflicting_rules"
              value={conflictingRules}
              onChange={(e) => setConflictingRules(e.target.value)}
              placeholder='Zum Beispiel: &bdquo;Ich habe das Recht, Nein zu sagen&ldquo; vs. &bdquo;Ich muss es allen recht machen&ldquo; …'
              rows={3}
              disabled={pending}
              className="min-h-[100px] resize-y"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">
              War die Schuld, die du gefühlt hast, gesunde oder ungesunde Schuld?
            </Label>
            <RadioGroup value={guiltType} onValueChange={setGuiltType}>
              <RadioGroupItem value="healthy" disabled={pending}>
                gesund
              </RadioGroupItem>
              <RadioGroupItem value="unhealthy" disabled={pending}>
                ungesund
              </RadioGroupItem>
              <RadioGroupItem value="unsure" disabled={pending}>
                bin mir nicht sicher
              </RadioGroupItem>
            </RadioGroup>
          </div>

          <Button
            type="button"
            className="w-full gap-2"
            size="lg"
            disabled={pending || !messyWhen.trim() || !guiltType}
            onClick={() => {
              const form = new FormData();
              form.set("messy_when", messyWhen);
              form.set("conflicting_rules", conflictingRules);
              form.set("guilt_type", guiltType);
              // Trigger useActionState — we create a synthetic FormData submit
              formAction(form);
            }}
          >
            {pending ? "Wird gespeichert …" : "Eintrag speichern"}
          </Button>
        </form>

        {/* ── Previous Entries ──────────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Vorherige Einträge
          </h2>

          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Einträge. Der erste Schritt ist der wichtigste!
            </p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="space-y-2 pt-(--card-spacing)">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatDateDE(entry.entry_date)}
                      </span>
                      {entry.content.guilt_type && (
                        <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                          Schuld: {guiltLabel(entry.content.guilt_type)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">
                      {preview(entry.content.messy_when)}
                    </p>
                    {entry.content.conflicting_rules && (
                      <p className="text-xs text-muted-foreground">
                        Konflikt: {preview(entry.content.conflicting_rules, 60)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Back link */}
        <Button variant="outline" className="w-full" render={<Link href="/recipes/bill-of-rights" />}>
          Zurück zum Bill of Rights
        </Button>

        {/* Bottom spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}