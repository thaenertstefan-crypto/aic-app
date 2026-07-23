# Kopfwetter-Hub Druckkarte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den `/booster` (Kopfwetter) Hub von einer kontrastarmen Streu-Karte zu einer sichtbaren synoptischen Druckkarte umbauen — glühende Isobaren als verbindender Grund, 5 gleichrangige Systeme im kollisionsfreien Mäander-Flow mit vollen warmen Ich-Sätzen.

**Architecture:** Zwei Schichten in einem `relative` Container: eine dekorative `PressureField`-SVG-Hintergrundkomponente (glühende Gold-Isobaren + driftende Lilac-Front + wertungsfreier Tiefenverlauf) und darüber ein Flow-Layout der 5 Links, die abwechselnd links/rechts ausgerichtet sind. Kein hartkodiertes `x/y`-Koordinaten-Layout mehr; die Höhe ergibt sich aus dem Flow.

**Tech Stack:** Next.js 16 App Router (Server Component-Page), React 19, TailwindCSS v4, GSAP (nur via bestehende `Reveal`-Komponente), handgebaute SVGs.

## Global Constraints

- **Kein Unit-Test-Harness im Repo.** Verifikation je Task = `npx tsc --noEmit` + `npm run gate` (Kontrast/Typo/Motion) + `npm run build`, alle grün. Visuelle Endabnahme = iPhone am Live-Deploy (AIC-Konvention) — **kein** Browser-Verifikations-Subagent. Keine erfundenen Jest/Vitest-Tests schreiben.
- **Design-System (DESIGN.md) bindend:** Grund Aubergine-Nacht `--background`; Text Moonlight `--foreground` (nie `#FFFFFF`, nie muted für Lesetext); Gold `--primary` = Linien/Aktion; Lilac `--cleanser-confidence` = Kopfwetter-Modulfarbe; Fraunces (`font-heading`) = Stimme/Sätze, Geist = UI/Meta.
- **Motion:** jede Animation braucht `prefers-reduced-motion`-Fallback. Bestehende `bs-*`-Klassen (Fallback zentral in `app/globals.css`) und `Reveal` (reduced-motion via `useReducedMotion`) wiederverwenden. Reveal darf Inhalt nie hinter der Transition „verstecken" — der Default ist sichtbar.
- **Tailwind v4:** `translate` ist eigene CSS-Property — falls je in einer `transition` genutzt, explizit nennen. (Hier animieren wir nur `background-color`/`scale` per CSS.)
- **Copy:** informell „du" klein. Deutsche Typografie (falls Anführungszeichen nötig: U+201E/U+201C) — im aktuellen Text kommen keine vor. Das Typo-Gate prüft nur gerenderten Text.
- **PowerShell 5.1 (Commits):** keine inneren `"` in mehrzeiligen Commit-Messages; Pfade mit `(app)`-Klammern quoten. Commit-Beispiele unten nutzen `git commit -F -` mit Bash-Heredoc.
- Referenz-Spec: `docs/superpowers/specs/2026-07-23-kopfwetter-hub-druckkarte-design.md`.

---

### Task 1: Atmosphäre — `PressureField`-Komponente + CSS-Glow-Utilities

**Files:**
- Create: `app/(app)/booster/pressure-field.tsx`
- Modify: `app/globals.css` (zwei Utilities im `bs-*`-Block ergänzen)

**Interfaces:**
- Produces: `export function PressureField(): JSX.Element` — propslose, dekorative (`aria-hidden`) SVG-Schicht, absolut positioniert (`absolute inset-0 size-full`), zum Einhängen in einen `relative` Elternteil.
- Produces (CSS): Utility-Klassen `.iso-glow` (pixelbasierter Gold-Drop-Shadow auf die Isobaren) und `.kw-cell-glow` (radialer Lilac-Verlauf als Druckzellen-Kern), beide von Task 2 genutzt.

- [ ] **Step 1: `PressureField`-Komponente anlegen**

Create `app/(app)/booster/pressure-field.tsx`:

