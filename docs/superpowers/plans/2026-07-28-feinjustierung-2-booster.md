# Feinjustierung 2 — Booster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Kopfwetter-Bereich bekommt seine Intro-Maskottchen zurück, ein Modul-Icon unter dem Sub-Page-Header, einen Zoom-Übergang, bei dem das Icon vom Hub auf die Sub-Page mitreist — und einen kürzeren Einleitungstext.

**Architecture:** Vier Eingriffe in aufsteigender Größe. Task 1 ist eine Copy-Änderung, Task 2 ein Restore aus der Git-Historie (`dbde5b0^`), Task 3 führt eine geteilte `ModuleIcon`-Komponente samt zentraler Art-Map ein, Task 4 baut den Zoom-Übergang vom deckenden Lilac-Bloom auf einen fliegenden Icon-Klon um. Der `SubPageHeader` bleibt in allen Tasks **unverändert**.

**Tech Stack:** Next.js 16 App Router, React 19 Context, TailwindCSS v4, CSS-Animationen in `app/globals.css`.

Quelle: [`docs/superpowers/specs/2026-07-28-feinjustierung-runde-design.md`](../specs/2026-07-28-feinjustierung-runde-design.md), Paket 2.

## Global Constraints

- **Alle user-facing Texte sind Deutsch**, warm/ermutigend, informelles „du".
- **Deutsche Anführungszeichen sind echte Unicode-Zeichen:** U+201E (`„`) öffnend, U+201C (`"`) schließend. Nie ASCII `"`. `scripts/check-typography.mjs` prüft gerenderten Text.
- **Mobile-first, Ziel-Viewport ~375 px.**
- **Tailwind v4-Footgun:** `translate-*` / `scale-*` / `rotate-*` kompilieren zu den eigenständigen CSS-Properties `translate` / `scale` / `rotate`, NICHT zu `transform`. Wer sie bewegt, muss sie in `transition-[…]` namentlich nennen. `scripts/check-transitions.mjs` flaggt die falsche Kombination.
- **`overflow-hidden` / `overflow-x-clip` auf einem Vorfahren bindet den `sticky` `SubPageHeader` an den Clipping-Container statt an den Viewport.** Der Overthinking-Wizard-Root hat bestehend `overflow-x-clip` — bekannt riskant, unauffällig, **nicht Teil dieser Runde**. Keine neuen Clipping-Wrapper über den Header legen.
- **Es gibt kein Test-Framework im Repo.** Harte Gates: `npx tsc --noEmit`, `npm run gate`, `npm run build`. Jede Task endet damit.
- **`npm run lint` ist auf `main` vorbestehend ROT** (drei Sternschmiede-ESLint-Fehler). Keine Regression dieser Runde, eslint hängt nicht im Gate.
- **Der eigentliche Abnahme-Test ist der iPhone-Check am Live-Deploy.** Nach jeder Task committen und nach `main` pushen.
- **PowerShell 5.1-Fallen:** Pfade mit `(app)` immer quoten (`git add "app/(app)/…"`); in mehrzeiligen Commit-Messages keine inneren `"` verwenden.

---

### Task 1: Einleitungstext auf dem Kopfwetter-Hub kürzen

Der Satz „Das ist normal und das zieht auch wieder vorbei." fällt weg.

**Files:**
- Modify: `app/(app)/booster/page.tsx:10-17`

**Interfaces:**
- Consumes: nichts.
- Produces: nichts.

- [ ] **Step 1: Absatz ersetzen**

In `app/(app)/booster/page.tsx` den `<p>`-Inhalt ersetzen durch:

```tsx
        <p className="text-sm leading-relaxed text-muted-foreground">
          Manchmal schlägt das Wetter um: Zweifel, Gedankenspiralen oder
          Überforderung ziehen auf. Die folgenden Hilfen machen dich wetterfest
          gegen die Stürme und Regenwolken in deinem Kopf. Was brauchst du
          gerade?
        </p>
```

- [ ] **Step 2: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler.

- [ ] **Step 3: Committen**

