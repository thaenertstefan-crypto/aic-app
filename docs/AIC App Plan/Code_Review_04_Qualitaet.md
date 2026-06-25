# Code-Review 04 – Qualität (Wartbarkeit, Typsicherheit, toter Code)

**Datum:** 2026-06-25
**Fokus:** TypeScript-Typsicherheit, toter Code, Duplizierung, Konsistenz, Abhängigkeiten, Error Boundaries
**Methodik:** Dateien wurden tatsächlich eingelesen. Befunde, die nur in Supabase liegen (RLS, Indizes), sind nicht Gegenstand dieses Passes. Reine Routing-/Laufzeit-Annahmen, die ich nicht ausführen konnte, sind als „zu verifizieren" markiert.

---

## Zusammenfassung

Der Code ist in vielen Belangen sauber: **kein einziges `any`** im Produktivcode, ESLint erzwingt `no-explicit-any`/`no-unused-vars` über `eslint-config-next/typescript`, der Supabase-Client ist zentralisiert (`lib/supabase/{client,server}.ts`), und Inhalts-/Intro-Daten sind konsistent in `lib/` ausgelagert.

Die wesentlichen Schwächen sind **strukturell**:
1. Eine komplette **verwaiste Parallel-Implementierung** der Werte-Journey unter `recipes/values/*` (toter Code, plus möglicher Routing-Schatten).
2. **Fehlende generierte Supabase-Typen** → ~59 manuelle Casts auf Query-Ergebnisse/JSONB.
3. **Inline-Datumslogik** ~15× dupliziert, mit zwei **inkonsistenten** Strategien (UTC vs. lokale Zeit) — relevant für das Tageszeit-Gating.

---

## 1. TypeScript / Typsicherheit

### 1.1 Kein generierter `Database`-Typ – Supabase-Client untypisiert · **Hoch** · Aufwand M
`createClient()` (`lib/supabase/server.ts:7-22`, `lib/supabase/client.ts:3-7`) wird ohne `createServerClient<Database>(…)`-Generic erzeugt. Es existiert keine generierte Typdatei (kein `Database`/`database.types`-Import im gesamten Repo gefunden). Folge: Jeder `.select()` liefert lose typisierte Daten, die per Hand gecastet werden — ich zähle **~59 `as`-Casts** über `app/`, der Großteil davon auf Query-Ergebnisse/JSONB. Beispiele:
- `app/(app)/recipes/bill-of-rights/actions.ts:79` → `entry?.content as RightsData["journalEntry"]`
- `app/(app)/recipes/bill-of-rights/actions.ts:80` → `bor?.rights as { id: string; text: string; active: boolean }[]`
- `app/(app)/recipes/values/actions.ts:147,208,397,398,415,429,433` → `as string[]`, `as number`, `as EvaluationEntry[]`, `as { … }`

Diese Casts sind nicht typgeprüft — driftet das DB-Schema, fällt es erst zur Laufzeit auf. Empfehlung: DB-Typen generieren (`supabase gen types typescript` bzw. MCP `generate_typescript_types`) und Client als `createClient<Database>()` typisieren. Das eliminiert den Großteil der Casts und macht JSONB-Zugriffe prüfbar.