```tsx
/**
 * Atmosphärischer Grund des Kopfwetter-Hubs: eine sichtbare synoptische
 * Druckkarte. Glühende Gold-Isobaren durchziehen die Fläche und binden die
 * Wettersysteme zu EINER Wetterlage; eine driftende Lilac-Front und ein
 * sanfter, wertungsfreier Tiefenverlauf geben Räumlichkeit. Rein dekorativ.
 *
 * preserveAspectRatio="none" streckt den 100×100-Raum auf die (dynamische)
 * Container-Höhe; vector-effect="non-scaling-stroke" hält die Linien dabei
 * sauber (keine Strichverzerrung). Der Glow läuft über die pixelbasierte
 * CSS-Utility .iso-glow. Front-Drift = bs-sway (reduced-motion-Fallback
 * liegt zentral in globals.css).
 */
export function PressureField() {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <defs>
        <linearGradient id="kw-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--background)" stopOpacity="0" />
          <stop offset="100%" stopColor="#0f0c1a" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Wertungsfreier Tiefenverlauf — kein „schlecht→gut"-Gefälle */}
      <rect x="0" y="0" width="100" height="100" fill="url(#kw-depth)" />

      {/* Isobaren — glühende, fast-vertikale Gold-Linien, die die Systeme binden */}
      <g
        className="iso-glow"
        fill="none"
        stroke="var(--primary)"
        strokeOpacity="0.4"
        strokeWidth="1.1"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M18,-4 C 30,25 8,55 22,104" />
        <path d="M40,-4 C 54,28 34,60 46,104" />
        <path d="M62,-4 C 74,24 58,58 70,104" />
        <path d="M84,-4 C 94,30 80,62 90,104" />
      </g>

      {/* Lilac-Front, driftet langsam quer */}
      <path
        className="bs-sway"
        d="M-4,30 Q 40,14 104,26"
        fill="none"
        stroke="var(--cleanser-confidence)"
        strokeOpacity="0.5"
        strokeWidth="1.2"
        strokeDasharray="1 3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
```

- [ ] **Step 2: CSS-Utilities `.iso-glow` und `.kw-cell-glow` ergänzen**

In `app/globals.css`, direkt nach der `.bs-glow`-Definition (um Zeile 711, vor dem `@media (prefers-reduced-motion: reduce)`-Block der `bs-*`-Gruppe) einfügen:

```css
  /* Kopfwetter-Hub: statischer Gold-Glow auf den Isobaren (pixelbasiert,
     daher keine Verzerrung trotz preserveAspectRatio="none"). */
  .iso-glow {
    filter: drop-shadow(0 0 3px color-mix(in srgb, var(--primary) 40%, transparent));
  }
  /* Kopfwetter-Hub: Lilac-Kern hinter jedem Wetter-Symbol (Druckzentrum). */
  .kw-cell-glow {
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--cleanser-confidence) 35%, transparent),
      transparent 70%
    );
  }
```

Beide sind statisch (keine Animation) → kein zusätzlicher reduced-motion-Fallback nötig. Die `bs-sway`-Nutzung in `PressureField` ist bereits vom bestehenden `@media (prefers-reduced-motion: reduce)`-Block (der `.bs-sway` listet) abgedeckt.

- [ ] **Step 3: Typecheck + Gate + Build**

Run:
```bash
npx tsc --noEmit && npm run gate && npm run build
```
Expected: alle drei grün (keine Typfehler; Kontrast/Typo/Motion bestanden; Build erfolgreich). `PressureField` ist noch nicht eingebunden — dieser Task prüft nur, dass Komponente + CSS sauber kompilieren.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/booster/pressure-field.tsx" app/globals.css
git commit -F - <<'EOF'
feat(booster): PressureField — sichtbarer Isobaren-Grund für Kopfwetter-Hub

Glühende Gold-Isobaren (iso-glow) + driftende Lilac-Front + wertungsfreier
Tiefenverlauf als dekorative Hintergrundschicht. Neue CSS-Utilities
.iso-glow und .kw-cell-glow.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 2: Hub-Seite auf Mäander-Flow + neue Copy umbauen

**Files:**
- Modify (vollständiger Rewrite des Bodies): `app/(app)/booster/page.tsx`

**Interfaces:**
- Consumes: `PressureField` aus `./pressure-field` (Task 1); `.kw-cell-glow` (Task 1); `Reveal` aus `@/components/ui/reveal`; `PAGE_TITLES` aus `@/lib/content/labels`; die 5 Symbol-Komponenten aus `./weather-art`.
- Der `WeatherSystem`-Typ verliert die Felder `x` und `y` (kein Koordinaten-Layout mehr); Ausrichtung wird aus dem Array-Index abgeleitet (gerade = links, ungerade = rechts).

- [ ] **Step 1: `page.tsx` vollständig ersetzen**

Replace the entire contents of `app/(app)/booster/page.tsx` with:

