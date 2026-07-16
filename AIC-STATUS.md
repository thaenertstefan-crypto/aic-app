# AIC-App — Status

_Maintained by the `/feierabend` skill at the end of each session. Read this at session start to get oriented before diving into the code._

_Last updated: 2026-07-16 (cleanup round)_

## Current State
- **Feinjustierungen round merged to main** (`77368c3`, pushed): Sternschmiede rebuilt around a server-diced, deterministic Funken-slot contract (2 Wert-Slots + 2 Stern-Slots, +1 Kind-Slot when a childhood answer is given) — the AI now fulfills an exact `<auftrag>` block instead of freely choosing count/balance. New briefing wizard step (illustration `CompassStarsArt`, childhood question moved off the landing), leaner completion screen (single "Zurück zur Schmiede" button).
- E2E-verified against the live Anthropic API: 5 forge runs, slot counts exact in every run, `reason` fields correctly sourced (Wert/Stern/Kind), re-dice showed real variance across values.
- ~14 smaller copy/layout/behavior fixes: forge sparks now Rose Celebrate (not gold); warp transition ~25% shorter (340/180/460ms, TS/CSS pairing verified); "Sternsuche" → "Sternensuche" everywhere user-visible; denser sky-backdrop stars toward screen center; `/me` hub reordered (Werte → Wants → Bill of Rights) with a bigger values compass and a glow finale star in the values journey; Bill-of-Rights add-form has a fixed, non-editable "Ich habe das Recht," prefix and lost its saying-no cross-link; booster header lost the mascot, gained a subtitle; overthinking step 1 compacted; shadow-wizard AI-mention copy trimmed + rage-walk now needs an explicit start tap; journal category tabs scroll horizontally only.
- Post-verification fix: the enlarged finale-star label in the values journey overflowed the 375px viewport — fixed with a two-line wrap, browser-reverified.
- Final whole-branch review (opus): Ready to merge = YES, no Critical/Important.
- Spec/plan/ledger for this round: `docs/superpowers/specs/2026-07-16-feinjustierungen-design.md`, `docs/superpowers/plans/2026-07-16-feinjustierungen.md`, `.superpowers/sdd/progress.md`.

## Cleanup round (2026-07-16, follow-up)
- Copy fix "Der/den Gedankenkarussell" → "Das/das" (`overthinking-wizard.tsx`, two spots) — done, tsc clean.
- `pickRandomValues` empty-array guard added (`app/api/sternschmiede/route.ts`) — done.
- Bill-of-Rights add-wrapper got the missing `dark:bg-input/30` tint (`add/page.tsx`) — done.
- Finale label `w-40` decoupled from `side="right"` via `text-right` on the left side (`values-journey-client.tsx`) — done.
- Both throwaway E2E accounts deleted from Supabase (cleared `cleanser_checkins` first — its FK is `NO ACTION`, the rest cascade); verified 0 rows remain.

## Open Items
- Stefan should click through on a real device, especially: warp transition feel, journal tab horizontal scroll, sky-backdrop density (per plan, the three hardest to judge remotely).
- Remaining deferred minor (none blocking): comma-duplication if a user types a leading comma right after the fixed Bill-of-Rights prefix.

## Next Steps
- (none pending — cleanup round complete)

## Links
- Vault project note: `Stefan's Vault/02 Projekte/AIC-App.md`
- Product & design context: `PRODUCT.md`, `DESIGN.md`
