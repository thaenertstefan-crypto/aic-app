"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";

import { VALUES_BANK } from "@/lib/utils/values-bank";

import {
  saveEvalReflectionAction,
  saveAdjustedHypothesisAction,
  startNewCycleAction,
  type EvaluationPageData,
} from "../actions";

// ─── Date helpers ───────────────────────────────────────────────────

function formatDateDE(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}.${m}.${y}`;
}

// ─── Props ──────────────────────────────────────────────────────────

interface EvaluationFormProps {
  initialData: EvaluationPageData;
}

// ─── Component ──────────────────────────────────────────────────────

export function EvaluationForm({ initialData }: EvaluationFormProps) {
  const { hypothesis, hypothesisVersion, entries, valueEvalEntry, phase } =
    initialData;

  // ── Phase management ────────────────────────────────────────────
  const [currentPhase, setCurrentPhase] = useState<
    "reflection" | "adjust" | "complete"
  >(phase);

  // ── AI insights ─────────────────────────────────────────────────
  // Seed from previously generated insights so a reload doesn't re-call.
  // While `insights` is null in the adjust phase, the card shows a loading state.
  const [insights, setInsights] = useState<string | null>(
    valueEvalEntry?.aiInsights ?? null,
  );
  const insightsRequested = useRef(insights !== null);

  // When the user reaches the adjust phase, fetch the AI observations once
  // (unless we already have them from a previous visit).
  useEffect(() => {
    if (currentPhase !== "adjust" || insightsRequested.current) return;
    insightsRequested.current = true;

    const fallback =
      "Wir konnten diesmal leider keine Beobachtungen für dich erstellen. Schau einfach selbst noch einmal auf deine Woche zurück.";

    let cancelled = false;
    fetch("/api/journal-analysis", { method: "POST" })
      .then(async (res) => {
        const data = (await res.json()) as { insights?: string; error?: string };
        // On a rate-limit (or other error), surface the server's message in the
        // insights card instead of silently showing the generic fallback.
        if (!res.ok) return data.error ?? fallback;
        return data.insights ?? fallback;
      })
      .then((text) => {
        if (!cancelled) setInsights(text);
      })
      .catch(() => {
        if (!cancelled) setInsights(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPhase]);

  // ── Phase 1: Reflection form ────────────────────────────────────
  const [reflectionState, reflectionAction, reflectionPending] = useActionState(
    saveEvalReflectionAction,
    { error: null, success: false },
  );

  // When reflection saves successfully, move to adjust phase
  if (reflectionState.success && currentPhase === "reflection") {
    // Use setTimeout to avoid React state-in-render warning
    setTimeout(() => setCurrentPhase("adjust"), 0);
  }

  // Pre-fill reflection textareas if user already saved
  const existingPositive = valueEvalEntry?.content?.positive_reflection ?? "";
  const existingNegative = valueEvalEntry?.content?.negative_reflection ?? "";

  // ── Phase 2: Value adjustment ───────────────────────────────────
  const [isKept, setIsKept] = useState<boolean[]>(
    hypothesis.map(() => true),
  );
  const [replacements, setReplacements] = useState<(string | null)[]>(
    hypothesis.map(() => null),
  );
  const [additionalValues, setAdditionalValues] = useState<string[]>([]);
  const [customReplacement, setCustomReplacement] = useState<string>("");
  const [customAdditional, setCustomAdditional] = useState<string>("");

  // Track which value slot is currently in "picking" mode
  const [pickingIndex, setPickingIndex] = useState<number | null>(null);

  const [adjustState, adjustAction, adjustPending] = useActionState(
    saveAdjustedHypothesisAction,
    { error: null, success: false },
  );

  // When adjustment saves successfully, move to complete phase
  if (adjustState.success && currentPhase === "adjust") {
    setTimeout(() => setCurrentPhase("complete"), 0);
  }

  const toggleKeep = (index: number) => {
    setIsKept((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      // If switching back to "Keep", clear the replacement
      if (next[index]) {
        setReplacements((r) => {
          const r2 = [...r];
          r2[index] = null;
          return r2;
        });
        setPickingIndex(null);
      } else {
        // If switching to "Replace", enter picking mode
        setPickingIndex(index);
      }
      return next;
    });
  };

  const pickReplacement = (index: number, value: string) => {
    setReplacements((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setPickingIndex(null);
  };

  const addCustomReplacement = () => {
    const trimmed = customReplacement.trim();
    if (!trimmed) return;
    if (pickingIndex !== null) {
      pickReplacement(pickingIndex, trimmed);
    }
    setCustomReplacement("");
  };

  const addAdditionalValue = (value: string) => {
    setAdditionalValues((prev) => [...prev, value]);
  };

  const addCustomAdditional = () => {
    const trimmed = customAdditional.trim();
    if (!trimmed) return;
    if (additionalValues.includes(trimmed)) return;
    addAdditionalValue(trimmed);
    setCustomAdditional("");
  };

  const removeAdditionalValue = (value: string) => {
    setAdditionalValues((prev) => prev.filter((v) => v !== value));
  };

  // Collect all currently selected values (for filtering bank chips)
  const allSelectedValues = useMemo(() => {
    const kept = hypothesis.filter((_, i) => isKept[i]);
    const replaced = replacements.filter((r): r is string => r !== null);
    return [...kept, ...replaced, ...additionalValues];
  }, [hypothesis, isKept, replacements, additionalValues]);

  // Compute final values array for submit
  const finalValues = allSelectedValues;

  const handleAdjustSubmit = () => {
    if (finalValues.length === 0) return;
    const fd = new FormData();
    fd.set("values", JSON.stringify(finalValues));
    fd.set("original_version", String(hypothesisVersion));
    adjustAction(fd);
  };

  // ── Phase 3: Complete → start new cycle ─────────────────────────
  const [newCycleState, newCycleAction, newCyclePending] = useActionState(
    startNewCycleAction,
    { error: null },
  );

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex min-h-svh flex-col px-4 py-6">
      {/* ── Shared header ── */}
      <header className="mb-6 space-y-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {currentPhase === "reflection" && "Auswertung"}
          {currentPhase === "adjust" && "Deine Werte verfeinern"}
          {currentPhase === "complete" && "Zyklus abgeschlossen!"}
        </h1>
        <p className="text-sm text-muted-foreground">Schritt 3 von 3</p>
      </header>

      {/* ── Shared error banner ── */}
      <FormError
        message={
          reflectionState.error || adjustState.error || newCycleState.error
        }
        className="mb-6"
      />

      {/* ── ── ── PHASE 1: Reflection ── ── ── */}
      {currentPhase === "reflection" && (
        <>
          <p className="mb-6 max-w-prose text-base text-muted-foreground">
            Bevor du deine Werte anpasst, wirf einen Blick zurück auf die
            letzte Woche. Was hat sich gezeigt?
          </p>

          {/* 7-day entry summary (collapsible) */}
          <div className="mb-6 space-y-2">
            <h2 className="font-heading text-base font-semibold">
              Deine Woche im Rückblick
            </h2>
            {entries.map((entry, i) => (
              <details
                key={entry.id}
                className="group rounded-lg border border-border bg-card transition-colors open:border-amber-200 dark:open:border-amber-800"
              >
                <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium text-foreground">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    {i + 1}
                  </span>
                  <span>{formatDateDE(entry.entry_date)}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {entry.content.happenings.slice(0, 40)}
                    {entry.content.happenings.length > 40 ? "…" : ""}
                  </span>
                </summary>
                <div className="space-y-3 border-t border-border px-3 py-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Was ist passiert?
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {entry.content.happenings}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Gedanken & Gefühle
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {entry.content.response}
                    </p>
                  </div>
                </div>
              </details>
            ))}
          </div>

          <Separator className="mb-6" />

          {/* Reflection form */}
          <form action={reflectionAction} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="positive_reflection"
                className="text-sm leading-relaxed font-medium"
              >
                Welche Momente haben dich diese Woche positiv gestimmt — und
                warum? Was war dir in diesen Momenten wichtig?
              </Label>
              <Textarea
                id="positive_reflection"
                name="positive_reflection"
                placeholder="Zum Beispiel: 'Als ich mit Kollegin X Mittag gegessen habe – weil wir echt reden konnten. Mir war Verbindung wichtig.'"
                defaultValue={existingPositive}
                rows={4}
                required
                disabled={reflectionPending}
                className="min-h-[100px] resize-y"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="negative_reflection"
                className="text-sm leading-relaxed font-medium"
              >
                Welche Momente haben dich gestresst oder genervt — und warum?
                Was wurde dabei verletzt oder vernachlässigt?
              </Label>
              <Textarea
                id="negative_reflection"
                name="negative_reflection"
                placeholder="Zum Beispiel: 'Als das Meeting wieder ausuferte – weil meine Zeit nicht respektiert wurde. Mir wurde Autonomie verletzt.'"
                defaultValue={existingNegative}
                rows={4}
                required
                disabled={reflectionPending}
                className="min-h-[100px] resize-y"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={reflectionPending}
            >
              {reflectionPending
                ? "Wird gespeichert …"
                : "Reflexion speichern"}
            </Button>
          </form>
        </>
      )}

      {/* ── ── ── PHASE 2: Value Adjustment ── ── ── */}
      {currentPhase === "adjust" && (
        <>
          {/* AI insights card — gentle observations before adjusting values */}
          <Card className="mb-8 border-amber-200 dark:border-amber-800">
            <CardContent className="space-y-3 pt-(--card-spacing)">
              <h2 className="font-heading text-base font-semibold text-amber-800 dark:text-amber-200">
                Was uns aufgefallen ist …
              </h2>
              {insights === null ? (
                <p className="text-sm text-muted-foreground">
                  Wir schauen uns deine Woche an … einen kurzen Moment.
                </p>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {insights}
                </p>
              )}
            </CardContent>
          </Card>

          <p className="mb-6 max-w-prose text-base text-muted-foreground">
            Schau dir deine ursprünglichen Werte an. Welche fühlen sich
            immer noch richtig an? Welche möchtest du anpassen? Du kannst
            jetzt auch weitere Werte hinzufügen.
          </p>

          {/* Original values with Keep/Replace toggles */}
          <div className="mb-8 space-y-3">
            <h2 className="font-heading text-base font-semibold">
              Deine ursprünglichen Werte
            </h2>
            {hypothesis.map((value, index) => (
              <Card key={index} size="sm">
                <CardContent className="space-y-3 pt-(--card-spacing)">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-foreground">
                      {value}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isKept[index]) toggleKeep(index);
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          isKept[index]
                            ? "bg-amber-100 text-amber-800 shadow-sm dark:bg-amber-900/30 dark:text-amber-200"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        Behalten
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isKept[index]) toggleKeep(index);
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          !isKept[index]
                            ? "bg-destructive/10 text-destructive shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        Ersetzen
                      </button>
                    </div>
                  </div>

                  {/* Replacement picker (shown when "Ersetzen" is active) */}
                  {!isKept[index] && pickingIndex === index && (
                    <div className="space-y-3 rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        Wähle einen Ersatz aus oder gib einen eigenen Wert ein:
                      </p>

                      {/* Value bank chips (filtered) */}
                      <div className="flex flex-wrap gap-1.5">
                        {VALUES_BANK.filter(
                          (v) => !allSelectedValues.includes(v) || v === replacements[index],
                        ).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => pickReplacement(index, v)}
                            className={`rounded-full border px-2.5 py-1 text-xs transition-all active:scale-95 ${
                              replacements[index] === v
                                ? "border-amber-400 bg-amber-100 font-medium text-amber-800 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>

                      {/* Custom replacement input */}
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label
                            htmlFor={`custom-replace-${index}`}
                            className="mb-1 block text-xs text-muted-foreground"
                          >
                            Eigenen Wert eingeben
                          </Label>
                          <Input
                            id={`custom-replace-${index}`}
                            type="text"
                            placeholder="z. B. Gelassenheit"
                            value={customReplacement}
                            onChange={(e) =>
                              setCustomReplacement(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addCustomReplacement();
                              }
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCustomReplacement}
                          disabled={!customReplacement.trim()}
                        >
                          Hinzufügen
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Show selected replacement value (after picking) */}
                  {!isKept[index] &&
                    pickingIndex !== index &&
                    replacements[index] && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Ersatz:
                        </span>
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                          {replacements[index]}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPickingIndex(index)}
                          className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
                        >
                          Ändern
                        </button>
                      </div>
                    )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional values */}
          <div className="mb-8 space-y-3">
            <h2 className="font-heading text-base font-semibold">
              Weitere Werte hinzufügen
            </h2>
            <p className="text-xs text-muted-foreground">
              Dir fällt noch ein Wert ein, der dir wichtig ist? Füg ihn
              einfach hinzu. Es gibt kein Limit.
            </p>

            {/* Value bank chips for additional values (filtered) */}
            <div className="flex flex-wrap gap-1.5">
              {VALUES_BANK.filter(
                (v) => !allSelectedValues.includes(v),
              ).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => addAdditionalValue(v)}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 transition-all hover:border-amber-300 hover:bg-amber-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-amber-600 dark:hover:bg-amber-900/20"
                >
                  + {v}
                </button>
              ))}
            </div>

            {/* Custom additional value input */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label
                  htmlFor="custom-additional"
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  Eigenen Wert hinzufügen
                </Label>
                <Input
                  id="custom-additional"
                  type="text"
                  placeholder="z. B. Gelassenheit"
                  value={customAdditional}
                  onChange={(e) => setCustomAdditional(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomAdditional();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomAdditional}
                disabled={!customAdditional.trim()}
              >
                Hinzufügen
              </Button>
            </div>
          </div>

          {/* Summary of all selected values */}
          {finalValues.length > 0 && (
            <div className="mb-8">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Deine Werte ({finalValues.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hypothesis.map(
                  (v, i) =>
                    isKept[i] && (
                      <span
                        key={`kept-${v}`}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                      >
                        {v}
                        <button
                          type="button"
                          onClick={() => toggleKeep(i)}
                          className="ml-0.5 inline-flex leading-none hover:text-amber-600 dark:hover:text-amber-400"
                          aria-label={`${v} entfernen`}
                        >
                          &times;
                        </button>
                      </span>
                    ),
                )}
                {replacements.filter(Boolean).map((v) => (
                  <span
                    key={`replacement-${v}`}
                    className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                  >
                    {v}
                  </span>
                ))}
                {additionalValues.map((v) => (
                  <span
                    key={`additional-${v}`}
                    className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
                  >
                    {v}
                    <button
                      type="button"
                      onClick={() => removeAdditionalValue(v)}
                      className="ml-0.5 inline-flex leading-none hover:text-purple-600 dark:hover:text-purple-400"
                      aria-label={`${v} entfernen`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            disabled={finalValues.length === 0 || adjustPending}
            onClick={handleAdjustSubmit}
          >
            {adjustPending
              ? "Wird gespeichert …"
              : "Werte speichern & abschließen"}
          </Button>
        </>
      )}

      {/* ── ── ── PHASE 3: Complete ── ── ── */}
      {currentPhase === "complete" && (
        <>
          <Card className="mb-8 border-amber-200 dark:border-amber-800">
            <CardContent className="space-y-4 pt-(--card-spacing)">
              <p className="text-center text-2xl">🎉</p>
              <p className="text-center font-heading text-lg font-semibold text-amber-800 dark:text-amber-200">
                Erster Zyklus geschafft!
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Du hast eine ganze Woche reflektiert, deine Werte hinterfragt
                und ein klareres Bild von dem bekommen, was dir wirklich wichtig
                ist. Das ist ein großer Schritt.
              </p>

              <Separator />

              <div>
                <p className="mb-2 text-center text-xs font-medium text-muted-foreground">
                  Deine Werte
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {finalValues.map((v) => (
                    <span
                      key={v}
                      className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                    >
                      {v}
                    </span>
                  ))}
                  {/* Fallback: show DB values on re-entry if local state is empty */}
                  {finalValues.length === 0 &&
                    hypothesis.map((v) => (
                      <span
                        key={v}
                        className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                      >
                        {v}
                      </span>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTAs */}
          <div className="mt-auto space-y-3">
            <form action={newCycleAction}>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={newCyclePending}
              >
                {newCyclePending
                  ? "Wird gestartet …"
                  : "Neuen 7-Tage-Zyklus starten"}
              </Button>
            </form>

            <Button
              className="w-full"
              variant="outline"
              size="lg"
              render={<Link href="/recipes" />}
            >
              Fertig für jetzt
            </Button>
          </div>
        </>
      )}
    </div>
  );
}