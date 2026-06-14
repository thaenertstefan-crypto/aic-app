# Build Step 1 of Recipe #1 (Values Discovery) — Hypothesis Page

## Context

Recipe #1 ("Deine Werte entdecken") is the first interactive recipe. Step 1 is the **values hypothesis** page where users pick 5 core values from a bank of ~78 values. This is the first real step after starting a recipe — no step page infrastructure exists yet. The `values_hypothesis` table is defined in docs but doesn't exist in Supabase yet.

## Files to Create

### 1. `lib/utils/values-bank.ts`
A simple array export containing the 78 values (German-friendly names as given in the cookbook). No types needed beyond `string[]`.

```typescript
export const VALUES_BANK: string[] = [
  "Kindness", "Adventurousness", "Growth", "Gratitude", ...
];
```

### 2. `app/(app)/recipes/values/actions.ts`
Server actions for the values recipe steps.

**`saveHypothesisAction`** — the main action:
- Reads `values` (JSON string) from FormData
- Creates supabase server client, gets user
- **Upserts into `values_hypothesis`** — checks for existing row where `user_id = auth.uid()` and `version = 1`; if exists, updates `values`; if not, inserts new row with `values`, `version: 1`, `confirmed: false`
- **Upserts into `user_recipe_progress`** — checks for existing row where `user_id = auth.uid()` and `recipe_slug = 'values'` (highest cycle_number); if exists, updates `current_step: 2`, `status: 'in_progress'`; if not, inserts new row with `current_step: 2`, `status: 'in_progress'`, `cycle_number: 1`
- Follows existing pattern: `"use server"`, `RecipeActionState` return type, error handling in German, `redirect("/recipes/values/journal")` on success

### 3. `app/(app)/recipes/values/hypothesis/page.tsx`
A **client component** ("use client") — the interactive hypothesis page.

**State:**
- `selectedValues: string[]` — max 5
- `customValue: string` — text input for custom value
- `error: string | null` — display error from server action

**Layout (mobile-first, p-4 padding):**
- `PageHeader` with title "Deine Werte entdecken" and subtitle-like intro text
- **Intro text** (warm German): "Wähl 5 Werte aus, die sich gerade jetzt echt für dich anfühlen — nicht zu viel nachdenken, einfach fühlen."
- **Chip grid**: `flex flex-wrap gap-2`. Each value is a `<button>` styled as a chip/badge:
  - Default: `rounded-full border px-3 py-1 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300`
  - Selected: `rounded-full border px-3 py-1 text-sm bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-200 font-medium`
  - Toggle on click: add/remove from `selectedValues`. If already 5 selected and clicking an unselected one, do nothing (or brief haptic feedback)
- **Counter**: "Nicht überdenken — vertrau deinem Bauchgefühl" above chips; `{selectedValues.length}/5 ausgewählt` below chips
- **Custom value input**: shown when `selectedValues.length < 5`. Label: "Eigenen Wert hinzufügen". A small text input + "+" button. On add, pushes to `selectedValues` (if < 5).
- **Submit button**: Primary button, disabled until `selectedValues.length === 5`. Text: "Weiter zum Tagebuch"
- **No data-loading state** — this is a pure client-side form with no initial fetch

**On submit:**
- Calls `saveHypothesisAction` via form action
- On server redirect, the user lands on Step 2 (`/recipes/values/journal/`)

## Database: `values_hypothesis` Table

Must be created in Supabase SQL Editor **before** the code runs:

```sql
CREATE TABLE values_hypothesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  values JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE values_hypothesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own values"
  ON values_hypothesis
  FOR ALL
  USING (auth.uid() = user_id);
```

No TypeScript types needed for this table — the Supabase JS client infers from the query builder; we pass `values` as a JSON array directly.

## Key Design Decisions

1. **Client component for the page** — chip selection is interactive (toggle state, counter, custom input). A server component shell with a client sub-component would also work, but for a single-step page a pure client component is simpler and the norm in this codebase (see onboarding page).

2. **Upsert pattern** — the action handles both first-time and redo cases: if user already has a version-1 hypothesis, we update rather than insert duplicate; if progress already exists, we advance rather than fail.

3. **Custom value via text input + button** — not a free-form textarea. Users pick from the bank OR add their own one-at-a-time. Custom values are appended to the same `selectedValues` array.

4. **No initial fetch** — the hypothesis page starts blank. The user has no prior state to load. (Version 1 is always a new selection.)

## Verification

1. Run the SQL to create `values_hypothesis` table in Supabase dashboard
2. Run `npm run dev` and navigate to `/recipes/values` — start the recipe
3. Manually visit `/recipes/values/hypothesis` — verify chips render, selection works, counter updates
4. Pick exactly 5 values, click submit — verify redirect to `/recipes/values/journal` (404 at first, which is expected since Step 2 doesn't exist yet)
5. Check Supabase table `values_hypothesis` — verify row with correct `values` array and `version: 1`
6. Check `user_recipe_progress` — verify `current_step: 2` for recipe_slug 'values'