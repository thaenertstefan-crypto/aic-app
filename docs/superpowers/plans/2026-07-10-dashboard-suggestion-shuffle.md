# Dashboard „Vorschlags-Shuffle" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Slot-Reel unter „…oder brauchst du gerade was anderes?" durch einen „Vorschlags-Shuffle" ersetzen: genau eine Gruppe von 3 Vorschlägen + stiller „Zeig mir was anderes"-Trigger, der mit gestaffelter Out/In-Motion die nächste Gruppe „hinlegt".

**Architecture:** Neue Client-Unterkomponente `SuggestionShuffle` (eigene Datei) kapselt Gruppierung (kuratierte Akut-Hilfen zuerst, dann feste Rotation), `groupIndex`-State und die Zwei-Phasen-Motion (out → swap → in). `daily-focus.tsx` rendert sie statt des Reels; die bestehende `useCrossfade`-Maschine des Tier-Wechsels bleibt unangetastet. Die `.alt-reel`-CSS-Maske wird entfernt.

**Tech Stack:** Next.js 16 App Router, React Client Component, TailwindCSS 4 + `tw-animate-css` (`animate-in`-Idiom wie in `components/dashboard/dashboard-reveal.tsx`), lucide-react Icons.

**Spec:** `docs/superpowers/specs/2026-07-10-dashboard-suggestion-shuffle-design.md`

## Global Constraints

- Alle User-facing Texte auf Deutsch, warm, informelles „du" (CLAUDE.md).
- `prefers-reduced-motion: reduce` ist Pflicht: sofortiger Austausch ohne Animation, Icon dreht nicht (PRODUCT.md). Hook: `useReducedMotion` aus `lib/hooks/use-reduced-motion`.
- One-Candle-Regel: der Trigger bleibt muted (`text-muted-foreground`), nie gold (DESIGN.md).
- Mobile-first, Ziel-Viewport ~375px.
- Kein Test-Framework im Repo — Verifikation über `npx tsc --noEmit -p tsconfig.json`, `npm run lint` und Browser-Sichtprüfung.
- Die bestehende Crossfade-Maschine (`useCrossfade` in `daily-focus.tsx`) darf nicht verändert werden.

---

### Task 1: `SuggestionShuffle`-Komponente

**Files:**
- Create: `components/dashboard/suggestion-shuffle.tsx`

**Interfaces:**
- Consumes: `type Destination = { key: string; sentence: string; href: string; badge?: string }` (type-only Import aus `components/dashboard/daily-focus.tsx` — Typ-Zyklen sind erasable, kein Runtime-Import-Zyklus); `useReducedMotion(): boolean` aus `@/lib/hooks/use-reduced-motion`; `cn` aus `@/lib/utils`.
- Produces: `export function SuggestionShuffle({ destinations }: { destinations: Destination[] }): JSX.Element` — Task 2 rendert genau diese Signatur.

- [ ] **Step 1: Komponente anlegen**

