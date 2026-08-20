# Domänen-Glossar

Nur die Begriffe, die heute mehrdeutig sind — hier stehen bewusst nicht alle Wörter der App,
sondern die, für die im Repo mehrere Namen kursieren. Wer Tickets, Commits oder Code schreibt,
nimmt das Wort aus der linken Spalte.

Verwandte Entscheidungen: [ADR-0001](docs/adr/0001-kein-gemeinsames-rezept-modul.md),
[ADR-0002](docs/adr/0002-kein-gebrandeter-durchlauf-typ.md),
[ADR-0003](docs/adr/0003-hypothesen-version-ist-die-durchlauf-nummer.md),
[ADR-0004](docs/adr/0004-zustands-module-entstehen-aus-defekten.md),
[ADR-0005](docs/adr/0005-ferner-stern-geht-an-der-ki-vorbei.md).

## Übung

Eine geführte Selbsterfahrungs-Einheit — Werte, Wants, Bill of Rights, Nein sagen, Overthinking,
Shadow, Things got messy.

- **Nach außen und in Prosa: „Übung".** Nicht „Rezept", nicht „Modul", nicht „Flow".
- **Im Code und in der Datenbank: `recipe`.** `recipe_slug`, `user_recipe_progress`,
  `components/recipes/` — das steht in Spaltennamen und ist nicht verhandelbar. Der Bruch
  zwischen Prosa und Bezeichner ist gewollt und kostet weniger als eine Migration.

## Bühne

Ein sichtbarer Abschnitt innerhalb einer Übung — das, was der Nutzer als „eine Seite" erlebt,
bevor er weitergeht.

- **In Prosa: „Bühne".** Nicht „Step", nicht „Karte", nicht „Screen".
- **Im Code: `phase`.** Die Variable, die hält, welche Bühne gerade dran ist.

Der Begriff kam über die Werte-Auswertung („Auswertung als vier Bühnen") und hat sich
durchgesetzt; ältere Stellen sagen noch „Steps", das ist Altlast.

## Booster · Me

Die zwei Register, in denen Übungen leben.

- **Booster** — akut. Wird geöffnet, wenn gerade etwas los ist. `app/(app)/booster/*`.
- **Me** — durabel. Arbeit an etwas, das über den Tag hinaus gilt. `app/(app)/me/*`.

Die Trennung ist inhaltlich, nicht technisch: beide Register nutzen dieselben Bausteine. Ob
eine neue Übung nach Booster oder nach Me gehört, entscheidet sich daran, ob sie einen Moment
auffängt oder ein Bild aufbaut.

## Durchlauf

Ein vollständiger Umlauf der Werte-Übung: Hypothese aufstellen, sieben Tage Tagebuch,
auswerten, Kompass anpassen.

- **In Prosa und Code: „Durchlauf" / `cycle`.** So auch in Funktions- und Variablennamen
  (`lib/recipes/values/cycle.ts`, `readCycle`, `cycleJournal`).
- **Der laufende Durchlauf** ist der mit der höchsten Nummer. **Der Durchlauf eines Eintrags**
  steht auf dem Eintrag selbst (`journal_entries.cycle_number`) und muss nicht der laufende
  sein — wer den Rückblick eines älteren Durchlaufs erneut auswertet, bekommt dessen sieben
  Tage.
- Pro (User, Übung) gibt es **eine Fortschritts-Zeile je Durchlauf**; die mit der höchsten
  `cycle_number` ist der Stand (`user_recipe_progress`).
- **`values_hypothesis.version` ist die Durchlauf-Nummer** — keine eigene Spalte, keine zwei
  Zahlen, die auseinanderlaufen können. Siehe [ADR-0003](docs/adr/0003-hypothesen-version-ist-die-durchlauf-nummer.md).

## Funke

Eine kleine Wette mit sich selbst, entstanden in der Sternschmiede. Abzugrenzen vom **Stern**,
der für ein bestätigtes Want steht. Ein Funke kann zu einem Stern werden, ist aber zunächst
unverbindlich — das ist der ganze Punkt des Begriffs.

## Stern

Ein bestätigtes Want. Vom **Funken** abzugrenzen, der noch unverbindlich ist. Sterne gibt es in
zwei Weiten, und der Unterschied ist nicht die Entfernung des Ziels, sondern die Herkunft des
Textes:

- **Naher Stern** — destilliert. Sein Text ist die Zusammenfassung, die die KI aus vielen
  Antworten des Audits zieht; der Wert liegt im Muster, nicht im Wortlaut.
- **Ferner Stern** — wörtlich. Sein Text ist genau das, was in **einem** Antwortfeld der
  Tagtraum-Frage steht, unverändert. Die KI steuert nur den Namen bei.
- **„Fern" heißt: aus einem Antwortfeld der Tagtraum-Frage.** Einen anderen Weg gibt es nicht —
  selbst geschriebene Sterne sind immer nah. Wer das ändert, nimmt der Weite ihre zweite
  Bedeutung als Herkunftsmarke, auf die sich andere Flächen verlassen. Siehe
  [ADR-0005](docs/adr/0005-ferner-stern-geht-an-der-ki-vorbei.md).

## Antwortfeld

Eine einzelne Box in einer Frage der Sternensuche. Der Nutzer beantwortet jede Frage in
mehreren davon, nicht in einem Fließtext.

- **In Prosa: „Antwortfeld".** Nicht „Zeile", nicht „Box", nicht „Eintrag".
- Es ist die kleinste Einheit, die als **eine Antwort** gilt — daran hängt die Regel, dass ein
  Antwortfeld genau einen fernen Stern ergibt. Ein Antwortfeld darf mehrzeilig sein; deshalb
  sind die Felder einer Frage eine Liste und nicht ein zusammengefügter Text.
