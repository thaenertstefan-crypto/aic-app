"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { SubPageHeader } from "@/components/layout/sub-page-header";

import { createFreeEntryAction } from "../actions";

export default function NewJournalEntryPage() {
  const [state, formAction, pending] = useActionState(createFreeEntryAction, {
    error: null,
  });

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/journal" title="Neuer Eintrag" />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <form action={formAction} className="flex flex-1 flex-col gap-5">
          <FormError message={state.error} />

          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-medium">
              Titel
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="Titel (optional)"
              disabled={pending}
            />
          </div>

          <div className="flex flex-1 flex-col space-y-2">
            <Label htmlFor="body" className="text-base font-medium">
              Dein Eintrag
            </Label>
            <Textarea
              id="body"
              name="body"
              placeholder="Was geht dir gerade durch den Kopf?"
              required
              disabled={pending}
              className="min-h-[200px] flex-1 resize-y"
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Wird gespeichert …" : "Eintrag speichern"}
          </Button>
        </form>
      </div>
    </div>
  );
}
