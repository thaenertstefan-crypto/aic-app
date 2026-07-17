# AIC-App — Status

_Maintained by the `/feierabend` skill at the end of each session. Read this at session start to get oriented before diving into the code._

_Last updated: 2026-07-17 (Bildsprache "Dein Nachthimmel" round)_

## Current State
- **Bildsprache "Dein Nachthimmel" merged to main** (`414e98c..e446101`, 7 commits, pushed). The app now has a unified image system: the app is the protected room from which you look at your own night sky — Kompass = Werte, Sterne/Sternschmiede = Wants (one concept, two described-but-unnamed facets), Bill of Rights = the rules you navigate by, acute helpers = **Kopfwetter** (weather that passes; replaces "Kopf-Apotheke"). Spec: `docs/superpowers/specs/2026-07-17-bildsprache-nachthimmel-design.md`, plan: `docs/superpowers/plans/2026-07-17-bildsprache-nachthimmel.md`, ledger: `.superpowers/sdd/progress.md`.
- **Rename complete:** `NAV_LABELS.booster`/`PAGE_TITLES.booster` = "Kopfwetter", nav icon `CloudMoon`; zero "Apotheke" occurrences left in `app/`, `components/`, `lib/`. Route `/booster`, internal keys, and DB fields unchanged (copy-level rename only).
- **Hub visual rebuild:** the 5 apothecary vessels (`vessels.tsx`, deleted) were replaced by 5 weather motifs in `app/(app)/booster/weather-art.tsx` — WindSwirl (Overthinking), CloudStack (Things Got Messy), UmbrellaRain (Nein-Trainer), StormCloud (Schattenseite), ClearingStar (Confidence). Convention: gold line silhouettes, ONE lilac accent element per motif (Kopfwetter module color = `--cleanser-confidence`), one slow micro-animation each, `bs-rain` keyframes added / `bs-bubble` removed, reduced-motion covered.
- **Check-in is the Wetterbericht:** question "Wie ist das Wetter heute in deinem Kopf?" (exact wording fixed by Stefan), labels Stürmisch/Bewölkt/Ruhig/Klar/Sternenklar, judgment-free weather messages; low-tier focus question "Stürmt es gerade in deinem Kopf?". `MOOD_FACES`, `moodTier`, DB `mood_score` untouched.
- **Onboarding minimally renamed** (Stefan's call: content stays as-is): three Kopf-Apotheke → Kopfwetter replacements in `lib/content/onboarding-intro.ts`, preview icons Wind/Cloudy. The **Leitsatz** ("Auch wenn das Wetter sie manchmal versteckt: Deine Sterne leuchten weiter.") is deliberately NOT built in yet.
- **Docs anchored:** DESIGN.md Overview has a Bildwelt paragraph + module-color table row "Kopfwetter = Lilac" + `scene-ornament-tint` cross-reference; PRODUCT.md purpose paragraph updated.
- Final whole-branch review (opus): Ready = YES, no Critical/Important. Gates green: `tsc`, `npm run build`, contrast 7/7.
- **Previous round ("Die Kerze anzünden", `b160f11..921bdb4`) also live:** gold `default` button = the one candle, raised card ladder (1.30–1.33:1), static grain, Fraunces Italic affirmations (`.font-affirmation`), module light-colors on hub scenes, contrast gate `scripts/check-contrast.mjs`.

## Open Items
- **Stefan's iPhone check** against the live deploy — now covers BOTH rounds: grain over glass cards, gold CTA at low brightness, card separation (Kerze round); the 5 weather motifs (calm enough? CloudStack/StormCloud animate two elements each — reduce to one if busy), nav-tab width with "Kopfwetter" as longest label, check-in chips with "Sternenklar" in horizontal scroll, onboarding wording (Bildsprache round).
- **Checkpoint (Measure 6, after the iPhone check):** decide whether glow under the hero card or mood-reactive ambience is still needed.
- **Leitsatz round (deferred):** place the Leitsatz in `.font-affirmation` at the onboarding closing card and/or 1–2 exercise completion moments — text and utility exist, only placement missing (held back because onboarding stays unchanged for now).
- **Module-color consistency pass (non-blocking):** Schmiede/Wants page ornaments (forge-art AnvilArt, wants-me hero StarArt, StarArt outer ring) still glow gold despite "Wants = Rosé".
- **Deferred Minors (Bildsprache ledger, all "leave open"):** two-element animations in CloudStack/StormCloud (await iPhone verdict); ASCII closing quotes in two code comments (`mood-checkin.tsx:49`, labels.ts JSDoc); `check-contrast.mjs:9` raw TypeError when `:root` missing (carried over).
- **Small observations:** curated reframe paragraph in `moment-flow.tsx` deliberately NOT italicized — show Stefan. (scene-ornament-tint DESIGN.md cross-reference: DONE this round.)
- **Deferred palette change** ("für später"): candidates documented (Herbstgarten, Waldnacht, Kaminzimmer, Gothic Noir), verifiable via the contrast gate.
- Carried over: FK `cleanser_checkins.user_id` is the only non-cascading user table (`NO ACTION`) — migrating to `ON DELETE CASCADE` still pending (hardening + prerequisite for account deletion).

## Next Steps
- Await Stefan's iPhone verdict on both rounds, then: (a) Measure-6 checkpoint conversation, (b) decide the Leitsatz round, (c) fix weather-motif animation count if needed.

## Links
- Vault project note: `Stefan's Vault/02 Projekte/AIC-App.md`
- Product & design context: `PRODUCT.md`, `DESIGN.md`
