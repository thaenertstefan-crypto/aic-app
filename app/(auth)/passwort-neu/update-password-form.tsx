"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { FormError } from "@/components/ui/form-error";
import { updatePasswordAction } from "@/app/(auth)/auth.actions";
import { ok } from "@/lib/actions/action-result";
import { invalidMessage, clearValidity } from "@/lib/utils/form-validation";

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    ok(),
  );

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Neues Passwort</CardTitle>
        <CardDescription>
          Fast geschafft. Wähl ein neues Passwort, dann bist du wieder drin.
        </CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <FormError message={state.error} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Neues Passwort</Label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Mindestens 6 Zeichen"
              autoComplete="new-password"
              autoFocus
              required
              minLength={6}
              onInvalid={invalidMessage(
                "Dein Passwort sollte mindestens 6 Zeichen lang sein.",
              )}
              onInput={clearValidity}
            />
          </div>

          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? "Wird gespeichert …" : "Passwort speichern"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