```bash
git add "app/(app)/booster/page.tsx"
git commit -m "copy(booster): Einleitungstext auf dem Hub gekuerzt

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 2: Regressionsfix — Intro-Maskottchen zurückholen

Commit `dbde5b0` hat in allen fünf Booster-Intros `renderMascot` von den animierten Maskottchen auf statische Wetter-Icons umgestellt; `aac85c9` hat die dann unreferenzierten Komponenten als toten Code gelöscht. Das war nicht gewollt — die Intro-Begleiter sollen bleiben.

Geprüft: Die vier Komponenten nutzen **keine** eigenen CSS-Klassen; das in `aac85c9` mitentfernte CSS (`me-candle-bg`) gehört zum /me-Hub-Hintergrund und hat nichts mit ihnen zu tun. Der Restore ist eigenständig.

**Files:**
- Restore (aus `dbde5b0^`): `components/recipes/overthinking-intro-mascot.tsx` (222 Zeilen), `components/recipes/saying-no-intro-mascot.tsx` (240), `components/recipes/shadow-intro-mascot.tsx` (216), `components/recipes/things-got-messy-intro-mascot.tsx` (211)
- Modify: `app/(app)/booster/overthinking/overthinking-wizard.tsx:20,648`
- Modify: `app/(app)/booster/saying-no/saying-no-wizard.tsx:418`
- Modify: `app/(app)/booster/shadow/shadow-wizard.tsx:184`
- Modify: `app/(app)/booster/things-got-messy/things-got-messy-wizard.tsx:239`
- Modify: `app/(app)/booster/confidence/confidence-booster.tsx:10,57`

**Interfaces:**
- Consumes: nichts aus vorherigen Tasks.
- Produces: `OverthinkingIntroMascot`, `SayingNoIntroMascot`, `ShadowIntroMascot`, `ThingsGotMessyIntroMascot` — je `({ index }: { index: number }) => React.ReactElement`, aus `@/components/recipes/<slug>-intro-mascot`. Task 3 rendert daneben das Modul-Icon (aber NICHT auf den Intro-Seiten).

- [ ] **Step 1: Die vier Komponenten aus der Historie zurückholen**

```bash
git show "dbde5b0^:components/recipes/overthinking-intro-mascot.tsx" > components/recipes/overthinking-intro-mascot.tsx
git show "dbde5b0^:components/recipes/saying-no-intro-mascot.tsx" > components/recipes/saying-no-intro-mascot.tsx
git show "dbde5b0^:components/recipes/shadow-intro-mascot.tsx" > components/recipes/shadow-intro-mascot.tsx
git show "dbde5b0^:components/recipes/things-got-messy-intro-mascot.tsx" > components/recipes/things-got-messy-intro-mascot.tsx
```

Danach die vier Dateien öffnen und die exportierten Namen sowie die Props-Signatur notieren — die folgenden Steps gehen von `export function XIntroMascot({ index }: { index: number })` aus. Weicht eine Datei davon ab, den Aufruf im Wizard entsprechend anpassen.

- [ ] **Step 2: Prüfen, dass die Komponenten keine gelöschten CSS-Klassen brauchen**

Run: `grep -n "me-candle-bg" components/recipes/*-intro-mascot.tsx`
Expected: kein Treffer. Falls doch, die betroffene Klasse aus `dbde5b0^:app/globals.css` mit zurückholen — sonst nicht.

- [ ] **Step 3: Overthinking-Wizard umhängen**

In `app/(app)/booster/overthinking/overthinking-wizard.tsx`:

```tsx
import { OverthinkingIntroMascot } from "@/components/recipes/overthinking-intro-mascot";
```

ersetzt den `WindSwirl`-Import **nur dann**, wenn `WindSwirl` sonst nirgends in der Datei verwendet wird (Task 3 bringt ihn über `ModuleIcon` ohnehin nicht als Direktimport zurück). Mit `grep -n "WindSwirl" "app/(app)/booster/overthinking/overthinking-wizard.tsx"` gegenprüfen und ggf. beide Imports stehen lassen.

Der `renderMascot`-Aufruf:

```tsx
            renderMascot={(index) => <OverthinkingIntroMascot index={index} />}
```

- [ ] **Step 4: Saying-No-, Shadow- und Things-Got-Messy-Wizard umhängen**

`app/(app)/booster/saying-no/saying-no-wizard.tsx`:

```tsx
import { SayingNoIntroMascot } from "@/components/recipes/saying-no-intro-mascot";
```

```tsx
            renderMascot={(index) => <SayingNoIntroMascot index={index} />}
```

`app/(app)/booster/shadow/shadow-wizard.tsx`:

```tsx
import { ShadowIntroMascot } from "@/components/recipes/shadow-intro-mascot";
```

```tsx
            renderMascot={(index) => <ShadowIntroMascot index={index} />}
```

`app/(app)/booster/things-got-messy/things-got-messy-wizard.tsx`:

```tsx
import { ThingsGotMessyIntroMascot } from "@/components/recipes/things-got-messy-intro-mascot";
```

```tsx
            renderMascot={(index) => <ThingsGotMessyIntroMascot index={index} />}
```

In allen drei Dateien danach prüfen, ob der jeweilige Wetter-Import (`UmbrellaRain` / `StormCloud` / `CloudStack`) noch anderweitig benutzt wird; wenn nicht, entfernen.

- [ ] **Step 5: Confidence-Booster — `INTRO_EXPRESSIONS` und `<Mascot>` zurück**

In `app/(app)/booster/confidence/confidence-booster.tsx` den `ClearingStar`-Import durch den Mascot-Import ersetzen:

```tsx
import { Mascot } from "@/components/brand/mascot";
```

Über `INTRO_CARDS` die Konstante wieder einsetzen:

```tsx
/** Mascot-Ausdruck je Intro-Karte: neugierig ankommen, strahlend rausgehen. */
const INTRO_EXPRESSIONS = ["smile", "curious", "radiant"] as const;
```

Und den `renderMascot`-Aufruf:

```tsx
            renderMascot={(index) => (
              <Mascot
                expression={INTRO_EXPRESSIONS[index] ?? "smile"}
                size="md"
              />
            )}
