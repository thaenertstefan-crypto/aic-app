# Anti Imposter Club — App Development Plan

> Turning the AIC Cookbook & Inner Critic Cleansers into an interactive, AI-powered self-development companion.

---

## 1. Vision & Core Idea

### Warum eine App statt eBook?

| eBook | App |
|---|---|
| Passiv – man liest und vergisst | Aktiv – tägliche Interaktion, Prompts, Reminder |
| Kein Tracking | Streaks, Fortschritt, Muster sichtbar machen |
| Statische Journaling-Templates | Smarte Prompts, die auf deinen Kontext eingehen |
| Einmaliger Kauf, wenig Engagement | Wiederkehrendes Habit-Loop |
| Kein Feedback auf Eingaben | AI-Coach analysiert Einträge und gibt Insights |

### Der USP der AIC App

Die App macht genau das, was das Cookbook beschreibt – aber interaktiv:

- **Recipe #1 (Values)** wird zu einem echten 7-Tage-Experiment mit täglichen Check-ins, automatischen Erinnerungen und KI-Mustererkennung
- **Recipe #5 (Overthinking)** wird zu einem geführten 6-Schritt-Wizard – man gibt sein Problem ein, die App führt einen durch jeden Level
- **Bill of Rights** wird zu einer lebendigen Sammlung, die als Widget auf dem Homescreen erscheint
- **Inner Critic Cleansers** werden zu Quick-Access-Tools, die man in 30 Sekunden aufrufen kann

---

## 2. Feature-Übersicht

### 2.1 Core Modules (aus den Workbooks)

#### Recipe Module (6 interaktive Guided Exercises)

**Recipe #1 – Values Discovery**
- Values Hypothesis Builder (5 Values auswählen aus Value Bank)
- 7-Tage-Journaling-Zyklus mit täglichen Prompts (Was ist passiert? Wie reagiert?)
- Evaluation Template am Ende der Woche
- KI analysiert Einträge → "Diese Themen tauchen immer wieder auf..."
- Zyklus-Wiederholung mit angepasster Hypothesis
- Visualisierung: "Deine top 5 Values basierend auf 14 Tagen"

**Recipe #2 – Wants Discovery**
- Yin & Yang Self-Audit (interaktives Formular mit Prompts)
- "Little Bets" Liste mit Aktivitätstracker
- Journal Template nach jeder Little Bet
- Community-Integration später möglich: "Andere AIC Members versuchen das auch gerade"

**Recipe #3 – Bill of Rights**
- Guided Reflection über Konfliktsituationen der letzten Woche
- KI-Hilfe: Aus "ich wollte Nein sagen aber..." → "Ich habe das Recht zu..."
- Persönliches Bill of Rights (editierbar, mit Reminder)
- "Things got messy" Journal
- Widget/Reminder: Jeden Morgen 1 zufälliges Right einblenden

**Recipe #4 – Saying No Blueprint**
- Interaktiver Leitfaden (Layer 1–4)
- Szenario-Üben: "Stell dir vor, dein Nachbar fragt..."
- KI gibt Feedback auf deine formulierten No-Sätze
- Quick Reference Card (als Widget speicherbar)

**Recipe #5 – Dismantling Overthinking**
- Killer-Feature: Guided Wizard
  1. Pattern Interrupt: Timer mit "STOP" (laut sagen)
  2. 5x Why-Kaskade (interaktiv, jede Ebene fragt tiefer)
  3. "Was wenn ich falsch liege?" Prompts
  4. Geführte Entscheidungsfindung
- KI coacht durch den Prozess

**Recipe #6 – Shadow Journal**
- Freies, unstrukturiertes Journaling (safe space)
- "Rage Walk Mode": Sprachaufnahme (Web Speech API) → automatische Transkription
- Optional: KI fasst nach dem Venting zusammen: "Das beschäftigt dich wirklich"
- Einträge sind privat und nicht mit der AI synchronisiert (Vertrauen!)

#### Inner Critic Cleansers

**Cleanser #1 – "I am not for everyone"**
- Tages-Challenge Card
- Streak wenn man täglich einige Sekunden bewusst reflektiert
- Situationsbeispiele zum Durchswipen

**Cleanser #2 – Self-Promise Keeper**
- 30-Tage Promise Tracker
- Spezifische Promise formulieren (guided)
- Daily Completion Check-in
- Streak-Anzeige
- Celebration bei 7, 14, 30 Tagen

**Cleanser #3 – Show Stopper Confidence**
- 5 Exercises als geführte Cards
- Breathing Exercise mit Timer (4-7-8 Technik)
- "Flex & Release" Guided Exercise

