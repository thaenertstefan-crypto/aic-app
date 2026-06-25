# Code Review 03 — Geschäftslogik & Edge-Cases

**Datum:** 2026-06-25
**Fokus:** Korrektheit der Geschäftslogik und Edge-Cases
**Methode:** Statische Analyse der tatsächlich eingelesenen Quelldateien. DB-Schema,
RLS-Policies, Indizes und die reale Vercel-Server-Zeitzone konnten nicht aus dem
Repo verifiziert werden und sind als „zu verifizieren" markiert.

## Bewertungsskala
- **Schweregrad:** Kritisch / Hoch / Mittel / Niedrig
- **Aufwand:** S (klein) / M (mittel) / L (groß)

---

## Zusammenfassung der wichtigsten Befunde

| # | Bereich | Befund | Schweregrad | Aufwand |
|---|---------|--------|-------------|---------|
| F2.1 | Gating/Zeitzonen | Gating vergleicht User-lokales `entry_date` mit **Server-Datum** | Hoch | M |
| F-CYCLE | Streak/Wiederholzyklen | Wiederholte Werte-Zyklen sind kaputt (Einträge nicht pro Zyklus gezählt) | Hoch | M |
| F1.1 | bill_of_rights | Read-modify-write auf JSONB-Array → Last-Write-Wins-Verlust | Mittel | M |
| F1.2 | bill_of_rights | Stiller Speicherfehler im Edit/Delete-UI | Mittel | S |
| F2.2 | Zeitzonen | `entry_date` mal lokal, mal UTC geschrieben | Mittel | M |
| F3.1 | Streak | Tagesgrenze in UTC statt User-Zeit | Mittel | S |
| F5.1 | Fehlerbehandlung | Mehrere Progress-Updates schlucken DB-Fehler still | Mittel | S |
| F4.1 | Routing | Tote/duplizierte Alt-Routen (recipes/values/*) | Niedrig | S |
| F5.3 | Fehlerbehandlung | Server-Reads coalescen Fehler zu leerem Zustand | Niedrig | M |

---

## 1. bill_of_rights — Schreibmuster & Races

### Frage 1a: Folgt jede Schreiboperation dem append-then-upsert-Muster?
**Ja — das Muster ist konsistent.** Alle Schreibpfade laufen über die kanonische
`saveRightsAction`, die das **komplette** `rights`-Array per upsert (update bei
vorhandener Zeile, sonst insert) zurückschreibt:

- Manuelles Hinzufügen: [me/bill-of-rights/actions.ts:39-59](../../app/(app)/me/bill-of-rights/actions.ts#L39-L59) → `persistRights` → `saveRightsAction`
- KI-Vorschlag übernehmen: [me/bill-of-rights/actions.ts:110-123](../../app/(app)/me/bill-of-rights/actions.ts#L110-L123)
- Edit/Delete im UI: [bill-of-rights-me.tsx:78-101](../../app/(app)/me/bill-of-rights/bill-of-rights-me.tsx#L78-L101)
- Kanonischer Writer: [recipes/bill-of-rights/actions.ts:183-239](../../app/(app)/recipes/bill-of-rights/actions.ts#L183-L239)

Es gibt keine Einzel-Row-Writes — das Design (ein JSONB-Array pro User) wird sauber eingehalten.

### F1.1 — Last-Write-Wins-Verlust bei nebenläufigen Updates · **Mittel · M**
Jeder Schreibvorgang ist ein **Read-modify-write über zwei getrennte Requests**:
Array laden → in JS anhängen/ändern → komplettes Array zurückschreiben. Es gibt
keine Versions-/`updated_at`-Prüfung beim Write.

Konkrete Verlustszenarien:
1. **Stale-Snapshot im Edit-UI:** `BillOfRightsMe` hält `initialRights` im State
   ([bill-of-rights-me.tsx:74](../../app/(app)/me/bill-of-rights/bill-of-rights-me.tsx#L74)).
   Fügt der User auf einem zweiten Gerät / in einem zweiten Tab über `/add` oder
   `/generate` ein Recht hinzu, kennt diese Seite es nicht. Ein anschließendes
   Edit/Delete schreibt den **alten** Array-Stand zurück und löscht das neu
   hinzugefügte Recht wieder ([persist, Z. 78-83](../../app/(app)/me/bill-of-rights/bill-of-rights-me.tsx#L78-L83)).
2. **Doppel-Submit / zwei parallele Appends:** `appendRightAction` und
   `saveGeneratedRightAction` lesen jeweils frisch
   ([actions.ts:46](../../app/(app)/me/bill-of-rights/actions.ts#L46),
   [actions.ts:111-116](../../app/(app)/me/bill-of-rights/actions.ts#L111-L116)),
   doch zwischen Read und Write liegt ein Fenster — zwei zeitnahe Adds verlieren einen.

Das ist dem Single-Array-Design inhärent. Für eine Single-User-Self-Help-App mit
geringer Nebenläufigkeit ist das Risiko überschaubar, aber Multi-Device- und
Doppelklick-Fälle sind real. Minderung: optimistic concurrency (`updated_at`
mitschicken und beim Update prüfen) oder server-seitiges Re-Load-und-Merge direkt
vor dem Write statt Übergabe des kompletten Client-Arrays.

### F1.2 — Stiller Speicherfehler im Edit/Delete-UI · **Mittel · S**
`persist()` ruft `saveRightsAction` auf, **ignoriert aber das Ergebnis**
([bill-of-rights-me.tsx:78-83](../../app/(app)/me/bill-of-rights/bill-of-rights-me.tsx#L78-L83)):

```ts
async function persist(updated: Right[]) {
  setRights(updated);                 // optimistisch
  const fd = new FormData();
  fd.set("rights", JSON.stringify(updated));
  await saveRightsAction({ error: null, success: false }, fd); // .error wird nie geprüft
}
```

Schlägt der Write fehl (Netzwerk, RLS, Supabase-Down), sieht der User den
optimistisch geänderten Zustand und glaubt, es sei gespeichert — beim nächsten
Reload ist die Änderung weg. Es gibt hier weder Fehleranzeige noch `revalidatePath`.
Im Gegensatz dazu behandeln `appendRightAction`/`saveGeneratedRightAction` den
Fehler korrekt.

---

## 2. Gating / Zeitzonen

### F2.1 — Kalender-Gating vergleicht User-Zeit mit Server-Zeit · **Hoch · M · (Server-TZ zu verifizieren)**
Das ist der zentrale Korrektheitsdefekt der Values-Journey-Freischaltung.

- **`entry_date` wird client-seitig (User-Browser, lokale Zeit) erzeugt:**
  `journal-form.tsx` ist eine `"use client"`-Komponente; `getTodayKey()` läuft im
  Browser und nutzt `getFullYear/getMonth/getDate`
  ([me/values/journey/journal/journal-form.tsx:24-30](../../app/(app)/me/values/journey/journal/journal-form.tsx#L24-L30)),
  geschrieben über das versteckte Feld
  ([Z. 226](../../app/(app)/me/values/journey/journal/journal-form.tsx#L226)). → korrekt User-lokal.

- **Das Gating läuft server-seitig:** `ValuesJourneyPage` ist eine Server-Komponente.
  Die dortige, **namensgleiche** `getTodayKey()` nutzt zwar ebenfalls die lokalen
  Date-Getter — aber auf dem **Server**
  ([me/values/journey/page.tsx:10-16](../../app/(app)/me/values/journey/page.tsx#L10-L16)),
  also in Server-Zeitzone (auf Vercel = UTC), nicht in User-Zeit. Der Vergleich
  ([Z. 83-89](../../app/(app)/me/values/journey/page.tsx#L83-L89)):

  ```ts
  if (latestEntryDate === getTodayKey() && currentStep >= 1 && currentStep <= 7) {
    currentStep = gatingDailyCount; // nächsten Tag sperren
  }
  ```

  vergleicht somit **User-lokales `entry_date`** gegen **Server-UTC-Datum**.

**Folge:** Sobald das lokale Datum des Users zum Render-Zeitpunkt vom Server-UTC-Datum
abweicht, greift das Gating falsch. Beispiel UTC+13 (NZ), 10:00 lokal am 25.06.:
`entry_date = "2026-06-25"`, Server-UTC = 24.06. 21:00 → `getTodayKey()` server =
`"2026-06-24"` → Vergleich `false` → **der nächste Tag wird sofort freigeschaltet,
obwohl heute schon ausgefüllt wurde.** Ein User könnte alle 7 Tage an einem
Kalendertag durchklicken. Spiegelbildlich kann bei UTC-Usern abends fälschlich
gesperrt bleiben.

Der Kommentar im Code behauptet „lokaler Tagesschlüssel … analog zu getTodayKey()
in der journal-form" — die Annahme „gleicher Code ⇒ gleiches Ergebnis" stimmt nicht,
weil derselbe Code einmal im Browser und einmal auf dem Server ausgeführt wird.

**Korrekte Lösung:** Die User-Zeitzone muss explizit bis zum Server transportiert
werden (z. B. IANA-TZ im Profil speichern oder das „heute"-Datum vom Client an die
Server-Komponente reichen) und dort für `getTodayKey()` verwendet werden. *Zu
verifizieren:* die reale Server-Zeitzone der Vercel-Deployment (Annahme UTC).

### F2.2 — Uneinheitliche Herkunft von `entry_date` (lokal vs. UTC) · **Mittel · M**
Nur das Values-Journal schreibt `entry_date` client-lokal. **Alle anderen
Eintrags-Writes** stempeln server-seitig in UTC (`new Date().toISOString().slice(0,10)`):

- Freier Journaleintrag: [journal/actions.ts:45](../../app/(app)/journal/actions.ts#L45)
- Things Got Messy: [things-got-messy/actions.ts:98](../../app/(app)/booster/things-got-messy/actions.ts#L98)
- Bill of Rights (Reflexion): [recipes/bill-of-rights/actions.ts:143](../../app/(app)/recipes/bill-of-rights/actions.ts#L143)
- Overthinking: [booster/overthinking/actions.ts:82](../../app/(app)/booster/overthinking/actions.ts#L82)

Folge: Ein freier Eintrag, den ein User um 23:30 (UTC+2) anlegt, bekommt das
**Datum des Folgetags** (UTC) und erscheint im Tagebuch unter „morgen". Konsistenz-
und Anzeigeproblem; nicht funktionskritisch außerhalb der Values-Journey, aber es
unterläuft die Vorgabe „lokale User-Zeit".

---

## 3. Streak / Gamification

### F3.1 — Tagesgrenze in UTC statt User-Zeit · **Mittel · S**
`computeStreak` rechnet vollständig in UTC (`getUTCDate`, `toISOString().slice(0,10)`)
([lib/utils/streak.ts:5-18](../../lib/utils/streak.ts#L5-L18)). Die Aufrufer setzen
„heute" ebenfalls in UTC:

- Mantra: [booster/mantra/page.tsx:14,29-30](../../app/(app)/booster/mantra/page.tsx#L14-L30)
- Promises (eigene `recomputeStreak`-Kopie): [booster/promises/actions.ts:32-77](../../app/(app)/booster/promises/actions.ts#L32-L77)
- Mantra-Checkin schreibt das Datum ebenfalls in UTC: [booster/mantra/actions.ts:49](../../app/(app)/booster/mantra/actions.ts#L49)
- Dashboard-Mood: [dashboard/actions.ts:36](../../app/(app)/dashboard/actions.ts#L36), gelesen mit demselben UTC-`today` in [dashboard/page.tsx:42](../../app/(app)/dashboard/page.tsx#L42)

Da Schreiben **und** Lesen beide UTC nutzen, ist der Streak in sich **konsistent**
(keine Doppelzählung, keine widersprüchlichen Zähler) — aber die Tagesgrenze liegt
bei UTC-Mitternacht, nicht bei der lokalen Mitternacht des Users. Für UTC+2 rollt
der „Tag" erst um 02:00 lokal um: Ein Check-in um 01:30 zählt auf den Vortag, ein
Streak kann an der Grenze unbeabsichtigt brechen oder „heute erledigt" wird nicht
erkannt. Das widerspricht der Vorgabe „lokale User-Zeit". Gleiche TZ-Lösung wie F2.1
nötig.

### Positiv: Edge-Cases sind weitgehend abgesichert
- **Doppelter Eintrag am selben Tag** wird sauber idempotent behandelt:
  Mantra-Checkin fängt `23505` (unique_violation) ab und wertet ihn als „schon
  erledigt" ([mantra/actions.ts:51-60](../../app/(app)/booster/mantra/actions.ts#L51-L60)),
  ebenso Promises ([promises/actions.ts:187-195](../../app/(app)/booster/promises/actions.ts#L187-L195)),
  Mood per Upsert mit `onConflict` ([dashboard/actions.ts:38-43](../../app/(app)/dashboard/actions.ts#L38-L43)).
  *Zu verifizieren:* die zugehörigen Unique-Constraints existieren tatsächlich in der DB.
- **Undo (Toggle zurück)** ist robust, weil `recomputeStreak` den Streak komplett aus
  den verbleibenden Rows neu berechnet, statt zu inkrementieren
  ([promises/actions.ts:44-77,197](../../app/(app)/booster/promises/actions.ts#L44-L77)).
- **Milestone-Celebration** feuert nur bei frisch hinzugefügtem Tag, der genau auf
  7/14/30 landet ([promises/actions.ts:213-216](../../app/(app)/booster/promises/actions.ts#L213-L216)) — kein Re-Trigger beim Undo/Redo.
- **Verpasste Tage:** Der Backwards-Walk bricht bei der ersten Lücke ab → korrekt.

### F3.2 — Daily-Reminder-Tagesgrenze in UTC (client) · **Niedrig · S**
`DailyReminderScreen.todayStr()` nutzt `toISOString().slice(0,10)` clientseitig
([daily-reminder-screen.tsx:11-13,46](../../components/daily-reminder/daily-reminder-screen.tsx#L11-L46)).
Die „einmal pro Tag"-Grenze liegt damit bei UTC-Mitternacht des Browsers, nicht der
lokalen — der Reminder kann nahe Mitternacht erneut oder gar nicht erscheinen. Kosmetisch.

---

## 4. Routing / Redirects (Migration /recipes → /me/values/journey)

### Positiv: Die Migration ist über `next.config.ts` sauber abgesichert
[next.config.ts:4-51](../../next.config.ts#L4-L51) deckt alle Alt-Pfade per Redirect ab:
`/recipes` → `/dashboard`, `/recipes/values[/…]` → `/me/values[/journey/…]`,
`/recipes/bill-of-rights` → `/me/bill-of-rights`, `/recipes/overthinking` →
`/booster/overthinking`, plus alle `/cleansers/*`. Die `BottomNav` verweist
ausschließlich auf neue Pfade ([bottom-nav.tsx:13-19](../../components/layout/bottom-nav.tsx#L13-L19)).
**Keine Redirect-Schleife** erkennbar (Quellen und Ziele überschneiden sich nicht),
**keine kaputten user-sichtbaren Links** gefunden — interne `redirect("/recipes/...")`
(z. B. die Alt-Evaluation) landen über die config-Redirects auf den neuen Routen.

### F4.1 — Tote / duplizierte Alt-Routendateien · **Niedrig · S**
Die alten Seiten existieren weiter, sind aber durch die config-Redirects unerreichbar
und damit Dead Code mit Drift-Risiko:

- [recipes/values/journal/page.tsx](../../app/(app)/recipes/values/journal/page.tsx) (+ eigene `journal-form.tsx`),
  [recipes/values/evaluation/page.tsx](../../app/(app)/recipes/values/evaluation/page.tsx),
  `recipes/values/hypothesis/*`.
- Auffällig: Die **alte** `recipes/values/journal/journal-form.tsx` enthält
  divergierende Logik (Datums-Range/7-Tage-Tracker,
  [Z. 33-53](../../app/(app)/recipes/values/journal/journal-form.tsx#L33-L53)), die in
  der neuen Form fehlt. Zwei Versionen derselben Form bergen Pflege-/Verwechslungsrisiko.
- **Wichtig — nicht löschen:** `recipes/values/actions.ts` ist **nicht** tot, sondern
  das kanonische Action-Modul, aus dem die neuen Seiten importieren (z. B.
  [me/values/journey/journal/page.tsx:2](../../app/(app)/me/values/journey/journal/page.tsx#L2)).
- `RecipesPage` ([recipes/page.tsx](../../app/(app)/recipes/page.tsx)) ist durch
  `/recipes` → `/dashboard` faktisch nie gerendert; ebenso der „available"-Zweig von
  `RecipeDetailPage` für values/bill-of-rights/overthinking (durch explizite
  Redirects geshadowed). `StartRecipeButton`/`startRecipeAction` sind für diese
  Rezepte damit toter Pfad. Funktional unkritisch, aber verwirrend.

**Empfehlung:** Alt-Seiten (page/form) löschen, `recipes/values/actions.ts` an einen
neutralen Ort verschieben (z. B. `lib/values/actions.ts`) und Importpfade nachziehen.

### F4.2 — Stale Fallback-Pfade in recipes.ts · **Niedrig · zu verifizieren**
`getRecipeStepPath` fällt für unbekannte Slugs auf `/recipes/${slug}` zurück
([recipes.ts:126-129](../../lib/utils/recipes.ts#L126-L129)), und `startRecipeAction`
nutzt `recipe?.startPath ?? /recipes/${slug}`
([recipes/actions.ts:85-86](../../app/(app)/recipes/actions.ts#L85-L86)). Für
bill-of-rights ist `startPath` weiterhin `/recipes/bill-of-rights`
([recipes.ts:80](../../lib/utils/recipes.ts#L80)) und verlässt sich auf den Redirect.
Funktioniert, ist aber fragil, falls ein Redirect entfernt wird.

---

## 5. Fehler-, Leer- und Lade-Zustände

### Positiv
- **API-Routen** behandeln Fehler durchgängig sauber: 401 (kein User), 400
  (Validierung), 429 (Rate-Limit, bewusst **vor** dem try/catch, damit nicht vom
  Fallback geschluckt), 500/502 + warme deutsche Fallbacks
  ([journal-analysis/route.ts](../../app/api/journal-analysis/route.ts),
  [rights-formulator/route.ts](../../app/api/rights-formulator/route.ts),
  [overthinking-question/route.ts](../../app/api/overthinking-question/route.ts)).
- **KI-Ausfall** in der Evaluation: Der Client surft den Server-Fehlertext (z. B.
  Rate-Limit) statt stiller Generik-Meldung
  ([evaluation-form.tsx:59-85](../../app/(app)/me/values/journey/evaluation/evaluation-form.tsx#L59-L85)).
- **Offline/Netzwerkfehler** im Values-Journal: lokaler Draft-Fallback + klare
  Meldung ([journal-form.tsx:111-139](../../app/(app)/me/values/journey/journal/journal-form.tsx#L111-L139)).
- **Leerzustände** sind überall vorhanden: keine Werte/Rechte → freundlicher
  Empty-State mit CTA ([me/page.tsx:105-110](../../app/(app)/me/page.tsx#L105-L110),
  [dashboard/page.tsx:252-265](../../app/(app)/dashboard/page.tsx#L252-L265),
  [me/values/page.tsx:90-97](../../app/(app)/me/values/page.tsx#L90-L97)).
- **Lade-Zustände:** dedizierte `loading.tsx` für dashboard/journal/recipes;
  pending-Disabling in allen Formularen.

### F5.1 — Progress-Updates schlucken DB-Fehler still · **Mittel · S**
Mehrere `user_recipe_progress`-Schreibvorgänge prüfen das `error`-Feld **nicht**:

- `saveReflectionAction` — Progress-Update/Insert ohne Fehlerprüfung
  ([recipes/bill-of-rights/actions.ts:161-176](../../app/(app)/recipes/bill-of-rights/actions.ts#L161-L176))
- `saveRightsAction` — kompletter Progress-Block ohne Fehlerprüfung
  ([recipes/bill-of-rights/actions.ts:244-275](../../app/(app)/recipes/bill-of-rights/actions.ts#L244-L275))
- `saveJournalEntryAction` — Schritt-3-Advance ohne Fehlerprüfung
  ([recipes/values/actions.ts:308-313](../../app/(app)/recipes/values/actions.ts#L308-L313))

Schlägt einer dieser Writes fehl, meldet die Action trotzdem Erfolg; der User kann
im falschen Schritt/Status hängen bleiben (z. B. „abgeschlossen" wird nie gesetzt).
Nicht datenzerstörend, aber stille Zustands-Inkonsistenz. (Im Kontrast prüfen
`saveHypothesisAction`, `startRecipeAction`, `saveOverthinkingAction` ihre Fehler.)

### F5.3 — Server-Reads coalescen Fehler zu Leerzustand · **Niedrig · M**
Lese-Queries in Server-Komponenten ignorieren konsequent das `error`-Feld und
fallen auf `?? []` / `?? null` zurück (z. B.
[dashboard/page.tsx:61-93](../../app/(app)/dashboard/page.tsx#L61-L93),
[me/page.tsx:79-99](../../app/(app)/me/page.tsx#L79-L99),
[getJournalData, recipes/values/actions.ts:189-212](../../app/(app)/recipes/values/actions.ts#L189-L212)).
Bei einem echten Supabase-Fehler sieht der User einen „du hast noch nichts"-Leerzustand
statt eines Fehlerhinweises — Daten wirken verloren, obwohl sie nur nicht geladen
wurden. Für Server-Komponenten gibt es nur die generische
[app/error.tsx](../../app/error.tsx) als Auffangnetz, die hier aber nicht greift, weil
nicht geworfen wird. Bewusste Design-Entscheidung, aber erwähnenswert.

---

## 6. Bereichsübergreifend: Wiederholte Werte-Zyklen

### F-CYCLE — Zweiter+ Zyklus der Values-Journey ist funktional kaputt · **Hoch · M · (Soll-Verhalten zu verifizieren)**
Die Journal-Einträge sind **nicht pro Zyklus** abgegrenzt — Zähler und Gating zählen
über **alle** `daily_value`-Einträge des Users hinweg. Nach „Neuen 7-Tage-Zyklus
starten" ([startNewCycleAction, recipes/values/actions.ts:639-682](../../app/(app)/recipes/values/actions.ts#L639-L682),
ausgelöst über [evaluation-form.tsx:675-686](../../app/(app)/me/values/journey/evaluation/evaluation-form.tsx#L675-L686))
existieren bereits ≥7 Einträge aus dem Vorzyklus. Folgen:

1. **Schrittzählung springt sofort:** `saveJournalEntryAction` zählt **alle**
   `daily_value`-Einträge und schaltet ab `count >= 7` auf Schritt 3
   ([Z. 291-313](../../app/(app)/recipes/values/actions.ts#L291-L313)). Im neuen Zyklus
   ist `count` schon ≥7 → der **erste** Eintrag des neuen Zyklus springt direkt zur
   Auswertung. Die 7-Tage-Anforderung wird umgangen.
2. **Journey-Übersicht zeigt alles erledigt:** `ValuesJourneyPage` zählt eindeutige
   `entry_date` über alle Zyklen ([page.tsx:58-61](../../app/(app)/me/values/journey/page.tsx#L58-L61))
   → Tag 1–7 werden im neuen Zyklus sofort als „done" markiert.
3. **Auswertung lässt sich nicht erneut durchlaufen:** `getEvaluationData` setzt
   `phase = "complete"`, sobald `hypothesisVersion > 1`
   ([Z. 438-447](../../app/(app)/recipes/values/actions.ts#L438-L447)). Nach dem ersten
   Zyklus ist die Version ≥2 → die Reflexions-/Adjust-Phase ist im 2. Zyklus
   dauerhaft übersprungen.

`getEvaluationData` holt zwar „die letzten 7 nach `created_at`"
([Z. 405-415](../../app/(app)/recipes/values/actions.ts#L405-L415)), was den
*Anzeige*-Aspekt teilweise auf den aktuellen Zyklus eingrenzt — doch die
Fortschritts-/Gating-/Phasenlogik bleibt global. Damit führt der „Neuer Zyklus"-CTA
in einen inkonsistenten Zustand.

**Empfehlung:** Einträge an die `cycle_number` / das `started_at` des aktuellen
Progress binden (Spalte `cycle_number` auf `journal_entries` oder Filter
`entry_date >= started_at`) und Zählung/Gating/Phase darauf stützen. *Zu verifizieren:*
ob wiederholte Zyklen aktuell überhaupt als Live-Feature gedacht sind oder der CTA
vorerst deaktiviert werden soll.

---

## Nicht verifizierbar (manuell prüfen)
- Reale **Server-Zeitzone** der Vercel-Deployment (Annahme UTC) — Grundlage für F2.1/F3.1.
- **Unique-Constraints** auf `cleanser_checkins(user_id,cleanser_slug,date)`,
  `promise_completions(promise_id,completed_date)`, `daily_checkins(user_id,date)` —
  Voraussetzung für die idempotente Doppel-Eintrags-Behandlung (Abschnitt 3, Positiv).
- **RLS-Policies** auf allen Tabellen (Reviews 01 deckt Sicherheit ab; hier nur als
  Korrektheits-Annahme relevant, dass `.eq("user_id", …)` durch RLS gestützt wird).
- DB-seitige **Defaults** für `entry_date` (`CURRENT_DATE`) falls das Feld mal fehlt.
