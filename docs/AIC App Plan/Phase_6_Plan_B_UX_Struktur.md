# Plan B — UX & Struktur

> **Ziel:** Den funktionierenden MVP von „es funktioniert" zu „es fühlt sich gut an" bringen. Fokus auf Orientierung, Mobile-Tauglichkeit, Personalisierung und einen einladenden ersten Eindruck.
>
> **Voraussetzung:** Plan A (Hotfixes) abgeschlossen.
>
> **Realistische Dauer:** mehr als eine Woche, wenn jeder Schritt sauber getestet und committet wird (besonders 6.9 und 6.5 sind groß). Lieber in Etappen als unter Zeitdruck.
>
> Die Schritt-IDs sind aus der ursprünglichen Phase-6-Nummerierung übernommen (stabile Querverweise). Die Ausführungsreihenfolge steht unten.

-----

## Ausführungsreihenfolge

**Etappe 1 — unabhängige Quick Wins (keine Abhängigkeiten, beliebige Reihenfolge):**

1. **6.6** Onboarding-Empfehlung aufs Dashboard durchreichen — *am bug-nächsten: frischer User bekommt seine Wahl sonst ignoriert; chirurgisch, kein DB-Change → bewusst zuerst*
2. **6.4** Dashboard entschlacken & Hierarchie — *eigenständig*
3. **6.9** Werte auf Deutsch (ID-basiert) — *eigenständig; **Achtung:** ändert auch die `confirmedValues`-Anzeige auf der Values-Hub-Seite, die 6.3 später umbaut → siehe Hinweis bei 6.3*
4. **6.11** Mantra Cleanser editierbar — *eigenständig; **erste DB-Migration** (siehe Migrations-Abschnitt)*

**Etappe 2 — der zusammenhängende Struktur-Block (Reihenfolge einhalten):**

5. **6.3** Navigation, Orientierung & Values-Hub — *baut den Rahmen für 6.10 und 6.5*
6. **6.10** Rezept-Einleitungen — *hängt sich in den Rahmen aus 6.3 ein; **DB-Migration** (`intro_seen`)*
7. **6.12** Cleanser-Intros — *nutzt die Intro-Infrastruktur aus 6.10 wieder; **DB-Migration** (`cleanser_intro_seen`)*
8. **6.5** Bill of Rights als 3-Schritt-Flow — *zuletzt, baut auf 6.3 + 6.10 auf; **absorbiert 6.7** (siehe unten)*

**Jederzeit einschiebbar:**

- **6.13** Auth-Seite (Split-Layout + Reframe) — gestalterisch eigenständig, keine Abhängigkeiten. Da es der erste Eindruck ist, nicht bis ganz zum Schluss liegen lassen — gut als „kreative Pause" zwischen den funktionalen Schritten.

> **Wichtiger Reihenfolge-Hinweis zu 6.7 (Completion-Kriterien):** 6.7 ist als eigener Schritt unten dokumentiert, sollte aber **innerhalb von 6.5b** umgesetzt werden — sonst landet die „X von 3"-Anzeige zuerst im alten Layout und wird von 6.5 gleich wieder umgebaut. Wenn du 6.5 jetzt noch nicht angehst, kannst du 6.7 auch isoliert vorab machen; rechne dann mit etwas Nacharbeit in 6.5.

-----

## Datenbank-Migrationen (Überblick)

Drei Schritte brauchen manuelles SQL im Supabase SQL Editor. Das jeweilige SQL wird **im Prompt des Schritts** erzeugt (kontextgenau) — hier nur der Überblick, damit du nicht überrascht wirst:

| Schritt | Migration |
|---------|-----------|
| 6.11 | Tabellen `user_mantra` + `mantra_cards` (inkl. RLS) |
| 6.10 | Spalte `intro_seen BOOLEAN NOT NULL DEFAULT false` an `user_recipe_progress` |
| 6.12 | Tabelle `cleanser_intro_seen` (inkl. RLS) |

> **Empfehlung (Reproduzierbarkeit):** Lege im Repo einen Ordner `supabase/migrations/` an und speichere jedes ausgeführte SQL als nummerierte Datei (z.B. `001_mantra.sql`). Das Repo hat aktuell keine Migrations-Historie — so bleibt das Schema nachvollziehbar und auf einer frischen DB wiederherstellbar. Bitte Claude Code im jeweiligen Schritt, das SQL **zusätzlich als Datei** unter `supabase/migrations/` abzulegen, nicht nur als Editor-Block.

-----

## Schritt 6.6: Onboarding-Empfehlung aufs Dashboard durchreichen ❓

> **Geklärt:** Der Onboarding-Grund *wird* persistiert — aber nicht als Roh-String. `completeOnboardingAction` (in `app/onboarding/onboarding.actions.ts`) übersetzt den `reason` über `RECIPE_MAP` in eine Slug und speichert diese als `profiles.active_recipe_id`. Das Dashboard nutzt `active_recipe_id` auch bereits.
> 
> **Die eigentliche Lücke:** Auf dem Dashboard verlangt `hasActiveRecipe` zusätzlich eine vorhandene Fortschritts-Zeile (`activeProgress` mit Status ≠ completed). Direkt nach dem Onboarding hat der User aber `active_recipe_id` gesetzt, jedoch **noch keine** `user_recipe_progress`-Zeile (er hat ja noch nicht gestartet). Dadurch wird `hasActiveRecipe` = false, und `suggestedRecipe` fällt auf *“erstes verfügbares, unabgeschlossenes Rezept”* zurück — **die Onboarding-Wahl wird ignoriert**, bis der User das Rezept manuell startet.

### Bestehendes Mapping (nicht neu erfinden!)

Das Mapping lebt bereits in `RECIPE_MAP` in `onboarding.actions.ts` und ist bewusst so gesetzt:

|Onboarding-Grund |active_recipe_id                                                            |
|-----------------|----------------------------------------------------------------------------|
|`know-myself`    |`values`                                                                    |
|`struggle-say-no`|`overthinking` *(nicht bill-of-rights — Saying-No-Rezept noch nicht gebaut)*|
|`overthink`      |`overthinking`                                                              |
|`more-confidence`|`values`                                                                    |


> Wir ändern dieses Mapping **nicht**. Der Fix sitzt allein im Dashboard.

### Claude Code Prompt

```
Sorge dafür, dass die im Onboarding gesetzte active_recipe_id auf dem Dashboard
als Empfehlung erscheint, auch wenn der User das Rezept noch nicht gestartet
hat (also noch keine user_recipe_progress-Zeile existiert).

Datei: app/(app)/dashboard/page.tsx

Aktuell:
- hasActiveRecipe verlangt activeRecipe.available && activeProgress &&
  activeProgress.status !== "completed".
- suggestedRecipe = hasActiveRecipe ? undefined :
    RECIPES.find(r => r.available && !completedSlugs.has(r.slug))
  -> ignoriert active_recipe_id, wenn noch kein Progress da ist.

Gewünscht:
- Wenn KEIN aktiver Fortschritt vorliegt, soll suggestedRecipe BEVORZUGT das
  Rezept zu active_recipe_id sein — sofern es verfügbar und nicht abgeschlossen
  ist. Konkret:
    1. Wenn hasActiveRecipe: wie bisher (active recipe wird als "fortsetzen"
       gezeigt, suggestedRecipe bleibt undefined).
    2. Sonst, wenn activeRecipeId gesetzt, das Rezept verfügbar und NICHT in
       completedSlugs ist: suggestedRecipe = getRecipeBySlug(activeRecipeId).
    3. Sonst Fallback wie bisher: erstes verfügbares, unabgeschlossenes Rezept.

Nur diese Auswahllogik anpassen, keine Queries/Datenstruktur ändern.
Slugs via getRecipeBySlug / RECIPES gegenprüfen.
```

### Optional: persönliche Begründungs-Zeile

> Der Roh-`reason` wird aktuell **nicht** gespeichert (nur die gemappte Slug). Eine Zeile wie *“Weil du dich besser kennenlernen möchtest …”* bräuchte entweder (a) den Roh-`reason` zusätzlich in `profiles` gespeichert, oder (b) eine generische, rezeptbezogene Formulierung (“Empfohlen für deinen Start”). Variante (b) ist ohne Schema-Change machbar.

```
Optionaler Zusatz (nur falls gewünscht):
Zeige an der Empfehlungs-Card eine kurze, rezeptbezogene Zeile wie
"Dein Startpunkt aus dem Onboarding" / "Empfohlen für deinen Einstieg".
KEINE reason-spezifische Formulierung, solange der Roh-reason nicht persistiert
wird. (Falls reason-spezifischer Text gewünscht ist: zuerst reason als eigene
Spalte in profiles speichern — completeOnboardingAction entsprechend ergänzen
und SQL ausgeben.)
```

