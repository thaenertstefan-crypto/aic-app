# Dashboard "Sky Stage" — Design Spec

**Date:** 2026-07-09
**Status:** Approved for planning
**Scope:** Visual redesign of the dashboard (`app/(app)/dashboard`) — warm up the whole page by giving the mascot an atmospheric "night sky" stage and carrying that atmosphere down the full scroll.

## Goal

The dashboard currently reads as three stacked solid-plum cards (mood check-in, daily focus, "Heutiges Recht") — drifting toward the "interchangeable card grid" that `DESIGN.md` explicitly rejects. The mascot sits boxed inside the mood card.

Warm up the **whole page**: lift the mascot out of its card onto a *suggested night sky*, and let that atmosphere bleed down behind the rest of the content — so the dashboard reads as one warm, lit room rather than a form.

This stays inside the app's existing north star ("Candlelight in a Quiet Room", deep aubergine night `#1B1726`). It makes the metaphor that's already in the theme **visible** at the one hero moment.

## Chosen direction

Explored three atmosphere levels (ambient-glow / suggested-sky / gentle-celestial) and two full-page treatments (hero-band / full-bleed-glass) via visual mockups.

**Decision: "Suggested sky" (B) + hero-band structure (B1) + a cheap full-page painted-glow background.**

- **Suggested sky**, not a literal starfield — avoids the "kitschy wellness esoterica" anti-reference. Depth comes from a dark-top → warm-horizon gradient, not twinkling stars. At most **2 barely-visible distant lights**.
- **Hero-band structure**: the sky is a stage for the mascot at the top; the working cards below stay **solid Plum Surface** (legible, calm, on-brand).
- **Full-page painted glow**: a single static gradient layer behind the entire scroll carries the atmosphere downward. **No `backdrop-filter`** — pure paint, GPU-cheap. This captures the immersive "night bleeds down the page" feel of the rejected full-glass option (B2) without its performance cost or violating the `Glass-Is-Rare` rule.

### Explicitly rejected
- Literal celestial scene (moon + many stars) — kitsch risk.
- Full-bleed frosted-glass panels down the page (B2) — `backdrop-filter` perf cost on older phones; bends `Glass-Is-Rare`.

## Layout & behavior

Confirmed decisions:
- **Greeting placement:** "Hey Stefan!" + date stay **above** the mascot (current reading order), on the sky.
- **Motion level:** Subtle & safe — mascot drift + whisper-twinkle only. No horizon parallax/swell.

Page structure, top → bottom:

1. **Full-page backdrop** (`SkyBackdrop`) — a fixed, `aria-hidden`, `pointer-events-none` layer behind all content:
   - A faint vertical wash: near-black aubergine at the very top → `#1B1726` → a hair of plum toward the bottom.
   - A soft candle-gold **horizon-glow** radial-gradient positioned behind where the mascot sits.
   - 2 distant lights (tiny, ~0.22 opacity Moonlight dots) in the upper sky.
   - All painted (`linear-gradient` / `radial-gradient`), **no blur filters**.
2. **Sky stage** (top region of the page content):
   - Greeting + date (unchanged markup, now sitting on the sky).
   - Mascot + "Wie geht's dir heute?" + mood pills + mood message — **lifted out of the `Card`**. `MoodCheckin` drops its `Card`/`CardContent` wrapper and renders as bare content on the sky.
   - The mascot gains a slow vertical **drift** animation (in addition to its existing breathe/glow).
3. **Working content** (unchanged card treatment, now resting in the lit room):
   - `DailyFocus` (the focus recommendation + the single gold CTA).
   - "Heutiges Recht" card.

## Components affected

- **`components/dashboard/sky-backdrop.tsx`** *(new)* — isolated presentational component. Renders the fixed atmospheric layer (wash + horizon-glow + distant lights). `aria-hidden`, `pointer-events-none`. Owns the twinkle animation and its reduced-motion fallback. Unmounts on navigation away from the dashboard, so the atmosphere is dashboard-only. No props, or a single optional `className`.
- **`components/dashboard/mood-checkin.tsx`** — remove the `<Card><CardContent>` wrapper so the mascot/question/pills sit directly on the sky. Preserve all behavior (mood select, optimistic highlight, server action, `FormError`, message copy). Add the mascot **drift** wrapper.
- **`app/(app)/dashboard/page.tsx`** — compose `SkyBackdrop` + the sky-stage grouping. Group greeting + mood hero into the stage; keep `DailyFocus` and "Heutiges Recht" below as solid cards. Preserve `DashboardReveal` reveal animation and `DailyReminderScreen`.
- **`app/globals.css`** (or wherever the existing `mood-glow` / `mascot-exhale-dip` keyframes live) — add a `dashboard-drift` keyframe (slow translateY float) and a `sky-twinkle` keyframe, each with a `@media (prefers-reduced-motion: reduce)` off-switch.

`DailyFocus`, `DashboardFocus`, `MoodAvatar`, and `Mascot` need **no changes** to their logic — only their surrounding container changes. (`MoodAvatar`/`Mascot` already carry breathe + glow.)

## Motion & accessibility

- Mascot: existing breathe + glow **plus** a slow vertical drift (~6px, ~7s). Under `prefers-reduced-motion: reduce`, drift is off; breathe/glow already have their own reduced-motion fallback in `Mascot`.
- Distant lights: ultra-slow, ultra-low-contrast twinkle; **static** under reduced motion.
- No new `backdrop-filter` anywhere — the atmosphere is painted gradients only.
- Contrast: greeting (Moonlight) and mood copy sit on the dark top of the sky where contrast is strongest; verify the mood message (`Lavender-Muted`) still clears AA against the sky at its position, per the DESIGN.md Lavender caution.

## PWA / viewport

The backdrop is full-bleed. In the installed iOS standalone PWA, use **`lvh`** (not `svh`/`dvh`) for any full-height sizing so the body background doesn't stripe at the bottom (known issue — see `ios-standalone-pwa-viewport-units` memory). The backdrop should extend under the safe-area insets.

## One Candle Rule check

The gold horizon-glow is **ambient light**, not an action and not a gold decorative rule/divider. The single gold **CTA** in `DailyFocus` ("Weitermachen"/"Jetzt starten") remains the one candle. Keep the glow soft (low alpha) so it never competes with the CTA for "the one thing to act on."

## Out of scope

- No changes to mood logic, recipes, focus recommendation, or "Heutiges Recht" content/data.
- No light mode, no new fonts, no new palette tokens.
- Other screens (`/me`, `/booster`, journal) are unchanged.

## Success criteria

- The mascot is no longer visibly "in a card"; it reads as floating in a suggested night.
- The whole page shares one atmosphere (no hard seam where the sky ends).
- Working cards remain solid and fully legible.
- No `backdrop-filter` added; no measurable scroll/paint regression on a mid-range phone.
- Everything degrades to a calm, static layout under `prefers-reduced-motion`.
- No AA contrast regressions; One Candle Rule intact.
