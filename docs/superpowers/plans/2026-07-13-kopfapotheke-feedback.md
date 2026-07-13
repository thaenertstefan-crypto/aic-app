# Kopfapotheke-Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promise Keeper komplett entfernen, Confidence Boost auf den „Gleich bin ich dran"-Flow fokussieren (Atemübung mit Start-auf-Kreis + Sekunden-Timer, Auftritts-Reframe, Abschluss mit Haken + Mantra, Karten-Intro), und den Nein-Trainer schärfen (Denk-Pause, weniger Vorgaben, ehrlicherer KI-Vorschlag).

**Architecture:** Reine Frontend/Prompt-Änderungen an bestehenden Client-Komponenten und einer Prompt-Datei. Keine DB-Migrationen. Das Confidence-Intro wechselt vom „Worum geht's?"-Textblock zum `RecipeIntro`-Kartenmuster, Tracking bleibt auf `cleanser_intro_seen` (Slug `confidence-boost`).

**Tech Stack:** Next.js 16 App Router, React Client Components, TailwindCSS, Supabase (nur bestehende Reads), Anthropic-Prompt (reiner Text).

**Spec:** `docs/superpowers/specs/2026-07-13-kopfapotheke-feedback-design.md`

## Global Constraints

- Alle nutzersichtbaren Texte auf Deutsch, warm, informelles „du" (AIC-Stimme).
- Keine DB-Migrationen; Tabellen `promises`, `promise_completions`, `cleanser_checkins` etc. bleiben unangetastet.
- Es gibt **keine Unit-Test-Infrastruktur** in diesem Repo. Verifikation pro Task: `npm run lint` und `npx tsc --noEmit`; am Ende einmal `npm run build`.
- Labels nie hardcoden — `PAGE_TITLES` aus `lib/content/labels.ts` nutzen.
- `AGENTS.md` beachten: Next.js 16 — bei Unsicherheit Docs in `node_modules/next/dist/docs/` lesen.
- Commits nach jedem Task, Conventional-Commit-Präfixe (`feat`/`fix`/`refactor`), Body endet mit `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Promise Keeper komplett entfernen

**Files:**
- Delete: `app/(app)/booster/promises/` (kompletter Ordner: `page.tsx`, `actions.ts`, `promises-cleanser.tsx`, `promise-card.tsx`)
- Modify: `app/(app)/booster/page.tsx` (Tile + Import + Shelf-Layout)
- Modify: `app/(app)/booster/vessels.tsx:152-180` (PromiseJar löschen)
- Modify: `next.config.ts:89-93` (Redirect löschen)
- Modify: `app/(app)/dashboard/page.tsx:229-233` (Destination löschen)
- Modify: `app/(app)/settings/page.tsx` (Versprechen-Statistik löschen)

**Interfaces:**
- Consumes: —
- Produces: Booster-Hub mit 5 Tiles; `SHELVES`-Konstante rendert eine 1er-Reihe zentriert. Keine Referenz auf `PromiseJar` oder `/booster/promises` mehr im Repo.

- [ ] **Step 1: Promises-Route löschen**

```bash
git rm -r "app/(app)/booster/promises"
```

- [ ] **Step 2: Hub-Seite anpassen** (`app/(app)/booster/page.tsx`)

Import `PromiseJar` aus dem `./vessels`-Import entfernen (Zeile 10). Das letzte Tile-Objekt aus `TILES` löschen (Zeilen 57–62):

```tsx
  {
    feeling: "Ich will zu mir stehen",
    title: "Promise Keeper",
    art: <PromiseJar />,
    href: "/booster/promises",
  },
```

`SHELVES` (Zeile 85) ersetzen durch:

```tsx
/** Je zwei Gefäße teilen sich ein Regalbrett — das letzte steht allein. */
const SHELVES = [TILES.slice(0, 2), TILES.slice(2, 4), TILES.slice(4)];
```

Die Regal-Reihe (Zeile 125) ersetzen, damit die 1er-Reihe zentriert:

```tsx
              <div
                className={`grid border-b border-border/70 ${
                  shelf.length === 1 ? "grid-cols-1" : "grid-cols-2"
                }`}
              >
