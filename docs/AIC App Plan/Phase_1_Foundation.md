# Phase 1: Foundation (Setup, Auth, Navigation, Onboarding)

> Ziel dieser Phase: Ein lauffähiges Next.js-Projekt mit Supabase-Auth, Grundnavigation und Onboarding-Flow – live auf Vercel deployt.
>
> Geschätzte Dauer: 3-5 Tage (je nachdem wie viel Zeit du investierst)

---

## Schritt 1.1: Next.js Projekt initialisieren

### Manuell (Terminal, im geklonten Repo-Ordner)

```bash
npx create-next-app@latest .
```

Bei den Prompts wähle:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: **Yes**
- `src/` directory: **No** (für die vorgeschlagene Struktur nicht nötig)
- App Router: **Yes**
- Import alias (`@/*`): **Yes** (Standard übernehmen)

> Falls der Ordner nicht komplett leer ist (z.B. wegen `.git`), fragt Next.js eventuell nach – einfach bestätigen, `.git` bleibt erhalten.

### Erster Commit

```bash
git add .
git commit -m "Initial Next.js setup"
git push
```

---

## Schritt 1.1b: CLAUDE.md anlegen

Jetzt, wo die Grundstruktur steht, lohnt es sich, eine `CLAUDE.md` im Projekt-Root anzulegen. Claude Code liest diese Datei automatisch in jeder Session und hält sich dadurch konsistent an Projekt-Konventionen, auch über mehrere Sessions/Phasen hinweg.

### Claude Code Prompt

```
Create a CLAUDE.md file in the project root with the following project 
context, so future sessions stay consistent:

- This is the "Anti Imposter Club" app - a self-development companion 
  turning workbook exercises into interactive guided modules
- Tech stack: Next.js 14 App Router, Supabase (auth + db), TailwindCSS, 
  shadcn/ui, Anthropic API
- All DB calls go through lib/supabase/ (client.ts for browser, server.ts 
  for server components)
- All AI calls go through lib/anthropic/, with system prompts in 
  lib/anthropic/prompts/
- Mobile-first design, target viewport ~375px
- All user-facing text is in German, warm/encouraging tone, informal "du"
- journal_entries always use template_type to identify which template/UI 
  to render
- Recipe step components live in components/recipes/steps/[RecipeName].tsx
- Journal template components live in components/journal/templates/
```

### Commit

```bash
git add .
git commit -m "Add CLAUDE.md project context"
git push
```

---

## Schritt 1.2: Vercel verbinden

