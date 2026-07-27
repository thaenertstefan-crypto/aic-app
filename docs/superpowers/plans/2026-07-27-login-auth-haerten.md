# Login-Auth härten & Reveal entschärfen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Login-Pfad von der Signup-Bühne entkoppeln und um einen fehlenden „Passwort vergessen?"-Flow ergänzen, plus die drei objektiven Bugs (Icon-Richtung, versteckt-fokussierbare Karte, Muted-Kontrast) und die Minor-Punkte aus der `/login`-Critique beheben.

**Architecture:** Neuer Supabase-PKCE-Reset-Flow über eine `/auth/callback`-Route (Code-Exchange) + zwei neue `(auth)`-Seiten (`/passwort-vergessen`, `/passwort-neu`) mit Server-Actions in der bestehenden `auth.actions.ts`. `AuthReveal` wird so umgebaut, dass das Swipe-Gate nur noch auf `/signup` greift; `/login` und die Reset-Seiten zeigen die Karte direkt. Ein wiederverwendbares `PasswordInput` mit Show/Hide löst die Passwortfelder ab.

**Tech Stack:** Next.js 16 App Router (Server Actions, Route Handlers, `useActionState`), `@supabase/ssr` (createServerClient / createBrowserClient), Base UI-Komponenten, TailwindCSS v4, lucide-react v1.18.

## Global Constraints

- **Alle Nutzer-Texte Deutsch**, warm/ermutigend, informelles „du"; deutsche Anführungszeichen `„…"` (U+201E/U+201C), nie ASCII-`"` in gerendertem Text (Typo-Gate).
- **Mobile-first ~375px**, dunkles Aubergine-Theme; Text = Moonlight, Gold-Ink auf Gold-Fills, kein `#FFFFFF`.
- **One-Candle-Rule:** genau eine Gold-Aktion pro Karte. Der „Passwort vergessen?"-Link bleibt **muted** (nicht Gold), damit er nicht mit dem „Anmelden"-Button und dem gold Footer-Link konkurriert.
- **`prefers-reduced-motion: reduce`** braucht überall einen ruhigen Fallback; der bestehende reduced-Pfad in `AuthReveal` darf nicht brechen.
- **Next.js 16:** `cookies()`, `headers()`, `params`, `searchParams` sind async → `await`.
- **Verifikation** hat keinen Unit-Runner: harte Gates sind `npx tsc --noEmit`, `npm run gate` (Kontrast+Typo+Motion) und `npm run build`; visuelles Gate ist Stefans iPhone-Check am Live-Deploy. `npm run lint` ist vorbestehend rot und **kein** Gate.
- **Supabase-Prerequisite (einmalig, kein Code):** In Supabase → Auth → URL Configuration die Redirect-URLs `http://localhost:3000/auth/callback` **und** `https://<prod-domain>/auth/callback` erlauben, sonst lehnt Supabase den Reset-Link ab. E-Mail-Versand (SMTP/Default) muss aktiv sein, damit die Reset-Mail wirklich rausgeht.

---

## File Structure

**Neu:**
- `components/ui/password-input.tsx` — Passwortfeld mit Show/Hide-Toggle (wraps `Input`).
- `app/auth/callback/route.ts` — GET-Route-Handler: `exchangeCodeForSession`, setzt Session-Cookie, leitet weiter. Öffentlich (nicht im `(app)`-Schutz).
- `app/(auth)/passwort-vergessen/page.tsx` — E-Mail-Eingabe → Reset-Link anfordern.
- `app/(auth)/passwort-neu/page.tsx` — Server-Guard (Recovery-Session vorhanden?) + Client-Formular für neues Passwort.
- `app/(auth)/passwort-neu/update-password-form.tsx` — Client-Formular (`useActionState`).