```

- [ ] **Step 3: PromiseJar aus vessels.tsx löschen**

In `app/(app)/booster/vessels.tsx` die komplette Funktion `PromiseJar` inklusive JSDoc-Kommentar löschen (Zeilen 152–180, beginnt mit `/** Promise Keeper — kleines Vorratsglas …`).

- [ ] **Step 4: Redirect aus next.config.ts löschen** (Zeilen 89–93)

```ts
      {
        source: "/cleansers/promises",
        destination: "/booster/promises",
        permanent: false,
      },
```

- [ ] **Step 5: Dashboard-Destination löschen** (`app/(app)/dashboard/page.tsx`, Zeilen 229–233)

```tsx
    {
      key: "promises",
      sentence: "Ich will mein Versprechen an mich selbst einlösen",
      href: "/booster/promises",
    },
```

- [ ] **Step 6: Versprechen-Statistik aus Settings löschen** (`app/(app)/settings/page.tsx`)

Entfernen: die Variable `let longestPromiseStreak = 0;` (Zeile 19), das Destrukturierungs-Feld `{ data: promiseRows },` (Zeile 27), die Query `supabase.from("promises").select("longest_streak").eq("user_id", user.id),` (Zeile 38), den `longestPromiseStreak = (promiseRows ?? []).reduce(...)`-Block (Zeilen 54–57) und die Stat-Zeile (Zeile 84):

```tsx
            { label: "Längste Versprechen-Serie", value: longestPromiseStreak },
```

- [ ] **Step 7: Verifizieren — keine Referenzen mehr**

```bash
grep -rn "booster/promises\|PromiseJar\|longestPromiseStreak" app components lib --include="*.ts" --include="*.tsx"
```
Expected: keine Treffer.

```bash
npm run lint && npx tsc --noEmit
```
Expected: beide ohne Fehler. (Hinweis: `lib/utils/cleanser-intros.ts` enthält noch den `promises`-Intro-Eintrag — der ist unbenutzt und harmlos; er verschwindet in Task 3.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(booster): Promise Keeper komplett entfernt (Regal, Route, Redirect, Dashboard, Settings)"
```

---

### Task 2: Confidence-Landing — Showstopper-Sektion entfernen

**Files:**
- Modify: `app/(app)/booster/confidence/confidence-booster.tsx`
- Modify: `app/(app)/booster/confidence/breathing-exercise.tsx` (EXERCISES + ExerciseCard löschen)

**Interfaces:**
- Consumes: —
- Produces: `breathing-exercise.tsx` exportiert nur noch `BreathingExercise({ onDone }: { onDone?: () => void })`. Die Landing rendert Hero + Mantra-Ritual.

- [ ] **Step 1: Showstopper-Sektion aus der Landing löschen**

In `confidence-booster.tsx` die komplette Sektion `{/* Referenz: die 5 Showstopper-Übungen */}` löschen — von `<section className="space-y-3">` bis zu ihrem schließenden `</section>` (enthält die `EXERCISES.map(...)`-Schleife und die manuelle fünfte `ExerciseCard` „Inneren Caveman trainieren" mit `<BreathingExercise />`).

Danach die Imports der Datei anpassen: aus

```tsx
import { BreathingExercise, ExerciseCard, EXERCISES } from "./breathing-exercise";
```

wird — nichts: `BreathingExercise` wird auf der Landing nicht mehr genutzt, die Import-Zeile komplett löschen. Den Datei-Kopfkommentar aktualisieren:

```tsx
// ---------------------------------------------------------------------------
// Confidence-Boost — Landing: oben der Einstieg in den akuten Moment-Flow
// („Gleich bin ich dran"), darunter das tägliche Mantra-Ritual (inkl. Streak,
// ohne Extra-Tap erreichbar).
// ---------------------------------------------------------------------------
```

- [ ] **Step 2: EXERCISES + ExerciseCard aus breathing-exercise.tsx löschen**

In `breathing-exercise.tsx` löschen: den Typ `TextExercise`, die Konstante `EXERCISES` (Zeilen 15–46), die Funktion `ExerciseCard` (Zeilen 48–80) und die dann unbenutzten Imports `ChevronDown` (lucide) und `type ReactNode`. Den Kopfkommentar ersetzen:

```tsx
// ---------------------------------------------------------------------------
// 4-7-8-Atemübung — genutzt vom „Gleich bin ich dran"-Flow (Atem-Schritt).
// ---------------------------------------------------------------------------
```

- [ ] **Step 3: Verifizieren**

```bash
grep -rn "ExerciseCard\|EXERCISES" app components lib --include="*.tsx" --include="*.ts"
```
Expected: keine Treffer.

```bash
npm run lint && npx tsc --noEmit
```
Expected: keine Fehler.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(confidence): Showstopper-Sektion von der Landing entfernt"
```

---

### Task 3: Confidence Boost — durchklickbares Karten-Intro