```

- [ ] **Step 6: Bestätigen, dass die drei Gate-Zweige draußen bleiben**

Die Zweige für `things-got-messy` / `saying-no` / `shadow` in [`recipe-intro-gate.tsx`](../../../components/recipes/recipe-intro-gate.tsx) bleiben draußen, sofern diese Slugs nie über den Gate laufen.

Run: `grep -rln "RecipeIntroGate" --include=*.tsx app components`
Expected: genau `components/recipes/recipe-intro-gate.tsx`, `app/(app)/me/wants/wants-me.tsx`, `app/(app)/me/bill-of-rights/bill-of-rights-me.tsx`, `app/(app)/me/values/page.tsx` — also nur `values`, `wants`, `bill-of-rights`. Die Booster-Wizards rufen `RecipeIntro` direkt auf. Taucht ein Booster-Slug als Konsument auf, den passenden Zweig in `recipe-intro-gate.tsx` mit zurückholen.

- [ ] **Step 7: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler.

- [ ] **Step 8: Am Gerät prüfen und committen**

Für jeden der fünf Booster den Erstbesuch simulieren (`recipe_intro_seen` / `cleanser_intro_seen` für den Slug zurücksetzen oder mit einem frischen Account testen): Über der Intro-Karte steht wieder der animierte Begleiter, nicht das statische Wetter-Icon.

```bash
git add components/recipes "app/(app)/booster"
git commit -m "fix(booster): Intro-Maskottchen zurueckgeholt (Regression aus dbde5b0/aac85c9)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 3: Modul-Icon unter dem Sub-Page-Header

Der `SubPageHeader` bleibt **unverändert** — kein Icon-Slot, kein Icon im Header. Stattdessen eine geteilte Komponente, die auf der **ersten Seite der Übung** direkt unter dem Header zentriert sitzt:

```
+---------------------------+
|  ‹   Overthinking      ⓘ  |   SubPageHeader (unverändert)
+---------------------------+
|                           |
|            (~)            |   Modul-Icon, zentriert
|                           |
|        ● ○ ○ ○ ○ ○ ○ ○    |   ProgressDots
|          Schritt 1        |
```

| Übung | Position | Änderung |
|---|---|---|
| Overthinking | über `ProgressDots` | `WindSwirl` kommt neu dazu |
| Confidence | über der „Gleich bin ich dran?"-Karte | `ClearingStar` kommt neu dazu |
| Nein sagen | Modus-Wahl (`phase === "mode"`) | `<Mascot smile>` → `UmbrellaRain` |
| Schattenseite | Modus-Wahl (Fallthrough-Return) | `<Mascot curious>` → `StormCloud` |
| Things Got Messy | Einstieg (Fallthrough-Return) | `<Mascot smile>` → `CloudStack` |

