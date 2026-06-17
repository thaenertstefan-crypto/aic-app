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
import { signupAction } from "@/app/(auth)/auth.actions";
import { invalidMessage, clearValidity } from "@/lib/utils/form-validation";
import { POST_LOGIN_KEY } from "@/components/dashboard/dashboard-reveal";

/** Markiert den nächsten Dashboard-Aufruf für das gestaffelte Einblenden. */
function markPostLogin() {
  try {
    sessionStorage.setItem(POST_LOGIN_KEY, String(Date.now()));
  } catch {
    // sessionStorage nicht verfügbar (z. B. privater Modus) — egal.
  }
}

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, {
    error: null,
  });

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Werde Teil des Clubs</CardTitle>
        <CardDescription>
          Erstelle dein Konto — der erste Schritt raus aus dem
          Hochstapler-Gefühl.
        </CardDescription>
      </CardHeader>

      <form action={formAction} onSubmit={markPostLogin}>
        <CardContent className="flex flex-col gap-4">
          <FormError message={state.error} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Dein Name"
              autoComplete="name"
              required
              onInvalid={invalidMessage("Bitte gib deinen Namen ein.")}
              onInput={clearValidity}
            />
          </div>

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
              placeholder="Mindestens 6 Zeichen"
              autoComplete="new-password"
              required
              minLength={6}
              onInvalid={invalidMessage(
                "Dein Passwort sollte mindestens 6 Zeichen lang sein.",
              )}
              onInput={clearValidity}
            />
          </div>

          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? "Wird registriert …" : "Dem Club beitreten"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Kostenlos starten · Kein Schnickschnack · Jederzeit kündbar
          </p>
        </CardContent>
      </form>

      <CardFooter className="justify-center border-t text-sm text-muted-foreground">
        Hast du bereits ein Konto?{" "}
        <Link
          href="/login"
          className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          Hier anmelden
        </Link>
      </CardFooter>
    </Card>
  );
}