**Geändert:**
- `app/(auth)/auth.actions.ts` — zwei neue Actions (`requestPasswordResetAction`, `updatePasswordAction`); `friendlyAuthError` wird wiederverwendet.
- `app/(auth)/login/page.tsx` — „Passwort vergessen?"-Link, `autoFocus` auf E-Mail, `PasswordInput`.
- `app/(auth)/signup/page.tsx` — `PasswordInput`.
- `components/auth/auth-reveal.tsx` — Gate nur noch für `/signup`; Login/Reset stacked & sichtbar; `inert` auf die noch gegatete Signup-Karte; `ChevronUp` statt `ChevronDown`; Wheel nur „reveal", nie „re-hide".

**Referenz / wiederverwenden (nicht ändern):**
- `lib/supabase/server.ts` `createClient()`, `lib/supabase/client.ts` `createClient()`, `lib/supabase/get-user.ts` `getCachedUser()`.
- `lib/utils/form-validation.ts` `invalidMessage`, `clearValidity`.
- `components/ui/{card,input,button,label,form-error}.tsx`.

---

### Task 1: Wiederverwendbares `PasswordInput` mit Show/Hide

**Files:**
- Create: `components/ui/password-input.tsx`

**Interfaces:**
- Produces: `PasswordInput` — `React.ComponentProps<typeof Input>` (identisches Interface wie `Input`, forwarded), Default `type` intern gesteuert. Wird in Task 4, 5, 6, 7 verwendet.

- [ ] **Step 1: Komponente schreiben**

```tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Passwortfeld mit Auge-Toggle. Erbt das komplette Input-Interface
 * (autoComplete, required, onInvalid, …) und reicht alles durch. Der
 * Toggle-Button ist per Tastatur erreichbar und mit aria-Label/-pressed
 * für Screenreader beschriftet.
 */
export function PasswordInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        className={cn("pr-9", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Passwort verbergen" : "Passwort anzeigen"}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
      >
        {show ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (keine neuen Fehler; Icons Eye/EyeOff existieren in lucide-react v1.18).

- [ ] **Step 3: Commit**

```bash
git add components/ui/password-input.tsx
git commit -m "feat(auth): wiederverwendbares PasswordInput mit Show/Hide-Toggle"
```

---

### Task 2: Supabase Auth-Callback-Route (Code-Exchange)

**Files:**
- Create: `app/auth/callback/route.ts`

**Interfaces:**
- Produces: GET `/auth/callback?code=<pkce>&next=<path>` — tauscht den Code gegen eine Session (setzt Cookies via Server-Client) und redirectet auf `next` (Default `/passwort-neu`). Bei Fehler/kein Code → `/passwort-vergessen?fehler=link`.
- Consumes: `createClient()` aus `lib/supabase/server.ts`.

- [ ] **Step 1: Route-Handler schreiben**

```ts
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Landepunkt für Supabase-Recovery-/Confirm-Links (PKCE). Tauscht den `code`
 * gegen eine Session und leitet auf `next` weiter. Öffentlich erreichbar —
 * liegt bewusst außerhalb der (app)-Schutzschicht.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/passwort-neu";

  // Hinter Proxy/Vercel die echte externe Origin rekonstruieren.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const origin = forwardedHost
    ? `${forwardedProto ?? "https"}://${forwardedHost}`
    : new URL(request.url).origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/passwort-vergessen?fehler=link`);
}
```

- [ ] **Step 2: Typecheck + Build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS; die Route `/auth/callback` taucht im Build-Output auf.

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat(auth): /auth/callback Route fuer Supabase Code-Exchange"
```

---

### Task 3: Reset-Server-Actions

**Files:**
- Modify: `app/(auth)/auth.actions.ts`

**Interfaces:**
- Produces:
  - `type ResetRequestState = { error: string | null; sent: boolean }`
  - `requestPasswordResetAction(prev: ResetRequestState, formData: FormData): Promise<ResetRequestState>` — schickt den Reset-Link, **enumeration-safe** (immer `sent: true` bei gültiger Eingabe, verrät nicht, ob die E-Mail existiert).
  - `updatePasswordAction(prev: AuthState, formData: FormData): Promise<AuthState>` — setzt das neue Passwort auf die aktive (Recovery-)Session, redirectet auf `/dashboard`.
- Consumes: bestehendes `AuthState`, `friendlyAuthError`, `createClient()`; `headers()` aus `next/headers`.

- [ ] **Step 1: Import ergänzen** (oben in der Datei, zu den bestehenden Imports)

```ts
import { headers } from "next/headers";
```

- [ ] **Step 2: Actions ans Dateiende anfügen**

```ts
export type ResetRequestState = {
  error: string | null;
  sent: boolean;
};