### Manuell — danach prüfen

1. Frischen Test-Account anlegen, Onboarding mit jedem der vier Gründe durchspielen
1. **Direkt nach dem Onboarding** (ohne ein Rezept zu starten) aufs Dashboard:
   das zur Wahl passende Rezept wird empfohlen (know-myself/more-confidence →
   values; overthink/struggle-say-no → overthinking)
1. Nach dem Starten des Rezepts erscheint es korrekt als “Fortsetzen”
1. Ist das empfohlene Rezept bereits abgeschlossen, greift der Fallback sauber

-----

## Schritt 6.4: Dashboard entschlacken & Hierarchie schaffen 📊

> Das Dashboard reiht 6–7 gleichgewichtige Sections aneinander (Greeting, Mood, Recipe, Heutiges Recht, 3× Streak, 3× Quicklinks). Alles hat dieselbe visuelle Wichtigkeit → der Nutzer weiß nicht, worauf er schauen soll. Zusätzlich sind die Quicklinks redundant zur “Cleanser”-Bottom-Nav.

### Designprinzip

Ein Dashboard braucht **eine** primäre Aktion (“Was mache ich als Nächstes?”) und den Rest als unterstützenden Kontext. Vorschlag für die Hierarchie:

1. **Primär:** Greeting + “Aktuelles/Empfohlenes Recipe” (die eine nächste Aktion)
1. **Sekundär:** Mood-Check-in (schnell, täglich)
1. **Tertiär / Kontext:** Heutiges Recht (Inspiration), Streaks (Motivation)
1. **Entfernen:** Quicklinks-Reihe (redundant zur Bottom Nav)

### Claude Code Prompt

```
Überarbeite app/(app)/dashboard/page.tsx für klarere visuelle Hierarchie.
Keine Datenlogik / keine Supabase-Queries ändern — nur Reihenfolge, Gewichtung
und Entfernen redundanter Teile.

1. Entferne die QUICK_LINKS-Reihe komplett (die drei Cleanser-Karten am Ende
   inkl. der QUICK_LINKS-Konstante). Sie dupliziert den "Cleanser"-Tab der
   Bottom Nav.

2. Neue Reihenfolge der Sections:
   a. Greeting (bleibt oben)
   b. RecipeCard (rückt nach oben direkt unter das Greeting — das ist die
      primäre Aktion)
   c. MoodCheckin
   d. Heutiges Recht
   e. Streaks-Reihe (3 StatCards)

3. Visuelle Gewichtung:
   - Die RecipeCard soll sich als primärer Call-to-Action abheben (etwas
     prominenter: z.B. dezenter Akzent-Border oder leicht stärkerer Schatten).
   - "Heutiges Recht" und Streaks dürfen ruhig leichter / sekundär wirken
     (kleinere Überschrift, mehr muted).

Mobile-first beibehalten, großzügige Abstände (space-y-6). Ziel: beim Öffnen
sieht man sofort, was als Nächstes dran ist.
```

> **Anmerkung:** Falls du die Quicklinks doch behalten willst (z.B. weil sie schneller erreichbar sind als über zwei Taps via Bottom Nav), sag Bescheid — dann lassen wir sie drin, aber verkleinern sie deutlich, damit sie nicht mit der primären Aktion konkurrieren.

### Manuell — danach prüfen

1. Dashboard öffnen → die “nächste Aktion” (Recipe) ist sofort erkennbar
1. Keine doppelten Wege zu den Cleansern mehr auf einem Screen

-----

## Schritt 6.9: Werte auf Deutsch — ID-basiert (Variante 2) 🌍

> Die ~80 Werte in `lib/utils/values-bank.ts` sind aktuell englisch (“Kindness”, “Growth”, …) und werden als roher String in `values_hypothesis.values` gespeichert. Dieselben Strings werden an mehreren Stellen wieder angezeigt. Wir stellen auf eine **ID-basierte** Struktur um: stabile ID in der DB, deutsche Anzeige aus einer Übersetzungstabelle. Das ist zukunftssicher (Mehrsprachigkeit, spätere Umbenennungen) und verhindert, dass gespeicherte Daten und Anzeige auseinanderlaufen.

### Betroffene Anzeige-/Lese-Stellen (geprüft)

Die gespeicherten Werte werden an diesen Stellen gelesen/angezeigt — alle müssen über die Übersetzung gerendert werden:

- `app/(app)/recipes/values/hypothesis/hypothesis-form.tsx` (Auswahl-Chips)
- `app/(app)/recipes/values/evaluation/…` (Auswertung)
- `app/(app)/recipes/values/journal/journal-form.tsx` (Werte-Reminder oben)
- `app/(app)/recipes/[slug]/page.tsx` (confirmedValues)
- `app/(app)/profile/page.tsx` (Werte-Badges)
- `app/api/journal-analysis/route.ts` (Werte gehen in den KI-Prompt)
- Dashboard (indirekt über bestätigte Werte)

### Wichtige Designentscheidung: Custom-Werte

Nutzer können eigene Werte eintippen (nicht nur aus dem Bank wählen). Diese haben keine ID/Übersetzung. Lösung: Custom-Werte bekommen ein Präfix, z.B. `custom:Verlässlichkeit`, und werden bei der Anzeige einfach ohne Übersetzung ausgegeben (Text nach dem Präfix). Bank-Werte werden als reine ID gespeichert (z.B. `kindness`).

### Claude Code Prompt — Teil 1: Datenmodell

```
Stelle lib/utils/values-bank.ts von einer reinen String-Liste auf eine
ID-basierte Struktur mit deutschen Labels um.

1. Neue Struktur:
   export type ValueItem = { id: string; de: string };
   export const VALUES_BANK: readonly ValueItem[] = [
     { id: "kindness", de: "Freundlichkeit" },
     { id: "growth", de: "Wachstum" },
     ... (alle bisherigen Werte, ID = bisheriger englischer Slug in lowercase
          mit Bindestrichen, de = deutsche Übersetzung)
   ];

   Übersetze alle ~80 Werte ins Deutsche. Wähle natürliche, gebräuchliche
   deutsche Begriffe (z.B. "Mut" für Courage, "Dankbarkeit" für Gratitude,
   "Achtsamkeit" für Mindfulness, "Gelassenheit" o.ä. wo sinnvoll).

2. Helper-Funktionen im selben File:
   - getValueLabel(idOrCustom: string): string
       -> Wenn der String mit "custom:" beginnt, gib den Teil dahinter zurück.
       -> Sonst suche die ID im VALUES_BANK und gib .de zurück.
       -> Fallback: gib den String unverändert zurück (für Altdaten/Robustheit).
   - CUSTOM_PREFIX = "custom:" exportieren.

Keine weiteren Dateien in diesem Teilschritt ändern — erst das Modell, dann
die Verwender (Teil 2).
```

### Claude Code Prompt — Teil 2: Verwender anpassen

```
Passe alle Stellen an, die Werte auswählen, speichern oder anzeigen, an die
neue ID-basierte Struktur aus lib/utils/values-bank.ts an.

1. Auswahl & Speichern — app/(app)/recipes/values/hypothesis/hypothesis-form.tsx:
   - Die Auswahl-Chips iterieren über VALUES_BANK-Objekte: Anzeige item.de,
     gespeichert/getoggelt wird item.id.
   - selectedValues hält IDs (nicht Labels).
   - Custom-Werte (addCustomValue): als `${CUSTOM_PREFIX}${trimmed}` in
     selectedValues aufnehmen.
   - Beim Rendern bereits gewählter Werte und beim Vorbefüllen (initialValues)
     getValueLabel() für die Anzeige verwenden.

2. Anzeige (nur lesend) — überall getValueLabel(v) statt v direkt rendern:
   - app/(app)/recipes/values/journal/journal-form.tsx (Werte-Reminder-Badges)
   - app/(app)/recipes/values/evaluation/* (Werte in der Auswertung)
   - app/(app)/recipes/[slug]/page.tsx (confirmedValues)
   - app/(app)/profile/page.tsx (Werte-Badges)
   - Dashboard, falls dort bestätigte Werte angezeigt werden.

3. KI-Prompt — app/api/journal-analysis/route.ts:
   - Bevor die Werte in den Prompt eingesetzt werden, mit getValueLabel() in
     deutsche Labels übersetzen, damit die KI-Analyse mit den deutschen
     Begriffen arbeitet.

Gehe alle Treffer von "values as string" / hypothesis.values im Projekt durch
und stelle sicher, dass IDs gespeichert und Labels angezeigt werden.
```

### Manuell — danach prüfen

1. **Wichtig:** Bestehende Test-Accounts haben noch englische Strings in
   `values_hypothesis.values` gespeichert. `getValueLabel` fängt das per Fallback
   ab (zeigt den Rohwert), aber sauberer ist: alte Test-Hypothesen einmal im
   Supabase Table Editor löschen oder den Werte-Schritt neu durchlaufen.
