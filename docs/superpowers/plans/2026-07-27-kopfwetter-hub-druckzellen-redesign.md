# Kopfwetter-Hub Druckzellen-Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den /booster-Hub von einem flachen Isobaren-Linien-Hintergrund in eine synoptische Wetterkarte umbauen, auf der jeder Booster ein eigenes Tiefdruckgebiet (konzentrische, geschwungene Gold-Konturen mit dem Icon im Auge) ist.

**Architecture:** Neue Präsentationskomponente `PressureCell` rendert pro Booster ein handgezeichnetes Ring-Set absolut hinter Icon + Text. `page.tsx` behält Stagger/Reveal/Copy und wickelt nur das Icon in `PressureCell`. `pressure-field.tsx` wird auf den reinen Tiefen-Verlauf verschlankt (vier vertikale Isobaren + Lilac-Front entfallen). Reine Client-/View-Änderung, kein Backend.

**Tech Stack:** Next.js 16 App Router, React, TailwindCSS v4, handgeschriebenes SVG, CSS-Keyframes in `app/globals.css`.

## Global Constraints

- **Mobile-first**, Ziel-Viewport ~375px.
- **Alle sichtbaren Texte Deutsch**, warm/ermutigend, „du". Deutsche Typografie mit echten Anführungszeichen (U+201E „ / U+201C ").
- **Farben nur über Tokens:** Isobaren `var(--primary)` (Gold), Icon-Akzent `var(--cleanser-confidence)` (Lilac). Keine Hardcode-Hex außer bestehender Tiefen-Verlauf.
- **Bewegung** braucht `@media (prefers-reduced-motion: reduce)`-Fallback, zentral in `app/globals.css`.
- **Tailwind v4:** `translate-x/y` kompiliert zu CSS-`translate` (eigene Property). CSS-Keyframes hier animieren `transform` (nicht die `translate`-Property), um den Konflikt zu vermeiden.
- **Keine Fronten, keine Druck-Zahlen, keine Windpfeile.**
- **Verifikation:** `npx tsc --noEmit` + `npm run gate` + `npm run build`. `npm run lint` ist auf main vorbestehend rot und **nicht** Teil des Gates — nicht als Regression werten. Visuelle Abnahme = iPhone-Live-Deploy (kein Desktop-Browser-Subagent).
- **PowerShell 5.1:** Pfade mit Route-Group-Klammern quoten (`git add "app/(app)/..."`); keine inneren `"` in mehrzeiligen Commit-Messages.

---

### Task 1: `PressureCell`-Komponente + Drift-Keyframe

Baut die Kernkomponente mit fünf handgezeichneten Ring-Sets und die zugehörige Drift-Animation. Danach kompiliert die Komponente, wird aber noch nirgends verwendet (toter, aber typsicherer Code — bewusst, damit Review sich auf die Zelle allein konzentriert).

**Files:**
- Create: `app/(app)/booster/pressure-cell.tsx`
- Modify: `app/globals.css` (neuer Keyframe + reduced-motion-Fallback, im bestehenden `@layer`-Block bei den anderen `bs-*`/`kw-*`-Utilities, um Zeile ~724)

**Interfaces:**
- Produces:
  - `PressureCell` — React-Komponente. Props:
    ```ts
    {
      art: React.ReactNode;              // das Booster-Icon (aus weather-art.tsx)
      side: "left" | "right";            // Ausbuchtung: "left" bulged nach rechts,
                                          //  "right" wird horizontal gespiegelt
      variant: keyof typeof CELLS;       // welches der 5 Ring-Sets
      phase?: number;                    // 0..n, entkoppelt den Drift-Takt
    }
    ```
  - Rendert einen `size-14`-Container (ersetzt den bisherigen Icon-`<span>` in `page.tsx`): Lilac-Glow (`kw-cell-glow`) + Ring-SVG (absolut, größer als der Container, hinter dem Icon) + `art`.

- [ ] **Step 1: `app/globals.css` — Drift-Keyframe ergänzen**

Direkt nach dem `.iso-glow { … }`-Block (um Zeile ~716) einfügen:

```css
  \* Kopfwetter-Hub: Druckzellen driften langsam seitlich („ziehendes Wetter").
     Versetzte Phase pro Zelle via inline animation-delay. */
  @keyframes kw-cell-drift {
    0%, 100% { transform: translateX(-3px); }
    50%      { transform: translateX(3px);  }
  }
  .kw-cell-drift {
    transform-box: fill-box;
    transform-origin: center;
    animation: kw-cell-drift 11s ease-in-out infinite;
  }
```

Und den bestehenden reduced-motion-Block (um Zeile ~725) um `.kw-cell-drift` erweitern:

```css
  @media (prefers-reduced-motion: reduce) {
    .bs-sway, .bs-ember, .bs-ember-2, .bs-glow,
    .bs-rain, .bs-rain-2, .bs-rain-3,
    .kw-cell-drift {
      animation: none !important;
    }
  }
```

- [ ] **Step 2: `app/(app)/booster/pressure-cell.tsx` anlegen**

```tsx
/**
 * Eine Druckzelle des Kopfwetter-Hubs: konzentrische, geschwungene Gold-
 * Isobaren, in deren Auge das Booster-Icon sitzt — statt der „T"/„H"-Lettern
 * einer synoptischen Karte. Fünf handgezeichnete Ring-Sets (CELLS), je Booster
 * eins; jeder Ring ist eine eigene ovale Kontur (kein prozeduraler Generator,
 * die Radien sind pro Zelle handgesetzt). Die Ringe liegen absolut hinter Icon
 * und Text, driften langsam seitlich (kw-cell-drift; reduced-motion-Fallback
 * zentral in globals.css) und glühen über .iso-glow. Rein dekorativ.
 *
 * Ausbuchtung zeigt zur Blattmitte: side="left" bucht nach rechts aus,
 * side="right" wird horizontal gespiegelt (scaleX(-1)). Der Koordinatenraum
 * ist 200×160, das Icon-Auge liegt bei (100,80).
 */
import type { CSSProperties } from "react";

/** Kreis→Bezier-Konstante für einen 4-Segment-Oval-Pfad. */
const K = 0.5523;

type Ring = { cx: number; cy: number; rx: number; ry: number };
type Cell = { tilt: number; rings: Ring[] };

/** Geschlossener, ovaler Bezier-Pfad um (cx,cy) mit Radien rx,ry. */
function oval({ cx, cy, rx, ry }: Ring): string {
  const kx = K * rx;
  const ky = K * ry;
  return [
    `M${cx + rx},${cy}`,
    `C${cx + rx},${cy + ky} ${cx + kx},${cy + ry} ${cx},${cy + ry}`,
    `C${cx - kx},${cy + ry} ${cx - rx},${cy + ky} ${cx - rx},${cy}`,
    `C${cx - rx},${cy - ky} ${cx - kx},${cy - ry} ${cx},${cy - ry}`,
    `C${cx + kx},${cy - ry} ${cx + rx},${cy - ky} ${cx + rx},${cy}`,
    "Z",
  ].join(" ");
}

/**
 * Fünf handgesetzte Ring-Sets. Äußere Ringe stehen weiter rechts (cx > 100) =
 * Ausbuchtung zur Blattmitte; der innerste Ring hugt das Auge (cx ≈ 100). Jede
 * Zelle hat eigene Aspekt-/Kippung-Charakteristik. Reihenfolge: außen → innen.
 */
const CELLS = {
  overthinking: {
    tilt: -10,
    rings: [
      { cx: 108, cy: 80, rx: 60, ry: 66 },
      { cx: 105, cy: 80, rx: 44, ry: 48 },
      { cx: 103, cy: 80, rx: 29, ry: 31 },
      { cx: 101, cy: 80, rx: 15, ry: 16 },
    ],
  },
  sayingNo: {
    tilt: 4,
    rings: [
      { cx: 116, cy: 78, rx: 80, ry: 46 },
      { cx: 110, cy: 79, rx: 56, ry: 33 },
      { cx: 104, cy: 80, rx: 32, ry: 20 },
    ],
  },
  messy: {
    tilt: -3,
    rings: [
      { cx: 112, cy: 82, rx: 70, ry: 58 },
      { cx: 108, cy: 81, rx: 52, ry: 43 },
      { cx: 104, cy: 80, rx: 34, ry: 28 },
      { cx: 101, cy: 80, rx: 17, ry: 14 },
    ],
  },
  shadow: {
    tilt: 9,
    rings: [
      { cx: 114, cy: 80, rx: 66, ry: 60 },
      { cx: 109, cy: 80, rx: 47, ry: 42 },
      { cx: 104, cy: 80, rx: 28, ry: 25 },
    ],
  },
  confidence: {
    tilt: -6,
    rings: [
      { cx: 118, cy: 78, rx: 82, ry: 44 },
      { cx: 111, cy: 79, rx: 57, ry: 31 },
      { cx: 105, cy: 80, rx: 31, ry: 18 },
    ],
  },
} satisfies Record<string, Cell>;

export function PressureCell({
  art,
  side,
  variant,
  phase = 0,
}: {
  art: React.ReactNode;
  side: "left" | "right";
  variant: keyof typeof CELLS;
  phase?: number;
}) {
  const cell = CELLS[variant];
  const last = cell.rings.length - 1;

  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center">
      {/* Lilac-Kern (Druckzentrum) hinter dem Icon */}
      <span
        aria-hidden="true"
        className="kw-cell-glow absolute inset-0 rounded-full blur-md"
      />

      {/* Isobaren-Ringe: absolut, größer als die Icon-Box, hinter dem Icon */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-60 -translate-x-1/2 -translate-y-1/2"
      >
        <svg
          viewBox="0 0 200 160"
          className="iso-glow size-full overflow-visible"
          style={{ transform: side === "right" ? "scaleX(-1)" : undefined }}
        >
          <g
            className="kw-cell-drift"
            style={{ animationDelay: `${phase * -1.7}s` } as CSSProperties}
          >
            {cell.rings.map((r, i) => (
              <path
                key={i}
                d={oval(r)}
                transform={`rotate(${cell.tilt} 100 80)`}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.1"
                strokeOpacity={0.22 + (i / last) * 0.28}
              />
            ))}
          </g>
        </svg>
      </span>

      {/* Das Icon im Auge des Tiefs */}
      <span className="relative">{art}</span>
    </span>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (keine neuen Fehler; `PressureCell`/`CELLS` typisieren sauber, `satisfies Record<string, Cell>` erzwingt gültige Ring-Sets).

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/booster/pressure-cell.tsx" app/globals.css
git commit -m "feat(booster): PressureCell — Druckzelle mit handgezeichneten Isobaren-Ringen"
```

