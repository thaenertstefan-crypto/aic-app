# Phase 11 — App-Überarbeitung

> **Ziel:** Bugfixes, vollständige Navigation-Neustrukturierung (Dashboard · Me · Kopf-Apotheke · Journal · Einstellungen), überarbeitete Self-Knowledge-Flows für Werte und Bill of Rights, Mascot-geführtes Onboarding (erweitertes Formular), täglicher Bill-of-Rights-Reminder, Kopf-Apotheke-Hub, verselbständigte „Things Got Messy"-Übung und freier Journaleintrag.
>
> **Voraussetzung:** Phasen 0–10 abgeschlossen. `components/brand/mascot.tsx` und der Peek-Companion vorhanden. Bestehende Routen `/recipes` und `/cleansers` bleiben erreichbar (kein harter Redirect).
>
> **Arbeitsweise:** Sequenzielle Schritte, je ein Commit + `npm run build`-Gate. Bugs zuerst, dann Strukturänderungen, dann neue Features.

---

## ⚠️ Wichtige Code-Realitäten (vor dem Loslegen lesen)

Diese Punkte wurden direkt gegen die Codebase geprüft. Sie überschreiben jede abweichende Annahme:

1. **Dashboard liegt auf `/dashboard`, NICHT auf `/`.** `/` ist die öffentliche Landingpage (`app/page.tsx`). Die Bottom-Nav verlinkt korrekt auf `/dashboard`. Nie auf `/` umstellen.
2. **`bill_of_rights` ist EINE Zeile pro User mit einer JSONB-Spalte `rights` vom Typ `{ id, text, active }[]`** — nicht eine Zeile pro Recht. „Ein Recht hinzufügen" = bestehendes Array laden, Element anhängen, das **komplette Array** per `saveRightsAction` (existiert in `recipes/bill-of-rights/actions.ts`) zurückschreiben. Niemals eine neue Zeile inserten. „Anzahl der Rechte" = `rights.filter(r => r.active).length`.
3. **Onboarding ist bereits serverseitig gegated:** `app/(app)/layout.tsx` prüft `profiles.onboarding_completed` und leitet auf `/onboarding` um. Das neue Onboarding ist daher eine **Erweiterung von `app/onboarding/page.tsx`** plus Anpassung von `completeOnboardingAction` — kein neuer „Post-Signup-Flow", keine neue Wrapper-Komponente, kein zweites Gate.
4. **`journal_entries` hat KEINE `title`-Spalte.** Felder: `recipe_slug` (nullable), `template_type`, `entry_date`, `content` (JSONB), `ai_insights` (nullable, existiert!), `created_at`. Titel eines freien Eintrags wandert in `content` (z. B. `{ title, body }`).
5. **Die Werte-Bank (`lib/utils/values-bank.ts`) hat aktuell 81 Werte**, `getValueLabel` gibt bei unbekannter ID die ID unverändert zurück (Legacy-Fallback). Custom-Werte existieren als `"custom:<text>"`.
6. **„Things Got Messy" ist heute mit Bill of Rights verdrahtet** an vier Stellen: Route unter `/recipes/bill-of-rights/messy`, CTA im BoR-Rezept (`bill-of-rights/page.tsx` ~Z. 637–649), Storage `recipe_slug='bill-of-rights'` + `template_type='messy_moment'`, und `saveMessyMomentAction` markiert BoR-Progress als `in_progress`. Alle vier werden in 11.9 entkoppelt.
7. **Statuswerte** in `user_recipe_progress.status`: `not_started` | `in_progress` | `completed`.

---

## 🟦 Entscheidungspunkte — beide entschieden ✓

| ID  | Betrifft | Entscheidung |
|-----|----------|--------------|
| D1 ✓ | 11.14   | **Auswählbare Werte auf 30 reduzieren.** Konkrete kuratierte Liste + Emoji-/Beschreibungs-Mappings sind in 11.14 Teil A ausformuliert. Volle `VALUES_BANK` (81) bleibt für Label-Auflösung bestehender/Custom-Daten erhalten; neue Konstante `SELECTABLE_VALUES` (30) steuert den Picker. |
| D2 ✓ | 11.9 A  | **Storage migrieren.** Neue Einträge mit `recipe_slug='things-got-messy'`; bestehende Zeilen per einmaligem manuellem SQL umstellen (siehe 11.9 A). |

---

## Priorisierungs-Übersicht

| #     | Schritt                                               | Typ            | Dringlichkeit |
|-------|-------------------------------------------------------|----------------|---------------|
| 11.1  | Dashboard: Crossfade-Bug beim Mood-Wechsel            | 🐛 Bug          | **Kritisch**  |
| 11.2  | „Worum geht's"-Kachel: Layout-Fix (Collapsed)         | 🐛 Bug          | Hoch          |
| 11.3  | Overthinking: „Worum geht's" nur in Schritt 1         | 🐛 Bug          | Hoch          |
| 11.4  | Overthinking: Mascot-Position Schritte 2–5            | 🐛 Bug          | Hoch          |
| 11.5  | Overthinking Step 1: Anweisung vereinfachen           | 🐛 Bug          | Mittel        |
| 11.6  | → **aufgegangen in 11.15** (Onboarding-Zentrierung)   | —              | —             |
| 11.7  | Bottom Nav: Neustrukturierung                         | 🏗 Struktur     | **Hoch**      |
| 11.8  | Dashboard: Streaks entfernen                          | 📊 Layout       | Mittel        |
| 11.9  | Things Got Messy verselbständigen + Kopf-Apotheke-Hub | 🏗 Struktur     | **Hoch**      |
| 11.10 | Journal: Freier Eintrag                               | ✨ Feature      | Mittel        |
| 11.11 | Täglicher BoR-Reminder (Interstitial)                 | ✨ Feature      | Mittel        |
| 11.12 | „Me"-Seite: Profil + 3 Blöcke (ersetzt /profile)      | 🏗 Struktur     | **Hoch**      |
| 11.13 | Bill of Rights: Neuer Flow von Me-Seite               | ✨ Feature      | **Hoch**      |
| 11.14 | Values: Neuer Flow + Pfad-Visualisierung              | ✨ Feature      | **Hoch**      |
| 11.15 | Onboarding: Mascot-geführtes erweitertes Formular     | ✨ Feature      | **Hoch**      |
| 11.16 | Einstellungen-Seite (Logout + Profil-Stats) + Redirect| 🏗 Struktur     | **Hoch**      |

### Empfohlene Ausführungsreihenfolge

```
11.1 → 11.2 → 11.3 → 11.4 → 11.5          ← Bugs zuerst (unabhängig voneinander)
→ 11.7                                       ← Nav-Gerüst (Voraussetzung für alles Strukturelle)
→ 11.8                                       ← Dashboard-Cleanup (eigenständig)
→ 11.9                                       ← Things Got Messy entkoppeln + Kopf-Apotheke-Hub
→ 11.10                                      ← Journal Free Entry
→ 11.11                                      ← Daily Reminder (eigenständig)
→ 11.12                                      ← Me-Seite (ersetzt /profile; Voraussetzung für 11.13 + 11.14)
→ 11.16                                      ← Einstellungen (übernimmt Logout + Stats, danach /profile-Redirect)
→ 11.13 → 11.14                             ← Self-Knowledge-Flows (bauen auf Me-Seite auf)
→ 11.15                                      ← Onboarding (zum Schluss, baut auf Mascot + Kopf-Apotheke-Texten auf)
```

> **Hinweis zu 11.16-Timing:** 11.16 (Logout nach /settings) muss **vor** dem finalen Entfernen/Redirect von `/profile` laufen, damit nie eine Lücke entsteht, in der man sich nicht abmelden kann. Reihenfolge oben hält das ein.
>
> **Pfad-Design (Teil B) ist final entschieden:** Aufbauender Kompass (9 Deltas) + mitwanderndes Maskottchen (Option C). Der interaktive Prototyp wurde in Claude.ai abgenommen. Claude Code setzt direkt um.

---

## Schritt 11.1 — Dashboard: Crossfade-Bug beim Mood-Wechsel 🐛

> Beim Wechsel der Stimmungsantwort wirkt der Übergang des dynamischen Contents (Frage + Empfehlung) unsauber — alter und neuer Zustand scheinen sich kurz zu überlagern.

> **Diagnose-Hinweis:** Die zuständige Komponente ist `components/dashboard/crossfade.tsx` (keyed per `tier`), **plus** `components/dashboard/focus-question.tsx`, die eine **eigene** Fade-Logik hat. `crossfade.tsx` blendet bereits sequenziell über eine einzelne Opacity-Box (es liegen nie zwei DOM-Knoten gleichzeitig sichtbar übereinander). Das wahrgenommene Überlappen kommt daher höchstwahrscheinlich aus der **Desynchronisation dieser beiden Fader** oder einem Frame-Timing-Problem (Fade-in startet, bevor der Fade-out gepaintet wurde) — nicht daraus, dass „simultan" überblendet wird. Bitte zuerst diagnostizieren, dann fixen.

### Claude Code Prompt

