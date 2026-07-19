# Dashboard-Mood-Atmosphäre & Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Dashboard-Wetterbühne (Wolken + Himmel) und die Mood-Übergänge ruhiger und atmosphärischer machen, plus alle Header eine Stufe größer.

**Architecture:** Rein clientseitige CSS/JSX-Politur an vier bekannten Dateien (`mascot-weather.tsx`, `sky-backdrop.tsx`, `globals.css`, diverse H1-Header) plus DESIGN.md-Nachzug. Keine neuen Komponenten, kein State-/Context-Umbau, keine JS-Animation wo CSS reicht. Score-getriebene Deckkraft/Transforms wie bisher; neue Nebel-Ebene als gemalter Gradient mit langsamem Drift-Keyframe.

**Tech Stack:** Next.js 16 App Router, TailwindCSS, CSS-Keyframes in `app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-07-19-dashboard-mood-atmosphaere-design.md`

## Global Constraints

- Alle User-sichtbaren Texte bleiben Deutsch (hier keine Textänderungen).
- Mobile-first, Ziel-Viewport ~375px.
- **Jede Animation braucht einen `prefers-reduced-motion: reduce`-Fallback** in `app/globals.css`.
- **Kein `backdrop-filter` in den Backdrop-Ebenen** (Glass-Is-Rare-Regel) — nur gemalte Gradienten.
- Feste rem-Typo-Stufen (Tailwind `text-*`), **kein `clamp()`** (Fixed-Scale-Rule).
- Farben über Tokens, **kein hart kodierter Hex im JSX** — Lavendel-Grau = `var(--muted-foreground)` (existiert bereits: `#A89FBE`).
- Text bleibt Moonlight, nie reines Weiß; Nebel/Schleier liegen im `-z-10`-Stack und dürfen nie den Content dimmen.
- **Verifikation pro Task:** `npx tsc --noEmit` grün. Kein automatisierter Visual-Test — CSS/Optik wird per Sicht-Check beschrieben; finales Gate ist Stefans iPhone am Live-Deploy (nach Abschluss aller Tasks: `npm run build` + `node scripts/check-contrast.mjs` grün, dann commit+push nach `main`).
- Innerhalb `mascot-weather.tsx`: **äußerer Wrapper trägt Flug (Opacity+Transform), innerer Wrapper die `dash-*`-Loop-Animation** — nie vermischen.

---

### Task 1: Header-Überschriften eine Stufe größer

**Files:**
- Modify: `app/(app)/dashboard/page.tsx:251`
- Modify: `app/(app)/me/page.tsx:73`
- Modify: `app/(app)/booster/page.tsx:37`
- Modify: `app/(app)/booster/things-got-messy/things-got-messy-wizard.tsx:276`
- Modify: `app/(app)/booster/overthinking/overthinking-wizard.tsx:664`
- Modify: `app/(app)/booster/shadow/shadow-wizard.tsx:210`
- Modify: `app/(app)/booster/saying-no/saying-no-wizard.tsx:630`
- Modify: `app/(app)/booster/confidence/moment/moment-flow.tsx:287`
- Modify: `app/(app)/me/wants/journey/wants-journey.tsx:718`
- Modify: `app/(app)/me/values/journey/evaluation/evaluation-form.tsx:199`
- Modify: `DESIGN.md` (§3 Typography → Hierarchy)

**Interfaces:**
- Consumes: nichts.
- Produces: nichts (nur Klassen-Strings). Keine Signatur-Änderung.

- [ ] **Step 1: Seiten-H1 (`text-4xl` → `text-5xl`) in den drei Hub-Seiten ändern**

In `app/(app)/dashboard/page.tsx:251`, `app/(app)/me/page.tsx:73`, `app/(app)/booster/page.tsx:37` jeweils die H1-Klasse anpassen:

```
// vorher
className="font-heading text-4xl font-bold tracking-tight text-foreground"
// nachher
className="font-heading text-5xl font-bold tracking-tight text-foreground"
```

- [ ] **Step 2: Flow-/Wizard-H1 (`text-3xl` → `text-4xl`) in den sechs Flows ändern**

In `things-got-messy-wizard.tsx:276`, `overthinking-wizard.tsx:664`, `shadow-wizard.tsx:210`, `saying-no-wizard.tsx:630`, `moment-flow.tsx:287`, `wants-journey.tsx:718` jeweils:

```
// vorher
className="font-heading text-3xl font-bold tracking-tight text-foreground"
// nachher
className="font-heading text-4xl font-bold tracking-tight text-foreground"
```

