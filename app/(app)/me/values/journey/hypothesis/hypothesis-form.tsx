"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { CompletionCelebration } from "@/components/ui/completion-celebration";

import { SELECTABLE_VALUES, getValueLabel, CUSTOM_PREFIX } from "@/lib/utils/values-bank";
import { getValueEmoji } from "@/lib/utils/values-emojis";
import { getValueDescription } from "@/lib/utils/values-descriptions";
import { saveHypothesisAction } from "@/app/(app)/recipes/values/actions";

const MAX_VALUES = 5;

type Props = {
  /** Previously selected values, used to pre-fill the form on revisit. */
  initialValues?: string[] | null;
};

export function HypothesisForm({ initialValues }: Props) {
  const [selectedValues, setSelectedValues] = useState<string[]>(
    initialValues ?? [],
  );
  const [customValue, setCustomValue] = useState("");
  const valuesRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState(saveHypothesisAction, {
    error: null,
  });

  // Sync the hidden input whenever selectedValues changes
  useEffect(() => {
    if (valuesRef.current) {
      valuesRef.current.value = JSON.stringify(selectedValues);
    }
  }, [selectedValues]);

  const toggleValue = (value: string) => {
    setSelectedValues((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      if (prev.length >= MAX_VALUES) {
        return prev;
      }
      return [...prev, value];
    });
  };

  const addCustomValue = () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    const customId = `${CUSTOM_PREFIX}${trimmed}`;
    if (selectedValues.includes(customId)) return;
    if (selectedValues.length >= MAX_VALUES) return;
    setSelectedValues((prev) => [...prev, customId]);
    setCustomValue("");
  };

  // Client-side guard: prevent submission without 5 values
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (selectedValues.length !== MAX_VALUES) {
      e.preventDefault();
      return;
    }
  };

  const isFull = selectedValues.length === MAX_VALUES;

  // ── Completion-Screen nach erfolgreichem Speichern ──
  if (state.success) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-6 px-4 py-8 text-center">
        <CompletionCelebration />
        <p className="max-w-prose text-base text-muted-foreground">
          Super! In den nächsten Tagen werden wir diese Werte-Hypothese testen.
          Beginne deine erste Reflexion.
        </p>

        <div className="w-full space-y-3 text-left">
          {selectedValues.map((id) => (
            <Card key={id}>
              <CardContent className="flex items-start gap-3">
                <span className="text-2xl leading-none" aria-hidden="true">
                  {getValueEmoji(id)}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="font-heading text-base font-semibold text-foreground">
                    {getValueLabel(id)}
                  </p>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Dir ist wichtig, dass {getValueDescription(id)}.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button
          className="mt-2 w-full gap-2"
          size="lg"
          render={<Link href="/me/values/journey" />}
        >
          Weiter
          <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      {/* Header — die 7-Tage-Reise ist das führende Modell (Karte „Tag N von 7",
          Journal-Header „Tag N — Reflexion"); kein konkurrierender „Schritt"-Zähler. */}
      <header className="mb-2">
        <p className="max-w-prose text-lg text-muted-foreground">
          Wähl 5 Werte aus, die sich gerade jetzt echt für dich anfühlen — nicht
          zu viel nachdenken, einfach fühlen.
        </p>
      </header>

      {/* Counter */}
      <div className="mb-4" aria-live="polite">
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            isFull
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {selectedValues.length}/{MAX_VALUES} ausgewählt
        </span>
      </div>

      {/* Error */}
      <FormError message={state.error} className="mb-4" />

      <form onSubmit={handleFormSubmit} action={formAction}>
        {/* Hidden input — value synced via useEffect */}
        <input ref={valuesRef} type="hidden" name="values" value="" />

        {/* Chip grid */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Werte-Auswahl">
          {SELECTABLE_VALUES.map((item) => {
            const isSelected = selectedValues.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleValue(item.id)}
                className={`rounded-full border px-3 py-1 text-sm transition-all duration-150 active:scale-95 motion-reduce:active:scale-100 ${
                  isSelected
                    ? "border-primary bg-primary/15 font-medium text-primary shadow-sm"
                    : "border-border bg-card text-foreground hover:border-muted-foreground/40 hover:bg-muted"
                }`}
              >
                {item.de}
              </button>
            );
          })}
        </div>

        {/* Custom value input */}
        {!isFull && (
          <div className="mt-6 flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="custom-value" className="mb-1 block text-sm text-muted-foreground">
                Eigenen Wert hinzufügen
              </Label>
              <Input
                id="custom-value"
                type="text"
                placeholder="z. B. Gelassenheit"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomValue();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={addCustomValue}
              disabled={!customValue.trim()}
            >
              Hinzufügen
            </Button>
          </div>
        )}

        {/* Selected values summary (visible when some are selected) */}
        {selectedValues.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-muted-foreground">Deine Auswahl:</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedValues.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {getValueLabel(v)}
                  <button
                    type="button"
                    onClick={() => toggleValue(v)}
                    className="-mr-1 ml-0.5 inline-flex size-6 items-center justify-center leading-none hover:text-primary"
                    aria-label={`${getValueLabel(v)} entfernen`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="mt-8">
          <Button
            className="w-full"
            type="submit"
            size="lg"
            disabled={!isFull || pending}
          >
            {pending ? "Wird gespeichert …" : "Weiter"}
          </Button>
          {!isFull && selectedValues.length > 0 && (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Wähle noch {MAX_VALUES - selectedValues.length} weitere
              {MAX_VALUES - selectedValues.length === 1 ? "n" : ""} Wert
              {MAX_VALUES - selectedValues.length === 1 ? "" : "e"} aus.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
