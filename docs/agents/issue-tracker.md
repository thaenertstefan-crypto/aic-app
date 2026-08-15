# Issue tracker: Jira Cloud (Projekt `KAN`)

Issues und Specs für dieses Repo leben in **Jira Cloud**, nicht auf GitHub. Das GitHub-Remote
(`thaenertstefan-crypto/aic-app`) trägt nur den Code — dort werden **keine** Issues geführt, und
`gh issue …` ist für dieses Repo das falsche Werkzeug.

## Zugangsdaten

| | |
| --- | --- |
| Site | `thaenertstefan.atlassian.net` |
| `cloudId` | `87502bd4-2abe-4fbb-be04-ada988446cb4` |
| Projekt-Key | `KAN` (Anzeigename „AIC-APP") |
| Projekt-Typ | team-managed (next-gen), Software |
| Board | https://thaenertstefan.atlassian.net/jira/software/projects/KAN/boards/2 |
| Issue-URL | `https://thaenertstefan.atlassian.net/browse/KAN-<n>` |

`cloudId` ist bei **jedem** Tool-Call ein Pflichtfeld. Nimm die UUID oben; der Site-Hostname
funktioniert als Fallback, ist aber langsamer (Auflösung pro Call).

## Zugriff läuft ausschließlich über den MCP-Connector

Es gibt keinen CLI-Weg: `acli` ist auf dieser Maschine nicht installiert, und `gh` kennt Jira
nicht. Alles läuft über den Atlassian-Rovo-MCP-Connector (`mcp__claude_ai_Atlassian_Rovo__*`).

**Zuerst die Tools laden.** Die MCP-Tools sind in Claude Code *deferred* — sie stehen mit Namen
im Kontext, aber ohne Schema. Ein direkter Aufruf scheitert mit `InputValidationError`. Hol dir
die Schemas also vorab per `ToolSearch`:

```
ToolSearch(query: "select:mcp__claude_ai_Atlassian_Rovo__createJiraIssue,mcp__claude_ai_Atlassian_Rovo__getJiraIssue,mcp__claude_ai_Atlassian_Rovo__searchJiraIssuesUsingJql,mcp__claude_ai_Atlassian_Rovo__editJiraIssue,mcp__claude_ai_Atlassian_Rovo__addCommentToJiraIssue")
```

Das ist der häufigste Stolperstein. Lade die Tools, die du brauchst, in einem Call.

Ist der Connector nicht autorisiert (nicht-interaktive Session), sag das und halt an — frag
**nicht** nach Tokens oder Callback-URLs. Stefan autorisiert ihn in den claude.ai-Connector-Settings.

## Operationen

- **Issue anlegen** — `createJiraIssue` mit `cloudId`, `projectKey: "KAN"`, `issueTypeName`,
  `summary`, `description`. Labels gehen **nur** über `additional_fields`, nicht als eigener
  Parameter: `additional_fields: { "labels": ["needs-triage"] }`.
- **Issue lesen** — `getJiraIssue` mit `issueIdOrKey: "KAN-12"`. Kommentare kommen nicht per
  Default mit; dafür `fields: ["summary","description","status","labels","comment"]` übergeben.
- **Issues listen / suchen** — `searchJiraIssuesUsingJql`, z. B.
  `jql: "project = KAN AND labels = needs-triage AND statusCategory != Done ORDER BY created DESC"`.
  `searchResultMode` auf `"issues"` lassen, außer eine Zählung wird wirklich gebraucht.
- **Kommentieren** — `addCommentToJiraIssue`.
- **Labels setzen / entfernen** — `editJiraIssue` mit `fields: { "labels": [...] }`. Achtung:
  das Feld wird **ersetzt, nicht gemerged**. Erst die aktuellen Labels lesen, dann die
  vollständige neue Liste schreiben, sonst gehen Labels verloren.
- **Status ändern** — **niemals raten.** Erst `getTransitionsForJiraIssue` aufrufen, dann
  `transitionJiraIssue` mit der zurückgegebenen `transition.id`. Die Spalten dieses Boards sind
  hier bewusst nicht dokumentiert: Beim Einrichten war das Board leer, die Statusnamen sind also
  ungeprüft. Nachschlagen statt annehmen.
- **Blockierungen** — `createIssueLink` mit Link-Typ `Blocks` (id `10000`). Merkregel:
  `inwardIssue` ist der **Blocker**, `outwardIssue` das blockierte Issue („A is blocked by B" →
  `inwardIssue: B`, `outwardIssue: A`).

## Konventionen

- **Sprache: Deutsch.** Titel und Beschreibungen auf Deutsch, im gleichen Register wie der Rest
  des Projekts. Code-Bezeichner, Pfade und Fehlermeldungen bleiben natürlich wie sie sind.
- **Issue-Typ:**
  - `Task` — Default für alles, was keine der anderen Kategorien klar trifft.
  - `Bug` — Defekte an bestehendem Verhalten.
  - `Story` — nutzersichtbare Features, formuliert als Nutzerziel.
  - `Epic` — reserviert für Wayfinder-Maps (siehe unten). Nicht für gewöhnliche Sammelaufgaben.
  - `Feature`, `Sub-Task` — existieren im Projekt, werden aber nicht aktiv vergeben.
- **Referenzformat:** `KAN-<n>`. Ein nacktes `#42` bedeutet in diesem Repo nichts — Jira nutzt
  keine Nummernzeichen, und GitHub-Issues gibt es hier nicht.
- **Verifikation gehört ins Ticket.** Was „fertig" heißt, ist in diesem Projekt selten von den
  statischen Gates abgedeckt — siehe `CLAUDE.md`, Abschnitt Verifikation. Wenn ein Ticket eine
  visuelle oder Motion-Änderung beschreibt, gehört „am iPhone geprüft" in die Akzeptanzkriterien.

## Pull requests als Triage-Fläche

**PRs als Request-Fläche: nein.** _(Auf `ja` setzen, falls externe GitHub-PRs jemals als Feature-
Requests behandelt werden sollen; `/triage` liest dieses Flag.)_ Solo-Projekt ohne externe
Beiträge — es gibt schlicht keine fremden PRs, und `main` ist laut `CLAUDE.md` der Arbeitszweig.

## Wenn eine Skill sagt „publish to the issue tracker"

Ein Jira-Issue in `KAN` anlegen (`createJiraIssue`). Den zurückgegebenen Key `KAN-<n>` und die
`browse`-URL melden.

## Wenn eine Skill sagt „fetch the relevant ticket"

`getJiraIssue` mit dem Key, `fields` inklusive `comment`.

## Wayfinding-Operationen

Genutzt von `/wayfinder`. Die **Map** ist ein Epic, die **Tickets** sind dessen Kinder.

- **Map** — ein `Epic` mit Label `wayfinder:map`, dessen Beschreibung Notes / Decisions-so-far /
  Fog trägt.
- **Child-Ticket** — ein `Task` (oder passenderer Typ) mit `parent: "KAN-<epic>"`, sodass es in
  Jira nativ unter dem Epic hängt. Zusätzlich Label `wayfinder:<typ>`
  (`research` / `prototype` / `grilling` / `task`).
- **Blocking** — Link-Typ `Blocks` wie oben. Ein Ticket ist frei, wenn jedes blockierende Issue
  in der Status-Kategorie `Done` ist.
- **Frontier-Query** — `jql: "parent = KAN-<epic> AND statusCategory != Done AND assignee IS EMPTY ORDER BY created ASC"`,
  dann alles mit offenem Blocker verwerfen; das erste verbleibende gewinnt.
- **Claim** — `editJiraIssue` mit `fields: { "assignee": { "id": "<accountId>" } }`. Stefans
  Account-ID: `712020:b896498f-fb43-4cc0-871a-bb145bd39b49`.
- **Resolve** — Antwort als Kommentar, Ticket nach Done transitionieren, dann einen Zeiger in die
  Decisions-so-far der Map schreiben.
