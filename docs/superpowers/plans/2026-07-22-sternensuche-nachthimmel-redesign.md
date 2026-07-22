# Sternensuche → Nachthimmel-Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Sternensuche (`/me/wants/journey`) vom Formular-Wizard in die Nachthimmel-Szenen-Grammatik der Geschwister-Flächen überführen — persistente Himmel-Bühne, weiche Übergänge, zwei echte Peak-Momente, geteilter Stern-Glyph, angepasste Copy. Logik unangetastet.

**Architecture:** Eine persistente `JourneyStage`-Hülle (Himmel-Backdrop + Header/Fortschritt + optionales Eck-Maskottchen) umschließt alle Schritte; nur der Vordergrund wechselt, key-basiert mit Enter-Animation. Der Ergebnis-Screen wird zur Konstellations-Liste (Tap-to-Edit), der Abschluss zum gezeichneten Sternbild. Eine geteilte `StarGlyph`-Komponente zieht den 4-strahligen Stern durch alle Flächen.

**Tech Stack:** Next.js 16 App Router, React Client Components, TailwindCSS v4, `tailwindcss-animate` (`animate-in`), bestehende `@/components/brand/mascot`, `FocusSky`, GSAP (nur wo schon genutzt). Kein Test-Runner im Projekt.

## Global Constraints

- **Kein Unit-Test-Runner vorhanden.** Der Verifikations-Loop pro Task ist: `npx tsc --noEmit` → `npm run gate` (Kontrast + Typo + Motion) → `npm run build` → Commit. Visuelles Finale = iPhone am Live-Deploy (keine Desktop-Browser-Runde).
- **Alle Nutzertexte Deutsch**, warm/ermutigend, informelles „du". Deutsche Typografie: `„…"` (U+201E / U+201C), niemals ASCII-Quotes in gerendertem Text.
- **iOS-PWA:** keine View-Transitions-API (rendert dort nicht) → nur CSS/JS-Animation. Full-bleed-Bühne nutzt `lvh`, nicht `svh`/`dvh`.
- **Tailwind v4:** `translate` ist eigene CSS-Property — bei CSS-`transition` explizit nennen. (Dieser Plan meidet das, indem Schritt-Übergänge `animate-in`-Keyframes statt Transitions nutzen.)
- **Motion:** jede Animation braucht einen `prefers-reduced-motion: reduce`-Fallback (Crossfade/sofort), Inhalt nie versteckt.
- **One-Candle-Rule:** genau eine goldene Aktion/Live-State pro Screen. Glass nur 1–2 Hero-Momente pro Screen (Glass-Is-Rare).
- **Kontrast:** Body ≥ 4.5:1, große/fette Schrift ≥ 3:1, auch Placeholder — gegen den gedimmten Himmel und die Glass-Karte prüfen.
- **Nach Routen-Löschungen** (hier nicht der Fall) `.next` löschen. Bei stale Turbopack-CSS: `rm -rf .next` + Dev-Server-Neustart.
- **PowerShell 5.1:** Commit-Messages ohne innere `"`; Pfade mit `(app)`-Klammern quoten.
- Spec: `docs/superpowers/specs/2026-07-22-sternensuche-nachthimmel-redesign-design.md`.

---

## File Structure

- **Create** `components/brand/star-glyph.tsx` — geteilte 4-strahlige Stern-Glyphe (`StarGlyph`) + `STAR_PATH`-Export. Eine Verantwortung: den Marken-Stern rendern.
- **Modify** `app/(app)/me/wants/star-map.tsx` — lokale `STAR_PATH`-Konstante durch Import aus `star-glyph.tsx` ersetzen.
- **Create** `app/(app)/me/wants/journey/journey-stage.tsx` — persistente Bühne: Himmel-Backdrop (`FocusSky`) + `SubPageHeader` (Titel/Fortschritt/Action) + optionales Eck-Maskottchen + key-animierter Vordergrund-Slot.
- **Modify** `app/(app)/me/wants/journey/wants-journey.tsx` — jede Phase in die Bühne einpassen; Titel-Hierarchie, Fortschritt, Copy, Eck-Maskottchen; Warte-/Ergebnis-/Abschluss-Screens neu.
- **Modify** `app/globals.css` — kleine Ergänzung: gestaffelte Stern-Einblendung für den Warte-Screen (falls `quiet-glow-in` nicht ausreicht) + Hero-Stern-Glow. (Bestehende Klassen `sky-light-twinkle`, `constellation-draw`, `quiet-glow-in`, `star-twinkle` werden wiederverwendet.)

---

## Task 1: Geteilte StarGlyph-Komponente + star-map-Refactor

**Files:**
- Create: `components/brand/star-glyph.tsx`
- Modify: `app/(app)/me/wants/star-map.tsx` (lokale `STAR_PATH`-Konstante entfernen, importieren)

**Interfaces:**
- Produces: `export const STAR_PATH: string` und `export function StarGlyph(props: { className?: string; sizeClass?: string; glow?: number; dim?: boolean })`. Rendert ein `<svg viewBox="0 0 16 16" aria-hidden>` mit dem Gold-Stern-Pfad; `glow` = drop-shadow-Radius in px (Default 6), `dim` reduziert Opazität/Glow für ferne Sterne.

- [ ] **Step 1: StarGlyph-Komponente anlegen**