### 2.2 AI Coach Layer

Der AI Coach ist das Herzstück der App-Differenzierung. Er wird durch Claude API angetrieben:

**Journal Analysis (automatisch, im Hintergrund)**
- Nach 7 Tagen Values-Journaling: "Diese Themen tauchen immer wieder auf – könnte das dein Wert X sein?"
- Muster-Erkennung über Wochen hinweg
- Inkrementelle Insights, nicht sofort alles auf einmal

**Recipe Coach (kontextuell)**
- System Prompt kennt das aktuelle Recipe und den Fortschritt
- Hilft bei der Formulierung von Bill of Rights Einträgen
- Führt durch den Overthinking Wizard

**Chat Coach (on-demand)**
- Offener Chat, der den gesamten Kontext kennt (Values, Bill of Rights, aktuelles Recipe)
- Nicht als Therapie positionieren – als "Lernpartner"

### 2.3 Gamification & Habits

- **Daily Check-in**: Mood (1–5) + aktuell aktives Recipe
- **Streaks**: Journaling, Promise Keeper, Daily Check-in
- **Recipe Completion Badges**
- **Progress Dashboard**: Values entdeckt, Rights formuliert, Bets platziert, Promises gehalten

---

## 3. Tech Stack

### Empfehlung: Next.js + Supabase + Anthropic API

**Warum diese Kombination?**

- **Next.js 16 (App Router)**: Optimal für Claude Code – klare Datei-Struktur, Server Actions, API Routes direkt in der App
- **Supabase**: All-in-One Backend (DB + Auth + Storage + Realtime) – perfekt für Solo-Dev, exzellente DX
- **Anthropic API**: Der AI Coach ist eine Kernfunktion, nicht ein Add-on
- **TailwindCSS + shadcn/ui**: Schnell, konsistent, gut dokumentiert
- **Vercel**: Deployment in einem Klick, kostenlos für persönliche Projekte

### Full Tech Stack

```
Frontend:       Next.js 16 (App Router)
Styling:        TailwindCSS + shadcn/ui
State:          Zustand (leichtgewichtig) + React Query (Server State)
Auth:           Supabase Auth (Email + Google/Apple optional)
Database:       Supabase PostgreSQL
Storage:        Supabase Storage (für Sprachaufnahmen wenn relevant)
AI:             Anthropic API (claude-sonnet-4-6 oder claude-haiku-4-5 für schnelle Calls)
Notifications:  next-pwa + Web Push Notifications
Deployment:     Vercel
Analytics:      Vercel Analytics (kostenlos)
```

### Warum Web-first + PWA statt React Native?

1. **Claude Code arbeitet besser mit Web-Code** – React Native hat mehr Edge Cases
2. **Snelleres Iterieren** – kein Build-Prozess, sofort testen
3. **PWA reicht für diesen Use Case** – Offline-Support, Home Screen Icon, Push Notifications
4. **Später**: Supabase Backend bleibt identisch, React Native App kann darauf aufgesetzt werden

---

## 4. Database Schema (Supabase)

```sql
-- ===========================
-- PROFILES (via Supabase Auth)
-- ===========================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  confidence_baseline INTEGER, -- 1-10 Score aus Onboarding
  active_recipe_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- RECIPE PROGRESS
-- ===========================
CREATE TABLE user_recipe_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  recipe_slug TEXT, -- 'values', 'wants', 'bill-of-rights', 'saying-no', 'overthinking', 'shadow'
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cycle_number INTEGER DEFAULT 1 -- Für Recipe #1 (mehrere Testzyklen)
);

-- ===========================
-- JOURNAL ENTRIES (Kern der App)
-- ===========================
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  recipe_slug TEXT,
  template_type TEXT, -- 'daily_value', 'value_eval', 'yin_yang', 'little_bet', 'bill_of_rights', 'messy_moment', 'shadow', 'overthinking', 'free'
  content JSONB, -- flexibel pro Template
  ai_insights TEXT, -- von AI Coach generiert (optional)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content-Struktur Beispiele (JSONB):
-- daily_value: { happenings: "...", responses: "...", emotions: "..." }
-- value_eval: { positive_moments: [], negative_moments: [], themes: [] }
-- overthinking: { problem: "...", why_levels: [], wrong_question: "...", decision: "..." }

-- ===========================
-- VALUES
-- ===========================
CREATE TABLE values_hypothesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  values JSONB, -- ["Enthusiasm", "Authenticity", ...]
  version INTEGER DEFAULT 1,
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- BILL OF RIGHTS
-- ===========================
CREATE TABLE bill_of_rights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  rights JSONB, -- [{ id: "...", text: "Ich habe das Recht zu...", active: true }]
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- LITTLE BETS (Recipe #2)
-- ===========================
CREATE TABLE little_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  description TEXT,
  reason TEXT,
  status TEXT DEFAULT 'planned', -- 'planned', 'tried', 'ongoing', 'dropped'
  reflections JSONB, -- { liked: "...", disliked: "...", vibe: "...", changed_wants: "..." }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- PROMISES (Inner Critic Cleanser #2)
-- ===========================
CREATE TABLE promises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  description TEXT, -- spezifisch formuliert
  start_date DATE,
  target_days INTEGER DEFAULT 30,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE promise_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id UUID REFERENCES promises(id),
  completed_date DATE DEFAULT CURRENT_DATE
);

-- ===========================
-- DAILY CHECK-INS
-- ===========================
CREATE TABLE daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  date DATE DEFAULT CURRENT_DATE,
  mood_score INTEGER, -- 1-5
  notes TEXT,
  active_recipe_slug TEXT,
  UNIQUE(user_id, date)
);

-- ===========================
-- ROW LEVEL SECURITY (WICHTIG!)
-- ===========================
-- Jede Tabelle braucht RLS Policy:
-- ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only see own entries"
--   ON journal_entries FOR ALL
--   USING (auth.uid() = user_id);
```

