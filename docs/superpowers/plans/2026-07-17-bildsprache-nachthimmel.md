# Bildsprache „Dein Nachthimmel" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die im Spec [2026-07-17-bildsprache-nachthimmel-design.md](../specs/2026-07-17-bildsprache-nachthimmel-design.md) beschlossene Bildwelt umsetzen: Kopf-Apotheke → **Kopfwetter** (inkl. Nav-Tab und komplettem Hub-Visual-Umbau von Apotheken-Gefäßen zu Wetter-Motiven), Stimmungs-Check-in als **Wetterbericht**, Onboarding-Story um den Nachthimmel, Leitsatz, Doc-Updates.

**Architecture:** Reine Copy-/Visual-Schicht über dem bestehenden Designsystem — keine neuen Farb-Token, keine Routen-Änderungen, keine DB-Änderungen. Die 5 Apotheken-Gefäße (`vessels.tsx`) werden durch 5 Wetter-/Nachthimmel-SVGs (`weather-art.tsx`) im selben Koordinatenraum ersetzt; das Hairline-Raster des Hubs bleibt. Check-in-Labels und -Copy werden auf Wetter-Semantik umgestellt (Datenmodell `mood_score` 1–5 unverändert).

**Tech Stack:** Next.js 16 App Router, React, TailwindCSS, handgebaute Inline-SVGs, lucide-react (bereits Dependency).

## Global Constraints

- **Alle nutzersichtbaren Texte Deutsch**, informelles „du" (Onboarding-Bestand nutzt großgeschriebenes „Du" — dort beibehalten).
- **Typografische Anführungszeichen:** „…" = U+201E (öffnend) + U+201C (schließend). Niemals ASCII `"` in User-Copy. (Subagent-Dispatches: diese Regel explizit in den Prompt schreiben.)
- **Rahmen-Regel (Spec Sprachregel 1):** Metaphern nur an Rändern (Hub-Titel, Onboarding, Check-in, Intro/Outro). Übungs-Steps bleiben bildfrei; Buttons sagen „Weiter", nie „Nach den Sternen greifen". Dieser Plan ändert **keine** Copy innerhalb von Übungs-Steps.
- **Sprachregeln 2–4:** Sterne werden nie gedeutet („deine Sterne zeigen dir, dass…" ist verboten); Wetter wird festgestellt, nie bewertet (kein „schlechter Tag", kein Versagen); der Leitsatz erscheint genau an den im Plan genannten Stellen (Onboarding intro4) — nirgendwo sonst.
- **Leitsatz (exakter Wortlaut):** „Auch wenn das Wetter sie manchmal versteckt: Deine Sterne leuchten weiter."
- **One-Candle-Rule, Palette, Farb-Token unverändert.** Lilac = `var(--cleanser-confidence)` ist die Kopfwetter-Modulfarbe (Spec, visuelle Ebene Punkt 2) — nur in Ornamenten/Glows, nie als Aktionsfarbe.
- **Route `/booster` und alle internen Bezeichner (`booster`, `NAV_LABELS.booster`, DB-Spalten) bleiben** — der Rename ist reine Copy-Ebene. Kein Verzeichnis-/Key-Rename.
- **Jede neue Animation braucht einen `prefers-reduced-motion: reduce`-Fallback** (zentral in `globals.css`, wie die bestehenden `bs-*`-Klassen).
- **Backdrop-Sterne (Spec „optionales Nice-to-have"):** existieren bereits als `sky-light`-Spans in `components/backdrops/sky-backdrop.tsx` — **kein Task**, Punkt ist erfüllt.
- **Verifikation:** nach jedem Task `npx tsc --noEmit`; am Ende zusätzlich `npm run build` und `node scripts/check-contrast.mjs` (muss 7/7 PASS bleiben). Visuelles Abnahme-Gate ist Stefans iPhone am Live-Deploy — **kein** Desktop-Browser-Verifikations-Subagent.
- **Git:** Commit nach jedem Task auf `main`, Push erst am Ende (Task 7). Commit-Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Naming — Labels, Nav-Tab, Kommentare

**Files:**
- Modify: `lib/content/labels.ts`
- Modify: `components/layout/bottom-nav.tsx:7,16`
- Modify: `app/(app)/booster/things-got-messy/actions.ts:17`, `app/(app)/booster/shadow/actions.ts:12`, `app/(app)/booster/saying-no/actions.ts:17` (nur Kommentare)

**Interfaces:**
- Consumes: —
- Produces: `NAV_LABELS.booster === "Kopfwetter"`, `PAGE_TITLES.booster === "Kopfwetter"` — Task 3 (Hub-Titel) und alle bestehenden Consumer beziehen den Namen weiterhin über diese Keys; die Keys selbst bleiben `booster`.

- [ ] **Step 1: labels.ts umstellen**

```ts
/**
 * Zentrale, nutzersichtbare Labels für Navigation und Seitentitel. Niemals
 * "Booster", "Kopfwetter" oder "Things Got Messy" irgendwo hardcoden — immer
 * von hier importieren, damit Umbenennungen an einer Stelle passieren.
 */