Create `components/brand/star-glyph.tsx`:

```tsx
import { cn } from "@/lib/utils";

/** Die 4-strahlige Marken-Sternglyphe — die von der Werte-Szene freigegebene
 *  Sprache, geteilt über Star-Map, Sternensuche und Abschluss. */
export const STAR_PATH =
  "M8 0 L9.8 6.2 L16 8 L9.8 9.8 L8 16 L6.2 9.8 L0 8 L6.2 6.2 Z";

export function StarGlyph({
  className,
  sizeClass = "size-6",
  glow = 6,
  dim = false,
  twinkle = false,
}: {
  className?: string;
  sizeClass?: string;
  glow?: number;
  dim?: boolean;
  twinkle?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn("shrink-0", sizeClass, dim && "opacity-55", twinkle && "want-star-twinkle", className)}
      style={{
        filter: `drop-shadow(0 0 ${glow}px color-mix(in srgb, var(--primary) ${dim ? 35 : 55}%, transparent))`,
      }}
    >
      <path d={STAR_PATH} fill="var(--primary)" />
    </svg>
  );
}
```

- [ ] **Step 2: star-map.tsx auf den geteilten Glyph umstellen**

In `app/(app)/me/wants/star-map.tsx` die lokale Konstante (Zeile ~31) entfernen:

```tsx
/** 4-strahliger Stern — die von der Werte-Szene freigegebene Sprache. */
const STAR_PATH = "M8 0 L9.8 6.2 L16 8 L9.8 9.8 L8 16 L6.2 9.8 L0 8 L6.2 6.2 Z";
```

und stattdessen oben importieren:

```tsx
import { STAR_PATH } from "@/components/brand/star-glyph";
```

Die bestehenden `<path d={STAR_PATH} …>`-Nutzungen bleiben unverändert (sie referenzieren jetzt den Import).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (keine Fehler; `STAR_PATH` in star-map weiterhin definiert, jetzt via Import).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: erfolgreicher Build.

- [ ] **Step 5: Commit**

```bash
git add components/brand/star-glyph.tsx "app/(app)/me/wants/star-map.tsx"
git commit -m "feat(wants): geteilte StarGlyph-Komponente, star-map nutzt sie"
```

---

## Task 2: JourneyStage — persistente Himmel-Bühne

**Files:**
- Create: `app/(app)/me/wants/journey/journey-stage.tsx`

**Interfaces:**
- Consumes: `FocusSky` aus `@/app/(app)/me/wants/focus-sky`; `SubPageHeader`; `Mascot` + dessen `expression`-Typ.
- Produces: `export function JourneyStage(props)` mit
  ```ts
  {
    backHref: string;
    title: string;
    subtitle?: string;            // Fortschritt „Schritt 1 von 3"
    headerAction?: React.ReactNode;
    mascot?: { expression: React.ComponentProps<typeof Mascot>["expression"]; gazeX?: number; gazeY?: number } | null;
    stepKey: string;              // triggert Enter-Animation beim Schrittwechsel
    children: React.ReactNode;    // Vordergrund
  }
  ```

- [ ] **Step 1: Komponente anlegen**

Create `app/(app)/me/wants/journey/journey-stage.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

import { Mascot } from "@/components/brand/mascot";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { FocusSky } from "@/app/(app)/me/wants/focus-sky";

/**
 * Persistente Bühne der Sternensuche: der Nachthimmel und das Eck-Maskottchen
 * bleiben über alle Schritte stehen (kein Re-Mount), nur der Vordergrund
 * (children) wechselt. Der Schrittwechsel spielt eine leise Enter-Animation
 * (fade + rise), key-getrieben über `stepKey`. Reduced motion: kein Enter.
 */
export function JourneyStage({
  backHref,
  title,
  subtitle,
  headerAction,
  mascot,
  stepKey,
  children,
}: {
  backHref: string;
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  mascot?: { expression: React.ComponentProps<typeof Mascot>["expression"]; gazeX?: number; gazeY?: number } | null;
  stepKey: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-lvh flex-col overflow-hidden">
      {/* Persistenter Himmel — bleibt über alle Schritte stehen. */}
      <FocusSky />

      <div className="relative z-10 flex flex-1 flex-col">
        <SubPageHeader backHref={backHref} title={title} subtitle={subtitle} action={headerAction} />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-24 pt-6">
          {/* Nur der Vordergrund animiert beim Schrittwechsel. */}
          <div
            key={stepKey}
            className="flex flex-1 flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
          >
            {children}
          </div>
        </div>
      </div>

      {/* Persistentes Eck-Maskottchen — schaut der Szene zu, re-mountet nicht. */}
      {mascot && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-0">
          <Mascot size="sm" expression={mascot.expression} gazeX={mascot.gazeX} gazeY={mascot.gazeY} />
        </div>
      )}
    </div>
  );
}
```

Hinweis für den Umsetzer: `SubPageHeader` akzeptiert bereits `subtitle` und `action` (siehe `values-journey-client.tsx`, das `subtitle` nutzt). Prüfe die genaue Prop-Signatur in `components/layout/sub-page-header.tsx` und passe die Prop-Namen exakt an, falls sie abweichen.

- [ ] **Step 2: SubPageHeader-Props verifizieren**

