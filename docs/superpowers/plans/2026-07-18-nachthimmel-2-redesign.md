# Nachthimmel II — Redesign-Runde Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Bildsprache „Dein Nachthimmel" zu Ende bauen: Dashboard reagiert als Wetterszene auf den Check-in, Werteentdeckung wird zum Kompass-Pfad, Wants werden zur Sternenkarte mit benannten Sternen + Tagtraum-Schritt, Kopfwetter-Hub wird zur Wetterkarte.

**Architecture:** Vier sequenzielle Blöcke auf `main` (Spec: `docs/superpowers/specs/2026-07-18-nachthimmel-2-redesign-design.md`). Dashboard-Wetter = Hybrid aus Mascot-Bühne (neue Client-Komponente um das Maskottchen) und Himmelsreaktion (Score-Prop auf `SkyBackdrop`, verdrahtet über einen kleinen Mood-Score-Context). Werte-Journey = reiner Reskin (Glyphen + Pfadkurve, Mechanik unangetastet). Wants = JSONB-Felderweiterung (`title`, `distance`) → Destiller-Prompt → Journey-Phase `tagtraum` → Sternenkarte mit GSAP-Zoom. Kopfwetter = Szenen-Rewrite der Hub-Page.

**Tech Stack:** Next.js 16 App Router, TailwindCSS 4 + shadcn/ui, GSAP (installiert, in values-journey bereits genutzt), lucide-react 1.18.0 (**`Binoculars` ist verfügbar — kein Telescope-Fallback nötig**), Anthropic API (claude-haiku-4-5), Supabase JSONB (keine Migration).

## Global Constraints

- Alle UI-Texte Deutsch, warm, informelles „du"; typografische Anführungszeichen „…" (U+201E/U+201C) und ‚…' — nie ASCII-`"`.
- Mobile-first, Ziel-Viewport ~375 px; alle Klickziele ≥ 44 px Hit-Area.
- One-Candle-Regel: genau EIN goldener CTA/Leuchten pro Screen; neue Deko-Elemente bleiben low-alpha.
- Reduced motion überall: neue Animationen bekommen einen Eintrag in den `prefers-reduced-motion`-Blöcken von `app/globals.css`.
- Check-in-Frage exakt: **„Wie ist heute das Wetter in deinem Kopf?"**
- Brückenkarten-Titel exakt: **„Lust, was Neues zu entdecken?"**
- Keine Reflexionsfrage (`question`) an Sternen persistieren oder auf der Sternenkarte anzeigen (in der Journey-Sterne-Phase bleibt sie als Kontext).
- **Kein Test-Runner im Projekt.** Verifikations-Gates pro Block (CLAUDE.md + Spec): `npx tsc --noEmit` → `npm run build` → `node scripts/check-contrast.mjs`, dann Commit + Push auf `main` (Stefans iPhone-Check am Live-Deploy ist das visuelle Gate — KEINEN Desktop-Browser-Verifikations-Subagent dispatchen).
- Commits enden mit `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. PowerShell 5.1 zerlegt innere `"` in Commit-Messages — Messages ohne innere Anführungszeichen formulieren oder Bash-Heredoc nutzen.
- JSONB-Bestandsdaten: alte Wants ohne `title`/`distance` fallen überall sauber zurück (Label = gekürzter Text, Distanz = nah).

## File Structure (gesamt)

| Datei | Aktion | Verantwortung |
|---|---|---|
| `components/backdrops/sky-backdrop.tsx` | Modify | Glow raus, Sterne prominenter, optionaler `score`-Prop (Himmelsreaktion) |
| `app/globals.css` | Modify | `.sky-light`-Tuning, `dash-*`-Wetter-Keyframes, `want-star-twinkle`, reduced-motion-Einträge |
| `components/dashboard/mascot-weather.tsx` | Create | Wetter-Bühne (Wolken/Regen/Wetterleuchten) um das Maskottchen |
| `app/(app)/dashboard/mood-checkin.tsx` | Modify | Frage-Wording, Wetter-Bühne einhängen |
| `components/dashboard/mood-score-context.tsx` | Create | Provider + Hook für den live getippten Score |
| `components/dashboard/dashboard-sky.tsx` | Create | Client-Wrapper: Context-Score → `SkyBackdrop` |
| `components/dashboard/dashboard-focus.tsx` | Modify | Score-State in den Context heben |
| `app/(app)/dashboard/page.tsx` | Modify | Provider einbauen, `DashboardSky` statt `SkyBackdrop` |
| `app/(app)/me/values/journey/values-journey-client.tsx` | Modify | Kompass-Reskin (Kurvenpfad, Wegmarken-Glyphen, Finale-Text) |
| `app/(app)/booster/page.tsx` | Modify | Wetterkarten-Szene statt Kachel-Raster, Kerze raus |
| `lib/types/db-json.ts` | Modify | `WantItem` + `title`/`distance`, `YinYangContent` + `tagtraum` |
| `app/(app)/recipes/wants/actions.ts` | Modify | Guard/Normalisierung neue Felder, `tagtraum` speichern |
| `lib/anthropic/prompts/wants-distiller.ts` | Modify | Titel-Vorschlag, Tagtraum-Block, `distance` |
| `app/api/wants-distiller/route.ts` | Modify | Tagtraum-Input, Titel/Distance parsen |
| `app/(app)/me/wants/journey/wants-journey.tsx` | Modify | Phase `tagtraum`, Titel-Feld, fern-Badge |
| `app/(app)/me/wants/star-map.tsx` | Create | Sternenkarte + Zoom-Detailansicht (präsentational + Kamera) |
| `app/(app)/me/wants/wants-me.tsx` | Modify | Kartenliste → Sternenkarte, Dialoge, Aktionszeile, Brücken-Titel |

---

## Block 1 — Dashboard-Wetterszene

### Task 1: SkyBackdrop — Glow raus, Sterne prominenter, Score-Himmel