**Alle anderen Maskottchen bleiben unangetastet** — Warte-Screens („Ich schau mir das kurz an …"), Zwischenschritte der Wizards und die Abschluss-Screens behalten ihre etablierten Begleiter. Auch die in Task 2 zurückgeholten Intro-Maskottchen bleiben, wo sie sind: **die Intro-Sequenz bekommt bewusst KEIN Modul-Icon** (dort sitzt das Intro-Maskottchen über der Karte; zwei Signaturen auf einer Intro-Seite wären zu viel).

In dieser Task rendert `ModuleIcon` das Icon nur — die Rect-Meldung an den Zoom-Kontext kommt in Task 4 dazu.

**Files:**
- Create: `components/booster/booster-art.tsx`
- Create: `components/booster/module-icon.tsx`
- Modify: `app/(app)/booster/overthinking/overthinking-wizard.tsx` (über `<ProgressDots …/>`, ~Zeile 745)
- Modify: `app/(app)/booster/confidence/confidence-booster.tsx` (über der Hero-`<Link>`-Karte, ~Zeile 77)
- Modify: `app/(app)/booster/saying-no/saying-no-wizard.tsx` (Modus-Wahl, ~Zeile 1055)
- Modify: `app/(app)/booster/shadow/shadow-wizard.tsx` (Fallthrough-Return, ~Zeile 207)
- Modify: `app/(app)/booster/things-got-messy/things-got-messy-wizard.tsx` (Fallthrough-Return, ~Zeile 485)

**Interfaces:**
- Consumes: `CellVariant = "overthinking" | "sayingNo" | "messy" | "shadow" | "confidence"` aus `@/app/(app)/booster/pressure-cell`; die fünf Wetter-Motive aus `@/app/(app)/booster/weather-art`.
- Produces:
  - `BOOSTER_ART: Record<CellVariant, (p: { className?: string }) => React.ReactElement>` aus `@/components/booster/booster-art`
  - `ModuleIcon({ variant }: { variant: CellVariant }): React.ReactElement` aus `@/components/booster/module-icon`
  - Task 4 erweitert `ModuleIcon` um die Rect-Meldung und rendert `BOOSTER_ART` im Zoom-Klon.

- [ ] **Step 1: Zentrale Art-Map anlegen**

Neue Datei `components/booster/booster-art.tsx`:

```tsx
import {
  ClearingStar,
  CloudStack,
  StormCloud,
  UmbrellaRain,
  WindSwirl,
} from "@/app/(app)/booster/weather-art";
import type { CellVariant } from "@/app/(app)/booster/pressure-cell";

/**
 * Wetter-Motiv je Kopfwetter-System — EINE Quelle für die Hub-Zelle, den
 * fliegenden Zoom-Klon und das Modul-Icon auf der Sub-Page. Ohne diese Map
 * müsste der Zoom-Klon die Variante erneut auf ein Motiv mappen und könnte von
 * der Hub-Zelle abdriften.
 */
export const BOOSTER_ART: Record<
  CellVariant,
  (props: { className?: string }) => React.ReactElement
> = {
  overthinking: WindSwirl,
  sayingNo: UmbrellaRain,
  messy: CloudStack,
  shadow: StormCloud,
  confidence: ClearingStar,
};
```

Weil `CellVariant` als `keyof typeof CELLS` definiert ist, flaggt tsc jede fehlende oder erfundene Variante — die Map kann nicht auseinanderlaufen.

- [ ] **Step 2: `ModuleIcon` anlegen**

Neue Datei `components/booster/module-icon.tsx`:

```tsx
import { BOOSTER_ART } from "@/components/booster/booster-art";
import type { CellVariant } from "@/app/(app)/booster/pressure-cell";

/**
 * Das Modul-Icon der Übung: sitzt auf der ERSTEN Seite jeder Booster-Übung
 * direkt unter dem (unveränderten) SubPageHeader und trägt dort die Signatur des
 * Wetter-Systems — dasselbe Motiv, das auf dem Hub angetippt wurde.
 *
 * Bewusst NICHT auf der Intro-Sequenz: dort sitzt das Intro-Maskottchen über der
 * Karte, zwei Signaturen auf einer Seite wären zu viel.
 */
export function ModuleIcon({ variant }: { variant: CellVariant }) {
  const Art = BOOSTER_ART[variant];
  return (
    <div className="flex justify-center pb-2 pt-1">
      <Art className="size-20" />
    </div>
  );
}
```

- [ ] **Step 3: Overthinking — über `ProgressDots`**

In `app/(app)/booster/overthinking/overthinking-wizard.tsx` den Import ergänzen:

```tsx
import { ModuleIcon } from "@/components/booster/module-icon";
```

Und im Wizard-Return direkt vor den ProgressDots:

```tsx
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <ModuleIcon variant="overthinking" />
          {/* Progress dots */}
        <ProgressDots current={step} completed={false} />
```

- [ ] **Step 4: Confidence — über der „Gleich bin ich dran?"-Karte**

In `app/(app)/booster/confidence/confidence-booster.tsx` importieren und im Haupt-Return, direkt in den Content-Container vor die Hero-`<Link>`-Karte setzen:

```tsx
      <div className="mx-auto w-full max-w-md space-y-10 px-4 py-6">
        <ModuleIcon variant="confidence" />

        {/* Hero: der akute Moment-Flow */}
        <Link href="/booster/confidence/moment" className="block">
```

Achtung: Der Container nutzt `space-y-10`. Das Icon bekommt dadurch 40 px Abstand zur Karte — das ist beabsichtigt großzügig; falls es am Gerät zu weit auseinanderfällt, das Icon in einen Wrapper mit der Karte legen statt `space-y-10` zu ändern.

- [ ] **Step 5: Nein sagen — Maskottchen der Modus-Wahl ersetzen**

In `app/(app)/booster/saying-no/saying-no-wizard.tsx`, im Modus-Wahl-Return (`// ── Render: Modus-Wahl (Einstieg) ───`), den zentrierten Block ersetzen:

```tsx
        <div className="flex flex-col items-center gap-3 text-center">
          <ModuleIcon variant="sayingNo" />
          <p className="text-base leading-relaxed text-muted-foreground">
            Schön, dass du da bist. Womit wollen wir üben?
          </p>
        </div>
```

Das `<Mascot expression="smile" size="md" />` an genau dieser Stelle entfällt. Alle anderen `<Mascot>`-Vorkommen der Datei (Warte-Screen, Feedback, Abschluss) bleiben.

- [ ] **Step 6: Schattenseite — Maskottchen der Modus-Wahl ersetzen**

In `app/(app)/booster/shadow/shadow-wizard.tsx`, im Fallthrough-Return (Modus-Wahl, heute mit `<Mascot expression="smile" size="md" />` um Zeile 207), das Maskottchen durch `<ModuleIcon variant="shadow" />` ersetzen. Die übrigen `<Mascot>`-Vorkommen (Abschluss, Zwischenschritt) bleiben unangetastet.

- [ ] **Step 7: Things Got Messy — Einstiegs-Maskottchen ersetzen**

In `app/(app)/booster/things-got-messy/things-got-messy-wizard.tsx`, im Fallthrough-Return (Einstieg, heute mit `<Mascot expression="smile" size="md" />` um Zeile 485), das Maskottchen durch `<ModuleIcon variant="messy" />` ersetzen. Das `<Mascot expression="curious" …>` auf dem Warte-Screen („Ich schau mir das kurz an …") bleibt.

- [ ] **Step 8: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler. Zusätzlich: `grep -rn "Mascot" "app/(app)/booster"` — die verbliebenen Treffer müssen ausschließlich Warte-, Zwischen- und Abschluss-Screens sein.

- [ ] **Step 9: Am Gerät prüfen und committen**

Jede der fünf Übungen als Wiederkehrer öffnen (Intro schon gesehen): Unter dem Header sitzt zentriert das Wetter-Motiv der Übung, darunter geht es normal weiter. Beim Erstbesuch (Intro-Sequenz) darf **kein** Modul-Icon zu sehen sein.

```bash
git add components/booster "app/(app)/booster"
git commit -m "feat(booster): Modul-Icon unter dem Sub-Page-Header

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 4: Zoom — Kamera fliegt aufs Icon, Icon reist nach oben

Zwei Bewegungen gleichzeitig, der Seitenwechsel liegt dazwischen:

```
Kopfwetter-Hub                       Sub-Page
                                     +----------------+
  +----------------+                 | ‹ Overthinking |
  |  (~) Ich bin   |                 +----------------+
  |      am ...    |   ══════════▶   |      (~)       |  ← Klon landet
  |                |                 |   ● ○ ○ ○ ○    |
  |  (o) Ich ...   |                 |   Schritt 1    |
  +----------------+                 +----------------+

  1) Kamera fliegt aufs Icon zu:     2) Icon-Klon reist gleichzeitig
     Hub skaliert am Tap-Punkt          nach oben in die Bildmitte
     verankert vorbei und fadet         und geht auf Zielgröße