/**
 * Schickt einen Passwort-Reset-Link. Bewusst enumeration-safe: bei gültiger
 * Eingabe immer `sent: true`, egal ob die E-Mail existiert (Supabase
 * verrät es ebenfalls nicht). So erfährt niemand, welche Adressen registriert
 * sind.
 */
export async function requestPasswordResetAction(
  _prevState: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Bitte gib deine E-Mail-Adresse ein.", sent: false };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/passwort-neu`,
  });

  return { error: null, sent: true };
}

/**
 * Setzt ein neues Passwort auf die aktuell aktive Session (kommt aus dem
 * Recovery-Link über /auth/callback). Danach ist die Person direkt drin.
 */
export async function updatePasswordAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = formData.get("password") as string;

  if (!password || password.length < 6) {
    return { error: "Dein Passwort sollte mindestens 6 Zeichen lang sein." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  redirect("/dashboard");
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/auth.actions.ts"
git commit -m "feat(auth): Server-Actions fuer Passwort-Reset (anfordern + neu setzen)"
```

---

### Task 4: Seite `/passwort-vergessen`

**Files:**
- Create: `app/(auth)/passwort-vergessen/page.tsx`

**Interfaces:**
- Consumes: `requestPasswordResetAction`, `ResetRequestState` (Task 3); `Card*`, `Input`, `Label`, `Button`, `FormError`; `invalidMessage`, `clearValidity`.

- [ ] **Step 1: Seite schreiben** (Ton: entlastend, „kein Problem"; Erfolg = neutraler, enumeration-safer Hinweis)

```tsx
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
```

> Hinweis: Falls das `success`-Token in dieser Utility-Klassenform nicht existiert, stattdessen `bg-muted` verwenden — die Aussage trägt der Text, nicht die Farbe. Vor Merge kurz gegen `app/globals.css` prüfen.

- [ ] **Step 2: Typecheck + Build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS; Route `/passwort-vergessen` im Output.

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/passwort-vergessen"
git commit -m "feat(auth): Seite Passwort vergessen (Reset-Link anfordern)"
```

---

### Task 5: Seite `/passwort-neu` (Guard + Formular)

**Files:**
- Create: `app/(auth)/passwort-neu/page.tsx`
- Create: `app/(auth)/passwort-neu/update-password-form.tsx`

**Interfaces:**
- Consumes: `getCachedUser()` (Guard), `updatePasswordAction` + `AuthState` (Task 3), `PasswordInput` (Task 1).

- [ ] **Step 1: Server-Guard-Seite schreiben** (ohne Recovery-Session → zurück zur Anforderung)

```tsx
import { redirect } from "next/navigation";

import { getCachedUser } from "@/lib/supabase/get-user";
import { UpdatePasswordForm } from "./update-password-form";

export default async function PasswortNeuPage() {
  const user = await getCachedUser();

  // Diese Seite ist nur über einen gültigen Recovery-Link erreichbar, der über
  // /auth/callback eine Session gesetzt hat. Ohne Session zurück zur Anforderung.
  if (!user) {
    redirect("/passwort-vergessen?fehler=link");
  }

  return <UpdatePasswordForm />;
}
```

- [ ] **Step 2: Client-Formular schreiben**

```tsx
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
import { invalidMessage, clearValidity } from "@/lib/utils/form-validation";

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, {
    error: null,
  });

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
```

- [ ] **Step 3: Typecheck + Build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS; Route `/passwort-neu` im Output.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/passwort-neu"
git commit -m "feat(auth): Seite Passwort neu setzen (Guard + Formular)"
```

---

### Task 6: Login-Seite — „Passwort vergessen?"-Link, Autofocus, PasswordInput

**Files:**
- Modify: `app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `PasswordInput` (Task 1); Seite `/passwort-vergessen` (Task 4).

- [ ] **Step 1: Import auf `PasswordInput` umstellen** — ergänze neben dem `Input`-Import:

```tsx
import { PasswordInput } from "@/components/ui/password-input";
```

- [ ] **Step 2: E-Mail-Feld `autoFocus` geben** — im E-Mail-`<Input>` das Attribut `autoFocus` ergänzen (direkt nach `autoComplete="email"`). (Auf iOS öffnet das keine Tastatur ohne Geste — harmlos; Desktop-Gewinn.)

- [ ] **Step 3: Passwort-Block ersetzen** — den bestehenden Passwort-`<div>` durch diese Variante (Label-Zeile mit muted „Passwort vergessen?"-Link, `PasswordInput` statt `Input`):

```tsx
<div className="flex flex-col gap-2">
  <div className="flex items-center justify-between">
    <Label htmlFor="password">Passwort</Label>
    <Link
      href="/passwort-vergessen"
      className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      Passwort vergessen?
    </Link>
  </div>
  <PasswordInput
    id="password"
    name="password"
    placeholder="••••••••"
    autoComplete="current-password"
    required
    onInvalid={invalidMessage("Bitte gib dein Passwort ein.")}
    onInput={clearValidity}
  />
</div>
```

> One-Candle: Der Link ist **muted**, nicht gold — die einzige Gold-Aktion bleibt „Anmelden". `Link` ist bereits importiert.

- [ ] **Step 4: Typecheck + Gate**

Run: `npx tsc --noEmit && npm run gate`
Expected: PASS (Typo-Gate akzeptiert `„…"`; hier keine neuen Quotes im gerenderten Text außer korrekten).

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "feat(auth): Login - Passwort-vergessen-Link, Autofocus, PasswordInput"
```

---

### Task 7: Signup-Seite — PasswordInput

**Files:**
- Modify: `app/(auth)/signup/page.tsx`

**Interfaces:**
- Consumes: `PasswordInput` (Task 1).

- [ ] **Step 1:** `PasswordInput`-Import ergänzen (wie Task 6, Step 1).

- [ ] **Step 2:** Im Passwort-Block das `<Input …>` durch `<PasswordInput …>` ersetzen — **alle** bestehenden Props (`id`, `name`, `placeholder="Mindestens 6 Zeichen"`, `autoComplete="new-password"`, `required`, `minLength={6}`, `onInvalid`, `onInput`) unverändert übernehmen, nur das `type="password"` entfällt (steuert `PasswordInput` selbst).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/signup/page.tsx"
git commit -m "feat(auth): Signup nutzt PasswordInput"
```

---

### Task 8: `AuthReveal` — Gate nur für `/signup`, Login/Reset direkt sichtbar

**Files:**
- Modify: `components/auth/auth-reveal.tsx`

**Interfaces:**
- Consumes: bestehendes `usePathname`, `useReducedMotion`, `MascotPeek`, `AmbientBlobs`.
- Produces: Verhalten — auf `/login`, `/passwort-vergessen`, `/passwort-neu` (und bei reduced-motion) rendert die Karte **direkt sichtbar im Fluss** (kein Swipe-Gate, keine versteckt-fokussierbare Karte). Auf `/signup` bleibt das Vollbild-Swipe-Gate.

- [ ] **Step 1: Gate-Bedingung einführen** — direkt nach `const showCardMascot = …`:

```tsx
// Das Vollbild-Swipe-Gate ist bewusst NUR noch der Signup-Bühne vorbehalten.
// Rückkehrer (Login) und die Reset-Seiten sehen die Karte sofort — kein
// Gate, keine versteckt-fokussierbare Karte hinter dem Hero.
const gated = !reduced && pathname === "/signup";
```

- [ ] **Step 2: Nicht-gegateten Pfad ausweiten** — die bestehende `if (reduced) { … }`-Bedingung auf `if (!gated) { … }` ändern, sodass der bereits vorhandene, gestapelte (Hero oben, Karte im Fluss darunter) Fallback für **alle** nicht-gegateten Routen greift. Der Rumpf (Hero, zentrierte Karte, `showCardMascot`) bleibt unverändert.

- [ ] **Step 3: Gegatete Signup-Karte `inert` schalten** — im verbleibenden (Signup-)Return den Karten-Wrapper vor dem Aufdecken aus Tab-Reihenfolge + A11y-Baum nehmen. Am `<div>` mit `w-full max-w-sm transition-[scale,opacity] …` ergänzen:

```tsx
inert={!revealed || undefined}
```

(React 19 unterstützt das boolean `inert`-Attribut; ersetzt den reinen `pointer-events-none`-Schutz um echte Fokus-/SR-Isolierung.)

- [ ] **Step 4: Typecheck + Build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/auth/auth-reveal.tsx
git commit -m "feat(auth): Swipe-Gate nur noch fuer Signup, Login/Reset direkt sichtbar"
```

---

### Task 9: Signup-Gate-Politur — Icon-Richtung + Wheel entschärfen

**Files:**
- Modify: `components/auth/auth-reveal.tsx`

**Interfaces:**
- Consumes: gleiche Datei wie Task 8 (dieser Task läuft danach).

- [ ] **Step 1: Icon-Import tauschen** — `ChevronDown` → `ChevronUp` in der `lucide-react`-Importzeile (das Icon zeigt jetzt in Wisch-Richtung, passend zu „Nach oben wischen"). Das `<ChevronDown … />` im Aufdeck-Button entsprechend zu `<ChevronUp … />` ändern; die `nudge-y`-Animation bleibt.

- [ ] **Step 2: Wheel auf „reveal-only" reduzieren** — in `handleWheel` das Re-Verstecken bei Hoch-Scrollen entfernen, damit ein reflexartiges Scrollen die schon aufgedeckte Karte nicht wieder zuklappt:

```tsx
function handleWheel(e: React.WheelEvent) {
  // Nur aufdecken; nie wieder verstecken (sonst schlägt der Hero beim
  // Hoch-Scrollen über das halb ausgefüllte Formular zurück).
  if (e.deltaY > 0) setRevealed(true);
}
```

(Touch-Swipe bleibt bidirektional — bewusster „zurück zum Hero"-Weg.)

- [ ] **Step 3: Typecheck + Motion-Gate**

Run: `npx tsc --noEmit && npm run gate`
Expected: PASS (Motion-Gate weiterhin grün; `nudge-y` unverändert).

- [ ] **Step 4: Commit**

```bash
git add components/auth/auth-reveal.tsx
git commit -m "fix(auth): Aufdeck-Icon zeigt nach oben, Wheel klappt Karte nicht mehr zu"
```

---

### Task 10: Muted-Kontrast prüfen & ggf. angleichen

**Files:**
- Modify (bedingt): `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx` — nur falls das Gate es meldet.

**Interfaces:**
- Consumes: `scripts/check-contrast.mjs` (über `npm run gate`).

- [ ] **Step 1: Kontrast-Gate laufen lassen**

Run: `npm run gate`
Prüfen: meldet `check-contrast.mjs` die Footer-/Placeholder-`text-muted-foreground`-Kombinationen der Auth-Karten als unter 4.5:1?

- [ ] **Step 2: Entscheiden & anwenden**
  - **Gate grün / Kombis nicht abgedeckt:** Klasse `text-muted-foreground` auf den Footer-Zeilen (`CardFooter`) belassen — DESIGN.md erlaubt Lavender-Muted für genuin sekundären Text. Kein Change; Task-Ergebnis = „verifiziert, kein Eingriff nötig".
  - **Gate rot für diese Kombis:** Den betroffenen sekundären Text von `text-muted-foreground` auf `text-foreground/70` heben (nur die gemeldeten Stellen; die gold Footer-Links bleiben `text-primary`). Placeholder erben aus `Input` (`placeholder:text-muted-foreground`) — falls gemeldet, projektweit in `components/ui/input.tsx` einen Schritt Richtung Moonlight ziehen wäre ein separater, größerer Eingriff → dann nur dokumentieren und mit Stefan abstimmen, **nicht** im Alleingang das globale Input ändern.

- [ ] **Step 3: Commit (nur falls geändert)**

```bash
git add "app/(auth)/login/page.tsx" "app/(auth)/signup/page.tsx"
git commit -m "fix(auth): sekundaeren Auth-Text auf AA-Kontrast angehoben"
```

---

## Verification (End-to-End)

**Statische Gates (nach jedem Task, zwingend vor Push):**
```bash
npx tsc --noEmit
npm run gate      # Kontrast + Typo + Motion
npm run build
```

**Funktionaler Reset-Durchlauf (lokal, `npm run dev`):**
1. `/login` öffnen → Karte ist **sofort sichtbar** (kein Swipe), E-Mail hat Fokus, Passwortfeld hat Auge-Toggle, „Passwort vergessen?" (muted) ist da.
2. „Passwort vergessen?" → `/passwort-vergessen`, E-Mail eines Testkontos eingeben → neutraler „Link ist unterwegs"-Hinweis.
3. Reset-Mail öffnen (Supabase-Logs/Inbucket lokal, bzw. echtes Postfach bei aktivem SMTP) → Link führt über `/auth/callback` auf `/passwort-neu`.
4. Neues Passwort setzen → Redirect auf `/dashboard` (Session aktiv).
5. Ausloggen, mit neuem Passwort neu anmelden → erfolgreich.
6. `/passwort-neu` **ohne** Recovery-Session direkt aufrufen → Redirect auf `/passwort-vergessen?fehler=link`.

**Signup-Gate-Regression:**
7. `/signup` → Vollbild-Bühne bleibt; Aufdeck-Icon zeigt **nach oben**; Desktop-Hoch-Scrollen klappt die Karte **nicht** mehr zu; Tab vor dem Aufdecken landet **nicht** in den versteckten Feldern (inert).

**A11y / reduced-motion:**
8. Mit „Bewegung reduzieren" bleibt alles im Fluss und sichtbar (Login, Signup, Reset) — nichts versteckt, keine Animation.

**Visuelles Gate:** Stefans iPhone-Check am Live-Deploy (per Projekt-Konvention das eigentliche Abnahme-Gate). Kein Desktop-Browser-Verifikations-Subagent.

---

## Self-Review

- **Spec-Abdeckung:** P1 Gate → Task 8; P1 Icon → Task 9; P1 Reset → Tasks 2–6; P2 a11y-Fokus → Task 8 (Login via Entkopplung, Signup via `inert`); P2 Kontrast → Task 10; Minor Autofocus → Task 6; Minor Show/Hide → Tasks 1/6/7; Minor Wheel → Task 9; Minor Gold-Doppel → Task 6 (muted Link). Alle Critique-Punkte gemappt.
- **Typkonsistenz:** `ResetRequestState`/`AuthState` in Task 3 definiert, in Tasks 4/5 identisch konsumiert; `PasswordInput`-Interface = `Input`-Props, in 5/6/7 gleich verwendet; `requestPasswordResetAction`/`updatePasswordAction`/`exchangeCodeForSession`-Namen durchgängig.
- **Prerequisite nicht vergessen:** Supabase-Redirect-URL-Allowlist + SMTP (Global Constraints) — ohne die scheitert der E-Mail-Schritt, nicht der Code.
