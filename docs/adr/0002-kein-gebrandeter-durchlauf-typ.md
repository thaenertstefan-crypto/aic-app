# ADR-0002 — Kein gebrandeter Durchlauf-Typ

- **Status:** angenommen
- **Datum:** 2026-08-18
- **Betrifft:** `lib/recipes/values/cycle.ts`, `lib/recipes/progress.ts`, `lib/recipes/saved-entry.ts`

## Kontext

KAN-19 bis KAN-22 waren vier Fixes derselben Sorte: eine Fläche wusste nicht, in welchem
Durchlauf sie steht, und las darum die Daten eines anderen. Die Durchlauf-Nummer war dabei
jedes Mal eine nackte `number`, die der Aufrufer selbst in seinen Query einsetzen musste —
oder eben vergaß.

Das Repo führt mit `SavedEntryId` bereits einen gebrandeten Typ als beweistragenden Wert: nur
der Server kann einen prägen, und wer einen in der Hand hält, weiß, dass gespeichert wurde.
Ein Architektur-Review (2026-08-18) hat vorgeschlagen, dieselbe Bauart auf die Durchlauf-Nummer
anzuwenden — ein `CycleNumber`, das nur beim Lesen der Fortschritts-Zeile entsteht, sodass
eine hergelaufene `1` nirgends als Durchlauf durchgeht.

## Entscheidung

**Nein.** Die Durchlauf-Nummer bleibt eine `number`. Der Schutz kommt stattdessen aus zwei
Modulen (KAN-24, KAN-25):

- `readProgress` ist der eine Weg zur Fortschritts-Zeile,
- `Cycle` ist der Wert, den Aufrufer herumreichen, und `cycleJournal` der einzige gefilterte
  Einstieg auf `journal_entries`.

## Begründung

Nach diesen beiden Modulen reicht niemand mehr eine nackte Zahl herum — die Aufrufer bekommen
einen `Cycle`. Es bleibt genau **eine** Stelle, an der aus einer rohen Zahl ein Durchlauf wird:
`cycleOfEntry(evalRow.cycle_number)` in `app/api/journal-analysis/route.ts`. Ein Brand wäre
damit ein zweites Schloss an einer bereits abgeschlossenen Tür — ein Typ plus ein Cast, um
eine einzige benannte Zeile zu schützen.

Der Unterschied zu `SavedEntryId` ist nicht Geschmack, sondern Reichweite: `SavedEntryId`
beweist etwas über eine **Prozessgrenze** hinweg — der Client hält einen Wert, dessen Herkunft
er selbst nicht herstellen kann. `CycleNumber` würde innerhalb eines Moduls beweisen, was der
Modulname ohnehin sagt.

## Konsequenzen

- `Cycle.number` ist eine gewöhnliche `number` und kann ohne Zeremonie in einen Query.
- Der Schutz hängt daran, dass `cycleJournal` der einzige Einstieg bleibt. Kommt ein zweiter
  ungefilterter Werte-Read auf `journal_entries` dazu, ist das der Moment, diesen ADR neu zu
  bewerten — nicht der Moment, den Read schnell von Hand zu filtern.
- Künftige Architektur-Reviews werden den Brand erneut vorschlagen; `SavedEntryId` im selben
  Verzeichnis ist ein starker Präzedenzfall. Dieser ADR ist die Antwort.
