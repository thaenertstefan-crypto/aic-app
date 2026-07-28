# Feinjustierung 1 — Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das Onboarding bekommt Betonungen im Fließtext, leuchtende statt gedimmte Ornamente, ein ruhigeres Siegel und eine durchgehende Sternenhimmel-Übergabe aufs Dashboard.

**Architecture:** Fünf voneinander unabhängige Eingriffe. Der Inline-Markup-Renderer ist eine neue winzige UI-Komponente; die Ornament-Änderungen passieren in `app/globals.css` und den geteilten Brand-Komponenten (wirken damit automatisch auch auf dem /me-Hub); die Übergabe aufs Dashboard ersetzt `SpinnerOverlay` + Hard-Reload durch eine getimte Fade/Zünd-Sequenz plus Client-Navigation mit hartem Redirect als Notbremse.

**Tech Stack:** Next.js 16 App Router, React 19, TailwindCSS v4, GSAP (bereits im Onboarding), Supabase Server Actions.

Quelle: [`docs/superpowers/specs/2026-07-28-feinjustierung-runde-design.md`](../specs/2026-07-28-feinjustierung-runde-design.md), Paket 1.

## Global Constraints

- **Alle user-facing Texte sind Deutsch**, warm/ermutigend, informelles „du".
- **Deutsche Anführungszeichen sind echte Unicode-Zeichen:** U+201E (`„`) öffnend, U+201C (`"`) schließend. Nie ASCII `"`. Das Typo-Gate (`scripts/check-typography.mjs`) prüft gerenderten Text und bricht sonst.
- **Mobile-first, Ziel-Viewport ~375 px.**
- **Tailwind v4-Footgun:** `translate-*` / `scale-*` / `rotate-*` kompilieren zu den eigenständigen CSS-Properties `translate` / `scale` / `rotate`, NICHT zu `transform`. Wer sie bewegt, muss sie in `transition-[…]` namentlich nennen. `scripts/check-transitions.mjs` flaggt die falsche Kombination.
- **Es gibt kein Test-Framework im Repo.** Die harten Gates sind: `npx tsc --noEmit`, `npm run gate` (Kontrast + Typo + Motion), `npm run build`. Jede Task endet damit.
- **`npm run lint` ist auf `main` vorbestehend ROT** (drei Sternschmiede-ESLint-Fehler in `funken-sky` / `evaluation-form` / `wants-journey`). Das ist keine Regression dieser Runde und eslint hängt nicht im Gate. Nicht debuggen.
- **Der eigentliche Abnahme-Test ist der iPhone-Check am Live-Deploy.** Nach jeder Task committen und nach `main` pushen (Solo-Projekt, `main` ist der Arbeitszweig).
- **PowerShell 5.1-Fallen:** Pfade mit `(app)` immer quoten (`git add "app/(app)/…"`); in mehrzeiligen Commit-Messages keine inneren `"` verwenden.
- **Nach Routen-Löschungen `.next` löschen** — hier nicht relevant, es wird keine Route gelöscht.

---

### Task 1: Inline-Markup in den Onboarding-Kartentexten

Die Kartentexte in `lib/content/onboarding-intro.ts` sind reine Strings, die als `<CardDescription>` gerendert werden. Sie bekommen zwei Auszeichnungen (`**fett**`, `*kursiv*`), die ein winziger Renderer auflöst. Bewusst kein Markdown-Parser: keine Links, keine Verschachtelung — die Texte bleiben in der Content-Datei editierbar, ohne dass Copy-Änderungen JSX anfassen.

**Files:**
- Create: `components/ui/rich-text.tsx`
- Modify: `lib/content/onboarding-intro.ts` (alle Karten-Bodies)
- Modify: `app/onboarding/page.tsx:389-391` (Render der `introCard.body`-Absätze)

**Interfaces:**
- Consumes: nichts aus vorherigen Tasks.
- Produces: `RichText({ text }: { text: string }): React.ReactElement` aus `@/components/ui/rich-text`. Task 2 fasst dieselbe Content-Datei an.

- [ ] **Step 1: Renderer anlegen**

Neue Datei `components/ui/rich-text.tsx`:

```tsx
import { Fragment } from "react";

/**
 * Winziger Inline-Renderer für Content-Strings: löst genau zwei Auszeichnungen
 * auf — `**fett**` und `*kursiv*`. Bewusst KEIN Markdown-Parser: keine Links,
 * kein verschachteltes Markup. Damit bleiben die Texte in
 * [onboarding-intro.ts](../../lib/content/onboarding-intro.ts) lesbar und
 * editierbar, ohne dass Copy-Änderungen JSX anfassen müssen.
 *
 * Fraunces hat einen echten Italic-Schnitt (siehe app/layout.tsx,
 * `style: ["normal", "italic"]`) — `<em>` ist also kein synthetisches Kursiv.
 */
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
```

