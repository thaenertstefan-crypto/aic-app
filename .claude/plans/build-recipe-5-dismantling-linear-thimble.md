# Build Recipe #5: Dismantling Overthinking (guided wizard)

## Context

Recipe #5 ("Grübelspiralen durchbrechen") is already defined in `lib/utils/recipes.ts` with `available: true` and slug `"overthinking"`. Clicking through from the recipe detail page (`/recipes/overthinking`) currently has no wizard page — the [slug]/page.tsx redirects there but nothing renders.

The recipe is a **single-session guided exercise** (15 min, one-shot, no cycles). It needs a multi-step wizard page, not multi-route steps like the Values recipe. This plan builds that page and the associated server action.

## Files to create

### 1. `app/(app)/recipes/overthinking/actions.ts`
Server action to save the completed exercise as a `journal_entries` row (`template_type: 'overthinking'`) and mark `user_recipe_progress` as completed + advance `current_step`.

**Content shape (JSONB):**
```json
{
  "problem": "Antwort aus Schritt 2",
  "why_levels": ["Antwort Schritt 3", "Antwort Schritt 4", "Antwort Schritt 5"],
  "what_if_wrong": "Antwort aus Schritt 6a",
  "what_it_would_mean": "Antwort aus Schritt 6b",
  "current_problem": "Aktuelles Problem (Schritt 6c)",
  "new_problem": "Neues Problem (Schritt 6d)",
  "decision": "Entscheidung (Schritt 6e)"
}
```

**Action:** `saveOverthinkingAction(prevState, formData)` — reads all fields from FormData, upserts into `journal_entries` (by user_id + recipe_slug='overthinking' + template_type='overthinking'), updates progress to `{ current_step: 6, status: 'completed', completed_at: now }`, returns success so client shows completion screen. Wrapper `saveOverthinking(formData)` for plain form usage.

### 2. `app/(app)/recipes/overthinking/page.tsx`
A single-page **client component** (`"use client"`) with `useState` for step management (1-6). NOT separate routes.

#### State shape
```ts
const [step, setStep] = useState(1);
const [answers, setAnswers] = useState({
  step2: "", step3: "", step4: "", step5: "",
  whatIfWrong: "", whatItWouldMean: "",
  currentProblem: "", newProblem: "", decision: "",
});
const [countdownDone, setCountdownDone] = useState(false); // step 1 only
const [submitting, setSubmitting] = useState(false);
const [saved, setSaved] = useState(false); // completion state
```

#### Step-by-step breakdown

**Step 1 — Pattern Interrupt** (`step === 1`)
- Big centered text: `"Sag laut 'Stop!' oder zähl rückwärts von 5"` (font-heading, text-2xl sm:text-3xl)
- Circular countdown: SVG circle + `stroke-dasharray` animation driven by `useEffect` with `requestAnimationFrame` over 5 seconds (number shown in center)
- After 5s: `countdownDone = true`, "Weiter" button fades in (CSS transition opacity)
- Before countdown: text in muted color, after countdown: text in warm/accent color

**Steps 2–5 — The "Why?" Cascade**
- Step 2: Label "Was ist dein Problem (an der Oberfläche)?" + Textarea
- Step 3: Label `Warum [answers.step2.toLowerCase()]?` + Textarea
- Step 4: Label `Warum [answers.step3.toLowerCase()]?` + Textarea
- Step 5: Label `Warum [answers.step4.toLowerCase()]?` + Textarea
- Each step shows a "ladder" above: collapsed `<details>` elements or small muted cards showing the chain of previous answers (e.g. "Problem: X → Warum X? → Warum Y?"). This gives users a visual sense of going deeper.
- "Zurück" and "Weiter" buttons at bottom. "Zurück" is disabled outline variant; "Weiter" validates that textarea has content (show subtle error if empty). "Weiter" saves the answer into state.
- Transition: previous step content slides out (opacity 0, translateY), next step slides in (opacity 1, translateY 0) — CSS transitions via a wrapper div that toggles classes.

