# Feinjustierung Plan 1 — Copy, Ornamente & Theming

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sieben kleine, überwiegend statische Verbesserungen an Copy, geteilten Ornamenten und der Schmiede-Farbzone — jede einzeln commit- und gate-verifizierbar.

**Architecture:** Punktuelle Edits an bestehenden Dateien plus ein neues Client-`ZoneTheme` und ein `--mascot-body`-Token für das route-abhängige Schmiede-Rosé. Kein neues Framework-Muster; folgt den etablierten AIC-Konventionen.

**Tech Stack:** Next.js 16 (App Router, async APIs), React 19, TailwindCSS v4 (Token-System in `app/globals.css`), TypeScript, Anthropic-Prompts als TS-Strings.

## Global Constraints

- **Alle nutzer-sichtbaren Texte deutsch**, warm/ermutigend, informelles „du".
- **Deutsche Typografie in gerendertem Text:** `„…"` = U+201E (`&bdquo;`) öffnend, U+201C (`&ldquo;`) schließend. In Kommentaren/Prompt-ASCII bewusst NICHT aufräumen (Typo-Gate ist nur auf gerenderten Text verengt).
- **Token-Werte (`app/globals.css`, `:root`):** `--primary: #E7B65E` (Gold), `--primary-foreground: #2B1B06`, `--celebrate: #C97B84` (Rosé), `--cleanser-confidence: #9C7FB0` (Lilac).
- **Verifikation pro Task:** `npx tsc --noEmit` grün, `npm run gate` grün (Kontrast + Typo + Motion), `npm run build` grün. Bei prompt-/DB-nahen Tasks zusätzlich der genannte gezielte Check.
- **Nicht anfassen:** die vorbestehende, ungetrackte Änderung an `lib/content/onboarding-intro.ts` (gehört Stefan, nicht Teil dieser Runde).
- **`npm run lint`** ist auf `main` vorbestehend rot (3 Alt-Fehler) und NICHT im Gate — nicht als eigene Regression behandeln.
- Mobile-first, Zielviewport ~375px. Reduced-motion muss bei jeder Animation abgedeckt sein.
- Spec: `docs/superpowers/specs/2026-07-27-feinjustierungsrunde-design.md`.

---

### Task 1: /wants — Einleitungstext

**Files:**
- Modify: `app/(app)/me/wants/wants-me.tsx:206`

- [ ] **Step 1: Text ersetzen**

In [wants-me.tsx](../../../app/(app)/me/wants/wants-me.tsx) die Zeile:

```tsx
                        Nahe Freuden, ferne Ziele — dein eigener Himmel.
```

ersetzen durch:

```tsx
                        Meine Freudenquellen und Ziele, nach denen ich greife.
```

- [ ] **Step 2: Gates**

Run: `npx tsc --noEmit && npm run gate`
Expected: beide grün (Typo-Gate akzeptiert den Satz; kein Em-Dash mehr).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/me/wants/wants-me.tsx"
git commit -m "feat(wants): Einleitungstext auf Freudenquellen-Formulierung"
```

---

### Task 2: /wants — Yin/Yang aus KI-Ausgabe

Die gerenderte Copy sagt schon „Mühsal"/„Flow"; der Leak ist die KI-`reason`/`comment`. Beide Prompts bekommen eine harte Ausgabe-Regel. Interne Tags (`<yin>`, `<yang>`) und Variablennamen bleiben.

**Files:**
- Modify: `lib/anthropic/prompts/wants-distiller.ts`
- Modify: `lib/anthropic/prompts/wants-refiner.ts`

- [ ] **Step 1: Distiller-Regel ergänzen**

In [wants-distiller.ts](../../../lib/anthropic/prompts/wants-distiller.ts), im `reason`-Aufgabenpunkt, den Satz erweitern. Vorher:

```
   - reason: EIN Satz, der den Want aus dem Audit herleitet.
```

Nachher:

```
   - reason: EIN Satz, der den Want aus dem Audit herleitet. Verwende dabei NIEMALS die Wörter „Yin" oder „Yang" — leite den Want aus dem konkreten Inhalt her (Mühsal, die sich lohnt / Aktivität, die in Flow bringt / Tagtraum), in Alltagssprache, nicht aus dem Fachbegriff des Audits.