- [ ] **Step 2: Renderer im Onboarding einhängen**

In `app/onboarding/page.tsx` den Import ergänzen (zu den anderen `@/components/ui`-Imports):

```tsx
import { RichText } from "@/components/ui/rich-text";
```

Und den Absatz-Render der Intro-Karten (heute `<CardDescription key={i} className="text-base">{paragraph}</CardDescription>`) ersetzen:

```tsx
          {introCard && (
            <>
              {introCard.title && <CardTitle className="text-xl">{introCard.title}</CardTitle>}
              {introCard.body.map((paragraph, i) => (
                <CardDescription key={i} className="text-base">
                  <RichText text={paragraph} />
                </CardDescription>
              ))}
            </>
          )}
```

Nur dieser Zweig bekommt `RichText` — die statischen Schritte (`name`, `response`, `reason`, `confidence`) behalten ihr JSX.

- [ ] **Step 3: Betonungen in `lib/content/onboarding-intro.ts` setzen**

Alle drei `confidenceReaction`-Zweige und die acht `ONBOARDING_INTRO`-Karten bekommen 1–2 Betonungen. Die Datei behält ihre Quote-Regel: String-Literale mit **einfachen** Quotes delimitiert, deutsche Anführungszeichen als echte U+201E / U+201C.

`confidenceReaction`, Score ≤ 4 — Body-Absatz wird zu:

```ts
        'Danke für deine Ehrlichkeit – zu mir und vor allem zu dir selbst. Es ist nicht immer leicht, sich die Wahrheit einzugestehen. Aber nur wer wirklich **ehrlich zu sich selbst** ist, wird es schaffen, das Gefühl von „gut genug" zurückzugewinnen.',
```

Score 5–7:

```ts
        'Ehrlich zu sich selbst zu sein ist nicht immer leicht – und genau darum geht es hier. Nur wer sich wahrnimmt, wie er gerade wirklich ist, findet zurück zu dem Gefühl, **gut genug** zu sein.',
```

Score ≥ 8:

```ts
      'Danke für deine Ehrlichkeit. Dieses Gefühl von Sicherheit ist genau das, was wir hier bewahren und stärken wollen – damit es dein **Normalzustand** bleibt, auch wenn es mal stürmisch wird.',
```

