# Feinjustierung 5 — Intro-Texte übernehmen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die redigierten Intro-Fassungen aus `INTROS_REVIEW.md` stehen im Code, die „Vorschlag generieren"/„Recht generieren"-Inkonsistenz ist aufgelöst, und die Review-Datei ist weg.

**Architecture:** Reine Content-Arbeit in [`lib/utils/recipe-intros.ts`](../../../lib/utils/recipe-intros.ts) plus eine Begriffs-Vereinheitlichung über vier Dateien. Acht inhaltliche Änderungen; Vertipper in den neuen Passagen werden still korrigiert — jede einzelne ist unten aufgeführt, es gibt keine stillschweigenden Zusatz-Korrekturen.

**Tech Stack:** TypeScript-Konstanten, keine Runtime-Logik.

Quelle: [`docs/superpowers/specs/2026-07-28-feinjustierung-runde-design.md`](../specs/2026-07-28-feinjustierung-runde-design.md), Paket 7. Redigierte Fassungen: `INTROS_REVIEW.md` im Repo-Root.

## Global Constraints

- **Alle user-facing Texte sind Deutsch**, warm/ermutigend, informelles „du".
- **ANFÜHRUNGSZEICHEN — der kritische Punkt dieses Plans:** Alle deutschen Anführungszeichen in den neuen Texten müssen echte Unicode-Zeichen sein: **U+201E** (`„`, öffnend) und **U+201C** (`"`, schließend). ASCII `"` bricht sowohl das Typo-Gate (`scripts/check-typography.mjs`) als auch — weil `recipe-intros.ts` seine Strings mit **doppelten** Quotes delimitiert — das String-Literal selbst (TS1005, unterminated string).
  - **Achtung, Abweichung von der Spec:** Die Spec behauptet, `recipe-intros.ts` sei „mit einfachen Quotes delimitiert". Das stimmt nicht — die Datei verwendet durchgehend `"…"`. Das funktioniert, weil U+201C ein anderer Codepoint als ASCII `"` ist. **Die bestehende Delimiter-Konvention beibehalten** (doppelte Quotes), nicht auf einfache umstellen.
  - Beim Kopieren aus `INTROS_REVIEW.md` prüfen: Die Markdown-Datei enthält an vielen Stellen bereits U+201C. Nach jeder Task mit `npm run gate` gegenprüfen.
- **Gedankenstrich-Hausstil:** Halbgeviertstrich `—` (U+2014), nicht `-`.
- **Es gibt kein Test-Framework im Repo.** Harte Gates: `npx tsc --noEmit`, `npm run gate`, `npm run build`. Jede Task endet damit.
- **`npm run lint` ist auf `main` vorbestehend ROT** (drei Sternschmiede-ESLint-Fehler). Keine Regression dieser Runde.
- Nach jeder Task committen und nach `main` pushen.
- **PowerShell 5.1-Fallen:** Pfade mit `(app)` immer quoten; in mehrzeiligen Commit-Messages keine inneren `"` verwenden.

---

### Task 1: Kleine Textreparaturen in `recipe-intros.ts`

Vier chirurgische Eingriffe: ein kaputter Satz bei Values, „Rezept" → „Übung", ein weicherer Übergang zur Schmiede und die Metapher-Kollision bei „Nein sagen".

**Files:**
- Modify: `lib/utils/recipe-intros.ts:25` (values, Karte 2), `:29` (values, Karte 3), `:47` (wants, Karte 4), `:89` (saying-no, Karte 2)

**Interfaces:**
- Consumes: nichts.
- Produces: nichts — `IntroCard` und `getRecipeIntro()` bleiben unverändert. Task 2 fasst dieselbe Datei an (wants, Karten 1–3), Task 3 ebenfalls (bill-of-rights, Karte 4).

- [ ] **Step 1: Values, Karte 2 „Deine Werte." — kaputten Satz reparieren**

Der Satz lautet heute „… wissen gar nicht, was ihre eigentlich sind." — das Bezugswort fehlt.

```ts
      body: "Werte sind dein innerer Kompass — die Prinzipien und Überzeugungen, die deine Entscheidungen, Gedanken und Gefühle leiten, auch wenn du dir dessen gar nicht bewusst bist. Das Problem ist: Die meisten Menschen wissen gar nicht, was ihre Werte eigentlich sind. Und wer seinen Kompass nicht kennt, navigiert auf gut Glück.",
```