**Files:**
- Modify: `components/backdrops/sky-backdrop.tsx`
- Modify: `app/globals.css` (Abschnitt „Dashboard sky stage", ~Zeile 433–459)

**Interfaces:**
- Produces: `SkyBackdrop({ score }: { score?: number | null })` — `score` fehlt/`null` = neutraler Himmel (Wants-Seite bleibt unverändert aufrufbar als `<SkyBackdrop />`), `1–5` = Himmelsreaktion.

- [ ] **Step 1: Horizont-Glow-Layer entfernen**

In `sky-backdrop.tsx` das komplette `radial-gradient`-`<div>` (Zeilen 27–39, Kommentar „Horizon-glow" inklusive) löschen. Den Datei-Header-Kommentar anpassen: aus „a soft candle-gold horizon-glow behind where the mascot sits, and two barely-visible distant lights" wird sinngemäß „prominent distant lights; auf dem Dashboard reagiert der Himmel über den optionalen score-Prop auf das Kopfwetter".

- [ ] **Step 2: `.sky-light` größer/deckender + schnellere Twinkle-Amplitude vorbereiten**

In `app/globals.css` den bestehenden Block ersetzen:

```css
  /* ── Dashboard "sky stage" ─────────────────────────────────────────── */
  /* Distant lights in the night sky (Dashboard + Wants). Größer/deckender
     als die erste Version, damit sie auf gedimmtem Display sichtbar bleiben. */
  .sky-light {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--foreground);
    opacity: 0.38;
  }
  @keyframes sky-light-twinkle {
    0%, 100% { opacity: 0.2; }
    50%      { opacity: 0.55; }
  }
  .sky-light-twinkle {
    animation: sky-light-twinkle var(--twinkle-dur, 6s) ease-in-out infinite;
  }
```

(`--twinkle-dur` ist der Hebel für Score 5 „funkeln schneller" — Default 6s, unverändertes Verhalten ohne Score.)

- [ ] **Step 3: Score-Prop + Himmelsreaktion + 3 neue Sterne**

`sky-backdrop.tsx` — Signatur und zwei neue Layer. Die bestehenden `<span className="sky-light …">`-Elemente werden in einen gemeinsamen Wrapper gezogen (Sterne-Gruppe), damit Dimmen/Aufhellen EIN transitionierter Wert ist:

```tsx
export function SkyBackdrop({ score = null }: { score?: number | null }) {
  // Himmelsreaktion auf das Kopfwetter (nur mit Score — die Wants-Seite
  // rendert ohne und bleibt neutral): 1 = dunkel + Sterne verschleiert,
  // 2 = leicht gedimmt, 5 = Sterne heller/schneller.
  const veil = score === 1 ? 0.35 : score === 2 ? 0.15 : 0;
  const starsOpacity = score === 1 ? 0.35 : score === 2 ? 0.6 : 1;
  const bright = score === 5;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* Sky wash — unverändert */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(…unverändert…)" }} />

      {/* Sterne-Gruppe: alle sky-light-Spans wandern hier hinein */}
      <div
        className="absolute inset-0 transition-[opacity,filter] duration-700 ease-out"
        style={{
          opacity: starsOpacity,
          filter: bright ? "brightness(1.5)" : undefined,
          ...(bright ? ({ "--twinkle-dur": "2.8s" } as React.CSSProperties) : undefined),
        }}
      >
        {/* …alle bisherigen <span className="sky-light …" /> unverändert… */}
        {/* 3 neue Sterne (gleiche Sprache, freie Bereiche): */}
        <span className="sky-light sky-light-twinkle absolute left-[74%] top-[22%]" style={{ animationDelay: "3.7s" }} />
        <span className="sky-light sky-light-twinkle absolute left-[12%] top-[44%]" style={{ animationDelay: "1.9s" }} />
        <span className="sky-light absolute right-[8%] top-[56%]" style={{ opacity: 0.3 }} />
      </div>

      {/* Wetter-Schleier: dunkelt den Himmel bei rauem Wetter ab (liegt im
          -z-10-Stack, dimmt also nur Backdrop-Ebenen, nie den Content). */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-700 ease-out"
        style={{ opacity: veil }}
      />
    </div>
  );
}
```

Wichtig: Die zwei Spans mit Inline-`opacity` (0.15–0.18) auf **0.3** anheben (Schritt „alle prominenter"); die 3px-Sondergrößen-Styles (`width/height: "3px"`) können entfallen — 3px ist jetzt Basisgröße, stattdessen bekommen zwei der bisherigen 2px-Sterne `style={{ width: "4px", height: "4px" }}` als neue „große" Sterne.

- [ ] **Step 4: Gates**

Run: `npx tsc --noEmit` → 0 Fehler. `npm run build` → Erfolg. `node scripts/check-contrast.mjs` → bestanden (reine Deko-Änderung, muss durchlaufen).

- [ ] **Step 5: Commit**

```bash
git add components/backdrops/sky-backdrop.tsx app/globals.css
git commit -m "feat(dashboard): Horizont-Glow raus, Sterne prominenter, Himmel reagiert auf Score

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Wetter-Bühne um das Maskottchen + Frage-Wording

**Files:**
- Create: `components/dashboard/mascot-weather.tsx`
- Modify: `app/(app)/dashboard/mood-checkin.tsx`
- Modify: `app/globals.css` (neue `dash-*`-Keyframes + reduced-motion)

**Interfaces:**
- Consumes: `selected`-State aus `mood-checkin.tsx` (existiert, Default `initialScore ?? 3`).
- Produces: `MascotWeather({ score }: { score: number })` — rein dekorativ, `aria-hidden`, absolute Ebene; erwartet einen `relative`-Parent um das Maskottchen.

- [ ] **Step 1: `dash-*`-Keyframes in globals.css**

Nach dem `mascot-drift`-Block (~Zeile 454) einfügen; den bestehenden reduced-motion-Block dort erweitern:

```css
  /* ── Dashboard-Wetterbühne: Wolken-Drift, Regen, Wetterleuchten ────── */
  @keyframes dash-cloud-drift {
    0%, 100% { transform: translateX(0); }
    50%      { transform: translateX(7px); }
  }
  .dash-cloud-drift   { animation: dash-cloud-drift 9s ease-in-out infinite; }
  .dash-cloud-drift-2 { animation-duration: 13s; animation-delay: 1.5s; }
  @keyframes dash-rain {
    0%   { transform: translateY(-2px); opacity: 0; }
    30%  { opacity: 0.65; }
    70%  { opacity: 0.4; }
    100% { transform: translateY(8px); opacity: 0; }
  }
  .dash-rain   { animation: dash-rain 2.4s linear infinite; }
  .dash-rain-2 { animation-delay: 0.9s; }
  .dash-rain-3 { animation-delay: 1.7s; }
  /* Wetterleuchten: seltenes, weiches Aufglimmen — kein harter Blitz. */
  @keyframes dash-sheetlight {
    0%, 86%, 100% { opacity: 0; }
    89% { opacity: 0.32; }
    92% { opacity: 0.1; }
    95% { opacity: 0.26; }
  }
  .dash-sheetlight { animation: dash-sheetlight 11s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .dash-cloud-drift, .dash-cloud-drift-2,
    .dash-rain, .dash-rain-2, .dash-rain-3 {
      animation: none;
    }
    /* Reduced motion: kein Wetterleuchten (Basis-opacity-0 bleibt), Wolken
       und Regenstriche stehen still, bleiben aber sichtbar. */
    .dash-sheetlight { animation: none; }
  }
```

(Die `.dash-rain`-Pfade tragen Attribut-`opacity`, damit sie bei reduced motion als statische Striche sichtbar bleiben; das Wetterleuchten-Span trägt Klassen-`opacity-0` und verschwindet damit komplett — exakt die Spec-Vorgabe.)

- [ ] **Step 2: `mascot-weather.tsx` schreiben**

```tsx
"use client";

import { cn } from "@/lib/utils";

/**
 * Wetter-Bühne um das Dashboard-Maskottchen — reagiert auf den (optimistisch
 * getippten) Mood-Score. Gold-Linien-Wolken in der Formsprache von
 * weather-art.tsx; rein dekorativ (aria-hidden). Rein/raus fliegen die
 * Elemente per CSS-Transition auf dem äußeren Wrapper (Opacity + Transform);
 * Drift/Regen/Wetterleuchten laufen als dash-*-Keyframes auf einem inneren
 * Wrapper, damit sich Transition und Animation nicht um transform streiten.
 * Reduced motion stellt die Loops in globals.css still.
 */

const STROKE = "var(--primary)";

function CloudSvg({ heavy = false }: { heavy?: boolean }) {
  return (
    <svg viewBox="0 0 56 28" className={heavy ? "w-16" : "w-12"} aria-hidden="true">
      <g fill={STROKE} opacity={heavy ? 0.34 : 0.24}>
        <circle cx="18" cy="16" r="8" />
        <circle cx="30" cy="12" r="10" />
        <circle cx="40" cy="17" r="7" />
        <rect x="10" y="16" width="37" height="9" rx="4.5" />
      </g>
    </svg>
  );
}

/** Äußerer Flug-Wrapper: sichtbar = an Ort und Stelle, sonst rausgeschoben. */
function flyClass(visible: boolean, hiddenShift: string): string {
  return cn(
    "absolute transition-[opacity,transform] duration-700 ease-out",
    visible ? "translate-x-0 opacity-100" : cn("opacity-0", hiddenShift),
  );
}

export function MascotWeather({ score }: { score: number }) {
  // 1 = Gewitterwolke + Regen + Wetterleuchten, 2 = zwei Wolken,
  // 3 = eine ruhige Wolke, 4–5 = wolkenlos.
  const storm = score === 1;
  const cloudA = score === 2 || score === 3;
  const cloudB = score === 2;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Ruhige Wolke (Score 2–3), oben links vom Maskottchen */}
      <span className={cn(flyClass(cloudA, "-translate-x-8"), "-left-8 -top-2")}>
        <span className="block dash-cloud-drift">
          <CloudSvg />
        </span>
      </span>

      {/* Zweite Wolke (Score 2), rechts, etwas tiefer */}
      <span className={cn(flyClass(cloudB, "translate-x-8"), "-right-10 top-6")}>
        <span className="block dash-cloud-drift dash-cloud-drift-2">
          <CloudSvg />
        </span>
      </span>

      {/* Gewitter (Score 1): schwere Wolke + Regenstriche + Wetterleuchten */}
      <span className={cn(flyClass(storm, "-translate-x-10"), "-left-12 -top-4")}>
        <span className="relative block dash-cloud-drift">
          <span
            className="dash-sheetlight absolute -inset-3 rounded-full opacity-0"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in srgb, var(--primary) 28%, transparent), transparent 70%)",
            }}
          />
          <CloudSvg heavy />
          <svg viewBox="0 0 56 22" className="w-16" aria-hidden="true">
            <path className="dash-rain" d="M16 2 l-2 7" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
            <path className="dash-rain dash-rain-2" d="M28 1 l-2 7" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
            <path className="dash-rain dash-rain-3" d="M40 3 l-2 7" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
          </svg>
        </span>
      </span>
    </div>
  );
}
```

- [ ] **Step 3: In mood-checkin.tsx einhängen + Wording**

Frage-String (Zeile 58) ersetzen: `Wie ist das Wetter heute in deinem Kopf?` → **`Wie ist heute das Wetter in deinem Kopf?`**

Maskottchen-Block (Zeilen 61–68) bekommt eine relative Bühne:

```tsx
      <div className="mt-10 flex justify-center">
        <div className="relative">
          <MascotWeather score={selected ?? 3} />
          <div className="mascot-drift">
            <MoodAvatar
              face={MOOD_FACES[selected ?? 3]}
              pulseSeconds={MOOD_PULSE_SECONDS[selected ?? 3]}
            />
          </div>
        </div>
      </div>