`ONBOARDING_INTRO[0]` (intro2, „Me"-Überblick) — Absatz 1 und Absatz 3:

```ts
      'Die AIC-App vertritt eine zentrale Prämisse, die mein Leben seit ihrer Entdeckung komplett verändert hat: Die Essenz eines gesunden Selbstbewusstseins ist das: *Sei dir bewusst, wer du bist.* – und zwar auf einer tieferen Ebene, als du sie bisher vielleicht betrachtet hast.',
      'Denn nur wenn du dich wirklich kennst, kannst du dein Leben so gestalten, dass du die Dinge tust, die dir wirklich Energie geben, statt sie dir zu nehmen.',
      'Wir müssen nur herausfinden, was diese Dinge sind! Dabei helfen dir vor allem **drei innere Anlaufpunkte**:',
```

`ONBOARDING_INTRO[1]` (intro3, Werte):

```ts
      'Die fundamentale Grundlage für dein persönliches Wohlbefinden sind dabei deine **Werte**. Sie sind wie dein *innerer Kompass*, der dir den Weg weist und darauf zeigt, was dir wirklich wichtig ist, sei es Abenteuerlust oder Gelassenheit.',
```

`ONBOARDING_INTRO[2]` (intro4, Wants) — Absatz 1 und 2:

```ts
      'Deine **Wants** hingegen sind wie Sterne, nach denen du entlang dieses von deinem Kompass vorgegebenen Weges greifst. Sie sind Dinge, die echte Freudenquellen für dich sind, wie z.B. Wanderurlaube oder ein chilliger Spieleabend mit Freunden, aber auch deine Ziele, die dich tagträumen lassen und dich antreiben.',
      'Mit anderen Worten: Deine Wants sind die Dinge, die dich so richtig zum Leuchten bringen. *Wie einen Stern.*',
```

`ONBOARDING_INTRO[3]` (intro5, Bill of Rights) — Absatz 1:

```ts
      'Und dann gibt es noch deine **inneren Regeln**. Sie sind wie unbewusste Rechte, die wir uns selbst geben und die uns sagen, was wir dürfen und was nicht.',
```

`ONBOARDING_INTRO[4]` (intro6, Caveat) — Absatz 2. Die Zuordnung des Leitsatzes folgt der Metapher-Mechanik: „Wetter verdeckt Sterne, die weiterleuchten" gehört an einen Kopfwetter-Abschluss, nicht an eine Wants-Karte:

```ts
      'Das ist normal: *Wetter kommt und vergeht, doch die eigenen Sterne leuchten weiter.* Wir müssen bloß einen Weg finden, mit dem Wetter umzugehen. Genau dabei hilft dir der Teil **Kopfwetter**:',
```

`ONBOARDING_INTRO[5]` (intro7, Kopfwetter) — Absatz 2:

```ts
      'Sie helfen dir, Overthinking-Spiralen zu überwinden, eine schuldgefühlfreie „Nein"-Antwort zu formulieren oder dir selbst Rückenwind zu geben, bevor du in ein nervenaufreibendes Gespräch, Treffen oder eine Präsentation gehst. Sprich: *schnell abrufbare kleine Unterstützer für mittendrin im Alltag*.',
```

`ONBOARDING_INTRO[6]` (intro8, Abschluss) — Absatz 1:

```ts
      '„Me", um dich Stück für Stück kennenzulernen. Das Kopfwetter, um dir im Alltag den Rücken zu stärken. Zusammen bringen sie dich zu dem Gefühl zurück, das eigentlich dein Normalzustand sein sollte: *ich bin gut genug*.',
```

Der Header-Kommentar der Datei bekommt einen Zusatz zum Markup:

```ts
 * Die Kartentexte tragen leichtes Inline-Markup (`**fett**` / `*kursiv*`), das
 * [RichText](../../components/ui/rich-text.tsx) beim Rendern auflöst.
```

- [ ] **Step 4: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler. Das Typo-Gate darf nicht anschlagen — die `„…"`-Paare in den Strings sind echte U+201E/U+201C.

- [ ] **Step 5: Am Gerät prüfen und committen**

Im Onboarding durch intro1–intro8 klicken: Fett und Kursiv sitzen an den geplanten Stellen, keine übrig gebliebenen `*`-Zeichen im Text.

```bash
git add components/ui/rich-text.tsx lib/content/onboarding-intro.ts app/onboarding/page.tsx
git commit -m "feat(onboarding): Inline-Markup (fett/kursiv) in den Kartentexten

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 2: Kompass auf voller Leuchtkraft

`CompassArt` dimmt sich per `opacity-40`, sobald `emojis.length === 0` ([`me-ornaments.tsx:30`](../../../components/brand/me-ornaments.tsx)). Im Onboarding wird `emojis={[]}` übergeben — der Kompass ist dort also dauerhaft auf 40 % gedimmt, während er auf /me mit den echten Werte-Emojis voll leuchtet. Onboarding-Karte intro3 und die Mini-Vorschau bekommen vier Beispiel-Emojis.

**Die Dämpfungsregel selbst bleibt unangetastet:** Auf /me ist der leere Kompass ein ehrlicher Leer-Zustand, den die Werte-Übung füllt.

**Files:**
- Modify: `lib/content/onboarding-intro.ts` (neue exportierte Konstante)
- Modify: `app/onboarding/page.tsx:402-406` (intro3-Ornament)
- Modify: `components/onboarding/intro-previews.tsx:21` (MePreview)

**Interfaces:**
- Consumes: `getValueEmoji(id: string): string` aus `@/lib/utils/values-emojis` (bestehend).
- Produces: `ONBOARDING_COMPASS_EMOJIS: string[]` aus `@/lib/content/onboarding-intro`.

- [ ] **Step 1: Konstante aus der echten Emoji-Quelle ableiten**

Am Kopf von `lib/content/onboarding-intro.ts`, nach dem Datei-Kommentar:

```ts
import { getValueEmoji } from "@/lib/utils/values-emojis";
```

Und unter dem `OnboardingIntroCard`-Typ:

```ts
/**
 * Beispiel-Werte für die Kompassrose im Onboarding (Karte intro3 + Mini-Vorschau).
 * Ohne Emojis dimmt sich [CompassArt](../../components/brand/me-ornaments.tsx)
 * auf 40 % — im Onboarding wäre das ein Leer-Zustand ohne Aussage. Abenteuerlust
 * und Ausgeglichenheit stehen wörtlich im Kartentext („sei es Abenteuerlust oder
 * Gelassenheit"). Integrität (🧭) ist bewusst NICHT dabei: ein Kompass-Emoji im
 * Kompass liest sich falsch. Aus der echten Emoji-Quelle abgeleitet, damit die
 * Vorschau nicht von der Realität abdriften kann.
 */
export const ONBOARDING_COMPASS_EMOJIS = [
  getValueEmoji("adventurousness"), // 🧗 Abenteuerlust
  getValueEmoji("balance"), // ⚖️ Ausgeglichenheit
  getValueEmoji("growth"), // 🌱 Wachstum
  getValueEmoji("honesty"), // 🪞 Ehrlichkeit
];
```

- [ ] **Step 2: intro3-Ornament versorgen**

In `app/onboarding/page.tsx` den bestehenden Content-Import erweitern:

```tsx
import {
  ONBOARDING_INTRO,
  ONBOARDING_COMPASS_EMOJIS,
  confidenceReaction,
} from "@/lib/content/onboarding-intro";
```

Und den intro3-Block:

```tsx
          {step === "intro3" && (
            <div className="flex justify-center py-2">
              <CompassArt
                emojis={ONBOARDING_COMPASS_EMOJIS}
                animate={true}
                className="size-20"
              />
            </div>
          )}
```

- [ ] **Step 3: Mini-Vorschau versorgen**

In `components/onboarding/intro-previews.tsx` den Import ergänzen:

```tsx
import { ONBOARDING_COMPASS_EMOJIS } from "@/lib/content/onboarding-intro";
```

Und die erste Szene in `MePreview`:

```tsx
    {
      art: (
        <CompassArt
          emojis={ONBOARDING_COMPASS_EMOJIS}
          animate={true}
          className="size-9"
        />
      ),
      label: "Meine Werte",
    },
```

- [ ] **Step 4: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler.

- [ ] **Step 5: Am Gerät prüfen und committen**

intro2 (Mini-Vorschau) und intro3: Der Kompass leuchtet voll, vier Emojis stehen auf N/O/S/W. In der `size-9`-Vorschau sind die Emojis (fontSize 9 in einer 64er viewBox) winzig, aber sichtbar — wenn sie dort matschen, ist das ein Folge-Thema, kein Blocker dieser Task.

```bash
git add lib/content/onboarding-intro.ts app/onboarding/page.tsx components/onboarding/intro-previews.tsx
git commit -m "feat(onboarding): Kompass mit Beispiel-Emojis statt gedimmt

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 3: Stern funkelt stärker

`me-star-glow` läuft heute mit Opacity 0.85 ↔ 1 und Glow-Radius 2 ↔ 6 px über 4 s — ein ruhiges Atmen, kein Funkeln. Zwei Änderungen: kräftigerer Grundschein (Radius ~5 ↔ 14 px, größerer Helligkeitshub, Rhythmus bleibt 4 s) und ein Glitzer-Aufblitz über 5 s, dessen Periode gegen die 4 s läuft — dadurch wirkt das Funkeln unregelmäßig statt getaktet.

Weil /me-Hub, Onboarding-Karte intro4 und die Mini-Vorschau dieselbe `StarArt` rendern, sind sie automatisch aligned.

**Nicht betroffen:** `want-star-twinkle` auf der Sternenkarte. Die vielen kleinen Sterne bleiben ruhig, sonst flackert der ganze Himmel.

**Files:**
- Modify: `app/globals.css:638-642` (`me-star-glow`) und `:659-666` (reduced-motion-Block)
- Modify: `components/brand/star-art.tsx:25-27`

**Interfaces:**
- Consumes: nichts.
- Produces: CSS-Klasse `.me-star-sparkle` (neu), unverändertes Prop-Interface von `StarArt`.

- [ ] **Step 1: Grundschein kräftigen + Glitzer-Keyframes ergänzen**

In `app/globals.css` den `me-star-glow`-Block (heute Zeile 637–642) ersetzen durch:

```css
  /* Stern der Wants glüht — Signatur-Ornament. Kräftiger Grundschein (5 ↔ 14 px)
     im 4-s-Rhythmus. */
  @keyframes me-star-glow {
    0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 5px  color-mix(in srgb, var(--scene-glow, var(--primary)) 45%, transparent)); }
    50%      { opacity: 1;   filter: drop-shadow(0 0 14px color-mix(in srgb, var(--scene-glow, var(--primary)) 85%, transparent)); }
  }
  .me-star-glow { animation: me-star-glow 4s ease-in-out infinite; }

  /* Glitzer: ein sehr kurzer heller Aufblitz, der Großteil der Periode ist Ruhe.
     Läuft mit 5 s gegen die 4 s des Grundscheins → die beiden Perioden laufen
     auseinander, das Funkeln wirkt unregelmäßig statt getaktet. Sitzt auf einer
     EIGENEN, inneren <g>-Gruppe: zwei Animationen auf demselben Element würden
     sich um `filter` und `opacity` streiten (die zuletzt gelistete gewinnt) —
     verschachtelt komponieren die Filter sauber. Rest-Zustand ist ein
     0-px-drop-shadow statt `none`, damit die Filter-Listen interpolierbar
     bleiben und der Blitz nicht springt. */
  @keyframes me-star-sparkle {
    0%, 88%, 100% {
      transform: scale(1);
      filter: drop-shadow(0 0 0 transparent) brightness(1);
    }
    92% {
      transform: scale(1.08);
      filter: drop-shadow(0 0 9px color-mix(in srgb, var(--scene-glow, var(--primary)) 95%, transparent)) brightness(1.3);
    }
    96% {
      transform: scale(1);
      filter: drop-shadow(0 0 0 transparent) brightness(1);
    }
  }
  .me-star-sparkle {
    transform-box: fill-box;
    transform-origin: center;
    animation: me-star-sparkle 5s ease-in-out infinite;
  }
```

- [ ] **Step 2: Glitzer in den reduced-motion-Block aufnehmen**

Im bestehenden `@media (prefers-reduced-motion: reduce)`-Block (heute Zeile 659) die Selektorliste erweitern:

```css
  @media (prefers-reduced-motion: reduce) {
    .me-needle-sway, .me-seal-glow, .me-star-glow, .me-star-sparkle, .me-bubble,
    .me-ring-draw, .me-seal-stamp {
      animation: none !important;
    }
    .me-ring-draw { stroke-dasharray: none; }
    .me-seal-stamp { opacity: 1; transform: none; }
  }
```

- [ ] **Step 3: Zweite Gruppe in `StarArt` rendern**

`components/brand/star-art.tsx`, das SVG-Innere:

```tsx
      <g className={animate ? "me-star-glow" : undefined}>
        {/* Innere Gruppe trägt den Glitzer-Aufblitz — getrennt vom Grundschein,
            damit sich die beiden Animationen nicht um filter/opacity streiten. */}
        <g className={animate ? "me-star-sparkle" : undefined}>
          <path d={STAR_PATH} fill="var(--primary)" opacity={dim ? 0.6 : 0.95} />
        </g>
      </g>
```

- [ ] **Step 4: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler. Das Motion-Gate betrifft nur `transition-[…]`-Klassen in TSX, nicht CSS-Keyframes — es sollte still bleiben.

- [ ] **Step 5: Am Gerät prüfen und committen**

/me-Hub, Onboarding intro4 und die Mini-Vorschau in intro2: Der Stern hat einen deutlich kräftigeren Grundschein und blitzt unregelmäßig auf. Die Sternenkarte auf /me/wants darf sich NICHT verändert haben (dort läuft `want-star-twinkle`).

```bash
git add app/globals.css components/brand/star-art.tsx
git commit -m "feat(brand): Stern-Ornament funkelt staerker (Grundschein + Glitzer)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 4: Siegel-Animation glätten

Das „Gestaggerte" entsteht, weil drei Zeitachsen gleichzeitig starten: `Crossfade` blendet die ganze Karte ein, `me-seal-stamp` skaliert von 1.15 → 1 **mit einem Opacity-Knick bei 60 %**, und `me-seal-glow` pulst ab Frame 0 den Drop-Shadow. Der Knick erzeugt einen sichtbaren Zwei-Phasen-Eindruck, und der Glüh-Puls läuft an, während der Stempel noch fährt.

Fix: Knick raus (eine durchgehende Kurve von 0 auf 1), Stempel auf ~0,5 s straffen, und `me-seal-glow` bekommt eine `animation-delay`, die es erst nach dem Stempel anlaufen lässt. Ein Ereignis statt drei überlagerter. Gilt für /me-Hub und Onboarding-Karte intro5 gleichermaßen (geteilte `SealArt`).

**Files:**
- Modify: `app/globals.css:620-625` (`me-seal-glow`) und `:651-657` (`me-seal-stamp`)

**Interfaces:**
- Consumes: nichts.
- Produces: nichts Neues — `SealArt` bleibt unverändert.

- [ ] **Step 1: Opacity-Knick entfernen und Stempel straffen**

In `app/globals.css` den `me-seal-stamp`-Block ersetzen:

```css
  /* Einzug: Siegel stempelt sich ein — durchgehende Kurve von 0 auf 1 (kein
     Opacity-Knick bei 60 %, der las sich als zwei Phasen), straff bei 0,5 s. */
  @keyframes me-seal-stamp {
    0%   { transform: scale(1.15); opacity: 0; }
    100% { transform: scale(1);    opacity: 1; }
  }
  .me-seal-stamp { animation: me-seal-stamp 0.5s ease-out both; }
```

- [ ] **Step 2: Glüh-Puls hinter den Stempel legen**

Die `.me-seal-glow`-Regel bekommt eine Verzögerung, die den Stempel abwartet. `both` sorgt dafür, dass während der Verzögerung schon der 0 %-Zustand (der ruhige Grundschein) anliegt — ohne Fill-Mode hätte das Siegel für 0,55 s gar keinen Filter und würde danach hart einrasten:

```css
  /* Wachssiegel glüht im wandernden Kerzenlicht. Läuft erst an, wenn der Stempel
     (me-seal-stamp, 0,5 s) gesessen hat — ein Ereignis statt zwei überlagerter. */
  @keyframes me-seal-glow {
    0%, 100% { filter: drop-shadow(0 0 6px  color-mix(in srgb, var(--scene-glow, var(--primary)) 40%, transparent)); }
    50%      { filter: drop-shadow(0 0 13px color-mix(in srgb, var(--scene-glow, var(--primary)) 75%, transparent)); }
  }
  .me-seal-glow { animation: me-seal-glow 5s ease-in-out 0.55s infinite both; }
```

- [ ] **Step 3: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler.

- [ ] **Step 4: Am Gerät prüfen und committen**

Onboarding-Karte intro5 und der /me-Hub beim Öffnen: Das Siegel stempelt sich in einem Zug ein, kein sichtbarer Zwei-Phasen-Eindruck, das Glühen setzt erst danach ein.

```bash
git add app/globals.css
git commit -m "fix(brand): Siegel-Einzug geglaettet (Opacity-Knick raus, Glow verzoegert)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 5: Abschluss → Dashboard als Sternenhimmel-Übergabe

Heute: `<SpinnerOverlay />`, solange die Server-Action läuft, dann `window.location.href = "/dashboard"` — ein harter Reload. Neu:

```
„Ich bin bereit"
   │
   ├─ 0–400 ms   Karte, Fortschrittsbalken, Navigation faden aus
   │             (Server-Action läuft parallel)
   │
   ├─ 400–900 ms Maskottchen löst sich sanft auf,
   │             der Nachthimmel zündet gestaffelt Sterne
   │
   ├─ danach     Navigation → /dashboard
   │             POST_LOGIN_KEY gesetzt
   │
   └─ Dashboard  DashboardReveal staffelt die Abschnitte von oben ein
```

Der Trick: `SkyBackdrop` ist auf **beiden** Seiten dieselbe fixe `-z-10`-Ebene ([`onboarding/layout.tsx:26`](../../../app/onboarding/layout.tsx) und dem Dashboard). Wenn dazwischen nichts aufblitzt, liest sich der Wechsel als eine durchgehende Fläche.

Der Onboarding-Gate liegt in [`app/(app)/layout.tsx`](<../../../app/(app)/layout.tsx>) — eine Server-Component, die `profiles.onboarding_completed` liest und sonst auf `/onboarding` zurückschickt. Die Server-Action hat das Flag vor `state.success` gesetzt, eine Client-Navigation sollte also durchgehen. Falls nicht, greift der harte Redirect als Notbremse; die Stern-Zünd-Sequenz deckt beide Varianten ab, weil sie über der Navigation liegt.

**Files:**
- Create: `components/onboarding/igniting-sky.tsx`
- Modify: `app/onboarding/page.tsx` (Import-Block, Konstanten, State, `goNext`, Success-Effect, Fehler-Effect, Render von Mascot-Wrapper + Content-Wrapper; `SpinnerOverlay` fliegt raus)

**Interfaces:**
- Consumes: `POST_LOGIN_KEY` aus `@/components/dashboard/dashboard-reveal` (bereits importiert), `useReducedMotion()` aus `@/lib/hooks/use-reduced-motion` (bereits importiert), `useRouter()` aus `next/navigation` (neu).
- Produces: `IgnitingSky(): React.ReactElement | null` aus `@/components/onboarding/igniting-sky`.

- [ ] **Step 1: Zünd-Sterne als eigene Komponente**

Neue Datei `components/onboarding/igniting-sky.tsx`:

```tsx
"use client";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/**
 * Die Zünd-Sterne der Onboarding-Übergabe: sechs zusätzliche Lichter im
 * `sky-light`-Vokabular des [SkyBackdrop](../backdrops/sky-backdrop.tsx), die
 * gestaffelt (≈120 ms Abstand) in freien Bereichen des Himmels aufglimmen,
 * während die Karte fadet. Liegt auf derselben fixen -z-10-Ebene wie der
 * Backdrop, damit Onboarding und Dashboard als eine durchgehende Fläche gelesen
 * werden.
 *
 * Der Fade sitzt auf einem Wrapper-Span, nicht auf `.sky-light` selbst — die
 * Klasse bringt ihre eigene Ruhe-Opacity (0.38) mit, ein `fade-in` auf ihr
 * würde sie auf 1 hochziehen und heller als der restliche Himmel enden.
 */
const IGNITE: { pos: React.CSSProperties; big?: boolean; delay: number }[] = [
  { pos: { left: "26%", top: "20%" }, delay: 0 },
  { pos: { right: "18%", top: "28%" }, delay: 120 },
  { pos: { left: "14%", top: "36%" }, big: true, delay: 240 },
  { pos: { right: "30%", top: "16%" }, delay: 360 },
  { pos: { left: "62%", top: "26%" }, delay: 480 },
  { pos: { left: "40%", top: "45%" }, big: true, delay: 600 },
];

export function IgnitingSky() {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {IGNITE.map((s, i) => (
        <span
          key={i}
          className="absolute animate-in fade-in zoom-in-50"
          style={{
            ...s.pos,
            animationDelay: `${s.delay}ms`,
            animationDuration: "500ms",
            animationFillMode: "both",
          }}
        >
          <span
            className="sky-light block"
            style={s.big ? { width: "4px", height: "4px" } : undefined}
          />
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Konstanten und State in `app/onboarding/page.tsx`**

Import-Block anpassen — `SpinnerOverlay` raus, `useRouter` und `IgnitingSky` rein:

```tsx
import { useRouter } from "next/navigation";
```

```tsx
import { IgnitingSky } from "@/components/onboarding/igniting-sky";
```

Die Zeile `import { SpinnerOverlay } from "@/components/ui/spinner";` ersatzlos löschen.

Unter `POST_LOGIN_MAX_AGE_MS` die Timings ergänzen:

```tsx
/** Sternenhimmel-Übergabe aufs Dashboard: Karte/Fortschritt/Navigation faden
 *  (0–400 ms), Maskottchen löst sich auf und der Himmel zündet Sterne
 *  (400–900 ms), danach wird navigiert. */
const HANDOVER_FADE_MS = 400;
const HANDOVER_TOTAL_MS = 900;
/** Notbremse: greift die Client-Navigation nicht (Onboarding-Gate sieht das
 *  Profil-Flag noch nicht), holt der harte Redirect die Übergabe ein. */
const HANDOVER_FALLBACK_MS = 1500;
```

In der Komponente, neben den bestehenden States:

```tsx
  const router = useRouter();
  // Läuft die Übergabe? Startet mit dem Tap auf „Ich bin bereit", parallel zur
  // Server-Action.
  const [handover, setHandover] = useState(false);
  const handoverStart = useRef<number | null>(null);
```

- [ ] **Step 3: `goNext` startet die Sequenz**

Den `isLast`-Zweig in `goNext` erweitern:

```tsx
  const goNext = () => {
    if (isLast) {
      const formData = new FormData();
      formData.set("reason", reason);
      formData.set("confidenceBaseline", String(confidenceBaseline));
      formData.set("name", name);
      // Die Sequenz startet SOFORT und läuft parallel zur Server-Action —
      // dauert die Action länger, bleibt der gezündete Himmel einfach ruhig
      // stehen. Kein Loop, kein Spinner.
      setHandover(true);
      handoverStart.current = Date.now();
      formAction(formData);
      return;
    }
    setStep(STEPS[stepIndex + 1]);
  };
```

- [ ] **Step 4: Success-Effect ersetzt den Hard-Reload**

Den bestehenden `useEffect` auf `state.success` (heute Zeile 145–155) komplett ersetzen:

```tsx
  const fallbackTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!state.success) return;
    // Reminder am Onboarding-Tag unterdrücken (Sicherheitsnetz).
    try {
      localStorage.setItem("aic_reminder_date", localDateKey());
    } catch {
      // ignore
    }
    // Marker für DashboardReveal: das Dashboard staffelt seine Abschnitte von
    // oben ein, genau wie nach dem Login. 10 s Gültigkeit — reicht.
    try {
      sessionStorage.setItem(POST_LOGIN_KEY, String(Date.now()));
    } catch {
      // ignore
    }

    const elapsed = handoverStart.current ? Date.now() - handoverStart.current : 0;
    const wait = reduced ? 0 : Math.max(0, HANDOVER_TOTAL_MS - elapsed);

    const go = window.setTimeout(() => {
      // Client-Navigation, damit der fixe SkyBackdrop wirklich stehenbleibt.
      router.push("/dashboard");
      fallbackTimer.current = window.setTimeout(() => {
        if (window.location.pathname !== "/dashboard") {
          window.location.href = "/dashboard";
        }
      }, HANDOVER_FALLBACK_MS);
    }, wait);

    return () => {
      window.clearTimeout(go);
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    };
  }, [state.success, reduced, router]);

  // Fehlerfall: die Sequenz zieht sich zurück, die Karte kommt mit FormError
  // zurück — wie bisher.
  useEffect(() => {
    if (state.error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Rücknahme der Übergabe-Sequenz nach Server-Fehler
      setHandover(false);
      handoverStart.current = null;
    }
  }, [state.error]);
