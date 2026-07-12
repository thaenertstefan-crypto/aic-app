# Wants-Sternschmiede Feedback-Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die drei Wants-Screens (Sterne, Sternschmiede, Sternsuche) gemäß Nutzer-Feedback nachschärfen: klarere Aufgabenteilung, hochwertiger View-Transition-Übergang, konsistente Sprache, wertorientiertere Funken.

**Architecture:** Reine Frontend-Änderung in Next.js 16 App Router. Bets ziehen von `/me/wants` in `/me/wants/schmiede`. Der Übergang nutzt Reacts `<ViewTransition>` (Next-16-Feature) mit richtungsgebundenen Transition-Types; programmatische `router.push`-Navigation umgeht den globalen Overlay-Spinner und speist stattdessen einen In-Button-Spinner. Der AI-System-Prompt der Schmiede wird um eine Werte-Aufteilung ergänzt. Keine DB-/Schema-Änderungen.

**Tech Stack:** Next.js 16.2.9, React 19 (canary via App Router), TypeScript, TailwindCSS, shadcn/ui, lucide-react.

## Global Constraints

- **Sprache:** Alle nutzersichtbaren Texte Deutsch, warm/ermutigend, informelles „du".
- **Mobile-first:** Zielviewport ~375px.
- **Next 16 Gotcha:** `cookies()`, `headers()`, `params`, `searchParams` sind async → `await`. (In diesem Plan nur relevant, falls neue Server-Reads dazukommen.)
- **View-Transition-Import:** `import { ViewTransition } from "react"` (so dokumentiert in `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`). Falls der Typecheck den Export nicht kennt: auf `import { unstable_ViewTransition as ViewTransition } from "react"` ausweichen. Diese Entscheidung EINMAL in Task 1 treffen und in allen folgenden Tasks identisch verwenden.
- **Feste CSS-Klassennamen für den Übergang** (müssen zwischen globals.css und den Komponenten exakt übereinstimmen):
  - Inhalt: `forge-in-up`, `forge-in-down`, `forge-out-up`, `forge-out-down`
  - Header-Enter (nur Fade): `forge-header-in` — Header-Exit nutzt dieselben `forge-out-up`/`forge-out-down` wie der Inhalt.
- **Transition-Types:** vorwärts (wants→schmiede) = `"forge-down"`, zurück (schmiede→wants) = `"forge-up"`.
- **Verifikation je Task:** `npx eslint <geänderte Dateien>` und `npx tsc --noEmit` müssen fehlerfrei sein. Manuelle Checks laufen gegen den Dev-Server (`npm run dev`, Viewport 375px). Es gibt KEIN Unit-Test-Framework — keine `*.test.ts` erfinden.
- **Copy-Regel P7:** „Audit" → „Sternsuche"; die Marker-Wörter „Yin"/„Yang" streichen (beschreibende Titel bleiben). Interne Bezeichner (`saveYinYangEntryAction`, Phasen `"yin"`/`"yang"`, Formularfelder) NICHT umbenennen.

---

## Task 1: View-Transition-Fundament (Config + CSS)

**Files:**
- Modify: `next.config.ts`
- Modify: `app/globals.css` (ans Ende anhängen)

**Interfaces:**
- Produces: die CSS-Klassen `forge-in-up|down`, `forge-out-up|down`, `forge-header-in` als View-Transition-Animationen; das aktivierte Flag `experimental.viewTransition`. Alle folgenden Tasks referenzieren diese Klassen.

- [ ] **Step 1: Flag in next.config.ts ergänzen**

`next.config.ts` — das `nextConfig`-Objekt bekommt oben (vor `async headers()`) einen `experimental`-Block:

```ts
const nextConfig: NextConfig = {
  experimental: {
    // Aktiviert Reacts <ViewTransition> für den Sternschmiede-Übergang.
    viewTransition: true,
  },
  // Basis-Härtung für alle Responses. …
  async headers() {
```

- [ ] **Step 2: Import-Variante von ViewTransition verifizieren**

Lege temporär eine Prüf-Datei an oder nutz einen bestehenden Client-Component-Kontext, um den Import zu testen. Am einfachsten in Task 2 mitprüfen. Für jetzt: entscheide anhand `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` (Zeile ~48) → dokumentiert ist `import { ViewTransition } from 'react'`. Diese Variante als Default festhalten.

- [ ] **Step 3: Übergangs-CSS an globals.css anhängen**

Ans Ende von `app/globals.css`:

```css
/* ── Sternschmiede-Übergang (View Transitions) ─────────────────────────
   Vorwärts (forge-down): alte Seite slidet hoch raus, neue slidet von
   unten rein. Zurück (forge-up): gespiegelt. Header: alt slidet mit dem
   Inhalt, neu fadet nur ein (forge-header-in). */

::view-transition-old(.forge-out-up) {
  animation:
    220ms ease-in both forge-slide-up-out,
    160ms ease-in both forge-fade-out;
}
::view-transition-old(.forge-out-down) {
  animation:
    220ms ease-in both forge-slide-down-out,
    160ms ease-in both forge-fade-out;
}
::view-transition-new(.forge-in-up) {
  animation:
    320ms cubic-bezier(0.22, 1, 0.36, 1) 60ms both forge-slide-up-in,
    260ms ease-out 60ms both forge-fade-in;
}
::view-transition-new(.forge-in-down) {
  animation:
    320ms cubic-bezier(0.22, 1, 0.36, 1) 60ms both forge-slide-down-in,
    260ms ease-out 60ms both forge-fade-in;
}
/* Neuer Header: nur langsam einfaden, kein Slide. */
::view-transition-new(.forge-header-in) {
  animation: 380ms ease-out 120ms both forge-fade-in;
}

@keyframes forge-slide-up-out { to { transform: translateY(-24px); } }
@keyframes forge-slide-down-out { to { transform: translateY(24px); } }
@keyframes forge-slide-up-in { from { transform: translateY(28px); } }
@keyframes forge-slide-down-in { from { transform: translateY(-28px); } }
@keyframes forge-fade-out { to { opacity: 0; } }
@keyframes forge-fade-in { from { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*),
  ::view-transition-group(*) {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
}
```