Run: Öffne `components/layout/sub-page-header.tsx` und bestätige, dass `subtitle?: string` und `action?: ReactNode` existieren (das Values-Journey nutzt `subtitle`; die Sternensuche nutzt heute `action`). Passe `JourneyStage` bei abweichenden Namen an.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (Die Komponente ist noch nirgends eingebunden — reiner Typecheck der neuen Datei.)

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/me/wants/journey/journey-stage.tsx"
git commit -m "feat(wants): JourneyStage - persistente Himmel-Buehne fuer die Sternensuche"
```

---

## Task 3: Eingabeschritte (nudge, yin, yang, tagtraum) in die Bühne einpassen

**Files:**
- Modify: `app/(app)/me/wants/journey/wants-journey.tsx`

**Interfaces:**
- Consumes: `JourneyStage` (Task 2), `StarGlyph` (Task 1, für CTAs in Task 5 — hier nur Import vorbereiten falls genutzt).
- Produces: unveränderte Phasen-State-Machine; die vier Phasen rendern jetzt über `JourneyStage`.

- [ ] **Step 1: Importe ergänzen**

In `app/(app)/me/wants/journey/wants-journey.tsx` oben ergänzen:

```tsx
import { JourneyStage } from "./journey-stage";
```

Der bestehende `Compass`-Import aus `lucide-react` wird in Task 5 entfernt — hier noch belassen.

- [ ] **Step 2: Fortschritts-Helfer + Header-Action definieren**

Innerhalb der `WantsJourney`-Komponente, nach der `header`-Definition, einen Fortschritts-Untertitel und die Header-Action ergänzen (der bestehende `const header = (...)`-Block wird von den umgebauten Phasen nicht mehr gebraucht, aber von `analyzing`/`sterne` in Tasks 4/5 ersetzt — vorerst stehen lassen):

```tsx
const introAction =
  INTRO_CARDS.length > 0 ? <IntroInfoButton cards={INTRO_CARDS} /> : undefined;

// Fortschritt nur auf den drei Eingabeschritten (nutzt die leere Untertitelzeile).
const stepSubtitle =
  phase === "yin"
    ? "Schritt 1 von 3"
    : phase === "yang"
      ? "Schritt 2 von 3"
      : phase === "tagtraum"
        ? "Schritt 3 von 3"
        : undefined;
```

- [ ] **Step 3: Nudge-Phase über die Bühne rendern**

Ersetze den `if (phase === "nudge") { … }`-Block durch (eigenes zentriertes Maskottchen als Vordergrund, kein Eck-Maskottchen, kein Fortschritt):

```tsx
if (phase === "nudge") {
  return (
    <JourneyStage
      backHref="/me/wants"
      title={PAGE_TITLES.wants}
      headerAction={introAction}
      mascot={null}
      stepKey="nudge"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Mascot expression="curious" size="md" />
        <div className="space-y-2">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Erst der Kompass, dann die Sterne?
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Deine Sterne leuchten heller, wenn dein Kompass schon steht. Findest
            du zuerst deine Werte, kann ich deine Wants viel besser mit dem
            verbinden, was dir wirklich wichtig ist.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 pt-2">
          <Button className="w-full" size="lg" render={<Link href="/me/values" />}>
            Zu meinen Werten
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setPhase("yin")}>
            Trotzdem mit den Wants starten
          </Button>
        </div>
      </div>
    </JourneyStage>
  );
}
```

- [ ] **Step 4: Yin-Phase (Einstieg) über die Bühne rendern**

Ersetze den finalen `return ( … )`-Block (Yin, ab `// ── Render: Yin`) durch — kleineres H1, Eck-Maskottchen, CTA-Text „Weiter", Fortschritt:

```tsx
return (
  <JourneyStage
    backHref="/me/wants"
    title={PAGE_TITLES.wants}
    subtitle={stepSubtitle}
    headerAction={introAction}
    mascot={{ expression: "smile" }}
    stepKey="yin"
  >
    {pendingDraft && (
      <DraftRestoreBanner onRestore={restoreDraft} onDiscard={clearDraft} />
    )}

    <div className="space-y-2 text-center">
      <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
        Wofür nimmst du Mühsal in Kauf?
      </h1>
      <p className="text-base leading-relaxed text-muted-foreground">
        Nicht jede Anstrengung stört uns gleich — manche Mühsal nehmen wir
        erstaunlich bereitwillig in Kauf. Genau die verrät, was dir wirklich
        wichtig ist.
      </p>
    </div>

    <FormError message={error} />

    <form className="space-y-5">
      <div className="space-y-2">
        <Label className="text-base font-medium">
          Denk an Momente von Stress oder Schmerz, auf die du zurückblickst
          und denkst: „Hat mich an den Rand gebracht … war’s aber wert.“
          Eine reicht, drei sind ideal.
        </Label>
        <AnswerBoxes
          answers={yin}
          onChange={setYin}
          idPrefix="yin"
          placeholders={[
            "Zum Beispiel: die durchgemachten Nächte vor der Abgabe …",
            "Noch eine Mühsal, die sich gelohnt hat …",
            "Und noch eine …",
          ]}
        />
      </div>

      <Button
        type="button"
        className="w-full"
        size="lg"
        disabled={!yin[0]?.trim()}
        onClick={() => setPhase("yang")}
      >
        Weiter
      </Button>
    </form>
  </JourneyStage>
);
```