```

- [ ] **Step 5: Render — Spinner raus, Fades und Zünd-Sterne rein**

Die Zeile

```tsx
      {(pending || state.success) && <SpinnerOverlay />}
```

samt ihres Kommentar-Blocks löschen und durch die Zünd-Sterne ersetzen:

```tsx
      {/* Sternenhimmel-Übergabe: der Nachthimmel zündet gestaffelt Sterne,
          während Karte und Maskottchen faden. Kein Spinner — die Fläche selbst
          trägt die Wartezeit. */}
      {handover && <IgnitingSky />}
```

Der Mascot-Wrapper (das äußere `div`, NICHT `mascotRef` — auf dem sitzt GSAPs inline-Opacity) bekommt den verzögerten Fade:

```tsx
      {/* Mascot über der Karte (z-50 → über dem Cover während der Intro) */}
      <div
        className={cn(
          "relative z-50 mb-8 flex justify-center transition-opacity duration-500 ease-out",
          handover && "opacity-0",
        )}
        style={handover ? { transitionDelay: `${HANDOVER_FADE_MS}ms` } : undefined}
      >
```

Der Content-Wrapper fadet als Erstes. Weil GSAP hier beim Login→Onboarding-Übergang eine inline-Opacity setzt, muss der Handover ebenfalls inline gesetzt werden — eine Klasse verlöre gegen das inline-Style von GSAP:

```tsx
      <div
        ref={contentRef}
        className="relative z-50 flex flex-col transition-opacity ease-out"
        suppressHydrationWarning
        style={
          showLoginIntro
            ? { opacity: 0 }
            : handover
              ? { opacity: 0, transitionDuration: `${HANDOVER_FADE_MS}ms` }
              : undefined
        }
      >
