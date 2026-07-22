# Sternschmiede-Redesign „Schwester der Sternensuche" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Sternschmiede (`/me/wants/schmiede`) auf dieselbe visuelle Sprache wie ihre Schwester Sternensuche heben — Esse+Funken statt Amboss+Maskottchen, gezähmter Warp, vereinheitlichter Zurück-Button — gemäß Spec `docs/superpowers/specs/2026-07-22-sternschmiede-schwester-design.md`.

**Architecture:** Ein Backdrop (`ForgeBackdrop` → Esse), eine neue interaktive Konstellations-Komponente (`FunkenSky`, modelliert auf `StarMap` aber leichter), und die Phasen-State-Machine in `sternschmiede.tsx` (intro/briefing/forging/funken/done) werden Screen für Screen an die Sternensuche-Grammatik angeglichen. Der Warp-Übergang (`warp-transition.tsx` + `globals.css`) wird entgoldet und gekürzt. `AnvilArt`/`forge-art.tsx` wird entfernt.

**Tech Stack:** Next.js 16 App Router, React 19 (`ViewTransition`), TailwindCSS v4, shadcn/ui, `lucide-react`. Kein neues npm-Paket.

## Global Constraints

- **Framework:** Next.js 16 App Router. `cookies()`/`headers()`/`params`/`searchParams` sind async und müssen `await`et werden. (Betrifft hier keine geänderte Datei — alle Änderungen sind Client-Komponenten/CSS — aber gilt, falls eine Server-Datei angefasst wird.)
- **Sprache:** Alle nutzersichtbaren Texte auf Deutsch, warm/ermutigend, „du". Deutsche Typografie mit echten Unicode-Quotes `„…"` (U+201E/U+201C), niemals ASCII `"`. Das Typo-Gate prüft gerenderten Text.
- **Modulfarbe Wants/Schmiede = `--celebrate`** (Rosé `#C97B84`) — nur für Glut/Glow/Ornament (Funken-Punkte, Ember-Bloom, Auswahl-Ring), **nie für Fließtext**. Text bleibt `--foreground` (Moonlight `#F3EFFA`) / `--muted-foreground`. Gold (`--primary` `#E7B65E`) bleibt die **einzige Aktions-Farbe** (One-Candle-Rule): pro Screen höchstens eine Gold-CTA.
- **Kontrast:** Body-Text ≥ 4.5:1, große Schrift ≥ 3:1. Das Kontrast-Gate (`scripts/check-contrast.mjs`) muss grün bleiben.
- **Reduced Motion (Projekt-Pflicht):** Jede neue Animation/Keyframe braucht einen `@media (prefers-reduced-motion: reduce)`-Fallback. Das Motion-Gate (`scripts/check-transitions.mjs`) prüft das.
- **iOS-Standalone-PWA:** Keine React-View-Transitions für echte Übergänge verlassen (rendern dort nicht) — echte CSS/JS-Animation. Full-bleed-Höhen in `lvh` (nicht `svh`/`dvh`). Portal-`focus()` immer mit `{ preventScroll: true }`.
- **Verifikation pro Task (der reale AIC-Gate — kein Browser-Subagent, kein Unit-Test-Harness vorhanden):**
  1. `npx tsc --noEmit` → keine Fehler
  2. `npm run gate` → Kontrast + Typo + Motion grün
  3. Visuelle Akzeptanzkriterien der Task erfüllt (finaler Sichtprüfungs-Gate ist Stefans iPhone am Live-Deploy).
- **Windows/PowerShell-Gotchas:** Route-Group-Pfade mit Klammern beim `git add` quoten (`git add "app/(app)/…"`). Keine inneren `"` in mehrzeiligen Commit-Messages (PS 5.1 zerlegt sonst die Argumente) — Bash-Heredoc nutzen oder ohne `"` formulieren.

---

## File Structure

| Datei | Verantwortung | Änderung |
|---|---|---|
| `components/backdrops/forge-backdrop.tsx` | Atmosphärischer Esse-Hintergrund (Glut-Bloom + Deko-Funken), optionale Intensität | Modify |
| `components/wants/warp-transition.tsx` | Warp-State-Machine + Overlay (Streifenzahl, Timings) | Modify |
| `components/layout/sub-page-header.tsx` | Geteilter Sub-Page-Header, `onBack`-Escape-Hatch | Modify |
| `components/wants/funken-sky.tsx` | **Neu:** schwebende Funken-Konstellation über der Esse + Portal-Fokus (Reflektieren/Verwerfen/Schließen) | Create |
| `app/(app)/me/wants/schmiede/sternschmiede.tsx` | Phasen-State-Machine: Landing / Warte / Auswahl / Abschluss | Modify (4 Phasen) |
| `components/brand/forge-art.tsx` | `AnvilArt` (Amboss-SVG) | Delete |
| `app/globals.css` | Warp-CSS, Esse-Funken-Keyframes, neue Funken-Drift/Spray/Rise-Keyframes, Streichung `.forge-hammer` | Modify |

**Task-Reihenfolge & Abhängigkeiten:** Tasks 1–3 sind isolierte Bausteine (Backdrop, Warp, Header). Task 4 erstellt `FunkenSky`. Tasks 5–8 bauen die vier Phasen um und konsumieren die Bausteine. Task 9 entfernt zuletzt `forge-art.tsx` (erst nachdem Tasks 5+6 alle `AnvilArt`-Nutzungen entfernt haben) und tote CSS.

---

## Task 1: Esse-Backdrop entgolden + Intensität

Der Ember-Bloom nutzt heute `--primary` (Gold). Gemäß Spec wird die Esse **vollständig rosé**. Zusätzlich bekommt `ForgeBackdrop` eine optionale `intensity`-Prop, damit der Warte-Screen (Task 6) eine „heißere" Esse zeigen kann.

**Files:**
- Modify: `components/backdrops/forge-backdrop.tsx`

**Interfaces:**
- Produces: `ForgeBackdrop({ intensity }: { intensity?: "calm" | "hot" })` — Default `"calm"`. `"hot"` erhöht die Bloom-Alpha und fügt einen warmen Gold-Kern-Hauch am Boden hinzu (nur Warte-Screen).

- [ ] **Step 1: Bloom entgolden + `intensity`-Prop einführen**

Ersetze die Signatur und die beiden Bloom-`<div>`s. Die neue Datei `components/backdrops/forge-backdrop.tsx` lautet vollständig:

