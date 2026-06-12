# Phase 4: Inner Critic Cleansers & Gamification

> Ziel: Die drei "Quick Win" Cleanser-Tools, Promise Keeper mit Streaks, und ein vollwertiges Dashboard.
>
> Geschätzte Dauer: 1 Woche
>
> Voraussetzung: Phase 2 abgeschlossen (Phase 3 ist hilfreich aber nicht zwingend)

---

## Schritt 4.1: Zusätzliche Datenbank-Tabellen

### Manuell (Supabase SQL Editor)

```sql
-- Promises (Cleanser #2)
CREATE TABLE promises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  target_days INTEGER DEFAULT 30,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE promises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own promises"
  ON promises FOR ALL USING (auth.uid() = user_id);

-- Promise completions (history)
CREATE TABLE promise_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id UUID REFERENCES promises(id) ON DELETE CASCADE,
  completed_date DATE DEFAULT CURRENT_DATE,
  UNIQUE(promise_id, completed_date)
);

ALTER TABLE promise_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own promise completions"
  ON promise_completions FOR ALL USING (
    promise_id IN (SELECT id FROM promises WHERE user_id = auth.uid())
  );
```

---

## Schritt 4.2: Cleanser #1 — "I am not for everyone" Mantra

### Claude Code Prompt

```
Build Cleanser #1 at app/(app)/cleansers/mantra/page.tsx:

1. A full-screen, calm card displaying the mantra "Ich bin nicht für jeden" 
   in large serif font (use font-family: var(--font-serif) equivalent / 
   a nice serif Tailwind class)

2. Below it, a swipeable/clickable carousel of 3-4 example situations from 
   the cookbook (rephrased in German), each showing: the overthinking 
   thought -> the reframe ending in "...ich bin nicht für jeden."

3. A "Heute reflektiert" button that:
   - Logs today's date to a simple daily_checkins-style mechanism, OR 
     reuses the daily_checkins table by adding a boolean/jsonb field 
     - propose the simplest approach
   - Shows a streak counter ("X Tage in Folge")
   - Disabled/shows "Schon erledigt heute" if already done today

Calm, minimal design - this should feel like a 30-second breather, not 
a task.
```

> Hinweis an Claude Code im Prompt mitgeben, falls nötig: Falls eine neue Spalte in `daily_checkins` ergänzt werden soll, soll Claude Code dir das SQL dafür ausgeben, das du manuell im Supabase SQL Editor ausführst.

---

## Schritt 4.3: Cleanser #2 — Self-Promise Keeper

### Claude Code Prompt

```
Build Cleanser #2 (Self-Promise Keeper) at app/(app)/cleansers/promises/page.tsx:

1. "Neues Promise erstellen" flow:
   - Guided form following the cookbook's specificity advice: instead of 
     a single text field, guide the user with hints/placeholder examples 
     ("z.B. 'Ich gehe an Homeoffice-Tagen direkt nach der Arbeit 30 Min im 
     Park spazieren'")
   - Fields: description (textarea with the guidance above), target_days 
     (default 30, can choose 7/14/30)
   - Save to promises table

2. Active promises list: each as a card showing:
   - Description
   - Current streak (flame icon + number)
   - A 30-day progress visualization (e.g. a row of small squares/dots, 
     filled = completed day, based on promise_completions)
   - "Heute erledigt" button (toggles a promise_completions row for today, 
     updates current_streak and longest_streak accordingly - increment if 
     yesterday was also completed or it's the first day, otherwise reset 
     streak to 1)

3. Streak celebration: when current_streak hits 7, 14, or 30, show a 
   congratulatory modal/toast (shadcn Dialog) with encouraging copy.

4. Allow marking a promise as inactive ("Promise beenden").

Mobile-first, the streak visualization is the emotional core of this 
feature - make it satisfying.
```

---

## Schritt 4.4: Cleanser #3 — Show Stopper Confidence

### Claude Code Prompt

```
Build Cleanser #3 at app/(app)/cleansers/confidence/page.tsx:

1. A list of 5 exercise cards based on the cookbook's "Show Stopper 
   Confidence" techniques, each expandable/clickable to show details:
   - "Pause-Knopf" (Hit the Pause Button)
   - "Ich weiß es nicht" (Admit you don't know)
   - "Nicht 'nur'" (Don't say "just")
   - "Stimme kontrollieren" (Voice control)
   - "Inneren Caveman trainieren" (Exercise your inner caveman)

2. For "Inneren Caveman trainieren", build an interactive breathing exercise:
   - 4-7-8 breathing technique with a visual breathing circle that expands 
     (4s), holds (7s), and contracts (8s), with text labels "Einatmen" / 
     "Halten" / "Ausatmen"
   - Use CSS animations (@keyframes) for the circle scaling, synced to the 
     timing
   - A "Start" button that runs through 4 cycles, then shows "Geschafft!"

Each exercise card should have a brief German description (1-2 sentences, 
based on the cookbook content) before expanding to show the 
exercise/technique itself.
```

