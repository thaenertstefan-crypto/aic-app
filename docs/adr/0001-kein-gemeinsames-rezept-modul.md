# ADR-0001 — Kein gemeinsames Rezept-Modul

- **Status:** angenommen
- **Datum:** 2026-08-16
- **Betrifft:** `app/(app)/booster/*`, `app/(app)/me/*`, `components/recipes/`

## Kontext

Die App führt sieben Übungen, die einander mechanisch stark ähneln: Erst-Intro beim ersten
Besuch, eine Folge von Bühnen, meist ein KI-Schritt, Persistenz über `journal_entries`. Ein
Architektur-Review (2026-08-15) hat diese Ähnlichkeit an mehreren Stellen als Wiederholung
belegt — dieselbe Intro-Mechanik fünfmal inline nachgebaut, dieselbe KI-Bühne dreimal neu
erfunden, dieselbe Zustands-Rücksetzung von Hand pro Feld.

Es ist ausdrücklich damit zu rechnen, dass weitere Übungen dazukommen. Damit stellt sich die
Frage, ob ein gemeinsames Modul „Rezept" entstehen soll, das Slug, Intro, Bühnenfolge,
KI-Schritt und Persistenz besitzt — sodass eine neue Übung im Wesentlichen aus einer
Tabellenzeile plus Bühnen-Zeichnungen besteht.

## Entscheidung

**Nein.** Statt eines Rezept-Moduls entstehen mehrere kleine, unabhängige Vertiefungen mit je
eigenem kleinem Interface:

- das bereits existierende Intro-Gate wird tatsächlich benutzt statt nachgebaut,
- die KI-Bühne wird ein eigenes Modul, das die nächste Bühne zurückgibt,
- der Übungszustand wird pro Übung ein Objekt mit benannten Übergängen.

## Begründung

Die sieben Übungen unterscheiden sich **echt**, nicht nur in Daten:

- `saying-no` führt eine Szenario-Schleife mit Wiederholung und Revision,
- `shadow` endet in einem Verbrenn-Ritual, das bewusst nichts speichert,
- `overthinking` hat einen Countdown und Fragen, die währenddessen generiert werden,
- `values` ist eine Kartenansicht mit Kamerafahrt, gar keine Bühnenfolge.

Ein Modul, das all das modellieren müsste, bekäme ein Interface, das nahezu jeden dieser
Sonderfälle als Option trägt. Genau das ist ein **flaches Modul im Großen**: viel Interface,
das ein Aufrufer lernen muss, wenig Verhalten, das ihm abgenommen wird. Die drei kleinen
Vertiefungen bestehen den Löschtest dagegen jede für sich — löscht man eine, verteilt sich
ihre Komplexität nachweislich über mehrere Aufrufer.

Dazu kommt die Prognose-Falle: ein Rezept-Modul besteht den Löschtest nur so lange, wie die
*nächste* Übung sich fügt. Es wettet auf Gleichförmigkeit, die die bisherigen sieben nicht
zeigen.

## Konsequenzen

- Eine neue Übung bleibt spürbare Arbeit. Das ist der Preis und er ist bewusst bezahlt.
- Die geteilte Mechanik wird über mehrere kleine Module eingesammelt, nicht über eines.
- Künftige Architektur-Reviews werden das gemeinsame Modul erneut vorschlagen — sieben
  ähnliche Übungen sind ein Magnet für „bau ein Framework". Dieser ADR ist die Antwort.
  Er ist neu zu bewerten, wenn eine Übung dazukommt, die sich **ohne Sonderfall** in die
  Bühnenfolge der anderen fügt.
