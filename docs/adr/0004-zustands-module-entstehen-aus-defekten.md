# ADR-0004 — Zustands-Module entstehen aus Defekten, nicht aus Vollständigkeit

- **Status:** angenommen
- **Datum:** 2026-08-18
- **Betrifft:** `lib/recipes/*/state.ts`, `app/(app)/booster/*`, `app/(app)/me/*`

## Kontext

KAN-12 hat den Übungszustand als „Objekt mit benannten Übergängen" eingeführt: ein reines
Modul `lib/recipes/<übung>/state.ts` mit `initialX` + `advanceX(state, event)`, Test daneben,
die Client-Komponente ruft `useReducer` und rendert nur. `CLAUDE.md` beschreibt das als
Konvention.

Drei der sieben Übungen haben ein solches Modul (`saying-no`, `things-got-messy`, `wants`).
Die übrigen halten ihren Zustand in mehreren `useState` — `sternschmiede.tsx` und
`overthinking-wizard.tsx` in je zehn, `mantra-ritual.tsx` in zwölf, `star-map.tsx` und
`shadow-wizard.tsx` in je zehn.

Ein Architektur-Review (2026-08-18) hat vorgeschlagen, die fehlenden nachzuziehen, damit die
Konvention vollständig wird.

## Entscheidung

**Nein — nicht auf Vorrat.** Ein `state.ts` entsteht, wenn eine **fachliche** Regel im Zustand
steckt, die ohne laufende App nicht prüfbar ist. Nicht, wenn eine Datei viele `useState` hat.

## Begründung

Die Zählung sagt weniger, als sie scheint. Die zehn `useState` von `sternschmiede.tsx`
verteilen sich auf drei Komponenten mit je eigener Aufgabe; die von `overthinking-wizard.tsx`
auf einen Countdown (zwei) und den Wizard (acht), von denen drei — `submitting`, `saved`,
`error` — reine Klempnerei sind.

Vor allem aber ist die testbare Regel dort längst heraus: KAN-11 hat für Overthinking genau
das getan und den Grund gleich mit aufgeschrieben — *„Zwei getrennte Fragen: Ist die Bühne
beantwortet (`nextStep`)? Und wartet sie noch auf ihre KI-Frage (`questionPending`)? Vorher
steckte beides in `canGoNext` — die fachliche Regel war ohne Netz nicht mehr prüfbar."* Beide
Funktionen liegen rein und getestet in `lib/recipes/overthinking/steps.ts`. Ein zusätzliches
`state.ts` würde acht `useState` in ein `switch` verwandeln: die Komplexität **wandert, sie
konzentriert sich nicht**, und die Testfläche wächst um null.

Dazu die Evidenz aus der Historie: keine der genannten Dateien hat je einen `fix()`-Commit
wegen widersprüchlichem Zustand gesehen — was sie zuletzt anfasste, waren Refactors (KAN-7, -8,
-10, -11) und Visuelles. Zum Vergleich: die Werte-Übung hat vier `fix()` in Folge, und genau
daraus sind ihre Module entstanden.

Das ist dieselbe Logik wie in [ADR-0001](0001-kein-gemeinsames-rezept-modul.md): die sieben
Übungen unterscheiden sich echt, und das gilt für ihre Zustände so gut wie für ihre Bühnen.

## Konsequenzen

- Vier Übungen bleiben ohne `state.ts`. Das ist kein Rückstand, sondern der Stand.
- **Auslöser:** sobald ein `fix()`-Commit auf einer dieser Dateien einen widersprüchlichen
  Zustand repariert, ist der Moment gekommen — dann gibt es auch den Testfall, um den herum
  sich das Modul bauen lässt.
- Künftige Architektur-Reviews werden „die fehlenden nachziehen" erneut vorschlagen; eine
  Konvention mit 3 von 7 sieht nach Rückstand aus. Dieser ADR ist die Antwort.