```

Import ergänzen: `import { MascotWeather } from "@/components/dashboard/mascot-weather";`

`MESSAGES`, `MOODS`, Chips, `onSelect`-Pfad: **unverändert lassen.**

- [ ] **Step 4: Gates**

Run: `npx tsc --noEmit` → 0 Fehler. `npm run build` → Erfolg. `node scripts/check-contrast.mjs` → bestanden.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/mascot-weather.tsx "app/(app)/dashboard/mood-checkin.tsx" app/globals.css
git commit -m "feat(dashboard): Wetter-Buehne um das Maskottchen, neue Check-in-Frage

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Score-Context verdrahten (Himmel reagiert live)

**Files:**
- Create: `components/dashboard/mood-score-context.tsx`
- Create: `components/dashboard/dashboard-sky.tsx`
- Modify: `components/dashboard/dashboard-focus.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `SkyBackdrop({ score })` aus Task 1.
- Produces: `MoodScoreProvider({ initialScore, children })`, `useMoodScore(): { score: number | null; setScore: (s: number) => void }`, `DashboardSky()`.

**Warum Context statt State-Lifting:** `SkyBackdrop` ist `position: fixed` und wird auf Seitenebene AUSSERHALB von `DashboardReveal` gerendert (ein transformierender Reveal-Ancestor würde `fixed` zum Containing-Block-Opfer machen). Der live getippte Score lebt aber in `DashboardFocus` INNERHALB des Reveals. Ein schmaler Client-Context überbrückt das, ohne die Server-Page umzubauen — Server-gerenderte Children durch einen Client-Provider sind in RSC erlaubt.

- [ ] **Step 1: Context schreiben**

```tsx
"use client";

import { createContext, useContext, useState } from "react";

type MoodScoreContextValue = {
  score: number | null;
  setScore: (score: number) => void;
};

const MoodScoreContext = createContext<MoodScoreContextValue | null>(null);

/**
 * Teilt den optimistisch getippten Mood-Score zwischen Check-in/Fokus und dem
 * Himmel (DashboardSky). Nötig, weil der fixe SkyBackdrop außerhalb des
 * DashboardReveal leben muss (transform-Ancestor bricht position: fixed),
 * der Score aber im Reveal getippt wird.
 */
export function MoodScoreProvider({
  initialScore,
  children,
}: {
  initialScore: number | null;
  children: React.ReactNode;
}) {
  const [score, setScore] = useState<number | null>(initialScore);
  return (
    <MoodScoreContext.Provider value={{ score, setScore }}>
      {children}
    </MoodScoreContext.Provider>
  );
}

export function useMoodScore(): MoodScoreContextValue {
  const ctx = useContext(MoodScoreContext);
  if (!ctx) throw new Error("useMoodScore braucht einen MoodScoreProvider.");
  return ctx;
}
```

- [ ] **Step 2: `dashboard-sky.tsx` schreiben**

```tsx
"use client";

import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";
import { useMoodScore } from "@/components/dashboard/mood-score-context";

/** Dashboard-Variante des Himmels: reagiert auf den live getippten
 *  Check-in-Score; ohne Check-in gilt „Ruhig" (Score 3) als Default. */
export function DashboardSky() {
  const { score } = useMoodScore();
  return <SkyBackdrop score={score ?? 3} />;
}
```

- [ ] **Step 3: `dashboard-focus.tsx` auf den Context umstellen**

`useState`-Zeile (`const [score, setScore] = useState<number | null>(initialScore);`) ersetzen durch:

```tsx
  const { score, setScore } = useMoodScore();
```

Import ergänzen (`useState`-Import entfernen, falls sonst ungenutzt):
`import { useMoodScore } from "@/components/dashboard/mood-score-context";`
Props bleiben identisch (`initialScore` wird weiterhin an `MoodCheckin` durchgereicht).

- [ ] **Step 4: `page.tsx` verdrahten**

- Import `SkyBackdrop` ersetzen durch `DashboardSky` + `MoodScoreProvider`.
- Im JSX: `<SkyBackdrop />` → `<DashboardSky />`, und den gesamten Seiteninhalt (ab `<DashboardSky />` bis einschließlich `</DashboardReveal>`) in `<MoodScoreProvider initialScore={todayMood}>…</MoodScoreProvider>` wickeln:

```tsx
    <div className="space-y-10 p-4">
      <MoodScoreProvider initialScore={todayMood}>
        <DashboardSky />
        <DailyReminderScreen rights={activeRights.map((r) => r.text)} />
        <DashboardReveal>
          {/* …unverändert… */}
        </DashboardReveal>
      </MoodScoreProvider>
    </div>
```

- [ ] **Step 5: Gates**

Run: `npx tsc --noEmit` → 0 Fehler. `npm run build` → Erfolg. `node scripts/check-contrast.mjs` → bestanden.

- [ ] **Step 6: Commit + Push (Block 1 fertig → iPhone-Check)**

```bash
git add components/dashboard/mood-score-context.tsx components/dashboard/dashboard-sky.tsx components/dashboard/dashboard-focus.tsx "app/(app)/dashboard/page.tsx"
git commit -m "feat(dashboard): Himmel reagiert live auf den Check-in-Score

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

iPhone-Checkliste für Stefan (in der Abschluss-Nachricht nennen): Chips 1–5 durchtippen → Wolken fliegen rein/raus, Score 1 dunkelt Himmel + Regen + seltenes Aufglimmen, Score 5 funkelt heller; Wants-Seite unverändert neutral; Frage-Wording.

---

## Block 2 — Werteentdeckung: Kompass-Pfad

### Task 4: Reskin der Sternbild-Szene

**Files:**
- Modify: `app/(app)/me/values/journey/values-journey-client.tsx`

**Interfaces:**
- Consumes: bestehende Props `completedSteps`, `currentStep`; CSS-Klassen `star-pulse`, `star-twinkle`, `constellation-draw` (bleiben unverändert in globals.css).
- Produces: nichts Neues nach außen — reiner Reskin, Geometrie (`CONSTELLATION`, viewBox 360×880), GSAP-Kamerafahrt, Klick-Ziele, Labels, Maskottchen-Gaze bleiben identisch.

- [ ] **Step 1: Kurvenpfad-Helfer + Pfad-Rendering**

`STAR_PATH`-Konstante (Zeilen 79–81) löschen. Neuen Helfer über `StarGlyph` einfügen:

```tsx
/** Geschwungener Wanderpfad durch die Wegmarken: kubische Segmente mit
 *  vertikalen Tangenten — der Pfad schlängelt sich, statt von Punkt zu
 *  Punkt zu springen (Wanderpfad-Anmutung statt Konstellations-Polyline). */
function buildTrailPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const bend = (b.y - a.y) * 0.5;
    d += ` C ${a.x},${a.y + bend} ${b.x},${b.y - bend} ${b.x},${b.y}`;
  }
  return d;
}
```

Im SVG:
- `routeHint`-Berechnung (`const routeHint = CONSTELLATION.map(…)`) ersetzen durch `const routeHint = buildTrailPath(CONSTELLATION);` und die `<polyline points={routeHint} …/>` durch:

```tsx
            <path
              d={routeHint}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="1.5"
              strokeDasharray="2 6"
              strokeLinecap="round"
              opacity="0.25"
            />
