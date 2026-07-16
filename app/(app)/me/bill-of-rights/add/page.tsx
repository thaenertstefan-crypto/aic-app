"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";

import { appendRightAction } from "../actions";

const INTRO_CARDS = getRecipeIntro("bill-of-rights") ?? [];

/** Fester Satzanfang — nicht löschbar, der User schreibt nach dem Komma weiter. */
const PREFIX = "Ich habe das Recht,";

export default function AddRightPage() {
  const [state, formAction, pending] = useActionState(appendRightAction, {
    error: null,
  });
  const [rest, setRest] = useState("");

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader
        backHref="/me/bill-of-rights"
        title="Recht hinzufügen"
        action={
          INTRO_CARDS.length > 0 ? (
            <IntroInfoButton cards={INTRO_CARDS} />
          ) : undefined
        }
      />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
        <form action={formAction} className="flex flex-1 flex-col gap-5">
          <FormError message={state.error} />

          <div className="space-y-2">
            <Label htmlFor="text" className="text-base font-medium">
              Dein Recht
            </Label>
            {/* Der Präfix steht fest IN der Box (nicht editierbar); getippt wird
                nur die Fortsetzung. Gespeichert wird der zusammengesetzte Satz
                (hidden input), die Action bleibt unverändert. */}
            <div className="rounded-lg border border-input px-3 py-2 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
              <span className="text-base font-medium text-foreground">
                {PREFIX}
              </span>
              <Textarea
                id="text"
                value={rest}
                onChange={(e) => setRest(e.target.value)}
                placeholder="… nicht perfekt zu sein."
                required
                disabled={pending}
                autoFocus
                className="min-h-[90px] resize-y border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
              />
            </div>
            <input
              type="hidden"
              name="text"
              value={`${PREFIX} ${rest.trim()}`}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={pending || !rest.trim()}
          >
            {pending ? "Wird hinzugefügt …" : "Hinzufügen"}
          </Button>
        </form>
      </div>
    </div>
  );
}