**Nicht anfassen:** `app/(app)/booster/confidence/breathing-exercise.tsx:125` (`font-heading text-3xl font-semibold tabular-nums`) — das ist die Countdown-Ziffer, kein Header.

- [ ] **Step 3: Evaluation-Header (responsive) anpassen**

In `evaluation-form.tsx:199`:

```
// vorher
className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
// nachher
className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
```

- [ ] **Step 4: DESIGN.md Typo-Skala nachziehen**

In `DESIGN.md`, Abschnitt „### Hierarchy", die Zeilen für Display und Headline ehrlich halten:

```
// vorher
- **Display** (Fraunces, 700, 2.25rem / `text-4xl`, `tracking-tight`): The greeting and page H1 ("Hey Stefan!"). One per screen.
- **Headline** (Fraunces, 600, 1.5rem): Section headings within a flow.
// nachher
- **Display** (Fraunces, 700, 3rem / `text-5xl`, `tracking-tight`): The greeting and page H1 ("Hey Stefan!"). One per screen.
- **Headline** (Fraunces, 700, 2.25rem / `text-4xl`, `tracking-tight`): Flow-/Wizard-H1 (die Schritt-Überschrift innerhalb einer Übung).
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 6: Sicht-Check (kurz)**

Dashboard, `/me`, `/booster` und ein Wizard-Schritt öffnen: H1 sichtbar größer, kein Umbruch-/Overflow-Problem bei ~375px. (Falls „Hey Stefan!" bei langem Namen zu breit wird → separat prüfen, aber `text-5xl` sollte passen.)

- [ ] **Step 7: Commit**

```bash
git add "app/(app)" DESIGN.md
git commit -m "feat(dashboard): Header-Ueberschriften eine Stufe groesser"
```

---

### Task 2: Wolken — Lavendel-Grau, größer, leichtere Deckkraft

**Files:**
- Modify: `components/dashboard/mascot-weather.tsx:15` (STROKE) und `:17-28` (CloudSvg)

**Interfaces:**
- Consumes: nichts.
- Produces: `CloudSvg` bekommt eine optionale `opacity`-Prop:
  `function CloudSvg({ heavy = false, opacity }: { heavy?: boolean; opacity?: number })`.
  Task 4 nutzt `<CloudSvg opacity={…} />`.

- [ ] **Step 1: STROKE auf Lavendel-Grau-Token umstellen**

In `mascot-weather.tsx:15`:

```tsx
// vorher
const STROKE = "var(--primary)";
// nachher
const STROKE = "var(--muted-foreground)";
```

- [ ] **Step 2: CloudSvg — größere Breiten, `opacity`-Prop, leichtere Default-Deckkraft**

`CloudSvg` (aktuell `mascot-weather.tsx:17-28`) ersetzen durch:

```tsx
function CloudSvg({
  heavy = false,
  opacity,
}: {
  heavy?: boolean;
  opacity?: number;
}) {
  const fillOpacity = opacity ?? (heavy ? 0.3 : 0.2);
  return (
    <svg viewBox="0 0 56 28" className={heavy ? "w-20" : "w-16"} aria-hidden="true">
      <g fill={STROKE} opacity={fillOpacity}>
        <circle cx="18" cy="16" r="8" />
        <circle cx="30" cy="12" r="10" />
        <circle cx="40" cy="17" r="7" />
        <rect x="10" y="16" width="37" height="9" rx="4.5" />
      </g>
    </svg>
  );
}
```

- [ ] **Step 3: Storm-Heavy-Wolke etwas dunkler/kühler (Tiefe)**

In der Storm-Wolke (aktuell `<CloudSvg heavy />`, ~`mascot-weather.tsx:71`) eine höhere Deckkraft mitgeben, damit die schwere Wolke dichter liest als die ruhigen:

```tsx
// vorher
<CloudSvg heavy />
// nachher
<CloudSvg heavy opacity={0.34} />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 5: Sicht-Check**

