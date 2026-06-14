# Build the Journal Hub

## Context
The Journal Hub at `app/(app)/journal/page.tsx` is currently a static placeholder — it only renders a `PageHeader` with no data. Meanwhile, three live recipes (values, bill-of-rights, overthinking) already write entries into `journal_entries` with 5 different `template_type` values. The user needs a single place to view, filter, and reflect on all their journal entries — their personal growth diary.

## Plan

### New file: `lib/utils/journal.ts`
Centralized template-type config and pure helpers (server-safe, no hooks).

**Exports:**
- `TemplateType` union: `"daily_value" | "value_eval" | "bill_of_rights" | "messy_moment" | "overthinking"`
- `JournalEntryRow` type mirroring DB row: `{ id, user_id, recipe_slug?, template_type, entry_date, content: Record<string, unknown>, ai_insights?, created_at }`
- `JOURNAL_TEMPLATE_MAP: Record<TemplateType, { icon: LucideIcon; label: string; recipeSlug: string }>` — icon **per type** (different per type):
  - `daily_value` → Heart, "Werte-Tagebuch", "values"
  - `value_eval` → Notebook, "Werte-Auswertung", "values"
  - `bill_of_rights` → Shield, "Bill of Rights Reflexion", "bill-of-rights"
  - `messy_moment` → AlertTriangle, "Verletzte Gefühle", "bill-of-rights"
  - `overthinking` → Brain, "Grübelspirale durchbrochen", "overthinking"
- `getJournalConfig(templateType: string)` — safe lookup, falls back to Notebook + raw type name
- `extractPreview(content, maxLen = 80): string` — finds first non-empty string value in JSONB content, handles arrays (e.g. `why_levels` joins first 2)
- `formatDateDE(dateStr: string): string` — `"2026-06-14"` → `"14.6.2026"`
- `getContentSections(templateType, content): { label: string; value: string }[]` — dispatches to per-type formatters for detail view
- `getFilterTabs(): { value: string; label: string; icon: LucideIcon }[]` — **"Alle"**, and one tab per recipe_slug that has entries in the map (values, bill-of-rights, overthinking)

### New file: `components/journal/journal-detail-dialog.tsx`
Client component. Controlled Dialog showing full entry content per template_type.

**Props:** `{ entry: JournalEntryRow; open: boolean; onOpenChange: (open: boolean) => void }`

**Structure:**
- `<Dialog>` (controlled via open/onOpenChange)
- `<DialogContent>`:
  - `<DialogTitle>` = human-readable label from config
  - Date badge below title
  - `<Separator />`
  - Sectioned rendering: loops `getContentSections()` → each section has a label (uppercase, muted, small) + value (whitespace-pre-wrap) or "—" if empty
  - If `ai_insights` present, a small highlighted card at bottom

### New file: `components/journal/journal-hub.tsx`
Client orchestrator component. Receives `entries: JournalEntryRow[]` as prop.

**State:** `selectedFilter` (string, default "all"), `selectedEntry` (JournalEntryRow | null)

**Filter tabs bar:**
- `<Tabs value={selectedFilter} onValueChange={setSelectedFilter} variant="line">`
- `<TabsList className="w-full justify-start overflow-x-auto">` — scrolls horizontally on small screens
- Each tab shows icon + label, matching the recipe icons
- Entry count below: `"{n} Einträge"`

**Card list (when entries match filter):**
- Each card is `<Card size="sm" onClick={() => setSelectedEntry(entry)} className="cursor-pointer transition-shadow hover:shadow-md">`
- Inside: avatar circle with template_type icon, title (label), date (right-aligned), preview text (line-clamp-2)

**Empty state (when no entries match):**
- If filter = "all": warm message "Noch keine Einträge" with CTA button linking to `/recipes`
- If filter = specific recipe: "Noch keine Einträge in dieser Kategorie" with CTA to `/recipes`

**Dialog:** Controlled `<JournalDetailDialog>` gated by `selectedEntry`, rendered at bottom of component tree

### Modified file: `app/(app)/journal/page.tsx`
Convert from static to async server component:

```tsx
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/brand/page-header";
import { JournalHub } from "@/components/journal/journal-hub";
import type { JournalEntryRow } from "@/lib/utils/journal";

export default async function JournalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: entries } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="p-4">
      <PageHeader
        title="Journal"
        description="Deine gesammelten Reflexionen — jeder Eintrag ein Schritt zu mehr Klarheit."
      />
      <JournalHub entries={(entries as JournalEntryRow[]) ?? []} />
    </div>
  );
}
```

## Files to modify (1)
- `app/(app)/journal/page.tsx` — data fetch + render JournalHub

## Files to create (3)
- `lib/utils/journal.ts` — types, config, helpers, formatters
- `components/journal/journal-detail-dialog.tsx` — detail dialog
- `components/journal/journal-hub.tsx` — tabs, cards, filter, empty state

## Design decisions
1. **Controlled dialog** (not DialogTrigger per card) — cleaner state, one dialog instance
2. **Filter by recipe_slug** (not template_type) — users think in recipes, not DB types. The 3 available recipes become filter tabs
3. **All data fetched server-side** — no client-side waterfall. ~tens-to-hundreds of entries fits in one fetch
4. **No URL-based filter state** — keeps it simple; can add search params later

## Verification
1. Visit `/journal` — confirm entries appear as cards with correct icon, label, date, preview
2. Tap a card — confirm dialog opens with full content formatted per template_type
3. Switch filter tabs — confirm list narrows, entry count updates
4. Filter with no matches — confirm empty state with CTA shows
5. Verify on 375px viewport — tabs scroll, cards don't overflow
6. BottomNav "Journal" tab stays highlighted
7. Dialog overlay covers bottom nav (check z-index; dialog overlay uses `z-50`, same as bottom nav — bump dialog overlay to `z-[60]` if needed)