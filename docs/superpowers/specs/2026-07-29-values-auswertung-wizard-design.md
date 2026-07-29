# Auswertungs-Wizard der Werte-Übung — Redesign

**Datum:** 2026-07-29
**Bereich:** `/me/values/journey/evaluation`, `/me/values/journey`, `/me/values`
**Ausgangslage:** Stefan hat den ersten kompletten 7-Tage-Zyklus live durchgespielt. Die
Auswertung funktioniert, fühlt sich aber wie ein Formular an: Pflichtfelder, wo Freiwilligkeit
gemeint ist, eine KI-Einschätzung ohne Konsequenz, und ein Abschluss, der den entstandenen
Kompass nicht zeigt.

---

## 1 · Ziel

Die Auswertung soll die Woche in eine **Entscheidung** überführen: Welche fünf Werte trägt
mein Kompass ab jetzt? Die KI-Einschätzung ist dabei nicht Deko, sondern die Grundlage für
konkrete Vorschläge, die man annehmen oder liegen lassen kann. Und die Einschätzung bleibt
danach abrufbar, statt einmalig vorbeizuziehen.

## 2 · Bühnen

Vier Zustände statt heute drei Phasen:

| Bühne | Header-Untertitel | Zweck |
|---|---|---|
| **A Rückblick** | „Zeit zurückzublicken" | Woche nachlesen, optional ergänzen |
| **B Erkenntnisse** | „Deine Werte verfeinern" | KI-Einschätzung + Tausch-Entscheidung |
| **C Kompass kalibriert** | „Zyklus abgeschlossen!" | Feier + fertiger Kompass + CTA |
| **B′ Erkenntnis-Rückblick** | „Deine Erkenntnisse" | Wiederbesuch, nur lesen |

**C ist transient.** Die Feier-Bühne erscheint ausschließlich direkt nach dem erfolgreichen
Speichern (also aus `adjustState.success` in derselben Session). Wer später über den Stern
„Auswertung & Erkenntnisse" zurückkommt, landet auf **B′**. Heute rendert `phase === "complete"`
die Feier-Bühne — genau deshalb geht die KI-Einschätzung verloren.

Die Phasen-Ableitung in `getEvaluationData()` bleibt im Prinzip erhalten
(`complete` bei `status === "completed"` oder `hypothesisVersion > 1`), aber `complete` mappt
in der UI auf B′ statt auf C.

## 3 · Bühne A — Rückblick

Reihenfolge von oben nach unten:

1. **Wochenrückblick**, eingeklappt pro Tag — bleibt unverändert (`<details>`-Liste).
2. **Einleitungssatz**, der die Freiwilligkeit trägt:

   > **Bevor wir gemeinsam auf deine Woche schauen:** Gibt es noch etwas, das du ergänzen
   > möchtest? Beide Felder sind freiwillig — du kannst auch direkt weitergehen.

3. **Beide Textfelder untereinander**, Labels mit leisem „(optional)".
4. CTA **„Weiter zur Auswertung"** (statt „Reflexion speichern").

**Server:** `saveEvalReflectionAction` verliert die beiden Pflichtprüfungen und akzeptiert
leere Strings. Die Längenprüfung (`TEXT_MAX_LONG`) bleibt. Die `value_eval`-Zeile wird auch
bei zwei leeren Feldern angelegt — sie ist der Träger für die Phase *und* der Speicherort für
das KI-Ergebnis.

## 4 · Bühne B — Erkenntnisse

Von oben nach unten:

1. **Glaskarte** (`Card variant="glass"`) mit der Überschrift **„Was dir wichtig ist"**
   (heute: „Was uns aufgefallen ist …"). Die KI-Prosa wird durch die bestehende
   `RichText`-Komponente gerendert, damit `**Wert**` als Auszeichnung ankommt statt als
   Sternchen. Die Werte-Themen erscheinen **fett und kursiv** — `RichText` bekommt dafür
   eine optionale `strongClassName`-Prop; der Default (nur `font-semibold`) bleibt für das
   Onboarding unverändert. Ladezustand: Skeleton wie heute.
2. **„Das hat sich bestätigt"** — die Werte aus den aktuellen fünf, die die KI stark
   wiedergefunden hat, als Chips. Entfällt, wenn die Liste leer ist.
3. **„Neu aufgetaucht"** — maximal 3 Vorschlagskarten. Je Karte: Wert-Label + ein Satz
   Begründung aus den Einträgen + Button „Hinzufügen" (`outline`).
4. **Tausch-Schritt.** „Hinzufügen" klappt inline auf: *„Welcher deiner fünf Werte soll dafür
   weichen?"* — die aktuellen fünf als antippbare Zeilen, jeweils genau eine wählbar.
   Bestätigen schließt den Block und aktualisiert die Live-Liste. **Ohne Tausch kein
   Hinzufügen** — die Anzahl bleibt hart bei 5. Ein bereits ausgetauschter Wert taucht in der
   Auswahlliste eines weiteren Tauschs nicht mehr auf.
5. **Opt-in `<details>` „Eigenen Wert wählen"** mit der Werte-Bank (81 Chips), gleiche
   Tausch-Logik. Chips, die bereits im Live-Stand oder unter den Vorschlägen stehen, werden
   herausgefiltert. Für den Fall, dass die KI etwas nicht gesehen hat.
6. **„Deine fünf Werte"** — Chip-Zeile als Live-Stand, immer sichtbar. Vollzogene Tausche
   stehen darunter als Zeile „*Alt* → **Neu**" mit einem `ghost`-Button „Rückgängig", der
   den alten Wert zurückholt und den neuen wieder als Vorschlag bzw. Bank-Chip freigibt.
7. CTA **„Werte speichern"** (der einzige Gold-CTA dieses Screens).

**Leerer Vorschlags-Fall:** Findet die KI nichts Neues, entfällt Block 3 und es steht dort
ein Satz („Deine fünf Werte tragen — diese Woche ist nichts Neues dazugekommen."). Block 5
bleibt trotzdem verfügbar.

**Was wegfällt:** die heutige „Behalten/Ersetzen"-Karte pro Wert samt Ersatz-Picker und die
unbegrenzte „Weiteren Wert hinzufügen"-Liste. Es gibt nur noch **eine** Mechanik: Tausch.

**Server:** `saveAdjustedHypothesisAction` prüft künftig `values.length === 5` statt
`length === 0` (Fehlermeldung: „Bitte genau 5 Werte auswählen."). Der Rest — neue
`values_hypothesis`-Version, `status: "completed"` — bleibt.

## 5 · KI-Ausgabe: Prosa **und** Struktur

Ein einziger Call (`/api/journal-analysis`), Antwort als JSON:

```json
{
  "insights": "…Prosa mit **Wert**-Auszeichnungen…",
  "confirmed": ["courage", "connection"],
  "suggested": [{ "id": "rest", "reason": "…ein Satz aus den Einträgen…" }]
}
```

**Serverseitige Validierung** (die KI-Antwort ist nicht vertrauenswürdig):

- `insights`: String, sonst Fallback-Text.
- `confirmed`: nur ids, die in der **aktuellen Hypothese** stehen.
- `suggested`: nur ids aus `VALUES_BANK`, **nicht** in der Hypothese, dedupliziert, auf 3
  gekürzt; `reason` auf eine sinnvolle Länge geklemmt.
- Kippt das JSON-Parsing komplett, gilt der heutige Weg: Prosa allein (bzw.
  `FALLBACK_INSIGHTS`), Blöcke 2+3 entfallen, das Opt-in trägt die Bühne.

**Speicherung:** `ai_insights` (Text-Spalte) trägt weiterhin die Prosa. `confirmed` und
`suggested` kommen als zusätzliche Keys (`ai_confirmed`, `ai_suggested`) in das
`content`-JSONB des `value_eval`-Eintrags. Das Update **merged** mit dem bestehenden
`content` (`{...alt, ai_confirmed, ai_suggested}`) — sonst gehen `positive_reflection` und
`negative_reflection` verloren. Kein Schema-Change, keine Migration.

**Typen:** `ValueEvalContent` in `lib/types/db-json.ts` bekommt die beiden neuen Felder als
optional. `EvaluationPageData.valueEvalEntry` reicht sie an den Client durch, damit ein Reload
(und B′) sie ohne neuen KI-Call hat.

**Prompt** (`lib/anthropic/prompts/journal-analysis.ts`): Ausgabeformat auf JSON umgestellt,
die Werte-Bank als erlaubte id-Liste mitgegeben, und die Anweisung ergänzt, die 2–3
Werte-Themen in der Prosa mit `**…**` auszuzeichnen. Ton, Länge und die
Prompt-Injection-Absicherung (`<journal_entries>` als reine Daten) bleiben unverändert.

## 6 · Werte-Bank-Lücke

Vorschläge dürfen aus **allen 81** Bank-Werten kommen. Emoji (`values-emojis.ts`) und
Beschreibung (`values-descriptions.ts`) gibt es aber nur für 30. Ohne Nachpflege landet ein
Vorschlag im Kompass mit `🌿` und „Dir ist wichtig, dass dieser Wert dein Handeln leitet".

**Aufgabe:** Emoji + Beschreibung für die restlichen 51 ids ergänzen, im Stil der bestehenden
(Beschreibung als Nebensatz nach „Dir ist wichtig, dass …", deutsch, „du"-Form). Das behebt
denselben Defekt, den es heute schon gibt, wenn jemand in der Hypothese außerhalb der 30
wählt. Die Default-Fallbacks bleiben als Netz bestehen.

## 7 · Bühne C — Kompass kalibriert

Von oben nach unten: Feier-Karte (`CompletionCelebration` + „Erster Zyklus geschafft!" +
Fließtext) → **die Kompassrose mit den fünf finalen Werten als ruhiges Abschlussbild** →
Gold-CTA **„Zu meinem Kompass"** → `/me/values`.

Die Rose ist hier **nicht antippbar** (Bild, kein Bedienelement). Der CTA sitzt **direkt unter
der Karte**, nicht mit `mt-auto` am Seitenende — das war der Grund, warum man ihn beim
Ankommen nicht sah.

**Refactor:** `values-compass.tsx` wird geteilt in

- `CompassRose` — reine Darstellung: Rosen-Ornament, Nadel, Maskottchen, Werte-Punkte;
  nimmt `values`, optional `selectedIndex` und ein `interactive`-Flag.
- `ValuesCompass` — der interaktive Aufsatz (Auswahl-State, Nadel-Rotation, Detailkarte),
  nutzt `CompassRose`.

Eine Quelle für die Geometrie; die Feier-Bühne rendert `CompassRose` ohne Interaktion.

## 8 · Bühne B′ — Erkenntnis-Rückblick

Glaskarte mit der **gespeicherten** KI-Einschätzung (aus `ai_insights`, kein neuer Call) →
„Deine fünf Werte" als Chips (aus der aktuellen, höchsten `values_hypothesis`-Version) →
CTA **„Zu meinem Kompass"**. Zurück zur Journey über den `SubPageHeader`. **Kein** Anpassen,
keine Vorschläge, kein Tausch.

Ist `ai_insights` leer (z. B. weil der Call damals fehlschlug), steht dort ein ruhiger Satz
statt einer leeren Karte.

## 9 · Journey-Karte

Nach Abschluss steht heute zweimal dasselbe: Header-Untertitel „Dein Kompass ist kalibriert"
*und* die Fußzeile „Dein Kompass ist kalibriert.". Aufgelöst zu:

- Header-Untertitel: **„Werteentdeckung abgeschlossen"**
- Fußzeile: **„Dein Kompass ist auf deine Erkenntnisse kalibriert."** + Link
  „Erkenntnisse ansehen →" (führt auf B′)

## 10 · Konsistenz-Durchgang

- Glaskarte (`Card variant="glass"`) für die Erkenntnis-Fläche (B, B′) und die Feier-Karte (C).
- **Genau ein Gold-CTA pro Screen.** „Hinzufügen", „Ändern", „Eigenen Wert wählen" werden
  `outline`/`ghost`.
- Eine Chip-Darstellung für Werte über alle Bühnen (bestätigt / neu / Live-Stand /
  Abschluss) statt der heute drei leicht unterschiedlichen Varianten.
- Kein `mt-auto`-CTA auf Screens, die scrollen.
- Header-Untertitel je Bühne (siehe Tabelle in Abschnitt 2).
- Tap-Ziele auf `h-9` (Gold-CTA-Höhe), nicht darüber.

## 11 · Berührte Dateien

| Datei | Änderung |
|---|---|
| `app/(app)/me/values/journey/evaluation/evaluation-form.tsx` | Kern: A/B/C/B′ neu, Tausch-Mechanik, Glaskarte, `RichText` |
| `app/(app)/recipes/values/actions.ts` | Reflexion optional, `length === 5`, `ai_*`-Felder durchreichen |
| `app/api/journal-analysis/route.ts` | JSON-Antwort, Validierung, `content`-Merge |
| `lib/anthropic/prompts/journal-analysis.ts` | JSON-Format, id-Liste, `**`-Auszeichnung |
| `lib/types/db-json.ts` | `ValueEvalContent` um `ai_confirmed`/`ai_suggested` (optional) |
| `lib/utils/values-emojis.ts`, `lib/utils/values-descriptions.ts` | 51 fehlende Einträge |
| `app/(app)/me/values/values-compass.tsx` | Split in `CompassRose` + `ValuesCompass` |
| `app/(app)/me/values/journey/values-journey-client.tsx` | Untertitel/Fußzeile entdoppeln |
| `components/ui/rich-text.tsx` | optionale `strongClassName`-Prop |

## 12 · Verifikation

- `npx tsc --noEmit`, `npm run gate`, `npm run build` müssen grün sein.
- `npm run e2e`: die Evaluation-Route bekommt einen `data-e2e`-Marker pro Bühne, damit der
  Lauf mehr als „hat gerendert" aussagt.
- **Das eigentliche Gate ist das iPhone.** Konkret zu prüfen: der CTA auf C ist ohne Scrollen
  sichtbar; die Glaskarte fadet ohne Ghosting; der Tausch-Block klappt ohne Sprung auf; die
  Rose auf C ist nicht antippbar.

## 13 · Bewusst nicht in dieser Runde

- Zyklus 2 („Neuer Zyklus"-CTA, `startNewCycleAction`) bleibt deaktiviert — Journal-Einträge
  sind noch nicht pro Zyklus abgegrenzt (F-CYCLE).
- Die „exakt 5 Werte"-Pflicht in der **Hypothese** bleibt unverändert hart gegatet.
- Die fünf getesteten Werte während der Reflexionswoche im Journal als Anker zeigen — offene
  Produktfrage, eigene Runde.