### 1.2 Uneinheitliche FormData-Auswertung: `as`-Cast vs. `typeof`-Guard · **Niedrig** · Aufwand S
Zwei Stile nebeneinander:
- **Cast** (unsicher, akzeptiert auch `File`-Werte als „string"): `app/(app)/recipes/bill-of-rights/actions.ts:103-105` (`formData.get("prompt1") as string | null`), ebenso `app/(app)/recipes/values/actions.ts:582-585`.
- **Guard** (sicher): `app/(app)/recipes/values/actions.ts:31-32, 242-250, 493-498` (`typeof valuesRaw !== "string"`).

Innerhalb derselben Codebasis sollte der Guard-Stil durchgängig gelten.

### 1.3 Positiv vermerkt
- Kein `any`, kein unsicheres `as unknown as`. Die zwei `unknown`-Vorkommen (`lib/utils/journal.ts:351`, `lib/hooks/use-scroll-top-on-change.ts:14`) sind korrekt und bewusst eng gehalten.
- Die Content-Formatter in `lib/utils/journal.ts` arbeiten sauber typsicher über `Record<string, unknown>` + `stringField`-Helfer.

---

## 2. Toter Code

### 2.1 Verwaiste Parallel-Implementierung `recipes/values/{hypothesis,journal,evaluation}` · **Hoch** · Aufwand M
Die Live-Werte-Journey liegt unter `me/values/journey/*` (verlinkt aus `lib/utils/recipes.ts:55-60` `startPath`/`stepPaths`, `components/recipes/values-step-overview.tsx:48-76`, Dashboard). Daneben existiert eine **zweite, nahezu identische** Implementierung unter `recipes/values/*`, auf die **kein einziger externer Link/Redirect** zeigt (nur Selbstverweise innerhalb dieser Dateien):

| Datei | Status |
|---|---|
| `app/(app)/recipes/values/hypothesis/page.tsx` + `hypothesis-form.tsx` | verwaist (Dublette von `me/.../hypothesis`, Differenz nur in den Links) |
| `app/(app)/recipes/values/journal/page.tsx` + `journal-form.tsx` | verwaist + **divergiert** (enthält noch 7-Tage-Tracker & Werte-Reminder, die in der Live-Version entfernt wurden) |
| `app/(app)/recipes/values/evaluation/page.tsx` + `evaluation-form.tsx` | verwaist (Dublette, Differenz nur in den Links) |

> **Wichtig:** `app/(app)/recipes/values/actions.ts` ist **NICHT** tot — es wird von den Live-`me/values/journey/*`-Seiten und von `recipes/[slug]/page.tsx:8` importiert. Nur die `page.tsx`/`*-form.tsx`-Trios sind verwaist.

Die divergierte `recipes/values/journal/journal-form.tsx` schleppt zusätzlich toten Code mit: lokale Datumshelfer `getDateFromKey` / `getDateRange` / `getWeekdayShort` (`:33-54`), die es in der Live-Version nicht gibt.

**Zu verifizieren (Routing-Schatten):** Der Rezept-Hub verlinkt auf `/recipes/${slug}` (`app/(app)/recipes/page.tsx:125`), für „values" also `/recipes/values`. Das statische Verzeichnis `recipes/values/` existiert, hat aber **keine eigene `page.tsx`**. In Next.js App Router beschattet ein vorhandenes statisches Segment typischerweise die dynamische Geschwister-Route `[slug]` — `/recipes/values` würde dann ins Leere (404) laufen statt auf `recipes/[slug]/page.tsx`. Das ist im Build/Browser zu prüfen; falls bestätigt, ist das Verzeichnis nicht nur tot, sondern **aktiv schädlich**. Empfehlung: das gesamte `recipes/values/`-Verzeichnis bis auf `actions.ts` entfernen (und `actions.ts` ggf. nach `me/values/journey/` oder `lib/` verschieben).

### 2.2 Ungenutzte UI-Komponente `CtaGlow` · **Niedrig** · Aufwand S
`components/ui/cta-glow.tsx:21` exportiert `CtaGlow`, wird aber **nirgends importiert** (einzige Treffer sind Definition + lokaler Prop-Typ). Toter Baustein.

### 2.3 Ungenutzter Typ-Export `RecipeIntro` + Namenskollision · **Niedrig** · Aufwand S
`lib/utils/recipe-intros.ts:16` `export type RecipeIntro = { slug: string; cards: IntroCard[] }` wird nirgends verwendet (die Daten liegen als `Record<string, IntroCard[]>` vor). Erschwerend: Der Name kollidiert mit der **Komponente** `RecipeIntro` aus `components/recipes/recipe-intro.tsx` — alle scheinbaren Verwendungen von „RecipeIntro" sind in Wahrheit die Komponente. Typ entfernen.

---

## 3. `prompt2` – Ausmusterung noch NICHT vollzogen · **Mittel** · Aufwand S

Das Feld sollte ausgemustert werden, ist aber **vollständig verdrahtet** — alle verbleibenden Verwendungen:

**Schreib-/UI-Pfad (Recipe-Wizard):**
- `app/(app)/recipes/bill-of-rights/page.tsx:50,64` — in `ReflectionDraft` und `PageData`
- `:269` `useState("")`, `:295,309` Vorbefüllung aus Draft/DB
- `:338` Draft-Objekt, `:342` `formData.set("prompt2", prompt2)`
- `:434` fließt in den AI-Situations-Prompt ein (`[prompt1, prompt2].join`)
- `:731-738` Label + Textarea (`id="prompt2"`)
- `app/(app)/recipes/bill-of-rights/actions.ts:13` (Typ), `:104` `formData.get("prompt2")`, `:113` Persistenz in `content`

**Lese-/Anzeige-Pfad (Journal-Detail):**
- `lib/utils/journal.ts:174,178` — `formatBillOfRights` liest `prompt2` und rendert es als Sektion **„Was dir wichtig ist"**.

> **Korrektur zur Plan-Annahme:** Die Notiz in `Phase_12_Bugfixes_Feinschliff_v2.md:785` („prompt2 wird nirgends gelesen/angezeigt — kein Read-Pfad betroffen") **stimmt nicht**: `lib/utils/journal.ts:174-178` ist ein aktiver Read-Pfad. Beim Entfernen müssen Wizard **und** Journal-Detail-Formatter gemeinsam angepasst werden, sonst verschwindet bei Bestands-Einträgen die mittlere Sektion. Vor dem Entfernen klären, ob das Feld fachlich wirklich weg soll — aktuell trägt es Inhalt.

---

## 4. Duplizierung

### 4.1 Inline-„Heute"-Datumslogik, ~15×, mit zwei inkonsistenten Strategien · **Hoch** · Aufwand M
Es gibt keinen zentralen Datums-Helfer. Stattdessen zwei nebeneinander existierende Berechnungen des Tages-Keys:

**A) UTC-basiert** `new Date().toISOString().slice(0, 10)` — u. a.:
`app/(app)/booster/mantra/{actions.ts:49, page.tsx:14}`, `booster/overthinking/actions.ts:82`, `booster/promises/{actions.ts:33, page.tsx:12, promise-card.tsx:43}`, `booster/things-got-messy/actions.ts:98`, `dashboard/{actions.ts:36, page.tsx:42}`, `journal/actions.ts:45`, `me/bill-of-rights/actions.ts:105`, `recipes/bill-of-rights/actions.ts:143`, `onboarding/page.tsx:139`, `components/daily-reminder/daily-reminder-screen.tsx:12`, `lib/utils/streak.ts:13`.

**B) Lokalzeit-basiert** `getFullYear()/getMonth()/getDate()` + `padStart` — nur:
`app/(app)/me/values/journey/journal/journal-form.tsx:26-28`, `me/values/journey/page.tsx:12-14` (und die verwaiste `recipes/values/journal/journal-form.tsx:27-29`).