```

Und im `comment`-Aufgabenpunkt (Punkt 1) am Ende ergänzen: `Auch hier niemals die Wörter „Yin" oder „Yang" verwenden.`

- [ ] **Step 2: Refiner-Regel ergänzen**

In [wants-refiner.ts](../../../lib/anthropic/prompts/wants-refiner.ts), in der `Regeln:`-Liste eine Zeile ergänzen (nach der „Positiv, in der Du-Perspektive…"-Regel):

```
- Verwende im Ergebnis niemals die Wörter „Yin" oder „Yang".
```

- [ ] **Step 3: Gezielter Ausgabe-Check**

Einen echten Distiller-Lauf gegen die API fahren (bestehendes Muster, vgl. `app/api/wants-distiller/route.ts`) mit einem Audit, das früher Yin/Yang in `reason` provozierte. Verifizieren: kein `reason`/`comment` enthält „Yin" oder „Yang".
Alternativ, falls kein API-Key zur Hand: den Prompt-String per Grep prüfen, dass die Regel an beiden Stellen steht, und den Ausgabe-Check beim iPhone-Gate mit-vermerken.

- [ ] **Step 4: Gates**

Run: `npx tsc --noEmit && npm run gate`
Expected: grün (Prompt-ASCII-Quotes sind gate-exempt, da kein gerenderter Text).

- [ ] **Step 5: Commit**

```bash
git add lib/anthropic/prompts/wants-distiller.ts lib/anthropic/prompts/wants-refiner.ts
git commit -m "feat(wants): Yin/Yang aus KI-Begruendungen verbannen (Prompt-Regel)"
```

---

### Task 3: /values/journey/journal — ein Feld

Zwei Textareas → eine. Der 2. Fragetext wird hinten an den 1. angehängt. Der Server-Action-`response`-Pflichtcheck muss weg, die Auswertungs-Ansicht muss `response` bei Altdaten weiter zeigen.

**Files:**
- Modify: `app/(app)/me/values/journey/journal/journal-form.tsx`
- Modify: `app/(app)/recipes/values/actions.ts:288-303`
- Modify: `app/(app)/me/values/journey/evaluation/evaluation-form.tsx:263-270`

**Interfaces:**
- Produces: neue Einträge speichern `content = { happenings }` (kein `response`). Alt-Einträge behalten ihr `response` in der DB unangetastet.

- [ ] **Step 1: Server-Action entschärfen**

In [actions.ts](../../../app/(app)/recipes/values/actions.ts), Region 288–303. Vorher:

```ts
  const happenings = formData.get("happenings");
  const response = formData.get("response");

  if (!happenings || typeof happenings !== "string") {
    return { error: "Bitte beschreib, was heute passiert ist." };
  }
  if (!response || typeof response !== "string") {
    return { error: "Bitte teil deine Gedanken und Gefühle dazu mit." };
  }
  const lengthError =
    tooLong(happenings, TEXT_MAX_LONG) ?? tooLong(response, TEXT_MAX_LONG);
  if (lengthError) {
    return { error: lengthError };
  }

  const content = { happenings, response };
```

Nachher:

```ts
  const happenings = formData.get("happenings");

  if (!happenings || typeof happenings !== "string") {
    return { error: "Bitte beschreib, was heute passiert ist." };
  }
  const lengthError = tooLong(happenings, TEXT_MAX_LONG);
  if (lengthError) {
    return { error: lengthError };
  }

  const content = { happenings };
```

- [ ] **Step 2: Formular auf ein Feld reduzieren**

In [journal-form.tsx](../../../app/(app)/me/values/journey/journal/journal-form.tsx):

(a) Das zweite Textarea-Feld-Block (Label „Welche Gedanken, Gefühle, Reaktionen kamen dabei auf?" + `<Textarea id="response" …>`, ca. Zeilen 265–279) **komplett entfernen**.

(b) Das erste Feld-Label auf die zusammengeführte Frage setzen. Vorher:

```tsx
                  <Label htmlFor="happenings" className="text-base font-medium">
                    Was ist heute passiert?
                  </Label>
