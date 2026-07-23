# Bill of Rights → Nachthimmel „Der gesteuerte Kurs" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/me/bill-of-rights` into the „Dein Nachthimmel" imagery with a unique navigation-line scene, convert the judge mascot into a navigator, and fix the off-metaphor generate icon + the missing delete guardrail.

**Architecture:** Reuse the shared `SkyBackdrop` (neutral, no score) as the night-sky base and layer one new `CourseLine` SVG on top — the only element unique to Bill of Rights. A thin `BillOfRightsSky` wrapper composes both and is rendered `fixed inset-0 -z-10` from the client component. The charter/GlassPanel and all copy stay unchanged. Three small in-component fixes ride along.

**Tech Stack:** Next.js 16 App Router, React client components, TailwindCSS v4 (`app/globals.css`), lucide-react icons, SVG scene painting (no `backdrop-filter`).

## Global Constraints

- All user-facing copy stays **wortgleich** — no text changes anywhere in this feature.
- Gold (`--primary`) stays the **only** action color (One-Candle-Rule). The scene's module color is **Sage (`--success`)** and appears **only** as `--scene-glow` ornament on the course waypoints.
- Scene is **rein gemalt** (painted gradients + SVG). No new `backdrop-filter` (Glass-Is-Rare; the one GlassPanel charter remains the only glass moment).
- Every animation needs a `@media (prefers-reduced-motion: reduce)` fallback that keeps content **visible and static** (no class-gated reveal that could ship blank).
- No `overflow-hidden`/clip ancestor may be added above the sticky `SubPageHeader` (backdrop is `fixed -z-10`, clips nothing).
- Full-bleed height uses `lvh`, never `svh`/`dvh` (standalone-PWA rule).
- German comments use proper typography quotes `„…"` (U+201E / U+201C).
- Verification per task (no unit-test framework in this repo): `npx tsc --noEmit`, `npm run lint`, `npm run gate` (contrast + typography + motion). Full `npm run build` runs once in the final task. Visual gate = Stefan on iPhone against the live deploy — not part of these steps.
- Spec: `docs/superpowers/specs/2026-07-23-bill-of-rights-nachthimmel-kurs-design.md`.

---

## File Structure

| File | Responsibility |
|---|---|
| `app/(app)/me/bill-of-rights/course-line.tsx` | **new** — the „gesteuerter Kurs" motif: one dotted SVG path + sage-glow waypoints |
| `app/(app)/me/bill-of-rights/bill-of-rights-sky.tsx` | **new** — composes `SkyBackdrop` + `CourseLine` into one `fixed -z-10` scene |
| `app/globals.css` | add `@keyframes course-waypoint` + `.course-waypoint` utility (+ reduced-motion) |
| `components/brand/mascot-navigator.tsx` | **renamed** from `mascot-judge.tsx`; wig removed, gavel → sextant, export renamed |
| `app/(app)/me/bill-of-rights/bill-of-rights-me.tsx` | render scene; icon `Sparkles`→`Waypoints`; tile differentiation; two-tap delete; mascot import |

---

### Task 1: `CourseLine` scene motif + waypoint glow utility

**Files:**
- Create: `app/(app)/me/bill-of-rights/course-line.tsx`
- Modify: `app/globals.css` (add keyframe + utility near the other sky utilities)

**Interfaces:**
- Consumes: nothing.
- Produces: `export function CourseLine(): JSX.Element` — a self-contained `<svg>` (`absolute inset-0 size-full`, `aria-hidden`) that sets `--scene-glow: var(--success)` locally; renders one dotted `<path>` and five `.course-waypoint` `<circle>`s.

- [ ] **Step 1: Add the waypoint glow keyframe + utility to `app/globals.css`**

Insert directly after the `.sky-light-twinkle { … }` rule (the block ending near the `sky-light` definitions, ~line 472):

```css
  /* Bill of Rights „Der gesteuerte Kurs": Wegpunkte glimmen langsam in der
     Szenen-Lichtfarbe (--scene-glow = Sage). Linie selbst ist statisch. */
  @keyframes course-waypoint {
    0%, 100% {
      opacity: 0.45;
      filter: drop-shadow(0 0 2px color-mix(in srgb, var(--scene-glow, var(--primary)) 40%, transparent));
    }
    50% {
      opacity: 0.85;
      filter: drop-shadow(0 0 6px color-mix(in srgb, var(--scene-glow, var(--primary)) 70%, transparent));
    }
  }
  .course-waypoint {
    animation: course-waypoint 7s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .course-waypoint { animation: none; opacity: 0.6; }
  }
```

