# Phase 12 — Bugfixes & Post-Phase-11-Feinschliff (v2, codeverifiziert)

> **Ziel:** Alle nach Phase 11 aufgetretenen Bugs beheben, die URL-Migration der veralteten `/recipes`-Flows **vollständig** abschließen (inkl. zentraler Recipe-Registry und Evaluation-Route), Values-Journey und Bill-of-Rights-Flow verbessern, Onboarding-Feinschliff und eine Login→Onboarding-Übergangsanimation als Wow-Moment.
>
> **Voraussetzung:** Phase 11 vollständig abgeschlossen und deployed.
>
> **Arbeitsweise:** Sequenzielle Schritte, je ein Commit + `npm run build`-Gate. Bugs zuerst, dann URL-Migration, dann Features/Verbesserungen. Animation zum Schluss.
>
> **Änderungen ggü. v1 (alle codeverifiziert gegen `aic-app`):**
> - **NEU 12.0:** `MascotPeek` um `from="top"` erweitern (Voraussetzung für 12.2 + 12.19).
> - **12.2 / 12.19:** Login-Maskottchen sitzt in `components/auth/auth-reveal.tsx` (zweimal gerendert) — **nicht** in `login/page.tsx`.
> - **12.3:** AIC-Header ist `<Logo>` in `app/onboarding/layout.tsx`; `viewport-fit=cover` ist schon gesetzt.
> - **12.4:** Schritt-Counter ist dynamisch (`STEPS.length`) — kein manuelles „9→8".
> - **12.6:** Muss zusätzlich `lib/utils/recipes.ts` (zentrale Registry), `STEP_LINKS` im Journey-Client **und** die `evaluation`-Route migrieren.
> - **12.8:** Redirect für `/recipes/values/evaluation` ergänzt.
> - **12.9:** BoR steht an zwei Dashboard-Stellen; Values-Pfad kommt aus der Registry.
> - **12.10:** `/me/values` muss zusätzlich den Journey-Status abfragen (hat er aktuell nicht).
> - **12.11:** Kein Neubau — `RecipeIntroGate` aus `/recipes/[slug]` übernehmen.
> - **12.13:** Neu gefasst — Ursache ist fehlendes Kalender-Gating; **keine** neue DB-Spalte nötig (`entry_date` reicht); Bug 2 löst sich automatisch.
> - **12.15:** `RecipeIntroGate` (Hub) + `RecipeIntroCollapsible` (Unterseiten) — sauber getrennt von der bereits vorhandenen Vollbild-`RecipeIntro`.
> - **12.16:** Vollständige Änderungskette inkl. `situation`-Join und Speicher-Schema `{ prompt1, prompt3 }`.

---

## Priorisierungs-Übersicht

| #     | Schritt                                                              | Typ               | Dringlichkeit |
|-------|----------------------------------------------------------------------|-------------------|---------------|
| 12.0  | `MascotPeek`: `from="top"`-Variante ergänzen                         | 🏗 Struktur        | **Hoch**      |
| 12.1  | Globales Scroll-to-Top bei Navigation                                | 🐛 Bug             | **Hoch**      |
| 12.2  | Login-Screen: Maskottchen oben, schaut nach unten                   | 🐛 Bug             | Mittel        |
| 12.3  | Onboarding: Safe Area (iPhone-Notch)                                 | 🐛 Bug             | **Hoch**      |
| 12.4  | Onboarding: Schritte 1 + 2 zusammenführen                           | 🐛 Bug             | **Hoch**      |
| 12.5  | Onboarding: Fade-Übergänge zwischen Schritten                        | ✨ Verbesserung    | Mittel        |
| 12.6  | Values-Flow: vollständige URL-Migration auf `/me/values/journey/`    | 🏗 Struktur        | **Kritisch**  |
| 12.7  | Values-Journal: Formular vereinfachen                                | 🐛 Bug             | **Hoch**      |
| 12.8  | Alte `/recipes`-Routen redirecten                                    | 🏗 Struktur        | **Hoch**      |
| 12.9  | Dashboard CTAs: URL-Fixes (Values + BoR)                            | 🐛 Bug             | **Hoch**      |
| 12.10 | `/me/values`: Button-Position + kontextabhängiger Text              | 🐛 Bug             | **Hoch**      |
| 12.11 | `/me/values`: Intro-Sequenz (RecipeIntroGate) übernehmen             | 🐛 Bug             | **Hoch**      |
| 12.12 | Journey: Maskottchen verkleinern + Schloss-Icons auf gesperrten Stufen | ✨ Verbesserung | Mittel        |
| 12.13 | Journey: Tag-Freischaltung erst am echten nächsten Kalendertag       | 🐛 Bug             | **Hoch**      |
| 12.14 | `/me/bill-of-rights`: Empty State + Button-Positionen                | 🐛 Bug             | **Hoch**      |
| 12.15 | `/me/bill-of-rights`: „Worum geht's"-Collapsible auf allen 3 Seiten  | 🐛 Bug             | **Hoch**      |
| 12.16 | `/me/bill-of-rights/generate`: Mittlere Frage entfernen              | 🐛 Bug             | Mittel        |
| 12.17 | Bill of Rights Kacheln: § + Nummer in Gold                           | ✨ Verbesserung    | Mittel        |
| 12.18 | `/me/bill-of-rights`: Maskottchen als Richter                        | ✨ Verbesserung    | Mittel        |
| 12.19 | Login → Onboarding: Übergangsanimation (Wow-Moment)                  | ✨ Feature         | Mittel        |

### Empfohlene Ausführungsreihenfolge

```
12.0 → 12.1 → 12.2 → 12.3 → 12.4 → 12.5     ← Infra + unabhängige Bugs / Onboarding
→ 12.6 → 12.7 → 12.8 → 12.9 → 12.10 → 12.11 ← URL-Migration (12.6 vor allem anderen)
→ 12.12 → 12.13                              ← Values-Journey-Verbesserungen
→ 12.14 → 12.15 → 12.16 → 12.17 → 12.18      ← Bill-of-Rights-Verbesserungen
→ 12.19                                       ← Übergangsanimation (baut auf 12.0 + 12.2 + 12.4)
```

> **Kritische Abhängigkeit:** 12.6 muss **vor** 12.7–12.11 laufen. 12.0 muss vor 12.2 und 12.19 laufen.

---

## Schritt 12.0 — `MascotPeek`: `from="top"`-Variante ergänzen 🏗

> Die Komponente `components/brand/mascot-peek.tsx` unterstützt aktuell nur `from = "left" | "right" | "bottom"`. Für 12.2 (Login-Maskottchen oben) und 12.19 (Sprung von oben) brauchen wir, dass das Maskottchen auch **von oben** hereinschiebt. Ohne diese Erweiterung würde das Maskottchen zwar oben positioniert, die Einflug-Animation käme aber weiter von unten (`y: 90`).

### Claude Code Prompt

```
In components/brand/mascot-peek.tsx den Typ und die Animationslogik um eine
"top"-Variante erweitern:

1. TYP erweitern:
   from?: "left" | "right" | "bottom" | "top";

2. resolvedGazeX-Default für "top": wie "bottom" → 0
   (Zeile mit `from === "bottom" ? 0 : ...` um `from === "top" ? 0 :` ergänzen,
    oder "top" mit in den 0-Fall aufnehmen.)

3. fromVars-Logik (die gsap.fromTo-Startwerte) um "top" ergänzen:
   - "bottom" startet bei { y: 90, opacity: 0, rotation: rotate }
   - "top" soll spiegelbildlich starten: { y: -90, opacity: 0, rotation: rotate }
   Also: from === "bottom" || from === "top"
     ? { y: from === "bottom" ? 90 : -90, opacity: 0, rotation: rotate }
     : { x: from === "right" ? 90 : -90, opacity: 0, rotation: rotate }

4. Die Ziel-Tween-Werte (y: 0, opacity: 1, rotation) bleiben unverändert.

Keine weiteren Props oder Verhaltensänderungen. Bestehende Aufrufe
(from="bottom"/"right") müssen unverändert funktionieren.
```

