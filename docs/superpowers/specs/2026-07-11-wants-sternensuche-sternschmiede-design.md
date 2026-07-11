# Wants-Rezept-Redesign: Sternensuche + Sternschmiede

**Datum:** 2026-07-11
**Rezept:** `wants` (Rezept #2 — „Was du wirklich willst")
**Status:** Design abgestimmt, bereit für Implementierungsplan

---

## 1. Warum

Das aktuelle Wants-Rezept ist ein einziger linearer Wizard mit einer versteckten
These: Die KI destilliert aus dem Yin-&-Yang-Audit **Wants-*Hypothesen***, und die
**Little Bets dienen dazu, diese Hypothesen zu bestätigen**. Der mentale Rahmen ist
„Wants = These, Bets = Beweis".

Das soll weg. Zwei Probleme:

1. **Wants sollen keine Thesen sein, sondern einfach die Wants.** Das Audit-Ergebnis
   ist das Ergebnis — deine Sterne, kein Verdacht, den man erst verifizieren muss.
2. **Bets sollen keine abgeschwächten Umformulierungen bestehender Wants sein.**
   Aktuell sind die Bets nur kleinere Varianten von dem, was ohnehin schon als Want
   dasteht. Stattdessen sollen sie **neue, konkrete Ideen** liefern, die einem Spaß
   machen *könnten* und sich später vielleicht **zu einem neuen Stern entwickeln**.

Daraus folgt die zentrale Architektur-Entscheidung dieses Redesigns: **Wants und Bets
werden entkoppelt.** Das Audit (jetzt „Sternensuche") produziert direkt die Sterne.
Die Bet-Generierung zieht in einen eigenen Ort um (die „Sternschmiede") und wird zu
einem explorativen Ideen-Generator, der *neue* Sterne entzünden könnte.

## 2. Metapher & Vokabular

Leitmetapher (auch in der Intro-Sequenz zu setzen):

> Wenn deine **Werte** ein **Kompass** sind, der dir zeigt, in welche Himmelsrichtung
> du gehen sollst, dann sind deine **Wants** wie die **Sterne**, die dir den Weg
> leuchten — und die dich dabei selbst zum Leuchten bringen. Es sind die Dinge und
> Aktivitäten, die dir Freude bringen, die dich die Zeit vergessen lassen, bei denen
> du dich gut fühlst, die dich mit Energie aufladen und dich zurück ins Lot bringen.

Festgelegtes Vokabular (ersetzt die alten Begriffe durchgängig in UI-Copy):

| Rolle | Neuer Name | Ersetzt |
| --- | --- | --- |
| Das Rezept / Audit | **Sternensuche** | „Yin-&-Yang-Audit" |
| Yin-Hälfte (Prompt) | **„Wofür nimmst du Mühsal in Kauf?"** (funktional, unverändert) | „Yin — Wofür nimmst du Mühsal in Kauf" |
| Yang-Hälfte (Prompt) | **„Was bringt dich zum Leuchten?"** | „Yang — Was bringt dich in Flow" |
| Ein Want | **Stern** | „Want / Hypothese" |
| Der Bet-Ort | **Sternschmiede** | (neu; „Little Bets" als Ort) |
| Ein Bet | **Funke** · Aktion: „einen Funken schlagen" | „Little Bet / Experiment" |

Hinweis: Die internen Typnamen (`WantItem`, `BetItem`, `template_type "yin_yang"` /
`"little_bet"`, Spalten `wants` / `bets`) **bleiben unverändert** — die Umbenennung
betrifft nur nutzersichtbare Copy, nicht das Datenmodell.

## 3. Entscheidungen (aus dem Brainstorming)

1. **Funke-Konkretheit:** „Konkreter Aktions-Typ + selbst finden". Die KI schlägt eine
   reale, spezifische Aktivität vor, formuliert so, dass die Person die reale Instanz
   selbst in ihrer Nähe findet — **niemals erfundene Veranstaltungsorte/Events**, keine
   Standort-Abfrage. Beispiel: „Geh zu einem Schnupperabend in einem Töpferstudio in
   deiner Stadt." statt „Sa 14 Uhr, Studio Ton&Co, Ehrenstr. 12".
2. **Flow:** Audit → Sterne-Seite → Sternschmiede auf Abruf. Das Audit landet auf
   `/me/wants`. Die Sternschmiede ist eine eigene, jederzeit wiederholbare Szene, die
   von dort aus erreicht wird.
3. **Naming:** „Sternensuche / funktionale Hälften" + „Sternschmiede / Funke" (s. o.).
4. **Kind-Frage:** Optionaler Input, immer angezeigt. Die Sternschmiede fragt sie jedes
   Mal, aber man kann überspringen und trotzdem Funken aus Werten + Sternen bekommen.
5. **Routine/Ausbrechen-Text:** In die Haupt-Intro-Sequenz (Sternensuche) integriert —
   die Sternschmiede bekommt **keine** eigene Intro-Sequenz. Auf der Sterne-Seite steht
   zusätzlich eine kurze Überleitung („Bridge") in die Sternschmiede.
6. **Inline-Refine** („Konkreter machen") pro Stern: **bleibt**, nur Copy weg von
   „Hypothese".

## 4. Architektur & Datenfluss

Kein Schema-Change. Bestehende Wants/Bets bleiben gültig; nur Framing/Copy ändern sich.

```
Sternensuche (Rezept, /me/wants/journey)
  nudge → yin → yang → analyzing → sterne(bestätigen) → done
    │           │                                          │
    │           └─ POST /api/wants-distiller ──────────────┘
    │              (jetzt NUR {comment, wants} — kein bets mehr)
    ▼
  landet auf /me/wants  (Sterne-Seite)
    │  zeigt Sterne + Bridge-Text + „zur Sternschmiede" (Button/Swipe)
    ▼  (Szenen-Transition)
Sternschmiede (neue Szene, /me/wants/schmiede)
  kurzer Header → Kind-Frage (optional) → generieren → Funken auswählen → speichern
    │                                        │
    │                                        └─ POST /api/sternschmiede (neu)
    ▼                                           Input: Werte + Sterne + Kind-Antwort
  zurück auf /me/wants (gespeicherte Funken unter „Nach den Sternen greifen")
    │
    ▼  pro Funke, nach dem Ausprobieren
  Reflexion (/me/wants/reflect/[betId], unverändert außer Copy)
```

Speicher-Schnittstellen unverändert:
- `wants`-Tabelle, eine Zeile pro User, zwei JSONB-Arrays `wants` + `bets`.
- Kanonische Actions in `app/(app)/recipes/wants/actions.ts`
  (`saveWantsAction`, `saveBetsAction`, `saveYinYangEntryAction`, Reload-vor-Write-Merge).
- Audit als `journal_entries`-Zeile (`template_type "yin_yang"`).
- Funke-Reflexion als `journal_entries`-Zeile (`template_type "little_bet"`).

## 5. Komponenten im Detail

### 5.1 Sternensuche-Journey — `app/(app)/me/wants/journey/wants-journey.tsx`

**Phasen-State-Machine:** `Phase` wird zu
`"nudge" | "yin" | "yang" | "analyzing" | "sterne" | "done"`.
Die alte `"bets"`-Phase und der gesamte Bet-State/Handler (`draftBets`, `newBetText`,
`addOwnBet`, `confirmBets`, `savingBets`, `betsError`) **entfallen** aus der Journey.
(`"hypotheses"` → in `"sterne"` umbenannt; Copy angepasst.)

**Yin- & Yang-Eingabe — Multi-Textbox:**
- Beide Hälften rendern **3 Textboxen** statt einer. Box 1 ist Pflicht, Box 2–3
  optional. Ein „+ weitere hinzufügen"-Button hängt weitere optionale Boxen an
  (sinnvolle Obergrenze, z. B. 6).
- Motivierende Mikro-Copy: die Person soll **mindestens 3** Antworten geben,
  **Pflicht ist 1**.
- State: `yin` / `yang` werden zu `string[]` im Client-State. Beim Speichern werden
  die **nicht-leeren** Antworten mit `"\n"` (oder Bullet-Präfix) zu je *einem* String
  zusammengefügt und wie bisher als `formData` an `saveYinYangEntryAction` übergeben.
  → `YinYangContent { yin: string; yang: string; principles? }` bleibt unverändert.
  Mehrere getrennte Antworten liefern der KI mehr Signal, ohne das Datenmodell zu
  ändern.
- Offline-Draft (`useFormDraft<AuditDraft>`) an die Array-Form anpassen.

**Bonus-Prinzipien:** aufklappbarer Block bleibt (auf der Yang-Seite).

**Kind-Frage entfernen:** Der Yang-Prompt enthält aktuell „… Und was hast du früher aus
purem Spaß gemacht, tust es heute aber nicht mehr?" — dieser Zusatz wird gestrichen
(die Kind-Frage lebt künftig in der Sternschmiede). Yang fragt nur noch nach dem
Leuchten/Flow.

**`sterne`-Phase (früher `hypotheses`):**
- Überschrift/Copy: „Deine Sterne" statt „Deine Wants-Hypothesen". Kein „These/
  Vermutung"-Wording mehr.
- Karten-Editing, Verwerfen, eigenes Hinzufügen: **bleibt**.
- Inline-Refine („Konkreter machen", `/api/wants-refiner`): **bleibt**, Copy weg von
  „Hypothese/vage" hin zu „noch konkreter machen".
- Bestätigen-Button führt zu `done` (nicht mehr zu `bets`).

**`done`-Phase:** Abschluss-Celebration bleibt; CTA führt auf `/me/wants`. Kein
Bet-Zwischenschritt mehr.

### 5.2 Sterne-Seite — `app/(app)/me/wants/wants-me.tsx`

- Sterne-Anzeige („Meine Sterne") + eigenes Hinzufügen/Bearbeiten: **bleibt**.
- Bet-Sektion („Nach den Sternen greifen") zeigt weiterhin **gespeicherte Funken**
  (offene + „schon gegriffen") und den Reflexions-Einstieg. Copy → „Funken".
- **Neu: Bridge in die Sternschmiede.** Unter den Sternen eine kurze, verkürzte
  Version des Routine/Ausbrechen-Textes + Affordance **„zur Sternschmiede"**
  (Button **und** Swipe-down), die die Szenen-Transition auslöst.
- Der bestehende „Audit nochmal machen"-Button bleibt (führt in die Sternensuche).
- Empty-State (noch keine Sterne) verweist wie bisher zuerst auf das Audit.

### 5.3 Sternschmiede — neu, `app/(app)/me/wants/schmiede/`

- **Route:** `app/(app)/me/wants/schmiede/page.tsx` (Server) + Client-Komponente
  `sternschmiede.tsx`. Serverseitig werden Werte (neueste bestätigte
  `values_hypothesis`) und Sterne (`wants`) geladen und als Kontext an den Client /
  die AI-Route weitergereicht.
- **Szenen-Transition:** voll-flächiger Szenenwechsel (Fade/Scale + Funken-/
  Sternpartikel, die zur Schmiede „zünden"), konsistent mit der bestehenden
  Szenen-Grammatik der App (Hub-Szenen, `Reveal` ~600 ms; keine abgehackten
  Schnell-Stagger). Die exakte Referenz-Transition wird bei der Umsetzung im Code
  gespiegelt.
- **Ablauf im Client:**
  1. Kurzer Header/Einstieg (kein eigener Intro-Sequenz-Screen).
  2. **Kind-Frage** — eine optionale Textbox: „Was hat dir als Kind Spaß gemacht,
     das dir vielleicht immer noch Spaß machen könnte?" Überspringbar.
  3. **Funken generieren** (`POST /api/sternschmiede`).
  4. **3–5 Funken** als auswählbare Karten (gleiche Select-UI wie die alte Bets-Phase).
  5. **Speichern** → `saveBetsAction` (BetItems, `source: "ai"`), zurück auf `/me/wants`.
- **Graceful Degradation:** Funktioniert auch ohne Werte, ohne Sterne und ohne
  Kind-Antwort — dann trägt, was vorhanden ist. Hat die Person nichts davon, wird die
  Kind-Frage zum Hauptsignal; ist auch die leer, wird sie vor dem Generieren sanft
  dazu ermutigt.
- Wiederholbar: jeder Durchlauf erzeugt frische Funken.

### 5.4 Reflexion — `app/(app)/me/wants/reflect/[betId]/`

Strukturell **unverändert**. Copy-Reframing:
- „dein Experiment" → „dein Funke" / „Wie war dein Funke?".
- Letzte Frage „Hat dieses Experiment deine Wants verändert oder bestätigt?" →
  „Hat dieser Funke einen neuen Stern entzündet?" (Feld `changed_wants` bleibt).
- `LittleBetContent` unverändert.

## 6. KI

### 6.1 `wants-distiller` — verschlanken

- **Prompt** (`lib/anthropic/prompts/wants-distiller.ts`): „Hypothesen"-Sprache raus;
  es werden **Sterne/Wants** destilliert, kein Verifikations-Framing. Der komplette
  **`bets`-Teil (Aufgabe 3) wird entfernt** — der Distiller liefert nur noch
  `comment` + `wants`. `question`/Refine-Feld bleibt (Wants konkreter machen).
- **Route** (`app/api/wants-distiller/route.ts`): `parseBets`, `MAX_BETS_OUT`,
  `BetSuggestion`, das `bets`-Feld der Response und der `want_index`-Bezug **entfallen**.
  Rückgabe: `{ comment, wants }`. Persistenz von `ai_wants` auf den Eintrag bleibt.
- **Client** (`wants-journey.tsx`): `DistillerResponse` verliert `bets`; `runDistiller`
  setzt keinen Bet-State mehr.
- Output-Länge (`max_tokens`) kann leicht reduziert werden, da keine Bets mehr erzeugt
  werden.

### 6.2 `sternschmiede` — neuer Funken-Generator

- **Prompt** (`lib/anthropic/prompts/sternschmiede.ts`, neu):
  - Rolle: einfühlsamer Begleiter, der **neue, kleine, konkrete Funken** vorschlägt —
    Dinge zum Ausprobieren, die im Alltag machbar sind und **neue oder alte vergessene**
    Freuden entdecken lassen.
  - **Eingaben** (als Daten, nie als Anweisung — via Tags): `<werte>`, `<sterne>`
    (können leer sein), `<kind>` (Kind-Antwort, kann leer sein).
  - **Harte Regeln für jeden Funken:**
    - **Konkreter Aktions-Typ + selbst finden**: eine reale, spezifische Aktivität,
      formuliert so, dass die Person die reale Instanz in ihrer Nähe findet
      („in deiner Stadt / in deiner Nähe / online"). Beispiele erlaubter Typen:
      VHS-/Volkshochschulkurs, YouTube-Tutorial, Schnupperstunde, Tag der offenen Tür,
      Online-Schulung, neuer Sport, Hobby wie Zeichnen oder Keramikmalen, Messe.
    - **Keine erfundenen Orte/Events/Termine/Preise.** Nur Aktivitäts-Kategorien, die
      es überall real gibt.
    - **Kleiner Aufwand**, niederschwellig, ohne großes Geld/Verpflichtung — analog zur
      bisherigen Little-Bet-Größe (ein Abend, eine Schnupperstunde), kein
      Wochen-Commitment.
    - **Aus Sternen abgeleitete Funken sind NEUE, angrenzende Ideen — keine
      Umformulierung** des bestehenden Sterns. Ziel: etwas Neues, das zum *Konzept* des
      Sterns passt und später selbst ein Stern werden könnte.
    - So **konkret wie möglich** innerhalb dieser Grenzen.
  - **Output:** striktes JSON, `{ comment, funken: [{ text, source_hint?, reason? }] }`
    (3–5 Funken). `source_hint` optional (grobe Herkunft: Wert / Stern / Kind /
    frei) — ohne zu implizieren, dass ein bestehender Stern nur wiederholt wird.
- **Route** (`app/api/sternschmiede/route.ts`, neu): Muster von `wants-distiller`
  (Auth, RLS-Reads von Werten + Sternen, Rate-Limit via `lib/anthropic/rate-limit.ts`
  — neues Limit `STERNSCHMIEDE_LIMIT`, `logUsage`). Nimmt `{ childAnswer? }` aus dem
  Body; Werte + Sterne werden serverseitig geladen. Validierung/Clamping analog
  `parseWants`/`parseBets`. Rückgabe: Funken → Client mappt sie auf `DraftBet` und
  speichert bestätigte als `BetItem` (`source: "ai"`, `wantId` optional).

## 7. Intro-Sequenz — `lib/utils/recipe-intros.ts` (`wants`)

Die vier `wants`-Karten werden neu geschrieben auf die neue Metapher **und** integrieren
den Routine/Ausbrechen-Funken-Teil (Entscheidung „alles in der Rezept-Intro"). Grobe
Dramaturgie (Feinschliff bei der Umsetzung):

1. **Wessen Ziele jagst du?** (mimetisches Begehren — Kern kann bleiben).
2. **Kompass & Sterne** — die Leitmetapher: Werte = Kompass, Wants = Sterne, die den
   Weg leuchten und dich zum Leuchten bringen.
3. **Die Sternensuche** — die zwei ehrlichen Fragen (Mühsal / Leuchten), ca. 10 Min;
   Ergebnis = deine Sterne (keine „Hypothesen").
4. **Die Sternschmiede** — manchmal weiß man nicht, was man will; man lebt in Routine,
   will ausbrechen und wieder etwas tun, das einen zum Leuchten bringt, weiß aber nicht
   was. Dafür die Funken: kleine Wetten mit sich selbst, in denen man neue oder alte
   vergessene Dinge entdeckt, die zu neuen Sternen werden könnten.

Der „Worum geht's?"-Aufklapp-Block nutzt dieselben Karten (generische Komponente bleibt).

## 8. Bestehende Nutzer / Migration

- **Kein DB-Schema-Change, keine Datenmigration.** Bestehende `wants`/`bets` bleiben
  gültig; `source`, `wantId`, `ai_wants` bleiben lesbar.
- Bereits gespeicherte Bets erscheinen weiter als „Funken" auf der Sterne-Seite.
- Alt-`yin_yang`-Einträge (Single-String-Antworten) bleiben kompatibel — die
  Multi-Textbox-UI schreibt weiterhin einen zusammengefügten String.

## 9. Betroffene Dateien (Überblick, kein vollständiger Plan)

**Ändern:**
- `app/(app)/me/wants/journey/wants-journey.tsx` — Multi-Textbox, Bets-Phase raus,
  „Sterne"-Copy, Kind-Frage aus Yang raus.
- `app/(app)/me/wants/wants-me.tsx` — Bridge + „zur Sternschmiede", Copy „Funken".
- `app/(app)/me/wants/reflect/[betId]/reflect-form.tsx` — Copy-Reframing.
- `lib/anthropic/prompts/wants-distiller.ts` — Bets-Teil raus, Hypothesen-Sprache raus.
- `app/api/wants-distiller/route.ts` — Bets-Parsing/Response raus.
- `lib/utils/recipe-intros.ts` — `wants`-Intro neu.
- `lib/anthropic/rate-limit.ts` — neues `STERNSCHMIEDE_LIMIT`.
- Ggf. `lib/content/labels.ts` (Seitentitel), `lib/types/db-json.ts` (nur Doku-Kommentare).

**Neu:**
- `app/(app)/me/wants/schmiede/page.tsx`
- `app/(app)/me/wants/schmiede/sternschmiede.tsx`
- `app/api/sternschmiede/route.ts`
- `lib/anthropic/prompts/sternschmiede.ts`

**Unverändert (bewusst):** kanonische Actions in `app/(app)/recipes/wants/actions.ts`,
DB-Schema, `wants-refiner` (Prompt/Route), Reflexions-Action-Logik.

## 10. Bewusst nicht im Scope (YAGNI)

- Keine Standort-Abfrage, keine Web-Suche / echte Event-Daten für Funken (spätere
  Iteration, falls je gewünscht).
- Kein neues Datenmodell für Multi-Antworten (Join in bestehende Strings).
- Kein Umbenennen interner Typen/Spalten/`template_type`s.
- Keine Änderung an der Werte-vor-Wants-Nudge-Logik.
```