```

- `drawnPath`-Berechnung ersetzen: `const drawnPath = drawnPoints.length >= 2 ? buildTrailPath(drawnPoints) : null;` — das `<path d={drawnPath} …/>`-Element selbst bleibt unverändert (inkl. `constellation-draw`).

- [ ] **Step 2: `StarGlyph` → `WaymarkGlyph`**

Die Komponente `StarGlyph` (Zeilen 89–129) komplett ersetzen (Aufrufstellen umbenennen, Signatur bleibt `{ state, reduced, finale }`):

```tsx
function WaymarkGlyph({
  state,
  reduced,
  finale = false,
}: {
  state: State;
  reduced: boolean;
  finale?: boolean;
}) {
  // Glow-Logik wie beim alten Sternglyph: die Endstation glüht wärmer,
  // erledigte Marken tragen einen leisen Goldschein.
  const glow = finale
    ? state === "open"
      ? "drop-shadow(0 0 8px color-mix(in srgb, var(--primary) 40%, transparent))"
      : "drop-shadow(0 0 14px color-mix(in srgb, var(--primary) 85%, transparent))"
    : state === "done"
      ? "drop-shadow(0 0 6px color-mix(in srgb, var(--primary) 60%, transparent))"
      : state === "current" && reduced
        ? "drop-shadow(0 0 8px color-mix(in srgb, var(--primary) 75%, transparent))"
        : undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        finale ? "size-9" : "size-6",
        "shrink-0",
        state === "open" && "opacity-60",
        !reduced &&
          (state === "current" || (finale && state === "done")) &&
          "star-pulse",
      )}
      style={glow ? { filter: glow } : undefined}
      aria-hidden="true"
    >
      {state === "done" && <circle cx="12" cy="12" r="5" fill="var(--primary)" />}
      {state === "current" && (
        <>
          {/* Pulsierende Kompassrose: 4-strahlige Nadel im Doppelring */}
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="var(--primary)" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--primary)" strokeWidth="1" opacity="0.3" />
          <path d="M12 5.5 L13.6 12 L12 18.5 L10.4 12 Z" fill="var(--primary)" />
          <path d="M5.5 12 L12 10.4 L18.5 12 L12 13.6 Z" fill="var(--primary)" opacity="0.45" />
        </>
      )}
      {state === "open" && (
        <circle cx="12" cy="12" r="5" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.2" />
      )}
    </svg>
  );
}
```

Beide Aufrufstellen (`<StarGlyph state={state} reduced={reduced} finale={finale} />`) zu `<WaymarkGlyph …/>` umbenennen. Den Kommentar „Sterne (Etappen)" zu „Wegmarken (Etappen)" anpassen.

- [ ] **Step 3: MICRO_STARS dimmen + Finale-Text**

- Das `MICRO_STARS.map(…)`-Rendering in `<g opacity="0.6">…</g>` wickeln (Nachthimmel über dem Pfad, nicht mehr die Checkpoint-Sprache; Twinkle-Klasse bleibt).
- Finale-Text: `Dein Sternbild ist vollständig. ✨` → **`Dein Kompass ist kalibriert. ✨`** (zweite Zeile bleibt).
- Datei-Kommentar „─── Sternbild-Geometrie" zu „─── Pfad-Geometrie" anpassen.

- [ ] **Step 4: Gates**

Run: `npx tsc --noEmit` → 0 Fehler. `npm run build` → Erfolg. `node scripts/check-contrast.mjs` → bestanden.

- [ ] **Step 5: Commit + Push (Block 2 fertig → iPhone-Check)**

```bash
git add "app/(app)/me/values/journey/values-journey-client.tsx"
git commit -m "feat(werte): Kompass-Pfad statt Sternbild — Wegmarken, Kurvenpfad, neuer Finale-Text

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

## Block 3 — Kopfwetter: die Karte deines Kopfes

### Task 5: Hub-Page als Wetterkarten-Szene

**Files:**
- Modify: `app/(app)/booster/page.tsx` (kompletter Umbau unterhalb des Headers)
- Referenz (unverändert): `app/(app)/booster/weather-art.tsx` — die 5 Motive ziehen als Komponenten um, `bs-*`-Animationen + Ein-Lilac-Akzent bleiben.

**Interfaces:**
- Consumes: `WindSwirl`, `CloudStack`, `UmbrellaRain`, `StormCloud`, `ClearingStar` (je `size-14`-SVG), `Reveal` (Default ~600 ms), `PAGE_TITLES`.
- Produces: nichts nach außen.

- [ ] **Step 1: Page umbauen**

Header (h1 + Copy) bleibt wortgleich. Der gesamte Block ab `<div className="relative -mx-1">` (inkl. `me-candle-bg`-Span, `ROWS`, `SkyCell`) wird ersetzt. Der Karten-Untergrund übernimmt die Pfade aus dem validierten Mockup 1:1 (viewBox 0 0 200 340 — die Prozent-Positionen der Systeme rechnen im selben Koordinatenraum):

```tsx
type WeatherSystem = {
  /** Ich-Satz, nach dem man im akuten Moment sucht — primäres Label. */
  feeling: string;
  /** Modulname, leise Meta-Zeile. */
  title: string;
  art: React.ReactNode;
  href: string;
  /** Position des System-Zentrums auf der Karte (viewBox-Koordinaten 200×340). */
  x: number;
  y: number;
};

const SYSTEMS: WeatherSystem[] = [
  { feeling: "Ich denke im Kreis", title: "Overthinking", art: <WindSwirl />, href: "/booster/overthinking", x: 96, y: 118 },
  { feeling: "Gerade ist alles zu viel", title: PAGE_TITLES.thingsGotMessy, art: <CloudStack />, href: "/booster/things-got-messy", x: 52, y: 192 },
  { feeling: "Ich kann schlecht Nein sagen", title: PAGE_TITLES.sayingNo, art: <UmbrellaRain />, href: "/booster/saying-no", x: 146, y: 178 },
  { feeling: "Ich muss Dampf ablassen", title: PAGE_TITLES.shadow, art: <StormCloud />, href: "/booster/shadow", x: 62, y: 262 },
  { feeling: "Ich brauche Selbstvertrauen", title: PAGE_TITLES.confidence, art: <ClearingStar />, href: "/booster/confidence", x: 142, y: 252 },
];
```

Szene (ersetzt das Grid; EIN Reveal, kein Stagger — Hub-Grammatik):

```tsx
      <Reveal>
        <div className="relative w-full" style={{ aspectRatio: "200 / 340" }}>
          {/* Karten-Untergrund: Isobaren, Kopf-Insel, Front-Linie — reine Deko */}
          <svg viewBox="0 0 200 340" className="absolute inset-0 size-full" aria-hidden="true">
            {/* Isobaren */}
            <g fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.18" strokeWidth="0.8">
              <ellipse cx="100" cy="185" rx="92" ry="130" />
              <ellipse cx="100" cy="185" rx="72" ry="105" />
              <ellipse cx="104" cy="180" rx="50" ry="78" />
            </g>
            {/* Insel: aus dem Augenwinkel eine Kopf-Silhouette im Profil */}
            <path
              d="M70 268 C 40 250, 38 210, 52 185 C 44 170, 48 140, 66 126 C 70 96, 100 82, 126 92 C 152 100, 162 128, 156 154 C 166 166, 164 186, 154 196 C 158 212, 150 230, 136 236 C 134 254, 118 268, 100 266 C 90 274, 78 274, 70 268 Z"
              fill="var(--primary)"
              fillOpacity="0.06"
              stroke="var(--primary)"
              strokeOpacity="0.35"
              strokeWidth="1"
            />
            {/* Front-Linie (Deko) */}
            <path d="M30 60 Q 70 42 110 30 Q 150 18 180 24" fill="none" stroke="var(--cleanser-confidence)" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="1 3" />
            <g fill="var(--cleanser-confidence)" fillOpacity="0.4">
              <path d="M70 44 l4 -1 -2 4 Z" />
              <path d="M120 27 l4 -1 -2 4 Z" />
            </g>
          </svg>

          {/* Die 5 Wettersysteme — echte Links auf der Karte */}
          {SYSTEMS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-label={`${s.title} — ${s.feeling}`}
              className="absolute z-10 flex w-36 -translate-x-1/2 -translate-y-9 flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition-[background-color,transform] duration-150 ease-out hover:bg-muted/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              style={{ left: `${(s.x / 200) * 100}%`, top: `${(s.y / 340) * 100}%` }}
            >
              {s.art}
              <p className="font-heading text-sm font-medium leading-snug text-balance text-foreground">
                {s.feeling}
              </p>
              <p className="text-[11px] text-muted-foreground">{s.title}</p>
            </Link>
          ))}
        </div>
      </Reveal>
```

Aufräumen: `Tile`-Typ, `TILES`, `SkyCell`, `ROWS` und der `me-candle-bg`-Span entfallen ersatzlos (Kerze laut Spec raus). Front-Linie liegt oben (y 18–60), wo kein System sitzt — Deko kollidiert nicht mit Links.

**Kollisions-Check (375 px, Szene ≈ 375×637):** Link-Breite `w-36` (144 px ≈ 76 viewBox-Units). Zentren: (96,118)/(52,192)/(146,178)/(62,262)/(142,252) → horizontale Nachbarn (52 vs. 146, 62 vs. 142) haben ≥ 80 Units Abstand, vertikale Reihen ≥ 60 Units (~112 px) — Motiv (56 px) + 2 Textzeilen passen. Bei x=52 ragt der Link bis Unit 14 (26 px vom Rand) — innerhalb des `p-4`-Paddings der Page okay, weil die Szene `w-full` im Padding sitzt. Hit-Area je Link ≥ 100×90 px ≥ 44 px. Feinjustage der 5 Koordinaten ist Stefans iPhone-Check vorbehalten.

- [ ] **Step 2: Gates**

Run: `npx tsc --noEmit` → 0 Fehler. `npm run build` → Erfolg. `node scripts/check-contrast.mjs` → bestanden (Ich-Satz bleibt `text-foreground`, Meta `text-muted-foreground` — beide auf Karten-Untergrund mit ≤ 6 % Füllung, effektiv wie Background).

- [ ] **Step 3: Commit + Push (Block 3 fertig → iPhone-Check)**