```tsx
/**
 * Sternschmiede-only atmospheric backdrop — die „Esse" (Schmiedefeuer).
 *
 * Schwester zu SkyBackdrop, aber invertiert: der Raum vertieft sich nach OBEN
 * (das Gewölbe), und am unteren Rand pool't eine warme Glut — das Schmiedefeuer,
 * aus dem Funken aufsteigen. Rein gemalte Gradienten (kein backdrop-filter), GPU-
 * günstig, iOS-freundlich. Sitzt bei -z-10 hinter dem Seiteninhalt und wird von
 * der Sternschmiede-Komponente gerendert (unmountet beim Verlassen).
 *
 * On-brand: die Glut ist ROSÉ (--celebrate, die Wants/Schmiede-Modulfarbe), nicht
 * Gold — Gold bleibt der einen CTA vorbehalten. Low-alpha, damit die Glut nie mit
 * der Gold-CTA konkurriert. `intensity="hot"` (Warte-Screen) macht die Glut
 * kräftiger und legt einen warmen Gold-Kern-Hauch an den Boden.
 *
 * aria-hidden + pointer-events-none — reine Dekoration.
 */
export function ForgeBackdrop({
  intensity = "calm",
}: {
  intensity?: "calm" | "hot";
}) {
  const hot = intensity === "hot";
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* Tiefen-Wash: den Aubergine-Grund nach OBEN vertiefen (Gewölbe), langer
          Mehrstufen-Fade ohne harte Naht, damit die Ambient-Blobs mittig atmen. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.28) 18%, rgba(0,0,0,0.12) 34%, rgba(0,0,0,0.04) 48%, transparent 62%)",
        }}
      />
      {/* Glut-Pool: breiter, weicher Rosé-Bloom vom unteren Rand. Low-alpha =
          Hitze, nicht zweite Kerze. „hot" (Warte-Screen) hebt die Alpha an. */}
      <div
        className="absolute inset-0"
        style={{
          background: hot
            ? "radial-gradient(120% 58% at 50% 100%, color-mix(in srgb, var(--celebrate) 34%, transparent), color-mix(in srgb, var(--celebrate) 12%, transparent) 44%, transparent 74%)"
            : "radial-gradient(120% 55% at 50% 100%, color-mix(in srgb, var(--celebrate) 22%, transparent), color-mix(in srgb, var(--celebrate) 8%, transparent) 42%, transparent 72%)",
        }}
      />
      {/* Engerer, hellerer Rosé-Kern direkt am Boden für ein heißeres Zentrum. */}
      <div
        className="absolute inset-0"
        style={{
          background: hot
            ? "radial-gradient(48% 30% at 50% 100%, color-mix(in srgb, var(--celebrate) 22%, transparent), transparent 70%)"
            : "radial-gradient(45% 26% at 50% 100%, color-mix(in srgb, var(--celebrate) 14%, transparent), transparent 70%)",
        }}
      />
      {/* Nur „hot": ein warmer Gold-Hauch tief im Feuer — der Moment, in dem das
          Metall glüht. Sehr low-alpha, bricht die One-Candle-Rule nicht (kein
          CTA-Konkurrent, reine Glut ganz am Boden). */}
      {hot && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(40% 20% at 50% 100%, color-mix(in srgb, var(--primary) 16%, transparent), transparent 68%)",
          }}
        />
      )}
      {/* Ein paar Deko-Funken, die aus dem Feuer aufsteigen (--celebrate, bereits
          rosé in .forge-spark). Versetzte Delays, einer dimmer für Tiefe. */}
      <span className="forge-spark absolute bottom-[8%] left-[28%]" />
      <span
        className="forge-spark absolute bottom-[12%] right-[30%]"
        style={{ animationDelay: "1.9s" }}
      />
      <span
        className="forge-spark absolute bottom-[6%] left-[52%]"
        style={{ width: "3px", height: "3px", animationDelay: "3.4s" }}
      />
      <span
        className="forge-spark absolute bottom-[16%] left-[16%]"
        style={{ animationDelay: "0.7s" }}
      />
      <span
        className="forge-spark absolute bottom-[10%] right-[18%]"
        style={{ width: "3px", height: "3px", animationDelay: "2.6s" }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler. (Alle bestehenden Aufrufer `<ForgeBackdrop />` bleiben gültig, da `intensity` optional ist.)

- [ ] **Step 3: Gate**

Run: `npm run gate`
Expected: Kontrast + Typo + Motion grün. (Kein neuer Text, keine neue Keyframe — `.forge-spark` existiert bereits inkl. reduced-motion-Fallback.)

- [ ] **Step 4: Visuelle Akzeptanz**

Auf `/me/wants/schmiede`: die Glut am unteren Rand ist rosé (kein goldener Schimmer mehr). Kein Layout-Shift.

- [ ] **Step 5: Commit**

```bash
git add "components/backdrops/forge-backdrop.tsx"
git commit -m "feat(schmiede): Esse-Backdrop entgolden auf Rosé + intensity-Prop"
```

---

## Task 2: Warp-Übergang zähmen (entgolden, kürzen, dezenter)

Der Warp liest heute als goldener Blitz (~980 ms, 48 Streifen @ Opacity 0.95, goldener Wash). Ziel: dezenter Sternen-Sturz — ~750 ms, entgoldet, ~24 kühl-weiße Streifen.

**Files:**
- Modify: `components/wants/warp-transition.tsx:36-41` (Timings), `:141` (`STREAK_COUNT`)
- Modify: `app/globals.css:820-900` (`.warp-wash`, `.warp-streak`, Streak-Keyframe-Opacities, Wash-in/out-Timings)

**Interfaces:**
- Consumes: nichts Neues.
- Produces: unveränderte öffentliche API (`useWarp`, `warpPageClass`, `WarpProvider`). Nur interne Konstanten/CSS ändern sich.

- [ ] **Step 1: Timings kürzen (Summe ~750 ms) + Streifenzahl halbieren**

In `components/wants/warp-transition.tsx` die drei Timing-Konstanten (`:36-41`) ersetzen:

```ts
// Navigation exakt am Ende des Exit-Slides der Quell-Seite; Wash dann voll deckend.
const ACCEL_MS = 260;
// Reiner Streifen-Tunnel-Beat: beide Seiten off-screen, prominenter Tunnel-Moment.
const TUNNEL_MS = 140;
// Dauer der Auflösung/Ankunft, bevor das Overlay verschwindet.
const DECEL_MS = 350;
```

Und `STREAK_COUNT` (`:141`):

```ts
const STREAK_COUNT = 24;
```

- [ ] **Step 2: Wash entgolden**

In `app/globals.css` die `.warp-wash`-Regel (`:820-829`) ersetzen — der goldene radiale Kern (`--primary` 42 %) wird eine reine Abdunklung mit dezentem Rosé-Hauch:

```css
.warp-wash {
  opacity: 0;
  will-change: opacity;
  background:
    radial-gradient(120% 55% at 50% 112%, color-mix(in srgb, var(--celebrate) 20%, transparent), transparent 60%),
    linear-gradient(180deg,
      color-mix(in srgb, var(--background) 96%, #000) 0%,
      color-mix(in srgb, var(--background) 90%, #000) 62%,
      color-mix(in srgb, var(--background) 82%, #000) 100%);
}
```

- [ ] **Step 3: Streifen kühl-weiß + dünner + dezenter**

In `app/globals.css` die beiden richtungsabhängigen `.warp-streak`-Backgrounds (`:854-866`) auf kühl-weiß (`--foreground`) statt Gold umstellen und den Box-Shadow (`:851`) entgolden. Ersetze `:846-866`:

```css
.warp-streak {
  position: absolute;
  border-radius: 50%;
  opacity: 0;
  will-change: transform, opacity;
  box-shadow: 0 0 5px color-mix(in srgb, var(--foreground) 45%, transparent);
}
/* down: heller Kopf oben, Ursprung unten (Trail hängt nach unten). */
.warp-overlay[data-direction="down"] .warp-streak {
  transform: translateY(30lvh) scaleY(0.12);
  transform-origin: bottom center;
  background: linear-gradient(0deg, transparent,
    color-mix(in srgb, var(--foreground) 55%, transparent) 42%, var(--foreground) 72%, transparent);
}
/* up: gespiegelt — heller Kopf unten, Ursprung oben. */
.warp-overlay[data-direction="up"] .warp-streak {
  transform: translateY(-30lvh) scaleY(0.12);
  transform-origin: top center;
  background: linear-gradient(180deg, transparent,
    color-mix(in srgb, var(--foreground) 55%, transparent) 42%, var(--foreground) 72%, transparent);
}
```

- [ ] **Step 4: Peak-Opacity der Streifen senken (0.95 → 0.6)**

In `app/globals.css` die beiden Loop-Keyframes (`:881-892`) auf Peak 0.6 senken:

```css
@keyframes warp-streak-up {
  0%   { opacity: 0;   transform: translateY(30lvh)   scaleY(0.12); }
  22%  { opacity: 0.6; }
  80%  { opacity: 0.6; }
  100% { opacity: 0;   transform: translateY(-125lvh) scaleY(1); }
}
@keyframes warp-streak-down {
  0%   { opacity: 0;   transform: translateY(-30lvh)  scaleY(0.12); }
  22%  { opacity: 0.6; }
  80%  { opacity: 0.6; }
  100% { opacity: 0;   transform: translateY(125lvh)  scaleY(1); }
}
```

Und die beiden Settle-Keyframes (`:893-900`) von `0.55` Start-Opacity auf `0.4` senken, passend zur niedrigeren Peak:

```css
@keyframes warp-streak-up-settle {
  from { opacity: 0.4; transform: translateY(-125lvh) scaleY(1); }
  to   { opacity: 0;   transform: translateY(-150lvh) scaleY(0.2); }
}
@keyframes warp-streak-down-settle {
  from { opacity: 0.4; transform: translateY(125lvh)  scaleY(1); }
  to   { opacity: 0;   transform: translateY(150lvh)  scaleY(0.2); }
}
```

- [ ] **Step 5: Wash-in/out-Timings an neue Dauern angleichen**

In `app/globals.css` die beiden Wash-Animationsdauern (`:830-834`) auf `ACCEL_MS`/`DECEL_MS` (260/350) angleichen:

```css
.warp-overlay[data-phase="diving"] .warp-wash {
  animation: warp-wash-in 260ms var(--forge-ease) both;
}
.warp-overlay[data-phase="arriving"] .warp-wash {
  animation: warp-wash-out 350ms var(--forge-ease) both;
}
```

Und die vier `.warp-page-*`-Animationsdauern (`:908`, `:922`, `:933`, `:945`) von `340ms`/`460ms` auf `260ms` (exit) bzw. `350ms` (enter) angleichen, damit Seiten-Slide und Wash synchron bleiben:
- `:908` `.warp-page-exit` → `animation: warp-page-exit 260ms var(--forge-ease) both;`
- `:922` `.warp-page-enter` → `animation: warp-page-enter 350ms var(--forge-ease) both;`
- `:933` `.warp-page-exit-down` → `animation: warp-page-exit-down 260ms var(--forge-ease) both;`
- `:945` `.warp-page-enter-down` → `animation: warp-page-enter-down 350ms var(--forge-ease) both;`

- [ ] **Step 6: Type-Check + Gate**

Run: `npx tsc --noEmit && npm run gate`
Expected: keine Fehler; Motion-Gate grün (alle geänderten Keyframes behalten ihren reduced-motion-Fallback in `:982-992`, der unverändert bleibt).

- [ ] **Step 7: Visuelle Akzeptanz**

Übergang `/me/wants` → Schmiede und zurück: spürbar kürzer (~0,75 s), die Streifen sind kühl-weiß und dünn (kein goldener Blitz), der Wash ist dunkel-aubergine mit leisem Rosé statt goldenem Kern. Bei `prefers-reduced-motion`: sofortiger Wechsel ohne Streifen.

- [ ] **Step 8: Commit**

```bash
git add "components/wants/warp-transition.tsx" "app/globals.css"
git commit -m "feat(schmiede): Warp gezaehmt — ~750ms, entgoldet, dezente kuehl-weisse Streifen"
```

---

## Task 3: SubPageHeader `onBack`-Escape-Hatch

Der Header-Zurück-Pfeil ist ein `<Link transitionTypes>` — React-View-Transitions rendern in der iOS-PWA nicht, also springt der Header hart, während der untere Button den echten `ascend()`-Warp fliegt. Fix: optionaler `onBack`-Callback; ist er gesetzt, rendert der Pfeil als `<button>` und ruft `onBack`.

**Files:**
- Modify: `components/layout/sub-page-header.tsx`

**Interfaces:**
- Produces: `SubPageHeader`-Prop `onBack?: () => void`. Wenn gesetzt → Zurück rendert als `<button onClick={onBack}>` (kein `<Link>`, kein `transitionTypes`). Wenn nicht gesetzt → unverändertes `<Link href={backHref}>`-Verhalten für alle anderen Screens.

- [ ] **Step 1: `onBack`-Prop hinzufügen und Zurück-Control verzweigen**

In `components/layout/sub-page-header.tsx` das Interface (`:5-13`) um `onBack` erweitern:

```tsx
interface SubPageHeaderProps {
  backHref: string;
  title: string;
  subtitle?: string;
  /** Optionaler rechtsbündiger Slot, z.B. ein Info-Icon. */
  action?: React.ReactNode;
  /** View-Transition-Typen für die Zurück-Navigation (z.B. ["forge-up"]). */
  backTransitionTypes?: string[];
  /**
   * Optionaler Escape-Hatch: ist er gesetzt, rendert der Zurück-Pfeil als
   * <button> und ruft onBack statt als <Link> zu navigieren. Für Screens mit
   * eigener Übergangs-Animation (Schmiede-Warp), die die iOS-PWA sonst nicht
   * rendert. Ohne onBack bleibt das Link-Verhalten unverändert.
   */
  onBack?: () => void;
}
```

Die Destrukturierung (`:15-21`) um `onBack` erweitern:

```tsx
export function SubPageHeader({
  backHref,
  title,
  subtitle,
  action,
  backTransitionTypes,
  onBack,
}: SubPageHeaderProps) {
```

Das Zurück-Control (`:44-51`) durch eine Verzweigung ersetzen — gemeinsame Klassen bleiben identisch, damit Optik/Tap-Ziel gleich sind:

```tsx
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Zurück"
              className="-ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : (
            <Link
              href={backHref}
              aria-label="Zurück"
              transitionTypes={backTransitionTypes}
              className="-ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-5" />
            </Link>
          )}
```

- [ ] **Step 2: Type-Check + Gate**

Run: `npx tsc --noEmit && npm run gate`
Expected: keine Fehler. (`backHref` bleibt Pflicht-Prop — bei `onBack`-Nutzung als semantischer Fallback/Doku weiterhin übergeben.)

- [ ] **Step 3: Visuelle Akzeptanz (Regression)**

Ein bestehender Sub-Page-Header ohne `onBack` (z. B. eine andere `/me`-Unterseite) verhält sich unverändert.

- [ ] **Step 4: Commit**

```bash
git add "components/layout/sub-page-header.tsx"
git commit -m "feat(header): optionaler onBack-Escape-Hatch fuer eigene Uebergangs-Animationen"
```

---

## Task 4: `FunkenSky` — schwebende Funken-Konstellation + Fokus

Neue, leichtere Schwester der `StarMap`: offene Funken schweben als glühende Rosé-Punkte an stabilen Positionen über der Esse; Tap → Fokus-Ebene (Portal an `document.body`, Scroll-Lock, Focus-Trap, Escape) mit „Ausprobiert? Reflektieren", „Verwerfen" (zweistufig) und „Schließen". **Kein** Edit-Modus, **keine** Distanz-Umschaltung, **kein** GSAP (leichter Auf-Zoom rein per CSS-Transform vom Tap-Punkt).

**Files:**
- Create: `components/wants/funken-sky.tsx`
- Modify: `app/globals.css` (neue `.funke-drift`-Keyframe + reduced-motion-Fallback)

**Interfaces:**
- Consumes: `BetItem` aus `@/lib/types/db-json` (`{ id, text, wantId, status, journalEntryId, source }`); Hooks `useReducedMotion`, `useScrollLock`.
- Produces: `FunkenSky({ funken, reflectHref, onDelete })`:
  - `funken: BetItem[]` — die offenen Funken (Aufrufer filtert auf `status === "open"`).
  - `reflectHref: (id: string) => string` — baut das Ziel des Reflektieren-Links.
  - `onDelete: (id: string) => void` — verwirft einen Funken (Aufrufer persistiert).

- [ ] **Step 1: `.funke-drift`-Keyframe + reduced-motion-Fallback ergänzen**

In `app/globals.css` direkt hinter dem `.forge-spark`-Block (nach `:968`) einfügen:

```css
/* Schwebende Funken der Konstellation (FunkenSky): leises Auf-und-Ab-Glimmen. */
@keyframes funke-drift {
  0%, 100% { transform: translateY(0);      opacity: 0.85; }
  50%      { transform: translateY(-4px);   opacity: 1;    }
}
.funke-drift {
  animation: funke-drift 5s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .funke-drift { animation: none; }
}
```

- [ ] **Step 2: `FunkenSky`-Komponente anlegen**

Erstelle `components/wants/funken-sky.tsx` vollständig:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
import { cn } from "@/lib/utils";
import type { BetItem } from "@/lib/types/db-json";

/**
 * Die Funken-Konstellation der Sternschmiede: offene Funken schweben als
 * glühende Rosé-Punkte an stabilen Positionen über der Esse (Slot-Leiter +
 * ID-Hash → gleicher Himmel bei jedem Besuch). Tipp auf einen Funken → eine per
 * Portal an document.body gerenderte, fixe, scroll-gesperrte Fokus-Ebene über
 * der Bottom-Nav: Text + „Ausprobiert? Reflektieren" + „Verwerfen" (zweistufig)
 * + „Schließen". Leichtere Schwester der StarMap — ohne Edit-Modus, ohne
 * Distanz, ohne GSAP (Auf-Zoom rein per CSS vom Tap-Punkt). Reduced motion:
 * harter Schnitt ohne Flug. Persistenz bleibt beim Parent (sternschmiede.tsx).
 */

const VIEW_W = 360;
const ROW_H = 76;
const TOP_PAD = 42;
const BOTTOM_PAD = 48;

/** Stabiler Hash 0..1 aus einem String — gleiche Konstellation bei jedem Besuch. */
function hash01(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

/** 28-Zeichen-Kürzung mit „…" — hält Konstellations-Labels bei jeder Länge kurz. */
function clip28(s: string): string {
  const t = s.trim();
  return t.length > 28 ? `${t.slice(0, 27).trimEnd()}…` : t;
}

type Placed = { bet: BetItem; x: number; y: number; side: "left" | "right" };

/** Slot-Leiter: links/rechts versetzt von oben nach unten; ID-Hash gibt jedem
 *  Funken einen stabilen Versatz im Slot. */
function layout(funken: BetItem[]): { placed: Placed[]; viewH: number } {
  const placed = funken.map((bet, i) => {
    const side: "left" | "right" = i % 2 === 0 ? "left" : "right";
    const baseX = side === "left" ? 92 : 268;
    return {
      bet,
      x: baseX + (hash01(bet.id) - 0.5) * 52,
      y: TOP_PAD + i * ROW_H + (hash01(`${bet.id}y`) - 0.5) * 30,
      side,
    };
  });
  const viewH = Math.max(200, TOP_PAD + funken.length * ROW_H + BOTTOM_PAD);
  return { placed, viewH };
}

export function FunkenSky({
  funken,
  reflectHref,
  onDelete,
}: {
  funken: BetItem[];
  reflectHref: (id: string) => string;
  onDelete: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const prevFocusedRef = useRef<string | null>(null);
  // Tap-Punkt (viewport-relativ) → transform-origin für den Auf-Zoom der Ebene.
  const originRef = useRef<{ x: number; y: number } | null>(null);

  // Portal erst nach Mount (kein document auf dem Server).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliger Client-Mount-Flag
  useEffect(() => setMounted(true), []);
  useScrollLock(focusedId !== null);

  const { placed, viewH } = layout(funken);
  const focused = funken.find((f) => f.id === focusedId) ?? null;

  function open(bet: BetItem, el: HTMLElement) {
    if (focusedId) return;
    const r = el.getBoundingClientRect();
    originRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    triggerRef.current = el;
    setConfirmDelete(false);
    setReady(false);
    setFocusedId(bet.id);
  }

  function close() {
    setFocusedId(null);
    setConfirmDelete(false);
    setReady(false);
  }

  // Auf-Zoom: transform-origin am Tap-Punkt setzen, dann per rAF „ready" → CSS
  // transitioniert von scale(0.92)/opacity 0 auf 1. Reduced motion: sofort da.
  useEffect(() => {
    if (!focusedId) return;
    if (reduced) {
      setReady(true);
      return;
    }
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, [focusedId, reduced]);

  // Fokus-Ebene wie ein Dialog: Fokus reinziehen (preventScroll!), Tab einsperren,
  // Escape schließt. Ohne preventScroll scrollt focus() die Seite ans Dokumentende
  // (Portal hängt am body-Ende).
  useEffect(() => {
    if (!focusedId) return;
    const dialog = dialogRef.current;
    const raf = requestAnimationFrame(() => dialog?.focus({ preventScroll: true }));

    function focusables(): HTMLElement[] {
      if (!dialog) return [];
      return Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const els = focusables();
      if (els.length === 0) {
        e.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [focusedId]);

  // Beim Schließen den Fokus auf den auslösenden Funken zurück — außer er wurde
  // verworfen (Button dann weg). preventScroll: nicht zum evtl. weit unten
  // liegenden Funken scrollen.
  useEffect(() => {
    const prev = prevFocusedRef.current;
    prevFocusedRef.current = focusedId;
    if (prev && !focusedId) {
      const t = triggerRef.current;
      if (t && document.body.contains(t)) t.focus({ preventScroll: true });
      triggerRef.current = null;
    }
  }, [focusedId]);

  function handleDelete() {
    if (!focused) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const id = focused.id;
    close();
    onDelete(id);
  }

  const origin = originRef.current;

  return (
    <div className="relative w-full" style={{ aspectRatio: `${VIEW_W} / ${viewH}` }}>
      {/* Die Konstellation (inert, solange ein Funke fokussiert ist: die
          Hintergrund-Punkte dürfen weder Tastatur-Fokus noch Screenreader). */}
      <div className="absolute inset-0" inert={focusedId !== null}>
        {placed.map(({ bet, x, y, side }, i) => (
          <button
            key={bet.id}
            type="button"
            onClick={(e) => open(bet, e.currentTarget)}
            aria-label={`Funken ansehen: ${clip28(bet.text)}`}
            className="absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{ left: `${(x / VIEW_W) * 100}%`, top: `${(y / viewH) * 100}%` }}
          >
            <span
              aria-hidden
              className={cn("size-3 rounded-full bg-celebrate", !reduced && "funke-drift")}
              style={{
                boxShadow: "0 0 10px 2px color-mix(in srgb, var(--celebrate) 70%, transparent)",
                animationDelay: `${(i % 5) * 0.7}s`,
              }}
            />
            <span
              className={cn(
                "absolute top-1/2 block max-w-[8rem] -translate-y-1/2 truncate font-heading text-base font-medium text-foreground",
                side === "left" ? "left-full ml-2" : "right-full mr-2",
              )}
            >
              {clip28(bet.text)}
            </span>
          </button>
        ))}
      </div>

      {/* Fokus-Ebene: Portal an document.body, fix, scroll-gesperrt, über der Nav. */}
      {mounted &&
        focused &&
        createPortal(
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Funke: ${focused.text}`}
            tabIndex={-1}
            className="fixed inset-0 z-[60] outline-none"
          >
            {/* Gedimmte Esse: klick = schließen. */}
            <button
              type="button"
              aria-label="Schließen"
              onClick={close}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            {/* Inhalt: fliegt vom Tap-Punkt auf (transform-origin), fadet auf. */}
            <div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none"
              style={{
                transformOrigin: origin
                  ? `${origin.x}px ${origin.y}px`
                  : "center",
                opacity: ready ? 1 : 0,
                transform: ready ? "scale(1)" : "scale(0.92)",
              }}
            >
              <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 text-center">
                <span
                  aria-hidden
                  className="size-5 rounded-full bg-celebrate"
                  style={{
                    boxShadow: "0 0 22px 5px color-mix(in srgb, var(--celebrate) 70%, transparent)",
                  }}
                />
                <p className="text-lg leading-relaxed text-foreground">{focused.text}</p>
                <div className="flex w-full flex-col gap-2">
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    variant="outline"
                    render={<Link href={reflectHref(focused.id)} />}
                  >
                    <Flame className="size-4" /> Ausprobiert? Reflektieren
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={handleDelete}
                  >
                    {confirmDelete ? "Wirklich verwerfen?" : "Verwerfen"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={close}
                  >
                    Schließen
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
```

- [ ] **Step 3: `useScrollLock`-Signatur prüfen**

Run: `npx tsc --noEmit`
Expected: keine Fehler. Falls `useScrollLock` eine andere Signatur hat als `useScrollLock(locked: boolean)`, gleicht anpassen — Referenz ist die Nutzung in `app/(app)/me/wants/star-map.tsx:142` (`useScrollLock(focusedId !== null)`), die identisch ist. `bg-celebrate` ist eine gültige Tailwind-Utility (Token `--color-celebrate` ist in `globals.css:39` registriert).

- [ ] **Step 4: Gate**

Run: `npm run gate`
Expected: grün. Der Text „Ausprobiert? Reflektieren", „Verwerfen", „Wirklich verwerfen?", „Schließen", „Funken ansehen: …" nutzt kein `--celebrate` als Textfarbe (nur `--foreground`/`--muted-foreground`) → Kontrast ok. `„…"` in `clip28` ist ein echtes Unicode-Quote-Paar → Typo-Gate ok. Neue `.funke-drift`-Keyframe hat reduced-motion-Fallback → Motion-Gate ok.

- [ ] **Step 5: Commit**

```bash
git add "components/wants/funken-sky.tsx" "app/globals.css"
git commit -m "feat(schmiede): FunkenSky — schwebende Funken-Konstellation mit Portal-Fokus"
```

---

## Task 5: Landing umbauen (`phase: "intro"`)

Die Landing bekommt die Sternensuche-Grammatik: Amboss-Held raus, Kopf zusammengeführt, H2 „Nach den Sternen greifen" entfällt, offene Funken als `FunkenSky`-Konstellation, Reflektieren-Icon `FlaskConical`→`Flame` (wandert in `FunkenSky`), CTA „Neue Funken schlagen" (mit Erstbesuch-Fallback), Header-Zurück via `onBack` → `goBackToStars()`, Verwerfen mit Rückfrage (jetzt in `FunkenSky`).

**Files:**
- Modify: `app/(app)/me/wants/schmiede/sternschmiede.tsx` (Imports, `header`, intro-`return` `:481-636`)

**Interfaces:**
- Consumes: `FunkenSky` (Task 4), `SubPageHeader onBack` (Task 3).
- Produces: keine neue öffentliche API.

- [ ] **Step 1: Imports anpassen**

In `app/(app)/me/wants/schmiede/sternschmiede.tsx`:
- `FlaskConical` aus dem `lucide-react`-Import (`:7`) entfernen (wandert als `Flame` in `FunkenSky`; `Flame` ist bereits importiert). Neue Zeile 7:

```tsx
import { ArrowUp, Check, Flame, Plus, Sparkles } from "lucide-react";
```

- `AnvilArt`-Import (`:20`) **vorerst belassen** (Warte-Screen nutzt ihn noch bis Task 6). `Mascot` (`:19`) ebenfalls belassen (funken/done-Screen bis Tasks 7/8).
- `Link` (`:5`) bleibt (triedBets-Journal-Link nutzt ihn noch).
- `FunkenSky` importieren — nach dem `useWarp`-Import (`:23`) einfügen:

```tsx
import { FunkenSky } from "@/components/wants/funken-sky";
```

- [ ] **Step 2: Header auf `onBack` umstellen**

Den `header` (`:99-110`) ersetzen — `backTransitionTypes` entfällt, `onBack` ruft `goBackToStars()`:

```tsx
  const header = (
    <SubPageHeader
      backHref="/me/wants"
      title="Sternschmiede"
      onBack={goBackToStars}
      action={
        INTRO_CARDS.length > 0 ? (
          <IntroInfoButton cards={INTRO_CARDS} />
        ) : undefined
      }
    />
  );
```

Hinweis: `goBackToStars` ist oberhalb (`:79-82`) definiert und im Closure verfügbar. `backTransitionTypes`-Nutzung ist damit projektweit für die Schmiede weg (der Prop bleibt in `SubPageHeader` für andere Screens erhalten).

- [ ] **Step 3: intro-`return` neu aufbauen**

Den kompletten intro-`return`-Block (`:480-636`, ab dem Kommentar `// ── Intro + Bets …` bis zum schließenden `);`) ersetzen:

```tsx
  // ── Intro + Funken (Einstieg / Landing) ─────────────────────────
  const firstVisit = openBets.length === 0 && triedBets.length === 0;
  return (
    <div
      className={cn(
        "flex min-h-lvh flex-col",
        warpPageClass("schmiede", warpPhase, direction),
      )}
    >
      <ForgeBackdrop />
      {header}
      <ViewTransition
        enter={{ "forge-down": "forge-in-up", "forge-up": "forge-in-down", default: "none" }}
        exit={{ "forge-down": "forge-out-up", "forge-up": "forge-out-down", default: "none" }}
        default="none"
      >
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
          <div className="flex flex-col items-center gap-3 text-center">
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

          {/* Offene Funken als schwebende Konstellation über der Esse. */}
          {openBets.length > 0 && (
            <FunkenSky
              funken={openBets}
              reflectHref={(id) => `/me/wants/reflect/${id}`}
              onDelete={deleteBet}
            />
          )}

          {/* „Schon gegriffen" — leise Hairline-Zeilen (kein Karten-Kasten). */}
          {triedBets.length > 0 && (
            <div className="flex flex-col gap-2">
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

          {/* Eigenen Funken hinzufügen — sitzt unter der Konstellation. */}
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
          <FormError message={error} />

          {/* Die eine Gold-CTA. Erstbesuch ohne Funken: schlicht „Funken schlagen". */}
          <Button className="w-full gap-2" size="lg" onClick={() => setPhase("briefing")}>
            <Flame className="size-4" />
            {firstVisit ? "Funken schlagen" : "Neue Funken schlagen"}
          </Button>

          {/* Zurück in den Sternenhimmel — derselbe Warp, nur rückwärts (Aufstieg).
              Gedämpft (ghost), damit „Funken schlagen" die eine Gold-CTA bleibt. */}
          <Button
            variant="ghost"
            className="w-full gap-2 text-muted-foreground"
            disabled={warpBusy}
            onClick={goBackToStars}
          >
            <ArrowUp className="size-4" /> Zurück zu meinen Sternen
          </Button>
          <div className="h-8" />
        </div>
      </ViewTransition>
    </div>
  );
}
```

Hinweis: `CardContent`/`Card` werden im intro-Block nicht mehr genutzt, bleiben aber via briefing/funken-Phasen importiert. `SectionLabel` bleibt genutzt. `Sparkles` bleibt (briefing-Phase `:258`).

- [ ] **Step 4: Type-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler. Falls „`FlaskConical` is declared but never read" o. Ä. auftaucht: das ist gewünscht — Step 1 hat ihn bereits entfernt. Falls ESLint einen ungenutzten Import meldet (`Card`/`CardContent`), prüfen ob briefing/funken sie noch nutzen (ja → kein Fehler).

- [ ] **Step 5: Gate**

Run: `npm run gate`
Expected: grün. Alle Quotes in Placeholder/Copy sind echte `„…"`/`‚…'` (U+201A/U+2018 im Input-Placeholder `‚Einmal zum Bouldern gehen'`). Kein `--celebrate`-Text.

- [ ] **Step 6: Visuelle Akzeptanz**

`/me/wants/schmiede` mit ≥1 offenem Funken: kein Amboss mehr im Kopf; die offenen Funken schweben als rosé Punkte mit Label; Tap öffnet die Fokus-Ebene mit „Ausprobiert? Reflektieren" (Flamme) + „Verwerfen" (zweistufig) + „Schließen". Kein „Nach den Sternen greifen"-H2. CTA sagt „Neue Funken schlagen"; auf einem frischen Account „Funken schlagen". Header-Zurück-Pfeil fliegt denselben Aufstiegs-Warp wie der untere Button.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/me/wants/schmiede/sternschmiede.tsx"
git commit -m "feat(schmiede): Landing als Funken-Konstellation — Kopf zusammengefuehrt, Amboss raus, onBack-Warp"
```

---

## Task 6: Warte-Screen — Esse-Funkenflug (`phase: "forging"`)

Skeletons + `AnvilArt active` raus. Die Esse wird heißer (`intensity="hot"`) und Funken sprühen schnell auf — Pendant zum „Dein Himmel entsteht …" der Sternensuche.

**Files:**
- Modify: `app/(app)/me/wants/schmiede/sternschmiede.tsx` (forging-`return` `:296-315`, Imports `AnvilArt`/`Skeleton`)
- Modify: `app/globals.css` (neue `.funke-spray`-Keyframe + reduced-motion-Fallback)

**Interfaces:**
- Consumes: `ForgeBackdrop intensity="hot"` (Task 1).
- Produces: keine.

- [ ] **Step 1: `.funke-spray`-Keyframe ergänzen**

In `app/globals.css` direkt hinter dem `.funke-drift`-Block (aus Task 4) einfügen:

```css
/* Warte-Screen: Funken sprühen schnell aus der Esse auf (schneller/kräftiger als
   die dekorativen forge-sparks). Aufsteigen + verblassen, versetzte Delays. */
@keyframes funke-spray {
  0%   { opacity: 0;    transform: translateY(0) scale(1); }
  15%  { opacity: 0.95; }
  100% { opacity: 0;    transform: translateY(-64px) scale(0.5); }
}
.funke-spray {
  position: absolute;
  border-radius: 50%;
  background: var(--celebrate);
  box-shadow: 0 0 8px 1px color-mix(in srgb, var(--celebrate) 65%, transparent);
  animation: funke-spray 1.8s ease-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .funke-spray { animation: none; opacity: 0.7; }
}
```

- [ ] **Step 2: Modul-Konstante für die Spray-Funken anlegen**

In `sternschmiede.tsx` neben den anderen Modul-Konstanten (nach `AI_ERROR`, `:52`) einfügen:

```tsx
// Warte-Screen: Positionen/Größen/Delays der aufsprühenden Funken (deterministisch,
// kein Math.random → kein Hydration-Mismatch).
const SPRAY_FUNKEN: { left: number; size: number; delay: number }[] = [
  { left: 30, size: 8, delay: 0 },
  { left: 60, size: 6, delay: 0.3 },
  { left: 46, size: 9, delay: 0.6 },
  { left: 74, size: 5, delay: 0.9 },
  { left: 22, size: 6, delay: 1.2 },
  { left: 54, size: 7, delay: 1.5 },
];
```

- [ ] **Step 3: forging-`return` ersetzen**

Den forging-Block (`:296-315`) ersetzen:

```tsx
  // ── Forging (Ladezustand) — Esse-Funkenflug ─────────────────────
  if (phase === "forging") {
    return (
      <div className="flex min-h-lvh flex-col">
        <ForgeBackdrop intensity="hot" />
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-6 animate-in fade-in duration-500">
          {/* Aus der heißen Esse sprühen Funken auf. */}
          <div className="relative h-40 w-full max-w-xs" aria-hidden="true">
            {SPRAY_FUNKEN.map((f, i) => (
              <span
                key={i}
                className={reduced ? "absolute rounded-full bg-celebrate" : "funke-spray"}
                style={{
                  left: `${f.left}%`,
                  bottom: "8%",
                  width: `${f.size}px`,
                  height: `${f.size}px`,
                  animationDelay: `${f.delay}s`,
                  ...(reduced
                    ? {
                        boxShadow:
                          "0 0 8px 1px color-mix(in srgb, var(--celebrate) 65%, transparent)",
                      }
                    : {}),
                }}
              />
            ))}
          </div>
          <p className="text-center text-base text-muted-foreground">
            Ich schlage ein paar Funken für dich …
          </p>
        </div>
      </div>
    );
  }
```

- [ ] **Step 4: `AnvilArt`- und `Skeleton`-Import entfernen**

`AnvilArt` wird jetzt nirgends mehr genutzt (Landing entfernte es in Task 5, Warte-Screen hier). `Skeleton` wird ebenfalls nur hier genutzt. Beide Imports entfernen:
- Zeile `import { AnvilArt } from "@/components/brand/forge-art";` (`:20`) löschen.
- Zeile `import { Skeleton } from "@/components/ui/skeleton";` (`:13`) löschen — **erst per Grep bestätigen, dass `Skeleton` sonst nicht mehr vorkommt** (nächster Step).

- [ ] **Step 5: Type-Check + ungenutzte Imports bestätigen**

Run: `npx tsc --noEmit`
Expected: keine Fehler. Wenn ESLint über einen weiterhin vorhandenen `Skeleton`/`AnvilArt`-Verweis meckert, war die Annahme falsch — dann Grep `AnvilArt`/`Skeleton` in der Datei und den letzten echten Verweis erst entfernen. (Nach Tasks 5+6 gibt es keinen mehr.)

- [ ] **Step 6: Gate**

Run: `npm run gate`
Expected: grün. Neue `.funke-spray`-Keyframe hat reduced-motion-Fallback. Text „Ich schlage ein paar Funken für dich …" nutzt `…` (echtes Ellipsis-Zeichen wie im Original) → Typo-Gate ok.

- [ ] **Step 7: Visuelle Akzeptanz**

Während „Funken schlagen" läuft: keine Skeleton-Balken, kein Amboss/Hammer — die Esse glüht heißer (rosé + leiser Gold-Kern am Boden) und Funken sprühen nach oben. Bei `prefers-reduced-motion`: Funken stehen still sichtbar, kein Aufsteigen.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/me/wants/schmiede/sternschmiede.tsx" "app/globals.css"
git commit -m "feat(schmiede): Warte-Screen als Esse-Funkenflug statt Skeletons+Amboss"
```

---

## Task 7: Funken-Auswahl — Held-Funke + Glass-Card + Hinweis + Rosé-Karten (`phase: "funken"`)

Kopf wie Sternensuche: `Mascot` → großer glühender Rosé-Held-Funke; Einschätzung als `Card variant="glass"`; leiser „antippen"-Hinweis; die Auswahl-Karten nutzen `--celebrate` (Rosé-Haken + Glut-Ring) statt `--primary`, „aus" sichtbar gedimmt.

**Files:**
- Modify: `app/(app)/me/wants/schmiede/sternschmiede.tsx` (funken-`return` `:317-445`)

**Interfaces:**
- Consumes: `Card variant="glass"` (bereits vorhanden, `components/ui/card.tsx:12-22`).
- Produces: keine.

- [ ] **Step 1: Kopf, Einschätzung, Hinweis und Karten umbauen**

Im funken-Block den Kopf (`:325-334`), die Einschätzungs-`Card` (`:336-346`) und die Karten-Map (`:348-392`) ersetzen. Konkret:

Kopf (`Mascot` → Held-Funke) — ersetze `:325-334`:

```tsx
          <div className="flex flex-col items-center gap-3 text-center">
            {/* Held-Funke: großer glühender Rosé-Punkt (Pendant zum StarGlyph-Held
                der Sternensuche). */}
            <span
              aria-hidden
              className={cn("size-10 rounded-full bg-celebrate", !reduced && "funke-drift")}
              style={{
                boxShadow: "0 0 26px 6px color-mix(in srgb, var(--celebrate) 70%, transparent)",
              }}
            />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Deine Funken
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Kleine Wetten mit dir selbst. Nimm mit, was dich neugierig macht —
              aus einem Funken kann ein neuer Stern werden.
            </p>
          </div>
```

Einschätzung als Glass-Card + „antippen"-Hinweis — ersetze `:336-346`:

```tsx
          {comment && (
            <Reveal delay={0.15} className="w-full">
              <Card variant="glass" className="w-full">
                <CardContent className="pt-(--card-spacing)">
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                    {comment}
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Tipp an, um an- oder abzuwählen.
          </p>
```

Auswahl-Karten von `--primary` auf `--celebrate` — ersetze die `Card`-Klassen und den Haken-`<span>` innerhalb der Map (`:363-379`):

```tsx
                <Card
                  className={cn(
                    "w-full transition-colors",
                    funke.selected
                      ? "border-celebrate/55 bg-celebrate/8"
                      : "opacity-50 hover:opacity-75",
                  )}
                >
                  <CardContent className="flex items-start gap-3 pt-(--card-spacing)">
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                        funke.selected
                          ? "border-celebrate bg-celebrate text-background"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {funke.selected && <Flame className="size-3" />}
                    </span>
```

Der Rest der Karte (Text + `reason`, `:380-389`) bleibt unverändert.

- [ ] **Step 2: Speichern-CTA belassen (bleibt die eine Gold-CTA)**

Der Speichern-Button (`:423-436`) bleibt Gold (`--primary`) — er ist die eine Aktions-CTA des Screens. Die Auswahl-Karten sind Ornament/Zustand (Rosé), kein Aktions-Konkurrent. Keine Änderung hier.

- [ ] **Step 3: Type-Check + Gate**

Run: `npx tsc --noEmit && npm run gate`
Expected: keine Fehler; Gate grün. Kontrast-Achtung: `text-background` auf `bg-celebrate` (der aktive Haken) — Aubergine `#161226` auf Rosé `#C97B84` ≥ 4.5:1 (Icon ist große/grafische Fläche, ≥ 3:1 genügt; Rosé L≈0.62 vs. Aubergine L≈0.16 → deutlich > 3:1). `border-celebrate/55`, `bg-celebrate/8` sind Ornament, kein Text.

- [ ] **Step 4: Visuelle Akzeptanz**

Auswahl-Screen: statt Maskottchen ein großer glühender Rosé-Funke; die KI-Einschätzung sitzt in einer Glass-Card; darunter der leise Hinweis „Tipp an, um an- oder abzuwählen."; ausgewählte Funken haben einen Rosé-Glut-Ring + gefüllten Rosé-Haken, abgewählte sind sichtbar gedimmt (opacity-50). Die Gold-CTA „N Funken mitnehmen" ist weiterhin die einzige Gold-Fläche.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/me/wants/schmiede/sternschmiede.tsx"
git commit -m "feat(schmiede): Funken-Auswahl mit Held-Funke, Glass-Einschaetzung, Rosé-Auswahl + antippen-Hinweis"
```

---

## Task 8: Success-Screen — Funken-Schwarm (`phase: "done"`)

Statt `Mascot`: die frisch geschlagenen Funken steigen aus der Esse auf und schweben als Gruppe. Titel „N Funken glühen jetzt in deiner Schmiede." (1er-Fallback „Der erste Funke ist geschlagen."). Der goldene Stern bleibt bewusst ausgespart.

**Files:**
- Modify: `app/(app)/me/wants/schmiede/sternschmiede.tsx` (done-`return` `:447-478`)
- Modify: `app/globals.css` (neue `.funke-rise`-Keyframe + reduced-motion-Fallback)

**Interfaces:**
- Consumes: `ForgeBackdrop` (Task 1).
- Produces: keine.

- [ ] **Step 1: `.funke-rise`-Keyframe ergänzen**

In `app/globals.css` direkt hinter dem `.funke-spray`-Block (aus Task 6) einfügen:

```css
/* Success-Screen: Funken sind aus der Esse aufgestiegen und schweben als Gruppe
   (sanftes Ein-Aufsteigen einmalig, dann Ruhe). */
@keyframes funke-rise {
  from { opacity: 0; transform: translateY(24px) scale(0.8); }
  to   { opacity: 1; transform: translateY(0)    scale(1);   }
}
.funke-rise {
  animation: funke-rise 0.8s ease-out both;
}
@media (prefers-reduced-motion: reduce) {
  .funke-rise { animation: none; opacity: 1; }
}
```

- [ ] **Step 2: Modul-Konstante für den Schwarm anlegen**

In `sternschmiede.tsx` neben `SPRAY_FUNKEN` (aus Task 6) einfügen:

```tsx
// Success-Screen: bis zu 5 Positionen des aufgestiegenen Funken-Schwarms
// (viewBox-frei, Prozent im 220×150-Feld). Held-Funke in der Mitte etwas größer.
const SWARM_FUNKEN: { x: number; y: number; size: number; delay: number }[] = [
  { x: 30, y: 62, size: 10, delay: 0.0 },
  { x: 66, y: 70, size: 9, delay: 0.12 },
  { x: 48, y: 34, size: 14, delay: 0.24 },
  { x: 80, y: 44, size: 9, delay: 0.36 },
  { x: 16, y: 40, size: 8, delay: 0.48 },
];
```

- [ ] **Step 3: done-`return` ersetzen**

Den done-Block (`:447-478`) ersetzen:

```tsx
  // ── Abschluss — Funken-Schwarm ──────────────────────────────────
  if (phase === "done") {
    const savedCount = openBets.length;
    const n = Math.min(Math.max(savedCount, 1), SWARM_FUNKEN.length);
    const swarm = SWARM_FUNKEN.slice(0, n);
    return (
      <div className="flex min-h-lvh flex-col">
        <ForgeBackdrop />
        {header}
        <ViewTransition
          enter={{ "forge-down": "forge-in-up", "forge-up": "forge-in-down", default: "none" }}
          exit={{ "forge-down": "forge-out-up", "forge-up": "forge-out-down", default: "none" }}
          default="none"
        >
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Der aufgestiegene Funken-Schwarm schwebt über dem Feuer. */}
            <div className="relative h-40 w-full max-w-[240px]" aria-hidden="true">
              {swarm.map((f, i) => (
                <span
                  key={i}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-celebrate",
                    reduced ? undefined : "funke-rise",
                  )}
                  style={{
                    left: `${f.x + 10}%`,
                    top: `${f.y}%`,
                    width: `${f.size}px`,
                    height: `${f.size}px`,
                    animationDelay: `${f.delay}s`,
                    boxShadow: `0 0 ${f.size + 6}px ${Math.round(f.size / 4)}px color-mix(in srgb, var(--celebrate) 70%, transparent)`,
                  }}
                />
              ))}
            </div>
            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                {savedCount <= 1
                  ? "Der erste Funke ist geschlagen."
                  : `${savedCount} Funken glühen jetzt in deiner Schmiede.`}
              </h1>
              <p className="text-muted-foreground">
                Probier sie aus — und danach reflektierst du kurz, was der Funke dir
                gezeigt hat.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 pt-2">
              <Button className="w-full" size="lg" onClick={() => setPhase("intro")}>
                Zurück zur Schmiede
              </Button>
            </div>
          </div>
        </ViewTransition>
      </div>
    );
  }
