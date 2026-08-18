# ADR-0003 — `values_hypothesis.version` ist die Durchlauf-Nummer

- **Status:** angenommen
- **Datum:** 2026-08-18
- **Betrifft:** `values_hypothesis`, `user_recipe_progress`, `lib/recipes/values/cycle.ts`

## Kontext

Die Werte-Übung läuft in Durchläufen: Hypothese aufstellen, sieben Tage Tagebuch, auswerten,
Kompass anpassen, von vorn. Die Nummer des Durchlaufs steht auf `user_recipe_progress.cycle_number`
und — seit KAN-20 — auch auf `journal_entries.cycle_number`.

`values_hypothesis` hat **keine** eigene `cycle_number`. Stattdessen zählt dort `version`, und
zwar im Gleichschritt: jeder Durchlauf erzeugt genau eine neue Hypothesen-Version. Diese
Gleichung stand bisher nur als Kommentar in `evaluation-phase.ts`. Sie war zweimal der Kern
eines Defekts — der Unterschied zwischen `version > 1` (KAN-19) und `version > cycleNumber`
(KAN-20) ist genau die Frage, ob man sie kennt.

Ein Architektur-Review (2026-08-18) hat vorgeschlagen, die beiden Achsen zu trennen und
`values_hypothesis` eine eigene `cycle_number` zu geben, damit die Kopplung nicht mehr implizit
ist.

## Entscheidung

**Nein.** Die Identität bleibt: `version` **ist** die Durchlauf-Nummer. Sie wird nicht
aufgelöst, sondern aufgeschrieben — im `Durchlauf`-Eintrag in `CONTEXT.md` und als
Zuständigkeit von `lib/recipes/values/cycle.ts`, dem einzigen Ort, an dem die beiden Zahlen
zueinander in Beziehung gesetzt werden.

## Begründung

Zwei Spalten, die immer gleich sein müssen, bilden eine Zustandsmenge, deren Hälfte nichts
bedeutet. Was soll gelten, wenn `version = 2` und `cycle_number = 3` in derselben Zeile stehen?
Es gibt keine richtige Antwort — nur einen Defekt, den niemand reproduzieren kann, weil er
einen Zustand voraussetzt, den der Code gar nicht herstellen wollte.

Der Produktionsstand bestätigt die Identität: der einzige User mit mehreren Durchläufen hat
`cycle_number` 1–3 und `version` 1–3 im Gleichschritt (geprüft 2026-08-18).

Die Kopplung implizit zu lassen war der eigentliche Fehler — nicht die Kopplung selbst. Die
Antwort darauf ist ein Modul, das sie besitzt, kein zweites Feld, das sie verletzen kann.

## Konsequenzen

- `values_hypothesis` bekommt keine `cycle_number`. `version` wird in derselben Migration wie
  `user_recipe_progress.cycle_number` auf `NOT NULL DEFAULT 1` gezogen (KAN-23).
- Kein Aufrufer außerhalb von `cycle.ts` vergleicht `version` und `cycleNumber` direkt. Wer es
  tut, baut KAN-19 nach.
- Neu zu bewerten, wenn ein Durchlauf je **mehr als eine** Hypothesen-Version erzeugen soll —
  etwa ein Zwischenstand, der den Durchlauf nicht abschließt. Dann bricht die Identität
  tatsächlich, und dann ist die eigene Spalte richtig.