```
Im Dashboard wirkt der Übergang beim Ändern der Stimmungsantwort unsauber.

Sieh dir ZWEI Dateien an:
- components/dashboard/crossfade.tsx (überblendet den Content-Block, token = tier)
- components/dashboard/focus-question.tsx (hat eine eigene Fade-Logik für die Frage)

Ziel: Beim Mood-Wechsel soll der alte Content vollständig ausblenden, BEVOR der
neue einblendet — und beide Fader (Crossfade-Box und Frage) sollen synchron
laufen, nicht zeitversetzt.

Vorgehen:
1. Reproduziere und identifiziere, WO die Überlappung entsteht (zwei separate
   Fade-Timings? Fade-in startet eine Frame zu früh, weil Effect 2 am
   shown.token hängt?).
2. Stelle sicher: zu keinem Zeitpunkt sind alter UND neuer Zustand gleichzeitig
   mit opacity > 0 sichtbar. Out (≈250ms) → Swap → In (≈250ms).
3. Synchronisiere focus-question.tsx mit demselben Timing/Token, damit Frage
   und Empfehlung gemeinsam wechseln.

prefers-reduced-motion: direkter Wechsel ohne Übergang (useReducedMotion Hook —
ist in beiden Komponenten bereits importiert).

Halte die bestehende Architektur (single-container opacity swap) bei; baue keinen
zweiten Renderpfad neu.
```

### Manuell — danach prüfen

1. `npm run dev` → Dashboard öffnen
2. Daily Check-in auf verschiedene Stimmungen tippen
3. Content wechselt sauber: erst verschwindet der alte komplett, dann erscheint der neue — kein Überlappen, Frage und Empfehlung synchron
4. DevTools → `prefers-reduced-motion: reduce` → direkter Wechsel ohne Animation

---

## Schritt 11.2 — „Worum geht's"-Kachel: Layout-Fix 🐛

> Im zugeklappten Zustand wirkt die obere Hälfte der „Worum geht's"-Kachel größer als die untere. Aufgeklappt ist das Layout korrekt. Betrifft alle Rezepte.

> **Hinweis:** Die Komponente ist `components/recipes/recipe-intro-collapsible.tsx`. Vermuteter Auslöser: `CardContent` trägt `pt-(--card-spacing)` **zusätzlich** zum eigenen vertikalen Padding der Card — dadurch ist oben mehr Luft als unten.

### Claude Code Prompt

```
Komponente: components/recipes/recipe-intro-collapsible.tsx

Im zugeklappten Zustand (open === false) wirkt die obere Hälfte höher als die
untere. Prüfe konkret:
- CardContent hat className="pt-(--card-spacing)" — kommt dadurch oben Padding
  doppelt (Card-eigenes Padding + pt-utility) zustande?
- Erzeugt das Info-Icon oder das Chevron zusätzliche Höhe oben?

Passe das Spacing im collapsed-State so an, dass obere und untere Hälfte optisch
symmetrisch wirken. Den aufgeklappten Zustand (open === true) nicht verändern.
```

### Manuell — danach prüfen

1. Values, Bill of Rights und Overthinking öffnen
2. „Worum geht's"-Kachel zugeklappt: obere und untere Hälfte wirken gleich groß ✓
3. Aufklappen → Layout unverändert korrekt ✓

---

## Schritt 11.3 — Overthinking: „Worum geht's" nur in Schritt 1 🐛