```

Hinweis zur Zählung: `saveFunken` (`:220-225`) hat die frisch gespeicherten Funken bereits in `bets` gemerged, bevor `setPhase("done")` läuft. `openBets` (`:96`) enthält sie also — `savedCount = openBets.length` spiegelt „was jetzt in der Schmiede glüht". Das ist die gewünschte Kontinuität (dieselben Funken empfangen dich auf der Landing).

- [ ] **Step 4: `Mascot`-Import prüfen/entfernen**

Nach Tasks 7+8 wird `Mascot` in `sternschmiede.tsx` nicht mehr genutzt. Grep in der Datei bestätigen, dann den Import `import { Mascot } from "@/components/brand/mascot";` (`:19`) entfernen.

- [ ] **Step 5: Type-Check + Gate**

Run: `npx tsc --noEmit && npm run gate`
Expected: keine Fehler; Gate grün. `.funke-rise` hat reduced-motion-Fallback. Titel/Text nutzen echte `…`/Quotes, kein `--celebrate`-Text.

- [ ] **Step 6: Visuelle Akzeptanz**

Nach dem Speichern: kein Maskottchen — ein Schwarm rosé Funken schwebt über der Esse; Titel „N Funken glühen jetzt in deiner Schmiede." (bzw. „Der erste Funke ist geschlagen." bei 1); CTA „Zurück zur Schmiede" führt zur Landing, wo dieselben Funken weiterschweben. Kein goldener Stern. Reduced motion: Schwarm sofort sichtbar.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/me/wants/schmiede/sternschmiede.tsx" "app/globals.css"
git commit -m "feat(schmiede): Success-Screen als aufsteigender Funken-Schwarm"
```