---

## Schritt 4.5: Cleansers-Übersichtsseite

### Claude Code Prompt

```
Build app/(app)/cleansers/page.tsx as an overview/hub:

A grid of 3 cards linking to the three cleansers (mantra, promises, 
confidence), each with:
- An icon (lucide-react)
- Title and one-line description
- For "promises": show count of active promises and best current streak
- For "mantra": show current streak if any

Mobile-first card grid, this page should feel like a "quick tools" 
toolbox - inviting for a 30-second visit.
```

---

## Schritt 4.6: Dashboard (Daily Check-in + Übersicht)

### Claude Code Prompt

```
Build out the main dashboard at app/(app)/dashboard/page.tsx:

1. Greeting header: "Hey [name]!" with current date

2. Daily mood check-in widget:
   - 5 emoji buttons (1-5 scale) 
   - On tap, save/update today's daily_checkins row (mood_score)
   - Show a small message based on the score (encouraging regardless of 
     the value - no judgment on "bad" moods)
   - If already checked in today, show the selected mood as already chosen

3. "Aktuelles Recipe" card:
   - Shows the user's active_recipe_id (from profiles) with progress 
     (current_step from user_recipe_progress)
   - "Weitermachen" button linking to the right recipe page
   - If no active recipe or completed, suggest the next one

4. "Heutiges Recht" card:
   - Picks one random entry from the user's bill_of_rights.rights array 
     (if any exist) and displays it as a daily affirmation
   - Deterministic per day (e.g. based on day-of-year modulo array length) 
     so it doesn't change on every page reload

5. Streak summary row: small stat cards showing 
   - Current journaling streak (consecutive days with any journal_entries)
   - Best promise streak (from promises table)
   - Mantra streak (if implemented)

6. Quick links row to the 3 cleansers (small icon buttons)

Mobile-first, this is the "home base" - should feel calm but motivating, 
not overwhelming. Use a card-based layout with generous spacing.
```

---

## Schritt 4.7: Profile-Seite

### Claude Code Prompt

```
Build app/(app)/profile/page.tsx:

1. Show user info (name, email - email from Supabase auth.user())
2. "Meine Werte" section: show current values_hypothesis (latest version) 
   as badges
3. "Mein Bill of Rights" section: link to the full list
4. Stats overview: total journal entries, recipes completed, longest 
   promise streak, days since joining
5. "Logout" button (Supabase signOut, redirect to /login)
6. Optional: "Daten exportieren" button that generates a JSON download of 
   all the user's journal_entries, values_hypothesis, and bill_of_rights 
   (client-side blob download, no backend needed)

Simple, clean settings-page feel.
```

---

## Schritt 4.8: Testen & Deployen

### Manuell

```bash
npm run dev
```

Teste:
1. Dashboard zeigt Mood-Checkin, aktuelles Recipe, "Heutiges Recht"
2. Alle 3 Cleanser funktionieren, Promise Keeper Streak zählt korrekt hoch (am besten testen, indem du `last_completed` manuell im Supabase Table Editor auf "gestern" setzt und prüfst, ob der Streak beim nächsten "Heute erledigt" korrekt weiterzählt)
3. Profile zeigt korrekte Stats und Logout funktioniert

### Commit & Push

```bash
git add .
git commit -m "Phase 4: Cleansers, promise keeper, dashboard, profile"
git push
```

---

## Checkliste Phase 4

- [ ] Tabellen `promises`, `promise_completions` angelegt
- [ ] Cleanser #1 (Mantra) mit Streak funktioniert
- [ ] Cleanser #2 (Promise Keeper) mit Streak-Logik und Celebrations funktioniert
- [ ] Cleanser #3 (Confidence) inkl. 4-7-8 Atemübung funktioniert
- [ ] Cleansers-Übersicht zeigt alle drei
- [ ] Dashboard zeigt Mood-Checkin, aktives Recipe, "Heutiges Recht", Streaks
- [ ] Profile-Seite mit Stats und Logout
- [ ] Live auf Vercel getestet

→ Weiter mit **Phase 5: PWA & Polish**
