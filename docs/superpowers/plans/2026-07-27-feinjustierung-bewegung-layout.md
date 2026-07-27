# Feinjustierung Plan 2 — Bewegung & Layout

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die bewegungs- und layoutlastigen Punkte der Feinjustierungsrunde: Schmiede-Funken-Drift, /me als Meander-Hub, Login Variante B, Booster-Icons auf den Landings und ein echter Zoom-Seitenwechsel /booster → Sub-Page.

**Architecture:** Der Zoom-Übergang spiegelt die bewährte Warp-Architektur (persistentes Overlay in einem geteilten Layout, `zoomInto()/arrive()`-Context) — nötig, weil die iOS-Standalone-PWA keine View-Transitions-API rendert. /me übernimmt die Meander-Grammatik des Kopfwetter-Hubs. Login nimmt für nicht-gegatete Routen den großen Hero zurück.

**Tech Stack:** Next.js 16 (App Router, geteilte Layouts überleben Kind-Navigationen), React 19 (Context, `useRouter`, Portale n/a), TailwindCSS v4 + `app/globals.css`-Keyframes, GSAP nur im Bestand (hier CSS-Animationen).

## Global Constraints

- **Alle nutzer-sichtbaren Texte deutsch**, warm/ermutigend, „du". Deutsche Typografie in gerendertem Text (`„…"` = U+201E/U+201C).
- **Token-Werte (`app/globals.css`, `:root`):** `--primary: #E7B65E`, `--celebrate: #C97B84`, `--cleanser-confidence: #9C7FB0`, `--background` (Aubergine).
- **Reduced-motion ist Pflicht** bei jeder neuen Animation: harter Schnitt / statisch, kein Drift. Zentrale `@media (prefers-reduced-motion: reduce)`-Blöcke in `globals.css` nutzen.
- **iOS-Standalone-PWA:** keine View-Transitions-API — Seitenübergänge nur als echte CSS/JS-Animation über ein layout-persistentes Overlay.
- **Verifikation pro Task:** `npx tsc --noEmit` + `npm run gate` + `npm run build` grün. Visuelle Tasks sind Startwerte → Stefans iPhone am Live-Deploy ist das finale Gate.
- **Nicht anfassen:** die vorbestehende, ungetrackte Änderung an `lib/content/onboarding-intro.ts`.
- **`npm run lint`** ist vorbestehend rot (Alt-Fehler) und nicht im Gate — keine eigene Regression.
- Spec: `docs/superpowers/specs/2026-07-27-feinjustierungsrunde-design.md`. Referenz-Architektur: `components/wants/warp-transition.tsx` + `app/(app)/me/wants/layout.tsx`.

---

### Task 1: /schmiede — Funken driften auf und ab

Die FunkenSky-Punkte tragen bereits `funke-drift`, aber der Keyframe hebt nur um 4px an. Klarer als spürbares Auf-und-Ab ausführen.

**Files:**
- Modify: `app/globals.css` (Keyframe `funke-drift`, ca. Zeilen 987–993)

- [ ] **Step 1: Keyframe verbreitern**

In [globals.css](../../../app/globals.css) den `funke-drift`-Keyframe. Vorher:

```css
@keyframes funke-drift {
  0%, 100% { transform: translateY(0);      opacity: 0.85; }
  50%      { transform: translateY(-4px);   opacity: 1;    }
}
.funke-drift {
  animation: funke-drift 5s ease-in-out infinite;
}
```

Nachher (echtes Auf-und-Ab, etwas größere Amplitude, langsamer für ein ruhiges Schweben):

```css
@keyframes funke-drift {
  0%, 100% { transform: translateY(-6px); opacity: 0.82; }
  50%      { transform: translateY(6px);  opacity: 1;    }
}
.funke-drift {
  animation: funke-drift 6s ease-in-out infinite;
}
```

Der bestehende `@media (prefers-reduced-motion: reduce) { .funke-drift { animation: none; } }`-Block direkt darunter bleibt.

(Die Funken haben schon versetzte `animationDelay` in `funken-sky.tsx` — kein Code dort nötig.)

- [ ] **Step 2: Gates**

Run: `npx tsc --noEmit && npm run gate && npm run build`
Expected: grün. Motion-Gate akzeptiert (Keyframe animiert `transform`, kein Tailwind-`translate`-Footgun).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(schmiede): Funken driften spuerbar auf und ab"
```

---

### Task 2: /me — Nachthimmel-Raum (Meander-Hub)

`me-hub.tsx` von der Divider-/Chevron-Liste auf die Meander-Grammatik des Kopfwetter-Hubs ziehen: drei Signaturen links/rechts versetzt auf dem `SkyBackdrop`, größere Ornamente, ganze Zeile = Tap-Ziel. Inhalt (Chips/Bets/erstes Recht) bleibt, nur neu arrangiert. `me/page.tsx` ist strukturgleich zum Booster-Hub (`space-y-6 p-4` + Header) — der `-mx-4`-Trick passt 1:1.

**Files:**
- Modify: `app/(app)/me/me-hub.tsx` (komplett-Rewrite der Render-Struktur, Props unverändert)

**Interfaces:**
- Consumes: `SkyBackdrop` aus `components/backdrops/sky-backdrop`; `StarArt`/`CompassArt`/`SealArt`; `Reveal`.
- Produces: `MeHub(props: MeHubData)` + `ValueChip` — Signatur unverändert (`me/page.tsx` bleibt ungeändert).

- [ ] **Step 1: me-hub.tsx neu schreiben**

[me-hub.tsx](../../../app/(app)/me/me-hub.tsx) komplett ersetzen durch:

```tsx
"use client";