- [ ] **Step 2: Values, Karte 3 „Was dich erwartet" — „Rezept" → „Übung" plus fehlendes „heraus"**

Nur der erste Satz ändert sich; der Rest des Bodys bleibt Zeichen für Zeichen wie er ist:

```ts
      body: "In dieser Übung findest du deine Werte nicht durch stundenlange Selbstreflexion heraus — sondern durch echte Beobachtung von dir selbst. Wie ein Wissenschaftler. Du startest mit deiner Hypothese: 5 Werte, von denen du vermutest, dass sie deine sind — ohne zu viel nachzudenken. Dann beobachtest du dich selbst für 7 Tage mit kurzen Tagebuch-Einträgen: Was hat dich heute wirklich bewegt? Was hat dich genervt? Was hat dir Energie gegeben oder gekostet? Und vor allem: warum? Am Ende wertest du aus, ob deine Hypothese stimmt — oder ob du dich selbst überrascht hast. Pro Tag brauchst du dafür nur 2–3 Minuten. Bist du dabei?",
```

- [ ] **Step 3: Wants, Karte 4 — weicherer Übergang zur Schmiede**

„Dafür gibt es die Sternschmiede:" wird zu „Falls das auf dich zutreffen sollte, dann gibt es hier die Sternschmiede:". Der Rest des Bodys bleibt unverändert:

```ts
      body: "Manchmal weiß man nicht so richtig, was man eigentlich will. Man lebt in einer Routine, macht immer dasselbe, lebt denselben Tag fünfmal — um am Wochenende zwei Tage lang einen anderen zu leben. Irgendwas macht einen unzufrieden, man will ausbrechen und endlich wieder etwas tun, das einen zum Leuchten bringt, aber man weiß nicht was. Falls das auf dich zutreffen sollte, dann gibt es hier die Sternschmiede: Dort schlägst du Funken — kleine Wetten mit dir selbst, in denen du neue oder alte vergessene Dinge entdeckst, aus denen ein neuer Stern werden könnte. Bist du dabei?",
```

- [ ] **Step 4: Nein sagen, Karte 2 — Quellenangabe raus, „Kompass" → „Filter"**

„Kompass" ist im AIC-Bildsystem für die Werte reserviert — „Filter" trifft die Mechanik besser und räumt die Metapher-Kollision auf. Die Quellenangabe „(nach Dr. Aziz Gazipura)" entfällt.

```ts
      body: "Diese simple Regel ist dein neuer Filter: Spürst du bei einer Anfrage kein klares, freudiges „Hell yes!", dann ist die ehrliche Antwort ein Nein. Das ist kein Egoismus — im Gegenteil: Dein Ja ist nur so viel wert wie dein Nein. Wer zu allem Ja sagt, sagt in Wahrheit zu nichts richtig Ja. Jedes ehrliche Nein macht Platz für die Dinge und Menschen, die dir wirklich wichtig sind.",
```

Der Titel der Karte („Wenn es kein „Hell yes!" ist, ist es ein Nein.") bleibt unverändert.

- [ ] **Step 5: Nicht übernehmen — zwei Stellen, an denen die `.md` schlechter ist als der Code**

Diese beiden Stellen sind Transkriptions-Rutscher in `INTROS_REVIEW.md`, keine Absicht. Der Code-Stand bleibt:

| Ort | `.md` | bleibt im Code |
|---|---|---|
| Nein sagen, Karte 1 | „Und jetzt sitzt da mit einem vollen Kalender" | „Und jetzt sitzt **du** da …" |
| Schattenseite, Karte 3 | „der privatste Ort der App" | „der **privateste** Ort der App" |

Run: `grep -n "sitzt du da mit einem vollen Kalender" lib/utils/recipe-intros.ts`
Expected: ein Treffer (saying-no, Karte 1) — der Satz ist unangetastet.

Run: `grep -n "privateste Ort der App" lib/utils/recipe-intros.ts`
Expected: ein Treffer (shadow, Karte 3) — unangetastet.

