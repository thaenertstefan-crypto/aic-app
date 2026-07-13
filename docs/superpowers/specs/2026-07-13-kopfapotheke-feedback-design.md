# Kopfapotheke-Feedback: Confidence Boost aufräumen + Nein-Trainer verbessern

**Datum:** 2026-07-13
**Status:** Vom User abgenommen (Brainstorming-Session)

## Ziel

Stefans Feedback-Runde zur Kopfapotheke umsetzen: Promise Keeper entfernen,
den Confidence Boost auf den „Gleich bin ich dran"-Flow als Hauptfunktion
fokussieren (inkl. besserer Atemübung, neuem Reframe-Schritt, eigenem Intro),
und den Nein-Trainer inhaltlich schärfen (Denk-Pause-Strategie, weniger
Vorgaben im Übungsmodus, ehrlicherer KI-Vorschlag).

## Entscheidungen aus dem Brainstorming

| Frage | Entscheidung |
|---|---|
| Was passiert mit dem Mantra-Ritual? | Schlanke Landing behalten: Hero (Moment-Flow) + Mantra-Ritual, nur Showstopper-Sektion fliegt raus |
| Reframe-Quelle für Moment-Flow Schritt 4 | Fester, kuratierter Auftritts-Reframe (nicht die persönlichen Reframe-Karten) |
| Intro-Form Confidence Boost | Durchklickbares Karten-Intro mit Maskottchen (Muster Overthinking/Nein-Trainer) |
| Promise Keeper | Komplett entfernen (Code, Route, Intro, Gefäß); DB-Daten bleiben |
| Denk-Pause-Strategie im Nein-Trainer | Neue Intro-Karte + dezenter Hinweis im „Echte Situation"-Flow |

## A. Kopfapotheke-Hub (`app/(app)/booster/page.tsx`)

- **Promise Keeper komplett entfernen:**
  - Kachel aus `TILES`.
  - Route `app/(app)/booster/promises/**` löschen (page, actions,
    promises-cleanser, promise-card).
  - `PromiseJar` aus `vessels.tsx` entfernen.
  - `promises`-Eintrag aus `lib/utils/cleanser-intros.ts` entfernen.
  - **Keine** DB-Migration: vorhandene Daten (Check-ins, Einträge) bleiben
    unangetastet.
- **Regal-Layout mit 5 Kacheln:** letzte Reihe enthält ein einzelnes Gefäß —
  mittig zentriert statt im 2er-Grid (leeres Nachbarfach vermeiden).
- Verweise auf gelöschte Teile (Imports, Labels, ggf. Dashboard-Links) mit
  aufräumen; `grep` nach `promises`/`PromiseJar` als Abschluss-Check.

## B. Confidence-Boost-Landing (`app/(app)/booster/confidence/`)

- **Showstopper-Sektion entfernen:** Der komplette Abschnitt „Die 5
  Showstopper-Übungen" fliegt von der Landing. `EXERCISES` und `ExerciseCard`
  in `breathing-exercise.tsx` werden gelöscht (einziger Nutzer war die
  Landing). Die Datei behält nur noch die `BreathingExercise`.
- **Struktur danach:** SubPageHeader → Hero-Card „Gleich bin ich dran"
  (Haupteinstieg, bleibt oben) → Sektion „Dein tägliches Mantra-Ritual"
  (unverändert: Mantra-Block, Reframe-Karten-Carousel, Streak-Check-in).
