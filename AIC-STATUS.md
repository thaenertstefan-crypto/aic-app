# AIC-App — Status

_Maintained by the `/feierabend` skill at the end of each session. Read this at session start to get oriented before diving into the code._

_Last updated: 2026-07-17 ("Die Kerze anzünden" round)_

## Current State
- **"Die Kerze anzünden" round merged to main** (`b160f11..921bdb4`, 6 commits, pushed). Sharpened the existing "Candlelight in a Quiet Room" language rather than changing it — the design-review verdict was "loudness, not language": the restraint system (One-Candle-Rule, Glass-Is-Rare, Hairline-Elevation) is correct; the loud counterpole was missing.
- **M2 — Surface contrast + body gradient:** fixed gradient layer below the ambient blobs (top `#131020`), card ladder raised (`--card`/`--popover`/`--sidebar` → `#2E2745`, `--muted` → `#272041`, `--secondary` → `#3A3158`) in BOTH `:root` and `.dark`. Card-vs-ground step is now 1.30–1.33:1 (was 1.07:1). SkyBackdrop vignette reduced so Dashboard/Wants don't double-darken at the top. PWA colors (`viewport.themeColor`, `manifest.ts`) → `#161226`.
- **M1 — Gold CTA:** the `default` button variant IS now the solid gold candle (gold-ink text `#2B1B06`, 8.9:1), not the old 15%-alpha glimmer. One-Candle audit over 69 buttons/31 files; 4 competing gold buttons downgraded to `outline` (saying-no-wizard, things-got-messy-wizard, sternschmiede, wants-me).
- **M3 — Grain:** static SVG feTurbulence grain (`components/ui/grain-overlay.tsx`, opacity 2.5%, `fixed inset-0 z-40`, aria-hidden, server component) mounted after `{children}` in the root layout, below the z-50 dialogs.
- **M4 — Fraunces Italic:** real italic for affirmations at 8 spots via `.font-affirmation` utility. Font decision: **Italic without the SOFT axis** (SOFT alone inflated the payload +101 kB; italic subset alone = +44.6 kB, normal weight unchanged).
- **M5 — Module light-colors via scenes:** BoR seal glows Sage (`--success`), Wants ornaments Rosé (`--celebrate`), Werte Gold, Confidence Lilac — Hub scenes only, via the new `scene-ornament-tint` attribute-selector convention + parametrized glow keyframes (`var(--scene-glow, ...)`). Gold stays the action color everywhere; One-Candle-Rule untouched.
- **Contrast gate in the repo:** `scripts/check-contrast.mjs` computes 7 core pairings and gates all future color changes (7/7 PASS). Non-obvious math it encodes: darkening two dark surfaces can't cross 1.3:1 because the WCAG flare term (+0.05) dominates — you must raise the card ladder. This gate is the guardrail for the deferred palette change.
- Final whole-branch review (opus, `b160f11..921bdb4`): Ready = YES, no Critical/Important, no follow-up commit.
- Spec/plan/ledger: `docs/superpowers/specs/2026-07-17-kerze-anzuenden-design.md`, `docs/superpowers/plans/2026-07-17-kerze-anzuenden.md`, `.superpowers/sdd/progress.md`.

## Open Items
- **Stefan's iPhone check** against the live deploy, focus: grain over the Dashboard glass cards (known iOS backdrop-filter compositing risk — fallback is defined), gold CTA at low display brightness / outdoors, card separation from ground without double-darkening at the top.
- **Checkpoint (Measure 6, after the iPhone check):** decide whether glow under the hero card or mood-reactive ambience is still needed before writing any follow-up spec. Also at the checkpoint: North-Star rewording in DESIGN.md ("ein geschützter, gedämpfter Raum, in den du dich jederzeit zurückziehen kannst") as a doc-only change.
- **Module-color consistency pass (non-blocking):** Schmiede/Wants page ornaments (forge-art AnvilArt, wants-me hero StarArt, StarArt outer ring) still glow gold despite the "Wants = Rosé" mapping — identity flip Hub→Schmiede. M5 was deliberately scoped to Hub scenes only.
- **Small observations:** the curated reframe paragraph in `moment-flow.tsx` is deliberately NOT italicized (not data-driven — show Stefan); `check-contrast.mjs:9` throws a raw TypeError instead of a descriptive error when `:root` is missing; the `scene-ornament-tint` convention is only documented in a code comment (a cross-reference in the DESIGN.md module-color table would be cleaner).
- **Deferred palette change** ("für später"): candidates documented (Herbstgarten, Waldnacht, Kaminzimmer, Gothic Noir), now verifiable via the contrast gate.
- Carried over: FK `cleanser_checkins.user_id` is the only non-cascading user table (`NO ACTION`) — migrating it to `ON DELETE CASCADE` is still pending (hardening + prerequisite for a real account-deletion feature).

## Next Steps
- Await Stefan's iPhone verdict, then run the Measure-6 checkpoint conversation (glow / mood-ambience yes-or-no) at the live state.

## Links
- Vault project note: `Stefan's Vault/02 Projekte/AIC-App.md`
- Product & design context: `PRODUCT.md`, `DESIGN.md`