```bash
git add "app/(app)/booster/page.tsx"
git commit -m "feat(kopfwetter): Hub wird zur Karte deines Kopfes — Insel, Isobaren, Systeme als Links, Kerze raus

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

## Block 4 — Wants: Datenmodell → Destiller → Journey → Sternenkarte

### Task 6: Datenmodell + Server-Validierung (`title`, `distance`, `tagtraum`)

**Files:**
- Modify: `lib/types/db-json.ts`
- Modify: `app/(app)/recipes/wants/actions.ts`

**Interfaces:**
- Produces (für Tasks 7–9):
  - `WantItem` + `title?: string | null` + `distance?: "nah" | "fern"` (fehlend = nah; `text` bleibt die Beschreibung).
  - `YinYangContent` + `tagtraum?: string` (zeilenweise zusammengefügte Antworten).
  - `saveYinYangEntryAction` akzeptiert optionales FormData-Feld `tagtraum` (Cap `TEXT_MAX_LONG`).
  - `saveWantsAction` validiert + normalisiert die neuen Felder (Fremd-Properties fliegen weiter raus).

- [ ] **Step 1: Typen erweitern**

In `db-json.ts`, `WantItem`:

```ts
/** Element von `wants.wants` (JSONB-Array): ein bestätigtes Want. */
export type WantItem = {
  id: string;
  /** Beschreibung des Sterns („Es macht mir Spaß …"). */
  text: string;
  active: boolean;
  /** Sternname (2–3 Worte); null bei Bestandsdaten — Label fällt dann auf den gekürzten Text zurück. */
  title?: string | null;
  /** Tagtraum-Sterne stehen weiter weg; fehlend = "nah". */
  distance?: "nah" | "fern";
  /** Verlinkter bestätigter Wert (values-bank-id bzw. "custom:…"); null ohne Passung. */
  valueId?: string | null;
  /** Herkunft: KI-Hypothese oder selbst formuliert. */
  source?: "ai" | "own";
};
```

`YinYangContent` bekommt nach `principles`:

```ts
  /** Optional: „Wovon tagträumst du?" — Quelle der fernen Sterne. */
  tagtraum?: string;
```

- [ ] **Step 2: `isWantItem` + Normalisierung in actions.ts**

`isWantItem` um die zwei Felder ergänzen (vor der `valueId`-Zeile):

```ts
    (v.title === undefined ||
      v.title === null ||
      (typeof v.title === "string" && tooLong(v.title, TEXT_MAX_SHORT) === null)) &&
    (v.distance === undefined || v.distance === "nah" || v.distance === "fern") &&
```

Normalisierung in `saveWantsAction` (Zeilen 245–251) erweitern:

```ts
  const incoming: WantItem[] = incomingRaw.map((w) => ({
    id: w.id,
    text: w.text,
    active: w.active,
    title: w.title?.trim() ? w.title.trim() : null,
    distance: w.distance ?? "nah",
    valueId: w.valueId ?? null,
    source: w.source ?? "own",
  }));
```

- [ ] **Step 3: `saveYinYangEntryAction` um `tagtraum` erweitern**

Nach der `principles`-Zeile:

```ts
  const tagtraum = (formData.get("tagtraum") as string | null)?.trim() ?? "";
```

Längen-Check ergänzen (in die bestehende `lengthError`-Kette):

```ts
    (tagtraum ? tooLong(tagtraum, TEXT_MAX_LONG) : null);
```

Content-Aufbau ergänzen:

```ts
  if (tagtraum) {
    content.tagtraum = tagtraum;
  }
```

- [ ] **Step 4: Gates + Commit**

Run: `npx tsc --noEmit` → 0 Fehler. `npm run build` → Erfolg. (`check-contrast` optional — keine UI-Änderung.)

```bash
git add lib/types/db-json.ts "app/(app)/recipes/wants/actions.ts"
git commit -m "feat(wants): WantItem um title und distance erweitert, Tagtraum im Audit-Content

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Destiller — Titel-Vorschlag, Tagtraum-Block, ferne Sterne

**Files:**
- Modify: `lib/anthropic/prompts/wants-distiller.ts`
- Modify: `app/api/wants-distiller/route.ts`
- Test (Wegwerf-Skript): `<scratchpad>/distiller-live-test.mjs`

**Interfaces:**
- Consumes: `YinYangContent.tagtraum` (Task 6).
- Produces: API-Response-Wants zusätzlich mit `title: string | null` und `distance: "nah" | "fern"` (Task 8 konsumiert genau diese Feldnamen). `reason`/`question` bleiben in der Response (werden weiter angezeigt, nie persistiert).

- [ ] **Step 1: System-Prompt erweitern**

In `SYSTEM_PROMPT`:
1. Ersten Absatz ergänzen: nach „optional die kognitiven Prinzipien dahinter" einfügen „, optional ihre Tagträume (Irgendwann-mal-Träume, nach denen man greift)".
2. Daten-Tag-Satz: `<prinzipien>…</prinzipien>` um `, <tagtraeume>…</tagtraeume>` ergänzen.
3. In Aufgabe 2 (wants) nach dem `text`-Punkt einfügen:

```
   - title: Der Name des Sterns — 2 bis 3 Worte, prägnant, ohne Punkt, keine Ich-Form (z. B. ‚Klettern lernen', ‚Alte Freunde', ‚Zeit draußen').
```

4. Neuen `distance`-Punkt (nach `question`):

```
   - distance: "nah" für alle Wants aus Yin/Yang. Wenn <tagtraeume> nicht leer ist, forme ZUSÄTZLICH aus jedem klaren Tagtraum einen eigenen Want mit distance "fern" (maximal 3) — das sind die Sterne, nach denen die Person greift; text bleibt eine Beschreibung in Ich-Form, title der Name. Erfinde keine Tagträume, wenn dort "(keine Angabe)" steht.
```

5. Ausgabeformat-Zeile ersetzen:

```
{"comment": "…", "wants": [{"text": "…", "title": "…", "value_id": "<id oder null>", "reason": "…", "question": "<Rückfrage oder null>", "distance": "nah|fern"}]}
```

6. Datei-Header-Kommentar um den Tagtraum-Input ergänzen.

- [ ] **Step 2: Route erweitern**

In `route.ts`:
- `MAX_WANTS_OUT` von `6` auf `9` (3–6 Audit-Wants + max. 3 ferne).
- `WantSuggestion` + `title: string | null; distance: "nah" | "fern";`
- In `parseWants` (Destrukturierung `v` um `title`/`distance` ergänzen, Push-Objekt erweitern):

```ts
      title:
        typeof v.title === "string" && v.title.trim()
          ? v.title.trim().slice(0, 60)
          : null,
      distance: v.distance === "fern" ? "fern" : "nah",
```

- `userMessage`: nach dem `<prinzipien>`-Block einfügen:

```ts
<tagtraeume>${clampText((content.tagtraum ?? "").trim()) || "(keine Angabe)"}</tagtraeume>
```

- `max_tokens: 1200` → `1600` (Titel + bis zu 3 zusätzliche Wants; Kommentar dort anpassen).
- `ai_wants`-Provenienz bleibt bewusst `{ text, value_id }` (YAGNI — kein neues Persistenzformat).

- [ ] **Step 3: Echter API-Test (Spec-Vorgabe: nicht nur Typen)**

Wegwerf-Skript ins Scratchpad-Verzeichnis schreiben (NICHT ins Repo) — es extrahiert den Prompt aus der TS-Datei und ruft das Modell direkt:

```js
// distiller-live-test.mjs — Prompt-Qualität: Titel + ferne Sterne
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const env = fs.readFileSync(".env.local", "utf8");
const key = env.match(/ANTHROPIC_API_KEY=(.+)/)[1].trim();
const src = fs.readFileSync("lib/anthropic/prompts/wants-distiller.ts", "utf8");
const system = src.match(/SYSTEM_PROMPT = `([\s\S]+)`;/)[1];

const userMessage = `Das Yin-&-Yang-Audit der Person:
<yin>Die durchgemachten Nächte vor Kunden-Abgaben. Das Marathontraining bei Regen.</yin>
<yang>Wenn ich an einem Design tüftle, sind drei Stunden weg. Lange Wanderungen allein.</yang>
<prinzipien>(keine Angabe)</prinzipien>
<tagtraeume>Irgendwann mach ich mal einen Ironman. Irgendwann hole ich den Flugschein.</tagtraeume>

Die bestätigten Werte der Person:
<werte>
(noch keine bestätigten Werte — gib bei allen Wants value_id null an)
</werte>`;

const client = new Anthropic({ apiKey: key });
const msg = await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 1600,
  system,
  messages: [{ role: "user", content: userMessage }],
});
const raw = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
const parsed = JSON.parse(raw);
const wants = parsed.wants ?? [];
const fern = wants.filter((w) => w.distance === "fern");
console.log(JSON.stringify(wants.map((w) => ({ title: w.title, distance: w.distance, text: w.text })), null, 2));
console.log("CHECKS:",
  "alleTitel=", wants.every((w) => typeof w.title === "string" && w.title.trim().split(/\s+/).length <= 4),
  "fernAnzahl=", fern.length,
  "fernAusTagtraum=", fern.some((w) => /ironman|flugschein/i.test(w.title + w.text)),
);
```