---

## 5. Folder Structure (Next.js)

```
/aic-app
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/                    # Protected routes
│   │   ├── layout.tsx            # Bottom Nav + Auth check
│   │   ├── dashboard/page.tsx    # Daily check-in, streak, active recipe
│   │   ├── recipes/
│   │   │   ├── page.tsx          # Recipe overview
│   │   │   └── [slug]/
│   │   │       ├── page.tsx      # Recipe intro
│   │   │       └── [step]/
│   │   │           └── page.tsx  # Interactive step
│   │   ├── journal/
│   │   │   ├── page.tsx          # Journal hub
│   │   │   └── [entryId]/page.tsx
│   │   ├── values/page.tsx       # Values profile
│   │   ├── bill-of-rights/page.tsx
│   │   ├── cleansers/
│   │   │   ├── mantra/page.tsx
│   │   │   ├── promises/page.tsx
│   │   │   └── confidence/page.tsx
│   │   ├── coach/page.tsx        # AI Coach Chat
│   │   └── progress/page.tsx
│   └── api/
│       ├── journal-analysis/route.ts    # Analysiert Einträge → Values patterns
│       ├── coach/route.ts               # Streaming AI Coach Chat
│       ├── rights-formulator/route.ts   # Situation → "Ich habe das Recht zu..."
│       └── overthinking-guide/route.ts  # Guided Why-Cascade
├── components/
│   ├── ui/                       # shadcn components
│   ├── recipes/
│   │   ├── RecipeCard.tsx
│   │   ├── StepNavigator.tsx
│   │   └── steps/
│   │       ├── ValuesStep.tsx
│   │       ├── OverthinkingWizard.tsx
│   │       └── ShadowJournal.tsx
│   ├── journal/
│   │   ├── JournalEditor.tsx
│   │   └── templates/            # Je ein Component pro Template-Typ
│   ├── dashboard/
│   │   ├── MoodCheckIn.tsx
│   │   ├── StreakCard.tsx
│   │   └── ActiveRecipeCard.tsx
│   └── coach/
│       └── CoachChat.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client (für Server Components)
│   │   └── database.types.ts     # Auto-generated types
│   ├── anthropic/
│   │   ├── client.ts
│   │   ├── prompts/              # System prompts pro Use Case
│   │   │   ├── journal-analysis.ts
│   │   │   ├── coach.ts
│   │   │   └── overthinking.ts
│   │   └── helpers.ts
│   ├── hooks/
│   │   ├── useRecipeProgress.ts
│   │   ├── useJournal.ts
│   │   ├── useStreak.ts
│   │   └── usePromises.ts
│   └── utils/
│       ├── recipes.ts            # Recipe definitions + step configs
│       └── values-bank.ts        # Die Value Bank aus dem Cookbook
└── types/
    └── index.ts
```

---

## 6. Claude Code Implementation — Schritt-für-Schritt

### Phase 1: Foundation (ca. 1 Woche)