### Manuell — danach prüfen

1. `npm run build` grün ✓
2. Bestehende Auth-Screens (Hero-Maskottchen `from="right"`, Karten-Maskottchen `from="bottom"`) unverändert ✓
3. (Sichtprüfung der `from="top"`-Variante erfolgt in 12.2.)

---

## Schritt 12.1 — Globales Scroll-to-Top bei Navigation 🐛

> Beim Wechsel zwischen Seiten landet man manchmal mitten auf der Seite statt ganz oben. Der Next.js App Router scrollt bei client-seitiger Navigation nicht automatisch zurück.

### Claude Code Prompt

```
In der App landet man beim Navigieren zwischen Seiten manchmal nicht ganz oben.

Erstelle eine globale ScrollToTop-Komponente:

1. components/layout/scroll-to-top.tsx (Client Component):
   - usePathname() aus next/navigation
   - useEffect: bei jeder Änderung von pathname → window.scrollTo({ top: 0, behavior: "instant" })
   - rendert null

2. Einbinden im Root-Layout app/layout.tsx, direkt im <body> vor {children}.
   (Das Root-Layout gilt für alle Routengruppen; die App scrollt am <body>,
    da Seiten min-h-svh / min-h-dvh nutzen.)

behavior: "instant" ist hier korrekt und gewünscht (kein smooth-Scroll,
auch unter prefers-reduced-motion).
```

### Manuell — danach prüfen

1. Auf langer Seite nach unten scrollen → andere Seite öffnen → landet oben ✓
2. Zurück-Navigation ebenfalls oben ✓

---

## Schritt 12.2 — Login-Screen: Maskottchen oben, schaut nach unten 🐛

> Nach dem Hero-Swipe (Login-/Signup-Karte) sitzt das Maskottchen aktuell **unten mittig** und schaut hoch. Es soll **oben mittig** sitzen und nach unten zur Karte schauen.
>
> **Korrektur ggü. v1:** Das Maskottchen liegt in `components/auth/auth-reveal.tsx` (Komponente `MascotPeek`), **nicht** in `app/(auth)/login/page.tsx`. Es wird dort **zweimal** gerendert: einmal im `reduced`-Branch (reduced-motion-Fallback) und einmal im normalen `revealed`-Branch. **Beide** Instanzen müssen geändert werden. (Das gekippte Maskottchen im Hero — `app/(auth)/layout.tsx`, `from="right" rotate={-45}` — bleibt unverändert.)

### Claude Code Prompt

```
In components/auth/auth-reveal.tsx gibt es ZWEI Instanzen von <MascotPeek …>
(eine im reduced-motion-Branch, eine im normalen revealed-Branch). Beide sind
aktuell:

  <MascotPeek
    from="bottom"
    size="lg"
    expression="smile"
    pulseSeconds={3}
    gazeX={0}
    gazeY={-3}
    className="pointer-events-none absolute bottom-0 left-1/2 -ml-16 -mb-14 z-0"
  />

Ändere BEIDE Instanzen identisch so, dass das Maskottchen oben sitzt und nach
unten schaut:

  - from="bottom"  → from="top"        (nutzt die in 12.0 ergänzte Variante)
  - gazeY={-3}     → gazeY={3}          (Blick nach unten statt oben)
  - className:     bottom-0 → top-0  UND  -mb-14 → -mt-14
    (also: "pointer-events-none absolute top-0 left-1/2 -ml-16 -mt-14 z-0")

Alles andere (size, expression, pulseSeconds, left-1/2, -ml-16, z-0) bleibt gleich.
Das Login-/Signup-Formular und der Hero bleiben unverändert.
```

### Manuell — danach prüfen

1. Ausgeloggt → Hero → nach oben wischen → Maskottchen sitzt **oben** mittig ✓
2. Maskottchen schaut nach unten Richtung Formular ✓
3. Slide-in-Animation kommt von oben herein (nicht von unten) ✓
4. `prefers-reduced-motion`: Maskottchen ebenfalls oben (reduced-Branch) ✓
5. Formular/Buttons unverändert ✓

---

## Schritt 12.3 — Onboarding: Safe Area (iPhone-Notch) 🐛

> Der „AIC"-Schriftzug oben im Onboarding wird von Notch/Dynamic-Island verdeckt.
>
> **Korrektur ggü. v1:** Der Header ist `<Logo size="lg" />` im Container `app/onboarding/layout.tsx` (`<div className="flex justify-center pt-8">`). `viewport-fit=cover` und `statusBarStyle: "black-translucent"` sind in `app/layout.tsx` bereits gesetzt — nur der Safe-Area-Abstand fehlt hier.

### Claude Code Prompt

```
In app/onboarding/layout.tsx sitzt der "AIC"-Logo-Header in:

  <div className="flex justify-center pt-8">
    <Logo size="lg" />
  </div>

Dieser Container respektiert den iPhone-Notch nicht.

Ergänze den oberen Safe-Area-Abstand analog zu app/(app)/layout.tsx, das es
bereits korrekt macht (style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}):

  <div
    className="flex justify-center pt-8"
    style={{ paddingTop: "calc(2rem + env(safe-area-inset-top, 0px))" }}
  >

(pt-8 = 2rem; per inline-style addieren wir den Safe-Area-Inset oben drauf.
Auf Android/Desktop ist der Inset 0px → kein zusätzlicher Leerraum.)

Restlichen Onboarding-Inhalt (Maskottchen, Karten, Weiter-Button) nicht verschieben.
```

### Manuell — danach prüfen

1. iPhone bzw. DevTools-iPhone-Simulation: „AIC"-Logo vollständig sichtbar, nicht hinter Notch ✓
2. Android/Desktop: kein übermäßiger Leerraum oben ✓

---

## Schritt 12.4 — Onboarding: Schritte 1 + 2 zusammenführen 🐛

> Aktuelle Schrittfolge in `app/onboarding/page.tsx` (`STEPS`-Array): `welcome → name → response → reason → confidence → intro1 → intro2 → intro3 → intro4` (9 Schritte). `welcome` (nur Text) und `name` (Eingabe) sollen zu einem Schritt verschmelzen.
>
> **Korrektur ggü. v1:** Der Counter ist **dynamisch**: `Schritt {stepIndex + 1} von {STEPS.length}`. Es genügt, `"welcome"` aus `STEPS` zu entfernen und die Willkommens-Copy in den `name`-Schritt zu ziehen — der Counter wird automatisch „von 8". **Kein** manuelles Ändern einer „9".

### Claude Code Prompt

```
In app/onboarding/page.tsx sollen die getrennten Schritte "welcome" und "name"
zu EINEM Schritt verschmolzen werden.

VORGEHEN:
1. Im STEPS-Array den Eintrag "welcome" ENTFERNEN. Neue Reihenfolge:
   ["name", "response", "reason", "confidence", "intro1", "intro2", "intro3", "intro4"]
   → STEPS.length = 8, der Counter "Schritt X von {STEPS.length}" wird automatisch korrekt.

2. Im Render-Block für `step === "name"` die Willkommens-Copy aus dem alten
   "welcome"-Block übernehmen, sodass der erste Schritt jetzt zeigt:
   - CardTitle: "Willkommen 👋"
   - CardDescription / Text: "Willkommen im Anti Imposter Club. Schön, dass du
     da bist. Verrätst du mir, wie du heißt?"
   - Direkt darunter das bestehende Namens-Eingabefeld (Placeholder "Dein Name")
   - Weiter-Button (bestehende Logik) — bereits heute disabled wenn name leer
     (canProceed prüft step === "name" ? name.trim() !== "" : ...) → bleibt so.

3. Den alten "welcome"-Render-Zweig (CardTitle "Willkommen 👋" ohne Input) löschen.
   `expressionForStep` ggf. anpassen, falls dort ein "welcome"-Case existiert
   (auf den "name"-Case mappen / "welcome"-Case entfernen).

4. Die Namens-Speicherlogik (Server Action / Supabase-Update) bleibt inhaltlich
   identisch — sie hängt am "name"-Schritt und wird nicht verschoben.

Type Step: den "welcome"-Member im Step-Union entfernen, damit TypeScript sauber bleibt.
```