**Konsistenz-/Korrektheitsrisiko (zu verifizieren):** Der Kontext besagt, das Gating laufe über **Kalendertage in lokaler User-Zeitzone**. Die Werte-Journey nutzt korrekt Lokalzeit (B). Praktisch alle übrigen Tagesgrenzen (Mantra-/Promises-/Daily-Reminder-Gating, Dashboard-„heute", Streak) nutzen aber **UTC** (A) — für deutsche Nutzer abends bzw. generell außerhalb UTC ergibt das einen anderen Kalendertag. Empfehlung: einen einzigen Helfer `lib/utils/date.ts` (`localDateKey(d = new Date())`) einführen und überall verwenden; das behebt Duplizierung **und** die TZ-Inkonsistenz in einem Zug.

### 4.2 `recomputeStreak` dupliziert `computeStreak` · **Mittel** · Aufwand S
`lib/utils/streak.ts:5-18` (`computeStreak`, genutzt von `booster/mantra/page.tsx:30`) implementiert exakt die Rückwärts-Streak-Schleife, die `app/(app)/booster/promises/actions.ts:62-71` (`recomputeStreak`) erneut von Hand schreibt. Die `last`-Ermittlung ist zusätzlich, der Schleifenkern aber identisch — `recomputeStreak` sollte `computeStreak` wiederverwenden. (Beide erben außerdem das UTC-Problem aus 4.1.)

### 4.3 `formatDateDE` dreifach definiert, zwei verschiedene Implementierungen · **Niedrig** · Aufwand S
- `lib/utils/journal.ts:130` — `new Date(str).toLocaleDateString("de-DE", …)`
- `app/(app)/me/values/journey/evaluation/evaluation-form.tsx` + die verwaiste `recipes/values/evaluation/evaluation-form.tsx` — lokale Variante per `key.split("-")`.

Gleicher Name, unterschiedliche Logik. Nach Aufräumen von Abschnitt 2.1 in einen Helfer zusammenführen.

---

## 5. Konsistenz

### 5.1 Uneinheitliche `ActionState`-Shapes · **Niedrig** · Aufwand S
Drei Varianten für faktisch denselben Zweck:
- `{ error: string | null; success: boolean }` — `recipes/bill-of-rights/actions.ts:5-8`, `recipes/values/actions.ts:466-469,541-544`
- `{ error: string | null; success?: boolean }` — `recipes/values/actions.ts:7-10`
- `{ error: string | null }` (ohne success) — `recipes/values/actions.ts:215-217,630-632`

Ein gemeinsamer `ActionState`-Typ würde die Action-Signaturen vereinheitlichen.

### 5.2 `EvaluationEntry` dupliziert `JournalEntry` · **Niedrig** · Aufwand S
`app/(app)/recipes/values/actions.ts:329-333` (`EvaluationEntry`) ist strukturell identisch mit `:152-156` (`JournalEntry`) — beide `{ id; entry_date; content: { happenings; response } }`. Zusammenführen.

### 5.3 Doppelte Routenbäume / Naming · **Niedrig**
`recipes/values/*` vs. `me/values/journey/*` (siehe 2.1) und der Typ/Komponente-Namensklick `RecipeIntro` (siehe 2.3) erschweren die Orientierung. Mit den Empfehlungen aus Abschnitt 2 erledigt.

---

## 6. Abhängigkeiten

### 6.1 `shadcn` als Runtime-Dependency · **Niedrig** · Aufwand S
`package.json:24` listet `shadcn` (CLI-Scaffolding-Tool) unter `dependencies`. Es wird **nirgends importiert** (nur als Schema-URL in `components.json` referenziert). Gehört — wenn überhaupt — in `devDependencies` bzw. wird nur per `npx shadcn` benötigt. Aus `dependencies` entfernen.

### 6.2 Übrige Packages – sauber
Geprüft: `@base-ui/react` (10 Dateien), `gsap` (8), `class-variance-authority` (3), `server-only` (`lib/anthropic/client.ts`, `rate-limit.ts`), `@supabase/supabase-js` (direkter Typ-Import in `booster/promises/actions.ts:6`), `tailwind-merge`/`clsx` (`lib/utils.ts`), `tw-animate-css` (`app/globals.css:2`), `lucide-react` (33) — alle in Verwendung. Keine weiteren ungenutzten Pakete gefunden.

---

## 7. Error Boundaries

### 7.1 Nur Root-`error.tsx`, kein `global-error`, keine Segment-Boundaries · **Mittel** · Aufwand S–M
`app/error.tsx` ist eine saubere, deutsche Client-Error-Boundary — aber die **einzige** im Projekt:
- **Kein `app/global-error.tsx`:** Fehler im Root-Layout (`app/layout.tsx`) werden nicht abgefangen.
- **Keine Boundary in `(app)/`:** Die App-Shell mit Bottom-Nav lebt in `app/(app)/layout.tsx`. Wirft eine der vielen `async`-Server-Components/Supabase-Abfragen (z. B. `recipes/[slug]/page.tsx`, `dashboard/page.tsx`), schlägt der Fehler bis `app/error.tsx` durch und ersetzt die **gesamte** UI inkl. Navigation. Eine `app/(app)/error.tsx` würde den Fehler innerhalb der Shell auffangen und die Nav erhalten.

Empfehlung: `app/(app)/error.tsx` (Shell-erhaltend) ergänzen; optional `app/global-error.tsx` für Layout-Fehler. Für die API-Routen (`app/api/*`) existiert bereits internes try/catch mit warmen Fallbacks — dort ist keine Boundary nötig.

---

## Priorisierte Maßnahmenliste

| # | Befund | Schweregrad | Aufwand |
|---|---|---|---|
| 2.1 | Verwaiste `recipes/values/*`-Seiten entfernen (Routing-Schatten verifizieren) | Hoch | M |
| 1.1 | Supabase-`Database`-Typen generieren, Client typisieren, Casts abbauen | Hoch | M |
| 4.1 | Zentralen lokalen Datums-Helfer einführen, UTC/Local-Inkonsistenz beheben | Hoch | M |
| 3 | `prompt2`-Ausmusterung entscheiden & vollständig (inkl. Read-Pfad) umsetzen | Mittel | S |
| 4.2 | `recomputeStreak` auf `computeStreak` zurückführen | Mittel | S |
| 7.1 | `app/(app)/error.tsx` (+ ggf. `global-error.tsx`) ergänzen | Mittel | S–M |
| 1.2 | FormData-Auswertung auf `typeof`-Guard vereinheitlichen | Niedrig | S |
| 2.2 | `CtaGlow` entfernen | Niedrig | S |
| 2.3 | Ungenutzten Typ `RecipeIntro` entfernen / umbenennen | Niedrig | S |
| 4.3 | `formatDateDE` zusammenführen | Niedrig | S |
| 5.1 | Gemeinsamen `ActionState`-Typ einführen | Niedrig | S |
| 5.2 | `EvaluationEntry`/`JournalEntry` zusammenführen | Niedrig | S |
| 6.1 | `shadcn` aus `dependencies` entfernen | Niedrig | S |
