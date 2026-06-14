# Plan: Add "Messy Moment" Secondary View to Bill of Rights

## Context

The Bill of Rights recipe helps users define personal rights. The next step in the recipe flow is a **secondary journal view** where users reflect on situations where they didn't follow their own rights ("messy moments"). This adds a simple journaling form to `app/(app)/recipes/bill-of-rights/messy/page.tsx` with three questions and a list of past entries, plus a link from the main BOR page.

## Files to change

### 1. MODIFY: `app/(app)/recipes/bill-of-rights/actions.ts`

Add two new exports:

- **`getMessyMoments()`** — Fetches all `journal_entries` where `recipe_slug='bill-of-rights'` AND `template_type='messy_moment'`, ordered by `entry_date` DESC. Returns an array of `{ id, entry_date, content: { messy_when, conflicting_rules, guilt_type } }`.

- **`saveMessyMomentAction(_prevState, formData)`** — Extracts three fields from formData (`messy_when`, `conflicting_rules`, `guilt_type`), validates `messy_when` is non-empty, then **inserts** a new row into `journal_entries` (always insert — multiple entries allowed). Sets `recipe_slug='bill-of-rights'`, `template_type='messy_moment'`, `entry_date` to today. Also marks progress as `in_progress` if it wasn't already. Returns `{ error: string | null, success: boolean }`.

### 2. CREATE: `app/(app)/recipes/bill-of-rights/messy/page.tsx`

A **client component** following the same patterns as `values/journal/journal-form.tsx`:

- On mount, calls `getMessyMoments()` to load past entries.
- Uses `useActionState` with `saveMessyMomentAction` for form submission.

**Form (3 fields):**
1. **Textarea** — "Wann ist es diese Woche 'messy' geworden – wann bist du nicht nach deinem Bill of Rights gegangen?" (required, `name="messy_when"`)
2. **Textarea** — "Welche Regel(n) waren im Konflikt miteinander?" (optional, `name="conflicting_rules"`)
3. **Radio group** (from `@/components/ui/radio-group`) — "War die Schuld, die du gefühlt hast, gesunde oder ungesunde Schuld?" with three options:
   - "gesund" → value `healthy`
   - "ungesund" → value `unhealthy`
   - "bin mir nicht sicher" → value `unsure`

**Entries list** — Below the form, render all previously saved entries (newest first). Each entry shows:
- The date (`entry_date` formatted as "dd.mm.yyyy")
- A short preview (first 80 chars of `messy_when` with `…` appended if truncated)
- Wrapped in a simple Card

**States:**
- **Loading**: Centered "Lade Einträge …" text
- **Empty (no entries yet)**: Gentle message like "Noch keine Einträge. Der erste Schritt ist der wichtigste!"
- **Error banner**: Shown when `state.error` is set after a save attempt
- **Success**: On successful save, re-fetch entries (or revalidate) and reset form fields to empty
- **Submitting**: Button shows "Wird gespeichert …" and is disabled

**Layout** — Mobile-first, max-w-lg container, consistent with the main BOR page.

### 3. MODIFY: `app/(app)/recipes/bill-of-rights/page.tsx`

Add a **CTA section** at the bottom of the main view (after the Rights List section, before the bottom spacing div):

A Card containing a link to `/recipes/bill-of-rights/messy`:

> **Es ist mal wieder messy geworden?**  
> Hier reflektieren →

Styled with a subtle amber accent, consistent with the recipe's design language (amber-500/amber-50 tones). Use a `Link` from next/link rendered as a button.

## Pattern reuse

- **RadioGroup**: Already exists at `components/ui/radio-group.tsx` (uses `@base-ui/react/radio-group`) — use directly with `RadioGroup` + `RadioGroupItem`
- **Textarea, Button, Card, Label, CardContent**: Same components already used by the main BOR page
- **Date formatting**: Inline helper `formatDateDE(key: string)` — same pattern as in `values/journal/journal-form.tsx`
- **Server action pattern**: Follow `saveReflectionAction`'s structure exactly (auth check → validate → upsert/insert → update progress)
- **Link rendering**: Use `Button` with `render={<Link href="..." />}` prop — already used in main BOR page

## Verification

1. Run `npm run dev` and navigate to `/recipes/bill-of-rights`
2. Verify the "messy" CTA link appears at the bottom of the main page
3. Click the link — should land on `/recipes/bill-of-rights/messy`
4. Submit the form with all three fields — verify it saves (entry appears in the "vorherige Einträge" list below)
5. Submit a second entry — verify both appear, newest first
6. Submit with empty `messy_when` — verify the error banner shows
7. Check mobile layout at ~375px viewport