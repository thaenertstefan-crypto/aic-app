---
target: dashboard
total_score: 30
p0_count: 0
p1_count: 2
timestamp: 2026-07-08T11-06-33Z
slug: app-app-dashboard-page-tsx
---
Method: ⚠️ DEGRADED: single-context (harness policy: sub-agents not spawned without explicit user request)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Mood save is optimistic-only; no explicit "gespeichert" confirmation |
| 2 | Match System / Real World | 4 | Warm, natural German; labeled icons; solid |
| 3 | User Control and Freedom | 3 | Daily-reminder overlay has no Esc / focus trap; button dead for 2s |
| 4 | Consistency and Standards | 3 | "Heutiger Reminder" vs "Heutiges Recht" are two treatments of one concept |
| 5 | Error Prevention | 3 | Low-risk surface; FormError present |
| 6 | Recognition Rather Than Recall | 3 | 5 mood pills in a hidden-scrollbar row may hide options at 375px |
| 7 | Flexibility and Efficiency | 3 | Fine for a companion dashboard; no accelerators needed |
| 8 | Aesthetic and Minimalist Design | 2 | Three stacked glass cards + a 7-item list flatten hierarchy |
| 9 | Error Recovery | 3 | FormError + segment error boundary; lightly exercised here |
| 10 | Help and Documentation | 3 | Adaptive subtitle/copy is self-explanatory |
| **Total** | | **30/40** | **Good** |

## Anti-Patterns Verdict

**Does this look AI-generated? No.** This is genuinely on-brand and full of personality — the breathing mood avatar, mood-adaptive recommendation (low mood swaps "weitermachen" for "Raus aus dem Gedankenkarussell"), and warm judgment-free copy are the opposite of slop.

**Deterministic scan:** `detect.mjs` over `app/(app)/dashboard` + `components/dashboard` returned `[]` (exit 0). No side-stripes, gradient text, eyebrow-per-section, or identical card grids detected.

**Browser overlay:** Not available this run — no dev server running and no native browser tool exposed. Assessment B is detector-only; findings below are from source review.

The real problem isn't slop, it's that the calm-first promise fights itself: several elements of equal visual weight compete on a screen whose whole job is to lower overwhelm.

## Overall Impression

A warm, characterful dashboard that's about 80% there. What works is genuinely good and hard to fake. The single biggest opportunity: **establish one clear focal point.** Right now the mood check-in, the primary recommendation, and "Heutiges Recht" are all frosted-glass cards of similar weight, and the screen ends on a 7-item list of undifferentiated choices. For a user opening this app *because* their head is loud, that's more decisions than the moment can hold.

## What's Working

1. **Mood-adaptive focus.** Tier `low` swaps the whole recommendation to an exit-the-spiral flow instead of "keep going." That's real emotional design, not a theme.
2. **Copy that lands.** Per-score messages ("Schwere Tage gehören dazu. Schön, dass du trotzdem hier bist.") are warm without being pitying — exactly the personality PRODUCT.md commits to.
3. **Motion discipline.** The single-machine crossfade and reduced-motion branches are careful; the login stagger correctly defaults to fully-visible content (no reveal-gating trap).

## Priority Issues

### [P1] Three stacked glass cards flatten the hierarchy
- **Why it matters:** DESIGN.md's own Glass-Is-Rare Rule says 1–2 hero moments per screen; the dashboard renders three frosted cards in a row (mood check-in, primary focus, Heutiges Recht). When everything is elevated, nothing is. The actual next action (the primary card with `border-primary`) doesn't visually dominate the mood card above it.
- **Fix:** Keep glass on exactly one card — the primary recommendation. Demote the mood check-in and "Heutiges Recht" to solid `Card` (default variant). The One Candle Rule should leave the gold CTA as the clear focal point.
- **Suggested command:** `/impeccable layout`