### Manuell — danach prüfen

1. Neuer Test-Account (oder `onboarding_completed = false`) → Onboarding öffnen
2. Schritt 1: Willkommenstext UND Namensfeld direkt sichtbar ✓
3. Weiter-Button deaktiviert wenn Feld leer ✓
4. Name eingeben → Weiter → gespeichert, weiter zu „response"-Schritt ✓
5. Counter zeigt „Schritt 1 von 8" ✓
6. Kein separater alter „Wie heißt du?"-Schritt mehr ✓

---

## Schritt 12.5 — Onboarding: Fade-Übergänge zwischen Schritten ✨

> Schrittwechsel im Onboarding sind abrupt. Es soll derselbe sequenzielle Übergang wie im Dashboard genutzt werden.
>
> **Hinweis:** Das Dashboard-Pattern aus Phase 11.1 ist die Komponente `components/dashboard/crossfade.tsx` auf Basis des Hooks `lib/hooks/use-crossfade.ts` (`useCrossfade(token, children)`, respektiert `prefers-reduced-motion`, blendet bei Token-Wechsel sequenziell aus→tausch→ein). Dieses Pattern wiederverwenden, nicht neu erfinden.

### Claude Code Prompt

```
Im Onboarding (app/onboarding/page.tsx) sollen die Schrittwechsel denselben
sanften Übergang nutzen wie das Dashboard.

Es gibt bereits eine wiederverwendbare Komponente components/dashboard/crossfade.tsx
(nutzt lib/hooks/use-crossfade.ts). Sie blendet beliebige children beim Wechsel
des `token`-Props sequenziell über und respektiert prefers-reduced-motion.

UMSETZUNG:
1. Den Schritt-Content (die <Card> mit dem jeweiligen Step-Inhalt) in <Crossfade>
   wrappen und als token den aktuellen Step-Namen übergeben:
     <Crossfade token={step}>… aktueller Card-Inhalt …</Crossfade>
   So blendet bei jedem Step-Wechsel der alte Inhalt aus und der neue ein,
   nie beide gleichzeitig.

2. Falls die Crossfade-Komponente außerhalb des Dashboards nicht ohne Weiteres
   importierbar ist (Pfad/Coupling prüfen), verschiebe Crossfade nach
   components/ui/crossfade.tsx und passe den Dashboard-Import an — die Logik
   bleibt identisch. (Erst prüfen, ob ein direkter Import schon funktioniert.)

3. Der Fortschrittsbalken ("Schritt X von 8") liegt AUSSERHALB des Crossfade,
   sodass er sich sofort beim Step-Wechsel aktualisiert (nicht erst nach dem Fade).

prefers-reduced-motion: Crossfade rendert dann direkt ohne Animation (ist im
Hook bereits so umgesetzt) — nichts Zusätzliches nötig.
```

### Manuell — danach prüfen

1. Onboarding → „Weiter": alter Content blendet aus, neuer ein, nie beide gleichzeitig ✓
2. Fortschrittsbalken aktualisiert sich sofort ✓
3. DevTools `prefers-reduced-motion: reduce` → direkter Wechsel ✓

---

## Schritt 12.6 — Values-Flow: vollständige URL-Migration auf `/me/values/journey/` 🏗

