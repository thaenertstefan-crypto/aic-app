# Phase 2: Recipe-Module (#1 Values, #5 Overthinking, #3 Bill of Rights)

> Ziel: Die drei wichtigsten Recipes als interaktive Module bauen, inkl. Datenbank-Tabellen und Journal-Templates.
>
> Geschätzte Dauer: 1.5-2 Wochen
>
> Voraussetzung: Phase 1 abgeschlossen

---

## Schritt 2.1: Zusätzliche Datenbank-Tabellen

### Manuell (Supabase SQL Editor)

```sql
-- Recipe progress tracking
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

-- Journal entries (used by all recipes)
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_slug TEXT,
  template_type TEXT NOT NULL,
  entry_date DATE DEFAULT CURRENT_DATE, -- used for daily-entry uniqueness checks (e.g. Recipe #1)
  content JSONB NOT NULL,
  ai_insights TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal entries"
  ON journal_entries FOR ALL USING (auth.uid() = user_id);

-- Values hypothesis (Recipe #1)
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
  ON values_hypothesis FOR ALL USING (auth.uid() = user_id);

-- Bill of Rights (Recipe #3)
CREATE TABLE bill_of_rights (
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

Prüfen im Table Editor, dass alle 4 Tabellen angelegt wurden.

---

## Schritt 2.2: Recipe-Übersichtsseite & Datenmodell

### Claude Code Prompt

```
Create the recipe system foundation for this Next.js app:

1. Create lib/utils/recipes.ts with a constant array RECIPES containing 
   metadata for all 6 recipes (slug, title, description, icon name from 
   lucide-react, estimated duration). For now, only recipes 1, 3, and 5 
   should be marked as available=true, the rest available=false 
   ("Coming soon"):
   - values (Recipe #1: "Deine Werte entdecken")
   - wants (Recipe #2: "Was du wirklich willst")
   - bill-of-rights (Recipe #3: "Dein Bill of Rights")
   - saying-no (Recipe #4: "Nein sagen lernen")
   - overthinking (Recipe #5: "Grübelspiralen durchbrechen")
   - shadow (Recipe #6: "Deine Schattenseite")

2. Build app/(app)/recipes/page.tsx: a grid of recipe cards (shadcn Card), 
   showing title, description, duration, and a progress badge if the user 
   has started it (fetch from user_recipe_progress). For recipes that can 
   have multiple cycles (currently only 'values'), always use the row with 
   the highest cycle_number when determining progress/status. Cards for 
   available=false recipes are visually muted with a "Coming soon" badge 
   and not clickable.

3. Each available recipe card links to app/(app)/recipes/[slug]/page.tsx 
   - for now just a placeholder showing the recipe title and description, 
   with a "Start" or "Continue" button that creates/updates a row in 
   user_recipe_progress.

4. The [slug]/page.tsx route should also handle slugs that are valid 
   (exist in RECIPES) but not yet available, or unknown entirely: show a 
   friendly "Dieses Recipe ist noch nicht verfügbar" message with a link 
   back to /recipes, instead of a broken page or 404. This matters because 
   profiles.active_recipe_id could in theory point to a not-yet-available 
   recipe.

Mobile-first, warm and encouraging tone.

Note: This project uses Next.js 16 - in app/(app)/recipes/[slug]/page.tsx, 
`params` is a Promise and must be awaited (e.g. `const { slug } = await params`).
```

---

## Schritt 2.3: Recipe #1 — Values Discovery

Dies ist das komplexeste Recipe. Wir bauen es in Teilschritten.

### Claude Code Prompt 2.3a — Values Hypothesis Builder

```
Build Step 1 of Recipe #1 (Values Discovery) at 
app/(app)/recipes/values/hypothesis/page.tsx:

1. Create lib/utils/values-bank.ts containing the array of values from the 
   AIC Cookbook's "Value Bank" (Kindness, Adventurousness, Growth, Gratitude, 
   Empathy, Balance, Courage, Resilience, Quality-Relationships, 
   Time-management, Optimism, Curiosity, Mindfulness, Patience, Authenticity, 
   Intention, Appreciation, Diligence, Joy, Honesty, Integrity, Harmony, 
   Celebration, Open-mindedness, Forgiveness, Purpose, Passion, Enthusiasm, 
   Learning, Positivity, Responsibility, Generosity, Community, Advocacy, 
   Accountability, Excellence, Innovation, Benevolence, Assertiveness, 
   Simplicity, Humor, Real-Connection, Solitude, Service, Fitness, 
   Growth-mindset, Quality, Environmentalism, Hard-work, Bravery, 
   Mindful-speech, Commitment, Education, Philanthropy, Boldness, Altruism, 
   Letting-go, Self-compassion, Empowerment, Minimalism, Inclusivity, 
   Creativity, Courteousness, Adaptability, Experiences, Work-life-balance, 
   Rest, Wisdom, Beauty, Open-expression, Graciousness, Constructiveness, 
   Connection, Pragmatism, Diversity, Humility, Self-discipline, 
   Spirituality, Physical-health, Resourcefulness)

2. Build a page that:
   - Explains briefly: "Pick 5 values that feel true to you right now - 
     don't overthink it" (short intro text based on the cookbook's framing)
   - Shows the values as clickable chips/badges in a flex-wrap layout, 
     also allow a custom value via text input
   - User selects exactly 5
   - On submit: save to values_hypothesis table (values: array of 5 strings, 
     version: 1), update user_recipe_progress (recipe_slug: 'values', 
     current_step: 2, status: 'in_progress', started_at: now)
   - Redirect to app/(app)/recipes/values/journal/page.tsx

Mobile-first, the chip selection should feel satisfying (selected state 
clearly visible, counter showing "3/5 selected").
```

### Claude Code Prompt 2.3b — 7-Tage Journal-Loop

```
Build the daily journaling step of Recipe #1 at 
app/(app)/recipes/values/journal/page.tsx:

1. Show the user's current values hypothesis (from values_hypothesis table) 
   as a reminder at the top, in a small card.

2. Show a 7-day progress tracker (7 dots/circles, filled if an entry exists 
   for that day in journal_entries where recipe_slug='values' and 
   template_type='daily_value', counting from started_at).

3. A journal form for "today" (or the next missing day) with two textareas:
   - "Was ist heute passiert?" (happenings)
   - "Welche Gedanken, Gefühle, Reaktionen kamen dabei auf?" (response)
   On submit, save as a journal_entries row with 
   content: { happenings, response }, template_type: 'daily_value', 
   entry_date: today's date.

4. If today's entry already exists (check by entry_date = today, 
   user_id, template_type='daily_value'), show it (read-only) with an 
   "Edit" option, and don't allow creating a second entry for the same 
   entry_date.

5. Once 7 entries exist, show a prominent CTA "Zur Auswertung" linking to 
   app/(app)/recipes/values/evaluation/page.tsx, and update 
   user_recipe_progress.current_step to 3.

Encouraging microcopy, mobile-first, the daily entry should feel like a 
quick, low-friction ritual (not a chore).
```

### Claude Code Prompt 2.3c — Evaluation & Hypothesis-Vergleich

```
Build the evaluation step of Recipe #1 at 
app/(app)/recipes/values/evaluation/page.tsx:

1. Fetch all 7 daily_value journal entries for the current cycle.

2. Show two reflection textareas based on the cookbook's evaluation template:
   - "Welche Momente haben dich diese Woche positiv gestimmt - und warum? 
     Was war dir in diesen Momenten wichtig?"
   - "Welche Momente haben dich gestresst oder genervt - und warum? 
     Was wurde dabei verletzt oder vernachlässigt?"
   Save these as a journal_entries row, template_type: 'value_eval', 
   content: { positive_reflection, negative_reflection }.

3. After saving, show a summary screen:
   - The user's original 5 values (from values_hypothesis)
   - A simple UI to adjust the hypothesis: for each of the 5 values, 
     a "Keep" / "Replace" toggle. Replaced values can be picked from the 
     values bank or entered freely. User can also add additional values 
     (not limited to 5 anymore, per the cookbook).
   - On submit: create a NEW row in values_hypothesis with version+1, 
     containing the adjusted list. Mark user_recipe_progress as 
     status='completed', completed_at=now (cycle 1). 
   - Offer two CTAs: "Neuen 7-Tage-Zyklus starten" (creates new 
     user_recipe_progress row with cycle_number+1, status='in_progress', 
     redirects to journal page) or "Fertig für jetzt" (redirects to 
     /recipes).

Mobile-first, this page should feel like a meaningful "reveal" moment.
```

---

## Schritt 2.4: Recipe #5 — Overthinking Wizard

### Claude Code Prompt

```
Build Recipe #5 (Dismantling Overthinking) as a guided wizard at 
app/(app)/recipes/overthinking/page.tsx:

This is a single-page multi-step wizard using useState for step management 
(steps 1-6), NOT separate routes - it should feel like a guided flow/meditation.

Step 1 - Pattern Interrupt:
- Big centered text: "Sag laut 'Stop!' oder zähl rückwärts von 5"
- A 5-second countdown animation (circular progress)
- "Weiter" button appears after countdown completes

Step 2-5 - The "Why?" Cascade:
- Step 2: Textarea "Was ist dein Problem (an der Oberfläche)?"
- Step 3: Textarea, label dynamically shows "Warum [user's step 2 answer, 
  lowercased]?" 
- Step 4: same pattern, referencing step 3's answer
- Step 5: same pattern, referencing step 4's answer
- Each step shows the previous answers collapsed above as a visual "ladder" 
  going deeper

Step 6 - Reframe:
- Two textareas: "Was, wenn du falsch liegst?" and "Was würde es bedeuten, 
  wenn du falsch liegst?"
- Then a two-column comparison: "Aktuelles Problem (wenn du nichts änderst)" 
  vs "Neues Problem (wenn du handelst)" - both textareas
- Final textarea: "Deine Entscheidung"

On final submit:
- Save everything as one journal_entries row, template_type: 'overthinking', 
  content: { problem, why_levels: [step3, step4, step5], what_if_wrong, 
  what_it_would_mean, current_problem, new_problem, decision }
- Show a calming "completion" screen with the user's decision highlighted, 
  and a button back to /recipes

Design: This should feel calm and guided, like a meditation app - generous 
whitespace, one question at a time, smooth transitions between steps 
(can use simple CSS transitions), progress dots at top (6 steps).
```

---

## Schritt 2.5: Recipe #3 — Bill of Rights

### Claude Code Prompt 2.5a — Reflection & Rights Builder

```
Build Recipe #3 (Bill of Rights) at app/(app)/recipes/bill-of-rights/page.tsx:

1. Intro section explaining the concept briefly (based on cookbook framing: 
   "Inner rules shape your behavior - let's discover and rewrite yours")

2. A reflection form (journal_entries, template_type: 'bill_of_rights'):
   - "Was ist diese Woche passiert, wo du einen inneren Konflikt gespürt 
     hast?" (textarea)
   - "Welche innere Regel hat dich dabei zurückgehalten?" (textarea)
   - "Wie würdest du handeln, wenn du frei von Angst, Schuld und Zweifel 
     wärst?" (textarea)

3. Below the form, a "Right Builder":
   - Based on the last textarea's content, show a text input pre-filled 
     with "Ich habe das Recht, " + suggest the user complete the sentence
   - "Hinzufügen" button adds this to their Bill of Rights list (stored in 
     bill_of_rights table, rights: JSONB array of {id, text, active})

4. Show the user's current Bill of Rights as an editable list below 
   (add/edit/delete/reorder via drag or up/down buttons). Show a few example 
   rights from the cookbook as inspiration if the list is empty (as 
   non-clickable suggestion chips the user can tap to add).

5. Mark user_recipe_progress as 'in_progress' on first save, 'completed' 
   once the user has at least 3 rights.

Mobile-first, the Bill of Rights list should feel like a personal manifesto 
- give it some visual weight (numbered list, nice typography).
```

### Claude Code Prompt 2.5b — "Things got messy" Journal

```
Add a secondary view to the Bill of Rights recipe at 
app/(app)/recipes/bill-of-rights/messy/page.tsx:

A simple journal form (journal_entries, template_type: 'messy_moment'):
- "Wann ist es diese Woche 'messy' geworden - wann bist du nicht nach 
  deinem Bill of Rights gegangen?" (textarea)
- "Welche Regel(n) waren im Konflikt miteinander?" (textarea)  
- "War die Schuld, die du gefühlt hast, gesunde oder ungesunde Schuld?" 
  (radio: gesund / ungesund / bin mir nicht sicher)

List previous entries below the form (most recent first), each showing 
the date and a short preview.

Add a link/button to this page from the main Bill of Rights page 
("Es ist mal wieder messy geworden? Hier reflektieren →").
```

---

## Schritt 2.6: Journal Hub (Übersicht aller Einträge)

### Claude Code Prompt

```
Build the Journal Hub at app/(app)/journal/page.tsx:

1. Fetch all journal_entries for the current user, ordered by created_at desc
2. Group/display them as a chronological list of cards, each showing:
   - An icon based on template_type (different icon per type)
   - A human-readable label for the template_type 
     (e.g. 'daily_value' -> "Werte-Tagebuch", 'overthinking' -> 
     "Grübelspirale durchbrochen", 'bill_of_rights' -> "Bill of Rights 
     Reflexion", etc.)
   - The date
   - A short preview (first ~80 chars of the first text field in content)
3. Tapping a card opens a detail view (modal or separate page) showing 
   the full entry content, nicely formatted per template_type.
4. Add a filter/tab bar at top to filter by recipe_slug or template_type.
5. Empty state: friendly message encouraging the user to start a recipe.

Mobile-first, this is essentially the user's personal growth diary - 
make it feel meaningful, not like a database table.
```

---

## Schritt 2.7: Testen & Deployen

### Manuell

```bash
npm run dev
```

Durchlaufe als Test-User:
1. Recipe #1 komplett: Hypothesis → 7x Journal-Eintrag (du kannst für's Testen mehrere Einträge am selben Tag erlauben oder die Datums-Logik temporär umgehen, dann später wieder aktivieren) → Evaluation
2. Recipe #5 komplett durchklicken
3. Recipe #3: Reflection + mind. 3 Rights anlegen + 1 "messy" Eintrag
4. Journal Hub: alle Einträge sichtbar?

### Commit & Push

```bash
git add .
git commit -m "Phase 2: Recipe modules 1, 3, 5 + journal hub"
git push
```

---

## Checkliste Phase 2

- [ ] Tabellen `user_recipe_progress`, `journal_entries`, `values_hypothesis`, `bill_of_rights` angelegt
- [ ] Recipe-Übersichtsseite zeigt alle 6 Recipes (3 aktiv, 3 "Coming soon")
- [ ] Recipe #1: Hypothesis Builder, 7-Tage-Journal, Evaluation funktionieren end-to-end
- [ ] Recipe #5: Overthinking Wizard läuft durch alle 6 Schritte
- [ ] Recipe #3: Reflection, Rights Builder, Bill of Rights Liste, "Things got messy"
- [ ] Journal Hub zeigt alle Einträge mit Filter
- [ ] Live auf Vercel getestet

→ Weiter mit **Phase 3: AI-Integration**