**Files:**
- Modify: `lib/utils/cleanser-intros.ts` (Struktur: `IntroCard[]` statt Textblock, promises-Eintrag raus)
- Delete: `components/intro/cleanser-intro-info-button.tsx`
- Modify: `app/(app)/booster/confidence/page.tsx` (introSeen laden)
- Modify: `app/(app)/booster/confidence/confidence-booster.tsx` (Hybrid-Intro)

**Interfaces:**
- Consumes: `RecipeIntro({ cards, onComplete, onSkip?, renderMascot? })` aus `components/recipes/recipe-intro.tsx`; `IntroInfoButton({ cards })` aus `components/intro/intro-info-button.tsx`; `getSeenCleanserIntros(): Promise<string[]>` und `markCleanserIntroSeenAction(slug: string)` aus `app/(app)/cleansers/actions.ts`; `Mascot` aus `components/brand/mascot`.
- Produces: `getCleanserIntro(slug: string): IntroCard[] | null` (neue Signatur!); `ConfidenceBooster` bekommt zusätzliche Prop `introSeen: boolean`.

- [ ] **Step 1: cleanser-intros.ts auf Karten umstellen**

Kompletten Dateiinhalt von `lib/utils/cleanser-intros.ts` ersetzen durch:

```ts
import type { IntroCard } from "@/lib/utils/recipe-intros";

/**
 * Intro-Karten für Cleanser — gleiches Karten-Format wie RECIPE_INTROS,
 * damit RecipeIntro/IntroInfoButton sie direkt rendern können. Der
 * "schon gesehen?"-Status läuft weiter über cleanser_intro_seen
 * (siehe app/(app)/cleansers/actions.ts).
 *
 * Aktuell einziger Slug: "confidence-boost" (Merge aus Mantra Cleanser +
 * Showstopper Confidence, lebt unter /booster/confidence).
 */
export const CLEANSER_INTROS: Record<string, IntroCard[]> = {
  "confidence-boost": [
    {
      title: "Kennst du das?",
      body: "Gleich bist du dran — und dein Kopf ruft: „Hoffentlich blamier ich mich nicht.“ Herzklopfen, flache Atmung, die Stimme wird dünn. Das ist kein Charakterfehler, das ist dein Körper im Alarmmodus. Die gute Nachricht: Selbstvertrauen ist keine Eigenschaft, mit der man geboren wird. Es ist eine Fähigkeit — und Fähigkeiten kann man trainieren.",
    },
    {
      title: "„Gleich bin ich dran“ — dein 5-Minuten-Boost",
      body: "Auftritt, Meeting, Prüfung, schwieriges Gespräch? Der geführte Flow macht dich in fünf Minuten bereit: Erst beruhigst du mit der 4-7-8-Atmung deinen Fight-or-Flight-Reflex, dann gibst du dem Adrenalin eine stille Aufgabe, wärmst deine Stimme auf — und nimmst dein Mantra mit rein.",
    },
    {
      title: "Dein tägliches Mantra-Ritual",
      body: "Selbstvertrauen wächst nicht im Ausnahmezustand, sondern nebenbei: einmal am Tag dein Mantra lesen, deine Reframe-Karten durchgehen, abhaken. Mantra und Karten kannst du komplett zu deinen machen — und deine Serie zeigt dir, wie du dranbleibst. Bereit?",
    },
  ],
};

/**
 * Liefert die Intro-Karten für ein Cleanser anhand seines Slugs.
 * Gibt null zurück, wenn für den Slug keine Intro hinterlegt ist.
 */
export function getCleanserIntro(slug: string): IntroCard[] | null {
  return CLEANSER_INTROS[slug] ?? null;
}
```

(Damit ist der `promises`-Eintrag weg; die Slug-Validierung in `markCleanserIntroSeenAction` funktioniert unverändert, weil `getCleanserIntro` weiter truthy/null liefert.)

- [ ] **Step 2: CleanserIntroInfoButton löschen**

```bash
git rm components/intro/cleanser-intro-info-button.tsx
```

- [ ] **Step 3: introSeen in page.tsx laden** (`app/(app)/booster/confidence/page.tsx`)

Import ergänzen:

```ts
import { getSeenCleanserIntros } from "@/app/(app)/cleansers/actions";
```

Das bestehende `Promise.all` um den dritten Read erweitern und die Prop durchreichen:

```ts
  const [checkinsResult, { mantra, cards }, seenIntros] = await Promise.all([
    user
      ? supabase
          .from("cleanser_checkins")
          .select("date")
          .eq("user_id", user.id)
          .eq("cleanser_slug", "mantra")
          .order("date", { ascending: false })
          .limit(90)
      : Promise.resolve({ data: null }),
    // Mantra + Karten (mit Default-Fallback) zentral über die Action laden.
    getMantraData(),
    getSeenCleanserIntros(),
  ]);
```

und im Return:

```tsx
  return (
    <ConfidenceBooster
      doneToday={doneToday}
      streak={streak}
      mantra={mantra}
      cards={cards}
      introSeen={seenIntros.includes("confidence-boost")}
    />
  );
```

- [ ] **Step 4: Hybrid-Intro in ConfidenceBooster** (`confidence-booster.tsx`)

Imports ergänzen/ersetzen (der `CleanserIntroInfoButton`-Import fällt weg):

```tsx
import { useState } from "react";
import { RecipeIntro } from "@/components/recipes/recipe-intro";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { Mascot } from "@/components/brand/mascot";
import { markCleanserIntroSeenAction } from "@/app/(app)/cleansers/actions";
import { getCleanserIntro } from "@/lib/utils/cleanser-intros";
```

Über der Komponente:

```tsx
const INTRO_CARDS = getCleanserIntro("confidence-boost") ?? [];

/** Mascot-Ausdruck je Intro-Karte: neugierig ankommen, strahlend rausgehen. */
const INTRO_EXPRESSIONS = ["smile", "curious", "radiant"] as const;
```

Signatur + Intro-Logik (Muster: SayingNoWizard-Hybrid-Intro):

```tsx
export function ConfidenceBooster({
  doneToday,
  streak,
  mantra,
  cards,
  introSeen,
}: {
  doneToday: boolean;
  streak: number;
  mantra: string;
  cards: MantraCardData[];
  introSeen: boolean;
}) {
  const [introDismissed, setIntroDismissed] = useState(false);

  function handleIntroSeen() {
    setIntroDismissed(true);
    // Fire-and-forget: Gesehen-Status still persistieren.
    void markCleanserIntroSeenAction("confidence-boost");
  }

  if (!introSeen && !introDismissed) {
    return (
      <div className="flex min-h-svh flex-col">
        <SubPageHeader backHref="/booster" title={PAGE_TITLES.confidence} />
        <div className="flex flex-1 flex-col justify-center">
          <RecipeIntro
            cards={INTRO_CARDS}
            onComplete={handleIntroSeen}
            onSkip={handleIntroSeen}
            renderMascot={(index) => (
              <Mascot
                expression={INTRO_EXPRESSIONS[index] ?? "smile"}
                size="md"
              />
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader
        backHref="/booster"
        title={PAGE_TITLES.confidence}
        action={
          INTRO_CARDS.length > 0 ? (
            <IntroInfoButton cards={INTRO_CARDS} />
          ) : undefined
        }
      />
      {/* … Rest der Landing unverändert (Hero + Mantra-Ritual) … */}
```

Hinweis für den Implementierer: Sollte `Mascot` den Ausdruck `radiant` nicht kennen (Typfehler bei `npx tsc --noEmit`), in `components/brand/mascot.tsx` die erlaubten `MascotExpression`-Werte nachschlagen und einen vorhandenen positiven Ausdruck (z. B. `happy`) verwenden — `radiant` wird bereits im Moment-Flow-Abschluss benutzt, sollte also existieren.

- [ ] **Step 5: Verifizieren**

```bash
grep -rn "CleanserIntroInfoButton" app components lib --include="*.tsx"
```
Expected: keine Treffer.

```bash
npm run lint && npx tsc --noEmit
```
Expected: keine Fehler.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(confidence): eigenes Karten-Intro (RecipeIntro-Muster) statt Worum-geht's-Block"
```

---

### Task 4: Atemübung — Start auf dem Kreis + Sekunden-Countdown + Fight-or-Flight-Text

**Files:**
- Modify: `app/(app)/booster/confidence/breathing-exercise.tsx` (nach Task 2 enthält die Datei nur noch die Atemübung)
- Modify: `app/(app)/booster/confidence/moment/moment-flow.tsx:84-103` (Schritt-1-Text)

**Interfaces:**
- Consumes: CSS-Keyframes `breathe478` (bestehend, `globals.css`).
- Produces: `BreathingExercise({ onDone }: { onDone?: () => void })` — Signatur unverändert; der Kreis ist jetzt selbst der Start-Button.

- [ ] **Step 1: BreathingExercise umbauen**

Den Komponenten-Teil von `breathing-exercise.tsx` (ab `type Phase = …`) ersetzen durch:

```tsx
type Phase = "einatmen" | "halten" | "ausatmen";

