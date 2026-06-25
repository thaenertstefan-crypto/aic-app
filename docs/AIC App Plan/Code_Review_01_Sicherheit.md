# Code-Review 01 — Sicherheit

**Datum:** 2026-06-25
**Branch:** main (Stand `9c3dfe6`)
**Reviewer:** Claude (Code-Review, rein analysierend — keine Code-Änderungen vorgenommen)
**Scope:** Sicherheit. Secrets/Keys, Auth auf API-Routen & Server Actions, Supabase-/RLS-Zugriffe, LLM-Input (Prompt-Injection, Rate-Limiting), XSS/Injection.

> **Wichtiger Hinweis zur Verifizierbarkeit:** RLS-Policies, DB-Constraints und Indizes liegen ausschließlich in Supabase und sind **aus dem Code nicht verifizierbar**. Mehrere Befunde unten hängen direkt davon ab, ob RLS pro Tabelle korrekt aktiviert und konfiguriert ist. Diese sind als **„manuell in Supabase prüfen"** markiert. Solange RLS nicht verifiziert ist, sollten die betroffenen Befunde als real-existierend angenommen werden.

---

## Zusammenfassung

Das Sicherheitsfundament ist insgesamt **solide und konsistent**: Der Anthropic-Key ist sauber serverseitig gekapselt, jede API-Route und jede Server Action prüft `getUser()`, das `(app)`-Layout sperrt unangemeldete Nutzer aus, und es existiert ein durchdachtes per-User-Rate-Limiting für die drei KI-Endpunkte. User-Content wird über React/JSX gerendert (auto-escaped); das einzige `dangerouslySetInnerHTML` enthält ausschließlich statisches Entwickler-SVG.

Die wesentlichen offenen Punkte betreffen die **Abhängigkeit von RLS als alleinige Autorisierungsgrenze** — besonders im Promises-Feature, wo Owner-Checks im Code fehlen und vollständig auf RLS vertraut wird — sowie kleinere Themen (Rate-Limit-Bypass über löschbare Log-Zeilen, unbegrenzte Eingabelänge an die KI, DB-Fehlermeldungen im Client).

| # | Befund | Schweregrad | Aufwand |
|---|--------|-------------|---------|
| H-1 | Promises/Promise-Completions: Owner-Checks nur über RLS, kein `user_id`-Filter im Code | Hoch (zu verifizieren) | S |
| H-2 | RLS ist alleinige Autorisierungsgrenze für alle Nutzerdaten-Tabellen | Hoch (zu verifizieren) | M |
| M-1 | Rate-Limit über `ai_usage_log` umgehbar, falls Nutzer eigene Log-Zeilen löschen/ändern dürfen | Mittel (zu verifizieren) | S |
| M-2 | Keine Begrenzung der Eingabelänge an die KI-Endpunkte (Input-Kostenrisiko) | Mittel | S |
| N-1 | Rohe Supabase-`error.message` werden an den Client zurückgegeben | Niedrig | S |
| N-2 | Prompt-Injection: keine explizite Delimiter-Trennung von User-Content | Niedrig | S |
| N-3 | `proxy.ts` (Middleware) erzwingt keinen Auth-Gate (nur Session-Refresh) | Niedrig (Info) | — |

**Als sauber bestätigt:** Anthropic-Key-Kapselung, kein `service_role`-Key im Code, `.env*` korrekt gitignored, Auth-Checks auf allen Routen/Actions, XSS-Oberfläche, Rate-Limiting-Grundgerüst.

---

## 1. Secrets & Keys

