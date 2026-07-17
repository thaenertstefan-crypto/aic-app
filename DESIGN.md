---
name: Anti Imposter Club
description: Warm, encouraging dark-aubergine companion app for quieting the inner critic
colors:
  aubergine-night: "#161226"
  plum-surface: "#2E2745"
  plum-muted: "#272041"
  plum-secondary: "#3A3158"
  candle-gold: "#E7B65E"
  gold-ink: "#2B1B06"
  amber-accent: "#332818"
  moonlight: "#F3EFFA"
  lavender-muted: "#A89FBE"
  sage-success: "#6FAE8A"
  sage-ink: "#16241D"
  rose-celebrate: "#C97B84"
  lilac-confidence: "#9C7FB0"
  ember-destructive: "#E5484D"
  hairline: "#FFFFFF1F"
  input-stroke: "#FFFFFF29"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.04em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  "2xl": "18px"
  "3xl": "22px"
  "4xl": "26px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.candle-gold}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-outline:
    backgroundColor: "{colors.aubergine-night}"
    textColor: "{colors.moonlight}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  card-default:
    backgroundColor: "{colors.plum-surface}"
    textColor: "{colors.moonlight}"
    rounded: "{rounded.xl}"
    padding: "16px"
  card-glass:
    backgroundColor: "{colors.plum-surface}"
    textColor: "{colors.moonlight}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input-default:
    backgroundColor: "{colors.aubergine-night}"
    textColor: "{colors.moonlight}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "32px"
  badge-default:
    backgroundColor: "{colors.candle-gold}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.4xl}"
    padding: "2px 8px"
    height: "20px"
---

# Design System: Anti Imposter Club

## 1. Overview

**Creative North Star: "Candlelight in a Quiet Room"**

Anti Imposter Club is a companion, not a coach. The whole surface sits in a deep aubergine night (`#161226`) — a protected, dimmed room you can retreat to at any time, the app you open late, after the day, when the inner critic is loudest. Into that dark room falls a single warm light: a candle-gold accent (`#E7B65E`) that marks the one thing worth doing next. Nothing shouts. Warmth is carried by the light and the voice, never by loud color everywhere. A soft, procedural mascot breathes in the corners; motion is gentle and "alive," never busy. The register is **product** — this is a tool you're *in*, working through a guided exercise — but a tool with a heartbeat.

**Bildwelt: „Dein Nachthimmel“** — the meaning layer over this visual system (spec: `docs/superpowers/specs/2026-07-17-bildsprache-nachthimmel-design.md`). From the protected room you look at your own night sky: the **Kompass** (Werte) shows direction, the **Sterne** (Wants) are what makes you shine and what you reach for, the **Bill of Rights** are the rules you navigate by, and rough moments are **Kopfwetter** — weather that passes and never destroys the sky. Metaphors live at the edges (hub titles, onboarding, the check-in as „Wetterbericht“, intro/outro moments); exercise steps stay concrete and image-free, and buttons say „Weiter“, never „Nach den Sternen greifen“.

