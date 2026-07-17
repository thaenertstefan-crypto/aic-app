# „Die Kerze anzünden" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die 5 freigegebenen Design-Maßnahmen aus [der Spec](../specs/2026-07-17-kerze-anzuenden-design.md) umsetzen: Body-Verlauf + Token-Leiter (M2), solider Gold-CTA (M1), Grain (M3), Fraunces Italic für Affirmationen (M4), Modul-Lichtfarben (M5).

**Architecture:** Alle Farbänderungen laufen ausschließlich über die CSS-Tokens in `app/globals.css` (`:root` **und** `.dark` spiegeln sich). Ein neues Kontrast-Script im Repo ist das Test-Gate: Es parst die Tokens und schlägt fehl, solange die Ziel-Kontraste nicht erreicht sind (TDD auf Token-Ebene). Der Verlauf ist eine fixe Gradient-Ebene in `AppBackdrop` (kein `background-attachment: fixed` — iOS ignoriert es).

**Tech Stack:** Next.js 16 App Router, TailwindCSS v4 (Token-basiert), next/font (Fraunces Variable), Node-Script für Kontrast-Checks.

## Global Constraints

- **Ein Commit + Push pro Task** auf `main` (Stefan testet sofort am iPhone gegen den Live-Deploy).
- **Gate pro Task:** `npx tsc --noEmit` und `node scripts/check-contrast.mjs` (ab Task 1) müssen grün sein, bevor committet wird.
- **Nur Token-Änderungen für Farben** — keine rohen Tailwind-Farb-Utilities (etabliertes Vorgehen).
- **`:root` und `.dark` in `globals.css` sind identische Duplikate** — jede Token-Änderung in beiden Blöcken.
- **One-Candle-Rule:** pro sichtbarem Zustand genau ein Gold-Aktions-Element. **Glass-Is-Rare** und Hairline-Elevation bleiben unangetastet.
- Alle User-Texte Deutsch, informelles „du"; deutsche Anführungszeichen „…" (U+201E/U+201C).
- `prefers-reduced-motion` überall respektieren (Grain ist statisch → kein Handlungsbedarf, nichts Neues animieren).
- Out of scope: Palettenwechsel, Light Mode, Glow, Tageszeit-Tönung, North-Star-Umformulierung (kommt erst am Checkpoint).

## Zieltöne (vorab verifiziert, WCAG-Ratios berechnet)

| Token | Alt | Neu | Beleg |
|---|---|---|---|
| Verlauf oben (nur AppBackdrop) | — | `#131020` | Card neu vs. oben = **1,33:1** |
| `--background` (= Verlauf unten) | `#1B1726` | `#161226` | Card neu vs. unten = **≥1,30:1** |
| `--card`, `--popover`, `--sidebar` | `#221C30` | `#2E2745` | Moonlight auf Card 12,4:1 ✓, Lavender auf Card 5,6:1 ✓ |
| `--muted` | `#251F32` | `#272041` | bleibt zwischen bg und card |
| `--secondary` | `#2A2438` | `#3A3158` | muss auf neuer Card sichtbar bleiben |
| Button default | `bg-primary/15` | `bg-primary` solid | Gold-Ink auf Gold 8,9:1 ✓ |

Die exakten Werte dürfen beim visuellen Abgleich ±wenige Stufen nachjustiert werden, **solange `check-contrast.mjs` grün bleibt.**

---

### Task 1: Kontrast-Script (das failing Gate)

**Files:**
- Create: `scripts/check-contrast.mjs`

**Interfaces:**
- Produces: `node scripts/check-contrast.mjs` — Exit 0 wenn alle Paarungen bestehen, Exit 1 mit Tabelle der Verstöße. Konstante `GRADIENT_TOP` im Script (Quelle der Wahrheit für den oberen Verlaufs-Endpunkt, von Task 2 konsumiert).

- [ ] **Step 1: Script schreiben**

