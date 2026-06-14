# Build Daily Journaling Step (Recipe #1 — "values")

## Context

Recipe #1 ("Deine Werte entdecken") is a 3-step guided module:
- **Step 1** (hypothesis) — User picks 5 values → `values_hypothesis` table, redirects to `/recipes/values/journal`
- **Step 2** (journal) — **THIS ONE.** 7-day daily journaling ritual.
- **Step 3** (evaluation) — Not yet built.

The journal page (`values/journal/page.tsx`) does not exist yet. The hypothesis action already redirects there, so this will currently 404. We need to build the full step 2 experience.

## Design

### File changes

| File | Action |
|---|---|
| `app/(app)/recipes/values/journal/page.tsx` | **Create** — Server component that fetches data, renders the journal UI |
| `app/(app)/recipes/values/actions.ts` | **Edit** — Add `saveJournalEntryAction` and `getJournalData` server actions |

### Data flow

1. **Page load** (`page.tsx` — server component):
   - Fetch `values_hypothesis` (latest version for user) → show 5 values as a reminder card
   - Fetch `journal_entries` where `recipe_slug='values'` AND `template_type='daily_value'`, ordered by `entry_date` → build 7-day progress
   - Fetch `user_recipe_progress` for `recipe_slug='values'` → get `started_at` and `current_step`
   - Pass all data as props to a client component (`JournalForm`)

2. **Save entry** (`saveJournalEntryAction`):
   - Receives `{ entry_date, happenings, response }`
   - Checks if entry exists for `(user_id, entry_date, template_type='daily_value')`
   - If exists: update `content`
   - If not: insert new row
   - After save: count entries for this cycle; if ≥7 and `current_step < 3`, update `current_step` to 3

3. **Edit entry**: Same action as save — it's an upsert by `entry_date`.

### Component structure

```
page.tsx (server component — fetches data, renders shell + inline client form)
├── Header (title + encouraging microcopy)
├── Values reminder card (card size="sm")
├── 7-day progress tracker (7 circles, filled if entry exists, today highlighted)
├── Journal form (client-rendered, two textareas)
│   ├── Today's entry exists → read-only view + "Bearbeiten" button
│   └── No entry / editing → form with save button
├── Completion CTA ("Zur Auswertung" link, only when 7 entries exist)
└── Error display
```

### States to handle

| State | UI |
|---|---|
| **Loading initial data** | Skeleton/spinner (server component renders nothing until authenticated, but data fetch happens synchronously — no separate loading state needed in server component) |
| **No entries yet (day 1)** | All 7 dots empty, first one pulsing/active, empty form |
| **In progress (days 2-6)** | Some dots filled, current day's form shown |
| **Today's entry exists** | Read-only text with "Bearbeiten" button |
| **Editing today's entry** | Form pre-filled with current content |
| **All 7 days complete** | All dots filled, form hidden, "Zur Auswertung" CTA prominent |
| **Error on save** | Inline error banner (useActionState pattern) |
| **Edge: past `started_at + 7` but missing days** | Show remaining empty days, allow catching up |

### UX details

- **7-day window**: Calculated from `started_at` in `user_recipe_progress`. Days 0-6 relative to `started_at`. Each dot shows weekday abbreviation (Mo/Di/...).
- **"Today" logic**: The next unfilled day in the sequence, OR today if all previous days have entries. The form always targets the actual current date (`entry_date = today`), not the theoretical day number.
- **Microcopy**: German, warm, encouraging, "du" form. Examples: "Schon wieder ein Tag — leg los.", "Du hast heute schon geschrieben — hier ist dein Eintrag.", "Super! 7 Tage sind voll. Zeit für die Auswertung."
- **Progress dots**: Clickable? No — just visual indicators. The form auto-targets the right day.
- **Edit**: When clicked, the read-only text becomes editable textareas pre-filled with the existing content. Save updates the row.

### Types

No new TypeScript types needed — the content shape for `template_type='daily_value'` is:
```ts
{ happenings: string; response: string }
```

## Verification

1. Run `npm run dev` and navigate to `/recipes/values` → "Starten" → hypothesis page (step 1) → pick 5 values → submit → should land on the journal page (step 2) instead of 404
2. Verify values hypothesis card shows the 5 selected values
3. Verify 7 empty dots, first one highlighted
4. Submit a journal entry → verify in Supabase that `journal_entries` has a new row with `template_type='daily_value'`, correct `content`, `entry_date`
5. Refresh → verify today's entry appears read-only with "Bearbeiten" option
6. Click "Bearbeiten" → edit → save → verify entry updated (not duplicated)
7. Create entries for 7 days (or mock in DB) → verify CTA "Zur Auswertung" appears
8. Verify `user_recipe_progress.current_step` is now 3