---

## Task 9: `forge-art.tsx` entfernen + totes CSS streichen

Nach Tasks 5+6 ist `AnvilArt` nicht mehr importiert. Datei entfernen und die nur von ihr genutzte `.forge-hammer`-CSS streichen.

**Files:**
- Delete: `components/brand/forge-art.tsx`
- Modify: `app/globals.css` (`.forge-hammer` `:971-980` + Eintrag in der reduced-motion-Liste `:982-990`)

**Interfaces:**
- Consumes: nichts.
- Produces: nichts.

- [ ] **Step 1: Bestätigen, dass `AnvilArt`/`forge-art` nirgends mehr importiert wird**

Run (Grep): Suche `AnvilArt` und `forge-art` in `app/` und `components/`.
Expected: keine Treffer mehr in Code-Dateien (nur noch in `docs/`, `AIC-STATUS.md` — das sind historische Referenzen, bleiben). `.me-star-glow` (shared mit `star-art.tsx`) und `.bs-ember` (shared mit `booster/weather-art.tsx`) **nicht** anfassen.

- [ ] **Step 2: Datei löschen**

```bash
git rm "components/brand/forge-art.tsx"
```

- [ ] **Step 3: `.forge-hammer`-CSS streichen**

In `app/globals.css` den `.forge-hammer`-Block (`:970-980`, inkl. Kommentar und `@keyframes forge-hammer`) entfernen. Und in der reduced-motion-Liste (`:982-990`) die Zeile `  .forge-hammer { animation: none !important; }`-Zugehörigkeit auflösen: `.forge-hammer` aus der kommagetrennten Selektorliste entfernen (die Zeile lautet dort `  .forge-spark,` gefolgt von `  .forge-hammer { animation: none !important; }` → zu `  .forge-spark { animation: none !important; }` zusammenziehen). `.forge-spark` bleibt erhalten.