**Step 6 — Reframe**
- Two textareas side by side on larger screens (stacked on mobile):
  1. "Was, wenn du falsch liegst?"
  2. "Was würde es bedeuten, wenn du falsch liegst?"
- Two-column comparison (stacked on mobile):
  1. "Aktuelles Problem" — pre-filled with `answers.step2` but editable
  2. "Neues Problem" — empty Textarea
- Final textarea: "Deine Entscheidung"
- "Abschließen" submit button → calls server action

**States per textarea:**
- Empty → show placeholder text, helper text below in muted-foreground
- Filled → normal display
- On attempted submit if empty → red border (aria-invalid) + short error text below

#### Layout
- Outer container: `flex min-h-svh flex-col px-4 py-6`
- Inner: centered `mx-auto w-full max-w-lg` with `flex-1 flex flex-col justify-center`
- Progress dots: 6 dots across top (like `flex justify-center gap-2 mb-8`). Current step = filled dot with accent color, completed = checkmark dot, upcoming = muted outline dot.
- Each step content area: `flex-1 flex flex-col justify-center items-center gap-6` with `transition-all duration-500`
- Bottom navigation: "Zurück" (disabled on step 1, outline variant) + "Weiter"/"Abschließen" (default variant, full width on mobile)

#### Completion screen (when `saved === true`)
- Calming success state: large green checkmark or calming icon (maybe `CheckCircle2` from lucide)
- "Deine Entscheidung" card showing the decision text highlighted (card with warm/accent border)
- Two buttons: "Zurück zur Übersicht" (primary, links to /recipes), "Erneut durchführen" (ghost/outline, resets state)
- Background: very subtle gradient or solid with lots of whitespace

#### Microcopy / Tone
- German, informal "du", warm and encouraging
- Step headers use calming language: "Atme kurz durch", "Kommen wir zur Sache", "Geh noch tiefer", "Der letzte Schritt"
- Error messages: "Magst du das kurz notieren, bevor es weitergeht?"
- Placeholder text for textareas guides gently without leading

#### CSS / Animation
- No external animation library. Pure Tailwind CSS transitions:
  - Step wrapper: `transition-all duration-500 ease-in-out` with opacity + translateY
  - Progress dots: `transition-colors duration-300`
  - Countdown SVG: animated via `useEffect` with `requestAnimationFrame`, updating `stroke-dashoffset`
- Use existing Tailwind classes and shadcn components: `Button`, `Textarea`, `Card`, `CardContent`, `Label`, `Progress` (maybe for countdown alternative)

#### Error / Loading / Edge cases
- **Loading:** Not applicable — no initial data fetch needed (client-side only)
- **Error on submit:** Server action returns error → shown in a banner below the submit button. User can edit and retry without losing their text
- **Browser refresh:** State is lost (this is intentional — it's a one-session meditation). Could add a confirmation dialog on refresh via `beforeunload` if the user has filled any fields, but defer for now
- **Empty textarea on Weiter:** Show inline validation error, don't advance
- **Countdown:** If component unmounts during countdown, cleanup via clearInterval/clearTimeout in useEffect return

## Verification

1. Start the dev server (`npm run dev`)
2. Navigate to `/recipes`, click "Grübelspiralen durchbrechen" card
3. Click "Starten" → redirected to `/recipes/overthinking`
4. Step 1: confirm countdown runs for 5 seconds, "Weiter" appears after
5. Steps 2-5: fill in text, verify labels reference previous answers, verify "ladder" shows above
6. Step 6: fill all textareas, click "Abschließen" → completion screen shown
7. Verify DB has `journal_entries` row with `template_type: 'overthinking'` and correct content
8. Verify `user_recipe_progress` for slug 'overthinking' is marked completed
9. Navigate back to `/recipes` → card shows "Abgeschlossen"
10. Test edge cases: try to advance with empty textarea, refresh mid-wizard