```js
// scripts/check-contrast.mjs
// Kontrast-Gate für das Token-System: parst app/globals.css (:root) und prüft
// die Kernpaarungen der Spec „Kerze anzünden". Exit 1 bei Verstößen.
import { readFileSync } from "node:fs";

// Oberer Endpunkt des Body-Verlaufs (lebt visuell in app-backdrop.tsx —
// hier gespiegelt, damit das Gate ihn mitprüft).
export const GRADIENT_TOP = "#131020";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const root = css.match(/:root\s*\{([\s\S]*?)\}/)[1];
const token = (name) => {
  const m = root.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`Token --${name} nicht als Hex in :root gefunden`);
  return m[1];
};

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const lum = ([r, g, b]) => {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const cr = (a, b) => {
  const [hi, lo] = [lum(hex(a)), lum(hex(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const bg = token("background"), card = token("card"),
  fg = token("foreground"), mutedFg = token("muted-foreground"),
  primary = token("primary"), primaryFg = token("primary-foreground");

const checks = [
  ["Card vs. Verlauf oben (Flächen-Schritt)", cr(card, GRADIENT_TOP), 1.29],
  ["Card vs. Background (Flächen-Schritt)", cr(card, bg), 1.29],
  ["Moonlight auf Card (Body-Text)", cr(fg, card), 4.5],
  ["Lavender auf Card (Sekundär-Text)", cr(mutedFg, card), 4.5],
  ["Gold-Ink auf Gold (CTA-Text)", cr(primaryFg, primary), 4.5],
  ["Gold auf Background (CTA-Fläche)", cr(primary, bg), 3.0],
  ["Gold auf Card (CTA auf Karte)", cr(primary, card), 3.0],
];

let failed = false;
for (const [name, ratio, min] of checks) {
  const ok = ratio >= min;
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${ratio.toFixed(2)}:1 (min ${min}:1)`);
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Script laufen lassen — erwarteter FAIL**

Run: `node scripts/check-contrast.mjs`
Expected: Exit 1. `FAIL Card vs. Verlauf oben … 1.14:1` und `FAIL Card vs. Background … 1.07:1` (alte Tokens); alle Text-Paarungen PASS.

- [ ] **Step 3: Commit (ohne Push — das Gate ist absichtlich rot bis Task 2)**

```bash
git add scripts/check-contrast.mjs
git commit -m "test(design): Kontrast-Gate fuer Token-System (rot bis Verlauf+Leiter stehen)"
```

---

### Task 2: M2 — Body-Verlauf + Token-Leiter

**Files:**
- Modify: `app/globals.css` (`:root` ~Z. 53–90 **und** `.dark` ~Z. 92–128)
- Modify: `components/ui/app-backdrop.tsx`
- Modify: `components/backdrops/sky-backdrop.tsx` (Vignette)
- Modify: `app/layout.tsx:36` (`themeColor`)
- Modify: `app/manifest.ts:13-14` (`background_color`, `theme_color`)
- Modify: `DESIGN.md` (Frontmatter-Farben + Elevation-Kapitel)

**Interfaces:**
- Consumes: `GRADIENT_TOP = "#131020"` aus Task 1.
- Produces: neue Token-Werte (siehe Zieltöne-Tabelle), auf die alle Folge-Tasks bauen.

- [ ] **Step 1: Tokens in `globals.css` umstellen** — in **beiden** Blöcken (`:root` und `.dark`) identisch:

```css
  --background: #161226;
  --card: #2E2745;
  --card-foreground: #F3EFFA;
  --popover: #2E2745;
  /* … */
  --secondary: #3A3158;
  --muted: #272041;
  /* … */
  --sidebar: #2E2745;
```

(Alle übrigen Tokens unverändert: `--primary`, `--foreground`, `--muted-foreground`, `--accent`, `--border`, `--input`, Charts, Status-Farben.)

- [ ] **Step 2: Verlaufs-Ebene in `app-backdrop.tsx` einziehen** — Gradient als Geschwister-Ebene *unter* den Blobs (gleiches `-z-10`, frühere DOM-Position = darunter):

```tsx
export function AppBackdrop() {
  return (
    <>
      {/* Body-Verlauf: oben dunkler (Nacht vertieft sich nach oben), unten der
          --background-Grundton. Fixe Ebene statt background-attachment:fixed
          (iOS ignoriert das); Endpunkte werden von scripts/check-contrast.mjs
          gegen --card verifiziert (GRADIENT_TOP). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: "linear-gradient(180deg, #131020 0%, var(--background) 78%)",
        }}
      />
      <AmbientBlobs blobs={VIEWPORT_BLOBS} className="fixed inset-0 -z-10" />
    </>
  );
}
```

- [ ] **Step 3: SkyBackdrop-Vignette reduzieren** (`sky-backdrop.tsx:24`), damit Dashboard/Wants oben nicht doppelt abdunkeln — Gesamt-Anmutung oben ≈ heute:

```
alt: rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.34) 16%, rgba(0,0,0,0.14) 32%, rgba(0,0,0,0.04) 44%, transparent 56%
neu: rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.2) 16%, rgba(0,0,0,0.08) 32%, rgba(0,0,0,0.02) 44%, transparent 56%
```

- [ ] **Step 4: PWA-Farben nachziehen** — `app/layout.tsx` `viewport.themeColor: "#161226"`; `app/manifest.ts` `background_color`/`theme_color: "#161226"`.

- [ ] **Step 5: Gate laufen lassen**

Run: `node scripts/check-contrast.mjs`
Expected: Exit 0, alle 7 Checks PASS. Falls „Card vs. Background" knapp scheitert: `--background` eine Stufe dunkler (`#151125`) statt Card weiter anheben.

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 6: Visuelle Sichtprüfung (Desktop)** — Dev-Server, Dashboard + /me + ein Booster öffnen: Karten lösen sich sichtbar vom Grund, oben dunkler als unten, SkyBackdrop-Übergang ohne Doppel-Vignette. (Browser-Verifikations-Rezept: Wegwerf-Account + `onboarding_completed`-Flag.)

- [ ] **Step 7: DESIGN.md synchronisieren** — Frontmatter: `aubergine-night: "#161226"`, `plum-surface: "#2E2745"`, `plum-muted: "#272041"`, `plum-secondary: "#3A3158"`. Elevation-Kapitel: Satz ergänzen, dass der Grund ein vertikaler Verlauf ist (oben `#131020`), Schritt Card↔Grund ≥1,3:1, verifiziert durch `scripts/check-contrast.mjs`.

- [ ] **Step 8: Commit + Push**

```bash
git add app/globals.css components/ui/app-backdrop.tsx components/backdrops/sky-backdrop.tsx app/layout.tsx app/manifest.ts DESIGN.md
git commit -m "feat(design): Body-Verlauf + Token-Leiter — Flaechenkontrast >=1.3:1 (M2)"
git push
```

Stefan testet am iPhone (Lesbarkeit bei niedriger Helligkeit, Statusbar-Farbe, kein Doppel-Dunkel oben auf Dashboard/Wants).

---

### Task 3: M1 — Gold-CTA + One-Candle-Audit

**Files:**
- Modify: `components/ui/button.tsx:11-12`
- Modify (Audit, nur bei Konflikt pro sichtbarem Zustand): `app/(app)/booster/saying-no/saying-no-wizard.tsx` (9× default), `app/(app)/me/wants/journey/wants-journey.tsx` (6×), `app/(app)/booster/shadow/shadow-wizard.tsx` (5×), `app/(app)/me/wants/schmiede/sternschmiede.tsx` (5×), `app/(app)/booster/confidence/moment/moment-flow.tsx` (4×), `app/(app)/booster/confidence/mantra-ritual.tsx` (3×), `app/(app)/booster/overthinking/overthinking-wizard.tsx` (3×), `app/(app)/booster/things-got-messy/things-got-messy-wizard.tsx` (3×), `app/(app)/me/bill-of-rights/generate/page.tsx` (3×), `app/(app)/me/values/journey/evaluation/evaluation-form.tsx` (3×), `app/(app)/me/wants/wants-me.tsx` (3×), `app/(app)/me/values/journey/hypothesis/hypothesis-form.tsx` (2×), `app/(app)/me/values/journey/journal/journal-form.tsx` (2×)
- Modify: `DESIGN.md` (Buttons-Abschnitt + Frontmatter `button-primary`)

**Interfaces:**
- Consumes: Token-Leiter aus Task 2.
- Produces: `variant="default"` = solide Gold-Kerze; Audit-Regel dokumentiert.

- [ ] **Step 1: Default-Variante umbauen** (`button.tsx`):

```tsx
        default:
          "bg-primary text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary),var(--primary-foreground)_8%)]",
```

(Ersetzt `border-primary/55 bg-primary/15 text-foreground backdrop-blur-md hover:bg-primary/25`. Base-Klassen liefern weiter `border border-transparent`, Active-Nudge, Disabled, Focus-Ring.)

- [ ] **Step 2: Focus-Ring auf Gold prüfen** — Dev-Server, einen Gold-Button per Tab fokussieren. Der 3px-`ring-ring/50` (Gold-Alpha) muss auf der Gold-Fläche erkennbar bleiben (er liegt *außerhalb* der Border). Falls nicht erkennbar, in der default-Variante ergänzen: `focus-visible:ring-foreground/40 focus-visible:border-foreground/60`.

