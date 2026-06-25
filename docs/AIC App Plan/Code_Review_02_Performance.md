# Code Review 02 — Performance & Effizienz (Next.js App Router)

**Datum:** 2026-06-25
**Scope:** Performance/Effizienz im App-Router-Kontext (Server vs. Client Components,
Daten-Fetching, Supabase-Queries, GSAP, Re-Renders, Bundle/Assets).
**Methode:** Statische Analyse der tatsächlich eingelesenen Dateien. Reines Review —
keine Code-Änderungen. DB-seitige Aspekte (Indizes, RLS, Query-Pläne) sind nicht aus
dem Code verifizierbar und unten ausdrücklich als **manuell zu prüfen** markiert.

Schweregrade: **Kritisch / Hoch / Mittel / Niedrig** · Aufwand: **S / M / L**

---

## Zusammenfassung

Die Codebasis ist insgesamt sauber strukturiert. Server Components werden korrekt als
Default genutzt; `"use client"` sitzt fast durchgängig nur dort, wo echte Interaktivität
besteht. GSAP-Animationen sind **vorbildlich** aufgeräumt und respektieren
`prefers-reduced-motion` konsequent. Es gibt **keine** kritischen Performance-Defekte.

Die lohnendsten Hebel liegen im **Daten-Fetching**: ein konkreter Request-Waterfall mit
Mehrfach-Fetches auf der Values-Rezeptseite (Hoch), ein systemisches Muster wiederholter
`auth.getUser()`-Roundtrips pro Server-Action (Mittel) und punktuelle `select('*')`-/
fehlende-Limit-Stellen (Mittel/Niedrig).

| # | Befund | Schweregrad | Aufwand |
|---|--------|-------------|---------|
| 1 | Request-Waterfall + Mehrfach-Fetches auf `recipes/[slug]` (values) | Hoch | M |
| 2 | Wiederholte `auth.getUser()`-Roundtrips je Server-Action/Seite | Mittel | M |
| 3 | `journal/page.tsx`: `select('*')` ohne Limit/Pagination | Mittel | M |
| 4 | Sequenzielle, unabhängige Queries statt `Promise.all` | Mittel | S |
| 5 | `select('*')` bei Einzelzeilen-Fetches (Overfetch) | Niedrig | S |
| 6 | `Geist_Mono` geladen, aber nirgends genutzt | Niedrig | S |
| 7 | GSAP statisch im geteilten Bundle (über `AppBackdrop` auf jeder Route) | Niedrig | S/M |
| 8 | Index-Kandidaten (DB) — **nicht aus Code verifizierbar** | zu verifizieren | — |

---

## Befunde

### 1 — Request-Waterfall + doppelte Fetches auf der Values-Rezeptseite · **Hoch · M**

`app/(app)/recipes/[slug]/page.tsx` führt für `slug === "values"` eine Reihe von
**sequenziellen, voneinander unabhängigen** `await`-Aufrufen aus, von denen mehrere
dieselben Daten ein zweites Mal holen:

- [recipes/[slug]/page.tsx:70-72](app/(app)/recipes/[slug]/page.tsx#L70-L72) — `auth.getUser()`
- [recipes/[slug]/page.tsx:75-79](app/(app)/recipes/[slug]/page.tsx#L75-L79) — `profiles`
- [recipes/[slug]/page.tsx:82-89](app/(app)/recipes/[slug]/page.tsx#L82-L89) — `user_recipe_progress`
- [recipes/[slug]/page.tsx:97](app/(app)/recipes/[slug]/page.tsx#L97) — `hasSeenRecipeIntro(slug)` → enthält **erneut** `getUser()` + Query ([recipes/actions.ts:96-114](app/(app)/recipes/actions.ts#L96-L114))
- [recipes/[slug]/page.tsx:108-114](app/(app)/recipes/[slug]/page.tsx#L108-L114) — `values_hypothesis`
- [recipes/[slug]/page.tsx:122](app/(app)/recipes/[slug]/page.tsx#L122) — `getJournalData()` → enthält **erneut** `getUser()` + `user_recipe_progress` + `values_hypothesis` + `journal_entries` + `journal_entries` ([recipes/values/actions.ts:360-424](app/(app)/recipes/values/actions.ts#L360-L424))

Damit laufen pro Aufruf der Values-Rezeptseite grob **3× `getUser()`**, **2× `user_recipe_progress`**
und **2× `values_hypothesis`** — alle nacheinander statt parallel. `getEvaluationData`
(als `getJournalData` importiert) holt seine vier Tabellen-Queries
([values/actions.ts:379-424](app/(app)/recipes/values/actions.ts#L379-L424)) zusätzlich
selbst sequenziell, obwohl sie unabhängig sind.

**Wirkung:** Auf einer langsamen Mobilverbindung addieren sich ~8–10 serielle
Roundtrips auf der wichtigsten Rezept-Detailseite.

**Empfehlung:** Die bereits auf der Seite geholten `progress`/`hypothesis` an die
Auswertungs-Logik durchreichen statt sie in `getJournalData` erneut zu laden; die
verbleibenden unabhängigen Queries in ein `Promise.all` bündeln. `hasSeenRecipeIntro`
und die übrigen Lookups lassen sich ebenfalls parallelisieren.

---

### 2 — Wiederholte `auth.getUser()`-Roundtrips je Server-Action/Seite · **Mittel · M**

`supabase.auth.getUser()` validiert das Token serverseitig gegen den Supabase-Auth-Server
(Netzwerk-Roundtrip, anders als das rein lokale `getSession()`). Das Muster
```
const { data: { user } } = await supabase.auth.getUser();
```
wird in praktisch jeder Page **und** zusätzlich in jeder aufgerufenen Server-Action/Helper
erneut ausgeführt. Beispiele:

- Layout + Page derselben Navigation rufen es separat:
  [layout.tsx:14-16](app/(app)/layout.tsx#L14-L16) und z. B. [dashboard/page.tsx:37-39](app/(app)/dashboard/page.tsx#L37-L39)
- Helper-Actions wiederholen es: [recipes/actions.ts:99-101](app/(app)/recipes/actions.ts#L99-L101), [recipes/values/actions.ts:363-365](app/(app)/recipes/values/actions.ts#L363-L365), [booster/mantra/actions.ts](app/(app)/booster/mantra/actions.ts) u. a.

Zusätzlich holen `layout.tsx` und die jeweilige Page **beide** aus `profiles` — die Page
könnte das im Layout bereits validierte Ergebnis nicht ohne Weiteres wiederverwenden
(getrennte Render-Pässe), was den Doppel-Roundtrip systemisch macht.

**Wirkung:** Mehrere Auth-Validierungs-Roundtrips pro Seitenaufruf; einzeln günstig,
in Summe spürbar — besonders auf Seiten, die mehrere Actions aufrufen (siehe Befund 1).

**Empfehlung (zu verifizieren gegen Next-16-Doku in `node_modules/next/dist/docs/`):**
`getUser()` innerhalb eines Requests via `React.cache()` memoisieren, sodass mehrere
Aufrufe denselben Roundtrip teilen. Wo Daten ohnehin schon im Layout validiert wurden,
prüfen, ob die User-ID an Child-Logik durchgereicht werden kann. Hinweis: `getUser()`
bleibt für sicherheitsrelevante Pfade die korrekte (token-validierende) Wahl — Ziel ist
*Deduplizierung*, nicht der Wechsel auf `getSession()`.

---

### 3 — `journal/page.tsx`: `select('*')` ohne Limit/Pagination · **Mittel · M**

[journal/page.tsx:21-25](app/(app)/journal/page.tsx#L21-L25) lädt **alle** Journal-Einträge
des Users mit **allen** Spalten:
```
.from("journal_entries").select("*").eq("user_id", user.id).order("created_at", …)
```
Das Ergebnis wird komplett an die Client-Komponente `JournalHub` übergeben
([journal/page.tsx:40](app/(app)/journal/page.tsx#L40)), die clientseitig filtert
([journal-hub.tsx:31-40](components/journal/journal-hub.tsx#L31-L40)). `journal_entries`
enthält u. a. `content` (JSONB) und `ai_insights` (potenziell langer Text), die für die
Listenansicht nur als Vorschau gebraucht werden.

**Wirkung:** Payload und Serialisierung wachsen unbegrenzt mit der Nutzungsdauer; pro
Karte werden ohnehin nur Vorschau-Felder gerendert.

**Empfehlung:** Spalten auf das für die Liste Nötige beschränken und paginieren
(`.range()`/Infinite-Scroll oder ein vernünftiges Limit). Vollinhalt erst im Detail-Dialog
nachladen.

---

### 4 — Unabhängige Queries sequenziell statt `Promise.all` · **Mittel · S**

Mehrere Stellen führen voneinander unabhängige Reads nacheinander aus:

- [api/journal-analysis/route.ts:55-85](app/api/journal-analysis/route.ts#L55-L85) —
  `dailyEntries`, `hypothesisRow`, `evalRow` sind unabhängig, laufen aber seriell vor dem
  AI-Call.
- [recipes/values/actions.ts:379-424](app/(app)/recipes/values/actions.ts#L379-L424) —
  `progress`, `hypothesisRow`, `entries`, `evalRow` (4 serielle Roundtrips).
- [booster/mantra/page.tsx:20-34](app/(app)/booster/mantra/page.tsx#L20-L34) — `checkins`
  und anschließend `getMantraData()` (das selbst weitere Queries macht) seriell.

**Wirkung:** Je 1–3 vermeidbare serielle Roundtrips pro Aufruf.

**Empfehlung:** Unabhängige Reads in `Promise.all` zusammenfassen. Gut umgesetzt ist das
bereits in [dashboard/page.tsx:61-87](app/(app)/dashboard/page.tsx#L61-L87),
[me/page.tsx:79-94](app/(app)/me/page.tsx#L79-L94),
[settings/page.tsx:33-53](app/(app)/settings/page.tsx#L33-L53) und
[me/values/page.tsx:26-42](app/(app)/me/values/page.tsx#L26-L42) — dasselbe Muster auf die
o. g. Stellen übertragen.

---

### 5 — `select('*')` bei Einzelzeilen-Fetches (Overfetch) · **Niedrig · S**

Zwei Stellen holen mit `select('*')`, obwohl nur wenige Felder verwendet werden:

- [recipes/actions.ts:39-46](app/(app)/recipes/actions.ts#L39-L46) — liest danach nur
  `status`, `current_step`, `id`.
- [recipes/values/actions.ts:80-87](app/(app)/recipes/values/actions.ts#L80-L87) — liest
  danach nur `started_at`, `id`.

Beides sind `maybeSingle()`-Lookups (kein N+1), daher gering — aber unnötiger
Spalten-Transfer und brüchiger gegenüber Schemaänderungen.

**Empfehlung:** Spalten explizit benennen (wie bereits an den meisten anderen Stellen).

---

### 6 — `Geist_Mono` geladen, aber ungenutzt · **Niedrig · S**

[layout.tsx:13-16](app/layout.tsx#L13-L16) lädt `Geist_Mono` und mappt es auf
`--font-geist-mono` / `--font-mono` ([globals.css:11](app/globals.css#L11)). Eine Suche
nach der Nutzung ergibt **keine** `font-mono`-Klasse und keine Referenz auf `--font-mono`
außerhalb der Definition — die Schriftfamilie wird nirgends angewandt.

**Wirkung:** Unnötiger Font-Download/-Verarbeitung (next/font self-hosted, aber dennoch
zusätzliche woff2-Bytes + CSS-Variable).

**Empfehlung:** `Geist_Mono`-Import und die zugehörige Variable entfernen, solange keine
Monospace-Darstellung geplant ist.

---

### 7 — GSAP statisch im geteilten Client-Bundle · **Niedrig · S/M**

GSAP (3.15) wird in vielen Client-Komponenten **statisch** importiert
(`import gsap from "gsap"`), u. a. in [components/ui/ambient-blobs.tsx:4](components/ui/ambient-blobs.tsx#L4).
`AmbientBlobs` wird über `AppBackdrop` ([components/ui/app-backdrop.tsx:39-41](components/ui/app-backdrop.tsx#L39-L41))
im App-Layout ([layout.tsx:37](app/(app)/layout.tsx#L37)) auf **jeder** App-Route gerendert
— GSAP landet damit garantiert im gemeinsam geladenen Chunk.

**Wirkung:** GSAP-Core (~mittlerer zweistelliger KB-Bereich gzip) liegt im Initial-Bundle
jeder Seite, auch wenn die sichtbare Animation rein dekorativ ist.

**Einordnung:** Da GSAP ohnehin in zahlreichen Komponenten quer durch die App genutzt
wird, ist der Spar-Effekt eines dynamischen Imports begrenzt. Sinnvoll am ehesten für die
rein dekorativen, nicht-interaktiven Fälle (`AmbientBlobs`/Backdrop): Animation per
`dynamic(() => …, { ssr:false })` oder Lazy-Init nach `requestIdleCallback` laden, der
statische Ruhezustand bleibt sichtbar. Kein dringendes Problem.

**Positiv:** Keine GSAP-Plugins (`ScrollTrigger` etc.) registriert, kein
`gsap.registerPlugin` — der Import bleibt auf den Core beschränkt.

---

### 8 — Index-Kandidaten (DB) · **zu verifizieren — manuell in Supabase prüfen**

Aus dem Code **nicht** verifizierbar, aber die wiederkehrenden Filter-/Sortier-Muster legen
zusammengesetzte Indizes nahe. Bitte in Supabase gegen die vorhandenen Indizes abgleichen:

- `journal_entries` — gefiltert nach `(user_id, recipe_slug, template_type)` und sortiert
  nach `created_at`/`entry_date`. Sehr häufig, u. a.
  [values/actions.ts:405-412](app/(app)/recipes/values/actions.ts#L405-L412),
  [api/journal-analysis/route.ts:55-62](app/api/journal-analysis/route.ts#L55-L62),
  [me/values/journey/page.tsx:39-43](app/(app)/me/values/journey/page.tsx#L39-L43).
  → Kandidat: Composite-Index `(user_id, recipe_slug, template_type, created_at)`.
- `user_recipe_progress` — `(user_id, recipe_slug)` + `order by cycle_number desc`, sehr
  häufig (z. B. [recipes/[slug]/page.tsx:83-89](app/(app)/recipes/[slug]/page.tsx#L83-L89),
  [recipes/page.tsx:74-78](app/(app)/recipes/page.tsx#L74-L78)).
- `values_hypothesis` — `(user_id)` + `order by version desc`
  ([me/page.tsx:83-88](app/(app)/me/page.tsx#L83-L88)).
- `daily_checkins` — `(user_id, date)` ([dashboard/page.tsx:72-77](app/(app)/dashboard/page.tsx#L72-L77)).
- `cleanser_checkins` — `(user_id, cleanser_slug)` + `order by date desc`
  ([booster/mantra/page.tsx:20-26](app/(app)/booster/mantra/page.tsx#L20-L26)).
- `promise_completions` — `WHERE promise_id IN (…)` ([booster/promises/page.tsx:31-34](app/(app)/booster/promises/page.tsx#L31-L34)).

---

## Sauber / unkritisch (geprüft, kein Handlungsbedarf)

- **Server vs. Client:** Server Components sind Default; `"use client"` markiert
  durchgängig echte Interaktivität (Formulare, Slider, Animations-Wrapper, Tabs). Kein
  Fall gefunden, in dem eine Client-Komponente sinnvoll Server-Komponente sein sollte.
  `DashboardFocus` ([components/dashboard/dashboard-focus.tsx](components/dashboard/dashboard-focus.tsx))
  zieht bewusst nur die mood-reaktive Logik in den Client; die Server-Berechnung bleibt in
  der Page.
- **GSAP-Cleanup:** Konsistent korrekt — `tween.kill()` / `tl.kill()` in der
  `useEffect`-Cleanup, Event-Listener werden entfernt. Belege:
  [reveal.tsx:41-44](components/ui/reveal.tsx#L41-L44),
  [ambient-blobs.tsx:84-87](components/ui/ambient-blobs.tsx#L84-L87),
  [completion-celebration.tsx:48-51](components/ui/completion-celebration.tsx#L48-L51),
  [stat-card.tsx:40-43](components/ui/stat-card.tsx#L40-L43),
  [bottom-nav.tsx:67-68](components/layout/bottom-nav.tsx#L67-L68),
  [onboarding/page.tsx:199-216](app/onboarding/page.tsx#L199-L216).
- **`prefers-reduced-motion`:** Über `useReducedMotion`
  ([lib/hooks/use-reduced-motion.ts](lib/hooks/use-reduced-motion.ts)) in **jeder**
  Animationskomponente abgefragt und sauber auf statische Endzustände gegated (inkl.
  Live-Reaktion auf OS-Änderung via `matchMedia`-Listener). Hartes Requirement erfüllt.
- **N+1 vermieden:** `booster/promises/page.tsx` lädt Completions per
  `.in("promise_id", ids)` statt pro Promise zu iterieren
  ([promises/page.tsx:29-44](app/(app)/booster/promises/page.tsx#L29-L44)).
- **Effizientes Zählen:** `settings/page.tsx` nutzt `count: "exact", head: true` statt
  Zeilen zu laden ([settings/page.tsx:39-42](app/(app)/settings/page.tsx#L39-L42)).
- **Memoization:** `JournalHub` memoisiert Filter-Tabs und gefilterte Liste
  ([journal-hub.tsx:29-40](components/journal/journal-hub.tsx#L29-L40)). Keine offensichtlich
  teuren Berechnungen im Render gefunden; `Array.from({length})`-Stellen sind kleine,
  konstante Schleifen.
- **Bilder/Assets:** Kein `<img>`/`next/image` im UI nötig — das Maskottchen ist
  Inline-SVG ([components/brand/mascot.tsx](components/brand/mascot.tsx)), übrige Assets sind
  kleine SVGs; PNGs ausschließlich PWA-Icons via `manifest.ts`/Apple-Touch-Icon
  ([app/manifest.ts](app/manifest.ts), [layout.tsx:35-37](app/layout.tsx#L35-L37)) — korrekt,
  nicht als Komponente gerendert.
- **Draft-Hook:** `useFormDraft` schreibt nur bei Bedarf (Fehlerfall), kein
  Schreib-Sturm; Storage-Zugriffe in try/catch
  ([lib/hooks/use-form-draft.ts](lib/hooks/use-form-draft.ts)).
- **Service Worker:** In Dev bewusst deaktiviert/deregistriert, Registrierung erst nach
  `load` ([components/ServiceWorkerRegistration.tsx](components/ServiceWorkerRegistration.tsx)).

---

## Hinweis zu Next.js 16

Befund 2 (Memoisierung von `getUser()`/Reads pro Request) und mögliche
Streaming-/`Suspense`-Optimierungen sollten vor Umsetzung gegen die projektlokale Doku in
`node_modules/next/dist/docs/` abgeglichen werden (siehe `AGENTS.md`: diese Next-Version
weicht von Trainingswissen ab). Streaming/`loading.tsx` ist bereits für mehrere Routen
vorhanden ([dashboard/loading.tsx](app/(app)/dashboard/loading.tsx),
[journal/loading.tsx](app/(app)/journal/loading.tsx),
[recipes/loading.tsx](app/(app)/recipes/loading.tsx)) — granulareres `Suspense` innerhalb
der Values-Rezeptseite (Befund 1) wäre eine sinnvolle Ergänzung, ist aber optional.
