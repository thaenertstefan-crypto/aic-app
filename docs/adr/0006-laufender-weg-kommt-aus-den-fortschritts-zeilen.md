# ADR-0006 — Der laufende Weg kommt aus den Fortschritts-Zeilen, nicht aus `active_recipe_id`

- **Status:** angenommen
- **Datum:** 2026-08-20
- **Betrifft:** `profiles.active_recipe_id`, `user_recipe_progress`, `app/(app)/dashboard/page.tsx`

## Kontext

Das Dashboard zeigt eine Empfehlungskarte: „was ist als nächstes dran". Ob sie „weitermachen"
oder „starten" sagt, hing bisher an `profiles.active_recipe_id` — dem Slug, den der Nutzer beim
Onboarding gewählt hat:

```ts
const hasActiveRecipe =
  !!activeRecipe && activeRecipe.available &&
  !!activeProgress && activeProgress.status !== "completed";
```

Die Spalte wird an **genau einer** Stelle geschrieben: `app/onboarding/onboarding.actions.ts:62`.
Danach nie wieder. Keine Übung setzt sie beim Starten, keine räumt sie beim Abschließen auf.

Daraus folgt ein Verhalten, das niemand entworfen hat: Continuity funktioniert für die eine beim
Onboarding gewählte Übung und ist **tot**, sobald diese abgeschlossen ist. Wer danach die Wants
beginnt und am nächsten Morgen aufs Dashboard kommt, findet dort keinen Hinweis auf den Weg, in
dem er mittendrin steckt — die Karte kennt ihn nicht.

Der Name der Spalte legt nahe, dass sie gepflegt wird. Sie sieht aus wie eine Regel und ist ein
Überbleibsel.

## Entscheidung

**`active_recipe_id` ist keine Quelle für „woran arbeitest du gerade".** Wer den laufenden Weg
wissen will, leitet ihn aus `user_recipe_progress` ab: die jüngste Zeile je Slug
(`latestPerSlug`) mit `status === "in_progress"`.

Die Auswahlregel der Empfehlungskarte liest die Spalte damit nicht mehr (KAN-56). Die Spalte
selbst bleibt vorerst stehen — das Onboarding schreibt sie weiterhin, und ob sie sonst noch
jemand liest, ist eine Frage für den Tag, an dem sie fallen soll.

## Begründung

Ein Feld, das einmal geschrieben und nie gepflegt wird, ist kein Zustand, sondern ein
Zeitstempel mit falschem Namen. Es kann nur in dem Moment stimmen, in dem es entsteht.

Die Alternative wäre gewesen, es zu **pflegen** — jede Übung setzt es beim Starten, räumt es
beim Abschließen auf. Das ist mehr Code, mehr Schreibvorgänge und eine zweite Wahrheit neben
einer, die schon existiert und schon stimmt: `user_recipe_progress` weiß pro Übung und
Durchlauf, ob etwas läuft. Zwei Felder, die immer übereinstimmen müssen, sind dieselbe Falle wie
in [ADR-0003](0003-hypothesen-version-ist-die-durchlauf-nummer.md) — die Hälfte der
Zustandsmenge bedeutet nichts, und genau dort entstehen Defekte, die niemand reproduzieren kann.

Es kostet außerdem nichts: Das Dashboard liest die Zeilen über `readAllProgress` ohnehin schon,
und `latestPerSlug` / `everCompletedSlugs` liegen daneben und sind getestet. Die Ableitung ist
eine reine Funktion über bereits geladene Daten — keine zusätzliche Abfrage.

## Konsequenzen

- Die Empfehlungskarte entscheidet über die drei **Bilder** (siehe `CONTEXT.md`), in fester
  Reihenfolge: erst das erste Bild in Arbeit, sonst das erste leere, sonst der Endzustand.
- Wer künftig „aktuelle Übung" braucht — Einstellungen, Benachrichtigungen, was auch immer —
  nimmt denselben Weg. `active_recipe_id` neu einzuführen heißt, dieses ADR zu überschreiben.
- `latestPerSlug` beantwortet „läuft gerade", `everCompletedSlugs` beantwortet „war jemals
  fertig". Die beiden sind nicht austauschbar: ein zweiter Werte-Durchlauf ist *in Arbeit* und
  gleichzeitig *jemals fertig*, und beide Antworten sind richtig.
- Neu zu bewerten, wenn der Nutzer je **selbst** einen Weg als „meinen aktuellen" markieren soll
  — eine erklärte Wahl ist etwas anderes als ein abgeleiteter Stand, und dann wäre ein eigenes
  Feld richtig. Heute gibt es diese Geste nicht.