```tsx
import Link from "next/link";

import { Reveal } from "@/components/ui/reveal";
import { PAGE_TITLES } from "@/lib/content/labels";
import { PressureField } from "./pressure-field";
import {
  ClearingStar,
  CloudStack,
  StormCloud,
  UmbrellaRain,
  WindSwirl,
} from "./weather-art";

type WeatherSystem = {
  /** Ich-Satz, nach dem man im akuten Moment sucht — primäres Label. */
  feeling: string;
  /** Modulname, leise Meta-Zeile. */
  title: string;
  art: React.ReactNode;
  href: string;
};

const SYSTEMS: WeatherSystem[] = [
  { feeling: "Ich bin am overthinken", title: "Overthinking", art: <WindSwirl />, href: "/booster/overthinking" },
  { feeling: "Ich will zu etwas Nein sagen, aber weiß nicht wie", title: PAGE_TITLES.sayingNo, art: <UmbrellaRain />, href: "/booster/saying-no" },
  { feeling: "Ich fühl mich schuldig, obwohl ich es nicht sollte", title: PAGE_TITLES.thingsGotMessy, art: <CloudStack />, href: "/booster/things-got-messy" },
  { feeling: "Ich muss Dampf ablassen", title: PAGE_TITLES.shadow, art: <StormCloud />, href: "/booster/shadow" },
  {
    feeling:
      "Ich gehe gleich in eine nervenaufreibende Situation und brauche einen schnellen Confidence Boost",
    title: PAGE_TITLES.confidence,
    art: <ClearingStar />,
    href: "/booster/confidence",
  },
];

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

      <div className="relative">
        <PressureField />
        <div className="relative z-10 flex flex-col gap-8 py-4">
          {SYSTEMS.map((s, i) => {
            const left = i % 2 === 0;
            return (
              <Reveal
                key={s.href}
                delay={i * 0.09}
                className={left ? "self-start" : "self-end"}
              >
                <Link
                  href={s.href}
                  aria-label={`${s.title} — ${s.feeling}`}
                  className={`group flex w-[min(17rem,82vw)] items-center gap-3 rounded-xl px-3 py-3 transition-[background-color,scale] duration-150 ease-out hover:bg-muted/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                    left ? "flex-row text-left" : "flex-row-reverse text-right"
                  }`}
                >
                  <span className="relative flex size-14 shrink-0 items-center justify-center">
                    <span
                      aria-hidden="true"
                      className="kw-cell-glow absolute inset-0 rounded-full blur-md"
                    />
                    <span className="relative">{s.art}</span>
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-heading text-sm font-medium leading-snug text-balance text-foreground">
                      {s.feeling}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {s.title}
                    </span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

Hinweise: `flex-row-reverse` für die rechten Zellen setzt das Symbol an die Außenkante (rechts) und lässt den Text nach innen fließen; `text-right` richtet die Sätze zur Zellenseite aus. `self-start`/`self-end` auf dem `Reveal`-Wrapper verankert die Zelle links/rechts (der Flex-Column-Container ist `align-items: stretch`, was die explizite `w-[min(17rem,82vw)]`-Breite pro Zelle nicht überschreibt, weil `self-*` das Stretch aufhebt). So kollidieren auch der 6-Zeiler und lange Sätze nie, da benachbarte Zellen auf gegenüberliegenden Seiten stehen.

- [ ] **Step 2: Typecheck + Gate + Build**

Run:
```bash
npx tsc --noEmit && npm run gate && npm run build
```
Expected: alle grün. Insbesondere das Kontrast-Gate muss die Ich-Sätze (`--foreground` auf `--background`) bestehen; das Motion-Gate darf keine unbehandelte Transition/Animation melden (wir nutzen nur `background-color`/`scale`-Transitions + bereits abgedeckte `bs-*`/`Reveal`-Motion).

- [ ] **Step 3: Visuelle Abnahme (iPhone am Live-Deploy nach dem finalen Push)**

Konkrete Akzeptanzkriterien — auf ~375px prüfen:
- Die Isobaren-/Front-Schicht ist **deutlich sichtbar** (kein Geisterlinien-Effekt) und verbindet die Systeme zu einer Wetterlage.
- Alle 5 Ich-Sätze stehen **voll und lesbar**, keiner kollidiert mit dem Nachbarn — auch der Confidence-6-Zeiler nicht.
- Lesefluss **top→bottom**; alle Ziele im Daumenbereich erreichbar; ganze Zeile ist Tap-Ziel; Gold-Fokusring sichtbar.
- Lilac-Kern-Glow hinter jedem Symbol erkennbar; Reveal läuft ruhig (kein abgehacktes Stagger); `prefers-reduced-motion` → alles sofort sichtbar, keine Drift.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/booster/page.tsx"
git commit -F - <<'EOF'
feat(booster): Kopfwetter-Hub als synoptische Druckkarte

Streu-Karte (hartkodierte x/y) -> Mäander-Flow: 5 gleichrangige Systeme
abwechselnd links/rechts, volle warme Ich-Sätze (kollisionsfrei), neuer
Subheader, PressureField als sichtbarer Grund, Kopf-Silhouette raus.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 3: Nebenfix — Bounce-Easing im Nein-Trainer ersetzen

**Files:**
- Modify: `app/(app)/booster/saying-no/saying-no-wizard.tsx:859-863`

**Interfaces:**
- Keine geteilten Interfaces; isolierte visuelle Änderung an der Lade-Indikator-Animation (drei Punkte).

- [ ] **Step 1: `animate-bounce` → `animate-pulse` tauschen**

In `app/(app)/booster/saying-no/saying-no-wizard.tsx`, die drei Lade-Punkte (Zeilen 859–863) ersetzen. Alt:

```tsx
                  <span className="flex gap-1.5" aria-hidden="true">
                    <span className="size-2 rounded-full bg-primary/60 motion-safe:animate-bounce" />
                    <span className="size-2 rounded-full bg-primary/60 motion-safe:animate-bounce [animation-delay:150ms]" />
                    <span className="size-2 rounded-full bg-primary/60 motion-safe:animate-bounce [animation-delay:300ms]" />
                  </span>