- **Eigenes Karten-Intro:**
  - Beim ersten Besuch erscheint eine durchklickbare Karten-Sequenz mit
    Maskottchen, Muster `RecipeIntro` (wie Overthinking/Nein-Trainer).
  - Ca. 3 Karten: (1) Selbstvertrauen ist trainierbar — dieser Booster hilft
    akut und täglich, (2) „Gleich bin ich dran": in 5 Minuten bereit für
    Auftritt, Meeting oder schwieriges Gespräch, (3) das tägliche
    Mantra-Ritual festigt deine liebevollere innere Stimme.
  - Gesehen-Status weiter über den bestehenden `cleanser_intro_seen`-
    Mechanismus mit Slug `confidence-boost` (nur die UI wechselt vom
    „Worum geht's?"-Textblock zur Karten-Sequenz). Danach jederzeit über den
    Info-Button im Header abrufbar.
  - Texte: warm, informell („du"), AIC-Stimme.

## C. Moment-Flow — Schritt 1: Atmung

Änderungen in der geteilten `BreathingExercise`
(`app/(app)/booster/confidence/breathing-exercise.tsx`) und dem
Schritt-1-Text in `moment/moment-flow.tsx`:

- **Text statt „Höhlenmensch":** sinngemäß „Dein Körper schaltet auf Alarm —
  lass uns deinen Fight-or-Flight-Reflex beruhigen. Folge einfach dem Kreis."
  (Der zweite „Höhlenmensch"-Treffer in ExerciseCard 5 verschwindet ohnehin
  mit der Showstopper-Sektion.)
- **Start auf dem Kreis:** Der Atemkreis selbst wird der Start-Button (Muster
  `CountdownCircle` im Overthinking-Wizard): Tap auf den Kreis startet die
  Übung, `aria-label` fürs Starten, der separate Start-Button darunter
  entfällt. Im Ruhezustand lädt der Kreis sichtbar zum Tippen ein
  (z. B. „Tippen zum Starten" statt „Bereit?").
- **Sekunden-Timer:** Während der Übung zeigt der Kreis unter dem
  Phasen-Label einen live runterzählenden Sekunden-Countdown
  (Einatmen 4 → Halten 7 → Ausatmen 8). „Runde x von 4" bleibt.
- Bestehendes Verhalten bleibt: 4 Runden à 19 s, `onDone`-Callback,
  Timer-Cleanup beim Unmount.

## D. Moment-Flow — Schritt 4: Power-Erinnerung

Zwischen Mantra-Karte und Recht-Karte kommt eine **feste
Auftritts-Reframe-Karte** (statisch, kein DB-Bezug), visuell im Stil der
Reframe-Karten (Gedanke gedämpft, Reframe betont):

> **Der Gedanke:** „Was, wenn ich gleich was sage, was dem anderen nicht
> gefällt — oder ich mich blamiere?"
>
> **Der Reframe:** „Meine Ideen und Worte haben einen Platz verdient. Ich
> darf sie aussprechen. Mehr als echt sein kann ich nicht. Wenn das jemandem
> nicht gefällt, ist das nicht mein Problem. Ich bin nicht für jeden."

## E. Moment-Flow — Abschluss-Screen

- **Grüner Haken statt Maskottchen:** `CompletionCelebration` wie auf den
  anderen Abschluss-Screens. (Der bisherige Code-Kommentar „bewusst kein
  CompletionCelebration" wird durch dieses Feedback überschrieben.)
- **Mantra wiederholen:** Unter Headline/Text wird das Mantra noch einmal
  groß angezeigt — als Letztes, was man liest, bevor man in den Moment geht.
  `MomentFlow` hat das Mantra bereits als Prop.
- „Fertig"-Button bleibt prominent (Ziel bleibt: raus aus der App).

## F. Nein-Trainer (`app/(app)/booster/saying-no/`)

1. **Denk-Pause-Strategie („Schritt 0"):**
   - Neue Intro-Karte in der `saying-no`-Intro-Sequenz
     (`lib/utils/recipe-intros.ts`): Du musst nicht sofort antworten. Bei
     Störgefühl + Ja-Druck erst Zeit erbitten („Da muss ich kurz drüber
     nachdenken") → dem inneren Konflikt entkommen → in Ruhe entscheiden →
     wenn es ein Nein wird, hilft dieses Rezept beim Formulieren.
   - Zusätzlich ein dezenter Hinweis-Kasten auf dem „Echte
     Situation"-Screen (Situationsbeschreibung), damit auch Wiederkehrer ihn
     im akuten Fall sehen.
2. **Draft-Screen, beide Modi:** Das einklappbare 4-Schichten-Collapsible
   (Blueprint-Referenz) wird entfernt (inkl. `blueprintOpen`-State).
   `SAYING_NO_LAYERS` bleibt bestehen (Checklist-Reihenfolge, Feedback-UI).
3. **Übungsmodus — leere Box:** Die Nein-Textarea verliert im Übungsmodus
   ihr Beispiel-Placeholder — leere Box, voller Lerneffekt. Im **echten
   Modus** bleibt der Placeholder (dort Hilfe, kein Spoiler).
4. **Übungsmodus — Warte-Animation:** Beim Szenario-Laden ein liebevollerer
   Moment statt nüchternem Laden: Maskottchen (nachdenklicher Ausdruck,
   sanfte Bewegung) + Text „Ich denk mir gerade eine Situation für dich
   aus …" + weich pulsierende Skeleton-Zeilen. Reduced-motion respektieren.
5. **Abschluss-Screen, bestehendes Recht:** Label „Du hast dir dieses Recht
   schon gegeben" → **„Kleiner Reminder — in deiner Bill of Rights steht:"**
6. **KI-Prompt** (`lib/anthropic/prompts/saying-no-coach.ts`), Regel für
   `improved` ergänzen:
   - Die verbesserte Version darf **keine Fakten oder Begründungen
     erfinden**, die nicht im Entwurf oder der Situation stehen (kein
     erfundener Zahnarzttermin).
   - Enthält der Entwurf keine Begründung, bekommt auch die verbesserte
     Version keine — ein Nein ohne Begründung ist vollwertig und stark.
   - Enthält der Entwurf eine echte Begründung, darf sie bleiben (ggf.
     gestrafft) — sie zeigt, dass die Person ihre Bedürfnisse ernst nimmt.

## Nicht-Ziele

- Keine DB-Migrationen; `cleanser_checkins`-, `journal_entries`- und
  Promise-Daten bleiben liegen.
- Mantra-Ritual (Mantra-Block, Reframe-Karten, Streak) bleibt funktional
  unverändert.
- Keine Änderungen an Overthinking, Things Got Messy, Shadow.

## Teststrategie

- Bestehende Test-/Verifikationsroutine des Repos nutzen (Lint + Build).
- Browser-Verifikation der Flows per bekanntem Playwright-Rezept
  (Wegwerf-Account): Hub ohne Promise Keeper, Confidence-Intro beim ersten
  Besuch, Atemübung Start-per-Kreis + Countdown, Schritt-4-Reframe,
  Abschluss mit Haken + Mantra, Nein-Trainer-Screens (Collapsible weg,
  leere Box im Übungsmodus, neues Abschluss-Label).
- KI-Prompt-Änderung stichprobenartig mit kurzem Entwurf („Nein danke")
  prüfen: verbesserte Version darf keine erfundene Begründung enthalten.
