# Plan: Recipe System Foundation

## Context

The app needs a recipe system — a hub showing 6 self-development modules ("Rezepte") as cards, with 3 available now and 3 marked "Coming Soon". Each available recipe needs a detail page with a Start/Continue action. Currently `app/(app)/recipes/page.tsx` is just a placeholder with a PageHeader; all recipe infrastructure needs to be built from scratch.

## Prerequisite: Database Table

Before the code works, create the `user_recipe_progress` table in Supabase SQL Editor:

```sql
CREATE TABLE user_recipe_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_slug TEXT NOT NULL,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cycle_number INTEGER DEFAULT 1,
  UNIQUE(user_id, recipe_slug, cycle_number)
);

ALTER TABLE user_recipe_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recipe progress"
  ON user_recipe_progress FOR ALL USING (auth.uid() = user_id);
```

## Files to Create/Modify

### 1. `lib/utils/recipes.ts` — Recipe metadata

Export a typed `RECIPES` array (readonly) with 6 recipes. Each entry: `slug`, `title`, `description`, `icon` (lucide icon name string like `"Heart"`), `duration` (string like `"7–14 Tage"`), `available` (boolean). Recipes 1, 3, 5 are `available: true`; 2, 4, 6 are `available: false`.

Also export a helper `getRecipeBySlug(slug: string)` that returns the matching recipe or undefined, and a `Recipe` type.

### 2. `app/(app)/recipes/actions.ts` — Server action

A `"use server"` file with one action:
- `startOrContinueRecipeAction(formData: FormData)` — creates a row in `user_recipe_progress` if none exists for that user/slug, or updates status to `in_progress` if it was `not_started`. Uses `supabase.from("user_recipe_progress").upsert()` or insert-on-conflict logic. Redirects to the recipe detail page via `redirect()`.

### 3. `app/(app)/recipes/page.tsx` — Recipe grid (replace placeholder)

**Server component** (async). Fetches:
- Current user via `supabase.auth.getUser()`
- All `user_recipe_progress` rows for that user, grouped by `recipe_slug`, picking highest `cycle_number` per slug

Renders:
- `PageHeader` with title "Rezepte" and encouraging description
- A responsive grid: 1 column on mobile, `sm:grid-cols-2` on tablet+
- For each recipe in `RECIPES`:
  - A **Card** with:
    - Icon (from lucide-react, rendered as the component) in a subtle accent circle
    - `CardTitle` with recipe title
    - `CardDescription` truncated
    - Duration indicator (clock icon + text)
    - If `available: false`: card is visually muted (`opacity-50`), has a "Bald verfügbar" badge (`Badge variant="outline"`), not clickable
    - If `available: true` and user has progress: shows status badge ("In Arbeit" / "Abgeschlossen") and links to `[slug]`
    - If `available: true` and no progress: shows a subtle "Neu" indicator, links to `[slug]`
  - Cards are wrapped in `<Link>` when available, `<div>` when not

### 4. `app/(app)/recipes/[slug]/page.tsx` — Recipe detail page

Create directory `app/(app)/recipes/[slug]/` with a `page.tsx`.

**Server component** (async):
1. `const { slug } = await params` (Next.js 16: params is a Promise)
2. Look up slug in `RECIPES` via `getRecipeBySlug()`
3. Three cases:
   - **Unknown slug**: Show friendly message "Dieses Rezept existiert nicht." with `<Link>` back to `/recipes`
   - **Known but not available**: Show friendly message "Dieses Rezept ist noch nicht verfügbar." with link back
   - **Available**: Show recipe title (`font-heading`, large), description, duration, and a `<form>` with `action={startOrContinueRecipeAction}` containing a hidden input for `recipeSlug`. The button text ("Starten" / "Fortsetzen") is determined server-side by checking `user_recipe_progress`. The page also fetches the user's name from `profiles` for a warm greeting like "Hey {name}, bereit für ...?"

## Key Patterns to Follow

- **All user-facing text is German**, warm/encouraging tone, informal "du"
- **Mobile-first**: single column grid on mobile, only go to 2 columns on `sm:`
- **shadcn Card** with `data-slot` attributes, `size="sm"` for compact cards
- **Icons**: import specific lucide-react components by name at the top of the page file and map from string names
- **No try/catch** — follow existing codebase pattern (errors propagate naturally)
- **`cn()`** utility from `@/lib/utils` for className merging
- **Badge** from `@/components/ui/badge` for status indicators
- **Button** — use the existing shadcn button, no custom styling

## Verification

1. Run `npm run dev` and navigate to `/recipes`
2. Verify all 6 cards render: 3 with full opacity and clickable, 3 muted with "Bald verfügbar"
3. Click an available recipe → should navigate to `/[slug]` page showing title + Start button
4. Click "Starten" → form submits, redirects back to same page → button now shows "Fortsetzen"
5. Navigate to `/recipes/unknown-slug` → shows friendly error with link back
6. Navigate to `/recipes/wants` (exists but not available) → shows "nicht verfügbar" message
7. Check mobile viewport (~375px): single column, readable