### Manuell
1. Auf [vercel.com](https://vercel.com) → "Add New Project"
2. Dein GitHub-Repo `aic-app` auswählen → Import
3. Framework Preset wird automatisch als "Next.js" erkannt – einfach "Deploy" klicken
4. Nach 1-2 Minuten hast du eine Live-URL wie `aic-app-xyz.vercel.app`

Ab jetzt: **jeder Push auf `main` deployt automatisch.** Du kannst das im Hintergrund laufen lassen und ignorieren.

---

## Schritt 1.3: shadcn/ui einrichten

### Claude Code Prompt

```
Initialize shadcn/ui in this Next.js 14 App Router project. 
Use the default style, slate as base color, and CSS variables for theming.
After setup, install these components: button, input, card, badge, 
progress, dialog, tabs, textarea, label, avatar, separator.
```

Claude Code führt dabei `npx shadcn@latest init` und die entsprechenden `add`-Befehle aus.

### Commit

```bash
git add .
git commit -m "Add shadcn/ui setup"
git push
```

---

## Schritt 1.3b: Branding & Design-Grundlagen

Bevor die ersten echten Seiten gebaut werden, lohnt es sich, die Marken-Farben und Typografie als zentrale Theme-Variablen zu definieren. So baut Claude Code von Anfang an mit deinem Branding statt mit shadcn-Standardfarben – und Farbänderungen später sind dadurch ein zentraler Eingriff statt eine Suche durch die ganze Codebase.

### Claude Code Prompt

```
Set up the design system / branding for this app based on the existing 
"Anti Imposter Club" brand:

1. Update the Tailwind theme (and shadcn CSS variables in globals.css) with:
   - A warm cream/beige as the primary background (light mode)
   - A dark charcoal/near-black for contrast sections and dark-mode 
     surfaces
   - A warm brown/tan as the primary accent color (buttons, links, CTAs)
   - Keep good contrast ratios for accessibility

2. Choose a font pairing: a clean sans-serif for body text, and consider 
   a serif or bold display font for headings/mantras (the brand uses bold, 
   confident headline typography)

3. Create a small components/brand/ folder with a Logo component 
   (text-based "Anti Imposter Club" wordmark is fine for now, can be 
   swapped for an SVG later) and a reusable PageHeader component

4. Apply this theme to the placeholder pages we've already created so we 
   can see it in action

Keep it simple - this is a foundation we'll build on, not a final design.
```

### Commit

```bash
git add .
git commit -m "Add branding and design tokens"
git push
```

---

## Schritt 1.4: Supabase Client einrichten

### Manuell: Environment Variables

Erstelle im Projektroot eine Datei `.env.local` (falls nicht vorhanden) mit:

```
NEXT_PUBLIC_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
ANTHROPIC_API_KEY=dein-anthropic-key
```

(Werte aus Phase 0 einsetzen)

> Prüfe, dass `.env.local` in der `.gitignore` steht (sollte bei `create-next-app` automatisch der Fall sein).

### Claude Code Prompt

```
Set up Supabase client integration for this Next.js 14 App Router project:

1. Install @supabase/supabase-js and @supabase/ssr
2. Create lib/supabase/client.ts for browser-side Supabase client
3. Create lib/supabase/server.ts for server-side Supabase client (for Server Components and Route Handlers)
4. Create middleware.ts that refreshes the Supabase session on every request
5. Use environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

Follow the official Supabase Next.js App Router SSR pattern.
```

---

## Schritt 1.5: Datenbank-Schema in Supabase anlegen

### Manuell (Supabase Dashboard)

1. Im Supabase-Dashboard → **SQL Editor** → "New query"
2. Füge das folgende SQL ein und führe es aus (das ist das Basis-Schema für Phase 1; weitere Tabellen kommen in späteren Phasen dazu):

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  confidence_baseline INTEGER,
  active_recipe_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Daily check-ins table
CREATE TABLE daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  mood_score INTEGER,
  notes TEXT,
  active_recipe_slug TEXT,
  UNIQUE(user_id, date)
);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own checkins"
  ON daily_checkins FOR ALL USING (auth.uid() = user_id);

-- Function + trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

3. Prüfen: Unter **Table Editor** sollten jetzt `profiles` und `daily_checkins` sichtbar sein

### Optional: Auth-Einstellungen

Im Supabase Dashboard unter **Authentication → Providers**:
- Email-Auth ist standardmäßig aktiv – das reicht für den Start
- Falls du "Confirm email" deaktivieren willst (für schnelleres Testen ohne Email-Bestätigung): Authentication → Settings → "Enable email confirmations" ausschalten (für Produktion später wieder aktivieren!)

---

## Schritt 1.6: Auth-Seiten (Login/Signup)

### Claude Code Prompt

```
Create authentication pages for this Next.js 14 App Router app using Supabase Auth:

1. Create app/(auth)/login/page.tsx - email/password login form using shadcn/ui 
   components (Card, Input, Button, Label). On success, redirect to /dashboard.
2. Create app/(auth)/signup/page.tsx - signup form (name, email, password). 
   On success, redirect to /onboarding.
3. Create app/(auth)/layout.tsx - centered, mobile-friendly layout for auth pages 
   (max-width card on a simple background).
4. Both forms should use Server Actions for form submission and show error 
   messages if auth fails.
5. Add a link between login and signup pages ("Don't have an account? Sign up").

Style: clean, minimal, mobile-first. Use the AIC brand feeling - warm, 
encouraging tone in microcopy (e.g. "Welcome back" instead of "Login").
```

---

## Schritt 1.7: Geschützte Routen + Grundnavigation

### Claude Code Prompt

```
Set up the protected app structure for this Next.js 14 project:

1. Create app/(app)/layout.tsx as a Server Component that:
   - Checks if user is authenticated via Supabase server client
   - Redirects to /login if not authenticated
   - Redirects to /onboarding if profile.onboarding_completed is false 
     (except if already on /onboarding)
   - Renders a mobile-friendly bottom navigation bar with 5 tabs: 
     Dashboard, Recipes, Journal, Cleansers, Profile
   - Use lucide-react icons for the nav items (Home, BookOpen, NotebookPen, 
     Sparkles, User)

2. Create placeholder pages (just a heading for now, we'll build these out later):
   - app/(app)/dashboard/page.tsx
   - app/(app)/recipes/page.tsx
   - app/(app)/journal/page.tsx
   - app/(app)/cleansers/page.tsx
   - app/(app)/profile/page.tsx

3. The bottom nav should be fixed at the bottom on mobile, highlight the 
   active route, and be hidden on the (auth) routes.

Mobile-first: design for a 375px viewport, the nav bar should be thumb-friendly.
```

