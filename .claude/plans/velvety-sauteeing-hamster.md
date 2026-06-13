# Onboarding Flow — Implementation Plan

## Context

The app has a full auth flow (signup → redirect to `/onboarding`) and a profile-guarded layout (`(app)/layout.tsx` checks `onboarding_completed`). But the onboarding page itself doesn't exist yet — users hit a 404 after signup. This plan builds the 3-step onboarding quiz and wires it to Supabase.

Two structural issues need solving:
1. The `(app)/layout.tsx` redirects all users with `onboarding_completed = false` to `/onboarding`, which means it also redirects *while on* `/onboarding` — a redirect loop. The layout needs to skip this guard for the onboarding page itself.
2. `@base-ui/react/slider` and `@base-ui/react/radio-group` are installed in node_modules but have no shadcn-style wrapper components — we need thin wrappers so the page can use them cleanly.

## Files to Create

### 1. `app/(app)/onboarding/page.tsx` — The onboarding page (client component)
- **3-step internal state** via `useState<'reason' | 'confidence' | 'name'>`
- **Progress indicator** at top: "Schritt 1 von 3" etc., with a thin bar
- **Step 1**: "Was bringt dich hierher?" — 4 cards (single select), each with an icon. Selected state uses primary color / ring.
- **Step 2**: "Wie sicher fühlst du dich gerade?" — Slider 1–10 with labels at ends, current value shown. Warm text about "it's ok to be where you are".
- **Step 3**: "Wie möchtest du genannt werden?" — Input pre-filled from `full_name` in user metadata (if available via a lightweight server data fetch or passed from the layout)
- **Submit button** on step 3 calls the server action
- All text in German, warm/encouraging tone
- Uses: `useActionState` (same pattern as signup page)

### 2. `app/(app)/onboarding/onboarding.actions.ts` — Server action
- Reads `formData` fields: `reason`, `confidenceBaseline`, `name`
- Creates Supabase server client, gets current user
- Updates `profiles` row:
  - `name`
  - `confidence_baseline` (integer)
  - `active_recipe_id` (mapped from reason — see mapping below)
  - `onboarding_completed = true`
- Redirects to `/dashboard` on success
- Returns `{ error }` on failure (same `AuthState` pattern as `auth.actions.ts`)

**Recipe mapping:**
| Step 1 answer | `active_recipe_id` |
|---|---|
| "know-myself" (Ich möchte mich besser kennenlernen) | `"values"` |
| "struggle-say-no" (Mir fällt es schwer, Nein zu sagen) | `"overthinking"` *(MVP fallback — no Recipe #4 yet)* |
| "overthink" (Ich denke über alles zu viel nach) | `"overthinking"` |
| "more-confidence" (Ich möchte insgesamt selbstbewusster werden) | `"values"` |

### 3. `components/ui/slider.tsx` — Slider shadcn component (new)
- Wraps `@base-ui/react/slider`
- Follows the same pattern as existing shadcn wrappers (e.g., `progress.tsx`)
- Props: `value`, `onValueChange`, `min`, `max`, `className`
- Renders: `SliderRoot` → `SliderTrack` → `SliderIndicator` + `SliderThumb`
- Styled: `h-1.5 rounded-full`, thumb is `size-4 rounded-full bg-primary`

### 4. `components/ui/radio-group.tsx` — RadioGroup shadcn component (new)
- Wraps `@base-ui/react/radio-group`
- Exports `RadioGroup` (as root), `RadioGroupItem` (each option), `RadioGroupLabel`
- Each item renders as a styled card-like option with radio indicator
- Props pass through base-ui types

## Files to Modify

### 5. `app/(app)/layout.tsx` — Fix redirect loop
- Import `headers()` from `next/headers`
- Before the onboarding redirect check, read `headers().get("next-url")` and skip redirect if path is `/onboarding`
- This prevents the infinite loop while keeping the guard for all other routes

## Data Flow
```
Signup → redirect(/onboarding) → Layout checks auth ✓ → 
  Layout checks onboarding_completed → false, but path is /onboarding → skip redirect →
  Onboarding page renders → User completes 3 steps →
  Server action updates profiles → redirect(/dashboard) →
  Layout checks onboarding_completed → true → renders dashboard
```

## Verification
1. Navigate to `/onboarding` as an unauthenticated user → should redirect to `/login`
2. Navigate to `/onboarding` as an authenticated but un-onboarded user → should see the 3-step quiz
3. Complete all 3 steps → verify redirect to `/dashboard`
4. Verify `profiles` table has updated `name`, `confidence_baseline`, `active_recipe_id`, `onboarding_completed`
5. Navigate to `/onboarding` again → should redirect to `/dashboard` (layout guard catches it)
6. Test on mobile viewport (~375px) for layout