1. Werte-Auswahl zeigt deutsche Begriffe, Auswahl funktioniert (max. 5).
1. Eigenen (Custom-)Wert eintippen → wird gespeichert und überall korrekt angezeigt.
1. Werte erscheinen deutsch in: Journal-Reminder, Profil, Auswertung, Dashboard.

> **Hinweis:** Falls du die deutschen Übersetzungen lieber selbst final festlegst, kann Claude Code im Prompt einen ersten Entwurf erzeugen, den du danach in `values-bank.ts` direkt editierst — die Struktur macht das leicht.

-----

## Schritt 6.11: Mantra Cleanser — Mantra & Reframe-Karten editierbar ✏️

> Aktuell sind im Mantra Cleanser (`app/(app)/cleansers/mantra/mantra-cleanser.tsx`) sowohl das Mantra (“Ich bin nicht für jeden”, `const MANTRA`) als auch die vier Beispiel-Situationen (`const SITUATIONS`, je Gedanke → Reframe) **fest im Code**. Der User soll künftig sein eigenes Mantra festlegen und die Reframe-Karten selbst bearbeiten, hinzufügen und löschen können. Dafür müssen beide aus den Code-Konstanten in die DB wandern — pro User.

### Designprinzip

- **Mantra:** genau ein Satz pro User. Eigene kleine Tabelle (oder eine Spalte) mit Fallback auf den Default-Satz, solange der User nichts Eigenes gesetzt hat.
- **Reframe-Karten:** Liste pro User (Gedanke + Reframe), mit Anlegen/Bearbeiten/Löschen — analog zum bestehenden **Promises-Cleanser** (`promises`-Tabelle), der genau dieses Muster schon umsetzt.
- **Sanfter Start:** Neue User sehen die bisherigen 4 Default-Karten + Default-Mantra als Startinhalt, damit der Cleanser nie leer wirkt. Zwei Optionen (im Prompt zur Auswahl gestellt): entweder beim ersten Besuch die Defaults in die DB seeden, oder die Defaults nur als Anzeige-Fallback nutzen, solange der User keine eigenen Karten hat.
- **Check-in unangetastet:** Die “Heute reflektiert”-Logik (`cleanser_checkins`, Streak) bleibt unverändert — wir ändern nur den Inhalt, nicht das Tracking.

### Claude Code Prompt — Teil 1: Datenbank

```
Lege die Tabellen für nutzereigenes Mantra und Reframe-Karten an. Orientiere
dich am bestehenden Muster der promises-Tabelle (siehe
app/(app)/cleansers/promises/). Gib mir das SQL als Block aus, das ICH manuell
im Supabase SQL Editor ausführe (inkl. Row Level Security wie bei den anderen
User-Tabellen).

1. Tabelle user_mantra:
   - id uuid pk default gen_random_uuid()
   - user_id uuid references auth.users not null
   - text text not null
   - updated_at timestamptz default now()
   - unique (user_id)   -- genau ein Mantra pro User
   - RLS: nur eigene Zeilen lesen/schreiben (Policies wie bei promises)

2. Tabelle mantra_cards:
   - id uuid pk default gen_random_uuid()
   - user_id uuid references auth.users not null
   - thought text not null
   - reframe text not null
   - sort_order int not null default 0
   - created_at timestamptz default now()
   - RLS: nur eigene Zeilen lesen/schreiben

Gib zusätzlich die Default-Werte aus (Mantra "Ich bin nicht für jeden" und die
4 bestehenden SITUATIONS), damit wir sie als Seed/Fallback verwenden können.
```

### Claude Code Prompt — Teil 2: Server Actions

```
Erstelle Server Actions für Mantra und Reframe-Karten in
app/(app)/cleansers/mantra/actions.ts (bestehende
logCleanserCheckinAction NICHT verändern, nur ergänzen). Orientiere dich an
app/(app)/cleansers/promises/actions.ts.

- getMantraData(): lädt für den eingeloggten User sein Mantra (Fallback:
  Default-Mantra) und seine Reframe-Karten (sortiert nach sort_order, dann
  created_at). Wenn der User noch keine Karten hat, gib die Default-Karten
  zurück [Entscheidung Seed vs. Fallback siehe unten].
- saveMantraAction(text): upsert in user_mantra (unique user_id). Validierung:
  nicht leer, sinnvolle Maximallänge (z.B. 120 Zeichen).
- addCardAction(thought, reframe): insert in mantra_cards. Validierung beider
  Felder, Maximallänge (z.B. 200 Zeichen je Feld). sort_order ans Ende.
- updateCardAction(id, thought, reframe): update, nur eigene Zeile.
- deleteCardAction(id): delete, nur eigene Zeile.

Bei allen: revalidatePath bzw. Rückgabe-State wie bei den Promises-Actions,
damit die UI sich aktualisiert.

Seed vs. Fallback — entscheide dich für EINE Variante und setze sie konsistent
um:
- Fallback (empfohlen, einfacher): Solange der User keine eigenen Karten hat,
  zeigt getMantraData die Default-Karten. Sobald er die erste eigene Karte
  anlegt oder eine Default-Karte bearbeitet, werden seine Karten maßgeblich.
  (Default-Karten existieren nur als Konstante, nicht in der DB.)
- Seed: Beim ersten Besuch werden die 4 Default-Karten + Default-Mantra einmal
  in die DB geschrieben.
Kommentiere im Code klar, welche Variante gewählt wurde.
```

### Claude Code Prompt — Teil 3: UI

```
Mache den Mantra Cleanser editierbar, basierend auf den neuen Actions.
Datei: app/(app)/cleansers/mantra/mantra-cleanser.tsx (und page.tsx für das
Laden der Daten via getMantraData).

1. page.tsx: lade Mantra + Karten via getMantraData und reiche sie als Props
   in die Client-Komponente (zusätzlich zu doneToday/streak).

2. Entferne die hartkodierten Konstanten MANTRA und SITUATIONS als
   Datenquelle — sie kommen jetzt aus den Props. (Die Default-Werte leben in
   den Actions/Konstanten gemäß gewählter Seed/Fallback-Variante.)

3. Mantra-Anzeige:
   - Standard: Anzeige wie bisher (groß, zentriert).
   - Ein dezenter "Bearbeiten"-Button (Stift-Icon, lucide Pencil) öffnet ein
     Inline-Edit (Input + Speichern/Abbrechen) → saveMantraAction.

4. Reframe-Karten (SituationCarousel):
   - Karten kommen aus Props.
   - Pro Karte: Bearbeiten (Inline oder kleiner Dialog) und Löschen
     (mit Bestätigung) → update/deleteCardAction. Buttons müssen auf Mobile
     ohne Hover erreichbar sein (vgl. Lehre aus Schritt 6.2: nicht
     opacity-0/group-hover als einzige Sichtbarkeit auf Touch).
   - Am Ende des Karussells eine "+ Karte hinzufügen"-Karte/-Button → kleines
     Formular (Gedanke + Reframe) → addCardAction.
   - Empty State (falls Fallback-Variante und keine Karten): freundlicher
     Hinweis + direkter "Erste Karte hinzufügen"-CTA.

5. Optionaler Hinweis: Ein kurzer Erklärtext, dass das Mantra und die Karten
   persönlich anpassbar sind ("Mach dieses Cleanser zu deinem.").

Die Check-in-Logik (form action={formAction}, doneToday, Streak) bleibt
unverändert.

Keine HTML <form>-Verschachtelung innerhalb des Check-in-Forms erzeugen —
Edit-/Add-Formulare als eigene, getrennte Formulare/Handler umsetzen.
```

### Manuell — danach prüfen

1. SQL aus Teil 1 im Supabase SQL Editor ausführen, RLS-Policies prüfen
1. Eigenes Mantra setzen → wird gespeichert, bleibt nach Reload erhalten
1. Karte hinzufügen, bearbeiten, löschen — alles persistiert pro User
1. Auf Mobile (~375px): Bearbeiten/Löschen ohne Hover erreichbar
1. Zweiter Test-Account sieht **nicht** die Karten des ersten (RLS greift)
1. “Heute reflektiert” + Streak funktionieren weiterhin unverändert

> **Anmerkung:** Wenn du möchtest, dass auch die anderen Cleanser (z.B. Confidence) später personalisierbar werden, lohnt es sich, die Karten-Edit-UI als wiederverwendbare Komponente zu bauen. Für jetzt bewusst auf den Mantra-Cleanser begrenzt — sag Bescheid, falls wir das gleich generischer anlegen sollen.

-----

## Schritt 6.7: Completion-Kriterien klar kommunizieren 🎯