const PHASE_LABEL: Record<Phase, string> = {
  einatmen: "Einatmen",
  halten: "Halten",
  ausatmen: "Ausatmen",
};

/** Phasendauern in Sekunden — die 4-7-8-Atmung. */
const PHASE_SECONDS: Record<Phase, number> = {
  einatmen: 4,
  halten: 7,
  ausatmen: 8,
};

const TOTAL_CYCLES = 4;

export function BreathingExercise({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState<Phase>("einatmen");
  const [secondsLeft, setSecondsLeft] = useState(PHASE_SECONDS.einatmen);
  const [cycle, setCycle] = useState(0);
  const [runId, setRunId] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }

  function switchPhase(next: Phase) {
    setPhase(next);
    setSecondsLeft(PHASE_SECONDS[next]);
  }

  function scheduleCyclePhases() {
    switchPhase("einatmen");
    timeoutsRef.current.push(setTimeout(() => switchPhase("halten"), 4000));
    timeoutsRef.current.push(setTimeout(() => switchPhase("ausatmen"), 11000));
  }

  function start() {
    clearTimers();
    setDone(false);
    setRunning(true);
    setCycle(1);
    setRunId((id) => id + 1);
    scheduleCyclePhases();

    // Sichtbarer Sekunden-Countdown. Die Phasen-Timeouts setzen ihn bei jedem
    // Wechsel hart zurück, damit sich über 4 Runden kein Drift aufsummiert;
    // Math.max verhindert eine 0 im letzten Tick vor dem Wechsel.
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(1, s - 1));
    }, 1000);

    let current = 1;
    intervalRef.current = setInterval(() => {
      current += 1;
      if (current > TOTAL_CYCLES) return;
      setCycle(current);
      scheduleCyclePhases();
    }, 19000);
  }

  function handleAnimationEnd() {
    clearTimers();
    setRunning(false);
    setDone(true);
    onDone?.();
  }

  // Clean up any running timers when the component unmounts.
  useEffect(() => () => clearTimers(), []);

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="flex h-48 w-48 items-center justify-center">
        {/* Der Kreis IST der Start-Button (Muster: CountdownCircle im
            Overthinking-Wizard) — kein separater Button darunter. */}
        <button
          key={runId}
          type="button"
          onClick={start}
          disabled={running}
          aria-label={done ? "Atemübung nochmal starten" : "Atemübung starten"}
          onAnimationEnd={running ? handleAnimationEnd : undefined}
          style={
            running
              ? {
                  animationName: "breathe478",
                  animationDuration: "19s",
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: TOTAL_CYCLES,
                }
              : undefined
          }
          className="flex size-40 items-center justify-center rounded-full bg-cleanser-confidence/20 text-center text-cleanser-confidence outline-none transition-transform focus-visible:ring-2 focus-visible:ring-cleanser-confidence/40 focus-visible:ring-offset-2 enabled:cursor-pointer enabled:hover:scale-[1.02] enabled:active:scale-[0.98]"
        >
          {running ? (
            <span className="flex flex-col items-center gap-0.5">
              <span className="font-heading text-lg font-medium">
                {PHASE_LABEL[phase]}
              </span>
              <span className="font-heading text-3xl font-semibold tabular-nums">
                {secondsLeft}
              </span>
            </span>
          ) : (
            <span className="font-heading text-lg font-medium">
              {done ? "Nochmal?" : "Start"}
            </span>
          )}
        </button>
      </div>

      <p className="h-5 text-sm text-muted-foreground">
        {running ? `Runde ${cycle} von ${TOTAL_CYCLES}` : ""}
      </p>

      {done ? (
        <p className="text-center text-base text-foreground">
          Vier Runden geschafft. Spürst du den Unterschied? Dein Nervensystem
          ist jetzt ein Stück ruhiger.
        </p>
      ) : (
        <p className="text-center text-base text-muted-foreground">
          Tippe auf den Kreis: 4 Sekunden einatmen, 7 Sekunden halten,
          8 Sekunden ausatmen — vier Runden lang.
        </p>
      )}
    </div>
  );
}
```

Der `Button`-Import aus `@/components/ui/button` wird dadurch unbenutzt — entfernen.

- [ ] **Step 2: Schritt-1-Text im Moment-Flow** (`moment-flow.tsx`, Zeilen 84–87)

```tsx
            <p className="text-base leading-relaxed text-muted-foreground">
              Dein Körper schaltet auf Alarm — lass uns deinen
              Fight-or-Flight-Reflex beruhigen. Vier Runden 4-7-8-Atmung,
              folge einfach dem Kreis.
            </p>