### ✅ Anthropic-API-Key ausschließlich serverseitig — sauber
[lib/anthropic/client.ts:1-10](../../lib/anthropic/client.ts#L1-L10)

Der Client wird mit `import "server-only"` (Zeile 1) geschützt — der Build bricht ab, falls das Modul je in eine Client-Komponente gezogen wird. Der Key (`process.env.ANTHROPIC_API_KEY`, Zeile 9) hat **kein** `NEXT_PUBLIC_`-Präfix und landet damit nicht im Client-Bundle. Verwendet wird `anthropic` nur in den drei API-Routen ([app/api/journal-analysis/route.ts](../../app/api/journal-analysis/route.ts), [app/api/rights-formulator/route.ts](../../app/api/rights-formulator/route.ts), [app/api/overthinking-question/route.ts](../../app/api/overthinking-question/route.ts)) — alles serverseitig. **Sauber.**

### ✅ Kein `service_role`-Key im Code — sauber
Eine projektweite Suche nach `service_role` / `SERVICE_ROLE` ergab **keine Treffer** im Anwendungscode. Sowohl der Browser-Client ([lib/supabase/client.ts:3-8](../../lib/supabase/client.ts#L3-L8)) als auch der Server-Client ([lib/supabase/server.ts:7-22](../../lib/supabase/server.ts#L7-L22)) und die Middleware ([proxy.ts:8-27](../../proxy.ts#L8-L27)) verwenden ausschließlich `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Es gibt im Code keinen privilegierten Service-Role-Pfad, der RLS umgeht. **Sauber.**

> Zu verifizieren (nicht aus Code prüfbar): dass in Vercel/Supabase-Env **kein** `service_role`-Key versehentlich mit `NEXT_PUBLIC_`-Präfix hinterlegt wurde.

### ✅ `.env`-Dateien nicht eingecheckt — sauber
[.gitignore:33-34](../../.gitignore#L33-L34) ignoriert `.env*`. `git ls-files` listet **keine** `.env`-Datei. Lokal existiert `.env.local`, ist aber nicht getrackt. Die einzigen `NEXT_PUBLIC_`-Variablen (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) sind per Design öffentlich. **Sauber.**

---

## 2. Auth auf API-Routen / Server Actions

### ✅ Durchgängiges `getUser()`-Pattern — sauber
Alle drei API-Routen prüfen direkt zu Beginn die Session und antworten sonst mit `401`:
- [app/api/journal-analysis/route.ts:30-39](../../app/api/journal-analysis/route.ts#L30-L39)
- [app/api/rights-formulator/route.ts:19-28](../../app/api/rights-formulator/route.ts#L19-L28)
- [app/api/overthinking-question/route.ts:23-32](../../app/api/overthinking-question/route.ts#L23-L32)

Alle geprüften Server Actions rufen ebenfalls `supabase.auth.getUser()` auf und brechen bei fehlendem User ab. Stichproben über alle Action-Dateien (`getUser()`-Vorkommen in `recipes/values/actions.ts`, `bill-of-rights/actions.ts`, `me/bill-of-rights/actions.ts`, `booster/*/actions.ts`, `journal/actions.ts`, `dashboard/actions.ts`, `cleansers/actions.ts`, `onboarding.actions.ts`) bestätigen das Muster. Wichtig: `getUser()` (nicht `getSession()`) validiert das Token serverseitig — das ist die korrekte Wahl.

### ✅ Layout-Gate für unangemeldete Nutzer — sauber
[app/(app)/layout.tsx:12-30](../../app/(app)/layout.tsx#L12-L30) leitet ohne User nach `/login` und ohne abgeschlossenes Onboarding nach `/onboarding` um. Die API-Routen liegen außerhalb dieses Layouts, sichern sich aber selbst über `getUser()` ab (s.o.).

### ✅ Owner-Checks über `user.id` — überwiegend sauber
Schreib-/Lesezugriffe filtern in der Regel explizit auf `eq("user_id", user.id)` und führen Updates/Deletes über eine zuvor mit `user_id` ermittelte Row-`id` aus. Beispiele:
- [app/(app)/recipes/values/actions.ts:255-288](../../app/(app)/recipes/values/actions.ts#L255-L288) (Upsert über vorab per `user_id` gefundene `id`)
- [app/(app)/booster/mantra/actions.ts:229-265](../../app/(app)/booster/mantra/actions.ts#L229-L265) (Update **und** Delete filtern zusätzlich `eq("user_id", user.id)` als Defense-in-Depth — vorbildlich)
- [app/api/journal-analysis/route.ts:135-140](../../app/api/journal-analysis/route.ts#L135-L140) (Update über `evalRow.id`, der zuvor per `user_id` geladen wurde)

**Ausnahme:** das Promises-Feature — siehe **H-1**.

---

### H-1 — Promises: Owner-Checks fehlen im Code, vollständige Abhängigkeit von RLS
**Schweregrad: Hoch (zu verifizieren)** · **Aufwand: S**

[app/(app)/booster/promises/actions.ts](../../app/(app)/booster/promises/actions.ts)

Im Gegensatz zum restlichen Code (z.B. Mantra, das zusätzlich `eq("user_id", user.id)` setzt) verlassen sich die Promises-Actions **ausschließlich** auf RLS für die Autorisierung — es gibt keinen `user_id`-Filter und keinen Owner-Abgleich im Code:

- **`togglePromiseCompletionAction`** — lädt das Promise nur über `eq("id", promiseId).single()` ohne `user_id`-Bezug ([Zeile 156-160](../../app/(app)/booster/promises/actions.ts#L156-L160)); fügt anschließend `promise_completions` per `promise_id` ein/löscht sie ([Zeile 168-195](../../app/(app)/booster/promises/actions.ts#L168-L195)) und aktualisiert `promises` per `eq("id", promiseId)` ([Zeile 200-207](../../app/(app)/booster/promises/actions.ts#L200-L207)).
- **`endPromiseAction`** — `update({ active: false }).eq("id", promiseId)` **ohne** `user_id`-Filter ([Zeile 242-245](../../app/(app)/booster/promises/actions.ts#L242-L245)).
- **`recomputeStreak`** — liest `promise_completions` nur per `promise_id` ([Zeile 48-52](../../app/(app)/booster/promises/actions.ts#L48-L52)).

Der `promise_id` kommt aus dem Client-`FormData` ([Zeile 150](../../app/(app)/booster/promises/actions.ts#L150), [Zeile 237](../../app/(app)/booster/promises/actions.ts#L237)). Ist RLS auf `promises` und `promise_completions` **nicht** oder fehlerhaft konfiguriert, kann ein angemeldeter Nutzer mit einer fremden (erratenen/geleakten) `promise_id` ein fremdes Promise deaktivieren, fremde Completions setzen/löschen und damit fremde Streak-Daten manipulieren bzw. lesen — ein klassisches IDOR.

**Verschärfend:** `promise_completions` hat (nach Code-Nutzung zu urteilen) **keine eigene `user_id`-Spalte** — die Verknüpfung läuft nur über `promise_id`. RLS auf dieser Tabelle muss deshalb über eine Subquery/Join auf `promises.user_id` erzwungen werden. Eine naive `auth.uid() = user_id`-Policy würde hier nicht greifen (Spalte fehlt) — entweder ist die Tabelle dann ungeschützt oder komplett gesperrt.

**Empfehlung:**
1. **Manuell in Supabase prüfen:** RLS auf `promises` (z.B. `auth.uid() = user_id` für select/insert/update/delete) und auf `promise_completions` (Owner-Check via `EXISTS (SELECT 1 FROM promises p WHERE p.id = promise_id AND p.user_id = auth.uid())`).
2. **Defense-in-Depth im Code:** In `togglePromiseCompletionAction` und `endPromiseAction` zusätzlich `.eq("user_id", user.id)` setzen — konsistent zum Mantra-Pattern. Das schließt die Lücke unabhängig vom RLS-Zustand.

---

## 3. Supabase-Zugriffe & RLS

### H-2 — RLS ist die alleinige Autorisierungsgrenze für alle Nutzerdaten-Tabellen
**Schweregrad: Hoch (zu verifizieren)** · **Aufwand: M**

Die App nutzt durchgängig den **Anon-Key + RLS** (Browser- wie Server-Client), nie den Service-Role-Key. Das ist die empfohlene Supabase-Architektur — aber sie steht und fällt damit, dass **für jede Tabelle RLS aktiviert und korrekt formuliert** ist. Aus dem Code ist das nicht verifizierbar. Bei Lesezugriffen filtert der Code zwar meist zusätzlich auf `user_id`, aber dieser Filter ist eine reine WHERE-Bedingung, **keine** Sicherheitsgrenze — ohne RLS könnte ein manipulierter Client beliebige Zeilen abfragen.

**Tabellen mit Nutzerdaten (vollständige Liste aus dem Code, alle RLS-pflichtig — manuell in Supabase prüfen):**

| Tabelle | `user_id`-Spalte (lt. Code-Nutzung) | Anmerkung |
|---------|--------------------------------------|-----------|
| `profiles` | `id` = `auth.uid()` | Onboarding-Upsert per `id` |
| `journal_entries` | ja | zentrale Tabelle, alle Recipes/Booster |
| `values_hypothesis` | ja | Versionierung pro User |
| `user_recipe_progress` | ja | Fortschritt/Cycles |
| `bill_of_rights` | ja | JSONB-Array pro User (append-then-upsert) |
| `daily_checkins` | ja | Unique `(user_id, date)` |
| `ai_usage_log` | ja | Rate-Limit-Quelle — siehe M-1 |
| `cleanser_intro_seen` | ja | Unique `(user_id, cleanser_slug)` |
| `cleanser_checkins` | ja | Unique `(user_id, cleanser_slug, date)` |
| `user_mantra` | ja | Unique `(user_id)` |
| `mantra_cards` | ja | Update/Delete mit `user_id`-Defense-in-Depth |
| `promises` | ja | **siehe H-1 — Code-Owner-Check fehlt** |
| `promise_completions` | **nein** (nur `promise_id`) | **siehe H-1 — RLS muss über Join greifen** |

**Empfehlung:** Für jede Tabelle in Supabase verifizieren: (1) `ALTER TABLE … ENABLE ROW LEVEL SECURITY`, (2) Policies für select/insert/update/delete, (3) bei `bill_of_rights` (ein JSONB-Array pro User) und `promise_completions` (Join-basiert) besonders genau hinsehen. Der Supabase-Security-Advisor (`get_advisors`) listet Tabellen ohne RLS automatisch — als ersten Schritt empfohlen.

---

## 4. LLM-Input (Prompt-Injection & Rate-Limiting/Kosten)

### ✅ System-/User-Trennung über Rollen — grundsätzlich sauber
In allen drei Routen wird der System-Prompt über das `system`-Feld gesetzt und User-Content ausschließlich als `messages: [{ role: "user", … }]` übergeben — keine String-Konkatenation von System- und User-Text:
- [app/api/journal-analysis/route.ts:114-121](../../app/api/journal-analysis/route.ts#L114-L121)
- [app/api/rights-formulator/route.ts:62-67](../../app/api/rights-formulator/route.ts#L62-L67)
- [app/api/overthinking-question/route.ts:84-89](../../app/api/overthinking-question/route.ts#L84-L89)

Die System-Prompts ([lib/anthropic/prompts/](../../lib/anthropic/prompts/)) sind statisch und enthalten keinen interpolierten User-Content.

### ✅ Rate-Limiting vorhanden — sauber
[lib/anthropic/rate-limit.ts](../../lib/anthropic/rate-limit.ts) implementiert per-User-Stundenlimits, die in allen drei Routen **vor** dem KI-Call greifen (journal-analysis: 10, rights-formulator: 20, overthinking-question: 40 / Stunde). Gutes Detail: `logUsage` wird erst **nach** erfolgreichem KI-Call aufgerufen ([journal-analysis:124](../../app/api/journal-analysis/route.ts#L124)), sodass Fehlversuche das Kontingent nicht belasten; bei rights-formulator/overthinking wird das Limit zudem erst **nach** der Input-Validierung geprüft, sodass leere Requests kein Kontingent verbrennen. Output ist über `max_tokens` gedeckelt (900/150/100) und es wird das günstige `claude-haiku-4-5` verwendet.

### M-1 — Rate-Limit über `ai_usage_log` umgehbar (falls Nutzer eigene Log-Zeilen löschen/ändern können)
**Schweregrad: Mittel (zu verifizieren)** · **Aufwand: S**

[lib/anthropic/rate-limit.ts:23-51](../../lib/anthropic/rate-limit.ts#L23-L51)

Das Limit zählt die Zeilen des Nutzers in `ai_usage_log` über den **RLS-gescopten** Client. Erlaubt die RLS-Policy dem Nutzer `DELETE`/`UPDATE` auf seinen eigenen `ai_usage_log`-Zeilen, kann er sein Kontingent jederzeit zurücksetzen (Zeilen löschen → Count = 0) und das Limit beliebig oft umgehen → unkontrollierte KI-Kosten.

**Empfehlung — manuell in Supabase prüfen:** RLS auf `ai_usage_log` so konfigurieren, dass der Nutzer nur `INSERT` (und ggf. `SELECT` für den eigenen Count) darf, aber **kein** `UPDATE`/`DELETE`. Idealerweise das Logging serverseitig vom Nutzer-Schreibrecht entkoppeln.

### M-2 — Keine Begrenzung der Eingabelänge an die KI-Endpunkte
**Schweregrad: Mittel** · **Aufwand: S**

`max_tokens` begrenzt nur die **Ausgabe**, nicht die **Eingabe**. Die User-Eingaben werden ungekürzt in den Prompt übernommen:
- [app/api/rights-formulator/route.ts:30-60](../../app/api/rights-formulator/route.ts#L30-L60) — `situation` / `idealReaction` ohne Längenobergrenze.
- [app/api/overthinking-question/route.ts:34-82](../../app/api/overthinking-question/route.ts#L34-L82) — `problem` + `whyChain[]` (Array) ohne Längen-/Element-Begrenzung.
- [app/api/journal-analysis/route.ts:55-112](../../app/api/journal-analysis/route.ts#L55-L112) — entstammt eigenen DB-Einträgen (auf 7 begrenzt), aber die Einzeleinträge selbst sind unbegrenzt.

Ein Nutzer kann pro erlaubtem Call (innerhalb des Rate-Limits) sehr große Eingaben senden und so die Input-Token-Kosten in die Höhe treiben. Das Rate-Limit deckelt die Anzahl der Calls, nicht die Kosten pro Call.

**Empfehlung:** Server-seitige Maximallänge pro Feld (z.B. 2.000–4.000 Zeichen) und Deckelung der `whyChain`-Elementanzahl, mit `400`-Antwort bei Überschreitung. Vergleich: Mantra-Actions validieren bereits Längen (`MANTRA_MAX`/`CARD_MAX`, [mantra/actions.ts:13-14, 143-155](../../app/(app)/booster/mantra/actions.ts#L143-L155)) — dasselbe Muster fehlt an den KI-Endpunkten.

### N-2 — Prompt-Injection: keine explizite Delimiter-Trennung von User-Content
**Schweregrad: Niedrig** · **Aufwand: S**

User-Content wird unmarkiert in den User-Message-Text eingebettet (z.B. „Oberflächliches Problem:\n{problem}" in [overthinking-question:72-82](../../app/api/overthinking-question/route.ts#L72-L82)). Ein Nutzer könnte Instruktionen einschleusen („Ignoriere die obigen Anweisungen …"). **Impact ist gering**, weil das Ergebnis nur an denselben Nutzer zurückgeht (kein Cross-User-Effekt, keine Tool-/DB-Aktionen durch die KI) — der Nutzer kann allenfalls seine eigene Ausgabe manipulieren. Dennoch empfehlenswert als Härtung.

**Empfehlung:** User-Content klar delimitieren (z.B. in `<user_input>`-Tags) und im System-Prompt anweisen, Inhalt darin ausschließlich als Daten, nie als Instruktion zu behandeln.

---

## 5. XSS / Injection

### ✅ `dangerouslySetInnerHTML` nur mit statischem Entwickler-SVG — sauber
[app/(app)/me/values/journey/values-journey-client.tsx:234](../../app/(app)/me/values/journey/values-journey-client.tsx#L234)

Die einzige Nutzung im gesamten App-Code injiziert die Variable `inner`, die aus `compassInner()` stammt und ausschließlich aus den **statisch im Modul definierten** Konstanten `COMPASS_DELTAS`/`COMPASS_TICKS`/`COMPASS_PETALS` zusammengesetzt wird ([Zeile 48-90](../../app/(app)/me/values/journey/values-journey-client.tsx#L48-L90)) — reines, entwicklerseitig kontrolliertes Kompass-SVG. **Kein** User-Content fließt hier ein. **Sauber.**

> Die weiteren `innerHTML`-Treffer liegen in `docs/AIC App Plan/*.html` (Prototyp-Dateien, nicht Teil der ausgelieferten App) und sind nicht relevant.

### ✅ User-Content sonst über JSX (auto-escaped) — sauber
Journal-Inhalte, `ai_insights` und Bill-of-Rights-Texte werden über normales JSX gerendert, das React standardmäßig escaped. Es wurde **keine** weitere `dangerouslySetInnerHTML`-/`innerHTML`-Nutzung mit Nutzerdaten gefunden. SQL-Injection ist durch die parametrisierte Supabase-Query-API ausgeschlossen (keine rohen SQL-Strings im App-Code).

---

## 6. Weitere Beobachtungen

### N-1 — Rohe Supabase-`error.message` an den Client
**Schweregrad: Niedrig** · **Aufwand: S**

Viele Actions geben DB-Fehler direkt durch, z.B. `return { error: error.message }` ([recipes/values/actions.ts:61](../../app/(app)/recipes/values/actions.ts#L61), [bill-of-rights/actions.ts:133](../../app/(app)/recipes/bill-of-rights/actions.ts#L133), u.v.m.). Das kann interne Details (Tabellen-/Spaltennamen, Constraint-Namen) an den Client leaken — geringfügige Information Disclosure und zugleich UX-unschön (englische Roh-Fehler in einer deutschen, warmherzigen UI). Positives Gegenbeispiel: die Auth-Actions mappen Fehler auf freundliche deutsche Microcopy ([auth.actions.ts:11-30](../../app/(auth)/auth.actions.ts#L11-L30)).

**Empfehlung:** DB-Fehler serverseitig loggen, dem Client aber eine generische deutsche Meldung zurückgeben (analog zu `friendlyAuthError`).

### N-3 — `proxy.ts` (Middleware) erzwingt keinen Auth-Gate
**Schweregrad: Niedrig (Info)** · **Aufwand: —**

[proxy.ts:5-34](../../proxy.ts#L5-L34) ruft nur `getUser()` zum Session-Refresh auf und leitet **nicht** um. Das ist hier **unkritisch**, weil das `(app)`-Layout und jede Action/Route die Auth selbst durchsetzen. Erwähnt zur Vollständigkeit: Der Schutz hängt also an den per-Route-Checks, nicht an der Middleware — beim Anlegen neuer Routen/Actions muss der `getUser()`-Check bewusst mitgezogen werden (kein zentraler Fallback).

---

## Verifizierungs-Checkliste (manuell in Supabase)

- [ ] **RLS aktiviert** auf allen Tabellen aus der Liste in Abschnitt 3 (Advisor `get_advisors` laufen lassen).
- [ ] **`promises`**: select/insert/update/delete nur für `auth.uid() = user_id` (H-1).
- [ ] **`promise_completions`**: Owner-Check über Join auf `promises.user_id` (hat keine eigene `user_id`-Spalte) (H-1).
- [ ] **`ai_usage_log`**: kein `UPDATE`/`DELETE` für Nutzer; nur `INSERT`/`SELECT` der eigenen Zeilen (M-1).
- [ ] **`bill_of_rights`**: RLS korrekt trotz JSONB-Array-pro-User-Modell.
- [ ] **`profiles`**: Policy auf `id = auth.uid()` (nicht `user_id`).
- [ ] **Env (Vercel/Supabase):** kein `service_role`-Key mit `NEXT_PUBLIC_`-Präfix.

## Empfohlene Code-Härtungen (unabhängig von RLS)

- [ ] H-1: `.eq("user_id", user.id)` in `togglePromiseCompletionAction` und `endPromiseAction` ergänzen.
- [ ] M-2: Server-seitige Maximallängen für KI-Eingaben (`situation`, `idealReaction`, `problem`, `whyChain`).
- [ ] N-1: DB-Fehler nicht roh an den Client geben (generische deutsche Meldung + serverseitiges Logging).
- [ ] N-2: User-Content in den KI-Prompts delimitieren.