```

Nachher:

```tsx
                  <Label htmlFor="happenings" className="text-base font-medium">
                    Was ist heute passiert? Welche Gedanken, Gefühle, Reaktionen kamen dabei auf?
                  </Label>
```

(c) Den `JournalDraft`-Typ und die Draft-Mechanik auf ein Feld reduzieren. Vorher:

```ts
type JournalDraft = { happenings: string; response: string };
```

Nachher:

```ts
type JournalDraft = { happenings: string };
```

Im `useActionState`-Wrapper den Draft-Aufbau anpassen — Vorher:

```ts
      const draft: JournalDraft = {
        happenings: (formData.get("happenings") as string) ?? "",
        response: (formData.get("response") as string) ?? "",
      };
```

Nachher:

```ts
      const draft: JournalDraft = {
        happenings: (formData.get("happenings") as string) ?? "",
      };
```

Und im `entryByDate`-Aufbau / `restoredDraft`-Nutzung alle `response`-Referenzen entfernen (die Read-only-Ansicht wird in Step 3 umgebaut). Der `entryByDate`-Map-Wert braucht `response` nicht mehr für das Formular — aber die Read-only-Ansicht zeigt Altdaten, also `response` dort optional aus `content` lesen (siehe Step 3).

(d) Read-only-Ansicht (ca. Zeilen 217–233): den zweiten Block („Welche Gedanken, Gefühle, Reaktionen kamen dabei auf?") nur rendern, wenn ein Altdaten-`response` nicht leer ist. Vorher zwei feste Blöcke — nachher:

```tsx
                  <div className="space-y-1.5">
                    <p className="text-base font-medium text-muted-foreground">
                      Was ist heute passiert? Welche Gedanken, Gefühle, Reaktionen kamen dabei auf?
                    </p>
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                      {activeEntry.happenings || "—"}
                    </p>
                  </div>

                  {activeEntry.response && (
                    <div className="space-y-1.5">
                      <p className="text-base font-medium text-muted-foreground">
                        Deine Gedanken & Gefühle dazu
                      </p>
                      <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                        {activeEntry.response}
                      </p>
                    </div>
                  )}
```

Dafür `activeEntry` weiterhin `response?: string` tragen lassen (aus `content?.response ?? ""` im `entryByDate`/`pastEntry`-Aufbau lesen — Wert bleibt für Altdaten erhalten, ist bei neuen leer).

- [ ] **Step 3: Auswertungs-Ansicht gegen fehlendes `response` absichern**

In [evaluation-form.tsx](../../../app/(app)/me/values/journey/evaluation/evaluation-form.tsx), Zeile ~268, den `response`-Ausdruck guarden. Vorher:

```tsx
                      {entry.content.response}
```

Nachher (nur rendern, wenn vorhanden — sonst rendert der umschließende Block bei neuen Einträgen `undefined`):

```tsx
                      {entry.content.response ?? ""}
```

Falls der Block eine eigene Überschrift/Struktur nur für `response` hat, diese in `{entry.content.response && ( … )}` einwickeln. Die genaue Struktur bei Zeilen 263–270 prüfen und minimal so anpassen, dass bei fehlendem `response` nichts Leeres/„undefined" gerendert wird.

- [ ] **Step 4: Gates**

Run: `npx tsc --noEmit && npm run gate && npm run build`
Expected: grün. `tsc` fängt verwaiste `response`-Typreferenzen; sicherstellen, dass keine übrig sind.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/me/values/journey/journal/journal-form.tsx" "app/(app)/recipes/values/actions.ts" "app/(app)/me/values/journey/evaluation/evaluation-form.tsx"
git commit -m "feat(journal): Reflexion auf ein zusammengefuehrtes Feld reduzieren"
```

---

### Task 4: /me + /onboarding — Stern an Wants-Glyphe angleichen

`StarArt` (5-zackig) → 4-strahlige Marken-Glyphe (`STAR_PATH`), damit Hub/Onboarding/Preview dieselbe Sternsprache wie die echten Wants sprechen. Ein Umbau fixt alle drei Nutzungsstellen.

