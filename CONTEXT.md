# Domänen-Glossar

Nur die Begriffe, die heute mehrdeutig sind — hier stehen bewusst nicht alle Wörter der App,
sondern die, für die im Repo mehrere Namen kursieren. Wer Tickets, Commits oder Code schreibt,
nimmt das Wort aus der linken Spalte.

Verwandte Entscheidungen: [ADR-0001](docs/adr/0001-kein-gemeinsames-rezept-modul.md).

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

## Funke

Eine kleine Wette mit sich selbst, entstanden in der Sternschmiede. Abzugrenzen vom **Stern**,
der für ein bestätigtes Want steht. Ein Funke kann zu einem Stern werden, ist aber zunächst
unverbindlich — das ist der ganze Punkt des Begriffs.