> Die Values-Journey-Unterseiten liegen noch unter `/recipes/values/`. Sie müssen vollständig nach `/me/values/journey/` umziehen.
>
> **Korrektur ggü. v1 — drei zusätzliche Stellen, die v1 vergessen hat:**
> 1. **Zentrale Registry** `lib/utils/recipes.ts` (`startPath` + `stepPaths` für `values`) — steuert Dashboard-CTAs, Badges und `getRecipeStepPath()`. Ohne diese Änderung bleiben Dashboard-Links auf alten Pfaden.
> 2. **`evaluation`-Route** — der Journey-Meilenstein 8 („Auswertung") verlinkt auf `/recipes/values/evaluation`. v1 hat nur `journal` + `hypothesis` migriert.
> 3. **`STEP_LINKS`-Array** in `app/(app)/me/values/journey/values-journey-client.tsx` (Zeilen ~30–39) — hardcodierte alte Pfade.

### Claude Code Prompt

```
Vollständige URL-Migration der Values-Journey von /recipes/values/* nach
/me/values/journey/*.

1. NEUE ROUTEN anlegen (Inhalt der bestehenden Komponenten vollständig kopieren —
   page.tsx UND die zugehörigen *-form.tsx Client-Komponenten):
   - app/(app)/me/values/journey/journal/page.tsx      (+ journal-form.tsx)
   - app/(app)/me/values/journey/hypothesis/page.tsx   (+ hypothesis-form.tsx)
   - app/(app)/me/values/journey/evaluation/page.tsx   (+ evaluation-form.tsx)
   Die Server Actions liegen in app/(app)/recipes/values/actions.ts — diese bleiben
   vorerst dort; die neuen Seiten importieren sie weiterhin von dort
   (kein Verschieben der actions in diesem Schritt, nur Routen-Umzug).
   Die alten /recipes/values/* Seiten NOCH NICHT löschen (Redirect kommt in 12.8).

2. ZENTRALE REGISTRY lib/utils/recipes.ts — values-Eintrag aktualisieren:
   - startPath: "/recipes/values/hypothesis" → "/me/values/journey/hypothesis"
   - stepPaths: [
       "/me/values/journey/hypothesis",
       "/me/values/journey/journal",
       "/me/values/journey/evaluation",
     ]

3. STEP_LINKS in app/(app)/me/values/journey/values-journey-client.tsx
   (Array ~Zeile 30–39) auf die neuen Pfade umstellen:
   - "/recipes/values/hypothesis"  → "/me/values/journey/hypothesis"
   - "/recipes/values/journal"     → "/me/values/journey/journal"   (alle 7 Einträge)
   - "/recipes/values/evaluation"  → "/me/values/journey/evaluation"

4. BREADCRUMBS / Zurück-Navigation in den neuen Seiten:
   - SubPageHeader backHref auf /me/values/journey setzen
     (in den alten Seiten zeigte er teils auf /recipes/values).
   - In journal-form.tsx und hypothesis-form.tsx alle internen Links
     (z.B. nach Speichern, "zurück zur Übersicht") auf /me/values/journey* anpassen.

5. GESAMTE CODEBASE nach Restvorkommen durchsuchen und ersetzen:
   - "/recipes/values/hypothesis"  → "/me/values/journey/hypothesis"
   - "/recipes/values/journal"     → "/me/values/journey/journal"
   - "/recipes/values/evaluation"  → "/me/values/journey/evaluation"
   - "/recipes/values"             → "/me/values"   (nur reine Übersichts-Links;
     NICHT die actions.ts-Importpfade kaputtmachen!)

NOCH NICHT in diesem Schritt:
- Alte /recipes/values Seiten löschen/redirecten (12.8)
- Journal-Formular inhaltlich vereinfachen (12.7)
- Dashboard-CTA-Feinheiten (12.9) — die Registry-Änderung hier deckt die Pfade ab,
  12.9 kümmert sich um Ziel-Logik & BoR.
```

### Manuell — danach prüfen

1. `/me/values/journey` → Meilenstein antippen → öffnet `/me/values/journey/journal` ✓
2. Hypothese unter `/me/values/journey/hypothesis`, Auswertung unter `/me/values/journey/evaluation` ✓
3. „Zurück" landet auf `/me/values/journey` ✓
4. `npm run build` → keine 404/broken Links, keine kaputten Importe ✓

---

## Schritt 12.7 — Values-Journal: Formular vereinfachen 🐛

> Das Journal-Formular (`journey/journal/journal-form.tsx`) enthält Werte-Chips (`hypothesis.map`), eine „Tag X von 7"-Anzeige und den 7-Tage-Tracker. Diese sollen weg — übrig bleiben nur die zwei Reflexionsfragen + Speichern.
>
> **Wichtig:** Der 7-Tage-Tracker ist mit der Kalenderlogik verdrahtet, die `entry_date = todayKey` setzt (das versteckte Feld, das bestimmt, welcher Tag gespeichert wird). **Nur die sichtbaren Elemente entfernen — die Speicher-/Tageslogik (`todayKey`, das hidden `entry_date`-Input, die `entryByDate`/`startedAt`-Berechnung, die das Speichern steuert) bleibt unangetastet.**

### Claude Code Prompt

```
In app/(app)/me/values/journey/journal/journal-form.tsx nur die folgenden
SICHTBAREN Elemente entfernen:
- Werte-Chips oben (hypothesis.map(...) Block mit den ausgewählten Werten)
- "Tag X von 7"-Anzeige (Math.min(entryCount + 1, 7) von 7)
- 7-Tage-Fortschritts-Tracker (das role="group" aria-label="7-Tage-Fortschritt"
  Block mit dayKeys.map(...))

BEHALTEN (unverändert):
- Frage 1: "Was ist heute passiert?" + Textarea
- Frage 2: "Welche Gedanken und Reaktionen kamen dabei auf?" + Textarea
- Speichern-Button
- SubPageHeader / Zurück-Navigation (aus 12.6)
- Das versteckte <input type="hidden" name="entry_date" value={todayKey} /> und
  die gesamte Tageslogik (todayKey, entryByDate, startedAt, todayEntry, isEditing).
  Diese steuern, welcher Tag gespeichert wird — NICHT entfernen.

Ergebnis: zwei Fragen, zwei Textboxen, ein Speichern-Button. Speichern verhält
sich exakt wie vorher.
```

### Manuell — danach prüfen

1. `/me/values/journey/journal`: keine Werte-Chips, kein Tag-Counter, kein Tracker ✓
2. Nur zwei Fragen + Textboxen + Speichern-Button ✓
3. Eintrag speichern → funktioniert wie vorher, landet korrekt unter heutigem Datum ✓

---

## Schritt 12.8 — Alte `/recipes`-Routen redirecten 🏗

> Alte Rezepte-Routen sollen per Next.js-Redirect auf die neuen Me-Seiten weiterleiten.
>
> **Hinweis:** `next.config.ts` hat aktuell **keinen** `redirects()`-Block — er muss neu angelegt werden. **Korrektur ggü. v1:** `/recipes/values/evaluation` ergänzt.

### Claude Code Prompt

```
In next.config.ts einen redirects()-Block hinzufügen (aktuell existiert keiner;
die Datei enthält nur ein leeres nextConfig-Objekt):

async redirects() {
  return [
    { source: "/recipes", destination: "/dashboard", permanent: false },
    { source: "/recipes/values", destination: "/me/values", permanent: false },
    { source: "/recipes/values/hypothesis",  destination: "/me/values/journey/hypothesis",  permanent: false },
    { source: "/recipes/values/journal",     destination: "/me/values/journey/journal",     permanent: false },
    { source: "/recipes/values/evaluation",  destination: "/me/values/journey/evaluation",  permanent: false },
    { source: "/recipes/bill-of-rights",     destination: "/me/bill-of-rights",             permanent: false },
  ];
}

permanent: false (307), da wir uns Anpassungen offenhalten.

Die alten Seiten-Dateien unter app/(app)/recipes/values/* und
app/(app)/recipes/bill-of-rights/* können vorerst bestehen bleiben — sie werden
durch die Redirects nicht mehr direkt erreicht. (Die generische /recipes/[slug]
und /recipes/overthinking NICHT redirecten — overthinking lebt weiter.)
```

### Manuell — danach prüfen

1. `/recipes` → `/dashboard` ✓
2. `/recipes/values` → `/me/values`; `/recipes/values/evaluation` → `/me/values/journey/evaluation` ✓
3. `/recipes/bill-of-rights` → `/me/bill-of-rights` ✓
4. `npm run build` → kein Fehler ✓

---

## Schritt 12.9 — Dashboard CTAs: URL-Fixes 🐛

> **Korrektur ggü. v1:** Der Values-Pfad im Dashboard kommt aus der Registry (`valuesHref`/`startPath`), die in 12.6 bereits migriert wurde — hier muss vor allem das BoR-Literal an **zwei** Stellen gefixt und das Verhalten der laufenden Werte-CTA geprüft werden.

### Claude Code Prompt

```
In app/(app)/dashboard/page.tsx zwei Dinge prüfen/fixen:

1. BILL OF RIGHTS — das Literal "/recipes/bill-of-rights" kommt an ZWEI Stellen vor
   (ca. Zeile 199 im allDestinations-Array, key "bor", und ca. Zeile 263 in einem
   <Link href="/recipes/bill-of-rights" />). BEIDE auf "/me/bill-of-rights" ändern.

2. VALUES-CTA — Quelle ist valuesHref bzw. continuityRecipe.startPath, die nach
   12.6 bereits aus der migrierten Registry kommen (→ /me/values/journey/*).
   PRÜFEN, dass:
   - Der Fallback `: "/recipes/values/hypothesis"` (in der valuesHref-Definition,
     ca. Zeile 141) ebenfalls auf "/me/values/journey/hypothesis" geändert ist,
     falls 12.6 dieses Literal nicht erfasst hat.
   - Die laufende Werte-CTA ("Setze deine Entdeckungsreise fort") über
     getRecipeStepPath("values", current_step) auf die korrekte neue Journey-URL
     zeigt (Registry liefert das jetzt).

3. Es gibt KEINE separate "Setze fort → /recipes/values/journal"-Direktverlinkung
   mehr, die ins Journal statt in die Übersicht springt — die CTA folgt der
   Registry-Step-Logik. Falls beim Testen die CTA direkt ins Journal statt in die
   Journey-Übersicht führt und das unerwünscht ist, hier den href für die laufende
   Values-CTA explizit auf "/me/values/journey" (Übersicht) setzen.

Restliche Dashboard-Links (overthinking, cleansers) NICHT anfassen.
```

### Manuell — danach prüfen

1. Dashboard → BoR-CTA(s) → `/me/bill-of-rights` ✓
2. Dashboard → Values-CTA (nicht gestartet) → `/me/values/journey/hypothesis` ✓
3. Dashboard → Values-CTA (laufend) → korrekter aktueller Journey-Schritt bzw. Übersicht ✓

---

## Schritt 12.10 — `/me/values`: Button-Position + kontextabhängiger Text 🐛

> `app/(app)/me/values/page.tsx`: Der Button „Geh auf Werteentdeckung" nutzt `className="mt-auto …"`, wird also im (kurzen) Empty State ganz nach unten geschoben und ist ohne Scrollen unsichtbar. Zudem ist der Text statisch.
>
> **Korrektur ggü. v1:** Die Seite fragt aktuell **nur** `values_hypothesis` ab — den Journey-Status (`not_started`/`in_progress`/`completed`) hat sie nicht. Für den kontextabhängigen Text muss `user_recipe_progress` zusätzlich abgefragt werden (wie Dashboard/Journey-Page es tun).

### Claude Code Prompt

```
In app/(app)/me/values/page.tsx (Server Component) zwei Änderungen:

1. STATUS ZUSÄTZLICH LADEN:
   Neben values_hypothesis auch den Werte-Fortschritt abfragen:
     const { data: progress } = await supabase
       .from("user_recipe_progress")
       .select("status")
       .eq("user_id", user.id)
       .eq("recipe_slug", "values")
       .order("cycle_number", { ascending: false })
       .limit(1)
       .maybeSingle();
   const valuesStatus = progress?.status ?? "not_started";

2. BUTTON-POSITION (Empty State):
   Aktuell steht der Button mit "mt-auto" am Seitenende. Im Empty-State-Zweig
   (values.length === 0) den Button DIREKT unter den Empty-State-Text
   ("Du hast noch keine Werte entdeckt.") rendern — ohne mt-auto, sodass er
   sofort sichtbar ist. Im Werte-vorhanden-Zweig kann der Button unten bleiben
   (mt-auto ist dort ok).
   Praktisch: Button-Markup in beide Zweige aufnehmen (oder den Empty-State als
   eigenen Block mit unmittelbar folgendem Button rendern).

3. BUTTON-TEXT kontextabhängig:
   - valuesStatus === "in_progress"  → "Setze deine Werteentdeckung fort"
   - sonst (not_started | completed) → "Geh auf Werteentdeckung"
   Link in beiden Fällen: /me/values/journey

Bestehendes Styling (w-full, gap-2, ArrowRight-Icon) beibehalten.
```

### Manuell — danach prüfen

1. `/me/values` ohne laufende Entdeckung → Button direkt unter Empty-State-Text, Text „Geh auf Werteentdeckung" ✓
2. `/me/values` mit laufender Entdeckung → Text „Setze deine Werteentdeckung fort" ✓
3. Button → `/me/values/journey` ✓

---

## Schritt 12.11 — `/me/values`: Intro-Sequenz (RecipeIntroGate) übernehmen 🐛

> **Korrektur ggü. v1 (wichtig):** Auf `/me/values` gibt es **aktuell gar keine** Intro-Sequenz — die Seite ist eine reine Server-Komponente. Die Values-Intro lief bisher nur über die generische `/recipes/[slug]`-Route, die den Inhalt in `RecipeIntroGate` wrappt. Dasselbe Muster übernehmen wir hier (kein Neubau).
>
> `RecipeIntroGate` (`components/recipes/recipe-intro-gate.tsx`) erledigt **beides** in einer Komponente: beim ersten Besuch die durchklickbare Vollbild-Sequenz (markiert danach `intro_seen`), danach die eingeklappte „Worum geht's?"-Collapsible oben. Karten für „values" sind in `lib/utils/recipe-intros.ts` (`getRecipeIntro("values")`) vorhanden; Getter ist `hasSeenRecipeIntro("values")`.

### Claude Code Prompt

```
In app/(app)/me/values/page.tsx die Values-Intro nach dem Muster von
app/(app)/recipes/[slug]/page.tsx übernehmen.

1. Imports ergänzen:
   import { getRecipeIntro } from "@/lib/utils/recipe-intros";
   import { hasSeenRecipeIntro } from "@/app/(app)/recipes/actions";
   import { RecipeIntroGate } from "@/components/recipes/recipe-intro-gate";

2. In der Server Component laden:
   const introCards = getRecipeIntro("values");
   const introSeen = await hasSeenRecipeIntro("values");

3. Den bestehenden Seiteninhalt (alles unter dem SubPageHeader: Werte-Liste /
   Empty State + Button aus 12.10) in <RecipeIntroGate> wrappen:

     <RecipeIntroGate slug="values" cards={introCards} introSeen={introSeen}>
       … bestehender Werte-Inhalt …
     </RecipeIntroGate>

   Der SubPageHeader bleibt außerhalb des Gates (immer sichtbar).

VERHALTEN (durch RecipeIntroGate automatisch):
- Erster Besuch (intro_seen == false): die durchklickbare Intro-Sequenz erscheint
  zuerst und gibt nach Complete/Skip den Inhalt frei + markiert intro_seen.
- Folgebesuche: oben die eingeklappte "Worum geht's?"-Collapsible, darunter der Inhalt.

Kein localStorage nötig — intro_seen wird serverseitig pro Slug gespeichert.
```

### Manuell — danach prüfen

1. Test-Account ohne Werte, Values-Intro noch nie gesehen → `/me/values` → Intro-Sequenz startet automatisch ✓
2. Intro durchklicken/skippen → Inhalt erscheint, oben „Worum geht's?"-Collapsible (eingeklappt) ✓
3. Erneuter Besuch → keine Vollbild-Sequenz mehr, nur die Collapsible ✓

---

## Schritt 12.12 — Journey: Maskottchen verkleinern + Schloss-Icons auf gesperrten Stufen ✨

> Auf `/me/values/journey` überdeckt das Maskottchen den Meilenstein-Text „Wertehypothese aufstellen"; gesperrte Stufen brauchen ein Schloss-Signal. (Datei: `values-journey-client.tsx`. Maskottchen ist `<Mascot size="sm" expression="curious" gazeY={-1} />`, positioniert über `MASCOT_PX`/`mascotTop`.)

### Claude Code Prompt

```
In app/(app)/me/values/journey/values-journey-client.tsx:

1. MASKOTTCHEN VERKLEINERN:
   Das aktive Maskottchen (<Mascot size="sm" …>) und seine Positionsmaße
   (Konstante MASCOT_PX und die mascotTop-Berechnung) so reduzieren, dass der
   Meilenstein-Text "Wertehypothese aufstellen" vollständig lesbar bleibt
   (~20–30% kleiner). MASCOT_PX entsprechend verkleinern, damit mascotTop
   (currentStep * STEP_H + DOT_CENTER - MASCOT_PX / 2) weiterhin sauber zentriert.

2. SCHLOSS-ICON AUF GESPERRTEN STUFEN:
   Meilensteine, die weder abgeschlossen (done.has(i)) noch der aktive
   (i === currentStep) sind, sind "gesperrt". Auf diesen ein kleines Lock-Icon
   (aus lucide-react) im Meilenstein-Kreis anzeigen.
   - Farbe: gedämpft (var(--muted-foreground) oder text-muted-foreground)
   - Größe: klein, nicht dominierend (z.B. size-3 / size-4)
   - Abgeschlossene und der aktive Meilenstein: KEIN Schloss.
```

### Manuell — danach prüfen

1. `/me/values/journey`: „Wertehypothese aufstellen"-Text vollständig lesbar ✓
2. Gesperrte Meilensteine zeigen Schloss-Icon ✓
3. Aktiver + abgeschlossene Meilensteine: kein Schloss ✓

---

## Schritt 12.13 — Journey: Tag-Freischaltung erst am echten nächsten Kalendertag 🐛

> **Neu gefasst ggü. v1.** Ursache beider Symptome ist dieselbe: Die Journey-Page (`app/(app)/me/values/journey/page.tsx`) berechnet `completed`/`currentStep` rein aus der **Anzahl** eindeutiger Reflexionstage — **ohne Kalender-Gating**. Nach Abschluss von Tag 1 ist `currentStep = 2`, das Maskottchen springt auf Tag 2, und Tag 2 ist klickbar. Da das Journal immer den **heutigen** Eintrag (`entry_date = todayKey`) editiert, öffnet der Klick auf Tag 2 am selben Tag faktisch Tag 1 → das ist „Bug 2".
>
> **Konsequenz:** Es genügt, das Kalender-Gating in der Journey-Page zu ergänzen (Bug 1). Dann ist Tag N+1 erst am nächsten Kalendertag aktiv/klickbar, und „Bug 2" verschwindet automatisch — **ein separater Day-Index-Parameter ist nicht nötig** (das Journal nimmt ohnehin keinen entgegen).
>
> **Keine neue DB-Spalte:** `journal_entries.entry_date` enthält bereits das Kalenderdatum jedes Tages und wird in `page.tsx` schon geladen. **Zeitzone: lokale Zeit des Users.**

### Claude Code Prompt

```
In app/(app)/me/values/journey/page.tsx das Kalender-Gating für die
Tages-Freischaltung ergänzen. Es wird KEINE neue DB-Spalte und KEIN neuer
URL-Parameter benötigt.

KONTEXT (heute):
- dailyEntries liefert entry_date je Reflexionstag.
- completed.add(i) für i=1..dailyCount (dailyCount = Anzahl eindeutiger entry_date).
- currentStep = erster nicht erledigter Schritt → Maskottchen sitzt dort.

NEUES VERHALTEN:
1. Heutiges Datum als lokalen Tagesschlüssel bestimmen (YYYY-MM-DD, lokale Zeit
   des Users — analog zu getTodayKey() in der bisherigen journal-form.tsx).
2. Den höchsten/neuesten entry_date unter dailyEntries ermitteln (latestEntryDate).
3. GATING: Wenn der zuletzt abgeschlossene Reflexionstag HEUTE abgeschlossen wurde
   (latestEntryDate === todayKey), darf der NÄCHSTE Tag noch nicht aktiv werden.
   In diesem Fall currentStep so begrenzen, dass das Maskottchen auf dem zuletzt
   abgeschlossenen Tag sitzt (nicht auf dem nächsten):
     - Standard: currentStep = erster nicht erledigter Schritt (wie bisher).
     - Wenn latestEntryDate === todayKey UND currentStep entspräche dem nächsten,
       noch nicht freigeschalteten Tag → currentStep auf den zuletzt abgeschlossenen
       Tagesindex zurücksetzen (Maskottchen bleibt auf dem heute erledigten Tag).
   Hypothese (Schritt 0) und Auswertung bleiben von diesem Gating unberührt
   (nur die Tage 1–7 werden kalendergated).
4. Tag 1 ist immer verfügbar, sobald die Hypothese abgeschlossen ist.

5. Im Client (values-journey-client.tsx) sicherstellen, dass nur Meilensteine bis
   einschließlich currentStep klickbar sind; spätere Tage sind gesperrt (Schloss
   aus 12.12, gedämpfte Opacity). Da alle Tage über STEP_LINKS ohnehin auf
   /me/values/journey/journal zeigen und das Journal den heutigen Tag editiert,
   ist nach dem Gating garantiert, dass ein klickbarer Tag == heutiger Tag ist.

ERGEBNIS:
- Nach Abschluss von Tag 1 (heute): Maskottchen bleibt auf Tag 1, Tag 2 gesperrt.
- Am nächsten Kalendertag: latestEntryDate < todayKey → Tag 2 wird aktiv/klickbar,
  Maskottchen rückt auf Tag 2, Klick öffnet korrekt die (heutige) Tag-2-Reflexion.
```

### Manuell — danach prüfen

1. Tag-1-Reflexion speichern → zurück zur Journey → Maskottchen sitzt auf **Tag 1** ✓
2. Tag 2 ausgegraut + Schloss, nicht klickbar ✓
3. Testen Tageswechsel: jüngsten `entry_date` in Supabase manuell auf gestern setzen → Tag 2 wird freigeschaltet ✓
4. Tag 2 antippen (nach Freischaltung) → öffnet korrekt heutige Tag-2-Reflexion (nicht Tag 1) ✓

---

## Schritt 12.14 — `/me/bill-of-rights`: Empty State + Button-Positionen 🐛

> Datei: `app/(app)/me/bill-of-rights/bill-of-rights-me.tsx`. Empty State (Zeilen ~110–114) zeigt Text „Du hast noch keine Rechte definiert." + Button „Dein erstes Recht hinzufügen" (→/add). Die zwei Aktions-Buttons „Manuell hinzufügen"/„Vorschlag generieren" stehen unten (Zeilen ~178–185).

### Claude Code Prompt

```
In app/(app)/me/bill-of-rights/bill-of-rights-me.tsx drei Anpassungen:

1. BUTTON ENTFERNEN:
   Den Button "Dein erstes Recht hinzufügen" (im Empty-State-Block, ~Zeile 112–114)
   vollständig entfernen.

2. EMPTY-STATE-TEXT ERWEITERN:
   "Du hast noch keine Rechte definiert."
   → "Du hast noch keine Rechte definiert.\nFüge dein erstes Recht hinzu."
   (zweiter Satz als eigene Zeile)

3. AKTIONS-BUTTONS IM EMPTY STATE NACH OBEN:
   Die beiden Aktions-Elemente "Manuell hinzufügen" (→/me/bill-of-rights/add) und
   "Vorschlag generieren" (→/me/bill-of-rights/generate), die aktuell unten stehen,
   im Empty-State (activeRights.length === 0) DIREKT unter den Empty-State-Text
   rendern, sodass sie ohne Scrollen sichtbar sind.
   Bei vorhandenen Rechten bleiben die Buttons an ihrer bisherigen Position unten.
```

### Manuell — danach prüfen

1. Leerer Account → `/me/bill-of-rights`: kein „Dein erstes Recht"-Button ✓
2. Empty-State-Text zeigt beide Sätze ✓
3. „Manuell hinzufügen" + „Vorschlag generieren" direkt unter dem Text, ohne Scrollen ✓
4. Mit vorhandenen Rechten: Buttons unten an bisheriger Stelle ✓

---

## Schritt 12.15 — `/me/bill-of-rights`: „Worum geht's"-Collapsible auf allen 3 Seiten 🐛

> **Präzisiert ggü. v1.** Es gibt zwei verschiedene Intro-Mechanismen, die nicht verwechselt werden dürfen:
> - **Vollbild-`RecipeIntro`** (durchklickbare Sequenz, erster Besuch) — `bill-of-rights-me.tsx` hat sie bereits.
> - **`RecipeIntroCollapsible`** (persistente, eingeklappte „Worum geht's?"-Kachel) — fehlt im `/me`-Flow.
>
> Saubere Lösung: Auf dem **Hub** (`/me/bill-of-rights`) auf `RecipeIntroGate` umstellen (liefert beides: Erstbesuch-Sequenz **und** Collapsible — genau wie `/me/values` nach 12.11). Auf den **Unterseiten** (`/add`, `/generate`) reicht die bloße `RecipeIntroCollapsible` oben (keine Erstbesuch-Sequenz nötig).

### Claude Code Prompt

```
"Worum geht's?"-Collapsible auf allen drei /me/bill-of-rights-Seiten ergänzen.
Inhalte kommen aus getRecipeIntro("bill-of-rights").

A) HUB /me/bill-of-rights (bill-of-rights-me.tsx):
   Den bestehenden bloßen RecipeIntro-Erstbesuch-Block durch RecipeIntroGate ersetzen
   (analog zu /me/values aus 12.11), damit zusätzlich die eingeklappte
   "Worum geht's?"-Collapsible dauerhaft oben erscheint:
   - Imports: RecipeIntroGate, getRecipeIntro (hasSeenRecipeIntro/introSeen wird
     bereits über das page.tsx als prop "introSeen" hereingereicht — diesen Wert
     an das Gate weitergeben).
   - Den Seiteninhalt (Empty State / Rechteliste / Aktions-Buttons aus 12.14) in
     <RecipeIntroGate slug="bill-of-rights" cards={getRecipeIntro("bill-of-rights")}
       introSeen={introSeen}> … </RecipeIntroGate> wrappen.
   - Den alten manuellen RecipeIntro-Block (mit introDismissed-State und direktem
     <RecipeIntro …/>) entfernen — das Gate übernimmt diese Logik.

B) UNTERSEITEN /me/bill-of-rights/add und /me/bill-of-rights/generate:
   Jeweils oben (unter dem SubPageHeader, vor dem Hauptinhalt) einbinden:
     import { RecipeIntroCollapsible } from "@/components/recipes/recipe-intro-collapsible";
     import { getRecipeIntro } from "@/lib/utils/recipe-intros";
     …
     <RecipeIntroCollapsible cards={getRecipeIntro("bill-of-rights") ?? []} />
   (Initial eingeklappt — Standardverhalten der Komponente. Keine Erstbesuch-
   Sequenz auf den Unterseiten.)
```

### Manuell — danach prüfen

1. `/me/bill-of-rights` (Folgebesuch): „Worum geht's?"-Collapsible oben, eingeklappt; aufklappbar ✓
2. Erster Besuch: Vollbild-Intro-Sequenz wie bisher, danach Collapsible ✓
3. `/me/bill-of-rights/add` und `/generate`: jeweils dieselbe Collapsible oben ✓

---

## Schritt 12.16 — `/me/bill-of-rights/generate`: Mittlere Frage entfernen 🐛

> Datei: `app/(app)/me/bill-of-rights/generate/page.tsx`. Drei Felder: `p1` (Situation), `p2` „Welche innere Regel hat dich dabei zurückgehalten?", `p3` (Wunsch/Idealreaktion). `p2` soll weg.
>
> **Vollständige Kette (v1 hat Teile übersehen):** `p2` wird in `generate()` mit `[p1, p2].join("\n\n")` ins `situation`-Feld der API gepackt **und** als `prompt2` gespeichert. Die API-Route (`/api/rights-formulator`) nimmt nur `{ situation, idealReaction }` und filtert Leerwerte (`.filter(Boolean)`) → **kein `undefined`-Risiko**. **Frage 5 — Schema:** `prompt2` wird nirgends gelesen/angezeigt (nur geschrieben); daher künftig sauber `content = { prompt1, prompt3 }` speichern. Alt-Einträge mit `prompt2` bleiben unberührt (nichts liest sie).

### Claude Code Prompt

```
In app/(app)/me/bill-of-rights/generate/page.tsx die mittlere Frage entfernen:

1. UI: Label + Textarea für p2 ("Welche innere Regel hat dich dabei
   zurückgehalten?") entfernen. State `const [p2, setP2] = useState("")` entfernen.

2. canGenerate anpassen:
   (p1.trim() || p2.trim() || p3.trim())  →  (p1.trim() || p3.trim())

3. generate(): den situation-Join anpassen — p2 entfernen:
   const situation = [p1.trim(), p2.trim()].filter(Boolean).join("\n\n")
   →  const situation = p1.trim();
   (idealReaction: p3.trim() bleibt unverändert.)

4. Hidden Input für prompt2 entfernen:
   <input type="hidden" name="prompt2" value={p2} />  → löschen.
   (prompt1 und prompt3 hidden Inputs behalten.)

5. In app/(app)/me/bill-of-rights/actions.ts (saveGeneratedRightAction) das
   gespeicherte content-Objekt von { prompt1, prompt2, prompt3 } auf
   { prompt1, prompt3 } umstellen und die Zeile
   `const prompt2 = (formData.get("prompt2") …)` entfernen.
   (prompt2 wird nirgends gelesen/angezeigt — kein Read-Pfad betroffen.
    Bestehende DB-Einträge mit prompt2 bleiben gültig und unberührt.)

Die API-Route /api/rights-formulator NICHT ändern — sie nimmt situation/idealReaction
und tolerierte Leerwerte bereits.
```

### Manuell — danach prüfen

1. `/me/bill-of-rights/generate`: nur zwei Fragen (Situation + Wunsch) ✓
2. Mittlere Frage komplett weg ✓
3. Vorschlag generieren → funktioniert mit zwei Antworten ✓
4. Vorschlag übernehmen → speichert ohne Fehler (`{ prompt1, prompt3 }`) ✓

---

## Schritt 12.17 — Bill of Rights Kacheln: § + Nummer in Gold ✨

> Die Rechte-Kacheln (`activeRights.map` in `bill-of-rights-me.tsx`, ~Zeile 118–166) sollen links ein „§ N" in Gold erhalten.

### Claude Code Prompt

```
In app/(app)/me/bill-of-rights/bill-of-rights-me.tsx in der activeRights.map(...)
jede Rechte-Kachel um ein Paragrafenzeichen mit fortlaufender Nummer ergänzen:

- Links in der Kachel "§ {index + 1}" (1-basiert, in Anzeigereihenfolge).
- Farbe: text-primary (Gold).
- Schriftgröße größer als der Rechtetext (z.B. text-lg/text-xl), font-semibold.
- Heading-Font, falls vorhanden (font-heading / Fraunces), für eleganteres §.
- Layout: flex-row, links das § (feste Breite ~w-12, vertikal zentriert),
  rechts der Rechtetext (flex-1).
- Hintergrund/Schatten/Padding der Kachel sonst unverändert.
- Index aus dem map-Callback nutzen: activeRights.map((r, i) => …).
```

### Manuell — danach prüfen

1. `/me/bill-of-rights` mit ≥2 Einträgen: jede Kachel zeigt links „§ 1", „§ 2" … in Gold ✓
2. § prominent, aber nicht überwältigend; Rechtetext gut lesbar ✓

---

## Schritt 12.18 — `/me/bill-of-rights`: Maskottchen als Richter ✨

> Oben auf der Seite soll das Maskottchen in Richter-Verkleidung (Perücke + Robe) erscheinen.

### Claude Code Prompt

```
Auf /me/bill-of-rights (bill-of-rights-me.tsx) oben — unter dem Header, vor der
"Worum geht's?"-Collapsible (12.15) — ein Maskottchen in Richter-Verkleidung
anzeigen.

UMSETZUNG (SVG-Erweiterung um die bestehende Mascot-Figur):
1. Bestehende Mascot-Komponente als Basis nutzen.
2. Richter-Kostüm als SVG-Elemente:
   a. Perücke: heller (weiß/hellgrau) geschwungener Halbkreis / Locken-Silhouette
      über dem Kopf.
   b. Robe: dunkles Rechteck/Trapez unter dem Kopf; optional kleines weißes
      Jabot-Dreieck am Ausschnitt.
3. Größe: ca. 100–120px Gesamthöhe, zentriert.
4. Blick geradeaus oder leicht nach unten (würdevoll).
5. Falls die Mascot-Komponente keine einfache Erweiterung erlaubt, eine separate
   Variante components/brand/mascot-judge.tsx anlegen.

Nur auf /me/bill-of-rights — nicht auf anderen Seiten.
```

### Manuell — danach prüfen

1. `/me/bill-of-rights`: Maskottchen mit Perücke + Robe oben sichtbar ✓
2. Gut erkennbar, nicht zu groß; Seite bleibt nutzbar ✓
3. Andere Seiten zeigen kein Richter-Maskottchen ✓

---

## Schritt 12.19 — Login → Onboarding: Übergangsanimation (Wow-Moment) ✨

> Nach erstem Login (neue User) springt das Login-Maskottchen (jetzt oben, schaut nach unten — aus 12.2) nach unten, zeigt Freude und fadet aus; dann startet das Onboarding.
>
> **Baut auf 12.0 (`from="top"`), 12.2 (Maskottchen oben) und 12.4 (Onboarding-Schritt-Merge) auf.** Post-Login-Flow vorher in der bestehenden Implementierung verifizieren (`components/dashboard/dashboard-reveal.tsx` / `POST_LOGIN_KEY`, sowie `(app)/layout.tsx`-Redirect nach `/onboarding` bei `onboarding_completed === false`).

### Claude Code Prompt

```
Übergangsanimation nach erstem Login (onboarding_completed === false), bevor
das Onboarding (app/onboarding/page.tsx, Schritt "name") erscheint.

ZUERST verifizieren, wie der Post-Login-Übergang heute läuft:
- components/dashboard/dashboard-reveal.tsx und POST_LOGIN_KEY
- app/(app)/layout.tsx leitet bei nicht abgeschlossenem Onboarding auf /onboarding.
Das Overlay soll als erstes innerhalb des Onboarding-Flows (oder als Übergang
direkt davor) erscheinen, nur beim allerersten Mal.

ABLAUF (~2.5s, GSAP-Timeline):
a. Maskottchen springt von oben in die Bildschirmmitte
   (translateY 0 → ~+45% Viewport, ease "back.in(1.5)", ~400ms)
b. Aufprall-Bounce in der Mitte (scale 1 → 1.15 → 0.95 → 1, ~400ms)
c. Expression → "sehr glücklich" (falls Mascot mehrere Expressions unterstützt;
   sonst bestehende freundliche Expression beibehalten)
d. Leichtes Hüpfen (translateY 0 → -15px → 0, 2×, ~500ms)
e. Fade-out (opacity 1 → 0, ~400ms)
f. Onboarding Schritt "name" blendet ein (opacity 0 → 1, ~300ms)

TECHNIK:
- GSAP-Timeline. Overlay-Ebene fixed, fullscreen, z-50, bg var(--background).
- Nach Abschluss Overlay unmounten, OnboardingFlow nimmt den Screen ein.
- Nur beim ersten Onboarding-Eintritt (onboarding_completed === false).
- Wiederkehrende User: kein Overlay (gehen ohnehin direkt aufs Dashboard).
- prefers-reduced-motion (useReducedMotion-Hook): Maskottchen erscheint direkt
  zentriert (kein Springen/Wackeln), nach ~800ms Fade, dann Onboarding.
```

### Manuell — danach prüfen

1. Neuer Test-Account → Login → Maskottchen springt, bounct, strahlt, fadet aus ✓
2. Onboarding Schritt 1 („name", aus 12.4) sanft eingeblendet ✓
3. Dauer ~2.5s ✓
4. Wiederkehrender User: kein Overlay, direkter Dashboard-Sprung ✓
5. `prefers-reduced-motion`: kurzes zentriertes Bild, schneller Fade, kein Springen ✓

---

## Checkliste Phase 12

### 🏗 Infra / Struktur
- [ ] 12.0  MascotPeek: `from="top"`-Variante (y:-90) ergänzt, Bestandsaufrufe intakt
- [ ] 12.6  Routen + Registry (`lib/utils/recipes.ts`) + STEP_LINKS + evaluation migriert
- [ ] 12.8  Redirects in `next.config.ts` (inkl. `/recipes/values/evaluation`)

### 🐛 Bug Fixes
- [ ] 12.1  Globales Scroll-to-Top im Root-Layout (`behavior: "instant"`)
- [ ] 12.2  Login-Maskottchen oben, Blick nach unten — beide Instanzen in `auth-reveal.tsx`
- [ ] 12.3  Onboarding: safe-area-inset-top am Logo-Container in `onboarding/layout.tsx`
- [ ] 12.4  Onboarding: `"welcome"` aus STEPS entfernt, Copy in `name`-Schritt, Counter „von 8"
- [ ] 12.7  Values-Journal: nur 2 Fragen; Tageslogik/`entry_date` unangetastet
- [ ] 12.9  Dashboard: BoR an 2 Stellen → `/me/bill-of-rights`; Values-CTA via Registry geprüft
- [ ] 12.10 `/me/values`: Button im Empty State direkt unter Text, Text kontextabhängig (+Status-Query)
- [ ] 12.11 `/me/values`: Inhalt in `RecipeIntroGate slug="values"` gewrappt (Auto-Start)
- [ ] 12.13 Journey: Kalender-Gating (lokale Zeit), Maskottchen bleibt auf heute erledigtem Tag
- [ ] 12.14 `/me/bill-of-rights`: „Dein erstes Recht"-Button weg, Aktions-Buttons im Empty State oben, Text erweitert
- [ ] 12.15 `/me/bill-of-rights`: Hub via RecipeIntroGate; `/add` + `/generate` mit RecipeIntroCollapsible
- [ ] 12.16 `/me/bill-of-rights/generate`: p2 entfernt (UI, canGenerate, situation-Join, hidden input, Schema `{prompt1,prompt3}`)

### ✨ Verbesserungen & Features
- [ ] 12.5  Onboarding: Crossfade-Übergänge (Token = Step)
- [ ] 12.12 Journey: Maskottchen kleiner, Schloss-Icon auf gesperrten Stufen
- [ ] 12.17 Bill of Rights Kacheln: „§ N" links in Gold (Heading-Font)
- [ ] 12.18 `/me/bill-of-rights`: Maskottchen in Richterrobe + Perücke
- [ ] 12.19 Login → Onboarding: GSAP-Übergangsanimation (baut auf 12.0/12.2/12.4)

---

## Codebase-Referenz (verifiziert)

| Schritt | Primär betroffene Datei(en) |
|---------|------------------------------|
| 12.0 | `components/brand/mascot-peek.tsx` |
| 12.1 | `components/layout/scroll-to-top.tsx` (neu), `app/layout.tsx` |
| 12.2 | `components/auth/auth-reveal.tsx` (2× MascotPeek) |
| 12.3 | `app/onboarding/layout.tsx` |
| 12.4 | `app/onboarding/page.tsx` |
| 12.5 | `app/onboarding/page.tsx`, `components/dashboard/crossfade.tsx` (+ ggf. nach `components/ui/` verschieben) |
| 12.6 | neue `app/(app)/me/values/journey/{journal,hypothesis,evaluation}/*`; `lib/utils/recipes.ts`; `app/(app)/me/values/journey/values-journey-client.tsx` (STEP_LINKS) |
| 12.7 | `app/(app)/me/values/journey/journal/journal-form.tsx` |
| 12.8 | `next.config.ts` |
| 12.9 | `app/(app)/dashboard/page.tsx` (BoR-Literale ~Z.199 & ~Z.263; valuesHref ~Z.141) |
| 12.10 | `app/(app)/me/values/page.tsx` |
| 12.11 | `app/(app)/me/values/page.tsx` (+ `RecipeIntroGate`, `hasSeenRecipeIntro`, `getRecipeIntro`) |
| 12.12 | `app/(app)/me/values/journey/values-journey-client.tsx` |
| 12.13 | `app/(app)/me/values/journey/page.tsx` (+ Client für Klickbarkeit) |
| 12.14 | `app/(app)/me/bill-of-rights/bill-of-rights-me.tsx` |
| 12.15 | `bill-of-rights-me.tsx`; `app/(app)/me/bill-of-rights/{add,generate}/page.tsx` |
| 12.16 | `app/(app)/me/bill-of-rights/generate/page.tsx`; `app/(app)/me/bill-of-rights/actions.ts` |
| 12.17 | `app/(app)/me/bill-of-rights/bill-of-rights-me.tsx` |
| 12.18 | `bill-of-rights-me.tsx` (+ ggf. `components/brand/mascot-judge.tsx`) |
| 12.19 | `app/onboarding/page.tsx`, `components/dashboard/dashboard-reveal.tsx`, `components/brand/mascot-peek.tsx` |

---

## Hinweise für Claude Code

- **Reihenfolge:** 12.0 vor 12.2/12.19. 12.6 vor 12.7–12.11. Registry-Migration (12.6) ist die Klammer — ohne sie zeigt `npm run build` zwar grün, aber Live-Navigation ist inkonsistent.
- **Scroll-to-Top (12.1):** `behavior: "instant"` — kein smooth-Scroll.
- **Safe Area (12.3):** `viewport-fit=cover` + `statusBarStyle: "black-translucent"` sind in `app/layout.tsx` bereits gesetzt — nur der Inset am Logo-Container fehlt.
- **Counter (12.4):** dynamisch über `STEPS.length` — niemals eine feste „9"/„8" hardcoden.
- **URL-Migration (12.6):** Erst neue Routen + Registry + alle Links fixen, dann (12.8) redirecten. `actions.ts`-Importpfade beim Such-Ersetzen nicht versehentlich umbiegen.
- **Redirects (12.8):** `permanent: false` (307); ausschließlich über `next.config.ts`, kein Inline-Redirect in Seitenkomponenten.
- **12.13:** Keine neue DB-Spalte — `journal_entries.entry_date` ist die Quelle; **lokale** Zeit des Users; Bug 2 löst sich durch das Gating automatisch, kein Day-Index-Param.
- **12.16:** API-Route bleibt unverändert; nach Entfernen von p2 ist `situation = p1.trim()`; Speicher-Schema `{ prompt1, prompt3 }`.
- **GSAP (12.19):** nur für die Sequenz; `prefers-reduced-motion` via `useReducedMotion`-Hook abfangen.
- **Design-Tokens:** ausschließlich `globals.css`-Variablen (`--primary`, `--muted`, `--background` …) — keine hardcodierten Farben.
- **Commits:** nach jedem Schritt `npm run build` → grün → Commit `Phase 12.X: [kurze Beschreibung]`.