**Files:**
- Modify: `components/brand/star-art.tsx` (komplett)

**Interfaces:**
- Consumes: `STAR_PATH` aus `components/brand/star-glyph.tsx`.
- Produces: `StarArt({ animate, dim?, className })` — API unverändert; Konsumenten (`me-hub.tsx`, `onboarding/page.tsx`, `intro-previews.tsx`) bleiben ungeändert.

- [ ] **Step 1: StarArt neu schreiben**

[star-art.tsx](../../../components/brand/star-art.tsx) komplett ersetzen durch:

```tsx
import { cn } from "@/lib/utils";
import { STAR_PATH } from "@/components/brand/star-glyph";

/**
 * Glühender Stern — Signatur-Ornament der Wants. Nutzt dieselbe 4-strahlige
 * Marken-Sternglyphe (STAR_PATH) wie die echten Wants-Sterne (StarGlyph), damit
 * /me-Hub, Onboarding-Preview und die Wants-Seite eine Sprache sprechen.
 * `dim` blasst ihn aus (leerer Zustand), `animate` lässt ihn sanft pulsieren.
 */
export function StarArt({
  animate,
  dim = false,
  className,
}: {
  animate: boolean;
  dim?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-14", dim && "opacity-40", className)}
      aria-hidden="true"
    >
      <g className={animate ? "me-star-glow" : undefined}>
        <path d={STAR_PATH} fill="var(--primary)" opacity={dim ? 0.6 : 0.95} />
      </g>
    </svg>
  );
}
```

(Die `me-star-glow`-Animation existiert bereits in `globals.css` und animiert nur Opacity + Drop-Shadow — keine Transform-Origin-Fallstricke.)

- [ ] **Step 2: Gates + Sichtprüfung im Build**

Run: `npx tsc --noEmit && npm run gate && npm run build`
Expected: grün. `me-hub`, Onboarding intro4 und `MePreview` rendern jetzt den 4-Strahler.

- [ ] **Step 3: Commit**

```bash
git add components/brand/star-art.tsx
git commit -m "feat(brand): StarArt auf 4-strahlige Marken-Glyphe angleichen"
```

---

### Task 5: /onboarding + /me — Kompass weniger dezent

**Files:**
- Modify: `components/brand/me-ornaments.tsx` (CompassArt)

- [ ] **Step 1: Opacities/Strokes anheben**

In [me-ornaments.tsx](../../../components/brand/me-ornaments.tsx), `CompassArt`:

Äußerer Ring — vorher:

```tsx
        stroke="var(--primary)"
        strokeWidth="1"
        opacity="0.3"
```

nachher:

```tsx
        stroke="var(--primary)"
        strokeWidth="1.2"
        opacity="0.5"
```

Innerer Ring — vorher `strokeWidth="0.6" opacity="0.16"` → nachher `strokeWidth="0.8" opacity="0.3"`.

Nadel-Polygone — vorher `opacity="0.9"` bzw. `opacity="0.35"` → nachher `opacity="0.95"` bzw. `opacity="0.5"`.

- [ ] **Step 2: Gates**

Run: `npx tsc --noEmit && npm run gate && npm run build`
Expected: grün. Gegencheck im Build, dass der /me-Hub-Kompass nicht zu dominant wirkt (Startwerte; ggf. beim iPhone-Gate einen Tick zurück).

- [ ] **Step 3: Commit**

```bash
git add components/brand/me-ornaments.tsx
git commit -m "feat(brand): CompassArt praesenter (Ring/Nadel-Opacity)"
```

---

### Task 6: /onboarding — Maskottchen höher + Preview-Ornamente animiert

Der Maskottchen-Abstand zur Progress-Bar wächst; die statischen `me`-Ornamente in der Intro laufen mit der kleinen Idle-Animation (die Kopfwetter-Preview animiert bereits über `weather-art` bs-*-Klassen — nichts zu tun, nur reduced-motion ist zentral abgedeckt).

