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
import { loginAction } from "@/app/(auth)/auth.actions";

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
          {state.error && (
            <div
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="mail@beispiel.de"
              autoComplete="email"
              required
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