# Anti Imposter Club — Project Context

## About
A self-development companion app that turns workbook exercises into interactive guided modules.

## Design Context
- **Strategy (who/what/why):** siehe [PRODUCT.md](PRODUCT.md) — Register (`product`), Zielgruppe, Markenpersönlichkeit (warm · ermutigend · nahbar), Anti-Referenzen, Design-Prinzipien, Accessibility.
- **Visual system (how it looks):** siehe [DESIGN.md](DESIGN.md) — Palette, Typografie, Komponenten, Elevation. Vor neuen Screens/Redesigns beide lesen, damit die Arbeit on-brand bleibt.

## Tech Stack
- **Framework:** Next.js 16 App Router
- **Database & Auth:** Supabase (auth + db)
- **Styling:** TailwindCSS + shadcn/ui
- **AI:** Anthropic API

## Architecture Conventions
- **DB calls:** `lib/supabase/client.ts` (browser) / `lib/supabase/server.ts` (server components)
- **DB types:** Generierte Supabase-`Database`-Typen liegen in `lib/supabase/database.types.ts` (Client ist generisch typisiert). Bei Schema-Änderungen neu ziehen — siehe Header der Datei. JSONB-Spalten kommen als `Json`; die schmalen Element-Shapes (`RightItem`, `*Content`) stehen zentral in `lib/types/db-json.ts`.
- **AI calls:** `lib/anthropic/`, system prompts in `lib/anthropic/prompts/`
- **Recipe/exercise UI:** Übungen leben unter `app/(app)/me/*` (durable: Werte, Wants, Bill of Rights) und `app/(app)/booster/*` (akut). Die „Steps" jeder Übung sind eine Phasen-State-Machine in der jeweiligen Client-Komponente (z. B. `me/wants/journey/wants-journey.tsx`). Server-Actions/Backend liegen weiterhin in `app/(app)/recipes/**/actions.ts`; geteilte Bausteine in `components/recipes/`.
- **Journal template components:** `components/journal/templates/`

## Design & Content
- **Mobile-first**, target viewport ~375px
- **All user-facing text is German**, warm/encouraging tone, informal "du"
- **`journal_entries`** always use `template_type` to identify which template/UI to render

## Next.js 16 Gotchas
- `cookies()`, `headers()`, `params`, and `searchParams` are **async** and **must be awaited**
  - Always use: `const { slug } = await params`
- Apply this convention to all new pages, layouts, and route handlers
- **Nach Routen-Löschungen `.next` löschen** (`rm -rf .next`) — sonst schlägt `npx tsc --noEmit` mit Geister-Typen von den gelöschten Routen fehl

## Session Routine
- **At session start:** read `AIC-STATUS.md` (current state, open items, next steps) to get oriented instead of re-exploring the codebase.
- **At session end:** run `/feierabend` (summarizes the session into the Obsidian vault as a Daily Note and refreshes `AIC-STATUS.md`).

## Git Workflow
- Solo project, no external users yet: `main` is the working branch and it is safe to deploy directly to it.
- **After a feature or fix is complete and working, commit and push to `main` right away — no need to ask first.** Stefan tests immediately on his phone against the live deploy. Use a concise, descriptive commit message.
- Revisit this once the app has real users: switch to feature branches and pull requests instead of pushing straight to `main`.

@AGENTS.md
