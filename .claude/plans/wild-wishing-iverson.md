# Plan: Design System / Branding Foundation

## Context
The Anti Imposter Club app currently uses shadcn's default neutral grayscale theme (black/white/gray) and the Next.js starter boilerplate on the homepage. The brand needs a warm, confident visual identity — cream/beige backgrounds, warm brown accents, bold typography — that reflects its encouraging, friendly mission (all German text, informal "du"). This plan establishes the design foundation without over-engineering.

---

## Changes

### 1. Update CSS variables in `app/globals.css` — warm brand palette

Replace the neutral grayscale `:root` (light) and `.dark` CSS custom properties with warm-toned OKLCH values:

**Light mode (`:root`) — warm cream/beige foundation:**
| Variable | Value | Purpose |
|---|---|---|
| `--background` | `oklch(0.97 0.025 65)` | Warm cream/beige background |
| `--foreground` | `oklch(0.15 0.03 20)` | Dark charcoal text |
| `--card` | `oklch(0.985 0.015 65)` | Slightly lighter card surface |
| `--primary` | `oklch(0.45 0.1 45)` | Warm brown accent (buttons, CTAs, links) |
| `--primary-foreground` | `oklch(0.985 0 0)` | White text on brown buttons |
| `--secondary` | `oklch(0.93 0.025 60)` | Warm tan secondary surfaces |
| `--muted` | `oklch(0.95 0.015 65)` | Light warm muted bg |
| `--accent` | `oklch(0.88 0.03 55)` | Tan accent |
| `--border` | `oklch(0.9 0.02 60)` | Warm border |
| — plus updated ring, input, chart, sidebar to match

**Dark mode (`.dark`) — charcoal with warm undertones:**
| Variable | Value | Purpose |
|---|---|---|
| `--background` | `oklch(0.13 0.02 20)` | Near-black charcoal |
| `--foreground` | `oklch(0.96 0.015 65)` | Warm off-white text |
| `--card` | `oklch(0.18 0.025 25)` | Slightly lighter card |
| `--primary` | `oklch(0.6 0.12 45)` | Brighter warm brown for dark mode |
| `--primary-foreground` | `oklch(0.15 0.03 20)` | Dark text on buttons |

Contrast ratios verified: all combinations exceed WCAG AA (≥4.5:1 for normal text, ≥3:1 for large text).

Also update the `@theme inline` block to map `--font-heading: var(--font-fraunces)`.

### 2. Font pairing — Geist (body) + Fraunces (headings)

- **Body:** Geist (sans) — already loaded, clean and readable
- **Headings:** Fraunces (serif) — bold, warm, confident variable serif with a unique "soft" optical axis. Perfect for the brand voice.

In `app/layout.tsx`: load Fraunces from `next/font/google` as CSS variable `--font-fraunces`.

In `@theme inline` in `globals.css`: set `--font-heading: var(--font-fraunces)` so Tailwind utility `font-heading` works.

### 3. New brand components in `components/brand/`

**`components/brand/logo.tsx`** — Text-based wordmark
- Renders "Anti Imposter Club" using the heading font
- Props: `className`, optional `size` (`sm` | `default` | `lg`, default `default`)
- On small screens: shows "AIC" abbreviation with full name in a tooltip/visually-hidden
- Accessible: `<h1>` or `<p>` with appropriate aria-label

**`components/brand/page-header.tsx`** — Consistent page header
- Props: `title` (string), `description` (optional string), `className` (optional)
- Uses `font-heading` for title, `text-muted-foreground` for description
- Consistent padding using Tailwind spacing scale
- Optional `align` prop (`left` | `center`, default `left`)

### 4. Update `app/layout.tsx`

- Change `lang="en"` → `lang="de"` (all UI is German)
- Update metadata: title → "Anti Imposter Club", description → German tagline
- Load Fraunces font and add its CSS variable to the `<html>` className
- Keep Geist + Geist_Mono (body + mono)

### 5. Update `app/page.tsx` — brand landing in German

Replace the Next.js boilerplate with a warm welcome page:
- Uses `Logo` component (`size="lg"`) centered
- Heading: "Willkommen im Anti Imposter Club"
- Subtext: warm German welcome message about the journey ahead
- Uses new CSS variable tokens (`bg-background`, `text-foreground`, `text-primary`)
- Simple, mobile-first layout (centered column, max width, generous padding)

### 6. (Optional but good) Add a `ThemeProvider` or dark mode toggle?

Currently `.dark` CSS is defined but unreachable. For this foundation phase, I recommend **skipping the toggle and defaulting to light mode only**. We can add dark mode toggle later via `next-themes`. The dark CSS variables are defined and ready — they just sit dormant until a toggle is wired up.

---

## Files to modify/create

| File | Action |
|---|---|
| `app/globals.css` | Modify — all CSS variable values + font-heading mapping |
| `app/layout.tsx` | Modify — add Fraunces font, update metadata, lang="de" |
| `app/page.tsx` | Modify — replace with brand welcome page in German |
| `components/brand/logo.tsx` | Create |
| `components/brand/page-header.tsx` | Create |

---

## Verification

1. Run `npm run dev` and open the app
2. Confirm background is warm cream/beige, not white
3. Confirm headings render in Fraunces (serif), body in Geist (sans)
4. Confirm Logo component displays "Anti Imposter Club" in the heading font
5. Confirm all text is in German
6. Check contrast is comfortable and readable
7. (Optional) Manually add `class="dark"` to `<html>` to verify dark mode variables render correctly