```

- [ ] **Step 3: Verifizieren**

```bash
grep -rn "Höhlenmensch" app components lib --include="*.tsx" --include="*.ts"
```
Expected: keine Treffer.

```bash
npm run lint && npx tsc --noEmit
```
Expected: keine Fehler.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(confidence): Atemkreis als Start-Button + Sekunden-Countdown, Fight-or-Flight-Text"
```

---

### Task 5: Moment-Flow Schritt 4 — Auftritts-Reframe

**Files:**
- Modify: `app/(app)/booster/confidence/moment/moment-flow.tsx:233-248`

**Interfaces:**
- Consumes: `SectionLabel`, `Card`/`CardContent` (bereits importiert).
- Produces: statische Reframe-Karte zwischen Mantra- und Recht-Karte.

- [ ] **Step 1: Reframe-Karte einfügen**

In `moment-flow.tsx` direkt nach der schließenden Mantra-`</Card>` (Zeile 233) und vor dem `{right && (`-Block einfügen:

```tsx
          {/* Kuratierter Auftritts-Reframe — die häufigste Angst vor einem
              Auftritt, einmal liebevoll umgedreht (Stil der Reframe-Karten). */}
          <Card className="w-full">
            <CardContent className="space-y-3 pt-(--card-spacing)">
              <SectionLabel>Falls da so ein Gedanke ist …</SectionLabel>
              <p className="text-base leading-relaxed italic text-muted-foreground">
                „Was, wenn ich gleich was sage, was dem anderen nicht gefällt —
                oder ich mich blamiere?“
              </p>
              <p className="text-base leading-relaxed text-foreground">
                Meine Ideen und Worte haben einen Platz verdient. Ich darf sie
                aussprechen. Mehr als echt sein kann ich nicht. Wenn das
                jemandem nicht gefällt, ist das nicht mein Problem — ich bin
                nicht für jeden.
              </p>
            </CardContent>
          </Card>
```

- [ ] **Step 2: Verifizieren**

```bash
npm run lint && npx tsc --noEmit
```
Expected: keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(confidence): Auftritts-Reframe zwischen Mantra und Recht in Schritt 4"
```

---

### Task 6: Moment-Flow Abschluss — grüner Haken + Mantra-Wiederholung

**Files:**
- Modify: `app/(app)/booster/confidence/moment/moment-flow.tsx:259-284`

**Interfaces:**
- Consumes: `CompletionCelebration` aus `@/components/ui/completion-celebration` (Prop: `className?`).
- Produces: Abschluss-Screen mit Haken statt Mascot; `Mascot`-Import fällt aus der Datei.

- [ ] **Step 1: Abschluss-Screen ersetzen** (ab dem Kommentar `// ── Abschluss: Los geht's ─…`, Zeilen 259–284)

```tsx
  // ── Abschluss: Los geht's ───────────────────────────────────────
  // Grüner Haken wie auf den anderen Abschluss-Screens; das Mantra kommt
  // noch einmal groß — als Letztes, was man liest, bevor man rausgeht.

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CompletionCelebration />
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Los geht&apos;s — du bist bereit.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Langsam sprechen, Sätze beenden — und dein Mantra hast du dabei:
          </p>
        </div>
        <Card className="w-full border-primary/30">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <SectionLabel>Dein Mantra</SectionLabel>
            <p className="font-heading text-2xl leading-tight font-medium tracking-tight text-foreground">
              {mantra}
            </p>
          </CardContent>
        </Card>
        <Button
          size="lg"
          className="w-full"
          render={<Link href="/booster/confidence" />}
        >
          Fertig
        </Button>
      </div>
    </div>
  );
```

Imports anpassen: `CompletionCelebration` importieren, `Mascot`-Import entfernen (er wird in `moment-flow.tsx` nur hier genutzt):

```tsx
import { CompletionCelebration } from "@/components/ui/completion-celebration";
```

- [ ] **Step 2: Verifizieren**