**Woche 1 – Setup & Auth:**
```
Claude Code Prompt-Sequenz:
1. "Create a Next.js 16 project with Supabase auth, TailwindCSS and shadcn/ui. 
   Set up email auth with login and signup pages."

2. "Create the Supabase schema for profiles, user_recipe_progress, and daily_checkins 
   tables with RLS policies."

3. "Build a mobile-friendly bottom navigation with: Dashboard, Recipes, Journal, 
   Cleansers, Profile tabs."

4. "Create the onboarding flow: 3-question quiz (current struggles with confidence),
   then redirect to recommended recipe."
```

### Phase 2: Recipe Modules (ca. 2 Wochen)

**Woche 2–3 – Die 3 wichtigsten Recipes zuerst:**

Recipe #1 (Values) – das komplexeste, zuerst bauen:
```
"Build Recipe #1 (Values Discovery) as a multi-step interactive module:
- Step 1: Values Hypothesis Builder with selectable chips from a values bank
- Step 2: Daily journal template (7-day loop) with morning reminder
- Step 3: Evaluation template with reflection prompts
- Step 4: Hypothesis comparison UI
Store all entries in Supabase journal_entries with template_type='daily_value'"
```

Recipe #5 (Overthinking) – sofort nutzbarer Wizard:
```
"Build the Overthinking Dismantler as a 6-step wizard component:
- Step 1: Pattern interrupt (5-second countdown timer)
- Step 2-5: Progressive 'Why?' questions that deepen each level
- Step 6: Better vs worse problem comparison
- Decision output screen
Make it feel like a guided meditation app, not a form."
```

Recipe #3 (Bill of Rights):
```
"Build the Bill of Rights module:
- Reflection journal template for inner conflict situations
- 'Imagined freedom' reframe prompt  
- Rights builder: input → formats as 'I have the right to...'
- Personal Bill of Rights list (add/edit/delete/reorder)
- Daily random right reminder system"
```

### Phase 3: AI Integration (ca. 1 Woche)

**Woche 4 – Claude API einbinden:**

```typescript
// app/api/journal-analysis/route.ts
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const { entries, existingValues } = await req.json()
  
  const client = new Anthropic()
  
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', // Haiku für schnelle/günstige Analyse
    max_tokens: 1000,
    system: `You are a warm, insightful self-development coach analyzing journal entries 
    to help identify a person's core values. Be specific, use their own words back to them, 
    and suggest 2-3 concrete value hypotheses based on patterns you see. 
    Always be encouraging and frame insights as discoveries, not diagnoses.`,
    messages: [{
      role: 'user',
      content: `Here are my journal entries from the past week:
      ${entries.map(e => `Date: ${e.created_at}\nHappenings: ${e.content.happenings}\nResponse: ${e.content.responses}`).join('\n\n')}
      
      My current values hypothesis: ${existingValues.join(', ')}
      
      What patterns do you see? Which values seem to be showing up consistently?`
    }]
  })
  
  return Response.json({ insights: response.content[0].text })
}
```

**Overthinking Wizard mit KI-Unterstützung:**
```
Strategie: Haiku für schnelle Why-Level-Hilfe,
Sonnet für tiefere Analyse auf Level 4-5
```

### Phase 4: Inner Critic Cleansers + Gamification (ca. 1 Woche)

**Woche 5:**
```
"Build the Promise Keeper tracker:
- Create/edit promise with specificity guidance (where/when/what)
- Daily check-in button  
- Streak counter with celebration animations at 7/14/30 days
- 30-day progress ring
Store in promises and promise_completions tables"

"Build the Dashboard with:
- Daily mood check-in (1-5 emoji scale)
- Current streak card
- Active recipe progress bar
- Quick access to 3 cleansers
- 'Todays right': random Bill of Rights entry"
```

---

## 7. Sub-Agents / Skills für Claude Code

**Lohnt es sich?** Für diese App-Größe: **Ja, aber keep it simple.**

### Empfohlene Strategie: Custom Instructions + Modular Prompts

Statt komplexer Sub-Agent-Frameworks: **Strukturierte System Prompts pro Task**.

**Option A: Claude Code Custom Instructions (in .claude/)**

```markdown
# .claude/CLAUDE.md
## AIC App Context
- Next.js 16 App Router with Supabase
- All DB calls go through /lib/supabase/
- All AI calls go through /lib/anthropic/
- Mobile-first design (375px min-width)
- Journal entries always use template_type to identify the template

## Component Conventions
- Journal templates: /components/journal/templates/[TemplateName].tsx
- Each template receives onSave(content: Record<string, string>) callback
- Recipe steps: /components/recipes/steps/[RecipeName].tsx
```

**Option B: Spezialisierte API-Routen als "Micro-Agents"**