> Die `RecipeIntroCollapsible` („Worum geht's") wird im Overthinking-Wizard aktuell **über allen Schritten** gerendert (unbedingt, oberhalb der Progress-Dots). Sie soll nur in Schritt 1 sichtbar sein.

### Claude Code Prompt

```
Datei: app/(app)/recipes/overthinking/overthinking-wizard.tsx

Aktuell wird die RecipeIntroCollapsible unbedingt gerendert:

  {INTRO_CARDS.length > 0 && (
    <div className="mb-6">
      <RecipeIntroCollapsible cards={INTRO_CARDS} />
    </div>
  )}

Ändere die Bedingung so, dass dieser Block nur gerendert wird, wenn step === 1.
In allen anderen Schritten (2–8) wird er nicht gerendert. Inhalt und Optik der
Kachel selbst bleiben unverändert.
```

### Manuell — danach prüfen

1. Overthinking-Wizard starten
2. Schritt 1: „Worum geht's" sichtbar ✓
3. Schritte 2–8: kein „Worum geht's" ✓

---

## Schritt 11.4 — Overthinking: Mascot-Position Schritte 2–5 🐛

> Der `OverthinkingPeekCompanion` sitzt in Schritten 2–5 aktuell `fixed right-0 bottom-…` (unten rechts) und verdeckt Weiter-Button und Textbox. Er soll rechtsseitig auf Höhe der Schritt-Überschrift sitzen und nach links-unten (Richtung Textbox) schauen.

> **Achtung:** Das aktuelle Element ist `fixed` positioniert (scrollt also nicht mit). „Auf Höhe der Überschrift" lässt sich sauberer über eine **`absolute` Positionierung relativ zum Karten-/Content-Container** lösen statt über `fixed bottom`. Vor dem Setzen von Blickrichtung prüfen, ob `OverthinkingPeekCompanion` überhaupt `gazeX/gazeY`-Props (bzw. die zugrunde liegende Mascot-Komponente) annimmt.

### Claude Code Prompt

```
Datei: app/(app)/recipes/overthinking/overthinking-wizard.tsx
Companion-Komponente: components/recipes/overthinking-companion.tsx

In Schritten 2–5 wird gerendert:
  {step >= 2 && step <= 5 && (
    <OverthinkingPeekCompanion className="... fixed right-0 bottom-[...] ..." />
  )}

Ändere die Positionierung für Schritte 2–5:

1. POSITION: rechts am Content-Rand, vertikal auf Höhe der Schritt-Überschrift
   (STEP_HEADERS[step]). Nutze absolute Positionierung relativ zu einem
   passenden, position:relative-Container statt fixed bottom-0. Der Mascot darf
   nicht mehr am unteren Rand kleben.
2. BLICKRICHTUNG: nach links-unten (Richtung Eingabefeld). Prüfe zuerst die
   verfügbaren Props von OverthinkingPeekCompanion / der Mascot-Komponente
   (z.B. gazeX, gazeY) und setze sie entsprechend. Falls keine Gaze-Props
   existieren: nur Position fixen, Blickrichtung als TODO notieren.
3. SICHTBARKEIT: Weiter-Button und Textbox müssen zu jeder Zeit vollständig
   unverdeckt bleiben.

Schritt 1 (Countdown, kein Companion) und Schritte 6–8 (zentrierter
OverthinkingCompanion, size="md") bleiben unverändert.

prefers-reduced-motion beachten, falls der Companion animiert ist.
```

### Manuell — danach prüfen

1. Schritte 2–5 durchlaufen
2. Mascot sitzt rechts auf Höhe der Überschrift — kein Überlappen mit Button oder Textbox ✓
3. Mascot schaut nach links-unten (falls Gaze-Props vorhanden) ✓
4. Schritt 1 und Schritte 6–8 unverändert ✓

---

## Schritt 11.5 — Overthinking Step 1: Anweisung vereinfachen 🐛

> Schritt 1 bietet aktuell zwei Optionen (`Sag laut "Stop!" oder zähl rückwärts von 5`). Die Anweisung soll zu einer sequenziellen Handlung werden.

### Claude Code Prompt

```
Datei: app/(app)/recipes/overthinking/overthinking-wizard.tsx, renderStepContent() case 1.

Aktueller Text:
  Sag laut "Stop!" oder zähl rückwärts von 5

Ändere ihn zu:
  Zähle von 5 runter und sage dann laut Stopp.

Die "oder"-Formulierung verschwindet. Es gibt eine CountdownCircle-Komponente in
diesem Schritt.

OPTIONAL (nur falls schnell machbar, sonst als TODO notieren): Wenn die
CountdownCircle eine sichtbare Zahlenfolge zeigt, soll nach dem Durchlauf
(5→4→3→2→1) ein "STOPP"-Endzustand erscheinen. Falls die CountdownCircle das
nicht ohne größeren Umbau hergibt, NUR den Text ändern und den Endzustand als
TODO für später vermerken — diesen Schritt nicht aufblähen.

Timing, "Start"-Logik und die Begleittexte (countdownDone) ansonsten nicht ändern.
```

### Manuell — danach prüfen

1. Overthinking Step 1 öffnen
2. Anweisung liest sich als Sequenz: zählen → dann Stopp ✓
3. Kein „oder" mehr sichtbar ✓
4. (Optional) Countdown endet mit „STOPP" ✓

---

## Schritt 11.6 — entfällt

> Die ursprünglich geplante Onboarding-Zentrierung auf Mobile ist **in 11.15 aufgegangen.** Grund: Das Onboarding wird in 11.15 ohnehin als Formular überarbeitet; die vertikale Zentrierung der Karte auf Mobile ist dort Teil der Akzeptanzkriterien. Nummer bleibt belegt, um die Referenzen stabil zu halten.

---

## Schritt 11.7 — Bottom Nav: Neustrukturierung 🏗

> Die aktuelle Navigation (Dashboard · Rezepte · Journal · Cleanser · Profil) wird durch fünf neue Punkte ersetzt: Dashboard · Me · Kopf-Apotheke · Journal · Einstellungen.

### Claude Code Prompt

```
Datei der Bottom-Nav: components/layout/bottom-nav.tsx (das navItems-Array).

Neue Reihenfolge von links nach rechts (Routen unbedingt exakt so!):
1. Dashboard     → /dashboard   (bestehende Route, NICHT "/"!)
2. Me            → /me          (neue Route, ersetzt /profile)
3. Kopf-Apotheke → /booster     (neue Route; interne Route bleibt /booster)
4. Journal       → /journal     (bestehende Route, unverändert)
5. Einstellungen → /settings    (neue Route)

Icons (lucide-react):
- Dashboard:      Home (wie bisher)
- Me:             User oder CircleUser
- Kopf-Apotheke:  FlaskConical oder Pill
- Journal:        NotebookPen (wie bisher)
- Einstellungen:  Settings2

WICHTIG — Zentrales Label-System:
Erstelle zuerst lib/content/labels.ts:

  export const NAV_LABELS = {
    dashboard: 'Home',
    me:        'Me',
    booster:   'Apotheke',        // gekürztes Nav-Label für Kopf-Apotheke
    journal:   'Journal',
    settings:  'Einstellungen',
  } as const

  export const PAGE_TITLES = {
    booster:         'Kopf-Apotheke',
    thingsGotMessy:  'Things Got Messy',   // wird in 11.9 genutzt
  } as const

Nutze NAV_LABELS für Nav-Labels, PAGE_TITLES für Seitentitel. Niemals "Booster",
"Kopf-Apotheke" oder "Things Got Messy" irgendwo hardcoden.

Vorgehen:
1. lib/content/labels.ts anlegen (wie oben).
2. bottom-nav.tsx: navItems-Array auf die fünf neuen Punkte umstellen, Labels aus
   NAV_LABELS importieren. Active-State-Logik (activeIndex via pathname) bleibt.
3. Placeholder-Pages erstellen (werden in späteren Schritten ersetzt):
   - app/(app)/me/page.tsx        → "Kommt gleich"-Placeholder
   - app/(app)/booster/page.tsx   → "Kommt gleich"-Placeholder (Titel: PAGE_TITLES.booster)
   - app/(app)/settings/page.tsx  → "Kommt gleich"-Placeholder (Titel: NAV_LABELS.settings)
   Jede nutzt das bestehende Design-System (Card, Heading-Font) + Seitentitel + Hinweistext.
4. /recipes und /cleansers bleiben erreichbar — kein Redirect, nur nicht mehr in der Nav.
5. /profile bleibt vorerst erreichbar (Logout!) — wird erst in 11.16 abgelöst.
```

### Manuell — danach prüfen

1. `npm run build` → fehlerfrei
2. App öffnen → 5 Nav-Punkte in korrekter Reihenfolge
3. Dritter Punkt: Label „Apotheke" mit Pill/Flask-Icon
4. Alle fünf Punkte tippbar, navigieren korrekt, Active-State funktioniert
5. /booster-Placeholder zeigt Titel „Kopf-Apotheke"
6. /dashboard und /journal funktionieren unverändert
7. /profile ist (noch) erreichbar

---

## Schritt 11.8 — Dashboard: Streaks entfernen 📊

> Der Streak-Bereich im Dashboard wird entfernt. Mood Check-in, dynamischer Content, „Heutiges Recht" und alle anderen Karten bleiben.

> **Konkret:** In `app/(app)/dashboard/page.tsx` ist das der `<div className="grid grid-cols-3 gap-3">`-Block mit drei `StatCard`s (Tagebuch / Versprechen / Mantra). Mit dem Entfernen werden auch obsolet: der `computeStreak`-Import, die Variablen `journalStreak/promiseStreak/mantraStreak` und die zugehörigen Supabase-Queries (`journalEntries`, `promiseRows`, `mantraCheckins`).

### Claude Code Prompt

```
Datei: app/(app)/dashboard/page.tsx

Entferne den Streak-Bereich vollständig:
1. Den <div className="grid grid-cols-3 gap-3"> mit den drei StatCards entfernen.
2. Nicht mehr benötigte Berechnungen entfernen: journalStreak, promiseStreak,
   mantraStreak sowie die ausschließlich dafür genutzten Queries (journalEntries,
   promiseRows, mantraCheckins) und den computeStreak-Import — ABER nur, wenn sie
   wirklich nirgends sonst im File verwendet werden (vorher prüfen).
3. StatCard-Import entfernen, falls dadurch ungenutzt.
4. Layout-Abstände (space-y) prüfen, sodass kein leeres "Loch" entsteht.

NICHT anfassen:
- Mood Check-in ("Wie geht's dir?") + DashboardFocus
- "Heutiges Recht"-Karte
- Greeting/Header
```

### Manuell — danach prüfen

1. Dashboard öffnen → kein Streak-Element sichtbar ✓
2. Layout aufgeräumt, kein leerer Platzhalter ✓
3. Restliche Karten unverändert ✓
4. `npm run build` ohne „unused variable"-Fehler ✓

---

## Schritt 11.9 — Things Got Messy verselbständigen + Kopf-Apotheke-Hub 🏗

> Zwei zusammenhängende Teile: **A)** „Things Got Messy" wird eine eigenständige Übung, vollständig von Bill of Rights entkoppelt (Begriff „Things Got Messy" gilt überall). **B)** Die neue `/booster`-Seite („Kopf-Apotheke") aggregiert alle Ad-hoc-Übungen als Hub.

### Teil A — Things Got Messy entkoppeln

```
ZIEL: "Things Got Messy" ist eine eigenständige Übung, NICHT mehr mit dem
Bill-of-Rights-Rezept verlinkt. Der Begriff "Things Got Messy" gilt überall
(Seitentitel, Kachel, Journal-Label).

Heutige Kopplungen (alle lösen):

1. ROUTE VERSCHIEBEN:
   - Neue Route: app/(app)/booster/things-got-messy/page.tsx
   - Inhalt aus app/(app)/recipes/bill-of-rights/messy/page.tsx übernehmen.
   - SubPageHeader: title = PAGE_TITLES.thingsGotMessy ("Things Got Messy"),
     backHref = "/booster" (Kopf-Apotheke), NICHT mehr "/recipes/bill-of-rights".
   - Die alte Route /recipes/bill-of-rights/messy entfernen.

2. ACTIONS HERAUSLÖSEN:
   - getMessyMoments, saveMessyMomentAction und ihre Typen aus
     app/(app)/recipes/bill-of-rights/actions.ts in eine eigene Datei verschieben:
     app/(app)/booster/things-got-messy/actions.ts
   - Importe entsprechend anpassen.

3. CTA IM BoR-REZEPT ENTFERNEN:
   - In app/(app)/recipes/bill-of-rights/page.tsx den "Es ist mal wieder messy
     geworden?"-Block (~Z. 637–649, Link auf /recipes/bill-of-rights/messy)
     KOMPLETT entfernen. Das BoR-Rezept verweist danach nicht mehr auf Things Got Messy.

4. PROGRESS-KOPPLUNG ENTFERNEN:
   - In saveMessyMomentAction den Block entfernen, der user_recipe_progress für
     recipe_slug='bill-of-rights' auf in_progress setzt. Das Speichern einer
     Things-Got-Messy-Reflexion darf den Bill-of-Rights-Fortschritt NICHT mehr
     verändern.

5. STORAGE & JOURNAL (Entscheidung D2: migrieren):
   - In saveMessyMomentAction recipe_slug='things-got-messy' setzen (statt
     'bill-of-rights'). template_type bleibt 'messy_moment' (wichtig: der
     Detail-Formatter formatMessyMoment in lib/utils/journal.ts ist auf
     template_type gekeyed und funktioniert dadurch unverändert weiter).
   - getMessyMoments-Query auf recipe_slug='things-got-messy' umstellen.
   - lib/utils/journal.ts:
       * JOURNAL_TEMPLATE_MAP['messy_moment'].label von "Verletzte Gefühle"
         auf "Things Got Messy" (PAGE_TITLES.thingsGotMessy) ändern.
       * JOURNAL_TEMPLATE_MAP['messy_moment'].recipeSlug auf 'things-got-messy'
         ändern. (recipeSlug wird NUR fürs Journal-Filtern genutzt, baut keinen
         Rezept-Link — geprüft.)
       * NEUEN Filtertab in getFilterTabs() ergänzen, sonst tauchen Messy-
         Einträge nach der Migration nur noch unter "Alle" auf (sie matchen den
         "Bill of Rights"-Tab nicht mehr):
           { value: 'things-got-messy', label: 'Things Got Messy', icon: AlertTriangle }
   - MANUELLE SQL-MIGRATION bestehender Einträge (im Supabase-Dashboard ausführen):
       update journal_entries
       set recipe_slug = 'things-got-messy'
       where template_type = 'messy_moment' and recipe_slug = 'bill-of-rights';
```

### Teil B — Kopf-Apotheke-Hub

```
Erstelle app/(app)/booster/page.tsx (ersetzt den Placeholder aus 11.7).
Seitentitel: PAGE_TITLES.booster ("Kopf-Apotheke").

Konzept: Hub mit Kacheln — die persönliche Kopf-Apotheke für Momente, in denen
man kurz zu sich selbst zurückfinden will.

EINLEITUNG:
- Überschrift: PAGE_TITLES.booster
- Subtext: "Für Momente, in denen du kurz zu dir zurückfinden willst."

KACHELN (2-spaltig auf Mobile): Icon, Titel, 1-Zeilen-Beschreibung,
Status-Badge nur bei "Bald verfügbar".

1. Overthinking — Brain — "Gedankenspirale durchbrechen"
   → /recipes/overthinking
2. Things Got Messy — Flame oder AlertTriangle — "Wenn's chaotisch wird"
   → /booster/things-got-messy   (neue Route aus Teil A)
   Titel der Kachel: PAGE_TITLES.thingsGotMessy
3. Saying No — ShieldOff oder Hand — "Nein sagen ohne schlechtes Gewissen"
   → Status "Bald verfügbar" (nicht klickbar, opacity-60). Entspricht
     recipes.ts slug 'saying-no' (available: false).
4. Showstopper Confidence — Star oder Sparkles — "Selbstbewusstsein in 5 Minuten"
   → /cleansers/confidence
5. Mantra Cleanser — Quote oder MessageCircle — "Innere Kritik umschreiben"
   → /cleansers/mantra
6. Promise Keeper — CheckCircle2 — "Versprechen an dich selbst"
   → /cleansers/promises

Design: bestehende Card-Komponenten + Dusk-Tokens. Verfügbare Kacheln einladend,
"Bald verfügbar" klar abgesetzt, ohne deplaziert zu wirken.
```

### Manuell — danach prüfen

1. „Apotheke"-Tab → Seite mit Titel „Kopf-Apotheke", 6 Kacheln, 5 klickbar (nur Saying No Placeholder) ✓
2. Things Got Messy öffnet `/booster/things-got-messy`, Titel „Things Got Messy", Zurück → Kopf-Apotheke ✓
3. Im Bill-of-Rights-Rezept gibt es **keinen** „messy geworden?"-Verweis mehr ✓
4. Eine Things-Got-Messy-Reflexion speichern → Bill-of-Rights-Fortschritt bleibt unverändert ✓
5. Journal: der Eintrag erscheint mit Label „Things Got Messy" und ist über den neuen Filtertab „Things Got Messy" filterbar ✓
6. (Bei D2=Migrieren) Alte Messy-Einträge erscheinen weiterhin im Journal + in der Things-Got-Messy-Verlaufsliste ✓
7. Overthinking, Confidence, Mantra, Promises navigieren korrekt ✓

---

## Schritt 11.10 — Journal: Freier Eintrag ✨

> Neben den rezeptgebundenen Einträgen soll ein freier, rezeptunabhängiger Eintrag möglich sein.

> **Schema-Hinweis:** `journal_entries` hat **keine** `title`-Spalte. Titel + Text gehen gemeinsam in `content` (JSONB), z. B. `{ title, body }`. `template_type` ist ein String; für die Anzeige im `JournalHub` muss `'free'` zur Union `TemplateType` **und** zur `JOURNAL_TEMPLATE_MAP` ergänzt werden, sonst rendert der Hub nur generisch.

### Claude Code Prompt

```
1. lib/utils/journal.ts:
   - TemplateType-Union um 'free' erweitern.
   - JOURNAL_TEMPLATE_MAP['free'] hinzufügen:
       { icon: NotebookPen, label: "Freier Eintrag", recipeSlug: '' }
   - Sicherstellen, dass der Content-Parser (die ContentSection-Logik) einen
     freien Eintrag mit content = { title?, body } sinnvoll darstellt
     (mindestens body als Section).

2. Journal-Übersicht (app/(app)/journal/page.tsx bzw. components/journal/journal-hub.tsx):
   - Prominenter Button "Neuer Eintrag" mit Plus-Icon (Header-Bereich oder FAB).

3. Neue Route app/(app)/journal/new/page.tsx:
   - SubPageHeader "Neuer Eintrag", Zurück → /journal.
   - Optionales Titelfeld (Placeholder "Titel (optional)").
   - Großes Textarea (Placeholder "Was geht dir gerade durch den Kopf?",
     min-height ~200px, auto-grow).
   - Button "Eintrag speichern".

4. Server Action (neue Datei app/(app)/journal/actions.ts oder bestehende nutzen):
   - Insert in journal_entries:
       template_type = 'free', recipe_slug = null,
       content = { title: <optional>, body: <text> },
       entry_date = heutiges Datum (YYYY-MM-DD).
   - Danach Redirect zu /journal.

5. In der Übersicht: freie Einträge klar erkennbar (Label "Freier Eintrag"
   über JOURNAL_TEMPLATE_MAP).

Bestehende Einträge nicht verändern.
```

### Manuell — danach prüfen

1. Journal → „Neuer Eintrag"-Button sichtbar ✓
2. Antippen → Seite mit (optionalem) Titel + Textfeld ✓
3. Text schreiben, speichern → zurück zur Übersicht ✓
4. Neuer Eintrag mit „Freier Eintrag"-Kennzeichnung in der Liste ✓
5. Supabase: `template_type='free'`, `recipe_slug=null`, `content` enthält Text (+ ggf. Titel) ✓

---

## Schritt 11.11 — Täglicher Bill-of-Rights-Reminder (Interstitial) ✨

> Einmal pro Tag nach dem Login erscheint ein kurzer Interstitial-Screen mit einem zufälligen Bill-of-Rights-Eintrag (langsame Fade-Animation) — nur, wenn mindestens ein aktives Recht existiert.

> **Datenmodell-Hinweis:** „≥1 Eintrag" = die `bill_of_rights`-Zeile des Users existiert UND `rights.filter(r => r.active).length >= 1`. Das Dashboard liest dieses Array bereits (`activeRights`).
>
> **Platzierungs-Hinweis:** Es gibt keinen separaten „Post-Login-Flow"-Hook. Sauberster Weg: ein **Client-Overlay**, das auf dem Dashboard gemountet wird. Das Dashboard (Server Component) lädt die Rechte ohnehin — übergib ein `hasActiveRights`-Flag an das Overlay, das beim Mount localStorage prüft.

### Claude Code Prompt

```
Implementiere einen täglichen Interstitial-Screen als Client-Overlay auf dem
Dashboard, der einmal pro Tag erscheint, bevor das Dashboard sichtbar wird.

VORAUSSETZUNGEN (beide nötig, sonst übersprungen):
- hasActiveRights === true (mind. ein aktives Recht; vom Server übergeben)
- Heute noch nicht gezeigt (localStorage 'aic_reminder_date' != heutiges Datum)

TRACKING: localStorage-Key 'aic_reminder_date', Wert = new Date()
  .toISOString().slice(0,10). Vergleich gegen denselben String.

SCREEN:
- Vollbild-Overlay, Hintergrund --background
- Oben mittig: Label "Kurzer Reminder" (text-sm, --muted-foreground)
- Mitte: zufälliges aktives Recht groß (font-heading, text-2xl, text-center,
  max-w-sm mx-auto)
- Fade-Animation: Content blendet sehr langsam ein (3s, ease-in)
- Nach 5s ODER Tap anywhere → Overlay schließen (Dashboard sichtbar)
- "Weiter"-Button (variant="ghost") erscheint nach 2s

IMPLEMENTIERUNG:
1. components/daily-reminder/daily-reminder-screen.tsx (Client Component),
   Props: rights (aktive Rechte) — wählt clientseitig ein zufälliges aus.
2. In app/(app)/dashboard/page.tsx: hasActiveRights + aktive Rechte an das
   Overlay übergeben. Overlay rendert sich selbst nur, wenn Voraussetzungen
   erfüllt sind; sonst null.

prefers-reduced-motion: kein Fade, Text sofort sichtbar, Schließen nur per
"Weiter"/Tap.
```

### Manuell — danach prüfen

1. ≥1 aktives BoR-Recht vorhanden → einloggen → Reminder erscheint, Text blendet langsam ein ✓
2. Nach 5s oder Tap → Dashboard ✓
3. Gleiche Session nochmal öffnen → Reminder erscheint nicht nochmal ✓
4. localStorage leeren / anderen Tag simulieren → Reminder erscheint wieder ✓
5. Ohne aktive Rechte → Reminder wird übersprungen ✓
6. prefers-reduced-motion → kein Fade, „Weiter" nötig ✓

---

## Schritt 11.12 — „Me"-Seite: Profil + 3 Blöcke (ersetzt /profile) 🏗

> Die neue `/me`-Seite zeigt Profil-Identität + drei klickbare Self-Knowledge-Blöcke: Meine Werte, Meine Wants (Platzhalter), Meine Bill of Rights. Sie **ersetzt** die bisherige `/profile`-Seite (deren Stats + Logout wandern in 11.16 nach `/settings`).

> **Daten-Hinweise:** Werte-Anzahl kommt aus `values_hypothesis` (neueste Version, `values`-Array). BoR-Anzahl = `rights.filter(active).length` aus der einzelnen `bill_of_rights`-Zeile. Beide **dynamisch** anzeigen, nicht „5"/„3" hardcoden.

### Claude Code Prompt

```
Erstelle app/(app)/me/page.tsx (ersetzt den Placeholder aus 11.7) als Server Component.

LAYOUT von oben nach unten:

1. PROFIL-IDENTITÄT:
   - Avatar: Kreis (64px); ohne Bild → Initiale des Namens auf --primary.
   - Name (font-heading, text-xl) aus profiles.name
   - E-Mail (text-sm, --muted-foreground) aus user.email
   - Kein "Bearbeiten"-Button in Phase 11.

2. TRENNLINIE (--border)

3. DREI BLÖCKE als klickbare Cards mit ChevronRight:

   A — "Meine Werte":
     - Icon: Sparkles (--primary)
     - Subtitle dynamisch aus neuester values_hypothesis:
       `${values.length} Werte entdeckt` / "Noch keine Werte entdeckt"
     - → /me/values

   B — "Meine Wants":
     - Icon: Heart (--muted-foreground)
     - Subtitle: "Kommt bald"
     - opacity-50, NICHT klickbar (kein Link, kein ChevronRight)

   C — "Meine Bill of Rights":
     - Icon: ScrollText (--primary)
     - Subtitle dynamisch: aktive Rechte zählen
       (`${count} Rechte definiert` / "Noch keine Rechte definiert")
     - → /me/bill-of-rights

DATEN: Profil aus profiles, Werte-Count aus values_hypothesis (höchste version),
BoR-Count aus bill_of_rights.rights (filter active). Bestehende Supabase-Server-
Helper nutzen.

HINWEIS: /me ersetzt /profile inhaltlich. Stats + Logout NICHT hierher — die
kommen in 11.16 nach /settings.
```

### Manuell — danach prüfen

1. „Me"-Tab → Me-Seite öffnet sich ✓
2. Avatar/Initiale, Name, E-Mail korrekt ✓
3. Drei Blöcke; Block B ausgegraut + nicht klickbar ✓
4. A und C navigieren zu /me/values bzw. /me/bill-of-rights ✓
5. Werte- und BoR-Anzahl stimmen dynamisch mit Supabase überein ✓

---

## Schritt 11.13 — Bill of Rights: Neuer Flow von Me-Seite ✨

> Bill of Rights ist neu von der Me-Seite erreichbar: Listenansicht, manuelle Eingabe und KI-gestützter Vorschlag mit automatischer Journal-Speicherung.

> **🔴 Datenmodell — kritisch:** `bill_of_rights` ist EINE Zeile pro User mit JSONB-Array `rights: { id, text, active }[]`. „Hinzufügen" = Array laden → Element `{ id: <uuid/slug>, text, active: true }` anhängen → **komplettes Array** per bestehender `saveRightsAction` (nimmt das volle Array als JSON-String) zurückschreiben. **Niemals eine neue Tabellenzeile inserten.** Bearbeiten/Löschen = Array-Element ändern/entfernen → ganzes Array zurückschreiben. Die Editier-UI existiert bereits im alten BoR-Rezept (`bill-of-rights/page.tsx`) — wiederverwenden.

> **Dieser Schritt ist aufwändig — drei Teile, je ein Commit.**

### Teil A — Listenansicht `/me/bill-of-rights`

```
Erstelle app/(app)/me/bill-of-rights/page.tsx.

LAYOUT:
1. SubPageHeader "Meine Bill of Rights", Zurück → /me.
2. LISTE der aktiven Rechte aus bill_of_rights.rights.
   Leerer State: Text "Du hast noch keine Rechte definiert." +
   CTA "Dein erstes Recht hinzufügen".
3. Jedes Recht als Card mit Edit/Delete. Edit/Delete mutieren das Array und
   schreiben es per saveRightsAction zurück (Logik aus dem alten BoR-Flow
   wiederverwenden — dort existiert bereits ein Rights-Editor).
4. IMMER SICHTBAR unten — zwei Kacheln nebeneinander:
   - "Manuell hinzufügen"  (PenLine)  → /me/bill-of-rights/add
   - "Vorschlag generieren" (Sparkles) → /me/bill-of-rights/generate
5. INTRO-SEQUENZ: Falls intro_seen für 'bill-of-rights' false ist, zuerst die
   RecipeIntro-Sequenz zeigen (bestehende RecipeIntro-Komponente + bestehende
   Intro-Cards via getRecipeIntro('bill-of-rights')), danach erst diese Seite.
   intro_seen nach Abschluss via markRecipeIntroSeenAction setzen.
```

### Teil B — Manuelle Eingabe `/me/bill-of-rights/add`

```
Erstelle app/(app)/me/bill-of-rights/add/page.tsx.

1. SubPageHeader "Recht hinzufügen", Zurück → /me/bill-of-rights.
2. Textarea, Placeholder "Ich habe das Recht zu...".
3. Button "Hinzufügen".

Beim Speichern (Server Action):
- Bestehendes rights-Array des Users laden.
- Neues Element { id: crypto.randomUUID(), text: <eingabe>, active: true } anhängen.
- KOMPLETTES Array per saveRightsAction (bzw. derselben Upsert-Logik) speichern.
- Redirect → /me/bill-of-rights.
```

### Teil C — KI-Vorschlag `/me/bill-of-rights/generate`

```
Erstelle app/(app)/me/bill-of-rights/generate/page.tsx (State-basierter
Zwei-Phasen-Screen).

PHASE 1 — Reflexion:
1. SubPageHeader "Vorschlag generieren", Zurück → /me/bill-of-rights.
2. Label "Deine inneren Konflikte" (text-sm, --muted-foreground).
3. Das bestehende Reflexions-Template aus dem alten BoR-Flow einbinden
   (prompt1/prompt2/prompt3, siehe saveReflectionAction-Struktur).
4. Button "Vorschlag generieren".

PHASE 2 — nach Klick:
1. KI-Aufruf über bestehenden Endpunkt /api/rights-formulator (existiert),
   mit dem Reflexions-Content als Input.
2. Lade-Spinner während der Antwort.
3. KI-Vorschlag erscheint als EDITIERBARES Textarea (vorausgefüllt; User kann anpassen).
4. Button "Zu meinen Bill of Rights hinzufügen".

NACH "HINZUFÜGEN":
- journal_entry speichern: template_type='bill_of_rights',
  recipe_slug='bill-of-rights', content = Reflexion (prompt1..3),
  ai_insights = finaler (ggf. editierter) KI-Vorschlag.   // ai_insights existiert
- Neues Recht ans bestehende rights-Array anhängen (finaler Text) und das
  komplette Array zurückschreiben (wie Teil B — KEIN Row-Insert).
- Redirect → /me/bill-of-rights, neues Recht sichtbar.
```

### Manuell — danach prüfen

1. Me → Bill of Rights → (erster Besuch) Intro-Sequenz, danach Liste mit zwei Kacheln ✓
2. „Manuell hinzufügen" → Text → speichern → Recht erscheint, **bestehende Rechte bleiben erhalten** ✓
3. „Vorschlag generieren" → Reflexion → KI-Vorschlag erscheint, editierbar ✓
4. Anpassen → „Hinzufügen" → Recht + Journal-Eintrag gespeichert, bestehende Rechte intakt ✓
5. Supabase: `bill_of_rights.rights` ist ein **erweitertes Array** (nicht überschrieben); `journal_entries` mit `ai_insights` ✓

---

## Schritt 11.14 — Values: Neuer Flow + Pfad-Visualisierung ✨

> Werte-Detailseite (Emoji + Beschreibung pro Wert) und eine Pfad-Visualisierung der Werte-Entdeckungsreise: ein sich schrittweise aufbauender Kompass neben jedem Meilenstein, begleitet vom wandernden Maskottchen.

> **🟦 Entscheidung D1 (entschieden ✓) — auswählbare Werte auf 30 reduzieren:** Die Hypothese wählt genau 5 Werte (`MAX_VALUES = 5`). Die Bank hat heute 81 Werte; `getValueLabel` gibt unbekannte IDs unverändert zurück. Damit die Betextung (Emoji + „Dir ist wichtig, dass…") handhabbar bleibt:
> - **`VALUES_BANK` (alle 81) bleibt erhalten** — nur für Label-Auflösung bestehender/Legacy-Daten.
> - **Neue Konstante `SELECTABLE_VALUES`** (die kuratierten 30, unten ausformuliert) wird im Hypothese-Picker (`hypothesis-form.tsx`) angezeigt.
> - Emoji- + Beschreibungs-Mappings decken die 30 ab; für alles andere (Legacy-IDs, Custom-Werte `"custom:…"`) gibt es einen **sauberen Default**. So ist die Betextung nie blockierend.
> - Die konkreten 30 Werte + fertige Mappings stehen direkt im Prompt unten — copy-paste-fertig.

> **Empfehlung:** Pfad-Design (Teil B) zuerst in Claude.ai als interaktives HTML prototypen.

### Teil A — Werte-Detailseite `/me/values`

```
Erstelle app/(app)/me/values/page.tsx.

VORARBEIT (D1) — die folgenden drei Konstanten-Dateien anlegen. Die Inhalte sind
fertig kuratiert; bitte 1:1 übernehmen.

(1) lib/utils/values-bank.ts — SELECTABLE_VALUES ans Ende ergänzen (VALUES_BANK
    NICHT verändern/löschen — bleibt für Label-Auflösung):

  /** Kuratierte Auswahl (30) für den Hypothese-Picker. Volle VALUES_BANK bleibt
   *  für die Anzeige bestehender/Custom-Werte erhalten. */
  export const SELECTABLE_VALUE_IDS = [
    "authenticity", "self-compassion", "honesty", "integrity", "mindfulness",
    "courage", "assertiveness", "resilience", "empowerment", "self-discipline",
    "responsibility", "growth", "curiosity", "creativity", "wisdom",
    "empathy", "kindness", "generosity", "connection", "service",
    "gratitude", "forgiveness", "balance", "rest", "physical-health",
    "joy", "humor", "purpose", "adventurousness", "letting-go",
  ] as const;

  export const SELECTABLE_VALUES = VALUES_BANK.filter((v) =>
    (SELECTABLE_VALUE_IDS as readonly string[]).includes(v.id),
  );

  hypothesis-form.tsx: den Picker von VALUES_BANK auf SELECTABLE_VALUES umstellen.
  Custom-Werte (addCustomValue) bleiben unverändert erlaubt.

(2) lib/utils/values-emojis.ts:

  export const VALUE_EMOJIS: Record<string, string> = {
    authenticity: "💎", "self-compassion": "🤍", honesty: "🪞", integrity: "🧭",
    mindfulness: "🌬️", courage: "🦁", assertiveness: "🛡️", resilience: "🌳",
    empowerment: "⚡", "self-discipline": "🎯", responsibility: "🤝",
    growth: "🌱", curiosity: "🔍", creativity: "🎨", wisdom: "🦉",
    empathy: "💞", kindness: "🌸", generosity: "🎁", connection: "🔗",
    service: "🤲", gratitude: "🙏", forgiveness: "🕊️", balance: "⚖️",
    rest: "😴", "physical-health": "💪", joy: "✨", humor: "😄",
    purpose: "🌟", adventurousness: "🧗", "letting-go": "🍃",
  };
  export const DEFAULT_VALUE_EMOJI = "🌿";
  export function getValueEmoji(id: string): string {
    return VALUE_EMOJIS[id] ?? DEFAULT_VALUE_EMOJI;
  }

(3) lib/utils/values-descriptions.ts — jede Beschreibung ist die Klausel NACH
    "Dir ist wichtig, dass " (die Seite stellt den Satz daraus zusammen):

  export const VALUE_DESCRIPTIONS: Record<string, string> = {
    authenticity: "du du selbst sein kannst — ohne Maske und ohne Verstellung",
    "self-compassion": "du dir selbst mit der gleichen Güte begegnest wie einem guten Freund",
    honesty: "du ehrlich bist, auch wenn es unbequem ist",
    integrity: "dein Handeln mit deinen Überzeugungen übereinstimmt",
    mindfulness: "du präsent im Moment bist, statt im Autopilot zu leben",
    courage: "du dich traust, auch wenn die Angst mitredet",
    assertiveness: "du für dich einstehst und deine Grenzen klar machst",
    resilience: "du nach Rückschlägen wieder aufstehst",
    empowerment: "du deine eigene Kraft spürst und Entscheidungen selbst triffst",
    "self-discipline": "du dranbleibst, auch wenn die Motivation nachlässt",
    responsibility: "du Verantwortung für dein Handeln übernimmst",
    growth: "du dich weiterentwickelst und über dich hinauswächst",
    curiosity: "du Neues entdeckst und Fragen stellst",
    creativity: "du deine Ideen Gestalt annehmen lässt",
    wisdom: "du innehältst und aus Erfahrung lernst",
    empathy: "du dich in andere hineinfühlen kannst",
    kindness: "du anderen mit Freundlichkeit begegnest",
    generosity: "du gibst, ohne sofort etwas zurückzuerwarten",
    connection: "du echte Nähe zu anderen Menschen lebst",
    service: "du etwas beiträgst, das über dich hinausreicht",
    gratitude: "du das Gute in deinem Leben wahrnimmst und wertschätzt",
    forgiveness: "du loslässt, was dich belastet — bei anderen und bei dir",
    balance: "du Arbeit, Ruhe und Leben in Einklang bringst",
    rest: "du dir Pausen gönnst, ohne ein schlechtes Gewissen",
    "physical-health": "du gut für deinen Körper sorgst",
    joy: "du dir Momente der Freude erlaubst",
    humor: "du das Leben auch leicht nehmen kannst",
    purpose: "dein Tun einen Sinn hat, der dich trägt",
    adventurousness: "du dich auf Neues und Unbekanntes einlässt",
    "letting-go": "du loslassen kannst, was du nicht kontrollieren kannst",
  };
  export const DEFAULT_VALUE_DESCRIPTION = "dieser Wert dein Handeln leitet";
  export function getValueDescription(id: string): string {
    // Custom-Werte ("custom:…") und Legacy-IDs → Default-Klausel.
    return VALUE_DESCRIPTIONS[id] ?? DEFAULT_VALUE_DESCRIPTION;
  }

LAYOUT:
1. SubPageHeader "Meine Werte", Zurück → /me.
2. Falls Werte vorhanden (aus neuester values_hypothesis.values): Liste als Cards:
   - Emoji links: getValueEmoji(id)
   - Wert-Name: getValueLabel(id) (font-heading semibold)
   - Satz: "Dir ist wichtig, dass " + getValueDescription(id) + "."
3. Falls keine: "Du hast noch keine Werte entdeckt."
4. IMMER SICHTBAR unten: Button "Geh auf Werteentdeckung →" → /me/values/journey
```

### Teil B — Pfad-Visualisierung `/me/values/journey`

```
Erstelle app/(app)/me/values/journey/page.tsx als Split Server/Client Component:
- Server Component: lädt Daten, berechnet currentStep, übergibt als Props.
- Client Component (z.B. ValuesJourneyClient): rendert Pfad, Kompass-Icons,
  Maskottchen (alles mit useState/useEffect/CSS-Transitions).

──────────────────────────────────
MEILENSTEINE (oben → unten):
  0  "Wertehypothese aufstellen"
  1  "Tag 1 — Reflexion"
  2  "Tag 2 — Reflexion"
  3  "Tag 3 — Reflexion"
  4  "Tag 4 — Reflexion"
  5  "Tag 5 — Reflexion"
  6  "Tag 6 — Reflexion"
  7  "Tag 7 — Reflexion"
  8  "Auswertung & Erkenntnisse"

──────────────────────────────────
LAYOUT:
- Vertikale Linie (var(--border), 2px) verbindet alle Meilensteine,
  ausgefüllter Fortschrittsstreifen (var(--primary)) von oben bis
  zum aktuellen Schritt.
- Pro Meilenstein-Zeile: [Kreis 34px links] [Label flex] [Kompass 62px rechts (absolut)]
- Kreis-Zustände:
    * Abgeschlossen: gefüllt var(--primary), Checkmark, kein Pulsieren
    * Aktuell:       Outline var(--primary), sanftes Pulsieren
    * Offen:         Outline var(--muted-foreground), gedimmt

──────────────────────────────────
KOMPASS — AUFBAUENDES ICON PRO MEILENSTEIN:

Jeder Schritt fügt dem Kompass genau ein neues visuelles Element hinzu.
Definiere in der Client Component zwei Hilfskonstanten:

  const COMPASS_TICKS = [0,45,90,135,180,225,270,315].map(a => {
    /* SVG-Line bei r=21.5 außen / r=19 innen, je auf cx=30 cy=27 berechnet */
    const rad = Math.PI * a / 180;
    return `<line x1="..." y1="..." x2="..." y2="..."
                  stroke="var(--primary)" stroke-width="1" opacity=".35"/>`;
  }).join('');

  const COMPASS_PETALS = [0,45,90,135,180,225,270,315].map(a => {
    /* Kleine Rhombus-Blütenblätter, Spitze r=14, Basis r=6 auf cx=30 cy=27 */
    return `<path d="M... L... L... Z" fill="var(--primary)" opacity=".28"/>`;
  }).join('');

  const COMPASS_DELTAS: string[] = [
    /* 0 */ `<circle cx="30" cy="27" r="21" fill="none"
                     stroke="var(--primary)" stroke-width="1.8" opacity=".9"/>
             <circle cx="30" cy="27" r="18.5" fill="none"
                     stroke="var(--primary)" stroke-width=".5" opacity=".2"/>`,

    /* 1 */ `<polygon points="30,6 33.5,21 30,18 26.5,21" fill="var(--primary)"/>
             <text x="30" y="3.5" text-anchor="middle" font-size="5.5"
                   font-weight="700" fill="var(--primary)"
                   font-family="sans-serif">N</text>`,

    /* 2 */ `<line x1="51" y1="27" x2="43" y2="27"
                   stroke="var(--primary)" stroke-width="1.5"
                   stroke-linecap="round" opacity=".7"/>
             <text x="55" y="29.5" text-anchor="middle" font-size="5"
                   fill="var(--primary)" font-family="sans-serif" opacity=".7">E</text>`,

    /* 3 */ `<polygon points="30,48 26.5,33 30,36 33.5,33"
                     fill="var(--primary)" opacity=".28"/>
             <text x="30" y="55" text-anchor="middle" font-size="5"
                   fill="var(--primary)" font-family="sans-serif" opacity=".45">S</text>`,

    /* 4 */ `<line x1="9" y1="27" x2="17" y2="27"
                   stroke="var(--primary)" stroke-width="1.5"
                   stroke-linecap="round" opacity=".7"/>
             <text x="5" y="29.5" text-anchor="middle" font-size="5"
                   fill="var(--primary)" font-family="sans-serif" opacity=".7">W</text>`,

    /* 5 */ `<circle cx="30" cy="27" r="13" fill="none"
                     stroke="var(--primary)" stroke-width=".8" opacity=".3"/>
             ${COMPASS_TICKS}`,

    /* 6 */ `<polygon points="30,7 33.5,27 30,22 26.5,27" fill="var(--primary)"/>`,

    /* 7 */ `<polygon points="30,47 26.5,27 30,32 33.5,27"
                     fill="var(--accent)" opacity=".75"/>`,
            // --accent = dusty rose (#C97B84) oder nächste verfügbare Kontrast-Variable

    /* 8 */ `${COMPASS_PETALS}
             <circle cx="30" cy="27" r="6" fill="var(--primary)" opacity=".2"/>
             <circle cx="30" cy="27" r="3.5" fill="var(--primary)"/>`,
  ];

ANZEIGE-LOGIK (getCompassSVG(i, state)):
- 'done':    alle Deltas 0..i zusammen, wrapper-opacity: 0.2 (Ghost).
- 'current': Deltas 0..i-1 stabil sichtbar + Delta i mit Fade-In-Animation.
             Nur das neu hinzukommende Element animiert — Vorläufer bleiben
             sofort sichtbar (kein Re-Fade beim Schritt-Wechsel).
- 'open':    display: none / opacity: 0.

CSS:
  .compass-delta-new { animation: compassIn 0.9s ease forwards; }
  @keyframes compassIn { from { opacity: 0 } to { opacity: 1 } }

──────────────────────────────────
MASKOTTCHEN — MITWANDERNDER BEGLEITER:

Verwende die bestehende Mascot-Komponente aus components/brand/mascot.tsx.
Sieh dir ZUERST alle verfügbaren Props an (size, expression, className …) und
wähle sinnvolle Standardwerte. Baue KEINE neue Mascot-Komponente.

POSITION: absolut innerhalb des Pfad-Containers (position: relative).
  - Horizontal: left = 0 (zentriert auf der Dot-Spalte; ggf. anpassen bis
    der Mascot visuell auf dem aktuellen Dot sitzt).
  - Vertikal (top): berechnet aus currentStep:

      const DOT_PX    = 34      // Dot-Höhe in px (Dein tatsächlicher Wert)
      const ROW_GAP   = 28      // Abstand zwischen Zeilen in px
      const STEP_H    = DOT_PX + ROW_GAP          // z.B. 62px pro Zeile
      const MASCOT_H  = /* Höhe der Mascot-Komponente, nach Prop-Check ermitteln */
      const top = currentStep * STEP_H + DOT_PX / 2 - MASCOT_H / 2

    Justiere die Formel, bis der Mascot optisch auf dem aktiven Dot zentriert ist.

ÜBERGANG: CSS transition auf `top` mit Spring-Easing:
  style={{ top, transition: reducedMotion ? 'none' : 'top 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}

  Die cubic-bezier-Kurve erzeugt einen sanften Bounce-Effekt (Mascot federt
  kurz über den Zielpunkt hinaus und schwingt zurück) — das lässt ihn lebendig
  wirken, als würde er zur nächsten Station springen.

prefers-reduced-motion (useReducedMotion Hook oder matchMedia):
  transition: 'none' → sofortiger Sprung, kein Bounce.

ZINDEX: Der Mascot liegt über der Pfad-Linie und den Dots (z-index höher als
Dots). Er überdeckt den aktuellen Dot — das ist gewollt (Mascot "sitzt" dort).

──────────────────────────────────
STATUS AUS DATEN (Server Component ermittelt, übergibt als completedSteps: number[]):
- values_hypothesis vorhanden → Index 0 in completedSteps.
- journal_entries (recipe_slug='values', template_type='daily_value')
  mit entry_date je Reflexionstag → Indizes 1–7 (je nach Anzahl Einträge).
  // template_type und recipe_slug per lib/utils/journal.ts prüfen.
- user_recipe_progress 'values' status='completed' → alle Indizes 0–8.
- currentStep = erstes Element nicht in completedSteps; 8 wenn alle done.

KLICKBARKEIT:
- Abgeschlossene → zur jeweiligen Unterseite
    i=0 → /recipes/values/hypothesis
    i=1..7 → /recipes/values/journal (oder tages-spezifische Route, falls vorhanden)
    i=8 → /recipes/values/evaluation (oder nächste verfügbare Route)
- Aktueller → zur nächsten offenen Aktion (gleiche Links wie oben).
- Zukünftige → nicht klickbar (opacity-50, cursor-default, kein Link).
```

### Teil C — Dashboard-CTA für Werte

```
Im Dashboard (app/(app)/dashboard/page.tsx, Werte-Empfehlung) drei Zustände aus
user_recipe_progress für 'values':
- 'in_progress' → CTA "Setze deine Entdeckungsreise fort →"
- 'not_started' → CTA "Starte deine Werteentdeckung →" (bisheriger Text)
- 'completed'   → CTA "Deine Werte ansehen →" → /me/values

Achtung: Der Empfehlungstext entsteht teils serverseitig (normalPrimary in
dashboard/page.tsx), teils clientseitig (DashboardFocus). Die richtige Stelle
für die drei Zustände suchen und dort anpassen.
```

### Manuell — danach prüfen

1. Me → Meine Werte → bis zu 5 Werte mit Emoji + „Dir ist wichtig, dass…"; Custom-Werte sauber mit Default ✓
2. Hypothese-Picker zeigt nur die kuratierten 30 (+ Custom möglich) ✓
3. „Geh auf Werteentdeckung" → Pfad-Seite öffnet sich ✓
4. Abgeschlossene Meilensteine: gefüllter Kreis + Ghost-Kompass (dim) rechts ✓
5. Aktueller Meilenstein: pulsierender Kreis + Kompass blendet neues Element ein ✓
6. Offene Meilensteine: kein Kompass sichtbar ✓
7. Maskottchen sitzt auf dem aktuellen Dot; bei Fortschritt springt es mit Bounce-Animation zum nächsten ✓
8. prefers-reduced-motion: kein Bounce, kein Pulsieren — direkter Sprung ✓
9. Klick auf abgeschlossenen Meilenstein → richtige Unterseite ✓
10. Dashboard-CTA spiegelt not_started / in_progress / completed korrekt ✓

---

## Schritt 11.15 — Onboarding: Mascot-geführtes erweitertes Formular ✨

> Das **bestehende** Onboarding-Formular (`app/onboarding/page.tsx`, heute: Grund → Konfidenz → Name) wird **erweitert**, nicht ersetzt: ein Mascot begleitet den Flow, eine Welcome-Begrüßung und eine Mascot-Antwort kommen dazu, und vier App-Intro-Karten werden als zusätzliche Formularschritte ergänzt. **Keine separate Slide-Komponente, kein neuer Flow-Wrapper** — alles bleibt das eine Step-Formular.

> **Erhalten bleiben (Entscheidung Q1):** „Grund" (→ `active_recipe_id`) und „Konfidenz" (→ `confidence_baseline`). `completeOnboardingAction` bleibt zuständig und speichert weiterhin name + reason + confidence + `onboarding_completed`.
>
> **Architektur:** Das Onboarding-Gate ist bereits serverseitig (`app/(app)/layout.tsx` → Redirect auf `/onboarding`). Es wird daher NUR `app/onboarding/page.tsx` (+ ggf. `onboarding.actions.ts`) angepasst. Kein neues Gate, keine `components/onboarding/onboarding-flow.tsx`.
>
> **Absorbiert 11.6:** Die Karte ist auf Mobile vertikal zentriert (Akzeptanzkriterium unten).

> **Aufwändigster Schritt — drei Teile, je ein Commit.**

### Vorgeschlagene Step-Reihenfolge (über das STEPS-Array trivial änderbar)

```
welcome → name → response → reason → confidence → intro1 → intro2 → intro3 → intro4 → (submit)
```

- `welcome`, `response`, `intro1–4` sind neu. `reason`, `confidence`, `name` existieren bereits (nur ggf. umsortiert).
- Submit (= `completeOnboardingAction`) feuert auf der letzten Intro-Karte über den Button „Ich bin bereit".

### Teil A — Welcome + Name + Mascot-Antwort (in das bestehende Formular)

```
Datei: app/onboarding/page.tsx (erweitern, nicht ersetzen).

Step-Union erweitern, z.B.:
  type Step = "welcome" | "name" | "response" | "reason" | "confidence"
            | "intro1" | "intro2" | "intro3" | "intro4";

Mascot einbinden (components/brand/mascot.tsx) — sichtbar über der Karte,
reagiert je Step (expression/Animation).

WELCOME (Step "welcome"):
- Mascot startet klein/unsichtbar unten (translate-y:100%, opacity:0).
- GSAP: Mascot springt in die Mitte (translate-y:0, opacity:1,
  ease:"back.out(1.7)", duration:0.7); expression neutral → smile.
- Danach Begrüßungstext einblenden:
  "Willkommen im Anti Imposter Club. Schön, dass du da bist.
   Mein Name ist [Platzhalter]. Verrätst du mir deinen?"
- Button "Weiter" → Step "name".

NAME (Step "name"):
- Textfeld (Placeholder "Dein Name"), Button "Los geht's".
- name in lokalem State halten (Speichern erst beim finalen Submit).
- Klick → Step "response".

RESPONSE (Step "response"):
- Mascot: kleiner Hüpfer (GSAP scale 1 → 1.1 → 1, 300ms).
- Text: "Nett dich kennenzulernen, [Name]! 👋"
- Danach: "Lass mich dir kurz zwei Fragen stellen und dann die App zeigen."
- Button "Weiter" → Step "reason".

reduced-motion: kein Springen/Hüpfen; Mascot direkt zentriert; Text direkt ohne
Fade; Step-Übergänge direkt.

Mobile: die Karte vertikal zentrieren (flex-col + justify-center bzw.
ausbalanciertes Padding), nicht am oberen Rand kleben (absorbiert 11.6).
```

### Teil B — Reason + Confidence + App-Intro-Karten

```
REASON (Step "reason") + CONFIDENCE (Step "confidence"):
- Die bestehenden Schritte (RadioGroup für Grund, Slider für Konfidenz)
  unverändert übernehmen — nur in die neue Step-Maschine einsortieren.

APP-INTRO (Steps "intro1"–"intro4"): als weitere Karten-Schritte IM SELBEN
Formular (gleiche Card, gleicher "Weiter"-Button, gleiche Progress-Anzeige),
Mascot oben. KEIN separates Slide-System.

Texte aus lib/content/onboarding-intro.ts (Konstante; initiale Entwürfe, später
verfeinerbar):

  intro1  Titel "Dein persönliches Werkzeug"
          "Diese App hilft dir, dein Selbstbewusstsein aus verschiedenen Winkeln
           zu stärken — mit kleinen, gezielten Übungen für deinen Alltag."
  intro2  Titel "Was dich erwartet"
          "Du lernst, mit Gedankenspiralen umzugehen, schuldgefühlfrei Nein zu
           sagen und die Angst loszulassen, einfach du selbst zu sein."
  intro3  Titel "Dich selbst kennenlernen"
          "Das Ziel: dich auf einer tieferen Ebene zu verstehen — deine Werte
           entdecken, wissen was du wirklich willst, und dir innere Regeln
           definieren, nach denen du lebst."
  intro4  Titel "Für schwierige Momente"
          "Und wenn's eng wird: die Kopf-Apotheke hilft dir aus unangenehmen
           Momenten — ob Gedankenspirale, Nervosität vor einem Auftritt oder ein
           schwieriges Gespräch."

Letzter Button (Step "intro4"): "Ich bin bereit".
```

### Teil C — Submit + Abschluss

```
Beim Klick auf "Ich bin bereit" (letzter Step):
- completeOnboardingAction aufrufen mit name + reason + confidenceBaseline
  (bestehende Action; sie setzt name, active_recipe_id (aus reason),
  confidence_baseline und onboarding_completed=true). NICHT vereinfachen —
  reason + confidence müssen erhalten bleiben.
- Bei Erfolg → /dashboard (bestehendes window.location.href-Muster).

BoR-Reminder-Skip (optional/niedrige Prio):
- Direkt vor dem Navigieren localStorage 'aic_reminder_date' auf heute setzen,
  damit der Reminder (11.11) am Onboarding-Tag nicht aufpoppt.
- HINWEIS: Für echte Neu-User ist das ohnehin redundant (sie haben noch keine
  Rechte → Reminder greift sowieso nicht). Nur als Sicherheitsnetz.

Validierung: completeOnboardingAction verlangt reason + confidence + name. Da
"Weiter" je Step erst bei gültiger Eingabe aktiv ist (Grund gewählt, Name nicht
leer), liegen beim finalen Submit alle Werte vor.
```

### Manuell — danach prüfen

1. Test-Account (oder `onboarding_completed=false`) → Mascot springt in die Mitte, Ausdruck → smile ✓
2. Begrüßung → Name eingeben → Mascot-Antwort mit Name ✓
3. Grund + Konfidenz erscheinen weiterhin und werden gespeichert ✓
4. Vier App-Intro-Karten durchklicken ✓
5. „Ich bin bereit" → Dashboard ✓
6. Supabase profiles: name, active_recipe_id (aus Grund), confidence_baseline, onboarding_completed=true gesetzt ✓
7. Erneut einloggen → Onboarding erscheint NICHT nochmal ✓
8. Karte auf Mobile (~375px) vertikal zentriert ✓
9. prefers-reduced-motion → kein Springen/Hüpfen, Mascot direkt mittig ✓

---

## Schritt 11.16 — Einstellungen-Seite (Logout + Profil-Stats) + /profile-Redirect 🏗

> `/settings` wird von einem Placeholder zur echten Seite und übernimmt **Logout** und die **Profil-Stats** der alten `/profile`-Seite. Danach wird `/profile` durch einen Redirect auf `/me` abgelöst.

> **Quelle:** Die alte `app/(app)/profile/page.tsx` enthält bereits `signoutAction` (Logout) und die Stats (Journal-Count, abgeschlossene Rezepte, längster Versprechens-Streak, „dabei seit", aktive Rechte). Diese Logik in die neue Settings-Seite übernehmen.

### Claude Code Prompt

```
1. app/(app)/settings/page.tsx (ersetzt Placeholder aus 11.7), Server Component:
   - Seitentitel: NAV_LABELS.settings ("Einstellungen").
   - STATS-Bereich: die Stat-Cards aus der alten profile/page.tsx übernehmen
     (journalCount, recipesCompleted, longestPromiseStreak, daysSinceJoining,
     aktive-Rechte-Count). Dieselben Queries/Helper wie zuvor.
   - LOGOUT: <form action={signoutAction}> mit "Abmelden"-Button (LogOut-Icon),
     unten platziert. signoutAction aus @/app/(auth)/auth.actions importieren.

2. /profile ablösen:
   - app/(app)/profile/page.tsx so ändern, dass es per redirect("/me")
     weiterleitet (Bookmarks/PWA-Sicherheit). app/(app)/profile/loading.tsx
     kann entfernt werden, falls dadurch ungenutzt.
   - Sicherstellen, dass nichts mehr aktiv auf /profile verlinkt (Nav ist seit
     11.7 umgestellt).

REIHENFOLGE-HINWEIS: Dieser Schritt MUSS abgeschlossen sein, bevor /profile
abgelöst wird — sonst gäbe es kurz keinen Logout-Zugang. (In der empfohlenen
Reihenfolge ist das gewährleistet.)
```

### Manuell — danach prüfen

1. „Einstellungen"-Tab → Stats sichtbar, identisch zu früher auf /profile ✓
2. „Abmelden" funktioniert (führt ausgeloggt zur Login/Landing) ✓
3. `/profile` aufrufen → leitet auf `/me` weiter ✓
4. Kein toter Link mehr auf /profile in der App ✓

---

## Checkliste Phase 11

### 🐛 Bug Fixes
- [ ] 11.1  Dashboard Crossfade + focus-question: sequenziell & synchron, reduced-motion-sicher
- [ ] 11.2  RecipeIntroCollapsible: collapsed-State symmetrisch (alle Rezepte)
- [ ] 11.3  Overthinking: „Worum geht's" nur bei step === 1
- [ ] 11.4  Overthinking: Peek-Companion Schritte 2–5 auf Überschrift-Höhe (absolute), Blick links-unten
- [ ] 11.5  Overthinking Step 1: „Zähle von 5 runter und sage dann laut Stopp."
- [ ] 11.6  — entfällt (in 11.15 integriert)

### 🏗 Struktur
- [ ] 11.7  Bottom Nav: Dashboard(/dashboard) · Me(/me) · Apotheke(/booster) · Journal · Einstellungen + Placeholder + lib/content/labels.ts
- [ ] 11.8  Dashboard: Streaks entfernt, Layout aufgeräumt, keine toten Variablen
- [ ] 11.9 A  Things Got Messy entkoppelt (neue Route /booster/things-got-messy, Actions ausgelagert, BoR-CTA entfernt, Progress-Kopplung entfernt, Label/Slug umgestellt + SQL-Migration)
- [ ] 11.9 B  Kopf-Apotheke-Hub: 6 Kacheln, 5 klickbar, nur Saying No „Bald verfügbar"
- [ ] 11.12 Me-Seite: Profil + Werte + Wants(Placeholder) + Bill of Rights (dynamische Counts), ersetzt /profile
- [ ] 11.16 Einstellungen: Logout + Profil-Stats übernommen; /profile → Redirect /me

### ✨ Features
- [ ] 11.10 Journal: Freier Eintrag (template_type='free', recipe_slug=null, Titel in content; JOURNAL_TEMPLATE_MAP['free'])
- [ ] 11.11 Täglicher BoR-Reminder: Client-Overlay am Dashboard, 1×/Tag, nur bei aktiven Rechten, Fade
- [ ] 11.13a BoR Listenansicht /me/bill-of-rights (Array-Modell, Intro-Gate)
- [ ] 11.13b BoR Manuelle Eingabe (Array anhängen, kein Row-Insert)
- [ ] 11.13c BoR KI-Vorschlag (rights-formulator → ai_insights + Array anhängen)
- [ ] 11.14a SELECTABLE_VALUES (30 kuratiert), Emoji-/Beschreibungs-Maps + Default; Werte-Detailseite
- [ ] 11.14b Pfad-Visualisierung: aufbauender Kompass (9 Deltas, Ghost/Aktuell/Offen) + mitwanderndes Maskottchen (bestehende Mascot-Komponente, Spring-Bounce-Transition)
- [ ] 11.14c Dashboard-CTA: not_started / in_progress / completed
- [ ] 11.15a Onboarding: Mascot-Sprung + Name + Antwort (im bestehenden Formular, GSAP)
- [ ] 11.15b Onboarding: Reason/Confidence erhalten + 4 App-Intro-Karten als Steps (lib/content/onboarding-intro.ts)
- [ ] 11.15c Onboarding: Submit via completeOnboardingAction (name+reason+confidence), Mobile-Zentrierung

---

## Hinweise für Claude Code

- **Routen exakt:** Dashboard = `/dashboard` (nie `/`). `/me` ersetzt `/profile`. „Things Got Messy" = `/booster/things-got-messy`.
- **Bill of Rights = JSONB-Array auf einer Zeile.** Hinzufügen/Ändern/Löschen immer über das komplette Array (`saveRightsAction`). Nie Row-Insert. Count = aktive Rechte.
- **Labels zentral:** Alle sichtbaren Nav-/Seiten-/Übungs-Labels aus `lib/content/labels.ts`. „Things Got Messy", „Kopf-Apotheke" etc. nie hardcoden.
- **Design-Tokens:** ausschließlich `globals.css`-Variablen (`--primary`, `--accent`, `--muted`, `--background`, `--border` …). Keine Hardcoded-Farben.
- **Animationen:** immer `useReducedMotion` prüfen und Fallback liefern. GSAP nur für komplexe Animationen (Mascot in 11.15); einfache Übergänge mit Tailwind/CSS.
- **Onboarding:** bestehendes `app/onboarding/page.tsx` + `completeOnboardingAction` erweitern. Kein neues Gate, keine Slide-Komponente. reason + confidence erhalten.
- **Journal:** kein `title`-Feld in der Tabelle — Titel in `content`. `ai_insights` existiert. Neue `template_type`-Werte immer in `lib/utils/journal.ts` (Union + Map) ergänzen.
- **Supabase:** über bestehende Server Actions / Helper. Manuelle SQL (z. B. die Things-Got-Messy-Migration) im Dashboard ausführen; Migrationsdateien sind informativ.
- **Client-Fehler** erscheinen NICHT in Vercel-Runtime-Logs — Browser-Konsole direkt prüfen.
- **Commits:** nach jedem nummerierten Schritt `npm run build` → grün → commit `Phase 11.X: [kurze Beschreibung]`.
- **Prototyp 11.14b:** Pfad-Design vor Implementierung in Claude.ai prototypen.
- **Entscheidungen D1 (30 Werte) & D2 (Messy-Storage migrieren) sind getroffen** und direkt in 11.14 bzw. 11.9 ausformuliert — kein offener Klärungsbedarf mehr.