import Link from "next/link";

import { Reveal } from "@/components/ui/reveal";
import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";
import { StarArt } from "@/components/brand/star-art";
import { CompassArt, SealArt } from "@/components/brand/me-ornaments";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { PAGE_TITLES } from "@/lib/content/labels";

export type ValueChip = { emoji: string; label: string };

export type MeHubData = {
  values: ValueChip[];
  firstRight: string | null;
  rightsCount: number;
  wantsCount: number;
  openBets: string[];
};

/** Ein Recht liest sich immer als ganzer Affirmations-Satz (vgl. Bill of Rights). */
function asAffirmation(text: string): string {
  return text.startsWith("Ich habe das Recht")
    ? text
    : `Ich habe das Recht, ${text}`;
}

type Scene = {
  href: string;
  ariaLabel: string;
  art: React.ReactNode;
  title: string;
  body: React.ReactNode;
};

/** Eine Meander-Szene: Signatur + Text, links/rechts versetzt auf dem Nachthimmel. */
function MeanderScene({
  scene,
  side,
  delay,
}: {
  scene: Scene;
  side: "left" | "right";
  delay: number;
}) {
  const left = side === "left";
  return (
    <Reveal delay={delay} className={left ? "self-start" : "self-end"}>
      <Link
        href={scene.href}
        aria-label={scene.ariaLabel}
        className="group block w-[min(20rem,86vw)] rounded-xl px-3 py-4 transition-[background-color,scale] duration-150 ease-out hover:bg-muted/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className={`flex items-center gap-4 ${left ? "flex-row" : "flex-row-reverse"}`}>
          <span className="shrink-0">{scene.art}</span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block font-heading text-lg font-semibold text-foreground">
              {scene.title}
            </span>
            <span className="mt-1.5 block">{scene.body}</span>
          </span>
        </span>
      </Link>
    </Reveal>
  );
}