**Files:**
- Modify: `app/onboarding/page.tsx` (Maskottchen-Wrapper + intro3/4/5)
- Modify: `components/onboarding/intro-previews.tsx` (MePreview-Ornamente)

- [ ] **Step 1: Maskottchen höher**

In [onboarding/page.tsx](../../../app/onboarding/page.tsx), den Maskottchen-Wrapper (ca. Zeile 302). Vorher:

```tsx
      <div className="relative z-50 mb-4 flex justify-center">
```

Nachher:

```tsx
      <div className="relative z-50 mb-8 flex justify-center">
```

- [ ] **Step 2: Intro-Ornamente animieren**

In [onboarding/page.tsx](../../../app/onboarding/page.tsx), intro3/4/5 (ca. Zeilen 402–416): jeweils `animate={false}` → `animate={true}`:

```tsx
          {step === "intro3" && (
            <div className="flex justify-center py-2">
              <CompassArt emojis={[]} animate={true} className="size-20" />
            </div>
          )}
          {step === "intro4" && (
            <div className="flex justify-center py-2">
              <StarArt animate={true} className="size-20" />
            </div>
          )}
          {step === "intro5" && (
            <div className="flex justify-center py-2">
              <SealArt animate={true} className="size-16" />
            </div>
          )}
```

- [ ] **Step 3: MePreview-Ornamente animieren**

In [intro-previews.tsx](../../../components/onboarding/intro-previews.tsx), `MePreview`: die drei `animate={false}` → `animate={true}`:

```tsx
    { art: <CompassArt emojis={[]} animate={true} className="size-9" />, label: "Meine Werte" },
    { art: <StarArt animate={true} className="size-9" />, label: "Meine Wants" },
    { art: <SealArt animate={true} className="size-9" />, label: "Meine Bill of Rights" },
```

(Die `me-*`-Animationen sind in `globals.css` per `prefers-reduced-motion` bereits deaktiviert — kein weiterer Fallback nötig.)

- [ ] **Step 4: Gates**

Run: `npx tsc --noEmit && npm run gate && npm run build`
Expected: grün.

- [ ] **Step 5: Commit**

```bash
git add "app/onboarding/page.tsx" components/onboarding/intro-previews.tsx
git commit -m "feat(onboarding): Maskottchen luftiger + Preview-Ornamente animiert"
```

---

### Task 7: /schmiede — alles Gold → Rosé (Zone-Theming, Maskottchen ausgenommen)

Route-abhängiges Remapping von `--primary` auf `--celebrate` innerhalb der Schmiede — greift Buttons, Wizard-Akzente UND Bottom-Nav in einem Zug. Das Maskottchen wird über einen stabilen `--mascot-body`-Token vom Remap ausgenommen.

**Files:**
- Create: `components/layout/zone-theme.tsx`
- Modify: `app/(app)/layout.tsx` (ZoneTheme mounten)
- Modify: `components/brand/mascot.tsx:108` (Body-Farbe auf `--mascot-body`)
- Modify: `app/globals.css` (Token `--mascot-body` in beiden Token-Blöcken + Zone-Regel)
- Modify: `scripts/check-contrast.mjs` (Rosé-CTA-Text-Paar)

**Interfaces:**
- Produces: `body[data-zone="schmiede"]` als CSS-Kontrakt; `--mascot-body` als zone-invariante Maskottchen-Körperfarbe.

- [ ] **Step 1: `--mascot-body`-Token setzen**

In [globals.css](../../../app/globals.css) in BEIDE Token-Blöcke (bei `--primary: #E7B65E;`, ca. Zeilen 61 und 105) direkt darunter ergänzen:

```css
  --mascot-body: #E7B65E;
```

Wichtig: als **literaler Hex**, NICHT `var(--primary)` — sonst würde der Zone-Remap durchschlagen.

- [ ] **Step 2: Maskottchen-Körper auf den Token ziehen**

In [mascot.tsx](../../../components/brand/mascot.tsx), Zeile ~108. Vorher:

```tsx
          background: "var(--primary)",
```

Nachher:

```tsx
          background: "var(--mascot-body)",
```

(Augen/Mund nutzen `--primary-foreground`, Wangen/Mund-Glut `--celebrate` — beide bleiben zone-invariant, kein weiterer Eingriff.)

