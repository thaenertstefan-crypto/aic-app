# Dashboard "Sky Stage" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Warm up the whole dashboard by lifting the mascot out of its card onto a "suggested night sky" and carrying that atmosphere down the full page with a cheap, painted background glow.

**Architecture:** Add one dashboard-only presentational component, `SkyBackdrop`, that paints a downward-darkening sky wash + a soft candle-gold horizon-glow + two faint distant lights behind the page (fixed, `-z-10`, `aria-hidden`) — additive to the existing app-wide `AppBackdrop`. De-card the mood check-in so the mascot floats on the sky, and give the mascot a slow drift. All atmosphere is painted gradients — **no `backdrop-filter`** — so it's GPU-cheap and reversible (removing `<SkyBackdrop />` from the page reverts the look).

**Tech Stack:** Next.js 16 App Router, React, TailwindCSS, CSS keyframes in `app/globals.css`. No automated test framework exists in this repo (scripts are `lint` and `build` only); verification is `npm run lint` + `npm run build` (build type-checks) + a live browser check on the dev server.

## Global Constraints

- **No `backdrop-filter`** anywhere in this feature — atmosphere is painted `linear-gradient`/`radial-gradient` only (honours the DESIGN.md *Glass-Is-Rare* rule and avoids perf cost on older phones).
- **One Candle Rule:** the gold horizon-glow is ambient light, not an action — keep it low-alpha so it never competes with the single gold CTA in the focus block.
- **Reduced motion:** every animation added here must be disabled under `@media (prefers-reduced-motion: reduce)`, matching the existing pattern in `app/globals.css` (e.g. `.duel-glow`).
- **Text color:** Moonlight `var(--foreground)` (`#F3EFFA`), never pure `#FFFFFF`.
- **All user-facing text stays German** (no user-facing strings change in this feature).
- **Backdrop pattern:** use `fixed inset-0 -z-10` (identical to the working `AppBackdrop`) — do **not** introduce `vh`/`svh`/`dvh` units (avoids the known iOS standalone-PWA bottom-striping issue).
- **Mobile-first**, target viewport ~375px.

---

### Task 1: `SkyBackdrop` component + sky/motion keyframes, wired into the dashboard

Creates the atmosphere and makes it visible behind the existing (still-carded) dashboard content. Deliverable: opening `/dashboard` shows a darker sky up top, a warm gold horizon-glow behind the mascot area, and two faint twinkling lights — all behind the current cards.

**Files:**
- Create: `components/dashboard/sky-backdrop.tsx`
- Modify: `app/globals.css` (add classes/keyframes inside the existing `@layer utilities` block, after the `.star-pulse` rule ~line 424)
- Modify: `app/(app)/dashboard/page.tsx` (render `<SkyBackdrop />`)

**Interfaces:**
- Consumes: nothing.
- Produces: `SkyBackdrop` — `export function SkyBackdrop(): JSX.Element`, no props. CSS utility classes `.sky-light`, `.sky-light-twinkle`, `.mascot-drift` (the last consumed by Task 2).

- [ ] **Step 1: Create the `SkyBackdrop` component**

Create `components/dashboard/sky-backdrop.tsx`:

```tsx
/**
 * Dashboard-only atmospheric backdrop — a "suggested night sky".
 *
 * Layers a downward-darkening sky wash, a soft candle-gold horizon-glow behind
 * where the mascot sits, and two barely-visible distant lights. Purely painted
 * gradients (no backdrop-filter) so it stays GPU-cheap and honours the
 * Glass-Is-Rare rule. Sits at -z-10 (like AppBackdrop) so it stays behind page
 * content; rendered by the dashboard page, so it unmounts on navigation away.
 *
 * aria-hidden + pointer-events-none — pure decoration.
 */
export function SkyBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* Sky wash: deepen the aubergine toward the top so the mascot reads as
          lit against a darker night, then fade to transparent by ~42% so the
          app's ambient blobs still breathe through the mid-page. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(9,7,14,0.85) 0%, rgba(14,11,21,0.45) 22%, rgba(27,23,38,0) 42%)",
        }}
      />
      {/* Horizon-glow: a wide, soft band of warm candle-gold light low behind
          the mascot (upper third of the viewport), spanning the full width.
          Low alpha so it never competes with the single gold CTA below. */}
      <div
        className="absolute inset-x-0"
        style={{
          top: "8%",
          height: "34%",
          background:
            "radial-gradient(120% 60% at 50% 90%, rgba(231,182,94,0.20), rgba(231,182,94,0.06) 45%, transparent 72%)",
        }}
      />
      {/* Two distant lights in the upper sky. */}
      <span className="sky-light sky-light-twinkle absolute left-[18%] top-[12%]" />
      <span
        className="sky-light sky-light-twinkle absolute right-[22%] top-[18%]"
        style={{ animationDelay: "1.6s" }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add the sky + drift utilities to `app/globals.css`**

Inside the existing `@layer utilities { … }` block, right after the `.star-pulse { … }` rule (~line 424), add:

```css
  /* ── Dashboard "sky stage" ─────────────────────────────────────────── */
  /* Two barely-there distant lights in the dashboard night sky. */
  .sky-light {
    width: 2px;
    height: 2px;
    border-radius: 9999px;
    background: var(--foreground);
    opacity: 0.22;
  }
  @keyframes sky-light-twinkle {
    0%, 100% { opacity: 0.1; }
    50%      { opacity: 0.32; }
  }
  .sky-light-twinkle { animation: sky-light-twinkle 6s ease-in-out infinite; }

  /* Slow vertical drift for the dashboard mascot, layered on top of its own
     breathe/glow (consumed by mood-checkin). */
  @keyframes mascot-drift {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
  }
  .mascot-drift { animation: mascot-drift 7s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .sky-light-twinkle { animation: none; }
    .mascot-drift { animation: none; }
  }
