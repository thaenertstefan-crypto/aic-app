# Build Evaluation Step (Step 3) of Recipe #1 — "Deine Werte entdecken"

## Context

Recipe #1 is a 3-step guided module. Steps 1 (hypothesis) and 2 (daily journal) exist and work. The journal form already links to `/recipes/values/evaluation` once 7 entries are complete. This is the **final step** that: shows a reflection journal, lets users adjust their values, completes the cycle, and offers a new cycle or finish.

## Files

| File | Action |
|------|--------|
| `app/(app)/recipes/values/actions.ts` | **Modify** — Add `getEvaluationData`, `saveEvalReflectionAction`, `saveAdjustedHypothesisAction`, `startNewCycleAction` + types |
| `app/(app)/recipes/values/evaluation/page.tsx` | **Create** — Server component, calls `getEvaluationData()`, renders `<EvaluationForm>` |
| `app/(app)/recipes/values/evaluation/evaluation-form.tsx` | **Create** — Client component, 3-phase state machine |

## Architecture

Follows the exact same split as the journal page: thin server page → client form → server actions co-located in `actions.ts`.

## New Server Actions (in `actions.ts`)

### `getEvaluationData()` — fetch all page data

Returns `EvaluationPageData`:
- `hypothesis: string[] | null` — latest values
- `hypothesisVersion: number`
- `entries: JournalEntry[]` — `daily_value` rows for current cycle (scoped by `entry_date >= progress.started_at`)
- `valueEvalEntry: { content: { positive_reflection, negative_reflection } } | null` — existing reflection
- `progress: { id, cycleNumber, startedAt, status } | null`
- `phase: 'reflection' | 'adjust' | 'complete'` — computed server-side

**Phase detection (computed server-side):**

| Condition | Phase |
|---|---|
| `status === 'completed'` or `version > 1` | `'complete'` |
| `valueEvalEntry` exists and `version === 1` | `'adjust'` |
| `valueEvalEntry === null` and `version === 1` | `'reflection'` |

**Edge case:** If `entries.length < 7`, redirect to `/recipes/values/journal`.

### `saveEvalReflectionAction(prevState, formData)` — Phase 1 save

- Reads `positive_reflection`, `negative_reflection` from FormData
- Upserts into `journal_entries` with `template_type: 'value_eval'`
- Returns `{ error: null, success: true }` — **no redirect**, client transitions to adjust phase

### `saveAdjustedHypothesisAction(prevState, formData)` — Phase 2 save

- Reads `values` (JSON string array) and `original_version` from FormData
- Validates: non-empty array of strings
- Inserts NEW `values_hypothesis` row with `version: original_version + 1`, `confirmed: true`
- Updates `user_recipe_progress`: `status='completed'`, `completed_at=now()`
- Calls `revalidatePath()`
- Returns `{ error: null, success: true }` — client transitions to complete phase

### `startNewCycleAction(prevState, formData)` — Phase 3 CTA

- Gets max `cycle_number` from `user_recipe_progress`
- Inserts new row: `recipe_slug='values'`, `current_step=2`, `status='in_progress'`, `cycle_number + 1`, `started_at=now()`
- Calls `redirect("/recipes/values/journal")`

## Component Structure: 3-Phase State Machine

`evaluation-form.tsx` uses a `phase` state variable initialized from `initialData.phase`:

### Phase 1 — "Auswertung" (reflection)

```
Header: "Schritt 3 von 3 — Auswertung"
Subtitle: encouraging text
       
7-day entry summary: collapsible <details> cards, one per journal day
  - Shows truncated happenings/response with "mehr anzeigen"

Reflection form (useActionState → saveEvalReflectionAction):
  Textarea 1: "Welche Momente haben dich diese Woche positiv gestimmt — und warum? Was war dir in diesen Momenten wichtig?" (positive_reflection)
  Textarea 2: "Welche Momente haben dich gestresst oder genervt — und warum? Was wurde dabei verletzt oder vernachlässigt?" (negative_reflection)
  Button: "Reflexion speichern"
```

### Phase 2 — "Deine Werte verfeinern" (adjust)

```
Header: "Deine Werte verfeinern"

For each of the 5 original values:
  Card with value name + "Behalten" / "Ersetzen" toggle
  If "Ersetzen": show chip grid from VALUES_BANK (filtering out already-selected), 
    plus free text input for custom value

"Einen weiteren Wert hinzufügen" button (no limit)

Summary of selected values as chips with counter
Button: "Werte speichern & abschließen" (disabled if < 1 value)

State: isKept[], replacements[], additionalValues[]
Computed finalValues = kept + replaced + added
```

### Phase 3 — "Zyklus abgeschlossen!" (complete)

```
Card (with celebration styling): "🎉 Zyklus abgeschlossen!"
  Shows final adjusted values as chips

Two CTAs:
  [Primary] "Neuen 7-Tage-Zyklus starten" → formAction={startNewCycleAction}
  [Outline] "Fertig für jetzt" → Link to /recipes
```

## States to Handle

| State | Handling |
|-------|----------|
| Loading | Server component blocks until data resolves (same pattern as journal page) |
| < 7 entries | Redirect to journal page |
| Already completed | Phase detection → renders Phase 3 directly |
| Reflection saved but not adjusted | Phase detection → renders Phase 2 |
| Error on save | Inline error banner via `useActionState` error |
| Empty values array | Submit disabled; validation on server |
| Cycle 2+ | Entry scoping by date, hypothesis fetch by highest version |

## Design Notes

- **Mobile-first**: `flex min-h-svh flex-col px-4 py-6` — same pattern as hypothesis and journal pages
- **Tone**: German, warm/encouraging, informal "du"
- **Values bank**: English strings from `lib/utils/values-bank.ts`, displayed as-is
- **Entry scoping**: No `cycle_number` on `journal_entries` — use `.gte("entry_date", progress.started_at)` to scope entries to current cycle
- **No redirect on save**: Phases are on the same page; `useActionState` success flag drives phase transitions
- **Hypothesis versioning**: Insert version+1, never update — preserves history
- **AI slot**: `ai_insights` column exists but is null at this stage; no AI UI in this phase

## Verification

1. `npm run dev` → navigate to `/recipes/values` → complete steps 1+2 → click "Zur Auswertung" from journal
2. Verify Phase 1: 7 entries shown as collapsible cards, two reflection textareas render
3. Save reflection → verify transition to Phase 2
4. Phase 2: toggle Keep/Replace, pick replacements from bank, add a custom value → verify chip UI updates
5. Submit adjusted values → verify Phase 3 renders with final values list
6. Check Supabase: new `values_hypothesis` row with `version: 2`, `user_recipe_progress.status='completed'`
7. Click "Neuen 7-Tage-Zyklus starten" → verify redirect to journal with new cycle progress
8. Click "Fertig für jetzt" → verify redirect to `/recipes`
9. Navigate back to `/recipes/values/evaluation` after completion → verify Phase 3 renders (re-entry safe)