- [ ] **Step 6: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler. Bricht tsc mit TS1005 („unterminated string literal"), ist ein `"` als ASCII statt als U+201C hineingerutscht.

- [ ] **Step 7: Prüfen und committen**

Die Intro-Overlays über das Info-Icon öffnen: `/me/values` (Karten 2+3), `/me/wants` (Karte 4), `/booster/saying-no` (Karte 2). Texte lesen sich sauber, keine ASCII-Quotes.

```bash
git add lib/utils/recipe-intros.ts
git commit -m "copy(intros): Textreparaturen Values, Wants Karte 4, Nein sagen Karte 2

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 2: Wants-Intro Karten 1–3 neu

Drei vollständig neue Fassungen. Alle Vertipper der `.md` sind unten in Tabellen aufgeführt und in den fertigen Strings bereits korrigiert — der String ist jeweils **wörtlich zu übernehmen**, es ist keine weitere Redaktion vorgesehen.

**Files:**
- Modify: `lib/utils/recipe-intros.ts:32-44` (wants, Karten 1–3)

**Interfaces:**
- Consumes: nichts.
- Produces: nichts.

- [ ] **Step 1: Karte 1 „Wessen Ziele jagst du eigentlich?" — vollständig neu**

Der neue Schluss („jagst du dann wirklich deine eigenen Ziele?") schließt an den Titel an, statt wie bisher auf Identität zu schwenken.

Korrekturen gegenüber der `.md`:

| `.md` | übernommen als |
|---|---|
| interessanter Weise | interessanterweise |
| durch … oder einfach den Leuten, die uns … begleiten | … oder einfach die Leute, die uns … begleiten |
| fangen diese Ziele … an auch für uns schmackhaft auszusehen | … an, auch für uns schmackhaft auszusehen |

```ts
    {
      title: "Wessen Ziele jagst du eigentlich?",
      body: "Der Job, der auf LinkedIn gut aussieht. Das Hobby, das gerade alle anfangen. Die Reise, die man „mal gemacht haben muss". Täglich werden wir mit Zielen bombardiert, die wir wollen sollen — sei es durch Werbung, Trends auf TikTok und Instagram oder einfach die Leute, die uns tagtäglich durch unseren Alltag begleiten. Und interessanterweise fangen diese Ziele nach einer gewissen Zeit an, auch für uns schmackhaft auszusehen. Psychologen nennen das mimetisches Begehren: Wir übernehmen ganz automatisch die Wünsche unseres Umfelds, ohne es zu merken. Das Problem: Wenn andere bestimmen, was du willst — jagst du dann wirklich deine eigenen Ziele?",
    },
```

- [ ] **Step 2: Karte 2 — Titel „Dein Kompass und deine Sterne" → „Deine Sterne", Body neu**

Deutlich ausführlicher, mit dem Erwartungs-Berg am Schluss.

Korrekturen gegenüber der `.md`:

| `.md` | übernommen als |
|---|---|
| ein schlechten Tag | einen schlechten Tag |
| essenziel | essenziell |
| das richtige für uns zu tun | das Richtige für uns zu tun |
| losgelöst davon was andere glauben, die richtigen Sterne für uns sind | losgelöst davon, was andere für die richtigen Sterne für uns halten |
| Bindestrich `-` als Gedankenstrich | Halbgeviertstrich `—` (Hausstil) |

```ts
    {
      title: "Deine Sterne",
      body: "Wenn deine Werte ein Kompass sind, der dir zeigt, in welche Himmelsrichtung du gehen sollst, dann sind deine Wants wie die Sterne, die dir den Weg leuchten. Es sind die Dinge und Aktivitäten, die dir echte Freude bringen, die dich die Zeit vergessen lassen, und dich zurück ins Lot bringen, wenn du mal einen schlechten Tag hattest. Mit anderen Worten, es sind die Dinge, die dir ein gutes Gefühl geben, das Gefühl, das Richtige für uns zu tun und das gibt uns automatisch mehr Selbstbewusstsein. Daher ist es essenziell zu wissen, nach welchen Sternen wir greifen wollen — losgelöst davon, was andere für die richtigen Sterne für uns halten. Die gute Nachricht: Deine echten Sterne sind längst da. Sie liegen nur unter dem Berg an Erwartungen begraben, den die Welt auf dir abgeladen hat. Wir müssen uns bloß auf Sternensuche begeben.",
    },
```

- [ ] **Step 3: Karte 3 — Body neu (die zwei Fragen explizit nummeriert)**

Der Titel „Die Sternensuche: zwei ehrliche Fragen" bleibt.

Korrekturen gegenüber der `.md`:

| `.md` | übernommen als |
|---|---|
| stellen wir zwei uns bei der Sternensuche-Übung zwei scheinbar gegensätzliche | stellen wir uns bei der Sternensuche zwei scheinbar gegensätzliche |
| Was bringt in Flow? | Was bringt dich in Flow? |
| in eine Zustand des Flows | in einen Zustand des Flows |
| bis spät in die Nach | bis spät in die Nacht |
| Bindestrich `-` als Gedankenstrich (vor „das ist dir vermutlich wirklich wichtig") | Halbgeviertstrich `—` |

Der letzte Eintrag ist nicht in der Spec-Tabelle aufgeführt, folgt aber derselben Hausstil-Regel wie bei Karte 2 und wird deshalb mit übernommen. Wenn das bei der Durchsicht nicht gewollt ist, hier den `-` stehen lassen — sonst nichts ändern.

```ts
    {
      title: "Die Sternensuche: zwei ehrliche Fragen",
      body: "Statt der langweiligen Frage „Was magst du denn so?" stellen wir uns bei der Sternensuche zwei scheinbar gegensätzliche, aber sehr aufschlussreiche Fragen: 1. Wofür nimmst du freiwillig Mühsal in Kauf? Und 2. Was bringt dich in Flow? Bei welchen Aktivitäten vergisst du die Zeit, blendest die Welt aus und gehst ganz in dem auf, was du tust? Deine Antworten auf diese zwei Fragen verraten mehr über deine echten Sterne als jede Grübelnacht. Denn was dich in einen Zustand des Flows versetzt oder wofür du bereit bist freiwillig zu leiden, sei es in Form von Aufopferung deines Schlafes, um bis spät in die Nacht an einem persönlichen Projekt weiterzuarbeiten oder beim Pushen deiner Limits auf dem Rennrad — das ist dir vermutlich wirklich wichtig.",
    },
```

- [ ] **Step 4: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler.

Gegenprüfen, dass keine der korrigierten Fehlformen überlebt hat:

Run: `grep -n "interessanter Weise\|essenziel \|ein schlechten Tag\|in eine Zustand\|in die Nach \|Was bringt in Flow\|Dein Kompass und deine Sterne" lib/utils/recipe-intros.ts`
Expected: kein Treffer.

- [ ] **Step 5: Prüfen und committen**

`/me/wants` öffnen, Info-Icon antippen, durch alle vier Karten blättern: Karte 2 heißt „Deine Sterne", die Fragen auf Karte 3 sind nummeriert, Karte 1 endet mit der Ziele-Frage. Die Karten sind länger als zuvor — prüfen, dass keine über den Screen läuft, ohne scrollbar zu sein.

```bash
git add lib/utils/recipe-intros.ts
git commit -m "copy(intros): Wants-Karten 1-3 in der redigierten Fassung

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 3: „Vorschlag generieren" → „Recht generieren" vereinheitlichen

Der Edit deckt eine echte Inkonsistenz auf: Der Einstiegs-Button auf /me/bill-of-rights heißt bereits „Recht generieren" ([`bill-of-rights-me.tsx:326`](<../../../app/(app)/me/bill-of-rights/bill-of-rights-me.tsx>)), die Zielseite dahinter aber „Vorschlag generieren". Vereinheitlicht wird auf **„Recht generieren"** — der Button, den man tippt, heißt so, und das Ergebnis ist ein Recht, kein Vorschlag.

| Ort | heute | neu |
|---|---|---|
| `recipe-intros.ts` Karte 4, Titel + Body | Vorschlag generieren | Recht generieren |
| `bill-of-rights/generate/page.tsx:124` (Sub-Page-Titel) | Vorschlag generieren | Recht generieren |
| `bill-of-rights/generate/page.tsx:162` (Submit-Button) | Vorschlag generieren | Recht generieren |
| `bill-of-rights-intro-mascot.tsx:11` (Kommentar) | Vorschlag generieren | Recht generieren |
| `bill-of-rights-me.tsx:326` (Einstiegs-Button) | Recht generieren | unverändert |

**Files:**
- Modify: `lib/utils/recipe-intros.ts:64-65`
- Modify: `app/(app)/me/bill-of-rights/generate/page.tsx:124,162`
- Modify: `components/recipes/bill-of-rights-intro-mascot.tsx:11`

**Interfaces:**
- Consumes: nichts.
- Produces: nichts.

- [ ] **Step 1: Intro-Karte 4 — Titel und Body**

```ts
    {
      title: "Recht generieren - Wie du deine Regeln entdeckst",
      body: "Am Ende Deiner bill of rights findest du die „Recht generieren"-Funktion: eine Hilfe, mit der du in Ruhe Situationen reflektierst, in denen du einen inneren Konflikt gespürt hast. Denn die Regeln, nach denen du leben willst, zeigen sich häufig genau in solchen Konflikt-Momenten. Stell dir vor: Dein Manager fragt dich kurz vor Feierabend, ob du noch eine extra Aufgabe erledigen kannst, die heute fertig werden muss — und du haderst, schon in deinen Laufschuhen vor dem Laptop sitzend, ob du Ja oder Nein sagst. Auf Basis dieser Situationsbeschreibung helfe ich dir dann, herauszufinden welche zwei inneren Regeln in diesem Moment gegeneinander kämpfen, z.B.: „Stell deinen Chef immer zufrieden." gegen „Ich habe das Recht, meiner Freizeit dieselbe Wichtigkeit zuzumessen wie meiner Arbeit — und nach Feierabend meine persönlichen Ziele wie eine bessere Fitness zu priorisieren." Und dann stell ich dir die Frage: Nach welcher Regel willst du leben? Und du entscheidest. Bist du dabei?",
    },
```

Der Bindestrich im Titel („Recht generieren - Wie du deine Regeln entdeckst") bleibt wie im Bestand — das ist keine der Änderungen dieser Runde.

- [ ] **Step 2: Sub-Page-Titel und Submit-Button**

In `app/(app)/me/bill-of-rights/generate/page.tsx`:

Zeile 124: `title="Vorschlag generieren"` → `title="Recht generieren"`

Zeile 162: `{loading ? "Wird erstellt …" : "Vorschlag generieren"}` → `{loading ? "Wird erstellt …" : "Recht generieren"}`

- [ ] **Step 3: Kommentar im Intro-Maskottchen nachziehen**

In `components/recipes/bill-of-rights-intro-mascot.tsx:11` den Kommentar von „(Karte 3, „Vorschlag generieren")" auf „(Karte 3, „Recht generieren")" ändern, damit der Kommentar nicht auf einen Begriff zeigt, den es nicht mehr gibt.

- [ ] **Step 4: Gates laufen lassen und gegenprüfen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler.

Run: `grep -rn "Vorschlag generieren" --include=*.ts --include=*.tsx app components lib`
Expected: kein Treffer.

- [ ] **Step 5: Prüfen und committen**

`/me/bill-of-rights` öffnen: Der Einstiegs-Button heißt „Recht generieren"; die Zielseite dahinter trägt denselben Titel im Header und auf dem Submit-Button. Das Intro-Overlay (Info-Icon), Karte 4, spricht ebenfalls von „Recht generieren".

```bash
git add lib/utils/recipe-intros.ts "app/(app)/me/bill-of-rights/generate/page.tsx" components/recipes/bill-of-rights-intro-mascot.tsx
git commit -m "copy(bill-of-rights): Begriff auf Recht generieren vereinheitlicht

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 4: `INTROS_REVIEW.md` aufräumen

Die Review-Datei wird gelöscht, sobald die Änderungen im Code stehen und die Gates grün sind.

**Files:**
- Delete: `INTROS_REVIEW.md`

**Interfaces:**
- Consumes: nichts.
- Produces: nichts.

- [ ] **Step 1: Prüfen, dass alle acht inhaltlichen Änderungen im Code stehen**

Bevor die Quelle verschwindet, einmal gegenlesen — je ein `grep` pro Änderung:

Run:
```bash
grep -c "was ihre Werte eigentlich sind" lib/utils/recipe-intros.ts
grep -c "In dieser Übung findest du deine Werte" lib/utils/recipe-intros.ts
grep -c "jagst du dann wirklich deine eigenen Ziele" lib/utils/recipe-intros.ts
grep -c "Deine Sterne" lib/utils/recipe-intros.ts
grep -c "Was bringt dich in Flow" lib/utils/recipe-intros.ts
grep -c "Falls das auf dich zutreffen sollte" lib/utils/recipe-intros.ts
grep -c "dein neuer Filter" lib/utils/recipe-intros.ts
grep -c "Recht generieren" lib/utils/recipe-intros.ts
```
Expected: jede Zeile ≥ 1.

- [ ] **Step 2: Gates ein letztes Mal laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler.

- [ ] **Step 3: Datei löschen und committen**

```bash
git rm INTROS_REVIEW.md
git commit -m "chore: INTROS_REVIEW.md entfernt, Aenderungen stehen im Code

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```
