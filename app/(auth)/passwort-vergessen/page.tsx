"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { requestPasswordResetAction } from "@/app/(auth)/auth.actions";
import { invalidMessage, clearValidity } from "@/lib/utils/form-validation";

export default function PasswortVergessenPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    { error: null, sent: false },
  );

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Passwort vergessen?</CardTitle>
        <CardDescription>
          Kein Problem. Gib deine E-Mail ein — ich schick dir einen Link zum
          Zurücksetzen.
        </CardDescription>
      </CardHeader>

      {state.sent ? (
        <CardContent>
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-foreground">
            Wenn es ein Konto mit dieser E-Mail gibt, ist der Link jetzt
            unterwegs. Schau in dein Postfach.
          </p>
        </CardContent>
      ) : (
        <form action={formAction}>
          <CardContent className="flex flex-col gap-4">
            <FormError message={state.error} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="mail@beispiel.de"
                autoComplete="email"
                autoFocus
                required
                onInvalid={invalidMessage(
                  "Bitte gib eine gültige E-Mail-Adresse ein.",
                )}
                onInput={clearValidity}
              />
            </div>

            <Button type="submit" disabled={pending} className="mt-1 w-full">
              {pending ? "Wird geschickt …" : "Link schicken"}
            </Button>
          </CardContent>
        </form>
      )}

      <CardFooter className="justify-center border-t text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Zurück zur Anmeldung
        </Link>
      </CardFooter>
    </Card>
  );
}