export function MeHub({ values, firstRight, rightsCount, wantsCount, openBets }: MeHubData) {
  const reduced = useReducedMotion();
  const animate = !reduced;
  const valuesCount = values.length;
  const openBetsCount = openBets.length;

  const wantsMeta =
    wantsCount > 0
      ? openBetsCount > 0
        ? `${wantsCount} Wants · ${openBetsCount} offene ${openBetsCount === 1 ? "Bet" : "Bets"}`
        : `${wantsCount} Wants entdeckt`
      : "Noch keine Wants entdeckt";

  const scenes: Scene[] = [
    {
      href: "/me/values",
      ariaLabel: "Meine Werte öffnen",
      art: <CompassArt emojis={values.map((v) => v.emoji)} animate={animate} className="size-16" />,
      title: "Meine Werte",
      body:
        valuesCount > 0 ? (
          <span className="flex flex-wrap gap-1.5">
            {values.slice(0, 4).map((v) => (
              <span
                key={v.label}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-white/5 px-2 py-0.5 text-xs text-foreground"
              >
                <span aria-hidden="true">{v.emoji}</span>
                {v.label}
              </span>
            ))}
            {valuesCount > 4 && (
              <span className="inline-flex items-center rounded-full border border-border bg-white/5 px-2 py-0.5 text-xs text-muted-foreground">
                +{valuesCount - 4}
              </span>
            )}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Deine Kompassrose wartet darauf, sich zu füllen.
          </span>
        ),
    },
    {
      href: "/me/wants",
      ariaLabel: `${PAGE_TITLES.meWants} öffnen`,
      art: <StarArt animate={animate} dim={wantsCount === 0} className="size-16" />,
      title: PAGE_TITLES.meWants,
      body:
        openBetsCount > 0 ? (
          <span className="flex flex-wrap gap-1.5">
            {openBets.slice(0, 2).map((bet, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
              >
                <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                <span className="max-w-[9rem] truncate">{bet}</span>
              </span>
            ))}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{wantsMeta}</span>
        ),
    },
    {
      href: "/me/bill-of-rights",
      ariaLabel: "Meine Bill of Rights öffnen",
      art: <SealArt animate={animate} className="size-16" />,
      title: "Meine Bill of Rights",
      body:
        rightsCount > 0 && firstRight ? (
          <span className="line-clamp-2 font-affirmation text-sm leading-snug text-foreground">
            „{asAffirmation(firstRight)}&#8220;
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Dieses Dokument wartet auf dein erstes Recht.
          </span>
        ),
    },
  ];

  return (
    <div className="relative -mx-4 overflow-x-clip">
      {/* Geteilter Nachthimmel wie auf Dashboard/Booster (neutral, kein Score). */}
      <SkyBackdrop />
      <div className="relative z-10 flex flex-col gap-12 px-4 py-4">
        {scenes.map((scene, i) => (
          <MeanderScene
            key={scene.href}
            scene={scene}
            side={i % 2 === 0 ? "left" : "right"}
            delay={i * 0.12}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Gates**

Run: `npx tsc --noEmit && npm run gate && npm run build`
Expected: grün. Der alte `me-candle-bg` entfällt (durch `SkyBackdrop` ersetzt) — verwaiste Referenzen prüfen (keine erwartet, war lokal).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/me/me-hub.tsx"
git commit -m "feat(me): Hub als Nachthimmel-Meander (Szenen statt Liste)"
```

**Device-Hinweis:** Chip-/Bet-Umbruch und die Links/Rechts-Versätze sind Startwerte — beim iPhone-Gate auf Umbruch bei langen Werten und ruhigen Stagger achten (`gap-12`, `delay i*0.12`).

---

### Task 3: /login — Variante B (Sky-Backdrop, ein Maskottchen)

Für nicht-gegatete Auth-Routen (Login + Reset) den großen Hero zurücknehmen: `SkyBackdrop` + Logo + kompakte Brand-Zeile + Karte, **ein** Maskottchen. Signup (gegatet) behält den Hero; dort nur der Doppel-Maskottchen-Flash beim Aufwischen gefixt.

**Files:**
- Modify: `components/auth/auth-reveal.tsx`

**Interfaces:**
- Consumes: `Logo` (`@/components/brand/logo`), `SkyBackdrop` (`@/components/backdrops/sky-backdrop`).
- Der `hero`-Prop wird künftig nur noch im gegateten (Signup-)Zweig genutzt; der nicht-gegatete Zweig rendert einen kompakten Eigen-Header.

- [ ] **Step 1: Imports ergänzen**

In [auth-reveal.tsx](../../../components/auth/auth-reveal.tsx) oben ergänzen:

```tsx
import { Logo } from "@/components/brand/logo";
import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";
```

- [ ] **Step 2: Nicht-gegateten Zweig ersetzen**

Den kompletten `if (!gated) { return ( … ); }`-Block (aktuell Hero oben + Karte + Karten-MascotPeek) ersetzen durch:

```tsx
  // Nicht-gegateter Pfad: reduced-motion UND alle Nicht-Signup-Routen (Login,
  // Reset). Kompakter Kopf (Logo + Brand-Zeile) + Karte auf dem Nachthimmel —
  // KEIN großer Hero (der brächte ein zweites Maskottchen). Genau ein Peek.
  if (!gated) {
    return (
      <div className="relative flex min-h-lvh flex-col overflow-hidden">
        <SkyBackdrop />
        <div
          className="relative z-10 px-6 pt-6 md:px-10 md:pt-8"
          style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}
        >
          <Logo size="default" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Der Club, den niemand zugibt zu brauchen.
          </p>
        </div>
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        {showCardMascot && (
          <MascotPeek
            from="top"
            size="lg"
            expression="smile"
            pulseSeconds={3}
            rotate={180}
            gazeX={0}
            gazeY={-3}
            className="pointer-events-none absolute left-1/2 -ml-16 -mt-10 z-0"
            style={{ top: "env(safe-area-inset-top, 0px)" }}
          />
        )}
      </div>
    );
  }
```

(Der `hero`-Prop wird hier nicht mehr gerendert — er bleibt für den Signup-Zweig unten erhalten. Reset-Seiten haben `showCardMascot === false` → gar kein Maskottchen, nur Logo + Karte + Sky.)

- [ ] **Step 3: Signup-Flash fixen (gegateter Zweig)**

Im `AuthReveal`-Body, bei den übrigen `useState`/`useRef`, einen Zustand + Effect ergänzen, der den Karten-Peek erst zeigt, wenn der Hero (mit seinem eigenen Maskottchen) fertig weggeschoben ist (Hero-Slide = `duration-1000`):

```tsx
  // Der Karten-Peek erscheint erst, nachdem der Hero (inkl. Hero-Maskottchen)
  // weggeslidet ist — sonst blitzen beim Aufwischen kurz zwei Maskottchen.
  const [heroGone, setHeroGone] = useState(false);
  useEffect(() => {
    if (!revealed) {
      setHeroGone(false);
      return;
    }
    const t = window.setTimeout(() => setHeroGone(true), 1000);
    return () => window.clearTimeout(t);
  }, [revealed]);
```

Dafür `useEffect` in den React-Import aufnehmen (aktuell `import { useRef, useState, type ReactNode } from "react";` → `import { useEffect, useRef, useState, type ReactNode } from "react";`).

Dann im gegateten Zweig die Bedingung des Karten-`MascotPeek` verschärfen. Vorher:

```tsx
        {showCardMascot && revealed && (
```

Nachher:

```tsx
        {showCardMascot && revealed && heroGone && (
```

- [ ] **Step 4: Gates**

Run: `npx tsc --noEmit && npm run gate && npm run build`
Expected: grün.

- [ ] **Step 5: Commit**

```bash
git add components/auth/auth-reveal.tsx
git commit -m "feat(auth): Login Variante B (Sky-Backdrop, ein Maskottchen) + Signup-Flash-Fix"
```

**Device-Hinweis:** iPhone: Login zeigt Nachthimmel + Logo + Zeile + Karte + EIN Peek oben; Reset-Seiten Nachthimmel + Logo + Karte, kein Maskottchen; Signup beim Aufwischen zu keinem Zeitpunkt zwei Maskottchen.

---

### Task 4: /booster — Icon statt Maskottchen auf der Landing

Auf jeder Booster-Landing (Intro-Sequenz) rendert der zentrale Slot das Modul-Wetter-Icon statt des Intro-Maskottchens. Der reagierende Begleiter in den tieferen Wizard-Schritten bleibt.

**Files:**
- Modify: `app/(app)/booster/overthinking/overthinking-wizard.tsx`
- Modify: `app/(app)/booster/shadow/shadow-wizard.tsx`
- Modify: `app/(app)/booster/things-got-messy/things-got-messy-wizard.tsx`
- Modify: `app/(app)/booster/saying-no/saying-no-wizard.tsx`
- Modify: `app/(app)/booster/confidence/confidence-booster.tsx`

**Interfaces:**
- Consumes: die Wetter-Icons aus `@/app/(app)/booster/weather-art` (`WindSwirl`, `StormCloud`, `CloudStack`, `UmbrellaRain`, `ClearingStar`). Der Intro-Slot (`RecipeIntro`, `renderMascot`-Prop) rendert die zurückgegebene Node zentriert über der Karte.

Die Zuordnung:

| Wizard | Datei | Icon | bisheriger Intro-Mascot |
|---|---|---|---|
| Overthinking | overthinking-wizard.tsx | `WindSwirl` | `OverthinkingIntroMascot` |
| Schattenseite | shadow-wizard.tsx | `StormCloud` | `ShadowIntroMascot` |
| Things Got Messy | things-got-messy-wizard.tsx | `CloudStack` | `ThingsGotMessyIntroMascot` |
| Nein sagen | saying-no-wizard.tsx | `UmbrellaRain` | `SayingNoIntroMascot` |
| Confidence | confidence-booster.tsx | `ClearingStar` | `<Mascot …>` (generisch) |

- [ ] **Step 1: Overthinking**

In [overthinking-wizard.tsx](../../../app/(app)/booster/overthinking/overthinking-wizard.tsx):

(a) Import ergänzen: `import { WindSwirl } from "@/app/(app)/booster/weather-art";`
(b) Den unbenutzt werdenden Import `OverthinkingIntroMascot` (Zeile 23) entfernen.
(c) Die Intro-`renderMascot`-Prop (Zeile ~648). Vorher:

```tsx
            renderMascot={(index) => <OverthinkingIntroMascot index={index} />}
```

Nachher:

```tsx
            renderMascot={() => <WindSwirl className="size-20" />}
```

- [ ] **Step 2: Schattenseite**

In [shadow-wizard.tsx](../../../app/(app)/booster/shadow/shadow-wizard.tsx): Import `StormCloud` aus `@/app/(app)/booster/weather-art` ergänzen; `ShadowIntroMascot`-Import (Zeile 15) entfernen; Zeile ~184:

```tsx
            renderMascot={() => <StormCloud className="size-20" />}
```

(Die anderen `<Mascot …>` in shadow-wizard.tsx bei Zeilen 207/399/447 sind tiefere Flow-Schritte — NICHT anfassen.)

- [ ] **Step 3: Things Got Messy**

In [things-got-messy-wizard.tsx](../../../app/(app)/booster/things-got-messy/things-got-messy-wizard.tsx): Import `CloudStack` ergänzen; `ThingsGotMessyIntroMascot`-Import (Zeile 20) entfernen; Zeile ~239:

```tsx
            renderMascot={() => <CloudStack className="size-20" />}
```

(Die `<Mascot …>` bei 253/485 sind Flow-Schritte — bleiben.)

- [ ] **Step 4: Nein sagen**

In [saying-no-wizard.tsx](../../../app/(app)/booster/saying-no/saying-no-wizard.tsx): Import `UmbrellaRain` ergänzen; `SayingNoIntroMascot`-Import (Zeile 26) entfernen; Zeile ~418:

```tsx
            renderMascot={() => <UmbrellaRain className="size-20" />}
```

(Alle weiteren `<Mascot …>` in saying-no-wizard.tsx sind Flow-Schritte — bleiben.)

- [ ] **Step 5: Confidence**

In [confidence-booster.tsx](../../../app/(app)/booster/confidence/confidence-booster.tsx): Import `ClearingStar` ergänzen. Der Intro-Slot (Zeilen ~60–66) nutzt das generische `Mascot`. Vorher:

```tsx
            renderMascot={(index) => (
              <Mascot
                …
              />
            )}
```

Nachher:

```tsx
            renderMascot={() => <ClearingStar className="size-20" />}
```

Bleibt `Mascot` in der Datei sonst ungenutzt, den Import entfernen; wird es weiter unten (Flow) verwendet, den Import lassen. `tsc`/lint zeigt es.

- [ ] **Step 6: Gates**

Run: `npx tsc --noEmit && npm run gate && npm run build`
Expected: grün. `tsc` fängt verwaiste IntroMascot-Importe.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/booster/overthinking/overthinking-wizard.tsx" "app/(app)/booster/shadow/shadow-wizard.tsx" "app/(app)/booster/things-got-messy/things-got-messy-wizard.tsx" "app/(app)/booster/saying-no/saying-no-wizard.tsx" "app/(app)/booster/confidence/confidence-booster.tsx"
git commit -m "feat(booster): Modul-Icon statt Maskottchen auf der Landing"
```

**Bewusst offen (Device-Notiz):** Für Wiederkehrer (Intro schon gesehen) landet der Zoom auf Schritt 0 des Wizards, der weiter ein Flow-Maskottchen zeigt. Falls das Icon-am-Kopf auch dort gewünscht ist, ist das eine kleine Folge-Runde — hier bewusst auf die Intro-Landing beschränkt (Entscheid „nur Landing/Intro").

---

### Task 5: /booster → Sub-Page — Zoom-Übergang

Kamera-Push aus dem getippten Icon mit echtem Seitenwechsel. Persistentes Overlay in einem neuen `booster/layout.tsx` (überlebt die Navigation), Kontext `zoomInto()/arrive()` analog zum Warp. Der Hub-Zellen-Container skaliert vom Tap-Punkt weg (Umgebung streamt nach außen), ein Lilac-Bloom deckt die Navigation, die Sub-Page taucht auf.

**Files:**
- Create: `components/booster/booster-zoom.tsx` (Provider + Overlay + `useBoosterZoom`)
- Create: `components/booster/booster-cells.tsx` (Client-Zellenliste: löst Zoom aus + skaliert)
- Create: `components/booster/booster-arrive.tsx` (ruft `arrive()` beim Mount)
- Create: `app/(app)/booster/layout.tsx` (Provider mounten)
- Modify: `app/(app)/booster/page.tsx` (Zellen an `BoosterCells` abgeben)
- Modify: die 5 Sub-Page-`page.tsx` (`BoosterArrive` einhängen)
- Modify: `app/globals.css` (Zoom-Keyframes)

**Interfaces:**
- Produces: `BoosterZoomProvider`, `useBoosterZoom(): { phase, origin, zoomInto(origin, navigate), arrive() }`, `BoosterCells`, `BoosterArrive`.
- `phase: "idle" | "zooming" | "arriving"`, `origin: { x: number; y: number } | null` (Viewport-Koordinaten).

- [ ] **Step 1: Provider + Overlay**

Neu [components/booster/booster-zoom.tsx](../../../components/booster/booster-zoom.tsx):

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/**
 * „Kamera-Push in den Booster" — der Zoom-Übergang vom Kopfwetter-Hub in eine
 * Sub-Page. Das Overlay lebt im geteilten booster/layout.tsx, damit seine
 * CSS-Animation den Routenwechsel überlebt (Layouts bleiben bei Navigation
 * zwischen Kind-Routen erhalten). Ablauf: zoomInto() → phase "zooming" (Zellen
 * skalieren vom Tap-Punkt weg, Bloom deckt die Navigation), nach ACCEL_MS
 * navigieren. Die Sub-Page ruft beim Mount arrive() → phase "arriving" (Bloom
 * fadet weg, Seite taucht auf). Reduced motion: sofort navigieren, kein Zoom.
 */

type Phase = "idle" | "zooming" | "arriving";
type Origin = { x: number; y: number };

// Navigation am Ende des Kamera-Push; Bloom dann voll deckend.
const ACCEL_MS = 300;
// Dauer der Auflösung/Ankunft, bevor das Overlay verschwindet.
const SETTLE_MS = 360;

type ZoomValue = {
  phase: Phase;
  origin: Origin | null;
  zoomInto: (origin: Origin, navigate: () => void) => void;
  arrive: () => void;
};

const ZoomContext = createContext<ZoomValue | null>(null);

export function useBoosterZoom(): ZoomValue {
  const ctx = useContext(ZoomContext);
  if (!ctx) {
    throw new Error("useBoosterZoom muss innerhalb von <BoosterZoomProvider> verwendet werden");
  }
  return ctx;
}

export function BoosterZoomProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<number[]>([]);

  const set = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const zoomInto = useCallback(
    (o: Origin, navigate: () => void) => {
      if (phaseRef.current !== "idle") return;
      setOrigin(o);
      if (reduced) {
        navigate();
        return;
      }
      set("zooming");
      const t = window.setTimeout(() => navigate(), ACCEL_MS);
      timers.current.push(t);
    },
    [reduced, set],
  );

  const arrive = useCallback(() => {
    if (phaseRef.current !== "zooming") return;
    set("arriving");
    const t = window.setTimeout(() => {
      set("idle");
      setOrigin(null);
    }, SETTLE_MS);
    timers.current.push(t);
  }, [set]);

  return (
    <ZoomContext.Provider value={{ phase, origin, zoomInto, arrive }}>
      {children}
      <BoosterZoomOverlay phase={phase} origin={origin} />
    </ZoomContext.Provider>
  );
}

function BoosterZoomOverlay({ phase, origin }: { phase: Phase; origin: Origin | null }) {
  if (phase === "idle" || !origin) return null;
  return (
    <div
      aria-hidden
      data-phase={phase}
      className="booster-zoom-overlay fixed inset-0 z-[80]"
      style={{ "--bz-x": `${origin.x}px`, "--bz-y": `${origin.y}px` } as CSSProperties}
    >
      <div className="booster-zoom-bloom absolute inset-0" />
    </div>
  );
}
```

- [ ] **Step 2: Zellenliste (Client) — löst Zoom aus + skaliert**

Neu [components/booster/booster-cells.tsx](../../../components/booster/booster-cells.tsx) — enthält die SYSTEMS-Daten (aus dem bisherigen `page.tsx` hierher gezogen) und den Tap-Handler:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type CSSProperties, type MouseEvent } from "react";

import { Reveal } from "@/components/ui/reveal";
import { PAGE_TITLES } from "@/lib/content/labels";
import { PressureCell, type CellVariant } from "@/app/(app)/booster/pressure-cell";
import {
  ClearingStar,
  CloudStack,
  StormCloud,
  UmbrellaRain,
  WindSwirl,
} from "@/app/(app)/booster/weather-art";
import { useBoosterZoom } from "@/components/booster/booster-zoom";

type WeatherSystem = {
  feeling: string;
  title: string;
  art: React.ReactNode;
  variant: CellVariant;
  href: string;
};

const SYSTEMS: WeatherSystem[] = [
  { feeling: "Ich bin am overthinken", title: "Overthinking", art: <WindSwirl />, variant: "overthinking", href: "/booster/overthinking" },
  { feeling: "Ich will zu etwas Nein sagen, aber weiß nicht wie", title: PAGE_TITLES.sayingNo, art: <UmbrellaRain />, variant: "sayingNo", href: "/booster/saying-no" },
  { feeling: "Ich fühl mich schuldig, obwohl ich es nicht sollte", title: PAGE_TITLES.thingsGotMessy, art: <CloudStack />, variant: "messy", href: "/booster/things-got-messy" },
  { feeling: "Ich muss Dampf ablassen", title: PAGE_TITLES.shadow, art: <StormCloud />, variant: "shadow", href: "/booster/shadow" },
  {
    feeling:
      "Ich gehe gleich in eine nervenaufreibende Situation und brauche einen schnellen Confidence Boost",
    title: PAGE_TITLES.confidence,
    art: <ClearingStar />,
    variant: "confidence",
    href: "/booster/confidence",
  },
];

export function BoosterCells() {
  const router = useRouter();
  const { phase, zoomInto } = useBoosterZoom();
  const containerRef = useRef<HTMLDivElement>(null);
  // Tap-Punkt relativ zum Zellen-Container → transform-origin für den Push.
  const localOrigin = useRef<{ x: number; y: number } | null>(null);

  function handleClick(e: MouseEvent<HTMLAnchorElement>, href: string) {
    // Modifier/Mittelklick → normaler Link (neuer Tab etc.).
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    const link = e.currentTarget;
    const iconEl = (link.querySelector("[data-cell-icon]") as HTMLElement | null) ?? link;
    const r = iconEl.getBoundingClientRect();
    const vx = r.left + r.width / 2;
    const vy = r.top + r.height / 2;
    const c = containerRef.current?.getBoundingClientRect();
    localOrigin.current = c ? { x: vx - c.left, y: vy - c.top } : null;
    zoomInto({ x: vx, y: vy }, () => router.push(href));
  }

  const pushing = phase === "zooming";

  return (
    <div
      ref={containerRef}
      className={pushing ? "booster-cells-zoom" : undefined}
      style={
        pushing && localOrigin.current
          ? ({ transformOrigin: `${localOrigin.current.x}px ${localOrigin.current.y}px` } as CSSProperties)
          : undefined
      }
    >
      <div className="relative z-10 flex flex-col gap-16 px-4 py-4">
        {SYSTEMS.map((s, i) => {
          const left = i % 2 === 0;
          return (
            <Reveal key={s.href} delay={i * 0.09} className={left ? "self-start" : "self-end"}>
              <Link
                href={s.href}
                onClick={(e) => handleClick(e, s.href)}
                aria-label={`${s.title} — ${s.feeling}`}
                className="group block w-[min(17rem,82vw)] rounded-xl px-3 py-3 transition-[background-color,scale] duration-150 ease-out hover:bg-muted/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span
                  className={`kw-cell-drift flex items-center gap-3 ${
                    left ? "flex-row text-left" : "flex-row-reverse text-right"
                  }`}
                  style={{ animationDelay: `${i * -1.7}s` }}
                >
                  <span data-cell-icon className="inline-flex">
                    <PressureCell art={s.art} side={left ? "left" : "right"} variant={s.variant} />
                  </span>
                  <span className="relative z-10 flex flex-col gap-1">
                    <span className="kw-legible font-heading text-lg font-medium leading-snug text-balance text-foreground">
                      {s.feeling}
                    </span>
                  </span>
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Arrive-Trigger (Client)**

Neu [components/booster/booster-arrive.tsx](../../../components/booster/booster-arrive.tsx):

```tsx
"use client";

import { useEffect } from "react";

import { useBoosterZoom } from "@/components/booster/booster-zoom";

/**
 * Von jeder Booster-Sub-Page beim Mount gerendert: löst die Ankunft des
 * Zoom-Übergangs aus (no-op bei Direkt-Load, weil dann kein Zoom läuft).
 */
export function BoosterArrive() {
  const { arrive } = useBoosterZoom();
  useEffect(() => {
    arrive();
  }, [arrive]);
  return null;
}
```

- [ ] **Step 4: Geteiltes Layout (Provider)**

Neu [app/(app)/booster/layout.tsx](../../../app/(app)/booster/layout.tsx):

```tsx
import type { ReactNode } from "react";

import { BoosterZoomProvider } from "@/components/booster/booster-zoom";

/**
 * Gemeinsames Layout für den Kopfwetter-Hub UND alle Booster-Sub-Pages. Es
 * hostet den Zoom-Übergang: weil dieses Layout bei der Navigation zwischen den
 * Kind-Routen erhalten bleibt, überlebt das Overlay den Routenwechsel und die
 * Animation läuft durchgehend weiter.
 */
export default function BoosterLayout({ children }: { children: ReactNode }) {
  return <BoosterZoomProvider>{children}</BoosterZoomProvider>;
}
```

- [ ] **Step 5: Hub-Seite auf BoosterCells umstellen**

[app/(app)/booster/page.tsx](../../../app/(app)/booster/page.tsx) komplett ersetzen durch (Header/SkyBackdrop bleiben server-gerendert, die interaktive Liste kommt aus dem Client-`BoosterCells`; die SYSTEMS-Daten wanderten nach `booster-cells.tsx`):

```tsx
import { PAGE_TITLES } from "@/lib/content/labels";
import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";
import { BoosterCells } from "@/components/booster/booster-cells";

export default function BoosterPage() {
  return (
    <div className="space-y-6 p-4">
      <header className="space-y-3">
        <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground">
          {PAGE_TITLES.booster}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Manchmal schlägt das Wetter um: Zweifel, Gedankenspiralen oder
          Überforderung ziehen auf. Das ist normal und das zieht auch wieder
          vorbei. Die folgenden Hilfen machen dich wetterfest gegen die Stürme
          und Regenwolken in deinem Kopf. Was brauchst du gerade?
        </p>
      </header>

      <div className="relative -mx-4 overflow-x-clip">
        {/* Nachthimmel-Hintergrund (geteilte fixe -z-10-Ebene). */}
        <SkyBackdrop />
        <BoosterCells />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Zoom-Keyframes in globals.css**

In [globals.css](../../../app/globals.css) am Ende der Keyframe-Sektion ergänzen:

```css
/* Kopfwetter-Hub → Sub-Page: Kamera-Push aus dem getippten Icon.
   Die Zellen skalieren vom Tap-Punkt weg (Umgebung streamt nach außen), ein
   Lilac-Bloom aus dem Origin deckt die Navigation, die Sub-Page taucht auf. */
.booster-zoom-overlay { pointer-events: auto; }
.booster-zoom-bloom {
  opacity: 0;
  will-change: opacity;
  background: radial-gradient(closest-side at var(--bz-x, 50%) var(--bz-y, 50%),
    color-mix(in srgb, var(--cleanser-confidence) 55%, transparent) 0%,
    color-mix(in srgb, var(--background) 90%, #000) 42%,
    var(--background) 100%);
}
.booster-zoom-overlay[data-phase="zooming"] .booster-zoom-bloom {
  animation: booster-bloom-in 300ms ease-in both;
}
.booster-zoom-overlay[data-phase="arriving"] .booster-zoom-bloom {
  animation: booster-bloom-out 360ms ease-out both;
}
@keyframes booster-bloom-in  { 0% { opacity: 0; } 55% { opacity: 0.55; } 100% { opacity: 1; } }
@keyframes booster-bloom-out { from { opacity: 1; } to { opacity: 0; } }

.booster-cells-zoom {
  animation: booster-cells-push 300ms ease-in both;
}
@keyframes booster-cells-push {
  from { transform: scale(1);   opacity: 1; }
  to   { transform: scale(1.6); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .booster-zoom-bloom, .booster-cells-zoom { animation: none; }
}
```

- [ ] **Step 7: BoosterArrive in die 5 Sub-Pages einhängen**

In jede der fünf Sub-Page-`page.tsx` `BoosterArrive` einfügen. Beispiel [overthinking/page.tsx](../../../app/(app)/booster/overthinking/page.tsx):

```tsx
import { hasSeenRecipeIntro } from "@/app/(app)/recipes/actions";
import { BoosterArrive } from "@/components/booster/booster-arrive";
import { OverthinkingWizard } from "./overthinking-wizard";

export default async function OverthinkingPage() {
  const introSeen = await hasSeenRecipeIntro("overthinking");

  return (
    <>
      <BoosterArrive />
      <OverthinkingWizard introSeen={introSeen} />
    </>
  );
}
```

Analog in `saying-no/page.tsx`, `things-got-messy/page.tsx`, `shadow/page.tsx`, `confidence/page.tsx`: `import { BoosterArrive } from "@/components/booster/booster-arrive";` ergänzen und `<BoosterArrive />` als erstes Element in den zurückgegebenen Baum setzen (jeweils in ein Fragment wickeln, falls die Seite aktuell direkt eine einzelne Komponente zurückgibt).

- [ ] **Step 8: Gates**

Run: `npx tsc --noEmit && npm run gate && npm run build`
Expected: grün. Prüfen, dass `page.tsx` (Hub) keine ungenutzten `weather-art`/`PressureCell`-Importe mehr hat (wanderten nach `booster-cells.tsx`).

- [ ] **Step 9: Commit**

```bash
git add components/booster/booster-zoom.tsx components/booster/booster-cells.tsx components/booster/booster-arrive.tsx "app/(app)/booster/layout.tsx" "app/(app)/booster/page.tsx" "app/(app)/booster/overthinking/page.tsx" "app/(app)/booster/saying-no/page.tsx" "app/(app)/booster/things-got-messy/page.tsx" "app/(app)/booster/shadow/page.tsx" "app/(app)/booster/confidence/page.tsx" app/globals.css
git commit -m "feat(booster): Zoom-Uebergang Hub->Sub-Page (layout-persistentes Overlay)"
```

**Device-Hinweis (iPhone, entscheidend):** (a) Tap auf eine Zelle liest als Kamera-Push aus dem Icon (Umgebung streamt nach außen), Lilac-Bloom deckt sauber, Sub-Page taucht auf; (b) reduced-motion = harter Seitenwechsel ohne Overlay; (c) Direkt-Load einer Sub-Page (kein Zoom) funktioniert normal; (d) kein vertikaler Seiten-Scroll-Ruck während des 300ms-Push (der Bloom deckt; bei fühlbarem Ruck `booster-cells-push` End-Scale von 1.6 senken). Feinjustierung: `ACCEL_MS`/`SETTLE_MS` in `booster-zoom.tsx`, Bloom-Farbe/Stops in `globals.css`.

---

## Self-Review

**Spec coverage:** 2a→T1, 7 (Meander)→T2, 5 (Login B)→T3, 4a→T4, 4b→T5. Alle Plan-2-Punkte der Spec haben einen Task.

**Placeholder scan:** keine TBD/TODO; alle neuen Dateien vollständig, alle Edits mit exaktem Vorher/Nachher bzw. vollständigem Zielcode. Die „analog in den weiteren Sub-Pages"-Anweisung (T5/Step 7) zeigt das exakte Muster an einem Beispiel — jede der vier restlichen Seiten ist ein Ein-Zeilen-Import + ein `<BoosterArrive />` im Fragment.

**Type consistency:** `useBoosterZoom(): { phase, origin, zoomInto, arrive }` in T5/Step 1 definiert; Konsumenten `BoosterCells` (nutzt `phase`, `zoomInto`) und `BoosterArrive` (nutzt `arrive`) passen exakt. `Origin = { x, y }` einheitlich. `MeHub`-Signatur (T2) unverändert → `me/page.tsx` bleibt. `renderMascot`-Prop (T4) gibt weiter eine `ReactNode` zurück — Icon statt Mascot ist typkompatibel.

**Reduced-motion:** T1 (Keyframe-Block bleibt), T5 (`zoomInto` navigiert sofort, `@media`-Block deckt beide Zoom-Klassen). T2/T3 nutzen bestehende reduced-motion-abgedeckte Bausteine (`Reveal`, `me-*`, `SkyBackdrop`).

**Reihenfolge/Isolation:** Tasks sind unabhängig; T4 (Icon) sollte vor oder mit T5 (Zoom) laufen, damit der Zoom auf ein Icon landet — im selben Plan gegeben. Beide Pläne berühren `globals.css` in getrennten Abschnitten (Plan 1: Zone-Token; Plan 2: Funken-/Zoom-Keyframes) → kein Konflikt bei sequentieller Ausführung.