- [ ] **Step 3: Zone-Regel in globals.css**

In [globals.css](../../../app/globals.css) auf Top-Level (NICHT in `@theme`/`:root`), z. B. nach den Token-Blöcken, ergänzen:

```css
/* Schmiede-Zone: alles Goldene wird Rosé (Buttons, Wizard-Akzente, Bottom-Nav).
   Greift, solange die Sternschmiede-Route aktiv ist (Marker via ZoneTheme).
   Das Maskottchen bleibt gold (nutzt --mascot-body, hier bewusst unberührt). */
body[data-zone="schmiede"] {
  --primary: var(--celebrate);
}
```

(`--primary-foreground` #2B1B06 auf Rosé #C97B84 = 5,26:1 → bleibt unverändert, Button-Text ist lesbar. Siehe Step 5.)

- [ ] **Step 4: ZoneTheme-Client + Mount**

Neu [components/layout/zone-theme.tsx](../../../components/layout/zone-theme.tsx):

```tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Setzt einen Zone-Marker auf <body> abhängig von der Route, damit
 * globals.css eine Farbzone (z. B. Schmiede-Rosé) über Seiteninhalt UND
 * Bottom-Nav legen kann. Rein präsentativ, rendert nichts.
 */
export function ZoneTheme() {
  const pathname = usePathname();

  useEffect(() => {
    const schmiede = pathname.startsWith("/me/wants/schmiede");
    if (schmiede) {
      document.body.dataset.zone = "schmiede";
    } else {
      delete document.body.dataset.zone;
    }
    return () => {
      delete document.body.dataset.zone;
    };
  }, [pathname]);

  return null;
}
```

In [app/(app)/layout.tsx](../../../app/(app)/layout.tsx) importieren und mounten (im Wurzel-`<div>`, neben `<TimezoneSync />`):

```tsx
import { ZoneTheme } from "@/components/layout/zone-theme";
```

```tsx
      <TimezoneSync />
      <ZoneTheme />
```

- [ ] **Step 5: Kontrast-Gate um Rosé-CTA-Text erweitern**

In [check-contrast.mjs](../../../scripts/check-contrast.mjs) im `checks`-Array eine Zeile ergänzen (nutzt die schon geparsten `primaryFg`/`celebrate`):

```js
  ["Gold-Ink auf Rosé (Schmiede-CTA-Text)", cr(primaryFg, celebrate), 4.5],
```

- [ ] **Step 6: Gates**

Run: `npx tsc --noEmit && npm run gate && npm run build`
Expected: grün. Das neue Kontrast-Paar meldet ~5,26:1 (min 4,5).

- [ ] **Step 7: Commit**

```bash
git add components/layout/zone-theme.tsx "app/(app)/layout.tsx" components/brand/mascot.tsx app/globals.css scripts/check-contrast.mjs
git commit -m "feat(schmiede): Gold->Rose als route-abhaengige Zone (Maskottchen ausgenommen)"
```

---

## Self-Review

**Spec coverage:** 1a→T2, 1b→T1, 3→T3, 2b→T7, 6a→T6, 6b→T4, 6c→T5, 6d→T6. Alle Plan-1-Punkte der Spec haben einen Task.

**Placeholder scan:** keine TBD/TODO; alle Edits zeigen exakten Vorher/Nachher-Code. Die einzigen weichen Stellen sind bewusst („genaue Struktur bei evaluation-form 263–270 prüfen") — dort ist der Zielzustand exakt benannt (nichts Leeres rendern).

**Type consistency:** `content = { happenings }` (T3) passt zum entschärften Pflichtcheck; `activeEntry.response?` bleibt optional für Altdaten; `StarArt`-API (T4) unverändert → Konsumenten brechen nicht; `--mascot-body` (T7) in beiden Token-Blöcken definiert, bevor es in `mascot.tsx` genutzt wird.

**Device-Gate:** /schmiede-Rosé, Kompass-Präsenz und Onboarding-Animationen sind visuelle Startwerte — Stefans iPhone am Live-Deploy ist das finale Gate.
