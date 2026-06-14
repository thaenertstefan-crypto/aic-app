# Build Recipe #3: Bill of Rights

## Context

Recipe #3 ("Dein Bill of Rights") is already listed in `lib/utils/recipes.ts` with `available: true`, so it appears on the recipe grid and the `/recipes/bill-of-rights` slug route works — but the page content doesn't exist yet. Starting the recipe via the `/recipes/[slug]` page redirects to `/recipes/bill-of-rights`, which will 404. This plan creates the actual recipe page and its backing data infrastructure.

The recipe has two conceptual parts:
1. **Reflection** — journal entry with 3 prompts about inner conflicts, stored as `journal_entries` (template_type: `bill_of_rights`)
2. **Right Builder** — collect/edit/reorder personal rights, stored in `bill_of_rights` table (rights: JSONB array of `{id, text, active}`)

Progress is tracked: `in_progress` on first save, `completed` once the user has at least 3 rights.

---

## What we're building

A single-page client component at `app/(app)/recipes/bill-of-rights/page.tsx` with:

1. **Intro section** — brief explanation: "Innere Regeln shape your behavior — let's discover and rewrite yours"
2. **Reflection form** — 3 textareas (journal_entries, template_type: `bill_of_rights`)
3. **Right Builder** — text input pre-filled with "Ich habe das Recht, " + "Hinzufügen" button → adds to rights list
4. **Rights list** — numbered, editable list with edit/delete/reorder (up/down buttons). Empty-state suggestion chips from cookbook examples.
5. **Progress & completion** — marks `in_progress` on first save, `completed` at 3+ rights

---

## Files to create

### 1. `app/(app)/recipes/bill-of-rights/actions.ts`
Server actions for this recipe, following the overthinking pattern:

- **`saveReflectionAction`** — upserts `journal_entries` with `template_type: 'bill_of_rights'` and content `{ prompt1, prompt2, prompt3 }`. Sets `user_recipe_progress` status to `in_progress` if `not_started`. Returns `{ error, success }`.
- **`saveRightsAction`** — upserts `bill_of_rights` row with the full `rights` array (client sends the entire list on each change). If rights.length >= 3, marks `user_recipe_progress` as `completed` with `completed_at`. Returns `{ error, success }`.
- **`getBillOfRightsData`** — async server query (can be imported in page too) that fetches the journal entry + bill_of_rights row + progress. Called from the page.

### 2. `app/(app)/recipes/bill-of-rights/page.tsx`
Single client component ("use client") — no multi-step wizard, all content on one scrollable page:

**Data loading** — `useEffect` on mount fetches existing data (journal entry, rights list, progress status).

**Sections (top to bottom):**

1. **Header** — "Dein Bill of Rights" + subtitle about inner rules shaping behavior (warm German, "du" form)

2. **Reflection Form** (Card):
   - 3 textareas with labels:
     - "Was ist diese Woche passiert, wo du einen inneren Konflikt gespürt hast?"
     - "Welche innere Regel hat dich dabei zurückgehalten?"
     - "Wie würdest du handeln, wenn du frei von Angst, Schuld und Zweifel wärst?"
   - "Reflexion speichern" button → calls `saveReflectionAction`
   - On first save, marks `user_recipe_progress` as `in_progress`

3. **Right Builder**:
   - Text input pre-filled with "Ich habe das Recht, " — user completes the sentence
   - "Hinzufügen" button → generates UUID, creates `{ id, text, active: true }`, adds to local state, triggers `saveRightsAction`

4. **Rights List** (the "personal manifesto"):
   - Numbered list (1. 2. 3. ...) with nice typography (`font-heading`, larger text)
   - Each item shows the right text with an active toggle, edit button, delete button
   - Up/Down arrow buttons for reordering
   - Edit mode: inline text input replacing the display text
   - Visual weight: serif font, subtle background per row, border-left accent
   - If rights list is empty: show 3-4 example rights as clickable suggestion chips (non-clickable look, but tapping adds them):
     - "Ich habe das Recht, meine eigenen Bedürfnisse ernst zu nehmen."
     - "Ich habe das Recht, Nein zu sagen, ohne mich zu rechtfertigen."
     - "Ich habe das Recht, Fehler zu machen und daraus zu lernen."
     - "Ich habe das Recht, meine eigenen Grenzen zu setzen."

5. **Progress bar / Completion** — subtle indicator showing "X von 3 Rechten" → once 3+ rights, show completion state with green checkmark and "Abgeschlossen!" badge.

**Layout constraints:**
- Mobile-first, `max-w-lg` centered
- `px-4 py-6` padding, same as overthinking
- Sections separated by generous spacing (`gap-8` or `space-y-8`)

### 3. SQL migration (`supabase/migrations/YYYYMMDDHHMMSS_create_bill_of_rights.sql`)
New migration file (or manual SQL instructions) to create the `bill_of_rights` table:

```sql
CREATE TABLE IF NOT EXISTS bill_of_rights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rights JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bill_of_rights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bill of rights"
  ON bill_of_rights FOR ALL USING (auth.uid() = user_id);
```

Also verify these tables exist (they may already from previous recipes):
- `user_recipe_progress`
- `journal_entries`

---

## Key patterns to follow (from overthinking recipe)

- **Server action pattern**: `"use server"`, get user via `supabase.auth.getUser()`, upsert pattern (check existing → update or insert), return `{ error, success }`
- **UI pattern**: `flex min-h-svh flex-col px-4 py-6`, inner `mx-auto w-full max-w-lg`
- **Error handling**: `rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive` banner
- **Card component**: `Card size="sm"` with `CardContent`
- **Loading state**: Skeleton or simple "Lade..." text while data fetches

## Not building (deferred)
- The "Things got messy" (`messy/page.tsx`) sub-page — mentioned in docs but not requested
- Drag-to-reorder — up/down buttons only (simpler, mobile-friendly)

---

## Verification

1. Navigate to `/recipes/bill-of-rights` — page renders with intro, empty form, suggestion chips
2. Fill out reflection form, save — data persists in `journal_entries`, progress becomes `in_progress`
3. Add rights via the builder — they appear in the list, persist in `bill_of_rights`
4. Edit a right inline — changes persist
5. Delete a right — removed from list
6. Reorder with up/down — order changes
7. Add 3+ rights — progress updates to `completed`
8. Refresh page — all data loads correctly from DB