---

## Schritt 1.8: Onboarding Quiz

### Claude Code Prompt

```
Build an onboarding flow at app/(app)/onboarding/page.tsx:

1. A 3-step quiz (single page, with internal step state via useState):
   - Step 1: "What brings you here?" - multiple choice (single select):
     "I want to know myself better", "I struggle to say no", 
     "I overthink everything", "I want more confidence overall"
   - Step 2: "How confident do you feel right now?" - slider 1-10
   - Step 3: "What's your name?" - text input

2. On completion: 
   - Update the profiles table (name, confidence_baseline, onboarding_completed = true)
   - Set active_recipe_id based on step 1 answer:
     - "know myself better" -> "values"
     - "struggle to say no" -> "overthinking"
     - "overthink everything" -> "overthinking"
     - "more confidence" -> "values"
     (Note: Recipe #4 "saying-no" isn't built in the MVP yet - "struggle to 
     say no" temporarily maps to "overthinking" instead, since that recipe 
     is available and thematically close. Revisit this mapping once Recipe 
     #4 is built in V1.1.)
   - Redirect to /dashboard

3. Use a progress indicator at the top (step 1 of 3, etc.)
4. Warm, encouraging copy throughout - this is the user's first impression.
5. Use shadcn/ui components (Card, Button, Slider, RadioGroup, Input)
```

---

## Schritt 1.8b: Tipps zum Testen & Zurücksetzen

Während du die App entwickelst, willst du Flows (Onboarding, Recipes, etc.) wahrscheinlich öfter durchspielen, ohne jedes Mal einen neuen Account anzulegen. Im Supabase **Table Editor** kannst du dafür gezielt Zustände zurücksetzen:

- **Onboarding erneut durchlaufen**: in `profiles` für deinen User `onboarding_completed` auf `false` setzen → beim nächsten Laden der App landest du wieder im Onboarding-Flow
- **Recipe-Fortschritt zurücksetzen**: die entsprechende Zeile in `user_recipe_progress` löschen (oder `status`/`current_step` manuell anpassen)
- **Journal-Einträge löschen**: einzelne Zeilen in `journal_entries` löschen, z.B. um den 7-Tage-Zyklus von Recipe #1 erneut zu testen

Diese drei Tabellen wirst du im Table Editor während der Entwicklung wahrscheinlich am häufigsten anfassen – ein Lesezeichen auf das Supabase-Dashboard lohnt sich.

---

## Schritt 1.9: Testen & Deployen

### Manuell

```bash
npm run dev
```

Teste lokal:
- Signup funktioniert, Profil wird in Supabase angelegt (im Table Editor prüfen)
- Login funktioniert
- Onboarding läuft durch und leitet zum Dashboard weiter
- Bottom Nav funktioniert

### Vercel Environment Variables setzen

1. Vercel Dashboard → dein Projekt → **Settings → Environment Variables**
2. Trage `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` und `ANTHROPIC_API_KEY` ein (gleiche Werte wie in `.env.local`)
3. Redeploy auslösen (oder einfach den nächsten Push abwarten)

### Commit & Push

```bash
git add .
git commit -m "Phase 1: Auth, navigation, onboarding"
git push
```

Auf der Vercel-URL testen, ob alles auch live funktioniert.

---

## Checkliste Phase 1

- [ ] Next.js Projekt läuft lokal (`npm run dev`)
- [ ] shadcn/ui Komponenten installiert
- [ ] Supabase Client (Browser + Server) eingerichtet
- [ ] Tabellen `profiles` und `daily_checkins` in Supabase angelegt, RLS aktiv
- [ ] Login/Signup funktionieren
- [ ] Onboarding-Flow funktioniert und schreibt in `profiles`
- [ ] Bottom Navigation mit 5 Tabs sichtbar
- [ ] App ist live auf Vercel erreichbar und funktioniert dort genauso

→ Weiter mit **Phase 2: Recipe-Module** (Recipe #1, #5, #3)