```
/api/journal-analysis       → Analysiert Muster, erkennt Values
/api/rights-formulator      → Situation → "Ich habe das Recht zu..."
/api/overthinking-guide     → Geführte Why-Kaskade
/api/coach                  → Genereller Chat mit vollem User-Kontext
```

Jede Route hat ihren eigenen, spezialisierten System-Prompt. Das ist praktischer als ein großer generischer Coach.

**Option C: Für spätere Skalierung – Vercel AI SDK**

```typescript
// Ermöglicht Streaming + Tool Use in Next.js
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

// Mit Tools: Coach kann auf User-Daten zugreifen
const tools = {
  getUserValues: tool({ description: 'Get users confirmed values', ... }),
  getBillOfRights: tool({ description: 'Get users bill of rights', ... }),
}
```

---

## 8. MVP Scope

**Was du in 4-5 Wochen mit Claude Code realistisch bauen kannst:**

### MVP (Version 1.0)
- [ ] Auth (Email Login/Signup)
- [ ] Onboarding Quiz
- [ ] Dashboard mit Daily Check-in
- [ ] Recipe #1 (Values) – komplett mit 7-Tage Zyklus
- [ ] Recipe #5 (Overthinking Wizard) – der meiste WOW-Faktor
- [ ] Recipe #3 (Bill of Rights) – Foundation-Rezept
- [ ] Journal Hub (alle Einträge einsehbar)
- [ ] Inner Critic Cleanser #2 (Promise Keeper mit Streak)
- [ ] KI-Journal-Analyse (nach 7 Tagen Values-Journal)
- [ ] PWA Setup (Offline-fähig, Home Screen)

### V1.1 – Nice to have
- [ ] Recipe #2 (Wants + Little Bets)
- [ ] Recipe #4 (Saying No Blueprint)
- [ ] Recipe #6 (Shadow Journal + Rage Walk Mode)
- [ ] AI Coach Chat
- [ ] Cleansers #1 und #3

### V2.0 – Wenn's Spaß macht
- [ ] React Native App (gleiches Supabase Backend!)
- [ ] Push Notifications
- [ ] Progress Analytics Dashboard
- [ ] Community Features (opt-in)

---

## 9. Erste Schritte mit Claude Code

```bash
# 1. Projekt anlegen
npx create-next-app@latest aic-app --typescript --tailwind --app

# 2. Dependencies
cd aic-app
npm install @supabase/supabase-js @supabase/ssr
npm install @anthropic-ai/sdk
npm install zustand @tanstack/react-query
npx shadcn@latest init

# 3. Supabase Setup
# → supabase.com → neues Projekt → Schema aus Plan oben einfügen

# 4. .env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
```

**Erster Claude Code Prompt:**
```
"I'm building the Anti Imposter Club app - a self-development companion 
that turns workbook exercises into interactive guided modules. 

Tech stack: Next.js 16 App Router, Supabase (auth + db), TailwindCSS, shadcn/ui.

Please set up:
1. Supabase client (browser + server)
2. Auth middleware (protect /app routes)  
3. Login/signup pages
4. A basic profile creation on first login

Project is in /aic-app. Start with the Supabase setup files."
```

---

## 10. Monetization (Optional, für später)

Falls du das irgendwann monetarisieren möchtest:

| Modell | Beschreibung |
|---|---|
| **Free tier** | Recipe #1 (Values) + Basic Journaling ohne AI |
| **Premium (€4.99/Monat)** | Alle 6 Recipes + AI Coach + Insights + Cleansers |
| **One-time (€19.99)** | Lifetime access – passt zum "anti-subscription" Ethos |

**Supabase + Stripe**: Gibt eine exzellente Integration, kann später einfach dazugefügt werden. Für den Start: einfach alles kostenlos und feedback sammeln.

---

## Zusammenfassung

Das Projekt ist gut umsetzbar weil:
1. **Content ist schon da** – die 6 Recipes + Cleansers sind fertig strukturiert
2. **Klare Datenstrukturen** – die Journaling-Templates definieren fast das ganze DB-Schema
3. **MVP ist fokussiert** – Recipe #1, #3, #5 + Overthinking Wizard geben sofort Mehrwert
4. **Claude Code arbeitet gut mit Next.js + Supabase** – das ist one of the best-documented stacks

Der einzige echte Knackpunkt ist die **AI-Kosten-Kontrolle**: Rate Limits einbauen, Haiku für einfache Analyse nutzen, Sonnet nur für tiefere Coach-Gespräche. Aber das ist ein V1.1-Problem.

Viel Erfolg – das wird eine wirklich coole App. 🍳