Dashboard, durch die Moods tippen: Wolken sind größer, in kühlem Lavendel-Grau (nicht mehr gold), Sturmwolke wirkt eine Nuance schwerer. Nicht zu blockig/schwer auf dem Aubergine (sonst Deckkraft in Step 2 minimal senken).

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/mascot-weather.tsx
git commit -m "feat(dashboard): Wolken groesser und in Lavendel-Grau statt Gold"
```

---

### Task 3: Wolken fliegen voll rein/raus, weicheres Timing

**Files:**
- Modify: `components/dashboard/mascot-weather.tsx:30-36` (flyClass) und die drei/vier Flug-Wrapper

**Interfaces:**
- Consumes: `flyClass(visible: boolean, hiddenShift: string)` aus dieser Datei.
- Produces: unveränderte Signatur von `flyClass`; nur die Klassen-Strings ändern sich. Die `hiddenShift`-Werte werden viewport-basiert (`-translate-x-[60vw]` / `translate-x-[60vw]`).

- [ ] **Step 1: flyClass — weichere/längere Transition**

`flyClass` (aktuell `mascot-weather.tsx:30-36`) anpassen:

```tsx
/** Äußerer Flug-Wrapper: sichtbar = an Ort und Stelle, sonst seitlich ganz raus. */
function flyClass(visible: boolean, hiddenShift: string): string {
  return cn(
    "absolute transition-[opacity,transform] duration-[900ms] ease-in-out",
    visible ? "translate-x-0 opacity-100" : cn("opacity-0", hiddenShift),
  );
}
```

- [ ] **Step 2: Hidden-Shifts auf vollen Screen-Austritt umstellen**

In den Flug-Wrappern die kleinen `-translate-x-8`/`translate-x-8`/`-translate-x-10` durch viewport-basierte Werte ersetzen — links platzierte Wolken nach links, rechte nach rechts:

```tsx
// Ruhige Wolke (Score 2–3), links → fliegt nach links raus/rein
<span className={cn(flyClass(cloudA, "-translate-x-[60vw]"), "-left-8 -top-2")}>

// Zweite Wolke (Score 2), rechts → nach rechts
<span className={cn(flyClass(cloudB, "translate-x-[60vw]"), "-right-10 top-6")}>

// Gewitter (Score 1), links → nach links
<span className={cn(flyClass(storm, "-translate-x-[60vw]"), "-left-12 -top-4")}>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 4: Sicht-Check**

Zwischen Moods wechseln: alte Wolken fliegen seitlich **ganz** aus dem sichtbaren Bereich, neue kommen von der Seite herein; Bewegung weicher (ease-in-out, ~900 ms). `60vw` am Gerät justieren, falls eine Wolke noch am Rand „klebt" (dann höher, z. B. `80vw`). Prüfen, dass der Container (`overflow`) das Rausfliegen nicht abschneidet — der Bühnen-Wrapper ist `absolute inset-0` ohne `overflow-hidden`, sollte passen.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/mascot-weather.tsx
git commit -m "feat(dashboard): Wolken fliegen voll rein und raus, weicheres Timing"
```

---

### Task 4: Stürmisch — zweite Regenwolke rechts

**Files:**
- Modify: `components/dashboard/mascot-weather.tsx` (Storm-Block, aktuell `:61-78`)

**Interfaces:**
- Consumes: `flyClass`, `CloudSvg` (mit `opacity`-Prop aus Task 2), `STROKE`, `cn`.
- Produces: nichts Neues nach außen.

- [ ] **Step 1: Zweite Regenwolke rechts ergänzen**

Direkt nach dem bestehenden Storm-Wrapper (der schweren Wolke links) einen zweiten Storm-Wrapper einfügen — kleinere Wolke rechts, tiefer versetzt, eigene Regenstriche mit versetzten Delays, **kein** zweites Wetterleuchten:

```tsx
{/* Gewitter (Score 1): zweite, kleinere Regenwolke rechts, tiefer versetzt */}
<span className={cn(flyClass(storm, "translate-x-[60vw]"), "-right-10 top-8")}>
  <span className="relative block dash-cloud-drift dash-cloud-drift-2">
    <CloudSvg opacity={0.26} />
    <svg viewBox="0 0 56 22" className="w-16" aria-hidden="true">
      <path className="dash-rain dash-rain-2" d="M16 2 l-2 7" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      <path className="dash-rain" d="M28 1 l-2 7" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      <path className="dash-rain dash-rain-3" d="M40 3 l-2 7" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
    </svg>
  </span>
</span>
```

(Die Delay-Reihenfolge `dash-rain-2 / dash-rain / dash-rain-3` ist bewusst anders als links, damit der Regen rechts nicht synchron mit links fällt.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 3: Sicht-Check**

Mood „Stürmisch" (Score 1): links die schwere Wolke + Wetterleuchten, rechts eine kleinere Regenwolke, beide mit fallendem Regen; Regen links/rechts nicht synchron. Beim Wechsel weg von stürmisch fliegt die rechte Wolke nach rechts raus.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/mascot-weather.tsx
git commit -m "feat(dashboard): zweite Regenwolke rechts bei stuermisch"
```