Vollständiger Datei-Inhalt für `components/dashboard/suggestion-shuffle.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { Destination } from "@/components/dashboard/daily-focus";

/** Akut-Hilfen zuerst — kuratierter Start der Rotation (siehe Spec). */
const CURATED_FIRST = ["overthinking", "confidence", "shadow"];
/** Vorschläge pro Gruppe. */
const GROUP_SIZE = 3;
/** Out-Phase einer Zeile (Fade + Float nach oben). */
const OUT_MS = 180;
/** In-Phase einer Zeile (Fade + Float von unten). */
const IN_MS = 250;
/** Versatz zwischen den Zeilen (Stagger), out wie in. */
const STAGGER_MS = 40;

/**
 * „Vorschlags-Shuffle": genau eine sichtbare 3er-Gruppe von Anlaufstellen plus
 * ein stiller „Zeig mir was anderes"-Trigger. Blättert zyklisch durch feste
 * Gruppen (deterministisch, kein Zufall) — Dialoggeste statt Menü-Navigation.
 *
 * Motion: beim Shuffle schweben die alten Zeilen gestaffelt nach oben raus
 * (Transition), nach dem Swap die neuen gestaffelt von unten rein
 * (animate-in, remount über den Gruppen-Key). Erst-Mount ist bewusst statisch:
 * das Einblenden des Gesamtblocks übernimmt die Crossfade-Maschine in
 * daily-focus.tsx. Reduced motion: sofortiger Austausch, Icon statisch.
 */
export function SuggestionShuffle({
  destinations,
}: {
  destinations: Destination[];
}) {
  const reduced = useReducedMotion();
  const [groupIndex, setGroupIndex] = useState(0);
  /** true während die alte Gruppe rausschwebt (blockiert Doppel-Taps). */
  const [leaving, setLeaving] = useState(false);
  /** Erst nach dem ersten Shuffle animieren Zeilen sich ein (kein Mount-Pop). */
  const [hasShuffled, setHasShuffled] = useState(false);
  /** Halbe Icon-Umdrehung pro Tap. */
  const [turns, setTurns] = useState(0);

  // Kuratierte Reihenfolge: Akut-Hilfen zuerst, Rest in Server-Reihenfolge.
  // destinations kommt bereits ohne die Primary-Empfehlung an.
  const ordered = [
    ...CURATED_FIRST.flatMap((key) => {
      const match = destinations.find((d) => d.key === key);
      return match ? [match] : [];
    }),
    ...destinations.filter((d) => !CURATED_FIRST.includes(d.key)),
  ];
  const groups: Destination[][] = [];
  for (let i = 0; i < ordered.length; i += GROUP_SIZE) {
    groups.push(ordered.slice(i, i + GROUP_SIZE));
  }
  // Modulo sichert gegen kürzere Listen nach einem Tier-Wechsel ab (die
  // Alternativen ändern sich, wenn die Primary-Empfehlung wechselt).
  const safeIndex = groups.length > 0 ? groupIndex % groups.length : 0;
  const group = groups[safeIndex] ?? [];
  const hasMultipleGroups = groups.length > 1;

  const shuffle = () => {
    if (leaving) return;
    setTurns((t) => t + 1);
    setHasShuffled(true);
    if (reduced) {
      setGroupIndex((i) => i + 1);
      return;
    }
    setLeaving(true);
    // Swap erst, wenn auch die letzte (gestaffelte) Zeile draußen ist; die
    // neuen Zeilen animieren sich über ihre animate-in-Klassen selbst ein.
    window.setTimeout(() => {
      setGroupIndex((i) => i + 1);
      setLeaving(false);
    }, OUT_MS + (GROUP_SIZE - 1) * STAGGER_MS);
  };

  return (
    <div className="space-y-2">
      {/* min-h hält 3 Zeilen frei, damit beim Wechsel auf eine kleinere
          Restgruppe (1–2 Einträge) nichts unter dem Block springt.
          aria-live kündigt die neue Gruppe Screenreadern an. */}
      <ul
        aria-live="polite"
        className={cn("space-y-2", hasMultipleGroups && "min-h-[142px]")}
      >
        {group.map((destination, i) => (
          <li
            key={`${safeIndex}-${destination.key}`}
            className={cn(
              !reduced &&
                leaving &&
                "-translate-y-1.5 opacity-0 transition-[opacity,translate] ease-out",
              !reduced &&
                !leaving &&
                hasShuffled &&
                "animate-in fade-in slide-in-from-bottom-2",
            )}
            style={
              reduced
                ? undefined
                : leaving
                  ? {
                      transitionDuration: `${OUT_MS}ms`,
                      transitionDelay: `${i * STAGGER_MS}ms`,
                    }
                  : hasShuffled
                    ? {
                        animationDuration: `${IN_MS}ms`,
                        animationDelay: `${i * STAGGER_MS}ms`,
                        animationFillMode: "both",
                      }
                    : undefined
            }
          >
            <Link
              href={destination.href}
              className="flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <span className="text-sm font-medium text-foreground">
                {destination.sentence}
              </span>
              {destination.badge && (
                <span className="text-xs text-muted-foreground">
                  {destination.badge}
                </span>
              )}
              <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      {hasMultipleGroups && (
        <button
          type="button"
          onClick={shuffle}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <RefreshCw
            aria-hidden
            className="size-4 shrink-0 transition-transform duration-300 ease-out"
            style={reduced ? undefined : { rotate: `${turns * 180}deg` }}
          />
          Zeig mir was anderes
        </button>
      )}
    </div>
  );
}
```

Hinweise für die Umsetzung:
- `transition-[opacity,translate]` + Tailwind-`-translate-y-1.5` nutzt die
  CSS-`translate`-Property (Tailwind 4). Das Icon dreht über die
  `rotate`-Property (kein `transform`-String), damit `transition-transform`
  (deckt `rotate` ab) sauber animiert.
- Der Erst-Mount rendert ohne Animations-Klassen (`hasShuffled === false`),
  damit die Zeilen beim Tier-Crossfade des Elternblocks nicht doppelt animieren.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: kein Output (Exit 0). Insbesondere: kein Fehler am type-only Import aus `daily-focus.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/suggestion-shuffle.tsx
git commit -m "feat(dashboard): add SuggestionShuffle component (curated 3er rotation + staggered motion)"
```

---

### Task 2: Shuffle in DailyFocus einhängen, Reel + CSS-Maske entfernen

**Files:**
- Modify: `components/dashboard/daily-focus.tsx` (Alternativen-Block, ~Z. 156–182)
- Modify: `app/globals.css` (`.alt-reel`-Block, ~Z. 454–473)

**Interfaces:**
- Consumes: `SuggestionShuffle({ destinations: Destination[] })` aus Task 1.
- Produces: unverändertes Public-Interface von `DailyFocus` (Props bleiben gleich; `Destination`-Export bleibt bestehen, Task 1 importiert ihn).