/** Kurz-Labels für die Bottom-Nav. */
export const NAV_LABELS = {
  dashboard: "Home",
  me: "Me",
  booster: "Kopfwetter", // interner Key bleibt "booster" (Route /booster)
  journal: "Journal",
  settings: "Einstellungen",
} as const;

/** Ausgeschriebene Seitentitel. */
export const PAGE_TITLES = {
  booster: "Kopfwetter",
  ...
} as const;
```

(Nur die zwei `booster`-Werte und der Header-Kommentar ändern sich; alle übrigen Einträge unverändert lassen.)

- [ ] **Step 2: Nav-Icon tauschen** (`bottom-nav.tsx`)

`FlaskConical` (Apotheke) → `CloudMoon` (Wetter bei Nacht):

```tsx
import { Home, User, CloudMoon, NotebookPen, Settings2 } from "lucide-react";
// …
  { label: NAV_LABELS.booster, href: "/booster", icon: CloudMoon },
```

- [ ] **Step 3: Kommentare in den drei actions.ts angleichen**

In allen drei Dateien im Kopf-Kommentar „Kopf-Apotheke" → „Kopfwetter" (z. B. `// Geführtes Mini-Rezept im Kopfwetter (Saying 'No' Blueprint).`). Reine Kommentar-Änderung, kein Code.

- [ ] **Step 4: Verifizieren**

Run: `npx tsc --noEmit` → Expected: keine Fehler.
Run: `Get-ChildItem -Recurse app,components,lib -Include *.ts,*.tsx | Select-String -Pattern "Apotheke"` → Expected: nur noch Treffer, die Task 2/3/5 abräumen (`globals.css`-Sektion, `vessels.tsx`, `intro-previews.tsx`, `onboarding-intro.ts`) — keine in labels/nav/actions.

- [ ] **Step 5: Commit**

```
git add lib/content/labels.ts components/layout/bottom-nav.tsx "app/(app)/booster/things-got-messy/actions.ts" "app/(app)/booster/shadow/actions.ts" "app/(app)/booster/saying-no/actions.ts"
git commit -m "feat(bildsprache): Kopf-Apotheke zu Kopfwetter umbenennen (Labels, Nav-Tab)"
```

---

### Task 2: Wetter-Motive — `weather-art.tsx` + CSS-Animationen

