# Wants-Übung verbessern — Design

**Datum:** 2026-07-10
**Rezept:** #2 „Was du wirklich willst" (Wants)
**Betroffene Bereiche:** `app/(app)/me/wants/*`, `app/api/wants-distiller/route.ts`, neuer `app/api/wants-refiner/route.ts`, `lib/anthropic/prompts/wants-distiller.ts`, neuer Refiner-Prompt, Me-Hub-Ornament.

## Ziel & Leitidee

Die Wants-Übung ist inhaltlich stark, wirkt aber an drei Stellen schwach: die Landing-Seite ist eine nüchterne Karten-Liste ohne Atmosphäre, die KI-Wants bleiben zu vage, und die Little Bets sind inkonsistent (mal ein Wochen-Commitment, mal ein Mini-Schritt) und ohne Begründung.

Die verbindende Metapher, die alles zusammenhält:

> **Werte = dein Kompass.** Sie zeigen die Himmelsrichtung — was dir wichtig ist.
> **Wants = die Sterne, nach denen du greifst.** Was dich zum Leuchten bringt.
> **Little Bets = nach den Sternen greifen.** Kleine erste Schritte, um zu sehen, was wirklich strahlt.

Der Me-Hub trägt für die Werte schon die Kompassrose (`CompassArt`); der Stern für die Wants macht Hub und Übung zu *einer* Geschichte (mit dem Kompass nach den Sternen navigieren).

Vier Arbeitsstränge, als ein zusammenhängendes Redesign umgesetzt.

---

## 1 · Landing-Seite als Sternenhimmel

**Datei:** `app/(app)/me/wants/wants-me.tsx` (Umbau), plus neues Stern-Ornament.

Bringt die Seite in die visuelle Welt des Me-Hubs (vgl. `app/(app)/me/me-hub.tsx`):

- **Hintergrund:** dunkler Pflaumen-Verlauf mit Kerzen-Glow oben (`radial-gradient` in `--primary`, wie `me-candle-bg`) und ein paar feinen, still glimmenden Sternen. Bei `reduced-motion` statisch.
- **Hero:** ein neues prozedurales **Stern-SVG** (Geschwister von `CompassArt`/`SealArt`/`FlaskArt`, glühend via `drop-shadow` in `--primary`) + Titel **„Was mich leuchten lässt"** + Storyline-Unterzeile („Die Sterne, nach denen du greifst — was dich lebendig macht.") + ein dezenter Chip **„🧭 Dein Kompass zeigt hierhin"**, der zu `/me/values` verlinkt. Der Chip macht die Werte-Verbindung sichtbar, ohne die Werte gleichrangig neben die Wants zu stellen — die Trennung Werte (wer ich bin) vs. Wants (was mich antreibt) bleibt klar.
- **Sektion „Meine Sterne"** = die aktiven Wants. Jede Karte: Stern-Icon, Want-Text, und — falls verknüpft — der Wert nur als dezenter Verbindungs-Tag („nährt deinen Wert: {Label}"). Bearbeiten/Löschen wie bisher über den Dialog.
- **Sektion „Nach den Sternen greifen"** = die Little Bets. Offene Bets mit „Ausprobiert? Reflektieren"-Button (Flow unverändert), erledigte in „Schon gegriffen".
- **Reveal-Staffelung** wie im Hub.
- **Empty State:** Mascot + „Noch keine Sterne entdeckt" + „Audit starten", in derselben Bildsprache.

**Me-Hub-Angleichung:** In `me-hub.tsx` wird das Wants-Ornament von `FlaskArt` (Kolben) auf dasselbe Stern-SVG umgestellt, damit Hub-Kachel und Landing-Seite dasselbe Symbol tragen. Die Sub-Metapher „Bets = Kolben/Experiment" entfällt komplett.

**Texte** (Titel, Sektionslabels) zentral über `lib/content/labels.ts` bzw. inline konsistent zur bestehenden Konvention.

---

## 2 · Werte-Kopplung als weicher Nudge

Keine harte Sperre. Die Wants-Übung bleibt jederzeit startbar.

- Beim Start des Audits (`/me/wants/journey`) wird geprüft, ob eine **Werte-Hypothese** existiert (`values_hypothesis` für den User, egal ob `confirmed`). Fehlt sie, erscheint **vor** dem Yin-Screen ein kurzer Vorschalt-Hinweis:
  - Text sinngemäß: „Deine Sterne leuchten heller, wenn dein Kompass schon steht. Willst du erst deine Werte finden?"
  - Aktionen: **„Zu den Werten"** (`/me/values`) und **„Trotzdem starten"**.