Run: `node <scratchpad>/distiller-live-test.mjs` (aus dem Repo-Root, damit die relativen Pfade greifen).
Expected: valides JSON; alle Wants mit Titel (≤ 4 Wörter); `fernAnzahl` 1–3; `fernAusTagtraum= true`. Bei schwacher Titel-Qualität: Prompt-Beispiele nachschärfen und Test wiederholen. Ausgabe (die 3 CHECKS-Werte) in die Abschluss-Nachricht an Stefan übernehmen.

- [ ] **Step 4: Gates + Commit**

Run: `npx tsc --noEmit` → 0 Fehler. `npm run build` → Erfolg.

```bash
git add lib/anthropic/prompts/wants-distiller.ts app/api/wants-distiller/route.ts
git commit -m "feat(wants): Destiller schlaegt Sternnamen vor und formt Tagtraeume zu fernen Sternen

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Sternensuche-Journey — Phase „tagtraum" + Sterntaufe

**Files:**
- Modify: `app/(app)/me/wants/journey/wants-journey.tsx`

**Interfaces:**
- Consumes: `WantItem` mit `title`/`distance` (Task 6); Distiller-Response mit `title`/`distance` (Task 7); `Input` aus `@/components/ui/input`.
- Produces: bestätigte `WantItem`s inkl. `title` (getrimmt oder null) + `distance`.

- [ ] **Step 1: Phase, State, Draft**

- `type Phase = "nudge" | "yin" | "yang" | "tagtraum" | "analyzing" | "sterne" | "done";`
- `AuditDraft` + `tagtraum: string[];`
- Neuer State neben `yang`: `const [tagtraum, setTagtraum] = useState<string[]>(Array(START_BOXES).fill(""));`
- `restoreDraft`: analog `yang` (`Array.isArray(pendingDraft.tagtraum) && pendingDraft.tagtraum.length ? pendingDraft.tagtraum : Array(START_BOXES).fill("")` — alte Drafts ohne Feld fallen sauber auf leer zurück).
- `currentDraft`: `({ yin, yang, tagtraum, principles })`.
- `handleAuditSubmit`: `formData.set("tagtraum", joinAnswers(tagtraum));`

- [ ] **Step 2: `AnswerBoxes` optional-fähig machen**

Prop `optional?: boolean` ergänzen; `required={i === 0 && !optional}` und das `aria-label` der ersten Box bei `optional` auf `"Antwort (optional)"` stellen. Bestehende Aufrufer (yin/yang) bleiben unverändert (Default pflicht).

- [ ] **Step 3: Yang-Weiterleitung + Tagtraum-Screen**

Im Yang-Screen wird der Submit-Button zum Weiter-Button:

```tsx
              <Button
                type="button"
                className="w-full gap-2"
                size="lg"
                disabled={submitting || !yang[0]?.trim()}
                onClick={() => setPhase("tagtraum")}
              >
                Weiter
              </Button>
```

Neuer Render-Block (zwischen dem `analyzing`- und dem `yang`-Block einfügen):

```tsx
  // ── Render: Tagträume (überspringbar) ───────────────────────────

  if (phase === "tagtraum") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression="curious" size="md" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Wovon tagträumst du?
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Die Dinge, die dich manchmal gedankenversunken in die Leere
              starren lassen: „Irgendwann mach ich mal einen Ironman.
              Irgendwann hole ich den Flugschein." Solche Sterne stehen etwas
              weiter weg — nach ihnen greift man. Schreib auf, was dir kommt,
              oder überspring den Schritt einfach.
            </p>
          </div>

          <FormError message={error} />

          <form className="space-y-5">
            <AnswerBoxes
              answers={tagtraum}
              onChange={setTagtraum}
              idPrefix="tagtraum"
              optional
              placeholders={[
                "Zum Beispiel: Irgendwann mach ich mal einen Ironman …",
                "Noch ein Tagtraum …",
                "Und noch einer …",
              ]}
              disabled={submitting}
            />

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full gap-2"
                size="lg"
                disabled={submitting}
                onClick={() => void handleAuditSubmit()}
              >
                {submitting ? "Wird gespeichert …" : "Meine Wants destillieren"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={submitting}
                onClick={() => setPhase("yang")}
              >
                Zurück
              </Button>
            </div>
          </form>
          <div className="h-8" />
        </div>
      </div>
    );
  }
```

(Leere Boxen = weiter ohne Tagträume; `handleAuditSubmit` schickt dann `tagtraum: ""` und die Action lässt das Feld weg.)

- [ ] **Step 4: DraftWant + Response-Mapping**

- `DraftWant` + `title: string | null;` + `distance: "nah" | "fern";`
- `DistillerResponse.wants`-Element + `title?: string | null;` + `distance?: string;`
- Mapping in `runDistiller` ergänzen:

```ts
          title: typeof w.title === "string" && w.title.trim() ? w.title.trim() : null,
          distance: w.distance === "fern" ? "fern" : "nah",
```

- `addOwnWant`: `title: null, distance: "nah",` ergänzen (Spec: eigene Sterne — Titel leer, Distanz nah).

- [ ] **Step 5: Sterne-Phase — Titel-Feld + fern-Badge**

Import: `import { Input } from "@/components/ui/input";`

In der Draft-Karte VOR dem `<div className="flex items-start gap-2">` (Textarea-Zeile) einfügen:

```tsx
                      <div className="flex items-center gap-2">
                        <Input
                          value={want.title ?? ""}
                          onChange={(e) =>
                            setDraftWants((prev) =>
                              prev.map((w) =>
                                w.id === want.id ? { ...w, title: e.target.value } : w,
                              ),
                            )
                          }
                          maxLength={60}
                          placeholder="Name des Sterns (2–3 Worte)"
                          className="font-heading"
                          aria-label="Name des Sterns"
                        />
                        {want.distance === "fern" && (
                          <span className="shrink-0 rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            Ferner Stern
                          </span>
                        )}
                      </div>
```

Erklär-Copy über den Karten (nicht-manueller Modus) ergänzen um die Taufe — den bestehenden Satz ersetzen durch:

```
Das lese ich aus deiner Sternensuche heraus. Pass die Sätze an, verwirf, was nicht stimmt — und tauf deine Sterne: Jeder trägt einen Namensvorschlag, den du ändern kannst.
```

- [ ] **Step 6: `confirmWants` persistiert Titel + Distanz**

```ts
    const items: WantItem[] = kept.map((w) => ({
      id: w.id,
      text: w.text.trim(),
      active: true,
      title: w.title?.trim() ? w.title.trim() : null,
      distance: w.distance,
      valueId: w.valueId,
      source: w.source,
    }));
```

(`reason`/`question` werden weiterhin NICHT persistiert — nur `DraftWant`-Anzeige.)

- [ ] **Step 7: Gates + Commit**

Run: `npx tsc --noEmit` → 0 Fehler. `npm run build` → Erfolg. `node scripts/check-contrast.mjs` → bestanden.

```bash
git add "app/(app)/me/wants/journey/wants-journey.tsx"
git commit -m "feat(wants): Tagtraum-Schritt in der Sternensuche, Sterne bekommen editierbare Namen

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Die Sternenkarte mit Zoom-Detailansicht

**Files:**
- Create: `app/(app)/me/wants/star-map.tsx`
- Modify: `app/(app)/me/wants/wants-me.tsx`
- Modify: `app/globals.css` (`want-star-twinkle` + reduced motion)

**Interfaces:**
- Consumes: `WantItem` (Task 6), `gsap`, `Mascot`, `useReducedMotion`, `getValueLabel`, CSS-Klasse `want-star-twinkle` (neu).
- Produces: `StarMap({ wants, onEdit, onToggleActive }: { wants: WantItem[]; onEdit: (want: WantItem) => void; onToggleActive: (want: WantItem) => void })` — rendert Karte + Zoom + Detailansicht komplett selbst (interner `zoomedId`-State); `starLabel(want: WantItem): string` (exportiert — Titel, sonst gekürzter Text).

- [ ] **Step 1: `want-star-twinkle` in globals.css**

Nach dem `star-pulse`-Block (~Zeile 431):

```css
  /* Wants-Sternenkarte: dezentes Funkeln der benannten Sterne. */
  @keyframes want-star-twinkle {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.72; }
  }
  .want-star-twinkle { animation: want-star-twinkle 4.2s ease-in-out infinite; }
```

und `.want-star-twinkle` in einen `prefers-reduced-motion`-Block aufnehmen (`animation: none;`).

