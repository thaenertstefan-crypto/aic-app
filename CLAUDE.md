# Anti Imposter Club — Project Context

## About
A self-development companion app that turns workbook exercises into interactive guided modules.

## Tech Stack
- **Framework:** Next.js 16 App Router
- **Database & Auth:** Supabase (auth + db)
- **Styling:** TailwindCSS + shadcn/ui
- **AI:** Anthropic API

## Architecture Conventions
- **DB calls:** `lib/supabase/client.ts` (browser) / `lib/supabase/server.ts` (server components)
- **AI calls:** `lib/anthropic/`, system prompts in `lib/anthropic/prompts/`
- **Recipe step components:** `components/recipes/steps/[RecipeName].tsx`
- **Journal template components:** `components/journal/templates/`

## Design & Content
- **Mobile-first**, target viewport ~375px
- **All user-facing text is German**, warm/encouraging tone, informal "du"
- **`journal_entries`** always use `template_type` to identify which template/UI to render

## Next.js 16 Gotchas
- `cookies()`, `headers()`, `params`, and `searchParams` are **async** and **must be awaited**
  - Always use: `const { slug } = await params`
- Apply this convention to all new pages, layouts, and route handlers

@AGENTS.md