```

Der Weiter-Button behält seine `pending`-Beschriftung („Wird eingerichtet …"), verschwindet aber mit dem Content-Fade — das ist gewollt.

- [ ] **Step 6: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler. `SpinnerOverlay` darf in `app/onboarding/page.tsx` nicht mehr importiert sein (sonst meckert tsc über den ungenutzten Import nicht — aber der Build-Output soll sauber sein; per `grep -n "SpinnerOverlay" app/onboarding/page.tsx` gegenprüfen, erwartet: kein Treffer).

- [ ] **Step 7: Am Gerät prüfen und committen**

Der Abnahme-Test läuft nur am iPhone gegen den Live-Deploy und braucht einen frischen Account (das Onboarding zeigt sich pro Nutzer einmal):

- „Ich bin bereit" tippen: Karte + Fortschrittsbalken + Buttons faden weg, danach löst sich das Maskottchen auf und im Himmel gehen nacheinander Sterne an.
- **Bleibt der Himmel wirklich stehen?** Kein Weiß-Blitz, kein Neuaufbau des Hintergrunds zwischen Onboarding und Dashboard.
- Auf dem Dashboard staffeln sich die Abschnitte von oben ein (DashboardReveal greift).
- Kein Spinner mehr sichtbar.

```bash
git add components/onboarding/igniting-sky.tsx app/onboarding/page.tsx
git commit -m "feat(onboarding): Sternenhimmel-Uebergabe aufs Dashboard statt Spinner + Hard-Reload

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

## Nicht in diesem Umfang

- **`want-star-twinkle`** auf der Sternenkarte bleibt ruhig — nur das Hub-Ornament funkelt stärker.
- **Kompass-Dämpfung auf /me** bleibt: Der leere Kompass ist dort ein ehrlicher Zustand, kein Bug.
