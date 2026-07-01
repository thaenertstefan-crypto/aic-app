"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";

import { appendRightAction } from "../actions";

const INTRO_CARDS = getRecipeIntro("bill-of-rights") ?? [];

export default function AddRightPage() {
  const [state, formAction, pending] = useActionState(appendRightAction, {
    error: null,
  });

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
            <Textarea
              id="text"
              name="text"
              placeholder="Ich habe das Recht zu…"
              required
              disabled={pending}
              className="min-h-[120px] resize-y"
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Wird hinzugefügt …" : "Hinzufügen"}
          </Button>
        </form>
      </div>
    </div>
  );
}