- [ ] **Step 2: Create `app/(app)/me/bill-of-rights/course-line.tsx`**

```tsx
import type { CSSProperties } from "react";

/**
 * „Der gesteuerte Kurs" — das einzige einzigartige Bill-of-Rights-Szenenelement.
 * Eine feine gepunktete Kurslinie mit Wegpunkten, rein atmosphärisch über dem
 * geteilten SkyBackdrop. Bewusst KEIN Kompass (= Werte) und KEINE
 * Sterne-als-Hauptsache (= Wants): die „Linien, nach denen du steuerst".
 *
 * Modulfarbe der Bill of Rights ist Sage (DESIGN.md) und lebt ausschließlich im
 * Szenen-Ornament — die Wegpunkte tragen einen Sage-Glow über --scene-glow. Die
 * Linie bleibt gedämpftes Foreground. Gold bleibt unangetastet (Aktionsfarbe).
 *
 * Rein gemalt (SVG), kein backdrop-filter. Linie + Wegpunkte sind immer sichtbar
 * (statischer Default, kein class-getriggertes Reveal); nur der Wegpunkt-Glow
 * pulst langsam. Reduced motion: komplett statisch, weiterhin sichtbar.
 */

const WAYPOINTS: { x: number; y: number; delay: number }[] = [
  { x: 352, y: 150, delay: 0 },
  { x: 300, y: 300, delay: 1.8 },
  { x: 190, y: 440, delay: 3.4 },
  { x: 108, y: 560, delay: 2.4 },
  { x: 48, y: 720, delay: 4.6 },
];

export function CourseLine() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 800"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
      style={{ "--scene-glow": "var(--success)" } as CSSProperties}
    >
      {/* Gepunktete Kurslinie: tritt oben rechts ein, schwingt nach unten/links
          hinaus. Gedämpftes Foreground, damit sie „gechartert" liest. */}
      <path
        d="M356 40 C 392 210, 320 330, 236 424 C 170 498, 96 606, 40 784"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="0.5 11"
        opacity={0.3}
      />
      {/* Wegpunkte — hier lebt die Modulfarbe (Sage-Glow über --scene-glow). */}
      {WAYPOINTS.map((w, i) => (
        <circle
          key={i}
          cx={w.x}
          cy={w.y}
          r={2.6}
          fill="var(--foreground)"
          className="course-waypoint"
          style={{ animationDelay: `${w.delay}s` }}
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 3: Type-check, lint, and run the gates**

Run: `npx tsc --noEmit && npm run lint && npm run gate`
Expected: all pass (no type errors; motion gate accepts `.course-waypoint` because it has a reduced-motion fallback).

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/me/bill-of-rights/course-line.tsx" app/globals.css
git commit -m "feat(bill-of-rights): CourseLine-Szenenmotiv + Wegpunkt-Glow-Utility

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `BillOfRightsSky` wrapper + render it on the page

**Files:**
- Create: `app/(app)/me/bill-of-rights/bill-of-rights-sky.tsx`
- Modify: `app/(app)/me/bill-of-rights/bill-of-rights-me.tsx` (add import + render call)

**Interfaces:**
- Consumes: `CourseLine` (Task 1); `SkyBackdrop` from `@/components/backdrops/sky-backdrop`.
- Produces: `export function BillOfRightsSky(): JSX.Element` — renders the shared neutral sky plus the course line, both `fixed inset-0 -z-10`, purely decorative.

- [ ] **Step 1: Create `app/(app)/me/bill-of-rights/bill-of-rights-sky.tsx`**

```tsx
import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";

import { CourseLine } from "./course-line";

/**
 * Szene der Bill of Rights: der geteilte, neutrale Nachthimmel (SkyBackdrop,
 * ohne score) plus „Der gesteuerte Kurs" (CourseLine) darüber. Beide Ebenen sind
 * fix, -z-10 und dekorativ; die Szene wird von der Client-Komponente gerendert
 * und unmountet bei Navigation weg (gleiche Konvention wie SkyBackdrop auf
 * Dashboard/Wants).
 */