```

Ablauf:

1. Tap auf eine Zelle → Rect des Icons und die Variante werden erfasst.
2. Ein **fixer Klon** des Wetter-Icons löst sich vom Tap-Punkt (z-Ebene über allem). Der Hub skaliert dahinter am Icon verankert an der Kamera vorbei und fadet aus — dieselbe Grammatik wie der Wants→Schmiede-Warp.
3. Der Klon reist auf einer weichen Kurve nach oben in die Bildmitte und nimmt dabei Zielgröße an.
4. Mittendrin: `router.push()` auf die Sub-Page. Der Klon liegt darüber, der Wechsel ist nicht sichtbar.
5. Sub-Page mountet:
   - **Rendert sie ein Modul-Icon** (erste Übungsseite): Sie meldet dessen Rect, der Klon setzt sich exakt darauf, blendet über auf das echte Icon und verschwindet.
   - **Rendert sie keins** (Intro-Sequenz beim Erstbesuch): Sie meldet `null`, der Klon löst sich an seiner Zielposition auf und übergibt an das Intro-Maskottchen über der Karte.

Der Zoom endet beim Erstbesuch damit anders als danach; das ist die bewusste Entscheidung.

**Was wegfällt:**
- Der Lilac-Bloom (`booster-zoom-bloom`) — er deckte die Navigation ab, das übernimmt jetzt der Klon.
- Der Spinner: [`navigation-spinner.tsx`](../../../components/layout/navigation-spinner.tsx) hört in der **Capture**-Phase, das `preventDefault()` der Booster-Zellen kommt also zu spät und der Spinner erscheint nach 150 ms mitten im Zoom.

**Was bleibt:**
- `booster-cells-zoom` (der Hub skaliert am Tap-Punkt verankert vorbei und fadet).
- Der Watchdog (`WATCHDOG_MS`) gegen hängende Navigation. Bleibt die Ankunft aus, fadet der Klon weg statt hängenzubleiben.
- Reduced motion: sofort navigieren, kein Klon, kein Push.
- Der Doppel-Tap-Schutz (`phaseRef.current !== "idle"` → normal navigieren).

**Files:**
- Modify: `components/booster/booster-zoom.tsx` (Kontext-Signatur, Overlay mit Klon)
- Modify: `components/booster/booster-cells.tsx:49-63` (Variante mitgeben, Opt-out-Marker)
- Modify: `components/booster/booster-arrive.tsx` (`arrive(null)`)
- Modify: `components/booster/module-icon.tsx` (Rect melden, während des Flugs unsichtbar)
- Modify: `components/layout/navigation-spinner.tsx:56-58` (Opt-out per `closest()`)
- Modify: `app/globals.css:1040-1071` (Bloom-CSS raus, Klon-CSS rein)

**Interfaces:**
- Consumes: `BOOSTER_ART` und `ModuleIcon` aus Task 3; `CellVariant` aus `@/app/(app)/booster/pressure-cell`; `useReducedMotion()`.
- Produces (neue Signatur von `@/components/booster/booster-zoom`):
  - `type ZoomRect = { x: number; y: number; size: number }` — Mittelpunkt in Viewport-Koordinaten plus gerenderte Kantenlänge in px.
  - `useBoosterZoom(): { phase: "idle" | "zooming" | "arriving"; flying: boolean; zoomInto(o: { rect: ZoomRect; variant: CellVariant }, navigate: () => void): void; arrive(target: ZoomRect | null): void }`
  - **Breaking:** `arrive()` nimmt jetzt ein Argument. Alle Aufrufer (`booster-arrive.tsx`, `module-icon.tsx`) werden in dieser Task mitgezogen. `origin` fällt aus dem Kontext-Wert raus.

- [ ] **Step 1: Zoom-Kontext auf den fliegenden Klon umbauen**

`components/booster/booster-zoom.tsx` komplett ersetzen:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { BOOSTER_ART } from "@/components/booster/booster-art";
import type { CellVariant } from "@/app/(app)/booster/pressure-cell";

/**
 * „Kamera-Push in den Booster" — der Zoom-Übergang vom Kopfwetter-Hub in eine
 * Sub-Page. Das Overlay lebt im geteilten booster/layout.tsx, damit es den
 * Routenwechsel überlebt (Layouts bleiben bei Navigation zwischen Kind-Routen
 * erhalten).
 *
 * Ablauf: zoomInto() → phase "zooming" (der Hub skaliert am Tap-Punkt verankert
 * vorbei und fadet, ein fixer Klon des Wetter-Icons löst sich vom Tap-Punkt und
 * reist auf einer weichen Kurve nach oben in die Bildmitte), nach ACCEL_MS
 * navigieren — der Klon liegt über allem, der Wechsel ist nicht sichtbar. Die
 * Sub-Page meldet beim Mount arrive(rect | null): mit Rect setzt sich der Klon
 * exakt auf das echte Modul-Icon und blendet über, ohne Rect löst er sich an
 * seiner Zielposition auf (Intro-Sequenz beim Erstbesuch). Reduced motion:
 * sofort navigieren, kein Klon.
 */

type Phase = "idle" | "zooming" | "arriving";

/** Mittelpunkt in Viewport-Koordinaten + gerenderte Kantenlänge (px). */
export type ZoomRect = { x: number; y: number; size: number };

type Flight = { from: ZoomRect; to: ZoomRect; variant: CellVariant };

// Navigation am Ende des Kamera-Push.
const ACCEL_MS = 300;
// Reisedauer des Klons vom Tap-Punkt zur Zielposition.
const TRAVEL_MS = 620;
// Übergabe auf das echte Icon, danach verschwindet das Overlay.
const SETTLE_MS = 260;
// Notbremse: falls arrive() nie feuert (Navigation hängt/schlägt fehl, z.B. auf
// wackliger Verbindung — PWA mit OfflineBanner, offline ist ein erwarteter
// Zustand), zwingt dieser Deckel "zooming" zurück auf "idle", statt den User
// hinter dem input-schluckenden Overlay stecken zu lassen.
const WATCHDOG_MS = ACCEL_MS + 4000;

/** Zielgröße des Klons = size-20 (80 px) des Modul-Icons. */
const TARGET_SIZE = 80;
/** Fallback-Ziel, solange die Sub-Page ihr Icon noch nicht gemeldet hat:
 *  horizontal zentriert, im oberen Drittel — dort sitzt das Modul-Icon. */
function defaultTarget(): ZoomRect {
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.28,
    size: TARGET_SIZE,
  };
}

type ZoomValue = {
  phase: Phase;
  /** true, solange der Klon die Signatur trägt — das echte Icon hält sich zurück. */
  flying: boolean;
  zoomInto: (
    o: { rect: ZoomRect; variant: CellVariant },
    navigate: () => void,
  ) => void;
  arrive: (target: ZoomRect | null) => void;
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
  const [flight, setFlight] = useState<Flight | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<number[]>([]);

  const set = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // Timer nur beim Unmount des Providers aufräumen (Provider lebt im
  // Booster-Layout, überlebt normalerweise die ganze Session — dies fängt
  // z.B. Fast-Refresh/StrictMode-Remounts ab).
  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const finish = useCallback(() => {
    const t = window.setTimeout(() => {
      set("idle");
      setFlight(null);
    }, SETTLE_MS);
    timers.current.push(t);
  }, [set]);

  const zoomInto = useCallback(
    (o: { rect: ZoomRect; variant: CellVariant }, navigate: () => void) => {
      if (phaseRef.current !== "idle") {
        // Zoom blockiert (z.B. sehr schneller Doppel-Tap) → Tap darf nicht
        // verschluckt werden, normal navigieren.
        navigate();
        return;
      }
      if (reduced) {
        navigate();
        return;
      }
      setFlight({ from: o.rect, to: defaultTarget(), variant: o.variant });
      set("zooming");
      const t = window.setTimeout(() => navigate(), ACCEL_MS);
      timers.current.push(t);
      // Notbremse: löst nur aus, wenn arrive() bis dahin nicht schon
      // "zooming" verlassen hat.
      const watchdog = window.setTimeout(() => {
        if (phaseRef.current === "zooming") {
          set("arriving");
          finish();
        }
      }, WATCHDOG_MS);
      timers.current.push(watchdog);
    },
    [reduced, set, finish],
  );

  const arrive = useCallback(
    (target: ZoomRect | null) => {
      if (phaseRef.current !== "zooming") return;
      // Mit gemeldetem Rect landet der Klon exakt auf dem echten Icon; ohne
      // (Intro-Sequenz) bleibt er auf dem Fallback-Ziel stehen und löst sich
      // dort auf.
      if (target) setFlight((f) => (f ? { ...f, to: target } : f));
      set("arriving");
      finish();
    },
    [set, finish],
  );

  return (
    <ZoomContext.Provider
      value={{ phase, flying: phase !== "idle", zoomInto, arrive }}
    >
      {children}
      <BoosterZoomOverlay phase={phase} flight={flight} />
    </ZoomContext.Provider>
  );
}

function BoosterZoomOverlay({ phase, flight }: { phase: Phase; flight: Flight | null }) {
  // Der Klon startet exakt auf dem Tap-Punkt und bekommt seine Zielwerte erst
  // im Frame danach — sonst gäbe es nichts zu transitionieren.
  const [launched, setLaunched] = useState(false);
  useEffect(() => {
    if (phase === "idle") {
      setLaunched(false);
      return;
    }
    const raf = requestAnimationFrame(() => setLaunched(true));
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  if (phase === "idle" || !flight) return null;

  const Art = BOOSTER_ART[flight.variant];
  const dx = flight.to.x - flight.from.x;
  const dy = flight.to.y - flight.from.y;
  const scale = flight.to.size / flight.from.size;

  return (
    <div aria-hidden data-phase={phase} className="booster-zoom-overlay fixed inset-0 z-[80]">
      {/* Zwei geschachtelte Ebenen mit unterschiedlichen Kurven: x läuft
          ease-out, y ease-in → zusammen ergibt das eine weiche Bogenbahn statt
          einer geraden Linie. */}
      <div
        className="booster-zoom-arc-x absolute"
        style={
          {
            left: `${flight.from.x}px`,
            top: `${flight.from.y}px`,
            translate: launched ? `${dx}px 0` : "0 0",
          } as CSSProperties
        }
      >
        <div
          className="booster-zoom-arc-y"
          style={
            {
              translate: launched ? `0 ${dy}px` : "0 0",
            } as CSSProperties
          }
        >
          <div
            className="booster-zoom-clone"
            style={
              {
                width: `${flight.from.size}px`,
                height: `${flight.from.size}px`,
                scale: launched ? `${scale}` : "1",
                opacity: phase === "arriving" ? 0 : 1,
              } as CSSProperties
            }
          >
            <Art className="size-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: CSS — Bloom raus, Klon rein**

In `app/globals.css` den Block ab `/* Kopfwetter-Hub → Sub-Page: Kamera-Push aus dem getippten Icon. */` (heute Zeile 1040–1071) ersetzen durch:

```css
/* Kopfwetter-Hub → Sub-Page: Kamera-Push aus dem getippten Icon.
   Die Zellen skalieren vom Tap-Punkt weg (Umgebung streamt nach außen), ein
   fixer Klon des Wetter-Icons reist auf einer weichen Bogenbahn nach oben in
   die Bildmitte und deckt dabei die Navigation ab. Der frühere Lilac-Bloom ist
   entfallen — diese Aufgabe trägt jetzt der Klon. */