- [ ] **Step 5: Yang-Phase über die Bühne rendern**

Ersetze den `if (phase === "yang") { … }`-Block: H1 → `text-xl font-semibold`, Eck-Maskottchen `smile`, `stepKey="yang"`, `subtitle={stepSubtitle}`, CTA bleibt „Weiter". Struktur wie bisher (Flow-Frage, `AnswerBoxes` für `yang`, der aufklappbare „Bonus"-`principles`-Block, „Weiter"/„Zurück"-Buttons), nur der äußere Rahmen wird zu `JourneyStage` und das H1 kleiner. Konkret den äußeren `<div className="flex min-h-lvh …">…{header}…</div>` durch `<JourneyStage … mascot={{ expression: "smile" }} stepKey="yang">…</JourneyStage>` ersetzen und aus dem H1 `text-2xl font-bold` → `text-xl font-semibold` machen. Der innere `form`-Inhalt (inkl. `principlesOpen`-Accordion) bleibt unverändert.

- [ ] **Step 6: Tagtraum-Phase über die Bühne rendern + Analyse-CTA umbenennen**

Ersetze den `if (phase === "tagtraum") { … }`-Block analog: äußerer Rahmen → `JourneyStage` (`mascot={{ expression: "curious" }}`, `stepKey="tagtraum"`, `subtitle={stepSubtitle}`), H1 → `text-xl font-semibold`. Den Analyse-CTA umbenennen:

```tsx
<Button
  type="button"
  className="w-full"
  size="lg"
  disabled={submitting}
  onClick={() => void handleAuditSubmit()}
>
  {submitting ? "Wird gespeichert …" : "Meine Sterne finden"}
</Button>
```