---

### Task 5: SkyBackdrop — Nebel-Ebene + Drift-Keyframe

**Files:**
- Modify: `components/backdrops/sky-backdrop.tsx` (neue Nebel-Ebene + `mist`-Berechnung)
- Modify: `app/globals.css` (neuer `sky-mist-drift`-Keyframe + reduced-motion-Fallback)

**Interfaces:**
- Consumes: `score`-Prop von `SkyBackdrop` (bereits vorhanden).
- Produces: CSS-Klasse `.sky-mist-drift` (globals.css), genutzt vom inneren Nebel-Div.

- [ ] **Step 1: `mist`-Deckkraft aus dem Score ableiten**

In `sky-backdrop.tsx`, bei den bestehenden `veil`/`starsOpacity`/`bright`-Zeilen (~`:16-18`) ergänzen:

```tsx
// Nebel zieht bei rauem Wetter herein: stürmisch am stärksten, bewölkt dezent,
// ab ruhig aufgelöst.
const mist = score === 1 ? 0.5 : score === 2 ? 0.22 : 0;
```

- [ ] **Step 2: Nebel-Ebene ins JSX einfügen**

Direkt vor dem Wetter-Schleier-Div (dem `bg-black`-Div am Ende, ~`:106-109`) die Nebel-Ebene einfügen. Äußeres Div trägt Opacity+Overflow, inneres Div den Drift; Farbe = Lavendel-Grau-Token, unten pooolend, nach oben ausfadend:

```tsx
{/* Nebel/Dunst-Ebene: weicher, langsam treibender Dunst im unteren Drittel,
    kühles Lavendel-Grau. Trägt bei rauem Wetter die Stimmung mit (statt reinem
    Abdunkeln); löst sich ab „ruhig" auf. Gemalter Gradient, kein backdrop-filter. */}
<div
  className="absolute inset-x-0 bottom-0 h-2/5 overflow-hidden transition-opacity duration-[1200ms] ease-out"
  style={{ opacity: mist }}
>
  <div
    className="sky-mist-drift absolute inset-y-0 -left-1/4 w-[150%]"
    style={{
      background:
        "linear-gradient(to top, color-mix(in srgb, var(--muted-foreground) 55%, transparent) 0%, transparent 85%)",
    }}
  />
</div>
```

- [ ] **Step 3: Drift-Keyframe in globals.css**

In `app/globals.css`, im Wetterbühnen-Block (nach `.dash-sheetlight`, ~`:492`) ergänzen:

```css
/* Nebel-Drift für den SkyBackdrop: langsame, weite Horizontalbewegung. */
@keyframes sky-mist-drift {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(6%); }
}
.sky-mist-drift { animation: sky-mist-drift 34s ease-in-out infinite; }
```

- [ ] **Step 4: Reduced-motion-Fallback**

Im bestehenden `@media (prefers-reduced-motion: reduce)`-Block (~`:494-503`) den Nebel-Drift stilllegen (der Dunst bleibt sichtbar, nur statisch):

```css
/* Reduced motion: Nebel steht still, bleibt aber sichtbar. */
.sky-mist-drift { animation: none; }
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 6: Sicht-Check**

Dashboard: bei „Stürmisch"/„Bewölkt" zieht unten ein weicher Lavendel-Dunst herein und driftet langsam seitlich; ab „Ruhig" löst er sich auf. Dunst dimmt **nicht** den Text (liegt im `-z-10`). `prefers-reduced-motion`: Dunst sichtbar, aber ohne Bewegung.

- [ ] **Step 7: Commit**

```bash
git add components/backdrops/sky-backdrop.tsx app/globals.css
git commit -m "feat(dashboard): Nebel-Ebene im SkyBackdrop als Wetter-Stimmung"
```

---

### Task 6: SkyBackdrop — zahmerer Schleier, langsamere Fades, durchgehendes Funkeln

**Files:**
- Modify: `components/backdrops/sky-backdrop.tsx` (`veil`-Werte, Sterne-Gruppe, Schleier-Div)

**Interfaces:**
- Consumes: `score`-Prop.
- Produces: nichts Neues.

- [ ] **Step 1: Schleier zahmer**

In `sky-backdrop.tsx`, die `veil`-Zeile (~`:16`) abschwächen — der Nebel aus Task 5 trägt die Stimmung jetzt mit:

```tsx
// vorher
const veil = score === 1 ? 0.35 : score === 2 ? 0.15 : 0;
// nachher
const veil = score === 1 ? 0.2 : score === 2 ? 0.1 : 0;
```

- [ ] **Step 2: Sterne-Gruppe — langsamerer Fade + `--twinkle-dur`-Umschaltung entfernen (Neustart-Fix)**

Die Sterne-Gruppen-`<div>`-Öffnung (aktuell `sky-backdrop.tsx:36-43`) ersetzen. `duration-700` → `duration-[1200ms]`; die `--twinkle-dur`-Zeile fällt weg (genau die remappt den laufenden Loop → „Neustart"). Helligkeit bei Score 5 kommt weiter sanft über den `filter`-Transition:

```tsx
{/* Sterne-Gruppe: alle sky-light-Spans wandern hier hinein. Der Twinkle-Loop
    läuft durchgehend (feste Dauer) — nur Helligkeit/Opacity faden zwischen den
    Moods, damit das Feld nie neu anläuft. */}