```bash
npm run lint && npx tsc --noEmit
```
Expected: keine Fehler (lint meldet insbesondere keinen unbenutzten `Mascot`-Import).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(confidence): Abschluss mit gruenem Haken + Mantra-Wiederholung"
```

---

### Task 7: Nein-Trainer — UI-Feinschliff

**Files:**
- Modify: `lib/utils/recipe-intros.ts:82-99` (neue Intro-Karte)
- Modify: `app/(app)/booster/saying-no/saying-no-wizard.tsx` (Hinweis, Collapsible, Placeholder, Warte-Animation, Label)

**Interfaces:**
- Consumes: bestehende Wizard-States (`mode`, `scenarioLoading`, `blueprintOpen`).
- Produces: keine API-Änderungen — reine UI/Content-Änderungen.

- [ ] **Step 1: Denk-Pause-Intro-Karte einfügen** (`lib/utils/recipe-intros.ts`)

Im `"saying-no"`-Array nach der Karte `„Wenn es kein „Hell yes!“ ist, ist es ein Nein."` (endet Zeile 90) und vor `„Die vier Schichten eines guten Neins"` einfügen:

```ts
    {
      title: "Du musst nicht sofort antworten.",
      body: "Die Frage kommt, dein Bauch zieht sich zusammen — und trotzdem spürst du den Druck, sofort Ja zu sagen? Dann verschaff dir Luft: „Da muss ich kurz drüber nachdenken — ich sag dir Bescheid.“ Das ist kein Vertrösten, das ist Selbstrespekt. Du entkommst dem inneren Konflikt, entscheidest in Ruhe — und wenn es ein Nein wird, hilft dir dieses Rezept, es zu formulieren.",
    },
```

- [ ] **Step 2: Denk-Pause-Hinweis auf dem Situation-Screen** (`saying-no-wizard.tsx`, Phase `situation`, nach dem Mascot-Block, vor dem `<form>` — aktuell Zeilen 1023–1025)

```tsx
          {/* Denk-Pause: die Zeit-gewinnen-Strategie auch für Wiederkehrer
              sichtbar, nicht nur im Intro. */}
          <Card className="w-full bg-muted/30">
            <CardContent className="pt-(--card-spacing)">
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">
                  Noch nicht geantwortet?
                </span>{" "}
                Du darfst dir Zeit nehmen: „Da muss ich kurz drüber
                nachdenken.“ Entscheide in Ruhe — und formuliere dein Nein
                erst, wenn du sicher bist.
              </p>
            </CardContent>
          </Card>
```

- [ ] **Step 3: Collapsible vom Draft-Screen entfernen** (Zeilen 927–965)

Die komplette Karte `{/* Einklappbare 4-Schichten-Referenz */}` löschen (von `<Card className="w-full">` bis zum zugehörigen schließenden `</Card>`). Außerdem den State `const [blueprintOpen, setBlueprintOpen] = useState(false);` (Zeile 101) löschen. Danach `npm run lint` laufen lassen und die dadurch unbenutzt gewordenen Imports entfernen (voraussichtlich `ShieldOff`, ggf. `ChevronDown` und `cn` — nur entfernen, was lint tatsächlich als unbenutzt meldet, `SAYING_NO_LAYERS` wird von der Feedback-Checklist weiter gebraucht).

- [ ] **Step 4: Placeholder nur noch im echten Modus** (Zeile 981)

```tsx
                placeholder={
                  mode === "real"
                    ? "Zum Beispiel: Danke, dass du an mich denkst — das freut mich wirklich. Leider passt es diesmal nicht bei mir."
                    : undefined
                }
```

(Im Übungsmodus bleibt die Box bewusst leer — kein Beispiel, voller Lerneffekt.)

- [ ] **Step 5: Warte-Animation im Übungsmodus** (Phase `scenario`)

Das Kopf-Mascot der Phase (Zeile 844) an den Ladezustand koppeln:

```tsx
            <Mascot expression={scenarioLoading ? "curious" : "smile"} size="md" />