- [ ] **Step 3: One-Candle-Audit der 13 Mehrfach-Dateien** — Regel: **pro sichtbarem Zustand (Wizard-Phase / gleichzeitig gerenderter Bereich) genau ein Gold-Button.** Wizard-Phasen, die exklusiv rendern (eine Phase = ein Screen), sind konfliktfrei — nichts tun. Wo zwei+ default-Buttons gleichzeitig sichtbar sind: der primäre nächste Schritt bleibt `default`; gleichwertige Alternativen → `variant="outline"`, untergeordnete Aktionen (Skip, Zurück, „später") → `variant="secondary"` oder `"ghost"` passend zum Bestand der Datei. Jede Datei aus der Liste öffnen, Phasen-Rendering prüfen, Konflikte umstufen. Die 18 Dateien mit genau einem default-Button brauchen keine Änderung.

- [ ] **Step 4: Sichtprüfung der heikelsten Flows** — Saying-No-Wizard, Wants-Journey, Sternschmiede im Browser durchklicken: nie zwei Gold-Buttons gleichzeitig, Gold-CTA ist hellstes Element des Screens.

- [ ] **Step 5: Gates**

Run: `node scripts/check-contrast.mjs` → Exit 0.
Run: `npx tsc --noEmit` → keine Fehler.

- [ ] **Step 6: DESIGN.md synchronisieren** — Abschnitt 5 Buttons: Primary ist jetzt „solid Candle Gold mit Gold-Ink-Text — die eine angezündete Kerze; Hover dunkelt minimal Richtung Ink". Frontmatter `button-primary.textColor: "{colors.gold-ink}"`. Der Satz „(Solid-gold fills … reserved for badges/pills)" entfällt.

- [ ] **Step 7: Commit + Push**

```bash
git add components/ui/button.tsx DESIGN.md app/
git commit -m "feat(design): Primary-CTA wird solide Gold-Kerze + One-Candle-Audit (M1)"
git push
```

Stefan testet am iPhone (CTA-Sichtbarkeit auch bei gedimmtem Display / draußen).

---

### Task 4: M3 — Grain-Layer

**Files:**
- Create: `components/ui/grain-overlay.tsx`
- Modify: `app/layout.tsx` (Mount im `<body>`)

**Interfaces:**
- Produces: `<GrainOverlay />` — statische, klicktransparente Korn-Ebene.

- [ ] **Step 1: z-Index-Kontext ermitteln**

Run: `grep -rn "z-50\|z-40\|z-\[" components/ui/dialog.tsx components/layout/ | head -20`
Den Wert der Modal-/Toast-Ebene notieren; Grain kommt **eine Stufe darunter** (Erwartung: Dialoge z-50 → Grain z-40). Falls die Bottom-Nav ≥ dem gewählten Grain-z liegt, Grain trotzdem darunter lassen (Korn über Nav ist ok, über Dialog-Text nicht).

- [ ] **Step 2: Komponente schreiben**

```tsx
/**
 * Statisches Film-Korn über der App — nimmt dem Dunkeltheme das Plastikhafte
 * („Raum bei Kerzenlicht"-Materialität). Fixe, klicktransparente Ebene ohne
 * Animation: kein Repaint beim Scrollen, kein reduced-motion-Bedarf.
 * z-40: über Content/Bottom-Nav, unter Dialogen/Toasts (z-50).
 */
const NOISE_SVG = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>" +
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/>" +
    "<feColorMatrix type='saturate' values='0'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#n)'/></svg>",
);

export function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 opacity-[0.025]"
      style={{ backgroundImage: `url("data:image/svg+xml,${NOISE_SVG}")` }}
    />
  );
}
```

- [ ] **Step 3: In `app/layout.tsx` mounten** — Import ergänzen und im `<body>` nach `{children}` rendern:

```tsx
        {children}
        <GrainOverlay />
```

- [ ] **Step 4: Gates + Desktop-Sichtprüfung**

Run: `npx tsc --noEmit` → keine Fehler.
Sichtprüfung: Korn bei 100 % Zoom kaum bewusst wahrnehmbar, aber Fläche wirkt „materieller"; Scroll bleibt flüssig (DevTools-Performance: keine Paint-Storms); Dialog öffnen → Dialog liegt über dem Korn.

- [ ] **Step 5: Commit + Push**

```bash
git add components/ui/grain-overlay.tsx app/layout.tsx
git commit -m "feat(design): statisches Grain ueber der App (M3)"
git push
```

- [ ] **Step 6: iPhone-Gate (Stefan)** — gezielt Dashboard-Glass-Cards + Crossfades prüfen (bekannte iOS-Compositing-Geister über backdrop-filter). Bei Artefakten: Grain-Ebene testweise **unter** den Content (`-z-10`, im AppBackdrop-Stack über dem Verlauf); wenn auch das Geister zeigt → Task revert.

---

### Task 5: M4 — Fraunces Italic für Affirmationen

**Files:**
- Modify: `app/layout.tsx:13-16` (Fraunces-Config)
- Modify: `app/globals.css` (Utility `.font-affirmation`)
- Modify: `app/(app)/dashboard/page.tsx:276-278` (Heutiges Recht)
- Modify: `app/(app)/me/bill-of-rights/bill-of-rights-me.tsx` (Rechte-Liste), `components/daily-reminder/daily-reminder-screen.tsx` (Recht im Reminder), `app/(app)/booster/confidence/mantra-ritual.tsx` (Mantra-Text) — Affirmations-`<p>`s per Grep finden
- Modify: `DESIGN.md` (Typography: Italic-Stufe der Serif-Is-Voice-Regel)

**Interfaces:**
- Produces: Utility-Klasse `font-affirmation` (Fraunces Italic, SOFT 75).

- [ ] **Step 1: Fraunces-Config erweitern** (`app/layout.tsx`):

```tsx
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT"],
});
```

- [ ] **Step 2: Payload prüfen**

Run: `npm run build` (oder Dev-Server + Network-Tab): Größe der Fraunces-`woff2` in `.next/static/media` vorher/nachher vergleichen. **Wenn das Mehrgewicht > ~80 kB liegt: STOPP, Stefan entscheidet** (Spec-Risiko „Fraunces-Payload").

- [ ] **Step 3: Utility anlegen** (in `@layer utilities` von `globals.css`):

```css
  /* Affirmationen sprechen kursiv: Fraunces Italic mit weicher SOFT-Achse —
     die Stimme der App, wenn sie dem User etwas zuspricht (Serif-Is-Voice+). */
  .font-affirmation {
    font-family: var(--font-fraunces), Georgia, serif;
    font-style: italic;
    font-variation-settings: "SOFT" 75;
  }
```

- [ ] **Step 4: Anwenden** — Affirmations-Stellen finden:

Run: `grep -rn "Ich habe das Recht\|mantra\|asAffirmation" app components --include=*.tsx -l`

An jeder Affirmations-Textstelle die Klasse tauschen, Muster (Dashboard, `page.tsx:276`):

```tsx
            <p className="font-affirmation text-lg leading-relaxed text-foreground">
              {asAffirmation(todayRight.text)}
            </p>
```

Analog: Rechte-Liste in `bill-of-rights-me.tsx`, Recht im `daily-reminder-screen.tsx`, Mantra-Satz in `mantra-ritual.tsx`. **Nur die gesprochenen Affirmations-Sätze** — Titel, Buttons, Meta-Texte bleiben unangetastet (Serif-Is-Voice-Regel).

- [ ] **Step 5: Gates + Sichtprüfung**

Run: `npx tsc --noEmit` → keine Fehler.
Sichtprüfung: Italic rendert echt (nicht faux-oblique: Buchstabenformen ändern sich, nicht nur Neigung), Descender (g, y, p) werden nicht beschnitten (`leading-relaxed` bleibt).

- [ ] **Step 6: DESIGN.md** — Typography-Kapitel, Serif-Is-Voice-Regel ergänzen: „Affirmationen — Sätze, die die App dem User zuspricht — stehen in Fraunces Italic (SOFT 75, Utility `.font-affirmation`)."

- [ ] **Step 7: Commit + Push**

```bash
git add app/layout.tsx app/globals.css app/ components/ DESIGN.md
git commit -m "feat(design): Affirmationen in Fraunces Italic mit SOFT-Achse (M4)"
git push
```

---

### Task 6: M5 — Modul-Lichtfarben über Szenen

**Files:**
- Modify: `app/globals.css` (Glow-Keyframes parametrisieren)
- Modify: `app/(app)/me/me-hub.tsx` (Szenen-Ornamente tinten)
- Modify: `app/(app)/booster/vessels.tsx` (Apotheken-Gefäße tinten)
- Modify: `DESIGN.md` (Modulfarben-Tabelle)

**Interfaces:**
- Produces: CSS-Custom-Property `--scene-glow` (Fallback `var(--primary)`), konsumiert von den Glow-Utilities.

**Zuordnung (Spec-Entscheidung „Bestand ausbauen"):** Werte = Gold (`--primary`), Wants/Schmiede = Rosé (`--celebrate`), Confidence = Lilac (`--cleanser-confidence`), Bill of Rights = Sage (`--success`).

- [ ] **Step 1: Glow-Utilities parametrisieren** (`globals.css`) — in `me-seal-glow`, `me-star-glow`, `bs-glow` (je beide Keyframe-Stops) sowie `star-pulse` **nicht** anfassen (Werte-Journey bleibt Gold über den Fallback):

```css
  @keyframes me-seal-glow {
    0%, 100% { filter: drop-shadow(0 0 6px  color-mix(in srgb, var(--scene-glow, var(--primary)) 40%, transparent)); }
    50%      { filter: drop-shadow(0 0 13px color-mix(in srgb, var(--scene-glow, var(--primary)) 75%, transparent)); }
  }
```

(Gleiches Muster für `me-star-glow` mit seinen 40 %/60 %-Stops und `bs-glow` mit 35 %/65 %.)

- [ ] **Step 2: /me-Hub tinten** (`me-hub.tsx`) — am Ornament-Wrapper der jeweiligen Szene die Custom-Property setzen. Bill-of-Rights-Siegel (SVG mit `me-seal-glow`, ~Z. 82):

```tsx
        style={{ "--scene-glow": "var(--success)" } as React.CSSProperties}
```

Wants-Szene analog mit `var(--celebrate)`; zusätzlich in der Wants-Szene gold-gefüllte Ornament-Elemente (Stern/Blasen-`fill`/`stroke` mit `var(--primary)`) auf `var(--celebrate)` umstellen. Werte-Szene: nichts tun (Gold-Fallback). **Nur Ornamente/Glows — Texte, Chips und CTAs behalten ihre Farben.**

- [ ] **Step 3: Kopf-Apotheke tinten** (`vessels.tsx`) — Confidence-Gefäß ist bereits Lilac (Bestand). Übrige Gefäße: Ornament-Akzente (`bs-glow`-Wrapper, markante `fill`s) je Modul: Shadow/Dampf-ablassen-Gefäß und übrige Booster behalten Gold, sofern kein Modul-Mapping existiert — nur Gefäße mit klarer Modul-Zugehörigkeit (Confidence = Lilac ✓) werden getintet. Kein Zwangs-Einfärben ohne Mapping.

- [ ] **Step 4: Gates + Sichtprüfung**

Run: `npx tsc --noEmit` → keine Fehler.
Sichtprüfung /me + /booster: Siegel glüht Sage, Wants-Ornamente Rosé, Werte golden, Confidence lilac; Gold-CTAs unverändert die hellsten Elemente; `prefers-reduced-motion` (DevTools emulieren) stellt weiterhin alles still.

- [ ] **Step 5: DESIGN.md** — im Colors-Kapitel Tabelle ergänzen:

```markdown
### Modul-Lichtfarben (Szenen-Identität, nie Aktions-Farbe)
| Modul | Lichtfarbe | Token |
|---|---|---|
| Werte | Gold | `--primary` |
| Wants / Sternschmiede | Rosé | `--celebrate` |
| Confidence | Lilac | `--cleanser-confidence` |
| Bill of Rights | Sage | `--success` |

Modulfarbe lebt ausschließlich in Szenen-Ornamenten und Glows (`--scene-glow`).
Gold bleibt überall die Aktions-Farbe (One-Candle-Rule).
```

- [ ] **Step 6: Commit + Push**

```bash
git add app/globals.css "app/(app)/me/me-hub.tsx" "app/(app)/booster/vessels.tsx" DESIGN.md
git commit -m "feat(design): Modul-Lichtfarben ueber Szenen-Ornamente (M5)"
git push
```

---

## Nach Abschluss: Checkpoint (kein Task)

Gemeinsame Bewertung am Live-Stand mit Stefan: Braucht es noch Glow unter der Hero-Card oder mood-reaktive Ambience? Erst dann ggf. Folge-Spec. Am Checkpoint ebenfalls: North-Star-Umformulierung in DESIGN.md („ein geschützter, gedämpfter Raum, in den du dich jederzeit zurückziehen kannst").