- [ ] **Step 4: Type-Check + Gate + Build**

Run: `npx tsc --noEmit && npm run gate && npm run build`
Expected: alles grün. Der `build` ist hier der finale Integrations-Check nach der Datei-Löschung (fängt Geister-Importe). Falls `build` mit Geister-Typen scheitert: `.next` löschen (`rm -rf .next`) und erneut bauen (Projekt-Gotcha nach Datei-Löschungen).

- [ ] **Step 5: Commit**

```bash
git add "app/globals.css"
git commit -m "chore(schmiede): AnvilArt/forge-art.tsx entfernt + totes forge-hammer-CSS"
```

---

## Self-Review

**1. Spec-Abdeckung (11 Punkte + Spec-Sektionen):**

| Spec-Punkt | Task |
|---|---|
| Warp zu doll/golden/Streifen prominent (~750 ms, entgoldet, ~24 kühl-weiß) | Task 2 |
| Gold-Schimmer im Backdrop → rosé | Task 1 |
| Amboss zu räumlich + Stern ≠ Glyphe (Amboss raus, Esse ersetzt) | Tasks 1, 5, 6, 9 |
| Header „Nach den Sternen greifen" raus, Text in Kopf | Task 5 |
| Funken-Konstellation statt Karten; Kolben `FlaskConical` → `Flame` | Tasks 4, 5 |
| CTA „Neue Funken schlagen" (+ Erstbesuch-Fallback) | Task 5 |
| Header-Zurück = Rückflug wie unten (`onBack` → `ascend()`) | Tasks 3, 5 |
| Warte-Animation langweilig → Esse-Funkenflug | Task 6 |
| Completion-Kopf wie Sternensuche + Karten klarer antippbar (Held-Funke, Glass-Card, Hinweis, Rosé-Karten) | Task 7 |
| Success-Screen cooler → Funken-Schwarm | Task 8 |
| „Verwerfen" mit Rückfrage | Task 4 (in `FunkenSky`) |
| Funken-Fokus (Portal, Scroll-Lock, Focus-Trap, preventScroll, inert, reduced-motion) | Task 4 |
| Reduced-Motion-Fallbacks für alle neuen Keyframes | Tasks 4, 6, 8 (`.funke-drift`/`-spray`/`-rise`) |
| `forge-art.tsx` retire | Task 9 |