(Der „Zurück"-Ghost-Button und die `AnswerBoxes` für `tagtraum` bleiben unverändert.)

- [ ] **Step 7: Typecheck + Gate + Build**

Run: `npx tsc --noEmit` → PASS
Run: `npm run gate` → PASS (Typo-Gate: deutsche Quotes in den geänderten Texten prüfen; Motion-Gate: keine nackte Transition ohne `translate`)
Run: `npm run build` → PASS

- [ ] **Step 8: Visuelle Verifikation (Notiz)**

Dev-Server (`npm run dev`) und `/me/wants/journey` durchklicken: Himmel + Eck-Maskottchen bleiben beim Schrittwechsel stehen, nur der Vordergrund fadet/steigt leise ein; Header zeigt „Schritt 1/2/3 von 3"; CTAs „Weiter" bzw. „Meine Sterne finden". **Eck-Maskottchen-Position gegen den unteren CTA prüfen** — falls es den Gold-Button überlagert, `bottom-3 left-3` anpassen oder auf eine obere Ecke ausweichen. Finale Abnahme am iPhone.

- [ ] **Step 9: Commit**

```bash
git add "app/(app)/me/wants/journey/wants-journey.tsx"
git commit -m "feat(wants): Eingabeschritte in die Himmel-Buehne, Titel leiser, Fortschritt, Copy Weiter/Meine-Sterne-finden"
```

---

## Task 4: Warte-Screen (analyzing) — auffunkelnder Himmel

**Files:**
- Modify: `app/(app)/me/wants/journey/wants-journey.tsx` (`if (phase === "analyzing")`-Block)
- Modify: `app/globals.css` (gestaffelte Stern-Einblendung, falls nötig)

**Interfaces:**
- Consumes: `JourneyStage`.
- Produces: keine neuen Exports.

- [ ] **Step 1: Analyzing-Block ersetzen**

Ersetze den `if (phase === "analyzing") { … }`-Block (Skeletons raus) durch einen ruhigen, auffunkelnden Himmel + neue Copy. Das Eck-Maskottchen schaut hoch:

```tsx
if (phase === "analyzing") {
  return (
    <JourneyStage
      backHref="/me/wants"
      title={PAGE_TITLES.wants}
      headerAction={introAction}
      mascot={{ expression: "curious", gazeY: -1.4 }}
      stepKey="analyzing"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        {/* Sterne, die nach und nach auffunkeln — der Himmel entsteht. */}
        <div className="relative h-40 w-full max-w-xs" aria-hidden="true">
          {ANALYZING_STARS.map((s, i) => (
            <span
              key={i}
              className="absolute quiet-glow-in"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                animationDelay: `${s.delay}s`,
              }}
            >
              <StarGlyph sizeClass={s.big ? "size-5" : "size-3"} glow={s.big ? 10 : 5} />
            </span>
          ))}
        </div>
        <p className="text-base leading-relaxed text-muted-foreground">
          Dein Himmel entsteht gerade …
        </p>
      </div>
    </JourneyStage>
  );
}
```

- [ ] **Step 2: Stern-Positionen + StarGlyph-Import ergänzen**

Oben in der Datei den Import ergänzen und eine Konstante für die auffunkelnden Sterne (handgesetzte Positionen + gestaffelte Delays) definieren:

```tsx
import { StarGlyph } from "@/components/brand/star-glyph";

// Warte-Screen: Sterne funkeln gestaffelt auf (der Himmel „entsteht").
const ANALYZING_STARS: { x: number; y: number; delay: number; big?: boolean }[] = [
  { x: 20, y: 60, delay: 0.0 },
  { x: 68, y: 70, delay: 0.25 },
  { x: 44, y: 30, delay: 0.5, big: true },
  { x: 82, y: 38, delay: 0.8 },
  { x: 12, y: 24, delay: 1.05 },
  { x: 58, y: 12, delay: 1.3 },
];
```

Hinweis: `quiet-glow-in` (in `globals.css`, `1.5s ease-out forwards`, Opazität 0→~0.5) blendet die Sterne sanft ein und hat bereits einen `prefers-reduced-motion`-Fallback (`animation: none` → Stern bleibt bei seiner End-Opazität sichtbar). Falls die Sterne unter reduced motion unsichtbar bleiben (Start-Opazität 0), ergänze in `globals.css` einen Reduced-Motion-Fallback, der die Start-Opazität auf den Endwert setzt:

```css
@media (prefers-reduced-motion: reduce) {
  .quiet-glow-in { animation: none; opacity: 0.9; }
}
```

(Prüfe zuerst die bestehende `.quiet-glow-in`-Regel bei ~Zeile 559–566; ergänze `opacity` im Reduced-Motion-Zweig nur, falls dort noch keiner die End-Opazität sichert.)

- [ ] **Step 3: Typecheck + Gate + Build**

Run: `npx tsc --noEmit` → PASS
Run: `npm run gate` → PASS
Run: `npm run build` → PASS

- [ ] **Step 4: Visuelle Verifikation (Notiz)**

Analyse auslösen (Tagtraum → „Meine Sterne finden"): keine grauen Balken mehr; Sterne funkeln gestaffelt auf; „Dein Himmel entsteht gerade …"; unter reduced motion sind alle Sterne sofort still sichtbar. iPhone-Abnahme.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/me/wants/journey/wants-journey.tsx" app/globals.css
git commit -m "feat(wants): Warte-Screen als auffunkelnder Himmel statt Skeletons"
```

---

## Task 5: Ergebnis-Screen (sterne) — Konstellations-Liste mit Tap-to-Edit

**Files:**
- Modify: `app/(app)/me/wants/journey/wants-journey.tsx` (`if (phase === "sterne")`-Block; `openIds`-State; `Compass`-Import entfernen)

**Interfaces:**
- Consumes: `StarGlyph`, `JourneyStage`. Nutzt bestehende Handler/States: `draftWants`, `setDraftWants`, `comment`, `aiError`, `manualMode`, `newWantText`, `addOwnWant`, `confirmWants`, `savingWants`, `wantsError`, `refineAnswers`, `refineWant`, `refiningId`, `refineError`, `entryId`, `runDistiller`.
- Produces: keine neuen Exports; neuer lokaler State `openIds`.

- [ ] **Step 1: openIds-State ergänzen + Compass-Import entfernen**

Bei den übrigen `useState`-Deklarationen ergänzen:

```tsx
// Welche Vorschlags-Sterne sind aufgeklappt (Tap-to-Edit). Unabhängig togglebar.
const [openIds, setOpenIds] = useState<Set<string>>(new Set());
const toggleOpen = (id: string) =>
  setOpenIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
```

Im `lucide-react`-Import `Compass` entfernen (wird nicht mehr genutzt). `Plus`, `Sparkles`, `X`, `ChevronDown` bleiben.

- [ ] **Step 2: Neu hinzugefügte eigene Sterne aufgeklappt starten**

In `addOwnWant` den neuen Stern direkt öffnen, damit man sofort tippen kann. Ergänze am Ende von `addOwnWant` (nach `setDraftWants(...)`), wobei die neue id vorab erzeugt wird:

```tsx
function addOwnWant() {
  const text = newWantText.trim();
  if (!text) return;
  const id = crypto.randomUUID();
  setDraftWants((prev) => [
    ...prev,
    { id, text, title: null, distance: "nah", valueId: null, valueLabel: null, reason: null, question: null, source: "own" },
  ]);
  setOpenIds((prev) => new Set(prev).add(id));
  setNewWantText("");
}
```

- [ ] **Step 3: Sterne-Block ersetzen (Erfolgs-Zweig)**

Ersetze im `if (phase === "sterne")`-Block den **Erfolgs-Zweig** (der `else`-Ast nach `aiError ? (…) : (…)`, ab dem Maskottchen-Header bis zum „Sterne behalten"-CTA) durch: Held-Stern statt Maskottchen, Glass-Karte für `comment`, kollabierbare Stern-Zeilen, StarGlyph-CTA. Der `aiError`-Zweig (Fehler-Card mit „Nochmal versuchen" / „Meine Wants selbst formulieren") bleibt unverändert, wird aber ebenfalls in `JourneyStage` gehüllt (siehe Step 4).

```tsx
<>
  {/* Held-Stern statt Maskottchen */}
  <div className="flex flex-col items-center gap-3 text-center">
    <StarGlyph sizeClass="size-14" glow={18} />
    <p className="text-base leading-relaxed text-muted-foreground">
      {manualMode
        ? "Formuliere 3–6 Sätze dazu, was dich antreibt — so, wie es sich für dich richtig anfühlt."
        : "Das lese ich aus deiner Sternensuche heraus. Tipp einen Stern an, um ihn zu taufen oder zu ändern — und verwirf, was nicht stimmt."}
    </p>
  </div>

  {/* KI-Einschätzung als Glass-Karte */}
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

  {/* Vorschläge als kompakte Stern-Zeilen (Tap-to-Edit) */}
  <div className="flex w-full flex-col">
    {draftWants.map((want) => {
      const open = openIds.has(want.id);
      const displayName = want.title?.trim() ? want.title.trim() : want.text.trim();
      return (
        <div key={want.id} className="border-b border-foreground/10 last:border-b-0">
          {/* Kollabierte Zeile */}
          <button
            type="button"
            className="flex w-full items-center gap-3 py-3 text-left"
            aria-expanded={open}
            onClick={() => toggleOpen(want.id)}
          >
            <StarGlyph sizeClass={want.distance === "fern" ? "size-4" : "size-5"} dim={want.distance === "fern"} glow={want.distance === "fern" ? 4 : 7} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-heading text-base font-semibold text-foreground">
                {displayName}
              </span>
              {!open && (
                <span className="block truncate text-sm text-muted-foreground">
                  {want.text}
                </span>
              )}
            </span>
            <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>

          {/* Aufgeklappt: volle Bearbeitung (bestehende Felder + Refine) */}
          {open && (
            <div className="space-y-2 pb-4">
              <div className="flex items-center gap-2">
                <Input
                  value={want.title ?? ""}
                  onChange={(e) =>
                    setDraftWants((prev) => prev.map((w) => (w.id === want.id ? { ...w, title: e.target.value } : w)))
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
              <div className="flex items-start gap-2">
                <Textarea
                  value={want.text}
                  onChange={(e) =>
                    setDraftWants((prev) => prev.map((w) => (w.id === want.id ? { ...w, text: e.target.value } : w)))
                  }
                  maxLength={300}
                  rows={2}
                  className="min-h-[60px] resize-y text-base"
                  aria-label="Want bearbeiten"
                />
                <button
                  type="button"
                  className="mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Want verwerfen"
                  onClick={() => {
                    setDraftWants((prev) => prev.filter((w) => w.id !== want.id));
                    setOpenIds((prev) => {
                      const next = new Set(prev);
                      next.delete(want.id);
                      return next;
                    });
                  }}
                >
                  <X className="size-4" />
                </button>
              </div>
              {want.valueLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  <Sparkles className="size-3" />
                  Passt zu deinem Wert: {want.valueLabel}
                </span>
              )}
              {want.reason && (
                <p className="text-sm leading-relaxed text-muted-foreground">{want.reason}</p>
              )}
              {want.question && (
                <div className="mt-1 space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
                  <p className="text-sm leading-relaxed text-foreground">{want.question}</p>
                  <Textarea
                    value={refineAnswers[want.id] ?? ""}
                    onChange={(e) => setRefineAnswers((a) => ({ ...a, [want.id]: e.target.value }))}
                    rows={2}
                    maxLength={300}
                    placeholder="Deine Antwort — dann mach ich es konkreter."
                    className="min-h-[52px] resize-y bg-background text-sm"
                    aria-label="Antwort zum Konkretisieren"
                  />
                  {refineError[want.id] && (
                    <p className="text-xs text-destructive">{refineError[want.id]}</p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={refiningId === want.id || !(refineAnswers[want.id] ?? "").trim()}
                    onClick={() => void refineWant(want)}
                  >
                    {refiningId === want.id ? "Schärfe …" : "Konkreter machen"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    })}
  </div>

  {/* Eigenen Stern hinzufügen */}
  <div className="flex w-full items-start gap-2">
    <Textarea
      value={newWantText}
      onChange={(e) => setNewWantText(e.target.value)}
      placeholder="Was zieht dich an? Z. B. „Mir macht … Spaß“ oder „Ich will …“"
      maxLength={300}
      rows={2}
      className="min-h-[60px] flex-1 resize-y"
      aria-label="Eigenes Want hinzufügen"
    />
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="mt-1 shrink-0"
      aria-label="Want hinzufügen"
      disabled={!newWantText.trim()}
      onClick={addOwnWant}
    >
      <Plus className="size-4" />
    </Button>
  </div>

  <FormError message={wantsError} />

  <Button
    className="w-full gap-2"
    size="lg"
    disabled={savingWants || keptCount === 0}
    onClick={() => void confirmWants()}
  >
    <StarGlyph sizeClass="size-4" glow={0} className="[filter:none]" />
    {savingWants
      ? "Wird gespeichert …"
      : keptCount === 1
        ? "Diesen Stern behalten"
        : `Diese ${keptCount} Sterne behalten`}
  </Button>
</>
```

Hinweis zum CTA-Icon: Der Gold-Button hat Gold-Ink-Text; die `StarGlyph` füllt mit `var(--primary)` (Gold) und wäre auf Gold unsichtbar. Im CTA daher eine Gold-Ink-Variante rendern — entweder `StarGlyph` um eine `fill`-Override-Prop erweitern oder im CTA ein schlichtes Inline-SVG mit `fill="var(--primary-foreground)"` bzw. `#2B1B06` verwenden. Umsetzer: nimm die einfachste saubere Variante (z. B. `StarGlyph` optional `fill?: string` geben und hier `fill="var(--primary-foreground)"` + `glow={0}` setzen). Kontrast Gold-Ink auf Gold ist erfüllt (Icon = große/dekorative Fläche).

- [ ] **Step 4: Sterne-Phase in JourneyStage hüllen**

Den gesamten `if (phase === "sterne")`-Return in `JourneyStage` wickeln (kein Eck-Maskottchen — der Held-Stern trägt den Screen):

```tsx
if (phase === "sterne") {
  const keptCount = draftWants.filter((w) => w.text.trim()).length;
  return (
    <JourneyStage
      backHref="/me/wants"
      title={PAGE_TITLES.wants}
      headerAction={introAction}
      mascot={null}
      stepKey="sterne"
    >
      {aiError ? (
        /* bestehender Fehler-Zweig unverändert: Mascot sorrowMild, Fehler-Card,
           „Nochmal versuchen" (runDistiller), „Meine Wants selbst formulieren" */
        <> … </>
      ) : (
        /* Erfolgs-Zweig aus Step 3 */
        <> … </>
      )}
    </JourneyStage>
  );
}
```

- [ ] **Step 5: Card-Glass-Variante verifizieren**

Bestätige, dass `@/components/ui/card` eine `variant="glass"` unterstützt (DESIGN.md nennt `card-glass` / `.glass-card`; `Card` in `star-map`/anderen Hero-Momenten). Falls die Prop `variant` heißt und `"glass"` akzeptiert, ist der Code korrekt; sonst die dokumentierte Glass-Prop/Klasse verwenden.

- [ ] **Step 6: Typecheck + Gate + Build**

Run: `npx tsc --noEmit` → PASS (kein ungenutzter `Compass`-Import mehr)
Run: `npm run gate` → PASS (Kontrast: Moonlight-Text auf Glass-Karte ≥ 4.5:1)
Run: `npm run build` → PASS

- [ ] **Step 7: Visuelle Verifikation (Notiz)**

Ergebnis-Screen: großer funkelnder Held-Stern oben; Einschätzung als Glass-Karte; Vorschläge als kompakte Stern-Zeilen, Antippen klappt volle Bearbeitung inkl. „Konkreter machen" auf; ferne Sterne gedimmt; eigener Stern startet aufgeklappt; CTA „Diese N Sterne behalten" mit Stern-Icon (kein Kompass). Fehler-Zweig weiterhin nutzbar. iPhone-Abnahme.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/me/wants/journey/wants-journey.tsx"
git commit -m "feat(wants): Ergebnis-Screen als Konstellations-Liste, Glass-Einschaetzung, Held-Stern, Stern-CTA"
```

---

## Task 6: Abschluss-Screen (done) — dein neues Sternbild

**Files:**
- Modify: `app/(app)/me/wants/journey/wants-journey.tsx` (`if (phase === "done")`-Block)

**Interfaces:**
- Consumes: `StarGlyph`, `STAR_PATH`, `useReducedMotion`, `confirmWants` (setzt `phase="done"`), `draftWants` (die behaltenen Sterne für die Zählung/Konstellation).
- Produces: keine neuen Exports.

- [ ] **Step 1: Behaltene Sterne für die Konstellation bereitstellen**

`confirmWants` speichert die behaltenen Wants und setzt `phase="done"`. Für die Abschluss-Konstellation die Anzahl der behaltenen Sterne nutzen. Ergänze vor dem `done`-Return eine abgeleitete Zahl:

```tsx
const keptStarCount = draftWants.filter((w) => w.text.trim()).length;
```

(`draftWants` ist zum Zeitpunkt `done` noch im State — `confirmWants` leert es nicht.)

- [ ] **Step 2: Import useReducedMotion ergänzen**

```tsx
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
```

und in der Komponente `const reduced = useReducedMotion();` bei den übrigen Hooks ergänzen (falls noch nicht vorhanden).

- [ ] **Step 3: Konstellations-Geometrie definieren**

Auf Modulebene eine kleine geschwungene Konstellation (bis zu 5 sichtbare Sterne) definieren; die `buildDonePath`-Helferfunktion zeichnet eine sanft geschwungene Linie:

```tsx
// Abschluss-Konstellation: bis zu 5 Punkte auf einer geschwungenen Bahn (viewBox 240x150).
const DONE_POINTS: { x: number; y: number }[] = [
  { x: 34, y: 110 },
  { x: 96, y: 58 },
  { x: 150, y: 96 },
  { x: 200, y: 44 },
  { x: 122, y: 128 },
];

function buildDonePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const mx = (a.x + b.x) / 2;
    d += ` Q ${mx},${a.y} ${b.x},${b.y}`;
  }
  return d;
}
```

- [ ] **Step 4: Done-Block ersetzen**

Ersetze den `if (phase === "done") { … }`-Block. Bei ≥2 Sternen wird ein Sternbild gezeichnet; bei genau 1 Stern ein schlichter Held-Stern (Fallback):

```tsx
if (phase === "done") {
  const n = Math.min(keptStarCount, DONE_POINTS.length);
  const pts = DONE_POINTS.slice(0, Math.max(n, 1));
  const path = buildDonePath(pts);

  return (
    <div className="relative flex min-h-lvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <FocusSky />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
        {n >= 2 ? (
          <div className="relative h-[150px] w-[240px]" aria-hidden="true">
            <svg viewBox="0 0 240 150" className="absolute inset-0 size-full">
              {path && (
                <path
                  d={path}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  opacity="0.6"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset={reduced ? 0 : undefined}
                  className={reduced ? undefined : "constellation-draw"}
                />
              )}
            </svg>
            {pts.map((p, i) => (
              <span
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${(p.x / 240) * 100}%`, top: `${(p.y / 150) * 100}%` }}
              >
                <StarGlyph
                  sizeClass={i === Math.floor(pts.length / 2) ? "size-8" : "size-5"}
                  glow={i === Math.floor(pts.length / 2) ? 16 : 9}
                  twinkle={!reduced}
                />
              </span>
            ))}
          </div>
        ) : (
          <StarGlyph sizeClass="size-16" glow={22} twinkle={!reduced} />
        )}

        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {n >= 2
              ? `${keptStarCount} Sterne stehen jetzt an deinem Himmel.`
              : "Dein Stern leuchtet."}
          </h1>
          <p className="text-muted-foreground">
            Sie warten auf deiner Sterne-Seite. Und wenn du Lust hast, etwas
            Neues auszuprobieren, das ein neuer Stern werden könnte: In der
            Sternschmiede schlägst du dafür ein paar Funken.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 pt-4">
          <Button className="w-full" size="lg" render={<Link href="/me/wants" />}>
            Zu deinen Sternen
          </Button>
        </div>
      </div>
    </div>
  );
}
```

Hinweis: `CompletionCelebration` wird auf diesem Screen nicht mehr verwendet. Den Import prüfen — falls nirgends sonst in der Datei genutzt, entfernen (sonst ungenutzter-Import-/Lint-Fehler).

- [ ] **Step 5: Singular-Text prüfen**

Bei `keptStarCount === 1` greift der Fallback „Dein Stern leuchtet." Bei `n >= 2` steht „N Sterne stehen jetzt an deinem Himmel." — grammatikalisch für N≥2 korrekt.

- [ ] **Step 6: Typecheck + Gate + Build**

Run: `npx tsc --noEmit` → PASS (kein ungenutzter `CompletionCelebration`-Import)
Run: `npm run gate` → PASS
Run: `npm run build` → PASS

- [ ] **Step 7: Visuelle Verifikation (Notiz)**

Flow bis zum Abschluss durchspielen: bei ≥2 behaltenen Sternen zeichnet sich ein kleines Sternbild (Linie zieht sich, Sterne funkeln), „N Sterne stehen jetzt an deinem Himmel."; bei 1 Stern schlichter Held-Stern + „Dein Stern leuchtet."; unter reduced motion sofort vollständig. iPhone-Abnahme.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/me/wants/journey/wants-journey.tsx"
git commit -m "feat(wants): Abschluss als gezeichnetes Sternbild mit 1-Stern-Fallback"
```

---

## Self-Review (Plan gegen Spec)

- **§1 Geteilte Schritt-Bühne** → Task 2 (JourneyStage) + Task 3 (Einpassen, Titel `text-xl`, Fortschritt-Untertitel, Eck-Maskottchen). ✔
- **§2 Übergänge** → Task 2 (key-basierte `animate-in`-Enter-Animation, reduced-motion via `motion-reduce:animate-none`; persistente Bühne trägt die Kontinuität; bewusst Enter-only statt Crossfade, um live-Inputs nicht einzufrieren). ✔
- **§3 Warte-Screen** → Task 4 (auffunkelnder Himmel, Copy, reduced-motion). ✔
- **§4 Ergebnis-Screen (Konstellations-Liste)** → Task 5 (Held-Stern, Glass-Karte, Tap-to-Edit-Zeilen, Refine erhalten, Stern-CTA, eigener Stern aufgeklappt). ✔
- **§5 Abschluss (Sternbild)** → Task 6 (gezeichnete Konstellation, N-Sterne-Copy, 1-Stern-Fallback, reduced-motion). ✔
- **§6 Copy & geteilter Glyph** → Task 1 (StarGlyph/STAR_PATH) + Task 3 („Weiter", „Meine Sterne finden") + Task 5 (Stern-CTA statt Kompass). ✔
- **Out of Scope** (Offline-Draft, KI-Fallback, Werte-Nudge-Logik, Server-Actions, a11y-Labels, Intro) — in allen Tasks unangetastet gelassen. ✔
- **Typkonsistenz:** `StarGlyph`-Props (`sizeClass`, `glow`, `dim`, `twinkle`, optional `fill`) einheitlich über Tasks 1/4/5/6; `stepKey`/`mascot`/`subtitle` einheitlich über JourneyStage-Aufrufe. Der CTA-`fill`-Override (Task 5, Step 3) erfordert die optionale `fill`-Prop an `StarGlyph` — beim Umsetzen von Task 5 die Prop in `star-glyph.tsx` ergänzen, falls dort gewählt.
- **Offene Umsetzer-Entscheidungen** (bewusst, keine Platzhalter): SubPageHeader-Prop-Namen (Task 2 Step 2), Card-Glass-Prop (Task 5 Step 5), CTA-Icon-Füllung (Task 5 Step 3), Eck-Maskottchen-Position vs. CTA (Task 3 Step 8). Jede ist eine benannte Verifikation mit klarer Default-Lösung.
