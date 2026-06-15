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
import { loginAction } from "@/app/(auth)/auth.actions";
import { invalidMessage, clearValidity } from "@/lib/utils/form-validation";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, {
    error: null,
  });

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Willkommen zurück</CardTitle>
        <CardDescription>
          Schön, dass du wieder da bist. Melde dich an, um weiterzumachen.
        </CardDescription>
      </CardHeader>

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
              required
              onInvalid={invalidMessage(
                "Bitte gib eine gültige E-Mail-Adresse ein.",
              )}
              onInput={clearValidity}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              onInvalid={invalidMessage("Bitte gib dein Passwort ein.")}
              onInput={clearValidity}
            />
          </div>

          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? "Wird angemeldet …" : "Anmelden"}
          </Button>
        </CardContent>
      </form>

      <CardFooter className="justify-center border-t text-sm text-muted-foreground">
        Noch kein Konto?{" "}
        <Link
          href="/signup"
          className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          Jetzt registrieren
        </Link>
      </CardFooter>
    </Card>
  );
}