```

Den Skeleton-Block (Zeilen 856–861) ersetzen durch:

```tsx
              {scenarioLoading ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <p className="text-base text-muted-foreground motion-safe:animate-pulse">
                    Ich denk mir gerade eine Situation für dich aus …
                  </p>
                  <span className="flex gap-1.5" aria-hidden="true">
                    <span className="size-2 rounded-full bg-primary/60 motion-safe:animate-bounce" />
                    <span className="size-2 rounded-full bg-primary/60 motion-safe:animate-bounce [animation-delay:150ms]" />
                    <span className="size-2 rounded-full bg-primary/60 motion-safe:animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              ) : (
```

(Der `else`-Zweig mit dem Situations-Text bleibt unverändert. Falls `Skeleton` danach nirgends mehr in der Datei genutzt wird — die Analyzing-Phase nutzt es ebenfalls, also vermutlich doch —, den Import nur entfernen, wenn lint ihn meldet.)

- [ ] **Step 6: Abschluss-Label ändern** (Zeile 673)

```tsx
                  <SectionLabel>Kleiner Reminder — in deiner Bill of Rights steht:</SectionLabel>
```

- [ ] **Step 7: Verifizieren**

```bash
npm run lint && npx tsc --noEmit
```
Expected: keine Fehler.

```bash
grep -n "blueprintOpen\|Du hast dir dieses Recht" "app/(app)/booster/saying-no/saying-no-wizard.tsx"
```
Expected: keine Treffer.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(saying-no): Denk-Pause-Strategie, weniger Vorgaben im Uebungsmodus, neue Warte-Animation"
```

---

### Task 8: KI-Prompt — keine erfundenen Begründungen

**Files:**
- Modify: `lib/anthropic/prompts/saying-no-coach.ts:19`

**Interfaces:**
- Consumes: —
- Produces: geänderter `SYSTEM_PROMPT`-Text (kein Format-/Schema-Change — Parser bleibt kompatibel).

- [ ] **Step 1: Regel in Aufgabe 3 (improved) ergänzen**

Zeile 19 (beginnt mit `3. improved: …`) ersetzen durch:

```
3. improved: Schreibe eine verbesserte Version des Neins, die alle vier Schichten einhält — nah an der Stimme und den Worten der Person, nicht förmlicher als ihr Entwurf, passend zur Situation (gesprochene Antwort oder Nachricht). Wenn der Entwurf schon alle Schichten erfüllt, gib ihn leicht poliert oder unverändert zurück. WICHTIG: Erfinde NIEMALS Fakten, Termine oder Begründungen, die nicht im Entwurf oder in der Situation stehen. Enthält der Entwurf keine Begründung, bekommt auch deine Version keine — ein kurzes Nein ohne Begründung ist vollwertig und stark. Enthält der Entwurf eine echte Begründung, darf sie (gern gestrafft) bleiben — sie zeigt, dass die Person ihre Bedürfnisse ernst nimmt.
```

- [ ] **Step 2: Verifizieren**

```bash
npm run lint && npx tsc --noEmit
```
Expected: keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix(saying-no): KI darf keine Begruendungen erfinden — kurzes Nein bleibt kurz"
```

---

### Task 9: Gesamt-Verifikation

**Files:** keine neuen Änderungen (nur Fixes, falls etwas auffällt)

- [ ] **Step 1: Production-Build**

```bash
npm run build
```
Expected: Build erfolgreich, keine Type-Errors. `/booster/promises` taucht nicht mehr in der Routenliste auf.

- [ ] **Step 2: Browser-Verifikation (Muster: Memory „Browser verification recipe")**

Dev-Server starten (`npm run dev`, falls nicht schon einer läuft — bei stalem CSS: Server neu starten + `.next` löschen) und mit playwright-core + msedge und einem Wegwerf-Account (`onboarding_completed` via Supabase MCP setzen) durchklicken. `innerText` statt `textContent` verwenden; Button-Links haben `role="button"`. Prüfen:

1. `/booster`: 5 Gefäße, kein Promise Keeper, letzte Reihe einzeln zentriert.
2. `/booster/confidence` (frischer Account): Karten-Intro erscheint, 3 Karten durchklickbar, „Überspringen" funktioniert; nach Reload kein Auto-Intro mehr, Info-Button öffnet es.
3. Landing: nur Hero + Mantra-Ritual, keine Showstopper-Sektion.
4. Moment-Flow Schritt 1: Fight-or-Flight-Text, Tap auf den Kreis startet, Phasen-Label + Sekunden zählen (4→1, 7→1, 8→1), „Runde x von 4".
5. Schritt 4: Mantra-Karte → Auftritts-Reframe-Karte → Recht-Karte.
6. Abschluss: grüner Haken, Mantra wird wiederholt, „Fertig" führt zur Landing.
7. `/booster/saying-no`: Intro enthält die Denk-Pause-Karte; „Echte Situation" zeigt den Hinweis-Kasten; Draft-Screen ohne Collapsible; Übungsmodus: Warte-Animation beim Szenario-Laden, leere Textarea ohne Placeholder; Abschluss (mit bestehendem Recht) zeigt „Kleiner Reminder — in deiner Bill of Rights steht:".
8. Stichprobe KI: Übungsmodus, als Nein nur „Nein danke." eingeben → verbesserte Version enthält keine erfundene Begründung.

- [ ] **Step 3: Falls Fixes nötig waren: committen**

```bash
git add -A
git commit -m "fix(booster): Feinschliff aus der Browser-Verifikation"
```