- [ ] **Step 1: Reel durch SuggestionShuffle ersetzen**

In `components/dashboard/daily-focus.tsx` den Import-Block anpassen — `ChevronRight` wird dort nicht mehr gebraucht (die Zeilen-Markup lebt jetzt in der Unterkomponente), `Link` bleibt für die Primary-Card:

Alt:
```tsx
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
```

Neu:
```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SuggestionShuffle } from "@/components/dashboard/suggestion-shuffle";
```

(Der neue Import steht bei den anderen `@/components`-Imports, nicht zwischen den Package-Imports.)

Dann den kompletten Alternativen-Block ersetzen. Alt (inkl. Kommentar):

```tsx
        {view.alternatives.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              …oder brauchst du gerade was anderes?
            </p>
            {/* Slot-Reel: fixhohes Scroll-Fenster statt Ausklapp-Liste. Zeigt
                ~3 Ziele, die 4. lugt hervor (Scroll-Affordance). Alle Ziele
                bleiben im DOM (Tastatur/Screenreader erreichbar); scroll-snap
                lässt die Zeilen wie eine Walze einrasten, weiche Kanten (.alt-reel)
                geben den Reel-Look. Scrollbar ausgeblendet für Ruhe. */}
            <ul className="alt-reel max-h-[172px] snap-y snap-proximity space-y-2 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {view.alternatives.map((destination) => (
                <li key={destination.key} className="snap-start">
                  <Link
                    href={destination.href}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {destination.sentence}
                    </span>
                    {destination.badge && (
                      <span className="text-xs text-muted-foreground">
                        {destination.badge}
                      </span>
                    )}
                    <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
```

Neu:

```tsx
        {view.alternatives.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              …oder brauchst du gerade was anderes?
            </p>
            {/* „Vorschlags-Shuffle": eine 3er-Gruppe + „Zeig mir was anderes".
                Eigene kleine Motion-Maschine in der Unterkomponente — bewusst
                getrennt von der Crossfade-Maschine dieses Blocks. */}
            <SuggestionShuffle destinations={view.alternatives} />
          </div>
        )}
```

- [ ] **Step 2: `.alt-reel` aus globals.css entfernen**

In `app/globals.css` diesen kompletten Block ersatzlos löschen (er hat keinen Konsumenten mehr):

```css
  /* Dashboard „was anderes?"-Reel: fixhohes Scroll-Fenster mit weichen
     Kanten oben/unten (Walzen-Look). Die Maske fadet nur die obersten/
     untersten ~14px, damit die Randzeilen lesbar bleiben. */
  .alt-reel {
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0,
      #000 14px,
      #000 calc(100% - 14px),
      transparent 100%
    );
    mask-image: linear-gradient(
      to bottom,
      transparent 0,
      #000 14px,
      #000 calc(100% - 14px),
      transparent 100%
    );
  }
```

Gegenprüfung: `grep -r "alt-reel" app components` → keine Treffer mehr.

- [ ] **Step 3: Typecheck + Lint**

Run: `npx tsc --noEmit -p tsconfig.json` → Expected: Exit 0, kein Output.
Run: `npm run lint` → Expected: keine neuen Errors (insb. keine unused-import-Warnung zu `ChevronRight` in `daily-focus.tsx`).

- [ ] **Step 4: Browser-Sichtprüfung**

Dev-Server (`npm run dev`), `/dashboard` bei ~375px (Login nötig; bei CSS-Zweifeln `.next` löschen + Neustart — Memory „Stale Turbopack CSS cache"). Prüfen:

1. Genau 3 Vorschläge sichtbar, kein Scrollen, keine Fade-Kanten mehr.
2. Erste Gruppe = Akut-Hilfen (Overthinking, Confidence-Moment, Dampf ablassen) — sofern nicht eine davon gerade Primary ist (dann rückt der Rest nach).
3. „Zeig mir was anderes" tippen: alte Zeilen schweben gestaffelt nach oben raus, neue von unten rein; ↻ dreht eine halbe Umdrehung; kein Layout-Sprung unter dem Block (auch bei der kleineren Restgruppe).
4. Zyklus: nach der letzten Gruppe kommt wieder Gruppe 1. Doppel-Tap während der Out-Phase löst keinen zweiten Swap aus.
5. Mood auf Score 1–2 tippen (Tier-Wechsel): Gesamtblock crossfadet wie bisher, Shuffle funktioniert danach weiter (kein Out-of-bounds bei kürzerer Liste).
6. DevTools → Rendering → „Emulate CSS prefers-reduced-motion": Tap tauscht sofort, nichts animiert, Icon dreht nicht.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/daily-focus.tsx app/globals.css
git commit -m "feat(dashboard): replace alternatives slot-reel with suggestion shuffle"
```