This system explicitly rejects four things (straight from PRODUCT.md's anti-references): the **cold clinical health app** (no medical white, no form-field sea, no hospital blue), the **hustle/productivity coach** (no aggressive streaks-as-pressure, no "no excuses" red), the **generic SaaS dashboard** (no interchangeable card grids, no hero-metric tiles, no soulless corporate neutral), and **kitschy wellness esoterica** (no oversweet pastels, no empty mindfulness fluff). The dark ground plus a single earned accent is the whole discipline: restraint that reads as calm, not as emptiness.

**Key Characteristics:**
- Dark aubergine surface throughout — one theme, no light mode.
- A single candle-gold accent used sparingly, for the *next step* and current state.
- Serif (Fraunces) for warmth and voice; sans (Geist) for the working UI.
- Translucent, frosted glass on hero moments; solid plum on everything else.
- Gentle, breathing motion with a reduced-motion fallback everywhere.
- Mobile-first, ~375px, safe-area aware (it's a PWA you hold in one hand).

## 2. Colors

A dark, low-chroma aubergine field lit by one warm gold, with a small cast of desaturated supporting hues for state and module identity.

### Primary
- **Candle Gold** (`#E7B65E`): The single accent. Primary actions, the active nav tab, current-selection rings (`--ring`), the daily "right" icon, progress. It marks *the one thing* — its scarcity is the point. On gold fills, text is **Gold Ink** (`#2B1B06`), never white.

### Secondary
- **Sage Success** (`#6FAE8A`): Completion, confirmation, "you did it" — a calm green, never a triumphant one. Paired with **Sage Ink** (`#16241D`) for text on fills.
- **Rose Celebrate** (`#C97B84`): Reserved for celebration moments (completion flourishes) — warm, human, not confetti-loud.

### Tertiary
- **Lilac Confidence** (`#9C7FB0`): Module identity for the Confidence flow and the Kopfwetter hub (`--cleanser-confidence`). Used to tint a flow, not to decorate.
- **Chart ramp** (`#E7B65E → #C9A878 → #B29A8C → #9D8C9B → #8E84A6`): A gold-to-lavender ramp for the few data/progress visuals; sequential and muted by design.

### Neutral
- **Aubergine Night** (`#161226`): The body background. The room. Also the resting fill of outline buttons and inputs.
- **Plum Surface** (`#221C30`): Card, popover, sidebar, bottom-nav base — one step up from the ground.
- **Plum Muted** (`#251F32`) / **Plum Secondary** (`#2A2438`): Second neutral layer for muted panels, secondary buttons, toolbars.
- **Amber Accent** (`#332818`): A dim warm tint for hover/accent surfaces in the dark.
- **Moonlight** (`#F3EFFA`): Primary text — a warm off-white, never pure white.
- **Lavender Muted** (`#A89FBE`): Secondary/meta text. **Use with care** — on the plum surfaces it is close to the AA floor; reserve it for genuinely secondary text at normal weight and never for anything that must be read comfortably at length.
- **Hairline** (`rgba(255,255,255,0.12)`): Borders and dividers — light-on-dark at low alpha, never a hard line. **Input Stroke** (`rgba(255,255,255,0.16)`) is the slightly stronger field edge.

### Named Rules
**The One Candle Rule.** One gold *candle* per screen: exactly one element carries a gold **action or live state** — the primary CTA or the current step. If two things compete as "the gold next step," one of them is wrong. The dark room has one light *you act on*.

This rule governs **emphasis, not identity.** Gold-tinted icon chips (`bg-primary/15 text-primary` glyphs) are an accepted **navigational/identity convention** for hub screens (`/me`, `/booster`, journal entries, dashboard cards): they mark *what a thing is*, not *what to do next*, so a hub may carry several without breaking the rule. The discipline is that none of those quiet chips should read as loudly as the one gold action. Gold as flat *decoration* on non-interactive surfaces (a gold rule, a gold divider, a gold text eyebrow) is still forbidden.

**The Warm-White Rule.** Text is Moonlight (`#F3EFFA`), never `#FFFFFF`. Pure white on aubergine is a cold spike; the warm off-white belongs to the room.

### Modul-Lichtfarben (Szenen-Identität, nie Aktions-Farbe)
| Modul | Lichtfarbe | Token |
|---|---|---|
| Werte | Gold | `--primary` |
| Wants / Sternschmiede | Rosé | `--celebrate` |
| Confidence | Lilac | `--cleanser-confidence` |
| Bill of Rights | Sage | `--success` |
| Kopfwetter (Akut-Hilfen) | Lilac | `--cleanser-confidence` |

Modulfarbe lebt ausschließlich in Szenen-Ornamenten und Glows (`--scene-glow`).
Gold bleibt überall die Aktions-Farbe (One-Candle-Rule). Die `scene-ornament-tint`-Konvention (Attribut-Selektoren + `--scene-glow`) lebt in `app/globals.css`.

## 3. Typography

**Display Font:** Fraunces (with Georgia, serif fallback)
**Body Font:** Geist (with system-ui, sans-serif fallback)

**Character:** A high-contrast pairing on the serif↔sans axis. Fraunces — a soft, optical serif — carries the *voice*: greetings, section titles, card titles, and above all the affirmations ("Ich habe das Recht, …"), where it reads like something written by hand. Geist carries the *work*: labels, buttons, inputs, body copy, data. The serif is where the app is warm; the sans is where it's clear.

### Hierarchy
- **Display** (Fraunces, 700, 2.25rem / `text-4xl`, `tracking-tight`): The greeting and page H1 ("Hey Stefan!"). One per screen.
- **Headline** (Fraunces, 600, 1.5rem): Section headings within a flow.
- **Title** (Fraunces, 500, 1rem–1.125rem): Card titles and affirmations. Set `leading-relaxed` when the line is a full sentence to read.
- **Body** (Geist, 400, 0.875rem / `text-sm`, line-height 1.5): Default UI and prose. Cap prose at 65–75ch.
- **Label** (Geist, 500, 0.75rem / `text-xs`): Meta text and small captions.

### Named Rules
**The Serif-Is-Voice Rule.** Fraunces is for language the user should *feel* — names, affirmations, encouragements. Never set a button, a data value, or a form label in the serif. If it's an action or a fact, it's Geist. Affirmationen — Sätze, die die App dem User zuspricht — stehen in Fraunces Italic (Utility `.font-affirmation`).

**The Fixed-Scale Rule.** This is product UI: type sizes are fixed rem steps, not fluid `clamp()`. A heading that shrinks with the viewport looks worse in a phone-width column, not better.

## 4. Elevation

Depth is built from **tonal layering and translucency**, not drop shadows. Surfaces step up from the aubergine ground by getting lighter (ground → Plum Surface) and are separated by a 1px light-on-dark hairline ring (`ring-1 ring-foreground/10`), not a cast shadow. There is essentially no box-shadow vocabulary; the dark theme would swallow it. The signature "lift" is instead **frosted glass**: `backdrop-filter: blur()` over a low-alpha white fill, so the app-wide ambient blobs glow through hero cards.

The ground itself is not a flat fill but a vertical body gradient (`components/ui/app-backdrop.tsx`), deepening from `#131020` at the top toward `--background` lower down; the Card↔ground step stays ≥1.3:1 at both endpoints, verified by `scripts/check-contrast.mjs`.

### Named Rules
**The Glass-Is-Rare Rule.** Frosted glass (`.glass-card`, `.glass-panel`) is reserved for one or two hero moments per screen — the daily focus, the "today's right" card. Stacked `backdrop-filter` layers are expensive on older phones and, used everywhere, they stop meaning "this one matters." Everything else is solid Plum Surface.

**The Hairline Rule.** Separation is a 1px `rgba(255,255,255,0.12)` edge, never a shadow and never a hard opaque line.

## 5. Components

### Buttons
- **Shape:** Gently rounded (`rounded-lg`, 10px). Compact height (32px default; `sm` 28px, `lg` 36px).
- **Primary (default):** Solid Candle Gold with Gold-Ink text — die eine angezündete Kerze. Hover dunkelt minimal Richtung Ink.
- **Outline:** Aubergine-tinted transparent fill (`bg-background/40`) with a hairline border and light blur; hover fills to muted. The workhorse secondary action.
- **Ghost / Secondary / Link:** Ghost = transparent, hover to muted. Secondary = solid Plum. Link = gold text, underline on hover.
- **Focus:** A 3px `ring-ring/50` gold focus ring plus border shift — always visible. **Active:** a 1px downward nudge (`translate-y-px`) for a tactile press.

### Chips / Badges
- **Style:** Full pill (`rounded-4xl`, 26px), 20px tall, `text-xs`. Default is a solid Candle Gold fill with Gold Ink text; `secondary` is solid Plum; `outline` is a hairline border with Moonlight text; `destructive`/`ghost`/`link` as needed.
- **Use:** Status and counts, not decoration.

### Cards / Containers
- **Corner Style:** `rounded-xl` (14px).
- **Background:** Solid **Plum Surface** by default; `variant="glass"` swaps in the frosted `.glass-card` for hero cards.
- **Elevation Strategy:** No shadow — a 1px `ring-foreground/10` hairline (see Elevation). `overflow-hidden` so images meet the corners.
- **Internal Padding:** 16px (`--card-spacing`), 12px for `size="sm"`. Card titles use Fraunces; descriptions use Lavender-Muted body.
- **Never nest a card inside a card.**

### Inputs / Fields
- **Style:** Transparent-on-aubergine fill (`bg-input/30`), hairline `border-input` stroke, `rounded-lg` (10px), 32px tall. Placeholder in Lavender-Muted.
- **Focus:** Gold border shift + 3px gold ring.
- **Error:** `aria-invalid` drives a destructive border + destructive ring. **Disabled:** reduced opacity, muted fill, no pointer events.

### Navigation
- **Bottom tab bar** (mobile-first): 5 tabs (Dashboard, Me, Kopfwetter, Journal, Einstellungen), each an icon + `text-xs` label. Sticky bottom, safe-area padded, on a separate absolute `bg-background/70 backdrop-blur-xl` glass layer.
- **States:** Active tab is Candle Gold with a lightly gold-filled icon; inactive is Lavender-Muted, hover to Moonlight. A 2px gold indicator line slides between tabs (GSAP, `power2.out`, ~0.4s) and snaps instantly under reduced motion.

### The Mascot (signature component)
A procedural SVG/CSS blob (`components/brand/mascot.tsx`), **not an image** — it has faces, breathes, exhales, sways, and reacts per module (overthinking spirals, values compass, burn ritual). It is the app's warmth made literal. Its motion always has a reduced-motion fallback. Treat it as a character with states, never as a decorative sticker.

## 6. Do's and Don'ts

### Do:
- **Do** keep the aubergine night (`#161226`) as the ground on every surface. One theme, no light mode.
- **Do** obey the One Candle Rule — exactly one gold **action/current-state** per screen. Gold-tinted identity icon chips on hubs are fine; keep them quieter than the one gold action.
- **Do** use Moonlight (`#F3EFFA`) for text, and Gold Ink (`#2B1B06`) on gold fills. Never pure `#FFFFFF`.
- **Do** set voice — greetings, affirmations, encouragements — in Fraunces; set actions, labels, and data in Geist.
- **Do** build depth from tonal layers + a 1px hairline; reserve frosted glass for 1–2 hero moments per screen.
- **Do** give every animation a `prefers-reduced-motion: reduce` fallback (crossfade or instant). The breathing mascot included.
- **Do** verify Lavender-Muted (`#A89FBE`) text against its surface; if a string must be read comfortably, move it toward Moonlight.

### Don't:
- **Don't** ship the **cold clinical health app**: no medical white, no hospital blue, no wall of form fields.
- **Don't** ship the **hustle/productivity coach**: no streak-as-pressure, no "no excuses" alarm-red, no shaming empty states.
- **Don't** ship the **generic SaaS dashboard**: no interchangeable icon+heading+text card grids, no hero-metric tiles, no corporate-neutral filler.
- **Don't** ship **kitschy wellness esoterica**: no oversweet pastels, no incense-and-affirmation clichés, no empty mindfulness fluff.
- **Don't** put two competing gold **actions** on one screen, or use gold as flat decoration on non-interactive surfaces (gold rules, dividers, text eyebrows). Gold identity icon chips on hubs are the exception, not decoration.
- **Don't** use `border-left`/`border-right` >1px as a colored accent stripe on cards or callouts.
- **Don't** use gradient text (`background-clip: text`) or glassmorphism as a default surface.
- **Don't** reach for a solitary tiny tracked-uppercase eyebrow above every section as scaffolding — let the serif headings and copy carry the cadence.
- **Don't** nest cards, and don't fluid-`clamp()` product type — fixed rem steps only.