<div
  className="absolute inset-0 transition-[opacity,filter] duration-[1200ms] ease-out"
  style={{
    opacity: starsOpacity,
    filter: bright ? "brightness(1.5)" : undefined,
  }}
>
```

(`starsOpacity` und `bright` bleiben wie sie sind. Wichtig: **keine** `--twinkle-dur`-Property mehr im Style-Objekt — dann bleibt `.sky-light-twinkle` bei konstanten `6s`.)

- [ ] **Step 3: Wetter-Schleier-Div — langsamerer Fade**

Das `bg-black`-Schleier-Div (aktuell `sky-backdrop.tsx:106-109`) auf langsameren Fade:

```tsx
// vorher: transition-opacity duration-700 ease-out
<div
  className="absolute inset-0 bg-black transition-opacity duration-[1200ms] ease-out"
  style={{ opacity: veil }}
/>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 5: Sicht-Check**

Dashboard, mehrfach schnell zwischen Moods wechseln: Abdunkeln ist dezenter und faded spürbar langsamer (~1,2 s); **das Sternenfeld funkelt ohne Unterbrechung durch** — kein Sprung/Neustart mehr, auch nicht beim Wechsel auf/von „Sternenklar" (Score 5), dessen Helligkeit nur sanft überblendet.

- [ ] **Step 6: Commit**

```bash
git add components/backdrops/sky-backdrop.tsx
git commit -m "fix(dashboard): zahmerer Schleier, langsamere Fades, durchgehendes Sternfunkeln"
```

---

### Abschluss (nach Task 6)

- [ ] **Full build + Kontrast-Gate**

```bash
npx tsc --noEmit
npm run build
node scripts/check-contrast.mjs
```
Expected: alle grün.

- [ ] **Push nach `main`** (Solo-Projekt, direkt auf `main` erlaubt; Stefan testet dann am iPhone/Live-Deploy):

```bash
git push origin main
```

- [ ] **Finales Gate:** Stefan prüft am iPhone am Live-Deploy — Header-Größen, Wolken-Flug (voll rein/raus), Lavendel-Wolken + Regenwolke rechts bei stürmisch, Nebel-Stimmung, durchgehendes Funkeln, reduced-motion.

---

## Self-Review

**Spec-Coverage** (jede Spec-Sektion → Task):
- §1 Header größer → Task 1 (alle 10 Fundstellen + DESIGN.md, Countdown-Ziffer ausgenommen). ✔
- §2 Wolken Farbe/Größe/Deckkraft → Task 2. ✔
- §3 Wolken voll rein/raus + Timing → Task 3. ✔
- §4 Zweite Regenwolke rechts → Task 4. ✔
- §5a Nebel-Ebene → Task 5. ✔
- §5b Schleier zahmer + langsamere Fades → Task 6 (Step 1, 3) + Nebel-Fade in Task 5 (1200ms). ✔
- §5c Funkeln durchgehend (`--twinkle-dur` raus) → Task 6 (Step 2). ✔
- Nicht-Ziele (Wants-Neutralität, keine Mood-Stufen-Änderung, kein Context-Umbau) → keine Task berührt sie. ✔
- Verifikation (tsc/build/Kontrast/iPhone) → Abschluss-Block. ✔

**Placeholder-Scan:** Keine TBD/TODO; jeder Code-Step zeigt konkreten Code und exakte Pfade/Zeilen.

**Type-Konsistenz:** `CloudSvg({ heavy, opacity })` in Task 2 definiert, in Task 3/4 konsistent als `<CloudSvg opacity={…} />` genutzt. `flyClass(visible, hiddenShift)`-Signatur in Task 3 unverändert. `STROKE`/`.sky-mist-drift`/`mist` durchgängig gleich benannt.