```

- [ ] **Step 3: Render `SkyBackdrop` on the dashboard**

In `app/(app)/dashboard/page.tsx`, add the import near the other component imports (after the `DailyReminderScreen` import, line ~12):

```tsx
import { SkyBackdrop } from "@/components/dashboard/sky-backdrop";
```

Then make it the **first child** of the root container so it takes no `space-y` margin. Change:

```tsx
  return (
    <div className="space-y-6 p-4">
      <DailyReminderScreen rights={activeRights.map((r) => r.text)} />
```

to:

```tsx
  return (
    <div className="space-y-6 p-4">
      <SkyBackdrop />
      <DailyReminderScreen rights={activeRights.map((r) => r.text)} />
```

- [ ] **Step 4: Lint and type-check**

Run: `npm run lint`
Expected: no new errors in `components/dashboard/sky-backdrop.tsx`, `app/(app)/dashboard/page.tsx`, `app/globals.css`.

Run: `npm run build`
Expected: build succeeds (type-check passes); no errors.

- [ ] **Step 5: Visual check on the dev server**

Run: `npm run dev`
Open `http://localhost:3000/dashboard`. Confirm:
- The top of the page is a visibly darker "sky"; a soft warm gold glow sits low behind the mascot area, spanning the full width.
- Two faint light dots twinkle slowly in the upper sky.
- Cards still render normally on top; nothing is clickable-blocked (the backdrop is behind content).
- Toggle OS "reduce motion" on → reload → the light dots stop animating.

(Optional automated path: use the browser-verification recipe — playwright-core + msedge with a throwaway account and the `onboarding_completed` flag — to screenshot `/dashboard`.)

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/sky-backdrop.tsx app/globals.css "app/(app)/dashboard/page.tsx"
git commit -m "feat(dashboard): add suggested-night-sky backdrop"
```

---

### Task 2: De-card the mood check-in and let the mascot float & drift

Removes the `Card` wrapper around the mood check-in so the mascot, greeting, question, and pills sit directly on the sky, and applies the `.mascot-drift` motion. Deliverable: the mascot is no longer boxed — it floats in the suggested night and drifts gently.

**Files:**
- Modify: `components/dashboard/mood-checkin.tsx`

**Interfaces:**
- Consumes: `.mascot-drift` utility class (from Task 1).
- Produces: nothing new (same `MoodCheckin` props/behavior).

- [ ] **Step 1: Remove the `Card` wrapper and add the drift wrapper**

In `components/dashboard/mood-checkin.tsx`:

Remove the now-unused Card import (line ~5):

```tsx
import { Card, CardContent } from "@/components/ui/card";
```

Change the outer wrapper. Replace:

```tsx
  return (
    <Card>
      <CardContent className="space-y-8">
```

with:

```tsx
  return (
    <div className="space-y-8">
```

…and replace the matching closing tags at the end of the component. Change:

```tsx
        <FormError message={state.error} />
      </CardContent>
    </Card>
  );
```

to:

```tsx
        <FormError message={state.error} />
    </div>
  );
```

Then wrap the mascot in the drift container. Change:

```tsx
        <div className="flex justify-center pb-2">
          <MoodAvatar
            face={MOOD_FACES[selected ?? 3]}
            pulseSeconds={MOOD_PULSE_SECONDS[selected ?? 3]}
          />
        </div>
```

to:

```tsx
        <div className="flex justify-center pb-2">
          <div className="mascot-drift">
            <MoodAvatar
              face={MOOD_FACES[selected ?? 3]}
              pulseSeconds={MOOD_PULSE_SECONDS[selected ?? 3]}
            />
          </div>
        </div>
```

- [ ] **Step 2: Lint and type-check**

Run: `npm run lint`
Expected: no errors; in particular no "unused import" for `Card`/`CardContent` (they must be fully removed).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Visual check on the dev server**

Run: `npm run dev` (if not already running).
Open `http://localhost:3000/dashboard`. Confirm:
- The mood check-in no longer has a card border/background — the mascot, "Wie geht's dir heute?", mood pills, and the message all sit directly on the sky.
- The mascot drifts gently up and down (in addition to its existing breathe/glow).
- The focus block and "Heutiges Recht" below are still solid, legible cards.
- Vertical spacing between the mood area and the focus card still looks balanced (the `space-y-8` internal spacing and `space-y-6` outer spacing are preserved).
- Toggle "reduce motion" → mascot drift stops.

- [ ] **Step 4: Commit**

```bash
git add "components/dashboard/mood-checkin.tsx"
git commit -m "feat(dashboard): float mascot on the sky (de-card mood check-in) + drift"
```

---

### Task 3: Tuning & accessibility verification pass

Final polish: confirm the atmosphere reads as one warm room, the glow sits behind the mascot on load, and nothing regresses on brand rules, contrast, motion, or the installed PWA. Deliverable: a verified, tuned final look. Any tuning here is limited to the four constants noted below (glow position/alpha, wash stops) — no structural changes.

**Files:**
- Modify (only if tuning needed): `components/dashboard/sky-backdrop.tsx`

**Interfaces:**
- Consumes: `SkyBackdrop` (Task 1), de-carded mood check-in (Task 2).
- Produces: nothing.

- [ ] **Step 1: Horizon-glow alignment**

On `http://localhost:3000/dashboard` at ~375px width, confirm the gold horizon-glow sits **behind the mascot** on first load (no scroll). If it reads too high or too low, adjust only the `top`/`height` on the horizon-glow `<div>` in `sky-backdrop.tsx` (start point: `top: "8%"`, `height: "34%"`). If it reads too high on very tall viewports, nudge `top` down a few percent. Re-check after any change.

- [ ] **Step 2: One Candle Rule**

Confirm the single gold CTA in the focus block ("Weitermachen" / "Jetzt starten" / "Setze deine Entdeckungsreise fort") is still clearly the brightest, most action-like gold on the screen. If the horizon-glow competes with it, lower the glow's peak alpha from `0.20` toward `0.14` in `sky-backdrop.tsx`.

- [ ] **Step 3: Contrast**

Confirm the mood message line (Lavender-Muted, `text-muted-foreground`) and the date line remain comfortably readable where they sit on the darker sky (they sit on the darkest top band, so contrast should be at its best). No change expected; if any text feels dim, this is a signal to darken the wash's top stop slightly (`rgba(9,7,14,0.85)` → up to `0.92`), not to lighten the text.

- [ ] **Step 4: Reduced motion**

With OS "reduce motion" on, reload `/dashboard` and confirm: distant lights static, mascot drift off, and the mascot's own breathe/glow already static (handled inside `Mascot`). The page must look calm and complete with zero motion.

- [ ] **Step 5: Installed-PWA / safe area**

If an installed standalone PWA is available (iOS), confirm the sky backdrop covers the full screen with **no background striping at the bottom** and reaches under the top safe-area inset. Because `SkyBackdrop` uses `fixed inset-0` (the same pattern as the working `AppBackdrop`) and no `vh` units, this should hold; if striping appears, verify `inset-0` is intact rather than reaching for viewport units.

- [ ] **Step 6: Final lint + build**

Run: `npm run lint`
Expected: clean.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit (only if tuning changed a file)**

```bash
git add "components/dashboard/sky-backdrop.tsx"
git commit -m "polish(dashboard): tune sky glow position/alpha"
```

If nothing needed tuning, skip this commit.

---

## Self-Review

**Spec coverage:**
- Suggested sky (dark top → gold horizon, ≤2 faint lights) → Task 1.
- Hero-band structure (mascot floats; cards below stay solid) → Task 2 (de-card mood) + cards left untouched.
- Cheap full-page painted glow, no backdrop-filter → Task 1 (`SkyBackdrop`, gradients only) + Global Constraints.
- Greeting stays above mascot → unchanged in `page.tsx`/`mood-checkin.tsx` (no reorder); confirmed by leaving `<header>` and mood order intact.
- Subtle & safe motion (mascot drift + whisper-twinkle, no horizon swell) → Task 1 keyframes; no parallax added.
- Reduced-motion fallback → Task 1 media query; Task 3 Step 4 verifies.
- One Candle Rule → Global Constraints + Task 3 Step 2.
- iOS `lvh`/safe-area / no bottom striping → Global Constraints (fixed inset-0, no vh) + Task 3 Step 5.
- AA contrast (Lavender caution) → Task 3 Step 3.
- Out of scope (no logic/data/other screens) → respected; only 3 files touched, all presentational.

**Placeholder scan:** No TBD/TODO; all code shown in full; verification commands are concrete.

**Type consistency:** `SkyBackdrop` (no props) is imported and used identically in Task 1. Utility class names `.mascot-drift`, `.sky-light`, `.sky-light-twinkle` are defined in Task 1 Step 2 and consumed verbatim in Task 1's component and Task 2's `mood-checkin.tsx`.