- [ ] **Step 4: Lint + Typecheck**

Run: `npx eslint next.config.ts` → Expected: clean.
Run: `npx tsc --noEmit` → Expected: clean (CSS wird nicht typgeprüft; das Flag ist gültig).

- [ ] **Step 5: Dev-Smoke**

Run: `npm run dev`, App öffnen. Expected: App startet ohne Fehler; noch keine sichtbare Verhaltensänderung (Klassen sind noch ungenutzt).

- [ ] **Step 6: Commit**

```bash
git add next.config.ts app/globals.css
git commit -m "feat(wants): View-Transition-Fundament (Flag + Übergangs-CSS)"
```

---

## Task 2: SubPageHeader — Header-Übergang + backTransitionTypes

**Files:**
- Modify: `components/layout/sub-page-header.tsx`

**Interfaces:**
- Consumes: CSS-Klassen `forge-out-up/down`, `forge-header-in` (Task 1).
- Produces: `SubPageHeader` akzeptiert neue optionale Prop `backTransitionTypes?: string[]`, die an den Zurück-`<Link>` als `transitionTypes` durchgereicht wird. Der `<header>` ist in ein `<ViewTransition>` gehüllt (Exit = Slide mit Inhalt, Enter = Fade), `default="none"`.

- [ ] **Step 1: SubPageHeader umschreiben**

Vollständiger neuer Inhalt von `components/layout/sub-page-header.tsx`:

```tsx
import { ViewTransition } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface SubPageHeaderProps {
  backHref: string;
  title: string;
  subtitle?: string;
  /** Optionaler rechtsbündiger Slot, z.B. ein Info-Icon. */
  action?: React.ReactNode;
  /** View-Transition-Typen für die Zurück-Navigation (z.B. ["forge-up"]). */
  backTransitionTypes?: string[];
}

export function SubPageHeader({
  backHref,
  title,
  subtitle,
  action,
  backTransitionTypes,
}: SubPageHeaderProps) {
  return (
    // Header animiert nur beim Sternschmiede-Übergang: alter Header slidet mit
    // dem Inhalt hoch/runter raus, neuer Header fadet ein. Alle anderen
    // Navigationen: default "none" → keine Animation.
    <ViewTransition
      enter={{ "forge-down": "forge-header-in", "forge-up": "forge-header-in", default: "none" }}
      exit={{ "forge-down": "forge-out-up", "forge-up": "forge-out-down", default: "none" }}
      default="none"
    >
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          marginTop: "calc(env(safe-area-inset-top, 0px) * -1)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <Link
            href={backHref}
            aria-label="Zurück"
            transitionTypes={backTransitionTypes}
            className="-ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-lg font-semibold text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </header>
    </ViewTransition>
  );
}
```

- [ ] **Step 2: Lint + Typecheck**

Run: `npx eslint components/layout/sub-page-header.tsx` → Expected: clean.
Run: `npx tsc --noEmit` → Expected: clean.