.booster-zoom-overlay { pointer-events: auto; }

/* Bogenbahn: x läuft ease-out, y ease-in — geschachtelt ergibt das eine Kurve.
   `translate` MUSS namentlich in transition-property stehen: Tailwind v4 (und
   dieser Code) bewegen die eigenständige CSS-Property `translate`, nicht
   `transform` — sonst springt die Position, statt zu gleiten. */
.booster-zoom-arc-x {
  will-change: translate;
  transition: translate 620ms cubic-bezier(0.22, 0.61, 0.36, 1);
}
.booster-zoom-arc-y {
  will-change: translate;
  transition: translate 620ms cubic-bezier(0.55, 0.06, 0.68, 0.19);
}
/* Der Klon zentriert sich selbst auf dem Mittelpunkt, den left/top des äußeren
   Wrappers setzen. Die Zentrierung läuft über ein KONSTANTES `translate`
   (-50% -50%, bezogen auf die eigene Box) und nicht über Prozent-Margins oder
   left/top — die bezögen sich auf den Container, der hier keine eigene Breite
   hat. `scale` ist eine eigenständige Property und kollidiert deshalb nicht mit
   diesem translate. */
.booster-zoom-clone {
  translate: -50% -50%;
  transform-origin: center;
  will-change: scale, opacity;
  transition:
    scale 620ms cubic-bezier(0.22, 0.61, 0.36, 1),
    opacity 260ms ease-out;
}