---

### Task 2: Hub verdrahten + `pressure-field.tsx` auf Tiefen-Verlauf verschlanken

Ersetzt im Hub das Icon-`<span>` durch `PressureCell`, entfernt die vier vertikalen Isobaren + Lilac-Front aus dem alten Hintergrund (nur der Tiefen-Verlauf bleibt) und sichert den horizontalen Overflow ab. Danach ist die neue Druckkarte live.

**Files:**
- Modify: `app/(app)/booster/page.tsx`
- Modify: `app/(app)/booster/pressure-field.tsx`

**Interfaces:**
- Consumes: `PressureCell` aus Task 1 (`{ art, side, variant, phase }`).
- Produces: keine (Blatt-Task; nur Rendering).

- [ ] **Step 1: `page.tsx` — `variant` je Booster ergänzen**

Import erweitern und den `WeatherSystem`-Typ + die `SYSTEMS`-Tabelle um `variant` ergänzen. Die `variant`-Werte müssen exakt den `CELLS`-Keys aus Task 1 entsprechen (`overthinking | sayingNo | messy | shadow | confidence`).

Import oben (statt des bisherigen `PressureField`-Imports):

```tsx
import { PressureField } from "./pressure-field";
import { PressureCell } from "./pressure-cell";
```

Typ + Tabelle:

```tsx
type WeatherSystem = {
  /** Ich-Satz, nach dem man im akuten Moment sucht — primäres Label. */
  feeling: string;
  /** Modulname, leise Meta-Zeile. */
  title: string;
  art: React.ReactNode;
  variant: "overthinking" | "sayingNo" | "messy" | "shadow" | "confidence";
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
```

- [ ] **Step 2: `page.tsx` — Stage gegen horizontalen Overflow absichern & Icon-`<span>` durch `PressureCell` ersetzen**

Der äußere `<div className="relative">` (um Zeile 52) bekommt `overflow-x-clip` (nicht `overflow-x-hidden` — letzteres zwingt die y-Achse auf `auto` und kann einen vertikalen Scrollbalken erzeugen; `clip` vermeidet das). Es gibt auf dieser Tab-Route keinen Sticky-Header, das bekannte overflow/sticky-Problem greift hier also nicht.

```tsx
      <div className="relative overflow-x-clip">
        <PressureField />
        <div className="relative z-10 flex flex-col gap-8 py-4">
```

Innerhalb des `<Link>` den bisherigen Icon-Block …

```tsx
                  <span className="relative flex size-14 shrink-0 items-center justify-center">
                    <span
                      aria-hidden="true"
                      className="kw-cell-glow absolute inset-0 rounded-full blur-md"
                    />
                    <span className="relative">{s.art}</span>
                  </span>
```

… ersetzen durch:

```tsx
                  <PressureCell
                    art={s.art}
                    side={left ? "left" : "right"}
                    variant={s.variant}
                    phase={i}
                  />
```

- [ ] **Step 3: `pressure-field.tsx` auf den reinen Tiefen-Verlauf verschlanken**

Die vier vertikalen Isobaren (`<g className="iso-glow">…`) und die Lilac-Front (`<path className="bs-sway" …>`) entfernen. Nur der Verlaufs-`<rect>` bleibt als Atmosphäre. Datei komplett ersetzen durch:

```tsx
/**
 * Atmosphärischer Grund des Kopfwetter-Hubs: ein wertungsfreier Tiefen-Verlauf,
 * damit die Druckzellen (siehe pressure-cell.tsx) nicht auf flachem Schwarz
 * schweben. Die Isobaren selbst leben jetzt pro Booster in den PressureCells;
 * dieser Hintergrund trägt nur noch die weiche Tiefe. Rein dekorativ.
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
    </svg>
  );
}
```

- [ ] **Step 4: Gates**

Run: `npx tsc --noEmit`
Expected: PASS (keine ungenutzten Imports; `variant`-Literale matchen die `CELLS`-Keys).

Run: `npm run gate`
Expected: PASS (Kontrast + Typo + Motion). Falls das Typo-Gate anschlägt: sicherstellen, dass in geändertem gerendertem Text echte „…"-Quotes stehen (hier kommt kein neuer sichtbarer Text hinzu).