export function BillOfRightsSky() {
  return (
    <>
      <SkyBackdrop />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <CourseLine />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Render the scene in `bill-of-rights-me.tsx`**

Add the import alongside the other local imports (near the `SubPageHeader` / `RecipeIntroGate` imports at the top of the file):

```tsx
import { BillOfRightsSky } from "./bill-of-rights-sky";
```

Then render it as the **first child** of the root wrapper. Change the opening of the returned JSX from:

```tsx
  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader
```

to:

```tsx
  return (
    <div className="flex min-h-svh flex-col">
      <BillOfRightsSky />
      <SubPageHeader
```

(Position in the tree does not affect layout — the scene is `fixed -z-10` — but rendering it inside the component ensures it unmounts on navigation away.)

- [ ] **Step 3: Type-check, lint, and run the gates**

Run: `npx tsc --noEmit && npm run lint && npm run gate`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/me/bill-of-rights/bill-of-rights-sky.tsx" "app/(app)/me/bill-of-rights/bill-of-rights-me.tsx"
git commit -m "feat(bill-of-rights): Nachthimmel-Szene (SkyBackdrop + Kurslinie) rendern

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Mascot judge → navigator (sextant, no costume)

**Files:**
- Create: `components/brand/mascot-navigator.tsx` (renamed content of `mascot-judge.tsx`)
- Delete: `components/brand/mascot-judge.tsx`
- Modify: `app/(app)/me/bill-of-rights/bill-of-rights-me.tsx` (import + usage)

**Interfaces:**
- Consumes: `Mascot` from `@/components/brand/mascot`; `cn` from `@/lib/utils`.
- Produces: `export function MascotNavigator({ className }: { className?: string }): JSX.Element`.

- [ ] **Step 1: Create `components/brand/mascot-navigator.tsx`**

```tsx
import { Mascot } from "@/components/brand/mascot";
import { cn } from "@/lib/utils";

/** Sextant als Requisite — eigenes kleines SVG im 0 0 40 40-Raum. Lehnt unten
 *  rechts am Blob an (Rotation am Wrapper), liegt außerhalb des Blobs und wird
 *  daher nicht beschnitten. Gedämpfte Messing-/Holztöne, kein Gold (bleibt
 *  Aktionsfarbe). Ein Bogenrahmen mit Gradbogen, Indexarm und Fernrohr am Apex —
 *  das Instrument, mit dem man den Weg nach den Sternen findet. */
const NavigatorSextant = (
  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
    {/* Rahmen: Apex oben, zwei Schenkel zum Bogensegment unten */}
    <path
      d="M20 7 L8.5 30.5 A 15 15 0 0 0 31.5 30.5 Z"
      fill="none"
      stroke="#a8843f"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    {/* Gradbogen-Innenkante (dünn, dunkler) */}
    <path
      d="M11.5 29 A 11 11 0 0 0 28.5 29"
      fill="none"
      stroke="rgba(74,46,22,0.55)"
      strokeWidth="1"
    />
    {/* Indexarm vom Apex zum Bogen */}
    <line
      x1="20"
      y1="8.5"
      x2="26"
      y2="30"
      stroke="#6f4a28"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Fernrohr am Apex */}
    <rect
      x="19"
      y="6"
      width="12"
      height="3.4"
      rx="1.7"
      transform="rotate(-12 19 6)"
      fill="#6f4a28"
    />
  </svg>
);

/**
 * Maskottchen als Navigator: der Blob mit würdevollem, leicht gesenktem Blick und
 * einem kleinen Sextanten, der unten rechts anlehnt (findet den Weg nach den
 * Sternen — die Metapher der Bill of Rights). Kein Kostüm, kein Kopfstück:
 * „Begleiter statt Richter". Nur für /me/bill-of-rights gedacht.
 */
export function MascotNavigator({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative mx-auto", className)}
      style={{ width: 120, height: 112 }}
      aria-hidden="true"
    >
      {/* Maskottchen, würdevoller Blick leicht nach unten */}
      <Mascot
        size="md"
        expression="smile"
        gazeX={0}
        gazeY={1}
        className="absolute left-1/2 top-0 -translate-x-1/2"
      />

      {/* Sextant, schräg unten rechts angelehnt */}
      <div className="absolute bottom-0 right-0 rotate-[-30deg]">
        {NavigatorSextant}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete the old file**

```bash
git rm "components/brand/mascot-judge.tsx"
```

- [ ] **Step 3: Update the import + usage in `bill-of-rights-me.tsx`**

Change the import:

```tsx
import { MascotJudge } from "@/components/brand/mascot-judge";
```

to:

```tsx
import { MascotNavigator } from "@/components/brand/mascot-navigator";
```

And change the usage (inside the `{introDone && ( … )}` block):

```tsx
          <MascotJudge />
```

to:

```tsx
          <MascotNavigator />
```

- [ ] **Step 4: Confirm no other references to the old name remain**

Run: `git grep -n "MascotJudge\|mascot-judge"`
Expected: no output (empty). If anything prints, update those references to `MascotNavigator` / `mascot-navigator`.

- [ ] **Step 5: Type-check, lint, and run the gates**

Run: `npx tsc --noEmit && npm run lint && npm run gate`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add "components/brand/mascot-navigator.tsx" "app/(app)/me/bill-of-rights/bill-of-rights-me.tsx"
git commit -m "feat(bill-of-rights): Maskottchen Richter -> Navigator (Sextant, kein Kostuem)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Fix the generate icon + differentiate the two action tiles

**Files:**
- Modify: `app/(app)/me/bill-of-rights/bill-of-rights-me.tsx` (`lucide-react` import, `ActionTile`, `ActionTiles`)

**Interfaces:**
- Consumes: `cn` from `@/lib/utils` (already imported); lucide `PenLine`, `Waypoints`.
- Produces: `ActionTile` gains a `tone?: "lead" | "quiet"` prop; `ActionTiles` renders the generate path as `lead` and the manual path as `quiet`.

- [ ] **Step 1: Swap the icon import**

Change:

```tsx
import { Pencil, PenLine, Sparkles } from "lucide-react";
```

to:

```tsx
import { Pencil, PenLine, Waypoints } from "lucide-react";
```

(`Sparkles` — a star glyph — belonged to Wants and read as the AI-magic cliché. `Waypoints` is a plotted path and ties to the course motif.)

- [ ] **Step 2: Give `ActionTile` a `tone` prop (gold-chip lead vs. neutral-chip quiet)**

Replace the whole `ActionTile` function with:

```tsx
function ActionTile({
  href,
  icon: Icon,
  label,
  tone = "lead",
}: {
  href: string;
  icon: typeof PenLine;
  label: string;
  tone?: "lead" | "quiet";
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardContent className="flex h-full flex-col items-center gap-2 text-center">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-full",
              tone === "lead"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
          </div>
          <p className="text-sm font-medium text-foreground">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
```

(Only the chip changes tone — the label stays `text-foreground` on both so contrast stays safely above AA and the typography gate passes.)

- [ ] **Step 3: Order the tiles lead-first in `ActionTiles`**

Replace the whole `ActionTiles` function with:

```tsx
function ActionTiles({ className }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className ?? ""}`}>
      <ActionTile
        href="/me/bill-of-rights/generate"
        icon={Waypoints}
        label="Vorschlag generieren"
        tone="lead"
      />
      <ActionTile
        href="/me/bill-of-rights/add"
        icon={PenLine}
        label="Manuell hinzufügen"
        tone="quiet"
      />
    </div>
  );
}
```

- [ ] **Step 4: Type-check, lint, and run the gates**

Run: `npx tsc --noEmit && npm run lint && npm run gate`
Expected: all pass (contrast gate happy — both labels are `text-foreground`).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/me/bill-of-rights/bill-of-rights-me.tsx"
git commit -m "feat(bill-of-rights): Sparkles->Waypoints + Aktions-Kacheln differenzieren

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Two-tap delete guardrail in the edit dialog

**Files:**
- Modify: `app/(app)/me/bill-of-rights/bill-of-rights-me.tsx` (`confirmDelete` state, dialog reset, delete button)

**Interfaces:**
- Consumes: existing `deleteRight(id)`, `editingId`, `setEditingId`, `startEdit`.
- Produces: no new exports — a two-tap confirm on the destructive button, mirroring StarMap's `confirmDelete` pattern (`"Recht löschen"` → `"Wirklich löschen?"`).

- [ ] **Step 1: Add the `confirmDelete` state**

Next to the other `useState` hooks in `BillOfRightsMe` (near `const [editingId, setEditingId] = useState<string | null>(null);`), add:

```tsx
  const [confirmDelete, setConfirmDelete] = useState(false);
```

- [ ] **Step 2: Reset the confirm state when an edit begins**

In `startEdit`, add the reset so re-opening the dialog always starts un-armed:

```tsx
  function startEdit(r: RightItem) {
    setEditingId(r.id);
    setEditText(r.text);
    setConfirmDelete(false);
  }
```

- [ ] **Step 3: Reset the confirm state when the dialog closes**

In the edit `Dialog`'s `onOpenChange`, add the reset alongside clearing `editingId`:

```tsx
          <Dialog
            open={editingId !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingId(null);
                setConfirmDelete(false);
              }
            }}
          >
```

- [ ] **Step 4: Make the delete button two-tap**

Replace the destructive button:

```tsx
                <Button
                  variant="destructive"
                  className="sm:mr-auto"
                  onClick={() => {
                    if (editingId) deleteRight(editingId);
                    setEditingId(null);
                  }}
                >
                  Recht löschen
                </Button>
```

with:

```tsx
                <Button
                  variant="destructive"
                  className="sm:mr-auto"
                  onClick={() => {
                    if (!confirmDelete) {
                      setConfirmDelete(true);
                      return;
                    }
                    if (editingId) deleteRight(editingId);
                    setEditingId(null);
                    setConfirmDelete(false);
                  }}
                >
                  {confirmDelete ? "Wirklich löschen?" : "Recht löschen"}
                </Button>
```

- [ ] **Step 5: Type-check, lint, gates, and a full build**

Run: `npx tsc --noEmit && npm run lint && npm run gate && npm run build`
Expected: all pass; production build succeeds.

- [ ] **Step 6: Manual behaviour check (no unit-test harness in this repo)**

Walk through in `npm run dev`:
1. Open a right's pencil → dialog. Click **Recht löschen** once → label becomes **Wirklich löschen?**, the right is **not** deleted.
2. Click again → the right is deleted and the dialog closes.
3. Open another right, click delete once, then close the dialog (X / outside / Abbrechen), reopen the same right → the button reads **Recht löschen** again (state reset).

Expected: all three behave as described.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/me/bill-of-rights/bill-of-rights-me.tsx"
git commit -m "feat(bill-of-rights): Zwei-Tap-Confirm beim Loeschen (Konsistenz mit StarMap)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Scene reuse (`SkyBackdrop` neutral + new `CourseLine`, `fixed -z-10`, unmount on nav) → Tasks 1–2. ✓
- „Gesteuerter Kurs" motif (dotted path + waypoints, foreground line, Sage `--scene-glow` waypoints, always-visible + reduced-motion static) → Task 1. ✓
- Pure-atmospheric course, no coupling to seal/rights → Task 1 (fixed decorative path). ✓
- No compass rose / no constellation-connect / no radial chart lines → Task 1 draws a single curve only. ✓
- Copy unchanged → no task edits any user-facing string. ✓
- Mascot judge→navigator: wig removed, gavel→sextant, rename → Task 3. ✓
- Icon `Sparkles`→`Waypoints` → Task 4. ✓
- Tile differentiation (restrained, no second gold action) → Task 4 (chip tone only, labels stay readable). ✓
- Two-tap delete mirroring StarMap → Task 5. ✓
- DESIGN.md rules (One-Candle, Glass-Is-Rare, Sage only as scene-glow, sticky-header, lvh, no new backdrop-filter) → Global Constraints + honoured in each task. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command has an expected result. ✓

**Type consistency:** `CourseLine` (Task 1) is the exact name imported in Task 2. `BillOfRightsSky` (Task 2) matches its render call. `MascotNavigator` (Task 3) matches import + usage and the removed `MascotJudge`. `ActionTile`'s `tone` prop (Task 4) is used consistently by `ActionTiles`. `confirmDelete`/`setConfirmDelete` (Task 5) are referenced identically across steps. ✓

**Note on TDD:** This repo has no runtime test framework (no vitest/jest/playwright). Per the design, verification is static (`tsc` + `lint` + `gate` + `build`) plus a scripted manual check for the only stateful logic (Task 5). Test-first code steps are intentionally replaced with these real checks rather than a fabricated harness.
