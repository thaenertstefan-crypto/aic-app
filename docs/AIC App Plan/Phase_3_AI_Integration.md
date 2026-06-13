# Phase 3: AI-Integration (Claude API)

> Ziel: Die Anthropic API einbinden für Journal-Analyse (Values-Mustererkennung) und optionale Coach-Unterstützung.
>
> Geschätzte Dauer: 3-5 Tage
>
> Voraussetzung: Phase 2 abgeschlossen (insbesondere Recipe #1 mit 7-Tage-Journal)

> ⚠️ **Next.js 16 Hinweis:** In den Route Handlers unten greift ihr über `lib/supabase/server.ts` auf den Supabase Server Client zu, der intern `cookies()` nutzt. In Next.js 16 ist `cookies()` async - das sollte bereits in `lib/supabase/server.ts` aus Phase 1 korrekt mit `await` umgesetzt sein. Solange ihr diese Helper-Funktion verwendet, müsst ihr in den Route Handlers selbst nichts weiter anpassen.


---

## Schritt 3.1: Anthropic SDK einrichten

### Claude Code Prompt

```
Set up the Anthropic API integration for this Next.js project:

1. Install @anthropic-ai/sdk
2. Create lib/anthropic/client.ts exporting a configured Anthropic client 
   instance using process.env.ANTHROPIC_API_KEY
3. Create lib/anthropic/prompts/ directory with a placeholder file 
   journal-analysis.ts that exports a SYSTEM_PROMPT constant (we'll fill 
   this in next)

Make sure ANTHROPIC_API_KEY is referenced only in server-side code 
(API routes / Server Actions), never exposed to the client.
```

### Manuell prüfen

- `.env.local` enthält `ANTHROPIC_API_KEY=...` (sollte aus Phase 1 schon vorhanden sein)
- In Vercel: Settings → Environment Variables → `ANTHROPIC_API_KEY` gesetzt?

---

## Schritt 3.2: Journal-Analyse für Recipe #1 (Values Pattern Detection)

Dies ist das Kern-Feature: Nach 7 Tagen Journaling gibt die KI Insights zu erkannten Mustern.

### Claude Code Prompt

```
Build the AI journal analysis feature for Recipe #1:

1. In lib/anthropic/prompts/journal-analysis.ts, write a SYSTEM_PROMPT for 
   a warm, insightful self-development coach analyzing journal entries to 
   help identify a person's core values. The prompt should instruct the 
   model to:
   - Be specific and reference the user's own words/situations back to them
   - Suggest 2-3 concrete value themes based on patterns across entries
   - Frame insights as gentle discoveries/observations, not diagnoses or 
     advice
   - Keep the response concise (max ~200 words), in German, encouraging tone
   - Never be preachy or use generic self-help phrases

2. Create app/api/journal-analysis/route.ts (POST):
   - Authenticate the user via Supabase server client
   - Fetch the user's journal_entries where recipe_slug='values' and 
     template_type='daily_value' for the current cycle (most recent 7)
   - Fetch the user's current values_hypothesis
   - Call claude-haiku-4-5 with the system prompt and the entries + 
     hypothesis as context
   - Return the response text as JSON: { insights: string }
   - Handle errors gracefully (return a fallback message if the API call 
     fails)

3. On the Recipe #1 evaluation page (app/(app)/recipes/values/evaluation/page.tsx), 
   after the user saves their reflection (from Phase 2), automatically call 
   this API route and display the AI insights in a highlighted card 
   ("Was uns aufgefallen ist...") before showing the hypothesis adjustment UI.
   Show a loading state while waiting (this can take a few seconds).

4. Save the AI response into the journal_entries row's ai_insights column 
   (the value_eval entry created earlier).
```

---

## Schritt 3.3: Rights Formulator (KI-Hilfe für Recipe #3)

### Claude Code Prompt

```
Build the AI-assisted Rights Formulator for Recipe #3:

1. Create lib/anthropic/prompts/rights-formulator.ts with a SYSTEM_PROMPT 
   instructing the model to take a user's description of a situation where 
   they felt held back, and reformulate it as a single "Bill of Rights" 
   statement starting with "Ich habe das Recht, ..." - following the style 
   and spirit of the example rights from the AIC Cookbook (direct, 
   empowering, first-person, one sentence). Output ONLY the sentence, 
   nothing else.

2. Create app/api/rights-formulator/route.ts (POST):
   - Authenticate user
   - Accept { situation: string, idealReaction: string } in the request body
   - Call claude-haiku-4-5 with the system prompt
   - Return { suggestion: string }

3. On the Bill of Rights page, replace the manual text input for the "Right 
   Builder" with: a "Vorschlag generieren" button that calls this API and 
   pre-fills the input with the suggestion. The user can still edit before 
   adding it to their list. Show a loading spinner on the button while 
   waiting.
```

---

## Schritt 3.4: Rate Limiting (Kostenschutz)

> Wichtig, bevor du die App teilst: Ohne Limit könnte ein einzelner Nutzer (versehentlich oder absichtlich) sehr viele API-Calls auslösen.

### Claude Code Prompt

```
Add simple rate limiting to the AI API routes (journal-analysis and 
rights-formulator):

1. Create a new Supabase table `ai_usage_log`:
   - id (uuid, pk), user_id (uuid, fk to profiles), endpoint (text), 
     created_at (timestamptz default now())
   With RLS: users can only insert/select their own rows.
   Provide the SQL migration as a code block I can run in the Supabase SQL 
   editor.

2. In both API routes, before calling the Anthropic API:
   - Count rows in ai_usage_log for this user + endpoint where 
     created_at > now() - interval '1 hour'
   - If count >= 10 (journal-analysis) or >= 20 (rights-formulator), 
     return a 429 response with a friendly error message 
     ("Du hast das stündliche Limit erreicht, versuch's später nochmal")
   - If under the limit, log a new row to ai_usage_log after a successful 
     call

3. On the frontend, handle 429 responses gracefully (show the error message 
   in a toast/alert instead of crashing).
```

### Manuell

Führe das von Claude Code generierte SQL für `ai_usage_log` im Supabase SQL Editor aus.

---

## Schritt 3.5: Testen & Deployen

### Manuell

```bash
npm run dev
```

Teste:
1. Recipe #1 komplett durchlaufen (oder bestehenden Test-Cycle nutzen) → bei der Evaluation erscheinen AI-Insights
2. Bill of Rights → "Vorschlag generieren" liefert sinnvolle Formulierung
3. Im Anthropic Console-Dashboard ([console.anthropic.com](https://console.anthropic.com)) unter "Usage" prüfen, dass Calls ankommen und die Kosten minimal sind

### Commit & Push

```bash
git add .
git commit -m "Phase 3: AI integration - journal analysis, rights formulator, rate limiting"
git push
```

---

## Checkliste Phase 3

- [ ] Anthropic SDK eingerichtet, API Key nur server-seitig verwendet
- [ ] Journal-Analyse für Recipe #1 liefert sinnvolle, deutsche Insights
- [ ] Rights Formulator funktioniert auf Bill of Rights Seite
- [ ] Rate Limiting via `ai_usage_log` aktiv und getestet
- [ ] Kosten im Anthropic-Dashboard im erwarteten Rahmen (Cent-Bereich)
- [ ] Live auf Vercel getestet

→ Weiter mit **Phase 4: Cleansers & Gamification**