> Bill of Rights gilt automatisch ab 3 aktiven Rechten als abgeschlossen — das wird aber vorab nirgends gesagt. Der “X von 3”-Indikator erscheint erst, wenn man schon `in_progress` ist. Nutzer sollten von Anfang an wissen, was das Ziel ist.

### Claude Code Prompt

```
Mache das Abschluss-Ziel im Bill-of-Rights-Rezept von Anfang an sichtbar.

In app/(app)/recipes/bill-of-rights/page.tsx (bzw. im neuen Schritt-Flow aus
6.5, falls der schon umgesetzt ist):

1. Zeige den "X von 3 Rechten"-Fortschrittsindikator bereits ab dem ersten
   Aufruf an (auch im Status not_started / null), nicht erst ab in_progress.

2. Ergänze in der Einleitung einen klaren Zielhinweis, z.B.:
   "Formuliere mindestens 3 Rechte, um dein persönliches Bill of Rights
   abzuschließen."

Konsistenz: Falls andere Rezepte ähnliche implizite Abschluss-Kriterien haben
(z.B. Journal = 7 Einträge), prüfe, ob das dort klar genug kommuniziert ist.
Das Journal macht es mit "Tag X von 7" bereits gut — als Referenz nehmen.
```

### Manuell — danach prüfen

1. Bill of Rights als neuer Nutzer öffnen → Ziel (“mind. 3 Rechte”) ist sofort klar
1. Indikator zählt korrekt mit

-----

## Schritt 6.3: Navigation, Orientierung & Values-Hub-Überblick 🧭

> Aktuell führt der einzige Weg aus einer tiefen Rezept-Seite (z.B. `/recipes/values/journal`) über den Browser-Back oder die Bottom Nav — letztere reißt den Nutzer komplett aus dem Rezept-Flow. Es fehlt Kontext: In welchem Rezept bin ich? Wie komme ich einen Schritt zurück? Zusätzlich rahmt die bestehende Values-Hub-Seite den 3-Schritt-Flow noch nicht als zusammenhängendes Rezept (Teil B).

### Teil A: Sub-Page-Header mit Zurück-Navigation

```
Erstelle eine wiederverwendbare Sub-Page-Header-Komponente und setze sie in
allen tiefen Rezept-Seiten ein.

1. Neue Komponente components/layout/sub-page-header.tsx:
   - Props: backHref (string), title (string), subtitle?: (string)
   - Zeigt links einen Zurück-Button (ChevronLeft, lucide-react) der per
     next/link auf backHref navigiert
   - Titel als font-heading, optionaler Subtitle als text-muted-foreground
   - Sticky am oberen Rand (sticky top-0 z-40 bg-background), mobile-first,
     dezenter border-b
   - aria-label am Zurück-Link ("Zurück")

2. Setze die Komponente ein in:
   - app/(app)/recipes/values/journal/page.tsx → backHref="/recipes/values",
     title="Tagebuch"  (die Values-Hub-Seite /recipes/values existiert und wird
     über die [slug]-Route gerendert — siehe Teil B unten)
   - app/(app)/recipes/values/hypothesis/page.tsx → backHref="/recipes/values"
   - app/(app)/recipes/values/evaluation/page.tsx → backHref="/recipes/values"
   - app/(app)/recipes/overthinking/page.tsx → backHref="/recipes"
   - app/(app)/recipes/bill-of-rights/page.tsx → backHref="/recipes"
   - app/(app)/recipes/bill-of-rights/messy/page.tsx →
     backHref="/recipes/bill-of-rights"

Wichtig: Bei Client-Component-Seiten (z.B. overthinking, bill-of-rights) muss
die Sub-Page-Header-Komponente innerhalb des bestehenden Layouts platziert
werden, ohne min-h-svh / Zentrierung zu brechen. Prüfe das jeweils.
```

> **Hinweis zum Header bei Server- vs. Client-Pages:** Die Values-Schritte sind teils Server Components — die SubPageHeader-Komponente sollte als reine Präsentationskomponente (ggf. ein kleines Client-Inseli nur für interaktive Teile) einsetzbar sein.

### Teil B: Values-Hub als zusammenhängender Rezept-Überblick

> Die Hub-Seite `/recipes/values` **existiert bereits** (gerendert über `app/(app)/recipes/[slug]/page.tsx`) und zeigt Titel, Dauer, Intro-Absätze, bestätigte Werte und einen Start/Fortsetzen-Button. Was fehlt: eine **Übersicht der drei Schritte** (Hypothese → Tagebuch (7 Tage) → Auswertung), die den Flow als *ein* zusammenhängendes Rezept rahmt — mit Status pro Schritt und direktem Einsprung. Aktuell wirkt der Übergang in die Unterseiten zusammenhanglos.

Das Rezept #1 ist zyklisch (Test → Auswerten → Verbessern) und läuft über ~7 Tage. Ein Schritt-Überblick macht sichtbar, *wo* im Zyklus der User steht und *was als Nächstes* dran ist.

```
Erweitere die Values-Hub-Ansicht in app/(app)/recipes/[slug]/page.tsx um einen
Schritt-Überblick — NUR für slug === "values" (andere Rezepte unverändert).

1. Lade den Fortschritt der drei Teilschritte des Values-Rezepts für den User:
   - Hypothese: existiert eine values_hypothesis-Zeile? confirmed?
   - Tagebuch: Anzahl journal entries im aktuellen Zyklus (Tag X von 7)
   - Auswertung: wurde die Auswertung/Evaluation abgeschlossen?
   Nutze die bestehenden Helper aus app/(app)/recipes/values/actions.ts
   (z.B. die Funktionen, die ohnehin Hypothesis/Entries/Step laden) — keine
   neue Datenlogik erfinden, vorhandene wiederverwenden.

2. Rendere eine StepOverview-Sektion (eigene kleine Komponente,
   components/recipes/values-step-overview.tsx) mit den drei Schritten als
   Liste/Timeline:
     1. Hypothese aufstellen        — Status: offen / erledigt
     2. 7 Tage beobachten (Tagebuch) — Status: Tag X von 7 / erledigt
     3. Auswerten & verfeinern       — Status: gesperrt bis Tagebuch fertig /
                                       offen / erledigt
   Pro Schritt: Titel, ein Satz Erklärung, Status-Badge und — wenn zugänglich —
   ein Link auf die jeweilige Unterseite
   (/recipes/values/hypothesis | /journal | /evaluation).
   Visuell klar machen, welcher Schritt der aktuelle ist (Akzent/Hervorhebung),
   abgeschlossene mit Häkchen, noch gesperrte gedämpft.

3. Den vorhandenen Start/Fortsetzen-Button (StartRecipeButton) so einordnen,
   dass er zum aktuellen Schritt führt (oder als sekundärer CTA neben der
   Übersicht steht). Die bestehende confirmedValues-Karte bleibt erhalten und
   passt gut über oder unter die Übersicht.

Mobile-first, ruhige Gestaltung im Stil der übrigen Rezept-Seiten. Reiner
Server-Component-Code wo möglich; nur interaktive Teile als Client-Inseln.
```

> **Wechselwirkungen:**
> 
> - **6.10 (Rezept-Intros):** Die Values-Intro-Sequenz hängt sich genau an dieser Hub-Seite ein. Reihenfolge 6.3 → 6.10 beachten.
> - **6.9 (deutsche Werte):** Die `confirmedValues`-Anzeige auf dieser Seite rendert die Werte aktuell als rohen String — sie ist eine der in 6.9 umzustellenden Anzeige-Stellen (`getValueLabel`). Nicht vergessen, wenn 6.9 umgesetzt wird.

### Manuell — danach prüfen

1. Von `/recipes` in ein Rezept navigieren → Zurück-Button bringt sauber zurück
1. Auf Mobile prüfen, dass der sticky Header nicht mit Inhalt kollidiert
1. `/recipes/values` öffnen → die drei Schritte sind als Überblick sichtbar, der aktuelle Schritt ist hervorgehoben, Status (z.B. “Tag 3 von 7”) stimmt
1. Aus der Übersicht direkt in einen zugänglichen Schritt springen; gesperrte Schritte sind klar als solche erkennbar
1. Innerhalb eines Values-Schritts bringt der Zurück-Button (Teil A) auf die Hub-Seite `/recipes/values` zurück, nicht raus auf `/recipes`

-----

## Schritt 6.10: Rezept-Einleitungen — Intro-Sequenz + Collapsible 📖