- [ ] **Step 2: `star-map.tsx` schreiben**

```tsx
"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { Pencil, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/brand/mascot";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { getValueLabel } from "@/lib/utils/values-bank";
import { cn } from "@/lib/utils";
import type { WantItem } from "@/lib/types/db-json";

/**
 * Die Sternenkarte: alle Wants als benannte Sterne an stabilen Positionen
 * (Slot-Leiter + ID-Hash), Tiefe rein über die Darstellung (fern = kleiner/
 * gedimmter/Dunst, erloschen = grau). Tipp auf einen Stern → GSAP-Kamerafahrt
 * (Scale um den Sternpunkt) → Detailansicht (Titel, Wert-Chip, Beschreibung,
 * Aktionen). Reduced motion: harter Wechsel ohne Fahrt. Persistenz und
 * Dialoge bleiben beim Parent (wants-me) — hier leben nur Szene und Kamera.
 */

/** 4-strahliger Stern — die von der Werte-Szene freigegebene Sprache. */
const STAR_PATH = "M8 0 L9.8 6.2 L16 8 L9.8 9.8 L8 16 L6.2 9.8 L0 8 L6.2 6.2 Z";

const VIEW_W = 360;
const ROW_H = 96;
const TOP_PAD = 60;
const BOTTOM_PAD = 130; // Platz für das Maskottchen unten links

/** Hintergrund-Funkelsterne als Anteile der Szene (x/y in 0–1). */
const MICRO_STARS: { fx: number; fy: number; r: number }[] = [
  { fx: 0.06, fy: 0.06, r: 1.1 }, { fx: 0.92, fy: 0.1, r: 0.9 },
  { fx: 0.5, fy: 0.16, r: 0.8 }, { fx: 0.1, fy: 0.34, r: 1.0 },
  { fx: 0.9, fy: 0.42, r: 1.2 }, { fx: 0.06, fy: 0.62, r: 0.9 },
  { fx: 0.94, fy: 0.72, r: 1.0 }, { fx: 0.55, fy: 0.88, r: 1.1 },
];

/** Stabiler Hash 0..1 aus einem String — gleicher Himmel bei jedem Besuch. */
function hash01(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

/** Kartenlabel: Titel, sonst gekürzte Beschreibung (Bestandsdaten ohne title). */
export function starLabel(w: WantItem): string {
  const t = w.title?.trim();
  if (t) return t;
  const text = w.text.trim();
  return text.length > 26 ? `${text.slice(0, 25).trimEnd()}…` : text;
}

type PlacedStar = { want: WantItem; x: number; y: number; side: "left" | "right" };

/** Slot-Leiter: nah und fern abwechselnd von oben nach unten, links/rechts
 *  versetzt; der ID-Hash gibt jedem Stern einen stabilen Versatz im Slot. */
function layoutStars(wants: WantItem[]): { stars: PlacedStar[]; viewH: number } {
  const nah = wants.filter((w) => w.distance !== "fern");
  const fern = wants.filter((w) => w.distance === "fern");
  const ordered: WantItem[] = [];
  for (let i = 0; i < Math.max(nah.length, fern.length); i++) {
    if (i < fern.length) ordered.push(fern[i]);
    if (i < nah.length) ordered.push(nah[i]);
  }
  const stars = ordered.map((want, i) => {
    const side: "left" | "right" = i % 2 === 0 ? "left" : "right";
    const baseX = side === "left" ? 96 : 264;
    return {
      want,
      x: baseX + (hash01(want.id) - 0.5) * 56,
      y: TOP_PAD + i * ROW_H + (hash01(`${want.id}y`) - 0.5) * 36,
      side,
    };
  });
  const viewH = Math.max(430, TOP_PAD + ordered.length * ROW_H + BOTTOM_PAD);
  return { stars, viewH };
}

export function StarMap({
  wants,
  onEdit,
  onToggleActive,
}: {
  wants: WantItem[];
  onEdit: (want: WantItem) => void;
  onToggleActive: (want: WantItem) => void;
}) {
  const reduced = useReducedMotion();
  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const { stars, viewH } = layoutStars(wants);
  const zoomed = stars.find((s) => s.want.id === zoomedId) ?? null;

  function zoomIn(star: PlacedStar) {
    if (zoomedId) return;
    setZoomedId(star.want.id);
    if (reduced || !mapRef.current) {
      setDetailVisible(true);
      return;
    }
    // Kamerafahrt: Scale um den Sternpunkt — der angetippte Stern bleibt
    // an Ort und Stelle, der Rest des Himmels weicht nach außen zurück.
    const rect = mapRef.current.getBoundingClientRect();
    const px = (star.x / VIEW_W) * rect.width;
    const py = (star.y / viewH) * rect.height;
    gsap.to(mapRef.current, {
      scale: 2.4,
      opacity: 0.2,
      transformOrigin: `${px}px ${py}px`,
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => setDetailVisible(true),
    });
  }

  function zoomOut() {
    setDetailVisible(false);
    if (reduced || !mapRef.current) {
      setZoomedId(null);
      return;
    }
    gsap.to(mapRef.current, {
      scale: 1,
      opacity: 1,
      duration: 0.7,
      ease: "power2.inOut",
      onComplete: () => setZoomedId(null),
    });
  }

  return (
    <div className="relative w-full" style={{ aspectRatio: `${VIEW_W} / ${viewH}` }}>
      {/* Die Karte (wird bei Zoom skaliert und gedimmt) */}
      <div ref={mapRef} className={cn("absolute inset-0", reduced && zoomedId && "opacity-0")}>
        <svg viewBox={`0 0 ${VIEW_W} ${viewH}`} className="absolute inset-0 size-full" aria-hidden="true">
          {MICRO_STARS.map((s, i) => (
            <circle
              key={i}
              cx={s.fx * VIEW_W}
              cy={s.fy * viewH}
              r={s.r}
              fill="var(--foreground)"
              className={reduced ? undefined : "star-twinkle"}
              style={reduced ? { opacity: 0.3 } : { animationDelay: `${(i % 5) * 0.7}s` }}
            />
          ))}
        </svg>

        {stars.map(({ want, x, y, side }, i) => {
          const out = !want.active;
          const fern = want.distance === "fern" && !out;
          return (
            <button
              key={want.id}
              type="button"
              onClick={() => zoomIn({ want, x, y, side })}
              aria-label={`Stern ansehen: ${starLabel(want)}`}
              className="absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left: `${(x / VIEW_W) * 100}%`, top: `${(y / viewH) * 100}%` }}
            >
              {/* Dunst-Schleier hinter fernen Sternen */}
              {fern && (
                <span aria-hidden className="absolute size-8 rounded-full bg-foreground/10 blur-md" />
              )}
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className={cn(
                  "shrink-0",
                  out ? "size-3 opacity-30" : fern ? "size-3.5 opacity-55" : "size-6",
                  !reduced && !out && "want-star-twinkle",
                )}
                style={{
                  animationDelay: `${(i % 5) * 0.9}s`,
                  filter: out
                    ? undefined
                    : `drop-shadow(0 0 ${fern ? 3 : 6}px color-mix(in srgb, var(--primary) ${fern ? 35 : 55}%, transparent))`,
                }}
              >
                <path d={STAR_PATH} fill={out ? "var(--muted-foreground)" : "var(--primary)"} />
              </svg>
              <span
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-heading",
                  side === "left" ? "left-full ml-1.5" : "right-full mr-1.5",
                  out
                    ? "text-xs text-muted-foreground/70"
                    : fern
                      ? "text-xs text-muted-foreground"
                      : "text-base font-semibold text-foreground",
                )}
              >
                {starLabel(want)}
              </span>
            </button>
          );
        })}

        {/* Maskottchen schaut von unten in den Himmel */}
        <div className="absolute bottom-1 left-1">
          <Mascot size="sm" expression="curious" gazeX={0.6} gazeY={-1.6} />
        </div>
      </div>

      {/* Zoom-Detailansicht: reine Betrachtung (Variante B — keine Schmiede) */}
      {zoomed && detailVisible && (
        <div className="absolute inset-0 z-20 flex flex-col items-center gap-4 px-2 pt-2 text-center animate-in fade-in duration-300">
          <button
            type="button"
            onClick={zoomOut}
            className="flex min-h-11 items-center self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Zurück zum Himmel
          </button>

          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="size-16"
            style={{
              filter: zoomed.want.active
                ? "drop-shadow(0 0 18px color-mix(in srgb, var(--primary) 80%, transparent))"
                : undefined,
            }}
          >
            <path
              d={STAR_PATH}
              fill={zoomed.want.active ? "var(--primary)" : "var(--muted-foreground)"}
              opacity={zoomed.want.active ? 1 : 0.5}
            />
          </svg>

          <div className="space-y-2">
            <h3 className="font-heading text-2xl font-semibold text-foreground">
              {starLabel(zoomed.want)}
            </h3>
            {zoomed.want.distance === "fern" && zoomed.want.active && (
              <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Ferner Stern — nach ihm greifst du
              </span>
            )}
            {!zoomed.want.active && (
              <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Erloschen
              </span>
            )}
          </div>

          {zoomed.want.valueId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Sparkles className="size-3" />
              nährt deinen Wert: {getValueLabel(zoomed.want.valueId)}
            </span>
          )}

          <div className="w-full rounded-xl bg-foreground/5 p-4 text-left">
            <p className="text-base leading-relaxed text-foreground">{zoomed.want.text}</p>
          </div>

          <div className="flex w-full flex-col gap-2 pt-1">
            <Button variant="outline" className="w-full gap-2" onClick={() => onEdit(zoomed.want)}>
              <Pencil className="size-4" /> Bearbeiten
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => onToggleActive(zoomed.want)}
            >
              {zoomed.want.active ? "Stern loslassen" : "Wieder anzünden"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

Hinweis für den Implementierer: Bei sehr kurzen Karten (1–2 Sterne, viewH 430) ist die Detailansicht höher als die Karte — die Szene wächst dank `aspectRatio` mit, die Detail-Inhalte dürfen aber überlaufen; falls `tsc`/optische Prüfung zeigt, dass Inhalt abgeschnitten wird, dem Detail-Container `min-h-[480px]` auf dem äußeren `relative`-Div spendieren (`style={{ aspectRatio: …, minHeight: zoomedId ? 480 : undefined }}`).

- [ ] **Step 3: `wants-me.tsx` umbauen**

Änderungen im Einzelnen:

1. **Imports:** Entfernen: `Star`, `RefreshCw`, `Sparkles`, `Pencil` (Wert-Chip + Stift leben jetzt in der StarMap), `Card`/`CardContent` (Liste entfällt), `getValueLabel`. Hinzufügen: `Binoculars` (lucide), `Input` aus `@/components/ui/input`, `StarMap` aus `./star-map`. Bleiben: `Plus`, `Textarea`, alle `Dialog*`-Bausteine, `StarArt`, `Flame`, `Loader2`.
2. **State:** `newWant` entfällt; neu:

```tsx
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addText, setAddText] = useState("");
```

3. **Handler** (ersetzen `addWant`/`startEdit`/`saveEdit`; `deleteWant`, `persistWants`, Warp-Logik bleiben):

```tsx
  function startEdit(w: WantItem) {
    setEditingId(w.id);
    setEditTitle(w.title ?? "");
    setEditText(w.text);
  }

  function saveEdit() {
    const t = editText.trim();
    if (!t || !editingId) return;
    void persistWants(
      wants.map((w) =>
        w.id === editingId
          ? { ...w, text: t, title: editTitle.trim() ? editTitle.trim() : null }
          : w,
      ),
    );
    setEditingId(null);
  }

  function addOwnStar() {
    const text = addText.trim();
    if (!text) return;
    void persistWants([
      ...wants,
      {
        id: crypto.randomUUID(),
        text,
        title: addTitle.trim() ? addTitle.trim() : null,
        active: true,
        distance: "nah",
        valueId: null,
        source: "own",
      },
    ]);
    setAddOpen(false);
    setAddTitle("");
    setAddText("");
  }

  function toggleActive(w: WantItem) {
    void persistWants(
      wants.map((x) => (x.id === w.id ? { ...x, active: !x.active } : x)),
    );
  }