**Files:**
- Create: `app/(app)/booster/weather-art.tsx`
- Modify: `app/globals.css` (Sektion ab Zeile ~603 „Kopf-Apotheke: Apotheken-Regal")

**Interfaces:**
- Consumes: bestehende CSS-Klassen `bs-sway`, `bs-ember`, `bs-ember-2`, `bs-glow` aus `globals.css`; CSS-Variablen `--primary`, `--cleanser-confidence`, `--scene-glow`.
- Produces: benannte React-Server-Komponenten `WindSwirl`, `CloudStack`, `UmbrellaRain`, `StormCloud`, `ClearingStar` — alle props-los, alle rendern ein `aria-hidden`-SVG mit `viewBox="0 0 56 64"` und `className="size-14"` (Drop-in-Ersatz für die Gefäße). Task 3 importiert genau diese fünf Namen.

**Design-Konvention (aus den Gefäßen übernommen):** Silhouetten/Linien in Gold (`var(--primary)`, opacity 0.14–0.7), das eine „lebendige" Akzent-Element pro Motiv in Lilac (`var(--cleanser-confidence)`) — das setzt die Spec-Vorgabe „Kopfwetter-Hub in Lilac" um, ohne die Gold-Linienzeichnungs-Sprache der Ornamente zu brechen. Genau **eine** langsame Mikro-Animation pro Motiv.

- [ ] **Step 1: `weather-art.tsx` anlegen**

```tsx
/**
 * Die Wetter-Motive des Kopfwetter-Hubs — je Booster ein Ausschnitt des
 * Nachthimmels (Windwirbel, Wolkenbank, Schirm im Regen, …) statt der
 * früheren Apotheken-Gefäße. Handgebaute SVGs im Stil der /me-Ornamente:
 * Gold-Linienzeichnung, das lebendige Akzent-Element in Lilac (Kopfwetter-
 * Modulfarbe), eine langsame Mikro-Animation pro Motiv (bs-*-Klassen,
 * reduced-motion-Fallback liegt zentral in globals.css). Alle teilen den
 * Koordinatenraum 0 0 56 64 wie zuvor die Gefäße.
 */

const STROKE = "var(--primary)";
const ACCENT = "var(--cleanser-confidence)";

function WeatherSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 56 64" className="size-14" aria-hidden="true">
      {children}
    </svg>
  );
}

/** Overthinking — die Gedankenspirale als Windwirbel, Böen queren sie. */
export function WindSwirl() {
  return (
    <WeatherSvg>
      <path d="M7,20 h13" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      <path d="M36,52 h13" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      <path d="M40,16 h9" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" opacity="0.25" />
      {/* Halbkreis-Spirale wie im alten Kolben: halbe Drehungen mit
          schrumpfendem Radius (12 → 9 → 6 → 3), Endpunkt = Start + 2r. */}
      <path
        className="bs-sway"
        d="M16,36 a12,12 0 0 1 24,0 a9,9 0 0 1 -18,0 a6,6 0 0 1 12,0 a3,3 0 0 1 -6,0"
        fill="none"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </WeatherSvg>
  );
}

/** Things Got Messy — zwei schwere Wolkenbänke übereinander: alles zu viel. */
export function CloudStack() {
  return (
    <WeatherSvg>
      {/* Hintere Wolkenbank */}
      <g fill={STROKE} opacity="0.14">
        <circle cx="20" cy="22" r="7" />
        <circle cx="31" cy="19" r="8" />
        <circle cx="40" cy="24" r="6" />
        <rect x="13" y="21" width="33" height="8" rx="4" />
      </g>
      {/* Vordere, schwere Wolke — schwankt langsam */}
      <g className="bs-sway">
        <g fill={STROKE} opacity="0.3">
          <circle cx="19" cy="40" r="8" />
          <circle cx="30" cy="36" r="10" />
          <circle cx="39" cy="42" r="7" />
          <rect x="11" y="40" width="35" height="10" rx="5" />
        </g>
      </g>
      {/* Ein Lilac-Riss in der Wolkendecke — es bleibt Wetter, kein Zustand. */}
      <path className="bs-ember" d="M22,52 h12" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
    </WeatherSvg>
  );
}

/** Nein-Trainer — Schirm im Regen: die freundliche Grenze, an der es abperlt. */
export function UmbrellaRain() {
  return (
    <WeatherSvg>
      <path className="bs-rain" d="M10,10 l-1.5,5" stroke={ACCENT} strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      <path className="bs-rain bs-rain-2" d="M28,5 l-1.5,5" stroke={ACCENT} strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      <path className="bs-rain bs-rain-3" d="M45,11 l-1.5,5" stroke={ACCENT} strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      {/* Schirm: Spitze, Kuppel, Bogen-Saum, Stock mit Griff */}
      <path d="M28,17 v-4" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <path
        d="M10,35 a18,18 0 0 1 36,0"
        fill={STROKE}
        fillOpacity="0.16"
        stroke={STROKE}
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path d="M10,35 a6,6 0 0 0 12,0 a6,6 0 0 0 12,0 a6,6 0 0 0 12,0" fill="none" stroke={STROKE} strokeWidth="1.4" opacity="0.7" />
      <path d="M28,35 v16 a4.5,4.5 0 0 1 -9,0" fill="none" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
    </WeatherSvg>
  );
}

/** Schattenseite — Gewitterwolke, der Blitz ist die Entladung (Dampf ablassen). */
export function StormCloud() {
  return (
    <WeatherSvg>
      <g fill={STROKE} opacity="0.28">
        <circle cx="20" cy="26" r="8" />
        <circle cx="31" cy="22" r="9" />
        <circle cx="39" cy="28" r="6.5" />
        <rect x="12" y="26" width="33" height="9" rx="4.5" />
      </g>
      <path
        className="bs-ember"
        d="M30,37 l-6,10 h6 l-5,10"
        fill="none"
        stroke={ACCENT}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle className="bs-ember bs-ember-2" cx="38" cy="42" r="1.2" fill={ACCENT} opacity="0.9" />
    </WeatherSvg>
  );
}

/** Confidence-Boost — die Wolke zieht beiseite, dahinter steht der Stern schon. */
export function ClearingStar() {
  return (
    <WeatherSvg>
      <circle cx="16" cy="18" r="1.1" fill={STROKE} opacity="0.45" />
      <circle cx="24" cy="10" r="0.9" fill={STROKE} opacity="0.35" />
      {/* Vierzack-Stern (Lilac), glüht wie die alte Confidence-Essenz */}
      <g
        className="bs-glow"
        style={{ "--scene-glow": "var(--cleanser-confidence)" } as React.CSSProperties}
      >
        <path
          d="M36,12 l2.6,6.9 6.9,2.6 -6.9,2.6 -2.6,6.9 -2.6,-6.9 -6.9,-2.6 6.9,-2.6 z"
          fill={ACCENT}
          opacity="0.9"
        />
      </g>
      {/* Abziehende Wolke unten links */}
      <g fill={STROKE} opacity="0.2">
        <circle cx="17" cy="44" r="7.5" />
        <circle cx="27" cy="40" r="9" />
        <circle cx="35" cy="46" r="6" />
        <rect x="10" y="44" width="31" height="8.5" rx="4.25" />
      </g>
    </WeatherSvg>
  );
}
```

- [ ] **Step 2: `globals.css` anpassen**

(a) Sektions-Kommentar (Zeile ~603) ersetzen:

```css
  /* ── Kopfwetter: Wetter-Motive ─────────────────────────────────────
   * Raster transparenter Zellen (Haarlinie als Rahmenlinie) statt Karten.
   * Die Wetter-Ornamente leben wie die /me-Ornamente über je eine langsame
   * Mikro-Animation; reduced motion stellt alles still. */
```

(b) `bs-bubble`-Keyframes und -Klassen **entfernen** (nur von den gelöschten Gefäßen genutzt; `me-bubble` ist separat und bleibt).

(c) Neue Regen-Animation ergänzen (neben `bs-ember`):

```css
  @keyframes bs-rain {
    0%   { transform: translateY(-2px); opacity: 0; }
    30%  { opacity: 0.85; }
    70%  { opacity: 0.55; }
    100% { transform: translateY(7px); opacity: 0; }
  }
  .bs-rain   { animation: bs-rain 2.6s linear infinite; }
  .bs-rain-2 { animation-delay: 1s; }
  .bs-rain-3 { animation-delay: 1.8s; }
```

(d) Reduced-motion-Block der Sektion aktualisieren (bs-bubble raus, bs-rain rein):

```css
  @media (prefers-reduced-motion: reduce) {
    .bs-sway, .bs-ember, .bs-ember-2, .bs-glow,
    .bs-rain, .bs-rain-2, .bs-rain-3 {
      animation: none !important;
    }
  }
```

(Statisch stehen die Tropfen dann bei ihrer Attribut-Opacity — gewollt, wie bei den alten Bubbles.)

- [ ] **Step 3: Verifizieren**

Run: `npx tsc --noEmit` → Expected: keine Fehler (Datei ist noch unimportiert — das ist ok, Task 3 verdrahtet sie).

- [ ] **Step 4: Commit**

```
git add "app/(app)/booster/weather-art.tsx" app/globals.css
git commit -m "feat(bildsprache): Wetter-Motive fuer den Kopfwetter-Hub (M-Teil 1)"
```

---

### Task 3: Hub-Umbau — `booster/page.tsx` auf Wetter, Gefäße löschen

**Files:**
- Modify: `app/(app)/booster/page.tsx`
- Delete: `app/(app)/booster/vessels.tsx`

**Interfaces:**
- Consumes: `WindSwirl`, `CloudStack`, `UmbrellaRain`, `StormCloud`, `ClearingStar` aus `./weather-art` (Task 2); `PAGE_TITLES.booster === "Kopfwetter"` (Task 1).
- Produces: — (Blattseite).

- [ ] **Step 1: Imports und TILES umstellen**

```tsx
import {
  ClearingStar,
  CloudStack,
  StormCloud,
  UmbrellaRain,
  WindSwirl,
} from "./weather-art";
```

`TILES` behält Reihenfolge, `feeling`, `title`, `href` — nur `art` wechselt:

| Booster | alt | neu |
|---|---|---|
| Overthinking | `<SpiralFlask />` | `<WindSwirl />` |
| Things Got Messy | `<MessyJar />` | `<CloudStack />` |
| Nein-Trainer | `<NoVial />` | `<UmbrellaRain />` |
| Schattenseite | `<ShadowPot />` | `<StormCloud />` |
| Confidence | `<ConfidenceFlask />` | `<ClearingStar />` |

Im `Tile`-Typ den `art`-Kommentar anpassen: `/** Das Wetter-Motiv der Zelle (siehe weather-art.tsx). */`

- [ ] **Step 2: Header-Copy (Hub-Intro) auf die Bildwelt heben**

```tsx
      <header className="space-y-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
          {PAGE_TITLES.booster}
        </h1>
        <p className="text-sm text-muted-foreground">
          Manchmal zieht Wetter auf: Zweifel, Grübeln, alles zu viel. Es zieht
          vorbei — bis dahin helfen dir diese Übungen.
        </p>
      </header>
```

- [ ] **Step 3: Regal-Vokabular in Code-Kommentaren/Namen ablösen**

- `ShelfCell` → `SkyCell`, Doc-Kommentar: `/** Eine Zelle des Himmelsausschnitts: Motiv über Ich-Satz und Modulname; die Haarlinie der Reihe bleibt als ruhige Rahmenlinie. */`
- `SHELVES` → `ROWS`, Kommentar: `/** Je zwei Motive teilen sich eine Reihe — das letzte steht allein. */`
- Kerzen-Kommentar anpassen: „…scheint durch den Himmelsausschnitt — die beiden Hubs sind Räume desselben Hauses." (Funktionalität unverändert.)
- Markup/Klassen der Zellen und das Raster (`grid border-b border-border/70 …`) bleiben identisch — nur Namen, Kommentare, `art`.

- [ ] **Step 4: `vessels.tsx` löschen**

Run: `git rm "app/(app)/booster/vessels.tsx"`

- [ ] **Step 5: Verifizieren**

Run: `npx tsc --noEmit` → Expected: keine Fehler (kein Import zeigt mehr auf `vessels`).
Run: `Get-ChildItem -Recurse app,components,lib -Include *.ts,*.tsx,*.css | Select-String -Pattern "vessels|Regal"` → Expected: keine Treffer mehr unter `app/(app)/booster/`.

- [ ] **Step 6: Commit**

```
git add -A "app/(app)/booster"
git commit -m "feat(bildsprache): Kopfwetter-Hub von Apotheken-Regal auf Wetter-Motive umbauen"
```

---

### Task 4: Check-in als Wetterbericht

**Files:**
- Modify: `lib/utils/mood.ts:3-9`
- Modify: `app/(app)/dashboard/mood-checkin.tsx:19-26,56-58`
- Modify: `components/dashboard/daily-focus.tsx:71-74`

**Interfaces:**
- Consumes: —
- Produces: `MOOD_LABELS: Record<number, string>` mit neuen Werten (Shape unverändert — einziger Consumer ist `mood-checkin.tsx`). `MOOD_FACES`, `MOOD_PULSE_SECONDS`, `moodTier` und das DB-Feld `mood_score` bleiben unangetastet.

- [ ] **Step 1: Wetter-Skala in `mood.ts`**

```ts
/** Wetterbericht-Skala: Stimmung als Kopfwetter. Wetter wird festgestellt,
 *  nie bewertet — die Labels beschreiben den Himmel, keinen Erfolg. */
export const MOOD_LABELS: Record<number, string> = {
  1: "Stürmisch",
  2: "Bewölkt",
  3: "Ruhig",
  4: "Klar",
  5: "Sternenklar",
};
```

(Maskottchen-Gesichter passen weiter: stürmisch = sorrowStrong … sternenklar = radiant.)

- [ ] **Step 2: Frage + Antworten in `mood-checkin.tsx`**

Frage (Zeile ~57):

```tsx
      <p className="font-heading text-lg font-medium text-foreground">
        Wie ist dein Kopfwetter heute?
      </p>
```

Antwort-Copy (Kommentar + MESSAGES ersetzen):

```tsx
// Warme, wertfreie Antwort pro Wetterlage — raues Wetter bekommt Wärme,
// nie Mitleid oder Diagnose (Sprachregel: festgestellt, nie bewertet).
const MESSAGES: Record<number, string> = {
  1: "Stürmisch heute — auch das ist nur Wetter. Schön, dass du trotzdem hier bist. 🤍",
  2: "Bewölkte Tage dürfen sein. Sei heute sanft mit dir. 🫶",
  3: "Ruhiger Himmel — aus dieser Ruhe heraus kann der Tag wachsen. 🌿",
  4: "Klare Sicht heute. Genieß diesen Moment. ✨",
  5: "Sternenklar — nimm den Schwung mit in den Tag! 🌟",
};
```

Den Default-Kommentar bei `useState` anpassen: „…starten wir auf „Ruhig" (Score 3) als ruhigem Default."

- [ ] **Step 3: Low-Tier-Frage im Tages-Fokus (`daily-focus.tsx`)**

```tsx
  const question =
    tier === "low"
      ? "Stürmt es gerade in deinem Kopf?"
      : "Sollen wir weitermachen?";
```

(Die Low-Empfehlung selbst — „Raus aus dem Gedankenkarussell" → Overthinking — bleibt: konkret, kein Metaphern-Zwang im Handlungs-Teil.)

- [ ] **Step 4: Verifizieren**

Run: `npx tsc --noEmit` → Expected: keine Fehler.

- [ ] **Step 5: Commit**

```
git add lib/utils/mood.ts "app/(app)/dashboard/mood-checkin.tsx" components/dashboard/daily-focus.tsx
git commit -m "feat(bildsprache): Stimmungs-Check-in wird zum Wetterbericht"
```

---

### Task 5: Onboarding-Story + Leitsatz

**Files:**
- Modify: `lib/content/onboarding-intro.ts`
- Modify: `app/onboarding/page.tsx:370-377` (introCard-Rendering)
- Modify: `components/onboarding/intro-previews.tsx`

**Interfaces:**
- Consumes: `.font-affirmation`-Utility (bestehend), `Crossfade`/Card-Struktur des Onboardings (unverändert).
- Produces: erweiterter Typ `OnboardingIntroCard = { title?: string; body: string[]; affirmation?: string; closing?: string }` — `page.tsx` rendert die zwei neuen optionalen Felder.

- [ ] **Step 1: `onboarding-intro.ts` neu schreiben** (kompletter Dateiinhalt; intro1 bleibt wörtlich unverändert)

```ts
/** App-Intro-Karten im Onboarding (Steps intro1–intro4). */
export type OnboardingIntroCard = {
  title?: string;
  body: string[];
  /** Leitsatz in .font-affirmation — ein Leuchtsatz pro Moment, sparsam. */
  affirmation?: string;
  /** Kurzer Abbinder nach dem Leitsatz (normale Textfarbe). */
  closing?: string;
};

export const ONBOARDING_INTRO: OnboardingIntroCard[] = [
  {
    // intro1 (Schritt 5)
    title: 'Das war mutig.',
    body: [
      'Danke für Deine Ehrlichkeit – zu mir und vor allem zu Dir selbst. Es ist ganz sicher nicht immer leicht, sich die Wahrheit einzugestehen, aber nur wer wirklich ehrlich zu sich selbst ist, wird des schaffen das Gefühl von "gut genug" zurückzugewinnen.',
    ],
  },
  {
    // intro2 (Schritt 6) — der eigene Nachthimmel + der Me-Teil
    title: 'Was Dich erwartet',
    body: [
      'Jeder Mensch hat Dinge, die ihn zum Leuchten bringen: Sie machen echte Freude, entlocken ein ehrliches Lachen, geben ein Gefühl von Zufriedenheit. Diese Dinge sind wie Sterne an Deinem eigenen Nachthimmel. Die meisten haben nur nie in Ruhe hingeschaut.',
      'Hier ist Dein Raum dafür. Im Teil „Me“ lernst Du, Deinen Himmel zu lesen: Dein Kompass zeigt Dir, wofür Du stehst (Deine Werte). Deine Sterne zeigen Dir, was Dich leuchten lässt und wonach Du greifst (Deine Wants). Und Deine Bill of Rights sind die Regeln, nach denen Du navigierst (die Rechte, die Du Dir selbst gibst).',
      'Die Prämisse: Nur wenn Du Dich selbst wirklich kennst, kannst Du Dein Leben so gestalten, dass Du die Dinge tust, die Dir Energie geben, statt sie Dir zu nehmen.',
    ],
  },
  {
    // intro3 (Schritt 7) — das Kopfwetter
    title: 'Was Dich erwartet',
    body: [
      'Und dann gibt es Tage, an denen Wolken aufziehen: Zweifel, Grübeln, ein Kopf, der lauter ist als nötig. Das ist Wetter. Nicht Dein Himmel. Es zieht vorbei.',
      'Für genau diese Momente gibt es das Kopfwetter: schnelle Hilfen, die Dich aus Overthinking-Spiralen holen, Dir zu einem schuldgefühlfreien „Nein“ verhelfen oder Dir Rückenwind geben, bevor es ernst wird. Sprich: kleine Unterstützer für mittendrin im Alltag.',
    ],
  },
  {
    // intro4 (Schritt 8) — Abschluss + Leitsatz
    title: 'Schön, dass du da bist.',
    body: [
      '„Me“, um Deinen Himmel Stück für Stück kennenzulernen. Das Kopfwetter, um Dir im Alltag den Rücken zu stärken. Zusammen bringen sie Dich zu dem Gefühl zurück, das eigentlich Dein Normalzustand sein sollte: gut genug.',
    ],
    affirmation:
      'Auch wenn das Wetter sie manchmal versteckt: Deine Sterne leuchten weiter.',
    closing: 'Bereit?',
  },
];
```

(Achtung Typografie: „…“ sind U+201E/U+201C — beim Übertragen nicht durch ASCII ersetzen. intro1 enthält einen Bestands-Tippfehler („wird des schaffen") — bewusst unangetastet, nicht Teil dieser Runde.)

- [ ] **Step 2: Rendering in `page.tsx` erweitern**

Im `introCard`-Block nach der `body`-Map ergänzen:

```tsx
          {introCard && (
            <>
              {introCard.title && <CardTitle className="text-xl">{introCard.title}</CardTitle>}
              {introCard.body.map((paragraph, i) => (
                <CardDescription key={i} className="text-base">{paragraph}</CardDescription>
              ))}
              {introCard.affirmation && (
                <p className="pt-1 font-affirmation text-lg leading-relaxed text-foreground">
                  {introCard.affirmation}
                </p>
              )}
              {introCard.closing && (
                <CardDescription className="text-base">{introCard.closing}</CardDescription>
              )}
            </>
          )}
```

(Leitsatz ohne Anführungszeichen — er ist die Stimme der App, kein Zitat; Serif-Italic trägt ihn.)

- [ ] **Step 3: `intro-previews.tsx` angleichen**

- Datei-Kommentar + `BoosterPreview`-Doc: „Kopf-Apotheke" → „Kopfwetter".
- Icons an die neuen Motive angleichen: `Brain` → `Wind` (Overthinking), `Flame` → `Cloudy` (Things Got Messy); `Sparkles` (Confidence) und `Quote` (Mantra) bleiben. Import wird zu:

```tsx
import {
  Cloudy,
  Heart,
  Quote,
  ScrollText,
  Sparkles,
  Wind,
  type LucideIcon,
} from "lucide-react";
```

und in `BoosterPreview`:

```tsx
      <PreviewTile icon={Wind} label="Overthinking" />
      <PreviewTile icon={Cloudy} label="Things Got Messy" />
      <PreviewTile icon={Sparkles} label="Confidence" />
      <PreviewTile icon={Quote} label="Mantra" />
```

- [ ] **Step 4: Verifizieren**

Run: `npx tsc --noEmit` → Expected: keine Fehler.

- [ ] **Step 5: Commit**

```
git add lib/content/onboarding-intro.ts app/onboarding/page.tsx components/onboarding/intro-previews.tsx
git commit -m "feat(bildsprache): Onboarding erzaehlt den Nachthimmel, Leitsatz in Fraunces Italic"
```

---

### Task 6: Docs — DESIGN.md & PRODUCT.md

**Files:**
- Modify: `DESIGN.md` (Overview ~Z.108, Lilac ~Z.132, Modul-Tabelle ~Z.151-160, Navigation ~Z.218)
- Modify: `PRODUCT.md` (Product Purpose ~Z.15-17)

**Interfaces:** — (reine Doku).

- [ ] **Step 1: DESIGN.md — Bildwelt im Overview verankern**

Nach dem North-Star-Absatz (Z.108) neuen Absatz einfügen:

```markdown
**Bildwelt: „Dein Nachthimmel“** — the meaning layer over this visual system (spec: `docs/superpowers/specs/2026-07-17-bildsprache-nachthimmel-design.md`). From the protected room you look at your own night sky: the **Kompass** (Werte) shows direction, the **Sterne** (Wants) are what makes you shine and what you reach for, the **Bill of Rights** are the rules you navigate by, and rough moments are **Kopfwetter** — weather that passes and never destroys the sky. Metaphors live at the edges (hub titles, onboarding, the check-in as „Wetterbericht“, intro/outro moments); exercise steps stay concrete and image-free, and buttons say „Weiter“, never „Nach den Sternen greifen“.
```

- [ ] **Step 2: DESIGN.md — Lilac-Beschreibung, Modul-Tabelle, Navigation**

- Z.132: „Module identity for the Confidence/Booster surfaces" → „Module identity for the Confidence flow and the Kopfwetter hub".
- Modul-Lichtfarben-Tabelle um eine Zeile ergänzen:

```markdown
| Kopfwetter (Akut-Hilfen) | Lilac | `--cleanser-confidence` |
```

- Unter der Tabelle den bestehenden Satz ergänzen um: „Die `scene-ornament-tint`-Konvention (Attribut-Selektoren + `--scene-glow`) lebt in `app/globals.css`."
- Z.218 Navigation: Tab-Liste „(Dashboard, Ich, Booster, Journal, Einstellungen)" → „(Dashboard, Me, Kopfwetter, Journal, Einstellungen)".

- [ ] **Step 3: PRODUCT.md — Purpose-Absatz nachziehen**

Z.15: „**Booster** (kurze Akut-Hilfen wie Confidence-Boost, Overthinking-Stopper, Nein-Trainer, Schattenseite)" → „**Kopfwetter** (kurze Akut-Hilfen wie Confidence-Boost, Overthinking-Stopper, Nein-Trainer, Schattenseite)"; im selben Absatz „Stimmungs-Check-in" → „Wetterbericht (Stimmungs-Check-in)".

Nach dem Absatz (vor „Erfolg heißt:") einen Satz ergänzen:

```markdown
Erzählerisch hält die Bildwelt „Dein Nachthimmel“ alles zusammen: Werte = Kompass, Wants = Sterne, innere Regeln = Navigationsregeln — und schwere Momente sind Kopfwetter, das vorbeizieht, ohne den Himmel zu ändern (Details: `docs/superpowers/specs/2026-07-17-bildsprache-nachthimmel-design.md`).
```

- [ ] **Step 4: Commit**

```
git add DESIGN.md PRODUCT.md
git commit -m "docs(bildsprache): Nachthimmel-Bildwelt in DESIGN.md und PRODUCT.md verankern"
```

---

### Task 7: Endabnahme — Audit, Build, Push

**Files:** — (nur Verifikation).

- [ ] **Step 1: Apotheken-Audit**

Run: `Get-ChildItem -Recurse app,components,lib -Include *.ts,*.tsx,*.css | Select-String -Pattern "Apotheke" -SimpleMatch`
Expected: **keine Treffer.** (Treffer in `docs/` sind Historie und bleiben.)

- [ ] **Step 2: Typecheck + Build + Kontrast-Gate**

Run: `npx tsc --noEmit` → Expected: PASS. (Falls Geister-Typen: `rm -rf .next` und erneut.)
Run: `npm run build` → Expected: Build erfolgreich.
Run: `node scripts/check-contrast.mjs` → Expected: 7/7 PASS (es wurden keine Farb-Token geändert).

- [ ] **Step 3: Push**

Run: `git push`
Danach: Stefan prüft am iPhone gegen den Live-Deploy (Kopfwetter-Hub-Motive, Nav-Tab-Breite bei „Kopfwetter" als längstem Label, Check-in-Chips mit „Sternenklar" im horizontalen Scroll, Onboarding-Leitsatz). Kein Browser-Verifikations-Subagent.
