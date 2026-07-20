"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

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
  const remaining = MAX_VALUES - selectedValues.length;

  // ── Completion-Screen nach erfolgreichem Speichern ──
  if (state.success) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-6 px-4 py-8 text-center">
        <CompletionCelebration />
        <p className="max-w-prose text-base leading-relaxed text-foreground">
          Super! In den nächsten Tagen werden wir diese Werte-Hypothese testen.
          Beginne deine erste Reflexion.
        </p>

        <div className="w-full space-y-3 text-left">
          {selectedValues.map((id) => {
            const isCustom = id.startsWith(CUSTOM_PREFIX);
            return (
              <Card key={id}>
                <CardContent className="flex items-start gap-3">
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {getValueEmoji(id)}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="font-heading text-base font-semibold text-foreground">
                      {getValueLabel(id)}
                    </p>
                    {!isCustom && (
                      <p className="font-affirmation text-base leading-relaxed text-foreground/90">
                        Dir ist wichtig, dass {getValueDescription(id)}.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
      {/* Header — die 7-Tage-Reise ist das führende Modell (Karte „Tag N von 7",
          Journal-Header „Tag N — Reflexion"); kein konkurrierender „Schritt"-Zähler. */}
      <header className="mb-4">
        <p className="max-w-prose text-lg leading-relaxed text-foreground">
          Wähl 5 Werte aus, die sich gerade jetzt echt für dich anfühlen — nicht
          zu viel nachdenken, einfach fühlen.
        </p>
      </header>

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
                className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm transition-all duration-150 active:scale-95 motion-reduce:active:scale-100 ${
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
                maxLength={30}
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

        {/* Deine Auswahl — das einzige Zähl-Signal (Kopf trägt N/5) und zugleich
            die Bedeutung je Wert: eine Vorschau auf die Auswertung, die die Picks
            an einem Ort sammelt, während der Zähler beim Scrollen sonst wegläuft. */}
        {selectedValues.length > 0 && (
          <div className="mt-6">
            <p
              className="mb-2 text-sm font-medium text-foreground"
              aria-live="polite"
            >
              Deine Auswahl · {selectedValues.length}/{MAX_VALUES}
            </p>
            <ul className="space-y-2">
              {selectedValues.map((id) => {
                const isCustom = id.startsWith(CUSTOM_PREFIX);
                return (
                  <li
                    key={id}
                    className="flex items-start gap-2.5 rounded-lg bg-card px-3 py-2 ring-1 ring-border/70"
                  >
                    <span className="mt-0.5 text-lg leading-none" aria-hidden="true">
                      {getValueEmoji(id)}
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-heading text-sm font-medium text-foreground">
                        {getValueLabel(id)}
                      </p>
                      {!isCustom && (
                        <p className="font-affirmation text-sm leading-relaxed text-muted-foreground">
                          Dir ist wichtig, dass {getValueDescription(id)}.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleValue(id)}
                      className="-my-1 -mr-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`${getValueLabel(id)} entfernen`}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Submit — trägt selbst den Rest-Zähler, kein separater Hinweis darunter. */}
        <div className="mt-8">
          <Button
            className="w-full"
            type="submit"
            size="lg"
            disabled={!isFull || pending}
          >
            {pending
              ? "Wird gespeichert …"
              : isFull
                ? "Weiter"
                : `Noch ${remaining} ${remaining === 1 ? "Wert" : "Werte"} wählen`}
          </Button>
        </div>
      </form>
    </div>
  );
}