```

4. **Leerzustand-Bedingung:** `const hasSterne = wants.length > 0;` (erloschene Sterne halten die Karte am Leben, damit „Wieder anzünden" erreichbar bleibt). `activeWants` entfällt.
5. **Hauptbereich** (ersetzt `<section>` „Meine Sterne" + Add-Textarea + `<hr>` + RefreshCw-Button):

```tsx
                  <FormError message={saveError} />

                  {/* key: Add/Delete layouten die Karte neu UND setzen den
                      Zoom-State zurück (Remount) — sonst zeigt ein offener
                      Zoom nach dem Löschen ins Leere. Loslassen/Anzünden
                      ändert die Länge nicht, die Detailansicht bleibt offen. */}
                  <StarMap key={wants.length} wants={wants} onEdit={startEdit} onToggleActive={toggleActive} />

                  {/* Aktionszeile unter der Karte */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      render={<Link href="/me/wants/journey" />}
                    >
                      <Binoculars className="size-4" /> Sternensuche
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => setAddOpen(true)}
                    >
                      <Plus className="size-4" /> Eigener Stern
                    </Button>
                  </div>

                  {/* Brücke in die Sternschmiede */}
                  {forgeBridge(true)}
```

Der Reveal-Hero (StarArt + `PAGE_TITLES.meWantsHero` + Untertitel) bleibt unverändert davor.
6. **Brückenkarte:** h2-Text `Lust, neue Sterne zu entdecken?` → **`Lust, was Neues zu entdecken?`** (Rest der Karte inkl. Gold-CTA + Warp unverändert).
7. **Leerzustand:** Button-Icon `<Star className="size-4" />` → `<Binoculars className="size-4" />` (Text „Sternensuche starten" bleibt; `forgeBridge(false)` bleibt).
8. **Bearbeiten-Dialog** um Titel-Feld erweitern (zwischen Header und Textarea):

```tsx
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={60}
                    placeholder="Name des Sterns (optional)"
                    aria-label="Name des Sterns"
                  />
```

Dialog-Titel: `Want bearbeiten` → `Stern bearbeiten`; Destructive-Button: `Want löschen` → `Stern löschen`; Textarea-`aria-label`: `Beschreibung des Sterns`. Der Lösch-Fluss aus der Detailansicht braucht keinen Sondercode: `deleteWant` ändert `wants.length`, das `key={wants.length}` auf der StarMap (siehe Punkt 5) remountet die Karte und setzt den Zoom-State zurück.
9. **Neuer „Eigener Stern"-Dialog** (neben dem Edit-Dialog):

```tsx
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Eigener Stern</DialogTitle>
                  </DialogHeader>
                  <Input
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    maxLength={60}
                    placeholder="Name des Sterns (optional)"
                    aria-label="Name des Sterns"
                  />
                  <Textarea
                    value={addText}
                    onChange={(e) => setAddText(e.target.value)}
                    placeholder="Was zieht dich an? Z. B. „Mir macht … Spaß“ oder „Ich will …“"
                    maxLength={300}
                    rows={3}
                    autoFocus
                    className="resize-y"
                    aria-label="Beschreibung des Sterns"
                  />
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>Abbrechen</DialogClose>
                    <Button onClick={addOwnStar} disabled={!addText.trim()}>
                      Stern anzünden
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
```

- [ ] **Step 4: Gates**

Run: `npx tsc --noEmit` → 0 Fehler (falls Geister-Typen: `rm -rf .next` und erneut). `npm run build` → Erfolg. `node scripts/check-contrast.mjs` → bestanden (fern-Label `text-muted-foreground` auf Hintergrund = bestehende zugelassene Paarung).

- [ ] **Step 5: Commit + Push (Block 4 fertig → iPhone-Check)**

```bash
git add "app/(app)/me/wants/star-map.tsx" "app/(app)/me/wants/wants-me.tsx" app/globals.css
git commit -m "feat(wants): Sternenkarte mit Zoom-Detailansicht ersetzt die Kartenliste

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

iPhone-Checkliste für Stefan: Karte mit nah/fern gemischt + stabilen Positionen bei Reload; Zoom-Fahrt + Zurück; Bearbeiten (Titel), Loslassen/Anzünden; Eigener Stern; Sternensuche mit Fernglas; Brückenkarte-Wording; Warp in die Schmiede; Journey einmal komplett mit Tagtraum-Schritt.

---

## Task-Reihenfolge & Abhängigkeiten

1. Task 1 → 2 → 3 (Block 1, Push nach 3)
2. Task 4 (Block 2, Push)
3. Task 5 (Block 3, Push)
4. Task 6 → 7 → 8 → 9 (Block 4, Push nach 9; Tasks 6–8 committen ohne Push oder pushen mit — beides safe, sie sind für Bestandsdaten abwärtskompatibel und UI-neutral bis Task 8)

## Risiken (aus dem Spec, für den Implementierer)

- **Wetterleuchten** bewusst selten/weich — wenn Stefan Flackern meldet: zuerst die 11s-Periode verlängern, nicht die Opacity erhöhen.
- **iOS-Gotchas** (aus dem Projektgedächtnis): keine View-Transitions-API in der Standalone-PWA — Zoom ist bewusst GSAP; bei „nur auf dem iPhone kaputten" Fades über Glass-Elementen an `isolate + transform-gpu + will-change-[opacity]` denken.
- **Turbopack-Cache:** nach Fehlern mit Geister-Typen `rm -rf .next`.