**Falls TS `transitionTypes` an `<Link>` nicht kennt:** die lokale Doku prüfen (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`, Abschnitt `transitionTypes`). Ist die Prop dort dokumentiert aber nicht typisiert, den Wert nur setzen, wenn vorhanden: `{...(backTransitionTypes ? { transitionTypes: backTransitionTypes } : {})}`.
**Falls TS `ViewTransition` aus `react` nicht kennt:** auf `import { unstable_ViewTransition as ViewTransition } from "react"` wechseln (siehe Global Constraints) und diese Variante ab hier überall nutzen.

- [ ] **Step 3: Dev-Smoke bestehender Sub-Pages**

Run: `npm run dev`. Öffne z.B. `/me/values` und `/me/wants`. Expected: Header rendert normal; normale Navigation (Bottom-Nav, Zurück) zeigt KEINE ungewollte Animation (default "none").

- [ ] **Step 4: Commit**

```bash
git add components/layout/sub-page-header.tsx
git commit -m "feat(layout): SubPageHeader-Übergang (Header-Fade) + backTransitionTypes"
```

---

## Task 3: Intro-Karten für die Sternschmiede

**Files:**
- Modify: `lib/utils/recipe-intros.ts`

**Interfaces:**
- Produces: `getRecipeIntro("sternschmiede")` liefert die Info-Karten für den Schmiede-Header (Task 4).

- [ ] **Step 1: Neuen Intro-Eintrag ergänzen**

In `lib/utils/recipe-intros.ts` im `RECIPE_INTROS`-Objekt einen Eintrag `sternschmiede` hinzufügen (z.B. direkt nach dem `wants`-Block):

```ts
  sternschmiede: [
    {
      title: "Willkommen in der Sternschmiede",
      body: "Hier schlägst du Funken — kleine, risikofreie Experimente, mit denen du Neues (oder längst Vergessenes) ausprobierst. Aus manchem Funken wird ein neuer Stern.",
    },
    {
      title: "Wie ein Funke entsteht",
      body: "Du erzählst mir, was dir als Kind Spaß gemacht hat (optional) — und ich schlage dir ein paar Funken vor, die zu deinen Werten und deinen Sternen passen. Du nimmst mit, was dich neugierig macht, probierst es im Alltag aus und reflektierst danach kurz, was der Funke dir gezeigt hat.",
    },
    {
      title: "Auch ohne Sterne?",
      body: "Klar. Du brauchst keine bestätigten Sterne, um Funken zu schlagen — ein Funke kann selbst der Anfang sein. Manchmal weiß man einfach nicht, was man will; genau dafür ist dieser Ort da.",
    },
  ],
```

- [ ] **Step 2: Lint + Typecheck**

Run: `npx eslint lib/utils/recipe-intros.ts` → Expected: clean.
Run: `npx tsc --noEmit` → Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/utils/recipe-intros.ts
git commit -m "feat(wants): Intro-Karten für die Sternschmiede (Info-Button)"
```

---

## Task 4: Sternschmiede — Bets-Landing, Info-Button, Übergang, done-Merge

**Files:**
- Modify: `app/(app)/me/wants/schmiede/page.tsx`
- Modify: `app/(app)/me/wants/schmiede/sternschmiede.tsx`

**Interfaces:**
- Consumes: `getRecipeIntro("sternschmiede")` (Task 3); `SubPageHeader` `backTransitionTypes` (Task 2); CSS-Klassen (Task 1); `saveBetsAction`, `BetItem`, `getWantsData` (bestehend).
- Produces: `Sternschmiede`-Komponente nimmt neue Prop `initialBets: BetItem[]`; verwaltet Bets optimistisch; zeigt sie auf der Intro/Landing-Ansicht.

- [ ] **Step 1: page.tsx — initialBets laden & übergeben**

Vollständiger neuer Inhalt von `app/(app)/me/wants/schmiede/page.tsx`:

```tsx
import { getWantsData } from "@/app/(app)/recipes/wants/actions";

import { Sternschmiede } from "./sternschmiede";

export default async function SternschmiedePage() {
  const { data } = await getWantsData();
  const hasSterne = (data?.wants ?? []).some((w) => w.active);

  return (
    <Sternschmiede hasSterne={hasSterne} initialBets={data?.bets ?? []} />
  );
}
```

- [ ] **Step 2: sternschmiede.tsx — Imports & Props erweitern**

Import-Block am Dateikopf ersetzen/ergänzen. Neu importiert werden: `ViewTransition` (react), `Check`, `FlaskConical`, `Pencil` (lucide), `Link` (bereits da), `SectionLabel`, `IntroInfoButton`, `getRecipeIntro`, `useState` (bereits da). Der Import von `saveBetsAction` bleibt.

Ersetze die bestehenden Import-Zeilen 1–19 durch:

```tsx
"use client";

import { useState } from "react";
import { ViewTransition } from "react";
import Link from "next/link";
import { Check, Flame, FlaskConical, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionLabel } from "@/components/ui/section-label";
import { FormError } from "@/components/ui/form-error";
import { Reveal } from "@/components/ui/reveal";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { Mascot } from "@/components/brand/mascot";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { saveBetsAction } from "@/app/(app)/recipes/wants/actions";
import type { BetItem } from "@/lib/types/db-json";
import { cn } from "@/lib/utils";

const SCHMIEDE_INTRO_CARDS = getRecipeIntro("sternschmiede") ?? [];
```

- [ ] **Step 3: sternschmiede.tsx — Signatur, Bet-State & Persistenz**

Ersetze die Komponenten-Signatur und den State-Block (aktuell Zeilen ~40–51) so, dass `initialBets` reinkommt, ein Bet-State + optimistische Persistenz existiert und der Header den Info-Button + `backTransitionTypes` bekommt:

```tsx
export function Sternschmiede({
  hasSterne,
  initialBets,
}: {
  hasSterne: boolean;
  initialBets: BetItem[];
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  useScrollTopOnChange(phase);

  const [childAnswer, setChildAnswer] = useState("");
  const [comment, setComment] = useState("");
  const [funken, setFunken] = useState<DraftFunke[]>([]);
  const [newFunkeText, setNewFunkeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Bets leben jetzt hier (aus /me/wants hierher gezogen).
  const [bets, setBets] = useState<BetItem[]>(initialBets);
  const [betError, setBetError] = useState<string | null>(null);
  const [newBet, setNewBet] = useState("");

  const openBets = bets.filter((b) => b.status === "open");
  const triedBets = bets.filter((b) => b.status === "tried");

  const header = (
    <SubPageHeader
      backHref="/me/wants"
      title="Sternschmiede"
      backTransitionTypes={["forge-up"]}
      action={
        SCHMIEDE_INTRO_CARDS.length > 0 ? (
          <IntroInfoButton cards={SCHMIEDE_INTRO_CARDS} />
        ) : undefined
      }
    />
  );

  async function persistBets(updated: BetItem[]) {
    const previous = bets;
    setBets(updated);
    setBetError(null);
    const fd = new FormData();
    fd.set("bets", JSON.stringify(updated));
    fd.set("previousIds", JSON.stringify(previous.map((b) => b.id)));
    const res = await saveBetsAction({ error: null }, fd);
    if (res.error) {
      setBets(previous);
      setBetError(res.error);
    } else if (res.bets) {
      setBets(res.bets);
    }
  }

  function addBet() {
    const text = newBet.trim();
    if (!text) return;
    setNewBet("");
    void persistBets([
      ...bets,
      {
        id: crypto.randomUUID(),
        text,
        wantId: null,
        status: "open",
        journalEntryId: null,
        source: "own",
      },
    ]);
  }

  function deleteBet(id: string) {
    void persistBets(bets.filter((b) => b.id !== id));
  }
```

> Die bestehende `const header = <SubPageHeader … />;`-Zeile darunter (alt) ENTFERNEN — sie wird durch die neue `header`-Konstante oben ersetzt.

- [ ] **Step 4: sternschmiede.tsx — saveFunken merged neue Bets & kehrt zur Landing zurück**

In `saveFunken` (nach erfolgreichem Speichern) die gewählten Funken in den lokalen `bets`-State mergen und statt `setPhase("done")` weiterhin `done` zeigen — aber die Bets sind schon gemergt. Ersetze im `try`-Block den Erfolgszweig:

```tsx
      const result = await saveBetsAction({ error: null }, fd);
      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Frisch geschlagene Funken sofort in die Landing-Liste übernehmen.
      setBets((prev) => [...prev, ...items]);
      setPhase("done");
```

(Die `items`-Berechnung oben in `saveFunken` bleibt unverändert.)

- [ ] **Step 5: sternschmiede.tsx — done-Phase führt zurück in die Schmiede-Landing**

Ersetze den Button-Block der `done`-Phase (aktuell „Zu deinen Sternen") durch primär „Zu deinen Funken" (zurück auf die Landing) + sekundär „Zu deinen Sternen":

```tsx
          <div className="flex w-full flex-col gap-3 pt-2">
            <Button className="w-full" size="lg" onClick={() => setPhase("intro")}>
              Zu deinen Funken
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              render={<Link href="/me/wants" />}
            >
              Zu deinen Sternen
            </Button>
          </div>
```

- [ ] **Step 6: sternschmiede.tsx — Bets-Sektion in die Intro/Landing einbauen + ViewTransition-Wrapper**

In der Intro-Phase (der finale `return (...)` am Dateiende) den Inhalt in einen `<ViewTransition>`-Wrapper hüllen und die Bets-Sektion zwischen Willkommens-Block und Kind-Frage-Karte einsetzen. Ersetze den kompletten `return`-Block der Intro-Phase durch:

```tsx
  // ── Intro + Bets + Kind-Frage (Einstieg / Landing) ──────────────
  return (
    <div className="flex min-h-svh flex-col">
      {header}
      <ViewTransition
        enter={{ "forge-down": "forge-in-up", "forge-up": "forge-in-down", default: "none" }}
        exit={{ "forge-down": "forge-out-up", "forge-up": "forge-out-down", default: "none" }}
        default="none"
      >
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression="smile" size="md" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Willkommen in der Sternschmiede
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Hier schlägst du Funken — kleine, risikofreie Experimente, mit denen
              du Neues (oder längst Vergessenes) ausprobierst. Aus manchem Funken
              wird ein neuer Stern.
            </p>
            {!hasSterne && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Du hast noch keine Sterne bestätigt — kein Problem, ein Funke kann
                trotzdem der Anfang sein.
              </p>
            )}
          </div>

          {/* ── Nach den Sternen greifen (Bets leben jetzt hier) ── */}
          {(openBets.length > 0 || triedBets.length > 0) && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Nach den Sternen greifen
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Deine Funken — kleine Experimente. Nach jedem reflektierst du kurz,
                was er dir gezeigt hat.
              </p>

              {openBets.length > 0 && (
                <div className="flex flex-col gap-3">
                  {openBets.map((bet) => (
                    <Card key={bet.id} className="w-full">
                      <CardContent className="space-y-3 pt-(--card-spacing)">
                        <p className="text-base leading-relaxed text-foreground">
                          {bet.text}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="gap-2"
                            render={<Link href={`/me/wants/reflect/${bet.id}`} />}
                          >
                            <FlaskConical className="size-4" /> Ausprobiert? Reflektieren
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={() => deleteBet(bet.id)}
                          >
                            Verwerfen
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {triedBets.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  <SectionLabel>Schon gegriffen</SectionLabel>
                  {triedBets.map((bet) => (
                    <div
                      key={bet.id}
                      className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="flex-1 text-sm leading-relaxed text-muted-foreground">
                        {bet.text}
                      </span>
                      {bet.journalEntryId && (
                        <Link
                          href="/journal"
                          className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Reflexion
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-2">
                <Input
                  value={newBet}
                  onChange={(e) => setNewBet(e.target.value)}
                  placeholder="Eigener Funke, z. B. „Einmal zum Bouldern gehen“"
                  maxLength={300}
                  aria-label="Eigenen Funken hinzufügen"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBet();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label="Funken hinzufügen"
                  disabled={!newBet.trim()}
                  onClick={addBet}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <FormError message={betError} />
            </section>
          )}

          {/* ── Neue Funken schlagen ── */}
          <Card className="w-full">
            <CardContent className="space-y-3 pt-(--card-spacing)">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Was hat dir als Kind Spaß gemacht?
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Etwas, das dir vielleicht immer noch Spaß machen könnte? Optional —
                aber es hilft mir, bessere Funken für dich zu schlagen.
              </p>
              <Textarea
                value={childAnswer}
                onChange={(e) => setChildAnswer(e.target.value)}
                placeholder="Zum Beispiel: stundenlang Höhlen aus Decken bauen, Fußball auf der Straße, Geschichten erfinden …"
                rows={3}
                maxLength={800}
                className="min-h-[80px] resize-y"
                aria-label="Was dir als Kind Spaß gemacht hat (optional)"
              />
            </CardContent>
          </Card>

          <FormError message={error} />

          <Button className="w-full gap-2" size="lg" onClick={() => void forge()}>
            <Flame className="size-4" /> Funken schlagen
          </Button>
          <div className="h-8" />
        </div>
      </ViewTransition>
    </div>
  );
}
```

> Hinweis: Der alte Intro-`return` importierte `Sparkles` bereits; `Check`, `FlaskConical`, `SectionLabel`, `Input` kommen über Step 2 dazu. Die Phasen `forging`/`funken`/`done` bleiben unverändert (bis auf Step 4/5).

- [ ] **Step 7: Lint + Typecheck**

Run: `npx eslint app/(app)/me/wants/schmiede/page.tsx app/(app)/me/wants/schmiede/sternschmiede.tsx` → Expected: clean.
Run: `npx tsc --noEmit` → Expected: clean.

- [ ] **Step 8: Manuelle Prüfung**

Run: `npm run dev`, öffne `/me/wants/schmiede` (Viewport 375px). Expected:
- Header zeigt rechts ein Info-Icon; Klick öffnet das Schmiede-Intro (3 Karten).
- Falls offene Bets existieren: Sektion „Nach den Sternen greifen" mit „Reflektieren"/„Verwerfen" erscheint über der Kind-Frage. (Testdaten: vorher auf `/me/wants` — vor dessen Umbau — bzw. via Schmiede „Funken schlagen" → mitnehmen.)
- „Funken schlagen" → Auswahl → „mitnehmen": danach zeigt „done"; „Zu deinen Funken" führt zurück auf die Landing, wo die neuen Funken jetzt gelistet sind.

- [ ] **Step 9: Commit**

```bash
git add "app/(app)/me/wants/schmiede/page.tsx" "app/(app)/me/wants/schmiede/sternschmiede.tsx"
git commit -m "feat(wants): Sternschmiede beheimatet Bets + Info-Button + Übergang"
```

---

## Task 5: Sterne-Seite entschlacken + Übergangs-Button

**Files:**
- Modify: `app/(app)/me/wants/page.tsx`
- Modify: `app/(app)/me/wants/wants-me.tsx`

**Interfaces:**
- Consumes: CSS-Klassen (Task 1); `SubPageHeader` (Task 2); `saveWantsAction`, `WantItem`, `getWantsData` (bestehend); `router.push(href, { transitionTypes })` (Next 16).
- Produces: `WantsMe` nimmt nur noch `{ initialWants, introSeen }` (kein `initialBets` mehr).

- [ ] **Step 1: page.tsx — initialBets nicht mehr übergeben**

Vollständiger neuer Inhalt von `app/(app)/me/wants/page.tsx`:

```tsx
import { getWantsData } from "@/app/(app)/recipes/wants/actions";

import { WantsMe } from "./wants-me";

export default async function MeWantsPage() {
  const { data } = await getWantsData();

  return (
    <WantsMe
      initialWants={data?.wants ?? []}
      introSeen={data?.introSeen ?? true}
    />
  );
}
```

- [ ] **Step 2: wants-me.tsx komplett ersetzen**

Vollständiger neuer Inhalt von `app/(app)/me/wants/wants-me.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { ViewTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, Loader2, Pencil, Plus, RefreshCw, Sparkles, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { RecipeIntroGate } from "@/components/recipes/recipe-intro-gate";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { Mascot } from "@/components/brand/mascot";
import { StarArt } from "@/components/brand/star-art";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { PAGE_TITLES } from "@/lib/content/labels";
import { saveWantsAction } from "@/app/(app)/recipes/wants/actions";
import { getValueLabel } from "@/lib/utils/values-bank";
import type { WantItem } from "@/lib/types/db-json";

const INTRO_CARDS = getRecipeIntro("wants") ?? [];
const FORGE_HREF = "/me/wants/schmiede";

export function WantsMe({
  initialWants,
  introSeen,
}: {
  initialWants: WantItem[];
  introSeen: boolean;
}) {
  const [wants, setWants] = useState<WantItem[]>(initialWants);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newWant, setNewWant] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const reduced = useReducedMotion();
  const router = useRouter();
  const [forging, startForge] = useTransition();

  const activeWants = wants.filter((w) => w.active);
  const hasSterne = activeWants.length > 0;

  async function persistWants(updated: WantItem[]) {
    const previous = wants;
    setWants(updated);
    setSaveError(null);
    const fd = new FormData();
    fd.set("wants", JSON.stringify(updated));
    fd.set("previousIds", JSON.stringify(previous.map((w) => w.id)));
    const res = await saveWantsAction({ error: null }, fd);
    if (res.error) {
      setWants(previous);
      setSaveError(res.error);
    } else if (res.wants) {
      setWants(res.wants);
    }
  }

  function addWant() {
    const text = newWant.trim();
    if (!text) return;
    setNewWant("");
    void persistWants([
      ...wants,
      { id: crypto.randomUUID(), text, active: true, valueId: null, source: "own" },
    ]);
  }

  function startEdit(w: WantItem) {
    setEditingId(w.id);
    setEditText(w.text);
  }

  function saveEdit() {
    const t = editText.trim();
    if (!t || !editingId) return;
    void persistWants(wants.map((w) => (w.id === editingId ? { ...w, text: t } : w)));
    setEditingId(null);
  }

  function deleteWant(id: string) {
    void persistWants(wants.filter((w) => w.id !== id));
  }

  // Programmatische Navigation → globaler NavigationSpinner feuert NICHT;
  // `forging` (isPending) treibt den Spinner IM Button. transitionTypes
  // aktiviert den vertikalen View-Transition-Slide.
  function goToForge() {
    startForge(() => {
      router.push(FORGE_HREF, { transitionTypes: ["forge-down"] });
    });
  }

  const forgeBridge = (
    <section className="space-y-3 rounded-2xl bg-primary/5 p-5 text-center">
      <Flame className="mx-auto size-6 text-primary" />
      <h2 className="font-heading text-lg font-semibold text-foreground">
        Noch nicht sicher, was dich zum Leuchten bringt?
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Manchmal steckt man in der Routine fest und will endlich wieder etwas
        Neues ausprobieren — weiß aber nicht was. In der Sternschmiede schlägst du
        Funken: kleine Wetten, aus denen ein neuer Stern werden könnte.
      </p>
      <Button className="w-full gap-2" size="lg" disabled={forging} onClick={goToForge}>
        {forging ? <Loader2 className="size-4 animate-spin" /> : <Flame className="size-4" />}
        Zur Sternschmiede
      </Button>
    </section>
  );

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader
        backHref="/me"
        title={PAGE_TITLES.meWants}
        action={
          INTRO_CARDS.length > 0 ? <IntroInfoButton cards={INTRO_CARDS} /> : undefined
        }
      />

      <RecipeIntroGate slug="wants" cards={INTRO_CARDS} introSeen={introSeen}>
        <ViewTransition
          enter={{ "forge-down": "forge-in-up", "forge-up": "forge-in-down", default: "none" }}
          exit={{ "forge-down": "forge-out-up", "forge-up": "forge-out-down", default: "none" }}
          default="none"
        >
          <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col">
            {!reduced && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-0 h-64"
                style={{
                  backgroundImage:
                    "radial-gradient(closest-side, color-mix(in srgb, var(--primary) 14%, transparent), transparent 72%)",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "50% 0%",
                  backgroundSize: "85% 60%",
                }}
              />
            )}

            <div className="relative z-10 flex flex-1 flex-col gap-6 px-4 py-6">
              {!hasSterne ? (
                // ── Leer-Zustand: Sternsuche ODER direkt in die Schmiede ──
                <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
                  <Mascot expression="curious" size="lg" />
                  <div className="space-y-2">
                    <h2 className="font-heading text-xl font-semibold text-foreground">
                      Noch keine Sterne entdeckt
                    </h2>
                    <p className="text-base leading-relaxed text-muted-foreground">
                      Finde mit der Sternsuche heraus, was du wirklich willst — in
                      etwa 10 Minuten. Oder schlag in der Sternschmiede ein paar
                      Funken, wenn du einfach mal etwas Neues ausprobieren willst.
                    </p>
                  </div>
                  <Button className="w-full gap-2" size="lg" render={<Link href="/me/wants/journey" />}>
                    <Star className="size-4" /> Sternsuche starten
                  </Button>
                  {forgeBridge}
                </div>
              ) : (
                <>
                  <Reveal delay={0}>
                    <div className="flex flex-col items-center gap-3 pb-2 text-center">
                      <StarArt animate={!reduced} className="size-16" />
                      <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                        {PAGE_TITLES.meWantsHero}
                      </h2>
                      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                        Die Sterne, nach denen du greifst — was dich lebendig macht.
                      </p>
                    </div>
                  </Reveal>

                  <FormError message={saveError} />

                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Star className="size-5 text-primary" />
                      <h2 className="font-heading text-lg font-semibold text-foreground">
                        Meine Sterne
                      </h2>
                    </div>

                    <div className="flex flex-col gap-3">
                      {activeWants.map((want) => (
                        <Card key={want.id} className="w-full">
                          <CardContent className="space-y-2 pt-(--card-spacing)">
                            <div className="flex items-start gap-2.5">
                              <Star className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                              <p className="flex-1 text-base leading-relaxed text-foreground">
                                {want.text}
                              </p>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-muted-foreground"
                                onClick={() => startEdit(want)}
                                aria-label="Want bearbeiten"
                              >
                                <Pencil className="size-4" />
                              </Button>
                            </div>
                            {want.valueId && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                <Sparkles className="size-3" />
                                nährt deinen Wert: {getValueLabel(want.valueId)}
                              </span>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="flex items-start gap-2">
                      <Textarea
                        value={newWant}
                        onChange={(e) => setNewWant(e.target.value)}
                        placeholder="Was zieht dich an? Z. B. „Mir macht … Spaß“ oder „Ich will …“"
                        maxLength={300}
                        rows={2}
                        className="min-h-[52px] flex-1 resize-y"
                        aria-label="Eigenes Want hinzufügen"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="mt-1 shrink-0"
                        aria-label="Want hinzufügen"
                        disabled={!newWant.trim()}
                        onClick={addWant}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </section>

                  <hr className="border-border" />

                  {/* Sternsuche erneut — steht ÜBER der Brücke */}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    render={<Link href="/me/wants/journey" />}
                  >
                    <RefreshCw className="size-4" /> Sternsuche nochmal machen
                  </Button>

                  {/* Brücke in die Sternschmiede */}
                  {forgeBridge}
                </>
              )}

              {/* Bearbeiten-Dialog: Want umformulieren oder löschen */}
              <Dialog
                open={editingId !== null}
                onOpenChange={(open) => {
                  if (!open) setEditingId(null);
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Want bearbeiten</DialogTitle>
                  </DialogHeader>
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    autoFocus
                    className="resize-y"
                    aria-label="Text des Wants"
                  />
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      className="sm:mr-auto"
                      onClick={() => {
                        if (editingId) deleteWant(editingId);
                        setEditingId(null);
                      }}
                    >
                      Want löschen
                    </Button>
                    <DialogClose render={<Button variant="outline" />}>Abbrechen</DialogClose>
                    <Button onClick={saveEdit} disabled={!editText.trim()}>
                      Speichern
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </ViewTransition>
      </RecipeIntroGate>
    </div>
  );
}
```

- [ ] **Step 3: Lint + Typecheck**

Run: `npx eslint "app/(app)/me/wants/page.tsx" "app/(app)/me/wants/wants-me.tsx"` → Expected: clean.
Run: `npx tsc --noEmit` → Expected: clean.

**Falls TS `transitionTypes` in den `router.push`-Optionen nicht kennt:** lokale Doku prüfen (`node_modules/next/dist/docs/01-app/03-api-reference/functions/use-router.md`). Ist es dokumentiert, aber untypisiert, die Options als schmales Objekt casten: `router.push(FORGE_HREF, { transitionTypes: ["forge-down"] } as { transitionTypes: string[] })` bzw. gemäß Doku-Signatur.

- [ ] **Step 4: Manuelle Prüfung (Kern des Feedbacks)**

Run: `npm run dev`, Viewport 375px.
- `/me/wants` **mit** Sternen: kein Kompass-Link mehr; KEINE Bets-Sektion; „Sternsuche nochmal machen" steht ÜBER der Brücke; keine Wisch-Geste.
- `/me/wants` **ohne** Sterne (Testaccount ohne Wants): Mascot + „Sternsuche starten" + darunter die Brücke.
- Klick auf „Zur Sternschmiede": Button zeigt kurz einen Spinner (kein zentraler Overlay-Spinner); Inhalt slidet hoch raus, Schmiede-Inhalt slidet von unten rein, der Schmiede-Header **fadet** ein.
- In der Schmiede „Zurück" (Header-Pfeil): gespiegelter Slide zurück.
- Mit aktivem „Reduce Motion" (OS-Setting): sofortiger Swap ohne Slide.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/me/wants/page.tsx" "app/(app)/me/wants/wants-me.tsx"
git commit -m "feat(wants): Sterne-Seite entschlackt + View-Transition-Übergang"
```

---

## Task 6: Sternsuche-Copy (Yin/Yang-Wörter + Audit)

**Files:**
- Modify: `app/(app)/me/wants/journey/wants-journey.tsx`

**Interfaces:**
- Keine Signaturänderung. Nur nutzersichtbare Strings.

- [ ] **Step 1: Yin/Yang-Marker & „Audit" ersetzen**

Folgende exakten String-Ersetzungen in `wants-journey.tsx` (Zeilennummern als Orientierung; per Textsuche ersetzen):

1. `AI_FALLBACK_MESSAGE` (~Z. 42): „Das Destillieren hat gerade nicht geklappt. Dein Audit ist gespeichert — du kannst deine Wants auch selbst formulieren." → „… Deine Sternsuche ist gespeichert — du kannst deine Wants auch selbst formulieren."
2. Offline-Meldung in `handleAuditSubmit` (~Z. 255): „Du bist offline – dein Audit wurde als Entwurf gesichert. Sobald du wieder online bist, kannst du es abschließen." → „… deine Sternsuche wurde als Entwurf gesichert. …"
3. Netzwerkfehler-Meldung (~Z. 285): „Speichern fehlgeschlagen – dein Audit wurde als Entwurf gesichert. Versuch es später noch einmal." → „… deine Sternsuche wurde als Entwurf gesichert. …"
4. Analyzing-Copy (~Z. 464): „Ich schaue, was dein Audit über deine Wants verrät …" → „Ich schaue, was deine Sternsuche über deine Wants verrät …"
5. Sterne-Screen-Text (~Z. 526, im `manualMode ? … : …`): „Das lese ich aus deinem Audit heraus — deine Sterne. …" → „Das lese ich aus deiner Sternsuche heraus — deine Sterne. …"
6. Yin-Überschrift (~Z. 831): „Yin — Wofür nimmst du Mühsal in Kauf?" → „Wofür nimmst du Mühsal in Kauf?"
7. Yang-Zurück-Button (~Z. 807): „Zurück zu Yin" → „Zurück".

> Die Yang-Überschrift „Was bringt dich zum Leuchten?" (~Z. 712) enthält kein Yin/Yang und bleibt. Interne Phasen `"yin"`/`"yang"`, Formularfelder `yin`/`yang`, `saveYinYangEntryAction`, `useFormDraft("wants-audit")` bleiben unverändert (nicht nutzersichtbar).

- [ ] **Step 2: Restliche „Audit"-Vorkommen prüfen**

Run: `npx eslint "app/(app)/me/wants/journey/wants-journey.tsx"` und zusätzlich Textsuche:

```bash
grep -n "Audit\|Yin\|Yang" "app/(app)/me/wants/journey/wants-journey.tsx"
```

Expected: Treffer nur noch in internen, nicht nutzersichtbaren Bezeichnern (`saveYinYangEntryAction`, Phase-Vergleiche `"yin"`/`"yang"`, `AnswerBoxes idPrefix="yin"/"yang"`, Kommentare). Nutzersichtbare Copy enthält kein „Audit"/„Yin"/„Yang" mehr.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → Expected: clean.

- [ ] **Step 4: Manuelle Prüfung**

Run: `npm run dev`, `/me/wants/journey` durchklicken. Expected: Erste Frage heißt „Wofür nimmst du Mühsal in Kauf?"; Zurück-Button „Zurück"; Fehler-/Analyse-Texte sagen „Sternsuche" statt „Audit".

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/me/wants/journey/wants-journey.tsx"
git commit -m "feat(wants): Copy auf Sternsuche umgestellt, Yin/Yang-Wörter raus"
```

---

## Task 7: AI-Prompt — Funken stärker an Werten orientieren

**Files:**
- Modify: `lib/anthropic/prompts/sternschmiede.ts`

**Interfaces:**
- Keine Codesignatur-Änderung. Nur `SYSTEM_PROMPT`-Inhalt. Die Route [route.ts](../../../app/api/sternschmiede/route.ts) schickt Werte bereits mit — keine Route-Änderung.

- [ ] **Step 1: Aufgabe „funken" um Werte-Aufteilung erweitern**

In `lib/anthropic/prompts/sternschmiede.ts` den Aufgaben-Punkt 2 (`funken`) so ergänzen, dass Werte-Orientierung + Begründung geregelt sind. Ersetze den `funken`-Block (die Zeile „2. funken: …" bis vor „Ausgabeformat") durch:

```
2. funken: Schlage 3 bis 5 Funken vor. Für JEDEN Funken gilt:
   - text: EIN deutscher Satz (maximal 20 Wörter). Ein konkreter Aktivitäts-Typ, formuliert so, dass die Person die reale Instanz selbst in ihrer Nähe findet: „… in deiner Stadt", „… in einer Kletterhalle in deiner Nähe", „… online". Erlaubte Typen sind z. B.: Volkshochschul-/VHS-Kurs, YouTube-Tutorial, Schnupperstunde, Tag der offenen Tür, Online-Schulung, ein neuer Sport, ein Hobby wie Zeichnen oder Keramikmalen, eine Messe.
   - ERFINDE NIEMALS konkrete Veranstaltungsorte, Event-Namen, Adressen, Termine oder Preise — nur Aktivitäts-Kategorien, die es überall real gibt.
   - Kleiner Aufwand: ein Abend, eine Schnupperstunde, ein niederschwelliger erster Schritt innerhalb der nächsten ein bis zwei Wochen, ohne großes Geld, ohne Verpflichtung. NIE ein Wochen-Commitment oder Trainingsplan.
   - Funken, die von einem bestehenden Stern inspiriert sind, sind eine NEUE, angrenzende Idee — NIEMALS eine Umformulierung des Sterns. Ziel ist etwas Neues, das zum Konzept des Sterns passt und selbst ein neuer Stern werden könnte.
   - AUSGEWOGENHEIT: Wenn die Person bestätigte Werte hat, sollen MINDESTENS 2 der Funken primär von ihren WERTEN inspiriert sein (nicht von den Sternen) — also Aktivitäten, in denen sie einen ihrer Werte neu ausleben könnte. Die übrigen Funken dürfen an Sterne oder die Kind-Antwort anknüpfen. Sind KEINE Werte vorhanden, orientiere dich an Sternen und Kind-Antwort.
   - So konkret wie möglich innerhalb dieser Grenzen.
   - reason: NUR wenn es eine echte Verbindung zu Werten/Sternen/Kind-Antwort gibt, EIN Satz, der sie benennt. Knüpft der Funke an einen WERT an, benenne konkret, WIE die Aktivität diesen Wert nährt (nicht nur die Wants). Sonst null — erfinde keine Verbindung.
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → Expected: clean (nur String-Änderung).

- [ ] **Step 3: Manuelle Prüfung gegen echte Werte**

Run: `npm run dev`. Nutze einen Testaccount mit bestätigten Werten UND ein paar Sternen. `/me/wants/schmiede` → „Funken schlagen". Expected: Von den vorgeschlagenen Funken orientieren sich erkennbar ≥2 an den Werten; in mindestens einer `reason` steht, wie die Aktivität zu einem Wert passt (nicht nur zu den Wants).

- [ ] **Step 4: Commit**

```bash
git add lib/anthropic/prompts/sternschmiede.ts
git commit -m "feat(wants): Schmiede-Prompt balanciert Funken auf Werte + Wert-Begründung"
```

---

## Task 8: End-to-End-Sichtprüfung (Gate, kein Code)

**Files:** keine.

- [ ] **Step 1: Vollständiger Durchlauf**

Run: `npm run dev`, Viewport 375px, echter/Wegwerf-Account.
Checkliste (alle müssen zutreffen):
- [ ] `/me/wants` mit Sternen: kein „Dein Kompass zeigt hierhin"; keine „Nach den Sternen greifen"-Sektion; „Sternsuche nochmal machen" über der Brücke; keine Wisch-Reaktion beim Nach-unten-Wischen.
- [ ] `/me/wants` ohne Sterne: Brücke zur Schmiede sichtbar; „Sternsuche starten" führt in die Sternsuche.
- [ ] Übergang wants→schmiede: In-Button-Spinner statt Overlay; Inhalt slidet hoch/rein; Header fadet ein.
- [ ] Zurück schmiede→wants: gespiegelter Slide; kein hängender Overlay-Spinner.
- [ ] Schmiede: Info-Button im Header öffnet das Intro; Bets („Nach den Sternen greifen") leben hier inkl. Reflektieren/Verwerfen und „Schon gegriffen".
- [ ] Funken schlagen → mitnehmen → „done" → „Zu deinen Funken" zeigt die neuen Bets auf der Landing.
- [ ] Sternsuche: keine „Audit"/„Yin"/„Yang"-Wörter in der Copy.
- [ ] Reduce Motion aktiv: Übergänge swappen sofort, kein Slide.

- [ ] **Step 2: Finaler Build**

Run: `npm run build` → Expected: erfolgreicher Build (Typecheck + Lint als Teil des Builds), keine Fehler.

- [ ] **Step 3: Branch abschließen**

Verwende `superpowers:finishing-a-development-branch`, um Merge/PR/Cleanup zu wählen.

---

## Self-Review (vom Autor durchgeführt)

**Spec-Abdeckung:**
- P1 (Kompass-Link raus) → Task 5.
- P2 (Bets in die Schmiede) → Task 4 (Landing) + Task 5 (aus wants entfernt) + Task 5 page.tsx (kein initialBets).
- P3 (Swipe raus, „nach unten wischen" raus, „Sternsuche nochmal" über der Brücke) → Task 5.
- P4 (cooler Übergang, kein Overlay, Spinner im Button; Header alt slidet/neu fadet) → Task 1 (CSS/Flag) + Task 2 (Header) + Task 4/5 (Wrapper + Button).
- P5 (Info-Button in der Schmiede, Bets dort) → Task 3 (Intro-Karten) + Task 4.
- P6 (Weg in die Schmiede auch ohne Sterne) → Task 5 (Brücke im Leer-Zustand).
- P7 (Audit→Sternsuche; Yin/Yang-Wörter raus) → Task 5 (wants-Copy) + Task 6 (journey-Copy).
- P8 (Funken an Werten + Wert-Begründung) → Task 7.

**Platzhalter-Scan:** keine TBD/TODO/„handle edge cases" — alle Codeblöcke ausformuliert.

**Typ-Konsistenz:** CSS-Klassen (`forge-in-up/down`, `forge-out-up/down`, `forge-header-in`) identisch in Task 1, 2, 4, 5. `backTransitionTypes?: string[]` in Task 2 definiert, in Task 4 konsumiert. `WantsMe`-Props (`initialWants`, `introSeen`) konsistent zwischen Task 5 page.tsx und Komponente. `Sternschmiede`-Props (`hasSterne`, `initialBets`) konsistent zwischen Task 4 page.tsx und Komponente. `transitionTypes`-Wert `"forge-down"`/`"forge-up"` durchgehend gleich.