Alle Spec-Sektionen haben eine Task. Der bewusst ausgesparte „Funke→Stern"-Goldmoment (YAGNI) ist in Task 8 explizit nicht gebaut.

**2. Placeholder-Scan:** Keine TBD/TODO; alle Code-Schritte zeigen vollständigen Code; alle Commands haben erwartete Ausgabe.

**3. Typ-Konsistenz:** `FunkenSky`-Props (`funken: BetItem[]`, `reflectHref: (id: string) => string`, `onDelete: (id: string) => void`) in Task 4 definiert und in Task 5 exakt so aufgerufen (`funken={openBets}`, `reflectHref={(id) => `/me/wants/reflect/${id}`}`, `onDelete={deleteBet}`). `ForgeBackdrop`-Prop `intensity?: "calm" | "hot"` in Task 1 definiert, in Task 6 als `intensity="hot"` genutzt, alle Alt-Aufrufer (`<ForgeBackdrop />`) bleiben gültig. `SubPageHeader onBack?: () => void` in Task 3 definiert, in Task 5 als `onBack={goBackToStars}` genutzt. Keyframe-Namen `.funke-drift`/`.funke-spray`/`.funke-rise` konsistent zwischen CSS-Definition und `className`-Nutzung. `bg-celebrate` nutzt das registrierte Token `--color-celebrate` (`globals.css:39`).

**4. Reihenfolge/Sicherheit:** `AnvilArt`-Import wird erst in Task 6 final entfernt (nachdem Tasks 5+6 beide Nutzungen entfernt haben); `Mascot`-Import erst in Task 8; `forge-art.tsx` erst in Task 9 gelöscht — alle Löschungen nach der letzten Nutzung. `build` als finaler Integrations-Check in Task 9.
