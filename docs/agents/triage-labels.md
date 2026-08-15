# Triage Labels

Die Skills sprechen in fünf kanonischen Triage-Rollen. Diese Tabelle bildet sie auf die Label-
Strings ab, die in Jira (`KAN`) tatsächlich verwendet werden.

| Label in mattpocock/skills | Label in unserem Tracker | Bedeutung |
| -------------------------- | ------------------------ | --------- |
| `needs-triage`             | `needs-triage`           | Muss noch bewertet werden |
| `needs-info`               | `needs-info`             | Wartet auf Rückfrage-Antwort |
| `ready-for-agent`          | `ready-for-agent`        | Vollständig spezifiziert, bereit für einen AFK-Agenten |
| `ready-for-human`          | `ready-for-human`        | Braucht Stefan — Urteil, Gerät oder Zugang |
| `wontfix`                  | `wontfix`                | Wird nicht angefasst |

Nennt eine Skill eine Rolle („apply the AFK-ready triage label"), nimm den String aus der rechten
Spalte.

## Jira-Besonderheiten

- **Labels müssen nicht angelegt werden.** Das `labels`-Feld in Jira ist ein freier String-Satz —
  anders als bei GitHub gibt es kein Label-Register und keinen „Label existiert nicht"-Fehler.
  Das ist bequem, heißt aber auch: **ein Tippfehler wird stillschweigend akzeptiert** und erzeugt
  ein totes Label, das keine JQL-Query findet. Genau abschreiben.
- **Keine Leerzeichen.** Jira-Labels dürfen keine enthalten. Alle fünf oben sind unbedenklich;
  falls je eines dazukommt, mit Bindestrichen schreiben.
- **Setzen ersetzt.** `editJiraIssue` mit `fields: { "labels": [...] }` überschreibt die ganze
  Liste. Erst lesen, dann die vollständige neue Liste schreiben — sonst fallen bestehende Labels
  (z. B. `wayfinder:*`) weg.
- **Filtern per JQL:** `labels = ready-for-agent`, `labels IN (needs-triage, needs-info)`,
  `labels IS EMPTY`.

Die rechte Spalte anpassen, falls sich das Vokabular je ändert.