```

Neu (weiches, gestaffeltes Fade statt datiertem Bounce — passt zum ruhigen `animate-pulse` der Zeile darüber):

```tsx
                  <span className="flex gap-1.5" aria-hidden="true">
                    <span className="size-2 rounded-full bg-primary/60 motion-safe:animate-pulse" />
                    <span className="size-2 rounded-full bg-primary/60 motion-safe:animate-pulse [animation-delay:150ms]" />
                    <span className="size-2 rounded-full bg-primary/60 motion-safe:animate-pulse [animation-delay:300ms]" />
                  </span>
```

- [ ] **Step 2: Detector + Typecheck + Gate + Build**

Run:
```bash
node .claude/skills/impeccable/scripts/detect.mjs --json "app/(app)/booster" && npx tsc --noEmit && npm run gate && npm run build
```
Expected: der Detector meldet **keine** `bounce-easing`-Warnung mehr (Exit 0, `[]`); tsc/gate/build grün.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/booster/saying-no/saying-no-wizard.tsx"
git commit -F - <<'EOF'
fix(booster): Lade-Punkte im Nein-Trainer von Bounce auf sanftes Pulse

Bounce-Easing wirkt datiert (impeccable-Detector); weiches gestaffeltes
Fade passt zum ruhigen Ton.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Nach allen Tasks

- Nach Abschluss auf `main` pushen (Solo-Projekt, AIC-Git-Workflow) — Stefan testet direkt am iPhone gegen den Live-Deploy.
- Anschließend `/impeccable critique app/(app)/booster` erneut laufen lassen, um den Score-Trend zu sehen (Baseline 27/40).

## Self-Review (vom Plan-Autor durchgeführt)

**Spec-Abdeckung:** Subheader-Copy ✓ (T2), 5 Ich-Sätze + Zuordnung ✓ (T2), `x/y` entfernt/Mäander-Flow ✓ (T2), gleichrangig/kein Ranking ✓ (T2, Index-Alternierung ohne Wertung), volle Sätze sichtbar ✓ (T2), sichtbare glühende Isobaren + Front + neutraler Verlauf ✓ (T1), Lilac-Druckzellen-Glow ✓ (T1 `.kw-cell-glow` + T2), Kopf-Silhouette raus ✓ (T2, Rewrite ohne Silhouette), Motion + reduced-motion ✓ (T1 bs-sway/iso-glow statisch, T2 Reveal), A11y/Kontrast/Tap-Ziel/Fokus ✓ (T2), `animate-bounce`-Nebenfix ✓ (T3). „du" klein ✓, „Things Got Messy" bleibt ✓. Keine Lücke.

**Placeholder-Scan:** keine TBD/TODO; alle Code-Schritte enthalten vollständigen Code; Verifikation über reale Gate-Befehle statt erfundener Tests (bewusst, da kein Test-Harness).

**Typ-Konsistenz:** `PressureField` (propslos) in T1 definiert, in T2 identisch importiert/genutzt; `.iso-glow`/`.kw-cell-glow` in T1 definiert, `.kw-cell-glow` in T2 genutzt; `WeatherSystem`-Felder in T2 durchgängig (`feeling`, `title`, `art`, `href`), `x`/`y` überall entfernt.