### [P1] The alternatives list is a 7-item wall of options
- **Why it matters:** "…oder brauchst du gerade was anderes?" renders up to 7 near-identical bordered rows (all destinations minus the primary). Working memory caps at ~4; on a surface designed to reduce overwhelm, an undifferentiated 7-item list does the opposite. Every row has equal weight and the same ChevronRight, so there's no path in.
- **Fix:** Show the 3 most relevant alternatives, with progressive disclosure ("mehr zeigen") for the rest — or group them (e.g. "Akut" vs "Reflexion"). Let the mood tier bias which 3 surface.
- **Suggested command:** `/impeccable distill`

### [P2] Daily-reminder overlay is a half-implemented dialog
- **Why it matters:** It sets `role="dialog" aria-modal="true"` but has no focus trap, no Escape handler, and its only focusable control (the "Weiter" button) is `aria-hidden` / `tabIndex=-1` for the first 2 seconds. A keyboard or screen-reader user lands in a modal with nothing to do and no way out until the button appears; backdrop-click dismissal isn't keyboard-reachable. The 3000ms ease-in fade is also very slow.
- **Fix:** Use native `<dialog>` (focus management + Esc for free), or add an Esc handler, focus trap, and a focusable close affordance from t=0. Consider shortening the affirmation fade.
- **Suggested command:** `/impeccable harden`

### [P2] Small muted text at reduced opacity risks sub-AA contrast
- **Why it matters:** The "Heutiges Recht" eyebrow is `text-xs` (12px) `uppercase tracking-wide text-muted-foreground/70`. `muted-foreground` (#A89FBE) alone clears AA on the dark ground (~6.5:1 on glass), but at 70% opacity over the glass surface it drops toward ~4:1 — borderline for 12px text, which needs 4.5:1. It's also the flagged uppercase-eyebrow pattern.
- **Fix:** Drop the `/70` (use full `muted-foreground`) and reconsider the uppercase eyebrow — a small-caps or plain label at full contrast reads better and is on-brand. Verify placeholder text too.
- **Suggested command:** `/impeccable audit`

### [P2] Mood pills can hide behind a scrollbar-less overflow at 375px
- **Why it matters:** The 5 mood pills sit in `overflow-x-auto` with the scrollbar hidden. "Im Gleichgewicht" is long; at 375px the row likely overflows, and with no scrollbar affordance a first-timer may never see all five moods (recognition failure). Each pill is also a submit button, so "scrolling to look" and "choosing" aren't cleanly separable.
- **Fix:** Let the pills wrap (`flex-wrap`) or shrink to fit five across at 375px; if scroll stays, add an edge fade/affordance so it reads as scrollable.
- **Suggested command:** `/impeccable adapt`

## Persona Red Flags

**Sam (Accessibility-Dependent):** Daily-reminder overlay traps focus-less for 2s with no Esc. Hidden-scrollbar mood row is invisible to discover by keyboard. Small `/70` muted text is borderline for low vision.

**Casey (Distracted Mobile):** Primary CTA is comfortably in the thumb zone (good). But the once-per-day full-screen overlay on open, plus a 7-item list at the bottom, is a lot for a one-handed, interrupted glance. Mood state persists (good).

**Lena (project persona — anxious, opening the app mid-spiral):** The screen promises calm but presents mood + primary + "Heutiges Recht" + 7 alternatives, all roughly co-equal. In a loud-head moment that's decision load, not relief. She needs one obvious next tap.

## Minor Observations

- Two treatments for the same idea: the overlay's "Heutiger Reminder" (gold, glow) vs the card's "Heutiges Recht" (muted eyebrow). Consider unifying the vocabulary.
- Mood save gives optimistic highlight but no explicit "gespeichert" confirmation — fine, but a whisper-level confirmation would close the loop.
- `capitalize` on the German date label is harmless but unnecessary (locale already cases it).

## Questions to Consider

- What if the primary recommendation were the *only* elevated card, and everything else sat quietly beneath it?
- Does the dashboard need to show all seven destinations at once, or would three-plus-"mehr" feel calmer without losing reach?
- Should the daily reminder be a full-screen modal at all, or a dismissible banner that doesn't block the keyboard?