.booster-cells-zoom {
  animation: booster-cells-push 300ms ease-in both;
}
@keyframes booster-cells-push {
  from { transform: scale(1);   opacity: 1; }
  to   { transform: scale(1.6); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .booster-cells-zoom { animation: none; }
  .booster-zoom-arc-x, .booster-zoom-arc-y, .booster-zoom-clone { transition: none; }
}
```

- [ ] **Step 3: Hub-Zellen — Variante mitgeben und Spinner abbestellen**

In `components/booster/booster-cells.tsx`:

```tsx
  function handleClick(e: MouseEvent<HTMLAnchorElement>, system: WeatherSystem) {
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
    zoomInto(
      { rect: { x: vx, y: vy, size: r.width }, variant: system.variant },
      () => router.push(system.href),
    );
  }
```

Der Aufruf im JSX entsprechend: `onClick={(e) => handleClick(e, s)}`.

Der äußere Container bekommt den Opt-out-Marker für den Navigations-Spinner:

```tsx
    <div
      ref={containerRef}
      data-nav-spinner="off"
      className={pushing ? "booster-cells-zoom" : undefined}
```

- [ ] **Step 4: Navigations-Spinner steigt bei markierten Bereichen aus**

In `components/layout/navigation-spinner.tsx`, direkt nach dem Auffinden des Ankers:

```tsx
      const anchor = (e.target as Element | null)?.closest("a");
      if (!anchor) return;

      // Opt-out: Bereiche, die ihre Navigation selbst inszenieren (Booster-Zoom).
      // Dieser Listener hört in der CAPTURE-Phase — das preventDefault() der
      // Booster-Zellen kommt zu spät, der Spinner erschiene sonst nach 150 ms
      // mitten im Zoom. Lokal, ohne Nebenwirkung auf andere Navigationen.
      if (anchor.closest('[data-nav-spinner="off"]')) return;
```

- [ ] **Step 5: `BoosterArrive` meldet „kein Icon"**

`components/booster/booster-arrive.tsx`:

```tsx
"use client";

import { useEffect } from "react";

import { useBoosterZoom } from "@/components/booster/booster-zoom";

/**
 * Von jeder Booster-Sub-Page beim Mount gerendert: löst die Ankunft des
 * Zoom-Übergangs aus (no-op bei Direkt-Load, weil dann kein Zoom läuft).
 *
 * Meldet bewusst `null` — „diese Seite hat kein Modul-Icon". `arrive()` greift
 * nur aus der Phase "zooming" heraus, die erste Meldung gewinnt also. Weil
 * beide Melder im selben Mount-Zyklus laufen und die Effekt-Reihenfolge (von
 * unten nach oben im Baum) nicht garantiert, dass ModuleIcon zuerst dran ist,
 * meldet BoosterArrive einen Frame später: rendert die Seite ein Modul-Icon,
 * hat dieses seinen Rect bis dahin abgesetzt und dieser Aufruf ist ein no-op.
 */
export function BoosterArrive() {
  const { arrive } = useBoosterZoom();
  useEffect(() => {
    const raf = requestAnimationFrame(() => arrive(null));
    return () => cancelAnimationFrame(raf);
  }, [arrive]);
  return null;
}
```

- [ ] **Step 6: `ModuleIcon` meldet seinen Rect und hält sich während des Flugs zurück**

`components/booster/module-icon.tsx` wird zur Client-Komponente:

```tsx
"use client";

import { useEffect, useRef } from "react";

import { BOOSTER_ART } from "@/components/booster/booster-art";
import { useBoosterZoom } from "@/components/booster/booster-zoom";
import type { CellVariant } from "@/app/(app)/booster/pressure-cell";

/**
 * Das Modul-Icon der Übung: sitzt auf der ERSTEN Seite jeder Booster-Übung
 * direkt unter dem (unveränderten) SubPageHeader und trägt dort die Signatur des
 * Wetter-Systems — dasselbe Motiv, das auf dem Hub angetippt wurde.
 *
 * Meldet beim Mount seinen DOM-Rect an den Zoom-Kontext, damit der fliegende
 * Klon exakt darauf landet, und bleibt unsichtbar, solange der Klon die Signatur
 * trägt (sonst stünden zwei Icons übereinander).
 *
 * Bewusst NICHT auf der Intro-Sequenz: dort sitzt das Intro-Maskottchen über der
 * Karte, zwei Signaturen auf einer Seite wären zu viel.
 */
export function ModuleIcon({ variant }: { variant: CellVariant }) {
  const { arrive, flying } = useBoosterZoom();
  const ref = useRef<HTMLDivElement>(null);
  const Art = BOOSTER_ART[variant];

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      arrive(null);
      return;
    }
    const r = el.getBoundingClientRect();
    arrive({ x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.width });
  }, [arrive]);

  return (
    <div className="flex justify-center pb-2 pt-1">
      <div
        ref={ref}
        className="transition-opacity duration-200 ease-out"
        style={{ opacity: flying ? 0 : 1 }}
      >
        <Art className="size-20" />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler. tsc muss insbesondere die geänderte `arrive()`-Signatur an allen Aufrufstellen durchsetzen — bleibt ein Aufruf ohne Argument übrig, bricht der Typecheck.

Zusätzlich: `grep -rn "booster-zoom-bloom\|booster-bloom" app components`
Expected: kein Treffer (das Bloom-CSS und seine Verwendung sind restlos weg).

- [ ] **Step 8: Am Gerät prüfen und committen**

Der Zoom ist auf dem Desktop nicht beurteilbar — Abnahme am iPhone gegen den Live-Deploy:

- **Landet der Klon sauber auf dem Icon?** Kein Sprung, kein Versatz beim Übergeben.
- **Kein Spinner-Aufblitzen** mitten im Zoom.
- Erstbesuch (Intro-Sequenz): Der Klon löst sich an seiner Zielposition auf und übergibt an das Intro-Maskottchen — kein Modul-Icon auf der Intro-Seite.
- Sehr schneller Doppel-Tap auf zwei Zellen: die zweite Navigation läuft normal durch, nichts hängt.
- Flugmodus an, Zelle antippen: Nach ~4,3 s fadet der Klon weg statt hängenzubleiben (Watchdog).

```bash
git add components/booster components/layout/navigation-spinner.tsx app/globals.css
git commit -m "feat(booster): Zoom uebergibt einen fliegenden Icon-Klon statt Lilac-Bloom

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

## Nicht in diesem Umfang

- **Maskottchen auf Booster-Abschluss-Screens** bleiben — sie feiern mit.
- **`overflow-x-clip`** auf dem Overthinking-Wizard-Root: bekannt riskant für den `sticky` `SubPageHeader`, aber bestehend und unauffällig.
- **Der `SubPageHeader`** bekommt weder Icon-Slot noch Icon.