- Existiert eine Hypothese, entfällt der Hinweis — direkt in den Flow.
- Der Distiller nutzt weiterhin ausschließlich **bestätigte** Werte zum Verlinken (Logik in `route.ts` unverändert); die Verknüpfung wird auf der Seite nur sprachlich als „Kompass zeigt hierhin" erzählt.

Die Prüfung passiert serverseitig auf der Journey-Page (`app/(app)/me/wants/journey/page.tsx`) und wird als `hasValuesHypothesis`-Flag an `WantsJourney` gereicht. Der Hinweis ist eine neue Vorschalt-**Phase** `"nudge"` in der bestehenden Phasen-State-Machine (nur wenn das Flag `false` ist), die dem Yin-Screen vorgeschaltet ist — konsistent mit der Phasen-Architektur der Übung (vgl. CLAUDE.md).

---

## 3 · Bessere Little Bets

**Dateien:** `lib/anthropic/prompts/wants-distiller.ts`, `app/api/wants-distiller/route.ts`, Bets-Phase in `wants-journey.tsx`.

Zwei Probleme: fehlende Begründung und inkonsistente Größe.

- **Einordnung pro Bet:** Die Distiller-Antwort bekommt pro Bet ein optionales `reason`-Feld — *ein* Satz, der die Verbindung zum Yin/Yang benennt („weil dich … in Flow bringt / weil du für … bereitwillig Mühsal in Kauf nimmst"). Die Einordnung erscheint **nur, wenn eine echte Verbindung besteht** (sonst `null`, keine erzwungene Begründung).
  - **Nicht persistiert:** `reason` bleibt ephemer in der Distiller-Antwort und wird nur in der Bets-Auswahl-Phase des Flows unter dem jeweiligen Bet angezeigt. `BetItem` bleibt unverändert (kein Schema-/JSON-Feld). Auf der Landing-Seite steht die Einordnung bewusst nicht.
- **Konsistente Größe:** Der Prompt wird geschärft, dass ein Bet **immer** der kleine erste Schritt ist — ein Abend, eine Schnupperstunde, ein Gespräch, eine niedrigschwellige Anmeldung. **Nie** Wochen-Commitments oder Trainingspläne (Gegenbeispiel im Prompt: nicht „trainiere 6 Wochen für einen 10-km-Lauf", sondern „melde dich für einen lockeren 5-km-Lauf an"). Die Ambition gehört ins Want (siehe #4), nicht ins Bet.

**Datenfluss:** `DistillerResponse.bets[]` → neues Feld `reason?: string | null`; `parseBets` in `route.ts` reicht es durch (getrimmt, gekappt); `DraftBet` in `wants-journey.tsx` erhält `reason`; die Bets-Karte rendert es als dezente Zeile unter dem Text.

---

## 4 · Wants: konkreter & offenere Formulierung

**Dateien:** `lib/anthropic/prompts/wants-distiller.ts`, neuer `lib/anthropic/prompts/wants-refiner.ts`, neuer `app/api/wants-refiner/route.ts`, Hypothesen-Phase in `wants-journey.tsx`, Placeholder/Validierung in `wants-me.tsx`.

### 4a · Kuratierte Satz-Starter statt starrem „Ich will …"

- Die KI wählt pro Want die **passende** Form aus einem festen Vorrat:
  - „Ich will …", „Ich mag es zu …", „Mir macht … Spaß", „Ich blühe auf, wenn …"
- Der Prompt listet diese Starter und weist an, pro Hypothese die natürlichste zu wählen (nicht stur „Ich will").
- **UI:** Placeholder im Eigenes-Want-Feld wird von „Ich will …" auf einen rotierenden/offeneren Hinweis geändert; **keine** Validierung mehr, die „Ich will" erzwingt. Betrifft das Feld in der Hypothesen-Phase *und* auf der Landing-Seite.

### 4b · Ambition ins Want (Konkretheit)

- Wo das Audit einen konkreten Anker hergibt, hängt die KI ihn als „z. B. …" an das Want an (Beispiel: „Ich will mich an meine Grenzen treiben — z. B. für einen Marathon."). Es wird **nur** konkretisiert, was aus dem Audit ableitbar ist; nichts erfunden.

### 4c · Inline-Nachfragen bei vagen Wants

- Der Distiller markiert vage Wants: pro Want ein optionales `question`-Feld — eine kurze, warme Rückfrage, die hilft zu konkretisieren („Woran denkst du beim ‚an-die-Grenzen-treiben'?").
- **UI (Hypothesen-Phase, nur im Journey-Flow):** Ist `question` gesetzt, zeigt die Want-Karte die Frage + ein kleines Antwortfeld + einen **„Schärfen"**-Button. Der KI-Aufruf passiert **erst auf Klick** (auto-markiert, User löst aus — kein ungefragtes Token-Budget).
- **Neuer Endpoint `app/api/wants-refiner/route.ts`:**
  - Input: `entryId`, der aktuelle Want-Text, die `question`, die Antwort des Users.
  - Lädt Audit (yin/yang/prinzipien) über `entryId` serverseitig nach (wie der Distiller, entryId-first, RLS-Client).
  - Ruft ein leichtes Modell (`claude-haiku-4-5`) mit einem eigenen, schlanken **Refiner-Prompt**: formuliere **dieses eine** Want neu — konkret, mit passendem kuratiertem Starter, ≤ 25 Wörter, nur aus Audit + Antwort abgeleitet.
  - Output: `{ text: string }` (das geschärfte Want).
  - **Rate-Limit:** eigener Bucket analog `WANTS_DISTILLER_LIMIT` in `lib/anthropic/rate-limit.ts` (z. B. `WANTS_REFINER_LIMIT`), nach Input-Validierung geprüft.
- Der Client ersetzt den Text des jeweiligen `DraftWant` mit der Antwort und blendet die Rückfrage aus. Fehler/Timeout: Frage bleibt, dezente Fehlermeldung, Want bleibt manuell editierbar (das Rezept bleibt ohne KI vollständig nutzbar).
- **Scope:** Inline-Refine gibt es nur im Journey-Flow, nicht auf der Landing-Seite.

---

## Daten- & Typänderungen

- **`WantItem`** (`lib/types/db-json.ts`): unverändert (`id, text, active, valueId, source`). Der geschärfte Text landet einfach in `text`.
- **`BetItem`:** unverändert. Bet-`reason` wird nicht persistiert.
- **Distiller-Antwort-Shape** (`DistillerResponse` in `wants-journey.tsx`, Parser in `route.ts`):
  - `wants[]` → neues optionales `question?: string | null`.
  - `bets[]` → neues optionales `reason?: string | null`.
- **`DraftWant`** erhält `question: string | null`; **`DraftBet`** erhält `reason: string | null`.
- Keine DB-Migration nötig (nur JSONB-interne, ephemere bzw. bestehende Felder).

## Prompt-Änderungen (Zusammenfassung)

- **Distiller (`wants-distiller.ts`):**
  - Wants: kuratierte Satz-Starter erlauben/anweisen; wo möglich konkretisieren („z. B. …", nur aus Audit); vage Wants mit `question` markieren.
  - Bets: `reason` nur bei echter Yin/Yang-Verbindung; strikte Kleinheit/Konsistenz mit Gegenbeispiel.
  - JSON-Ausgabeformat um `question` (bei wants) und `reason` (bei bets) erweitern; Feld-Reihenfolge dokumentieren.
- **Refiner (neu, `wants-refiner.ts`):** schlanker Prompt, der genau ein Want anhand Audit + Nutzerantwort neu formuliert.

## Fehler- & Randfälle

- **Kein KI-Zugang / JSON kaputt:** bestehender gestufter Fallback im Distiller bleibt; manueller Modus funktioniert (jetzt mit offeneren Startern).
- **Refiner schlägt fehl:** Rückfrage bleibt sichtbar, Want bleibt manuell editierbar.
- **Rate-Limit Refiner:** eigene freundliche Meldung; Want bleibt editierbar.
- **Keine Werte-Hypothese:** Nudge statt Sperre; Distiller vergibt dann `value_id: null` (bestehendes Verhalten).
- **reduced-motion:** Kerze/Sterne statisch, keine Animation.

## Bewusst außerhalb des Scopes

- Keine harte Reihenfolge-Sperre zwischen Werte- und Wants-Rezept.
- Keine Persistenz der Bet-Einordnung.
- Kein Inline-Refine auf der Landing-Seite.
- Kein neues Werte-Konzept; die Kopplung nutzt die bestehende bestätigte Werte-Hypothese.

## Testnotizen

- Landing-Seite: leerer Zustand, nur Wants, Wants + offene Bets, Wants + erledigte Bets; reduced-motion.
- Nudge: mit/ohne vorhandene Werte-Hypothese.
- Distiller: Wants mit variierenden Startern; Bets mit/ohne `reason`; Größen-Konsistenz stichprobenartig gegen das 10-km-Gegenbeispiel prüfen.
- Refiner: vages Want → Frage → Antwort → geschärftes Want; Fehler-/Rate-Limit-Pfad.
- Me-Hub: Stern-Ornament statt Kolben, Zählwerte korrekt.