> Im AIC Cookbook hat jedes Rezept eine ausführliche, persönliche Einleitung: das **Warum**, ein **konkretes Beispiel**, und **was als Nächstes passiert**. In der App fehlt das fast völlig (nur Recipe #1 hat einen knappen Text). Wir holen das nach — beim ersten Besuch als durchklickbare Intro-Sequenz (emotionaler Einstieg), danach als kompakter, aufklappbarer “Worum geht’s?”-Block (kein Ballast für Wiederkehrer). Das ist die gewählte **Option C (Hybrid)**.

### Designprinzip

- **Erstkontakt:** 2–4 Karten-Sequenz, durchklickbar, endet mit CTA (“Los geht’s”).
  Struktur pro Rezept: (1) *Das Problem / kennst du das?* → (2) *Die Idee dahinter* →
  (3) *Was dich erwartet* (Schritte + ungefähre Dauer) → Start.
- **Danach:** Dieselben Inhalte als Collapsible (“ℹ️ Worum geht’s?”) oben auf der
  Rezeptseite, eingeklappt.
- **“Schon gesehen?”-Status:** pro Rezept gemerkt — **in der DB** (festgelegt,
  konsistent mit 6.12). Ein Flag `intro_seen boolean default false` an
  `user_recipe_progress`, damit es geräteübergreifend gilt.
- **Inhalte als Daten:** Alle Intro-Texte in einer zentralen Datei
  `lib/utils/recipe-intros.ts`, damit Texte leicht pflegbar sind und die
  Sequenz-/Collapsible-Komponenten generisch bleiben.

### Inhaltliche Entwürfe (Deutsch, aus dem Cookbook abgeleitet)

> Diese Texte sind ein erster Entwurf in der warmen, informellen AIC-Stimme (“du”). Bitte gegenlesen und anpassen — sie liegen als Daten in `recipe-intros.ts` und sind leicht editierbar.

**Recipe #1 — Deine Werte entdecken**

- *Karte 1 (Das Warum):* “Es gibt eine Frage, die über fast jede Entscheidung in deinem Leben mitbestimmt, ob sie sich später gut oder falsch anfühlt: Was sind eigentlich deine Werte? Werte sind dein innerer Kompass — die Dinge, die dir wirklich wichtig sind, oft ohne dass du es bewusst merkst.”
- *Karte 2 (Die Idee):* “Wir gehen das wie ein kleines Experiment an: Du stellst eine Hypothese auf (5 Werte, die du vermutest), sammelst eine Woche lang Daten über dich selbst und wertest dann aus. Test, Auswerten, Verbessern — wie ein Wissenschaftler, nur dass das Forschungsobjekt du bist.”
- *Karte 3 (Was dich erwartet):* “Zuerst wählst du 5 Werte. Dann begleitest du dich 7 Tage mit kurzen Tagebuch-Einträgen. Am Ende schaust du, welche Muster sich zeigen. Nimm dir pro Tag nur 2–3 Minuten — mehr braucht es nicht.”

**Recipe #3 — Dein Bill of Rights**

- *Karte 1 (Das Warum):* “Vieles, was wir tun, läuft automatisch ab — gesteuert von inneren Regeln, die wir uns irgendwann unbewusst angeeignet haben. ‘Sag bloß nicht Nein.’ ‘Mach keinen Aufstand.’ Solche Regeln können dich leise klein halten.”
- *Karte 2 (Die Idee):* “Die gute Nachricht: Regeln sind nur Regeln — und die kannst du neu schreiben. Was du dir selbst zugestehst, ist deine Entscheidung. Genau das machen wir hier: aus einschränkenden inneren Regeln werden bewusste, stärkende Grundrechte.”
- *Karte 3 (Was dich erwartet):* “Du reflektierst kurz, wo dich eine innere Regel zuletzt zurückgehalten hat. Dann formulierst du daraus deine eigenen Rechte — mindestens drei, um dein persönliches Bill of Rights abzuschließen. Sie begleiten dich danach jeden Tag.”

**Recipe #5 — Overthinking auflösen**

- *Karte 1 (Das Problem):* “Kennst du das? Dein Kopf malt ein Worst-Case-Szenario nach dem anderen, die Brust wird eng, und du kommst keinen Schritt voran. Eine echte Gedankenspirale.”
- *Karte 2 (Die Idee):* “Hier hilft eine simple Wahrheit: Dein Unterbewusstsein kann Realität und Fiktion nicht unterscheiden. Die Horror-Filme in deinem Kopf fühlen sich echt an — sind es aber fast nie. Wie Matthew McConaughey mal sinngemäß sagte: ‘Ich hatte viele Krisen in meinem Leben. Die meisten sind nie passiert.’”
- *Karte 3 (Was dich erwartet):* “In wenigen Schritten brichst du die Spirale: erst ein bewusster Stopp, dann gräbst du dich mit ein paar ehrlichen ‘Warum?’-Fragen zur Wurzel durch, und am Ende triffst du eine klare, fakten­basierte Entscheidung. Dauert nur ein paar Minuten.”

> **Hinweis Recipe #2 (Wants) & #6 (Dark Side):** sind in der App aktuell nicht als verfügbare Rezepte implementiert (“Bald verfügbar”). Sobald sie kommen, erhalten sie nach demselben Muster eine Intro. Recipe #4 (Saying No) ebenso.

### Claude Code Prompt — Teil 1: Daten & Komponente

```
Erstelle die Datengrundlage und eine wiederverwendbare Intro-Sequenz-Komponente.

1. lib/utils/recipe-intros.ts:
   export type IntroCard = { title: string; body: string };
   export type RecipeIntro = { slug: string; cards: IntroCard[] };
   export const RECIPE_INTROS: Record<string, IntroCard[]> = {
     "values": [ ... ],
     "bill-of-rights": [ ... ],
     "overthinking": [ ... ],
   };
   (Slugs aus lib/utils/recipes.ts verifizieren. Inhalte: siehe die deutschen
   Entwürfe im Plan-Dokument — als Platzhalter einsetzen, der Nutzer pflegt sie
   final.)
   Helper: getRecipeIntro(slug: string): IntroCard[] | null

2. components/recipes/recipe-intro.tsx (Client Component):
   - Props: cards: IntroCard[]; onComplete: () => void; onSkip?: () => void
   - Zeigt eine Karte nach der anderen, mit Fortschritts-Punkten (Stil wie
     ProgressDots im Overthinking-Wizard), "Weiter"-Button, auf der letzten
     Karte "Los geht's" (ruft onComplete). Optionaler "Überspringen"-Link.
   - Mobile-first, ruhige, einladende Gestaltung; nutzt vorhandene Card/Button.
```

### Claude Code Prompt — Teil 2: Einbau pro Rezept (Hybrid-Logik)

```
Baue die Intro in die drei verfügbaren Rezepte ein, nach dem Hybrid-Muster:
Sequenz beim ersten Mal, danach aufklappbarer "Worum geht's?"-Block.

"Schon gesehen?"-Status — DB (festgelegt):
- Ergänze user_recipe_progress um eine Spalte
  intro_seen BOOLEAN NOT NULL DEFAULT false. Gib das nötige SQL aus, das ich
  manuell im Supabase SQL Editor ausführe (inkl. Default für bestehende Zeilen).
  Lies/schreibe intro_seen über die bestehenden Progress-Actions/Queries.
- Hinweis: user_recipe_progress kann mehrere Zeilen pro Rezept haben
  (cycle_number). Behandle intro_seen pro recipe_slug (nicht pro Zyklus) —
  z.B. als "gesehen, wenn IRGENDEINE Zeile dieses Slugs intro_seen=true hat",
  und setze es auf der aktuellen/höchsten cycle_number-Zeile. Wenn noch keine
  Zeile existiert (Intro vor dem ersten Start), lege eine an oder nutze
  ersatzweise denselben DB-Schreibpfad wie der Recipe-Start.

Verhalten pro Rezept-Einstiegsseite (values-Hub /recipes/values, bill-of-rights,
overthinking):
- Wenn intro_seen == false: zeige <RecipeIntro> als Overlay/erste Ansicht.
  onComplete setzt intro_seen = true und zeigt dann die normale Rezeptseite.
- Wenn intro_seen == true: zeige oben einen eingeklappten Collapsible
  "ℹ️ Worum geht's?", der dieselben IntroCards anzeigt (statisch untereinander
  oder als Mini-Karussell).

Wichtig:
- Bestehende Rezept-Logik nicht verändern, die Intro nur davorschalten bzw.
  als Collapsible darüberlegen.
- Bei den Client-Component-Rezepten (overthinking, bill-of-rights) sauber in
  den bestehenden State integrieren, ohne min-h-svh/Zentrierung zu brechen.
- Für "values": die Intro gehört auf die Hub-Seite /recipes/values (die laut
  Schritt 6.3 existiert und dort um den Schritt-Überblick erweitert wird),
  nicht auf die Hypothesis-Unterseite.
```

### Manuell — danach prüfen

1. Neues Rezept zum ersten Mal öffnen → Intro-Sequenz erscheint, durchklickbar, endet im Rezept
1. Rezept erneut öffnen → keine Sequenz mehr, aber “Worum geht’s?” oben aufklappbar
1. `intro_seen` wird in `user_recipe_progress` korrekt gesetzt (geräteübergreifend: nach Re-Login auf einem anderen Gerät keine Sequenz mehr)
1. Texte lesen sich in der warmen “du”-Stimme; leicht in `recipe-intros.ts` editierbar

> **Abhängigkeit:** Dieser Schritt spielt eng mit 6.3 (Navigation/Hub) und 6.5 (Bill of Rights als Schritt-Flow) zusammen. Reihenfolge-Empfehlung: erst 6.3, dann 6.10, dann 6.5 — so steht der Rahmen, bevor die Intro eingehängt wird. Final nach deinem Gefühl.

-----

## Schritt 6.12: Cleanser-Intros — leichter Collapsible-Intro pro Cleanser 📖

> Wie die Rezepte (6.10) sollen auch die Cleanser kurz einleiten, worum es geht. Im Cookbook hat jeder “Instant Inner Critic Cleanser” eine persönliche “Dear Reader”-Einleitung von Stefan. **Unterschied zu den Rezepten:** Cleanser sind kurze, *täglich wiederholte* 30-Sekunden-Übungen — eine mehrstufige Durchklick-Sequenz wäre hier zu schwer. Stattdessen: ein **leichter, einklappbarer Ein-Karten-Intro** (“Worum geht’s?”) oben auf jeder Cleanser-Seite, beim ersten Besuch automatisch aufgeklappt, danach eingeklappt.

### Warum eigener Schritt (statt unter 6.10)

Andere UX-Logik (kurz & wiederkehrend statt mehrstufig), anderer Ton, andere Dateien. Der Schritt **nutzt aber bewusst die Infrastruktur aus 6.10 wieder** (Intro-Daten-Muster + denselben DB-Ansatz für den “gesehen”-Status), statt etwas Neues zu erfinden. Reihenfolge: nach 6.10 umsetzen.

### Designprinzip

- **Format:** Eine einzelne Intro-Karte pro Cleanser (kein Karussell). Kurz: 2–4 Sätze in Stefans warmer “Dear Reader”-Stimme + ein Satz “Was du gleich tust”.
- **Verhalten:** Beim ersten Besuch automatisch aufgeklappt; danach als eingeklappter “ℹ️ Worum geht’s?”-Collapsible. Status pro Cleanser **in der DB** (festgelegt, konsistent mit 6.10 — siehe Datenmodell unten).
- **Inhalte als Daten:** In `lib/utils/cleanser-intros.ts` (analog zu `recipe-intros.ts` aus 6.10), damit Texte leicht pflegbar sind und die Collapsible-Komponente generisch bleibt.
- **Wiederverwendung:** Wenn aus 6.10 eine generische Collapsible-/Intro-Komponente entstanden ist, hier wiederverwenden statt duplizieren.

### Inhaltliche Entwürfe (Deutsch, aus dem Cookbook abgeleitet)

> Erster Entwurf in Stefans “du”-Stimme — bitte gegenlesen. Liegen als Daten in `cleanser-intros.ts`.

**Mantra — “Ich bin nicht für jeden”**
“Das hier ist die vielleicht einfachste, aber meistgenutzte Technik gegen das Unbehagen, wenn du deine Meinung sagst, etwas Mutiges tust oder gegen den Strom schwimmst. Immer wenn die Angst vor Ablehnung hochkommt, sagst du dir einen einzigen Satz: ‘Ich bin nicht für jeden.’ Das entwaffnet fast jede Sorge darüber, wie andere reagieren könnten. Lies das Mantra, geh die Beispiele durch — und nimm den Satz mit in deinen Tag.”

**Versprechen an dich selbst (Self-Promise Keeper)**
“Selbstvertrauen wächst, wenn du dir selbst gegenüber Wort hältst — gerade bei den kleinen Dingen. Hier gibst du dir konkrete Versprechen und hakst sie Tag für Tag ab. Pro-Tipp: Mach sie richtig spezifisch, dann hältst du sie eher. Jede gehaltene Zusage ist ein kleiner Beweis an dich selbst, dass du dir vertrauen kannst.”

**Show Stopper Confidence**
“Selbstbewusstsein ist eine Fähigkeit — also etwas, das du lernen und üben kannst. Hier bekommst du fünf konkrete, sofort anwendbare Tricks, um präsenter und sicherer zu wirken, plus eine kurze Atemübung. Nach dem Prinzip ‘Fake it till you make it’: Du musst dich nicht erst sicher fühlen, um sicher zu wirken — und oft kommt das Gefühl dann von selbst hinterher.”

### Claude Code Prompt — Teil 1: Daten & Komponente

```
Erstelle die Datengrundlage und einen leichten Collapsible-Intro für Cleanser.

1. lib/utils/cleanser-intros.ts (analog zu recipe-intros.ts aus Schritt 6.10):
   export type CleanserIntro = { title: string; body: string };
   export const CLEANSER_INTROS: Record<string, CleanserIntro> = {
     "mantra": { title: "Worum geht's?", body: "..." },
     "promises": { title: "Worum geht's?", body: "..." },
     "confidence": { title: "Worum geht's?", body: "..." },
   };
   (Slugs aus app/(app)/cleansers/* verifizieren. Texte: deutsche Entwürfe aus
   dem Plan-Dokument als Platzhalter, der Nutzer pflegt sie final.)
   Helper: getCleanserIntro(slug: string): CleanserIntro | null

2. Komponente: Falls in 6.10 bereits eine generische Collapsible-Intro-
   Komponente entstand, diese wiederverwenden. Sonst neu in
   components/cleansers/cleanser-intro.tsx:
   - Props: intro: CleanserIntro; defaultOpen?: boolean
   - Eingeklappter "ℹ️ {title}"-Header, der eine kurze Body-Erklärung
     aufklappt. Dezent, mobile-first, nutzt vorhandene Card/Collapsible-UI.
```

### Claude Code Prompt — Teil 2: Einbau pro Cleanser

```
Baue den Cleanser-Intro oben in die drei Cleanser-Seiten ein
(app/(app)/cleansers/mantra, /promises, /confidence).

"Schon gesehen?"-Status — DB (festgelegt, wie 6.10):
- Es gibt aktuell KEINE per-Cleanser-State-Tabelle (nur cleanser_checkins für
  die täglichen Check-ins). Lege daher eine kleine Tabelle an:
    cleanser_intro_seen (
      user_id uuid references auth.users not null,
      cleanser_slug text not null,
      seen_at timestamptz default now(),
      primary key (user_id, cleanser_slug)
    )
  mit RLS-Policies wie bei den anderen User-Tabellen. Gib das SQL als Block aus,
  den ich manuell im Supabase SQL Editor ausführe.
- Eine kleine Server Action (z.B. in app/(app)/cleansers/actions.ts):
  markCleanserIntroSeen(slug) -> upsert in cleanser_intro_seen, und ein Lesepfad,
  der die gesehenen Slugs des Users lädt.

Verhalten:
- Erster Besuch eines Cleansers (kein Eintrag in cleanser_intro_seen): Intro
  automatisch aufgeklappt (defaultOpen). Beim ersten Anzeigen / Schließen
  markCleanserIntroSeen(slug) aufrufen.
- Danach: eingeklappt, jederzeit über den "ℹ️ Worum geht's?"-Header aufklappbar.
- Status pro Cleanser-Slug getrennt.

Platzierung: oberhalb des jeweiligen Cleanser-Inhalts, ohne die bestehende
Zentrierung/min-h-svh zu brechen. Bei den Server-Component-Seiten (mantra,
promises) den Intro als kleine Client-Teilkomponente einbinden; confidence ist
bereits eine Client Component.

Die Check-in-/Streak-Logik der Cleanser bleibt unverändert.
```

### Manuell — danach prüfen

1. Jeden Cleanser zum ersten Mal öffnen → Intro ist aufgeklappt und gut lesbar
1. Erneut öffnen → Intro eingeklappt, per Klick wieder aufklappbar
1. Status gilt pro Cleanser getrennt (mantra gesehen ≠ confidence gesehen) und
   geräteübergreifend (nach Re-Login auf anderem Gerät schon gesehen)
1. Texte lesen sich in Stefans warmer “du”-Stimme; leicht in `cleanser-intros.ts` editierbar
1. Check-in + Streak unverändert funktionsfähig

> **Konsistenz (festgelegt):** 6.10 **und** 6.12 nutzen beide den **DB-Ansatz** für “intro_seen” — 6.10 via Spalte `intro_seen` an `user_recipe_progress`, 6.12 via eigene Tabelle `cleanser_intro_seen` (weil es für Cleanser keine State-Tabelle gibt). Damit ist der Status überall geräteübergreifend und der Code konsistent.

-----

## Schritt 6.5: Bill of Rights in geführte Schritte aufteilen 📜

> Die Bill-of-Rights-Seite zeigt alles auf einer langen Scrollseite: 3 Reflexions-Textareas, dann Right Builder + AI, dann Manifesto-Liste, dann Messy-CTA. Das fühlt sich nach Formular an, nicht nach geführtem Rezept. Der Overthinking-Wizard (Schritt-für-Schritt) ist hier das Vorbild.
> 
> **Dies ist der umfangreichste Schritt** — deshalb in drei nacheinander umsetzbare Teilschritte zerlegt (6.5a → 6.5b → 6.5c). Jeder Teil ist für sich testbar und committbar, was das Risiko beim Refactor klein hält. Es ist ein **Refactor, kein Rewrite**: Die gesamte Datenlogik (`getBillOfRightsData`, `saveReflectionAction`, `saveRightsAction`, `persistRights`, AI-fetch auf `/api/rights-formulator`, Offline-Draft-Handling) bleibt unverändert — nur die Präsentation wird in Schritte zerlegt.

### Designprinzip

Eine Aufgabe pro Screen, klarer Fortschritt. Die drei Schritte:

1. **Reflexion** (die 3 Prompts)
1. **Rechte formulieren** (Builder + AI-Vorschlag + Beispiel-Chips)
1. **Dein Manifest** (Liste, Reorder, Abschluss-Ansicht)

Der “Messy Moment”-Einstieg gehört nicht in den Erstellungs-Flow, sondern ist ein wiederkehrender Einstieg → auf die abgeschlossene Manifest-Ansicht.

-----

### Schritt 6.5a: Gerüst & Schritt-Navigation

> Zuerst nur das Schritt-Gerüst aufsetzen, ohne die Inhalte zu verschieben — so lässt sich die Navigation isoliert testen.

```
Bereite app/(app)/recipes/bill-of-rights/page.tsx für einen 3-Schritt-Flow vor,
angelehnt an den Overthinking-Wizard (app/(app)/recipes/overthinking/page.tsx).

In diesem Teilschritt NUR das Gerüst:
- Einen lokalen Step-State (1 | 2 | 3) einführen.
- Schritt-Indikator oben (gleicher Stil wie ProgressDots im
  Overthinking-Wizard) + "Schritt X von 3".
- Vor/Zurück-Navigation am unteren Rand (Zurück deaktiviert auf Schritt 1).
- Die DREI bestehenden Inhaltsblöcke (Reflexion, Right Builder, Manifest-Liste)
  vorerst unverändert lassen, aber jeweils nur anzeigen, wenn der passende Step
  aktiv ist (step===1 Reflexion, step===2 Builder, step===3 Manifest).
- Loading- und Completion-Screen unverändert erhalten.

Keine Server-Action und keine Datenlogik anfassen. Nur Conditional-Rendering
nach Step + Navigationsleiste. Bestehende Offline-Draft-Logik weiter mounten.
```

**Danach prüfen:** Durch die drei Schritte vor/zurück navigieren; jeder Block erscheint im richtigen Schritt; Daten speichern weiterhin wie zuvor.

-----

### Schritt 6.5b: Schritte inhaltlich schärfen

> Jetzt die einzelnen Schritte sauber zuschneiden, sodass jeder sich abgeschlossen anfühlt.

```
Verfeinere die drei Schritte im Bill-of-Rights-Flow
(app/(app)/recipes/bill-of-rights/page.tsx):

- Schritt 1 "Reflexion": die drei bestehenden Prompt-Textareas + Button
  "Reflexion speichern" (saveReflectionAction). Nach dem Speichern sanft auf
  Schritt 2 weiterleiten (Step-State setzen), nicht automatisch alles auf einmal.
- Schritt 2 "Rechte formulieren": der Right Builder inkl. AI-Vorschlag-Button
  (/api/rights-formulator) und Beispiel-Chips im Empty State. Hier bleibt der
  Nutzer, bis er weiter will.
- Schritt 3 "Dein Manifest": die Rights-Liste mit Reorder/Edit/Delete + der
  bestehende Abschluss/Completion-Pfad.

Wichtig:
- Bestehende Funktionen/Actions unverändert weiterverwenden.
- Die Mobile-Sichtbarkeit der Edit-/Delete-Buttons aus Schritt 6.2 beibehalten
  (nicht versehentlich wieder hinter group-hover verstecken).
- Offline-Draft-Restore muss in Schritt 1 (Reflexion) weiterhin funktionieren.
```

**Danach prüfen:** Reflexion speichern → landet in Schritt 2; AI-Vorschlag funktioniert; Manifest-Liste editierbar (auch auf Mobile); Completion-Pfad intakt.

-----

### Schritt 6.5c: Messy-Moment umhängen & Feinschliff

```
Schließe den Bill-of-Rights-Umbau ab:

- Den "Messy Moment"-CTA aus dem Erstellungs-Flow herausnehmen und nur noch in
  der abgeschlossenen Manifest-Ansicht (isCompleted) anzeigen — als
  wiederkehrenden Einstieg, der zu /recipes/bill-of-rights/messy führt.
- Übergänge zwischen den Schritten ruhig gestalten (kein harter Sprung).
- Sicherstellen, dass der Sub-Page-Header aus Schritt 6.3 (backHref="/recipes")
  sauber über dem Schritt-Flow sitzt, ohne min-h-svh/Zentrierung zu brechen.
- Falls Schritt 6.10 (Rezept-Intro) bereits umgesetzt ist: die Intro spielt VOR
  Schritt 1, nicht innerhalb der Schritte.

Refactor, kein Rewrite — keine Datenlogik ändern.
```

**Danach prüfen:**

1. Kompletten Flow durchklicken: Reflexion → Rechte → Manifest
1. AI-Vorschlag funktioniert weiterhin
1. Offline-Draft-Restore funktioniert in Schritt 1
1. Abgeschlossenes Manifest zeigt den Messy-Moment-Einstieg (und nur dort)
1. Zusammenspiel mit Sub-Page-Header (6.3) und ggf. Intro (6.10) sauber

-----

## Schritt 6.13: Auth-Seite aufwerten — Split-Layout + animiertes Reframe + Club-Hook 🎨

> Aktuell sind Login (`app/(auth)/login/page.tsx`) und Signup (`app/(auth)/signup/page.tsx`) je eine zentrierte, schmale Card mit Logo, Titel und Feldern — funktional, aber ohne emotionale Hook. Es fehlt das *Warum sollte ich mich anmelden?*. Wir machen daraus einen einladenden ersten Eindruck: ein **Split-Layout** mit einer emotionalen Brand-Seite (inkl. **animiertem Reframe-Zitat**) neben der Form, getragen von einem **augenzwinkernden Club-Ton**.

### Gewählte Richtung

- **Layout:** Split (Desktop: Brand-Panel links, Form rechts · Mobile: Brand-Hook oben, Form darunter).
- **Hero-Element:** animiertes “Reframe” — ein durchgestrichener Inner-Critic-Gedanke verwandelt sich in einen stärkenden Satz, rotierend durch mehrere Beispiele. Transportiert sofort, was die App tut.
- **Ton:** augenzwinkernd / Club-Zugehörigkeit (“Willkommen im Club, den niemand zugibt zu brauchen”).

### Copy-Entwürfe (Deutsch, Club-Ton)

> Erster Entwurf — bitte gegenlesen und nach Geschmack schärfen.

**Headline (Brand-Panel):**

- Haupt: *“Willkommen im Club, den niemand zugibt zu brauchen.”*
- Alternative: *“Der Anti Imposter Club. Mitgliedschaft: für alle, die heimlich zweifeln.”*

**Subline:**
“Fast jeder kennt die Stimme im Kopf, die sagt ‘du bist nicht gut genug’. Hier lernst du, ihr nicht mehr zu glauben — mit kleinen Übungen, die wirklich etwas verändern.”

**Signup-CTA:** “Dem Club beitreten” (statt “Registrieren”)
**Login-CTA:** “Zurück in den Club” oder schlicht “Anmelden”

**Vertrauens-Microcopy unter dem Button:** “Kostenlos starten · Kein Schnickschnack · Jederzeit kündbar”

### Animiertes Reframe — Inhalt

Rotierende Paare (durchgestrichener Gedanke → stärkender Reframe), abgeleitet aus dem Cookbook und dem Kern-Mantra:

```
"Ich bin nicht gut genug"           →  "Ich bin nicht für jeden"
"Was, wenn sie mich durchschauen?"  →  "Ich muss niemandem etwas beweisen"
"Ich sollte lieber still sein"      →  "Meine Meinung darf Platz nehmen"
"Die anderen sind alle besser"      →  "Ich gehe meinen eigenen Weg"
"Ich will bloß niemanden enttäuschen" → "Ich darf auch mal Nein sagen"
```

### Design-Spec (nutzt vorhandene Tokens)

- **Farben:** warme Bestandstokens verwenden — `--primary` (Terrakotta), `--accent`, `--secondary`, `--muted`. Kein neues Palette-Set einführen.
- **Brand-Panel-Hintergrund:** weicher Verlauf in Terrakotta/Sand (z.B. von `--secondary`/`--accent` nach `--background`), optional dezente “Blob”-Form oder feines Korn/Noise für Hochwertigkeit. Subtil halten — Lesbarkeit vor Effekt.
- **Headline:** Heading-Font `--font-heading` (Fraunces) groß und selbstbewusst ausspielen (z.B. text-4xl/5xl, leading-tight).
- **Reframe-Animation:** Fade/Typewriter-Übergang, ~3–4 s pro Paar, sanft, mit `prefers-reduced-motion`-Fallback (dann statisch das erste Paar). Akzentfarbe für den Reframe-Teil (Terrakotta), durchgestrichener Gedanke in `--muted-foreground`.
- **Form:** bestehende Card/Inputs weiterverwenden, nur ins rechte Panel einbetten; sanfte Einblend-Animation beim Laden.
- **Mobile-first:** unter `md` gestapelt (Hook kompakt oben, Form darunter), ab `md` echtes 2-Spalten-Split.
- Vor der Umsetzung die **frontend-design-Konventionen** des Projekts beachten (Design-Tokens, Spacing, keine Inline-Hardcodes).

### Claude Code Prompt — Teil 1: Brand-Panel & Reframe-Komponente

```
Erstelle die wiederverwendbaren Teile für die aufgewertete Auth-Seite.
Beachte die bestehenden Design-Tokens in app/globals.css (Terrakotta/Sand,
--font-heading = Fraunces) und das frontend-design-Skill des Projekts. Nutze
NUR vorhandene Tokens, kein neues Farbsystem.

1. components/auth/reframe-animation.tsx (Client Component):
   - Rotiert durch ein Array von Paaren { critic: string; reframe: string }.
   - Zeigt den critic-Satz durchgestrichen/gedämpft (line-through,
     text-muted-foreground), darunter/danach den reframe in Akzentfarbe
     (Terrakotta, --primary), mit sanftem Fade- oder Typewriter-Übergang.
   - ~3–4s pro Paar, Endlosschleife.
   - prefers-reduced-motion: KEINE Animation, statisch das erste Paar zeigen.
   - Paare als Prop oder aus einer kleinen Konstante (Inhalte siehe Plan).

2. components/auth/brand-panel.tsx:
   - Headline (--font-heading, groß), Subline, darunter die ReframeAnimation.
   - Hintergrund: weicher Verlauf aus vorhandenen Tokens (--secondary/--accent
     → --background), optional dezente Blob-Form/feines Noise. Subtil.
   - In sich responsiv; wird in Teil 2 ins Split-Layout gesetzt.
   - Texte als Props mit sinnvollen Defaults (Club-Ton, siehe Plan).
```

### Claude Code Prompt — Teil 2: Split-Layout im Auth-Layout

```
Baue das Split-Layout in app/(auth)/layout.tsx ein, sodass Login und Signup es
gemeinsam nutzen.

- Ab md: zwei Spalten — links <BrandPanel>, rechts der Form-Bereich (children),
  beide volle Höhe (min-h-svh), vertikal zentriert.
- Unter md: gestapelt — BrandPanel kompakt oben (Headline + Subline + Reframe,
  ggf. etwas reduziert), Form darunter. Logo weiterhin sichtbar.
- Das bestehende Logo sinnvoll platzieren (z.B. oben im Brand-Panel bzw. auf
  Mobile über der Hook).
- Sanfte Einblend-Animation für den Form-Bereich (respektiert
  prefers-reduced-motion).

Die Card/Form-Logik von login/page.tsx und signup/page.tsx NICHT verändern
(Server Actions, Felder, Validierung bleiben) — sie sollen nur im rechten
Panel sitzen.
```

### Claude Code Prompt — Teil 3: Copy & CTAs

```
Aktualisiere die Texte auf den Auth-Seiten im augenzwinkernden Club-Ton
(Entwürfe siehe Plan, final vom Nutzer anpassbar):

- signup/page.tsx: CardTitle/Description passend zum Club-Ton; Submit-Button
  "Dem Club beitreten"; darunter Microcopy "Kostenlos starten · Kein
  Schnickschnack · Jederzeit kündbar".
- login/page.tsx: freundlicher Wiederkehr-Ton ("Zurück in den Club"),
  Submit-Button "Anmelden".
- Brand-Panel-Headline/Subline aus den Plan-Entwürfen setzen.

Nur Texte/Labels ändern, keine Action- oder Feldlogik anfassen.
```

### Manuell — danach prüfen

1. Login und Signup auf Desktop → Split-Layout, Brand-Panel links, Form rechts
1. Reframe-Animation läuft sauber durch die Paare; in den Systemeinstellungen
   “Bewegung reduzieren” aktivieren → Animation ist statisch
1. Auf Mobile (~375px): sauber gestapelt, Hook oben, Form gut erreichbar, nichts abgeschnitten
1. Anmelden/Registrieren funktioniert unverändert (Actions, Validierung, Fehlermeldungen)
1. Dark Mode prüfen — Verlauf und Kontraste sitzen
1. Texte lesen sich im Club-Ton; leicht anpassbar

> **Anmerkung:** Falls dir das animierte Reframe später zu viel sein sollte, lässt es sich isoliert entfernen, ohne das Split-Layout anzutasten — die beiden Teile sind bewusst getrennt (BrandPanel vs. ReframeAnimation). Optionale spätere Ausbaustufe: ein echtes Mitglieder-/Testimonial-Snippet als zusätzlicher “social proof”.

-----

## Genereller Hinweis zur Arbeitsweise

- Halte dich an die **Ausführungsreihenfolge** oben (Quick Wins zuerst, dann der Struktur-Block 6.3 → 6.10 → 6.12 → 6.5; 6.13 nach Gefühl einschieben).
- Nach jedem Schritt testen und committen:

  ```bash
  npm run dev      # manuell testen (siehe "Danach prüfen" je Schritt)
  npm run build    # WICHTIG bei 6.9 und 6.5: fängt Typfehler an Aufrufstellen,
                   # die `next dev` nicht zwingend zeigt
  npm run lint
  git add .
  git commit -m "Phase 6.x: <kurze Beschreibung>"
  git push
  ```

- Besonders im Struktur-Block (6.3/6.10/6.5) wird dieselbe Datei (`bill-of-rights/page.tsx`) mehrfach angefasst. **Zwischen den Schritten committen und testen**, damit Regressionen früh auffallen. Die Prompts sind bewusst als „Refactor, kein Rewrite" formuliert — Datenlogik nie anfassen.

-----

## Checkliste Plan B

- [ ] 6.6 Onboarding-Empfehlung (`active_recipe_id`) erscheint auf dem Dashboard auch ohne gestarteten Fortschritt
- [ ] 6.4 Dashboard entschlackt, klare Hierarchie, Quicklinks-Redundanz beseitigt
- [ ] 6.9 Werte ID-basiert auf Deutsch, alle Anzeige-Stellen + KI-Prompt umgestellt (alte Test-Hypothesen geleert)
- [ ] 6.11 Mantra Cleanser: Mantra & Reframe-Karten editierbar (DB-Migration ausgeführt, RLS geprüft)
- [ ] 6.3 Sub-Page-Header mit Zurück-Navigation in allen tiefen Rezept-Seiten + Values-Hub zeigt 3-Schritt-Überblick mit Status
- [ ] 6.10 Rezept-Intros (Sequenz beim 1. Mal + Collapsible danach) für values, bill-of-rights, overthinking (DB-Migration ausgeführt)
- [ ] 6.12 Cleanser-Intros (Collapsible) für mantra, promises, confidence (DB-Migration ausgeführt)
- [ ] 6.5 Bill of Rights als geführter 3-Schritt-Flow
  - [ ] 6.5a Gerüst & Schritt-Navigation
  - [ ] 6.5b Schritte inhaltlich geschärft (Reflexion → Rechte → Manifest) + 6.7 (X-von-3-Ziel von Anfang an sichtbar) hier integriert
  - [ ] 6.5c Messy-Moment umgehängt, Zusammenspiel mit 6.3/6.10 geprüft
- [ ] 6.13 Auth-Seite: Split-Layout + animiertes Reframe + Club-Hook (Login & Signup)
- [ ] `npm run build` + `npm run lint` laufen nach jedem Schritt sauber durch