Run: `npm run build`
Expected: PASS. Bei Geister-Typen aus `.next`: `rm -rf .next` und erneut bauen.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/booster/page.tsx" "app/(app)/booster/pressure-field.tsx"
git commit -m "feat(booster): Kopfwetter-Hub als Druckzellen-Karte (Isobaren pro Booster)"
```

---

### Task 3: Geräte-Feinjustierung + Push

Die Ring-Radien/Kippungen sind am Schreibtisch gesetzt; die eigentliche Abnahme ist das iPhone. Diese Task justiert am Live-Deploy nach, bis die diagonalen Nachbarzellen sich „fast berühren" ohne unruhig zu wirken, und schließt mit Push auf `main`.

**Files:**
- Modify (nach Bedarf): `app/(app)/booster/pressure-cell.tsx` (Radien/`tilt`/Ring-Anzahl in `CELLS`, Container-Maße `h-48 w-60`, Drift-Amplitude)

**Interfaces:**
- Consumes/Produces: keine Signatur-Änderungen — nur Werte-Tuning innerhalb `CELLS` und der Layout-Klassen.

- [ ] **Step 1: Am iPhone-Live-Deploy prüfen (Checkliste)**

  - Lesen die fünf Zellen als **eine** Wetterkarte (diagonale Nachbarn rücken nah heran, ohne zu kollidieren)?
  - Sitzt jedes Icon sichtbar im **Auge** seines Rings (innerster Ring hugt das Icon)?
  - Zeigt die Ausbuchtung bei links/rechts jeweils **zur Blattmitte**?
  - Kein **horizontaler Scroll**; ausgeblutete Ringe am Rand wirken gewollt.
  - Ich-Satz + Modulname bleiben **klar lesbar** über den Ringen (Text vor Ringen)?
  - Drift ist **spürbar, aber ruhig**; Zellen bewegen sich nicht im Gleichschritt.
  - Bei aktiviertem „Bewegung reduzieren": Ringe stehen still, Layout intakt.

- [ ] **Step 2: `CELLS`/Layout nachziehen**

Nur Zahlen justieren (keine neuen Interfaces). Typische Hebel:
  - Zellen berühren sich nicht genug → äußere `rx`/`ry` leicht erhöhen **oder** Container `w-60 h-48` vergrößern (z. B. `w-64 h-52`).
  - Zu unruhig/überlappend → äußere Radien senken oder je Zelle einen äußeren Ring streichen.
  - Ausbuchtung zu schwach → äußere `cx` weiter Richtung 120 schieben (innerster Ring bei `cx ≈ 100–105` lassen).
  - Drift zu stark → in `app/globals.css` `translateX(±3px)` auf `±2px` reduzieren.

Nach jeder Änderungsrunde:

Run: `npx tsc --noEmit && npm run gate`
Expected: PASS.

- [ ] **Step 3: Abschluss-Build + Commit + Push**

```bash
npm run build
git add "app/(app)/booster/pressure-cell.tsx" app/globals.css
git commit -m "fix(booster): Druckzellen am Gerät feinjustiert (Radien/Drift)"
git push
```

(Falls Step 2 nichts zu ändern brauchte: Step 3 nur `git push`, um Task 1 + 2 live zu bringen.)

---

## Self-Review

**Spec coverage:**
- Eigene Druckzellen pro Booster → Task 1 (`CELLS`, `PressureCell`). ✓
- Mittlere Dichte, fast berührend → Task 1 Radien + Task 3 Tuning. ✓
- Geschwungene, geschlossene Konturen (keine Kreise) → `oval()` + ovale Radien/`tilt`. ✓
- Asymmetrische Ausbuchtung zur Blattmitte + side-Flip → Task 1 (`cx>100`, `scaleX(-1)`). ✓
- Uniform Gold, Lilac nur im Icon → Task 1 (`stroke="var(--primary)"`, Icons unverändert). ✓
- Langsamer Drift, versetzte Phase, Icon/Text statisch → Task 1 (`kw-cell-drift`, `phase`). ✓
- 5 individuell gezeichnete Ring-Sets → Task 1 (`CELLS`, handgesetzte Radien pro Zelle). ✓
- Tiefen-Verlauf bleibt → Task 2 (verschlankte `PressureField`). ✓
- Vier vertikale Isobaren + Front entfernt → Task 2. ✓
- Stagger/Reveal/Copy bleibt → Task 2 (nur Icon-Span ersetzt). ✓
- Keine Fronten/Zahlen/Windpfeile → nichts dergleichen hinzugefügt. ✓
- Overflow abgesichert → Task 2 (`overflow-x-clip`). ✓
- reduced-motion-Fallback → Task 1 (globals.css). ✓
- iPhone-Abnahme statt Browser-Subagent → Task 3. ✓

**Placeholder scan:** Keine TBD/TODO; alle Code-Schritte enthalten echten Code. Task 3 ist bewusst wertebasiertes Tuning (kein neues Interface), mit konkreten Hebeln statt „passend anpassen". ✓

**Type consistency:** `variant`-Literale in `page.tsx` (`overthinking | sayingNo | messy | shadow | confidence`) matchen die `CELLS`-Keys in `pressure-cell.tsx`. `PressureCell`-Props identisch in Definition (Task 1) und Aufruf (Task 2). `oval()` nimmt `Ring`, `CELLS` liefert `Ring[]`. ✓
