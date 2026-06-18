# Dashboard-Update: Stimmungsbasierter Fokus-Bereich

> Ziel: Die "Aktuelles Recipe"-Card durch einen Bereich ersetzen, der sich nach der Tagesstimmung richtet — eine Frage, eine Hauptempfehlung, und Alternativen als ganze Ich-Sätze. Der Mood-Checkin bekommt dabei Wort-Labels statt Emoji plus einen kleinen goldenen Avatar, der per Gesichtsausdruck reagiert.
>
> Geschätzte Dauer: 2–3 Tage
>
> Voraussetzung: Phase 7 (Redesign) abgeschlossen
>
> Einsortierung: direkter Nachfolger zu Phase 6/7 — du entscheidest, ob du das als eigenständiges Dokument führst oder als 7.1 nummerierst.
>
> **Keine Datenbank-/Migrations-Änderung nötig.** `mood_score` bleibt 1–5 wie bisher, alle anderen Daten (Rezept-Fortschritt, Bill of Rights, Streaks) sind bereits vorhanden.

-----

## Überblick

Drei Änderungen greifen ineinander:

1. **Mood-Checkin** (`mood-checkin.tsx`): Emoji raus, Wörter rein ("Erschöpft", "Angespannt", "Im Gleichgewicht", "Stark", "Strahlend"), dazu ein neuer Avatar (`MoodAvatar`) — ein goldener Blob mit Gesicht, das je Stimmung mitfühlend, neutral-lächelnd oder strahlend aussieht. Die bestehende Feedback-Nachricht (`MESSAGES`-Dictionary) bleibt unverändert und an ihrer Stelle.
2. **Neue Komponente `daily-focus.tsx`**: ersetzt die bisherige "Aktuelles Recipe"-Card. Zeigt eine stimmungsabhängige Frage ("Brauchst du eine Mantra-Pause?" / "Sollen wir weitermachen?"), eine Hauptempfehlung (Mantra-Cleanser bei niedriger Stimmung, sonst die bisherige Rezept-Logik), und darunter die übrigen fünf Anlaufstellen als anklickbare Ich-Satz-Zeilen ("...oder brauchst du gerade was anderes?").
3. **`dashboard/page.tsx`**: berechnet die neue Empfehlungslogik, entfernt die alte `RecipeCard`-Funktion, ordnet die Sections neu (Mood-Checkin steht jetzt VOR der Empfehlung statt danach).

Heutiges Recht und die Streak-Reihe bleiben unangetastet. Größere Ideen (Fortschritts-Reise, KI-Wocheninsights, Stats mit Trendlinien) sind bewusst nicht Teil dieses Updates — die heben wir uns für einen späteren Schritt auf.

**Abhängigkeit:** Schritt 1 und Schritt 2 sind unabhängig voneinander und können in beliebiger Reihenfolge (oder parallel) umgesetzt werden. Schritt 3 baut auf beiden auf und sollte zuletzt kommen.

-----

## Schritt 1: Mood-Checkin — Wörter + Avatar statt Emoji 🎭

### Designprinzip

Die Wort-Labels existieren technisch schon (aktuell nur als `aria-label`, unsichtbar) — wir machen sie sichtbar und ersetzen das Emoji durch einen kleinen Avatar, der die Stimmung über Gesichtsausdruck statt Symbol transportiert. Die Körperfarbe des Avatars bleibt immer Gold (= seine "Identität"), nur das Gesicht (Augen, Lid, Mund, Wangen) und die Atem-Geschwindigkeit ändern sich. Bei "Erschöpft"/"Angespannt" zeigt er einen abgestuft mitfühlenden Ausdruck (kein trauriges, in sich gekehrtes Gesicht — eher ein ruhiges, präsentes "das tut mir leid zu hören"), bei "Stark"/"Strahlend" einen abgestuft freudigen.

### Claude Code Prompt

```
Lege zunächst die gemeinsamen Stimmungs-Konstanten an, dann den Avatar,
dann den Umbau von mood-checkin.tsx.

1. lib/utils/mood.ts (neu):

   export type MoodFace = "sorrowStrong" | "sorrowMild" | "smile" | "happy" | "radiant";

   export const MOOD_LABELS: Record<number, string> = {
     1: "Erschöpft",
     2: "Angespannt",
     3: "Im Gleichgewicht",
     4: "Stark",
     5: "Strahlend",
   };

   export const MOOD_FACES: Record<number, MoodFace> = {
     1: "sorrowStrong",
     2: "sorrowMild",
     3: "smile",
     4: "happy",
     5: "radiant",
   };

   export const MOOD_PULSE_SECONDS: Record<number, number> = {
     1: 4.4,
     2: 3.7,
     3: 3.0,
     4: 2.3,
     5: 1.7,
   };

   /** "low" = Score 1–2, sonst "normal". null (noch kein Check-in heute)
    *  zählt bewusst als "normal" — siehe Schritt 3 für die Begründung. */
   export function moodTier(score: number | null): "low" | "normal" {
     return score !== null && score <= 2 ? "low" : "normal";
   }

2. components/dashboard/mood-avatar.tsx (neu):

   export function MoodAvatar({
     face,
     pulseSeconds,
   }: {
     face: MoodFace;
     pulseSeconds: number;
   }) { ... }

   Aufbau (von hinten nach vorne):
   - Halo-Layer: leicht größer als der Blob (inset -8px bis -10px),
     background var(--primary), opacity ~0.18, weicher Glow via
     box-shadow (z.B. "0 0 24px 6px rgba(231,182,94,0.35)") — angelehnt an
     die Atmosphäre, die components/ui/ambient-blobs.tsx schon mit Blur
     erzeugt. Hier darf (anders als in einer Sandbox-Demo) ein echter
     weicher Schatten/Glow verwendet werden.
   - Blob-Körper: background var(--primary), border 2px solid
     var(--chart-2), eine FESTE organische border-radius (z.B.
     "58% 42% 55% 45% / 48% 52% 45% 55%") — die Form ändert sich NICHT je
     nach Stimmung, nur das Gesicht und das Atem-Tempo.
   - <svg viewBox="0 0 64 64" aria-hidden="true"> mit:
     - 2x <ellipse> Wangen (cx 9/55, cy 33, rx 5, ry 3.5, fill ein warmer
       Rosé-Ton z.B. var(--celebrate)), opacity 0 außer bei face="radiant"
       (opacity 0.4)
     - 2x Sklera-<circle> (cx 20/44, cy 27, r 7, fill ein cremiger Ton,
       z.B. var(--foreground) wirkt zu hell — nimm ein festes helles
       Creme wie #FBF6EA, das zur Aubergine/Gold-Palette passt)
     - 2x Pupillen-<circle> (r 3, fill var(--primary-foreground)),
       Position: links cx = 20 + dx, rechts cx = 44 - dx, beide
       cy = 27 + dy
     - 2x Glanzlicht-<circle> (r 1, fill weiß), 1px links-oben der
       jeweiligen Pupille versetzt
     - 2x "Lid"-<rect> (x 12/36, y 20, width 16, height = lid-Wert,
       fill var(--primary)) — schieben sich von oben über die Augen
     - 1x Mund-<path> (stroke var(--primary-foreground), fill none,
       stroke-linecap round), d und stroke-width je nach Ausdruck

   FACE-Tabelle (exakt diese Werte, als Konstante im File):
     sorrowStrong: { lid: 7,   dx: 1.3, dy: 2, mouthD: "M22,38.5 Q32,35.5 42,38.5", mouthWidth: 3,   cheek: 0   }
     sorrowMild:   { lid: 3.5, dx: 0.6, dy: 1, mouthD: "M24,37.5 Q32,36.5 40,37.5", mouthWidth: 2.6, cheek: 0   }
     smile:        { lid: 1,   dx: 0,   dy: 0, mouthD: "M23,37 Q32,42.5 41,37",     mouthWidth: 3,   cheek: 0   }
     happy:        { lid: 0,   dx: 0,   dy: 0, mouthD: "M20,36 Q32,47 44,36",       mouthWidth: 3.2, cheek: 0   }
     radiant:      { lid: 0,   dx: 0,   dy: 0, mouthD: "M18,35 Q32,50 46,35",       mouthWidth: 3.5, cheek: 0.4 }

   Da face als Prop reinkommt, reicht reines, deklaratives Rendern (Werte
   aus der FACE-Tabelle direkt als Attribute) — keine manuelle
   DOM-Manipulation wie in einem Vanilla-JS-Prototyp nötig.

   Breathing-Animation: CSS @keyframes (scale 1 → 1.06 → 1), Dauer =
   pulseSeconds. Nutze den bestehenden useReducedMotion-Hook
   (lib/hooks/use-reduced-motion) und lass die Animation bei reduzierter
   Bewegung weg (analog zu ambient-blobs.tsx).

3. app/(app)/dashboard/mood-checkin.tsx anpassen:
   - MOODS-Array: emoji-Feld entfernen. label-Werte aus MOOD_LABELS
     übernehmen (oder das Array direkt aus MOOD_LABELS/Object.entries
     aufbauen, um Doppelpflege zu vermeiden).
   - Buttons rendern jetzt mood.label als sichtbaren Text statt Emoji.
     aria-label kann entfernt werden, da der Text jetzt selbst sichtbar
     ist — darf aber auch stehen bleiben, schadet nicht.
   - Über (oder neben) der Button-Reihe: <MoodAvatar
     face={MOOD_FACES[selected ?? 3]}
     pulseSeconds={MOOD_PULSE_SECONDS[selected ?? 3]} />
     — Default auf Stimmung 3 ("smile"), solange `selected` noch null ist.
   - MESSAGES-Dictionary UND seine Position im Layout (direkt unter den
     Buttons, nur sichtbar wenn selected !== null) bleiben unverändert —
     auch der Text inklusive Emoji bleibt exakt wie er ist.
```

### Manuell — danach prüfen

1. Mood-Buttons zeigen Wörter statt Emoji, Avatar erscheint mit Default-Gesicht ("smile"), solange noch nicht eingecheckt wurde
1. Jedes der fünf Wörter antippen → Avatar-Gesicht wechselt sichtbar und passend (Erschöpft deutlich mitfühlender als Angespannt; Strahlend mit Wangenröte, Stark ohne)
1. Die bestehende Feedback-Nachricht erscheint weiterhin korrekt unter den Buttons
1. Reduzierte Bewegung (Betriebssystem-Einstellung) aktivieren → Avatar pulsiert nicht mehr, Gesichtsausdruck wechselt aber weiterhin korrekt
1. Mobile-Ansicht: Avatar und fünf Buttons brechen nicht um, bleiben gut antippbar

-----

## Schritt 2: Neue Komponente `daily-focus.tsx` 🧭

### Designprinzip

Diese Komponente ersetzt die bisherige `RecipeCard`-Funktion aus `dashboard/page.tsx`. Sie ist rein präsentational (bekommt alles als Props, keine eigenen Supabase-Queries) — die gesamte Ableitungslogik (Stimmung, Fortschritt, Auswahl) lebt in `page.tsx` (Schritt 3), damit es nur eine Stelle gibt, an der diese Logik gepflegt wird.

### Claude Code Prompt

```
Erstelle components/dashboard/daily-focus.tsx (Server- oder reine
Presentational-Component, kein "use client" nötig, da keine eigene
Interaktivität).

type Destination = {
  key: string;
  sentence: string;
  href: string;
  badge?: string;
};

type PrimaryRecommendation = {
  key: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
};

type DailyFocusProps = {
  tier: "low" | "normal";
  primary: PrimaryRecommendation | null;
  fallbackMessage?: string; // nur relevant wenn primary === null
  showQuestion: boolean;
  alternatives: Destination[];
};

Render-Logik:

1. Wenn showQuestion: eine Zeile mit der passenden Frage —
   "Brauchst du eine Mantra-Pause?" bei tier "low",
   "Sollen wir weitermachen?" bei tier "normal".
   (Berechne den Frage-Text hier anhand von `tier`, NICHT hart an
   primary.key — falls später weitere "low"-Empfehlungen als Mantra
   dazukommen, soll die Frage trotzdem stimmen.)

2. Primary-Bereich:
   - Wenn primary vorhanden: GlassPanel (wie die bisherige RecipeCard),
     Akzent-Border in var(--primary). Zeigt primary.title (font-heading),
     primary.subtitle (text-muted-foreground), dann CtaGlow + Button
     (Link auf primary.href) mit primary.cta-Text + ArrowRight-Icon.
   - Wenn primary === null: stattdessen Card variant="glass" mit
     fallbackMessage als Text + Button variant="outline" "Rezepte
     ansehen" → Link auf /recipes (entspricht dem bisherigen
     "Schön, dass du dranbleibst..."-Fallback-Zweig der alten RecipeCard).

3. Wenn alternatives.length > 0: kleine Überschrift "...oder brauchst du
   gerade was anderes?" (text-xs, muted), darunter eine vertikale Liste
   (space-y-2). Jede Destination als ganzflächig klickbarer Link-Block:
   - rounded-lg border, hover:bg-muted/40, Padding ~px-3 py-2.5
   - sentence-Text links, optionales badge daneben (kleines, gedämpftes
     Label, z.B. text-xs text-muted-foreground)
   - ChevronRight-Icon rechts (lucide-react), size-4, text-muted-foreground

Mobile-first, gleicher visueller Stil wie der Rest des Dashboards
(Fraunces-Headings, gleiche Abstände wie GlassPanel/Card anderswo).
```

-----

## Schritt 3: `dashboard/page.tsx` — Empfehlungslogik & neue Reihenfolge 📊

### Designprinzip

Die bestehende Datenabfrage (Promise.all-Block) bleibt unverändert — wir brauchen keine neuen Queries, nur neue Ableitungen aus den schon geladenen Daten. Wichtig: der Fortschritt des Werte-Rezepts wird ab jetzt unabhängig von `active_recipe_id` ermittelt (nicht nur, wenn "values" zufällig das Onboarding-Rezept ist), damit der Badge in der Alternativen-Liste auch dann korrekt erscheint, wenn Werte gerade NICHT die Hauptempfehlung ist.

### Claude Code Prompt

```
app/(app)/dashboard/page.tsx anpassen:

1. Entferne die Funktion RecipeCard komplett (inkl. ihrer JSX-Nutzung).
   Entferne nicht mehr benötigte Imports (Progress, ArrowRight, GlassPanel,
   CtaGlow — NUR falls sie sonst nirgends in dieser Datei mehr vorkommen;
   daily-focus.tsx übernimmt diese).

2. Bestehende Berechnung von activeRecipe / activeProgress /
   hasActiveRecipe / completedSlugs / suggestedRecipe UNVERÄNDERT lassen.

3. Neu — Continuity-Empfehlung (das, was die alte RecipeCard gezeigt hätte):
   const continuityRecipe = hasActiveRecipe ? activeRecipe : suggestedRecipe;

4. Neu — Werte-Fortschritt IMMER ermitteln, unabhängig von activeRecipeId:
   const valuesProgress = progressRows.find(
     (p) => p.recipe_slug === "values" && p.status !== "completed",
   );
   const valuesTotalSteps = getRecipeBySlug("values")?.stepPaths?.length ?? 3;
   const valuesBadge = valuesProgress
     ? `Schritt ${Math.min(Math.max(valuesProgress.current_step ?? 1, 1), valuesTotalSteps)} von ${valuesTotalSteps}`
     : undefined;
   const valuesHref = valuesProgress
     ? getRecipeStepPath("values", valuesProgress.current_step ?? 1)
     : "/recipes/values/hypothesis";

5. Neu — Mood-Tier:
   import { moodTier, MOOD_LABELS } from "@/lib/utils/mood"; // MOOD_LABELS
   nur falls hier gebraucht, sonst weglassen
   const tier = moodTier(todayMood);

6. Neu — Primary + Frage + Fallback bestimmen:

   let primary: PrimaryRecommendation | null = null;
   let fallbackMessage: string | undefined;

   if (tier === "low") {
     primary = {
       key: "mantra",
       title: "Ich bin nicht für jeden",
       subtitle: "30 Sekunden Mantra-Pause",
       cta: "Kurz durchatmen",
       href: "/cleansers/mantra",
     };
   } else if (continuityRecipe) {
     primary = {
       key: continuityRecipe.slug,
       title: continuityRecipe.title,
       subtitle:
         continuityRecipe.slug === "values" && valuesBadge
           ? valuesBadge
           : hasActiveRecipe
             ? "Du bist mittendrin."
             : continuityRecipe.description,
       cta: hasActiveRecipe ? "Weitermachen" : "Jetzt starten",
       href: hasActiveRecipe
         ? getRecipeStepPath(continuityRecipe.slug, activeProgress?.current_step ?? 1)
         : continuityRecipe.startPath,
     };
   } else {
     fallbackMessage =
       "Schön, dass du dranbleibst! Stöbere durch die Rezepte für deinen nächsten Schritt.";
   }

   // Die Frage ergibt nur Sinn, wenn heute wirklich eingecheckt wurde —
   // vorher (todayMood === null) zeigen wir die Primary-Card trotzdem
   // (sinnvoller Default), aber noch keine Frage-Zeile. Das deckt sich
   // mit dem bisherigen Verhalten der MESSAGES-Anzeige in mood-checkin.tsx.
   const showQuestion = todayMood !== null && primary !== null;

7. Neu — feste Liste aller sechs Anlaufstellen, minus der aktuellen primary:

   const ALL_DESTINATIONS = [
     {
       key: "values",
       sentence: "Ich würde gern meine Werte reflektieren",
       href: valuesHref,
       badge: valuesBadge,
     },
     {
       key: "overthinking",
       sentence: "Ich bin schon wieder am Overthinken",
       href: "/recipes/overthinking",
     },
     {
       key: "bor",
       sentence: "Ich brauch ein Reminder, was ich mir erlauben darf",
       href: "/recipes/bill-of-rights",
     },
     {
       key: "mantra",
       sentence: "Ich fühl mich grad nicht gut genug",
       href: "/cleansers/mantra",
     },
     {
       key: "promises",
       sentence: "Ich will mein Versprechen an mich selbst einlösen",
       href: "/cleansers/promises",
     },
     {
       key: "confidence",
       sentence: "Ich brauch 'n schnellen Confidence-Boost",
       href: "/cleansers/confidence",
     },
   ];
   const alternatives = ALL_DESTINATIONS.filter((d) => d.key !== primary?.key);

   Hinweis: Diese Liste ist bewusst statisch (nicht aus RECIPES generiert),
   weil die Ich-Satz-Formulierungen handgeschrieben sind. Aktuell deckt sie
   exakt die sechs verfügbaren Rezepte/Cleanser ab (RECIPES.filter(r =>
   r.available) + die drei Cleanser aus cleansers/page.tsx). Sollten
   "wants", "saying-no" oder "shadow" künftig live gehen, muss hier von
   Hand ein weiterer Eintrag ergänzt werden.

8. Neue Reihenfolge im JSX (innerhalb von <DashboardReveal>):
   a. Greeting (unverändert)
   b. <MoodCheckin initialScore={todayMood} />  ← JETZT VOR der Empfehlung
   c. <DailyFocus tier={tier} primary={primary} fallbackMessage={fallbackMessage}
        showQuestion={showQuestion} alternatives={alternatives} />
   d. Heutiges Recht (unverändert)
   e. Streaks-Reihe (unverändert)

Importiere PrimaryRecommendation/Destination-Typen aus daily-focus.tsx
statt sie zu duplizieren.
```

### Manuell — danach prüfen (gesamt)

1. Frischer Test-Account, noch kein Check-in heute → Primary-Card zeigt eine sinnvolle Default-Empfehlung, aber noch keine Frage-Zeile
1. "Erschöpft" antippen → Avatar wechselt Ausdruck, Nachricht + Frage ("Brauchst du eine Mantra-Pause?") erscheinen, Primary-Card zeigt die Mantra-Empfehlung; ein laufendes Werte-Rezept taucht stattdessen mit Badge in der Alternativen-Liste auf
1. "Stark" antippen → Primary-Card wechselt zurück zur Rezept-Empfehlung (mit korrektem Badge, falls in Bearbeitung), Mantra erscheint jetzt in der Liste
1. `current_step` eines Werte-Rezepts manuell in Supabase ändern (z. B. auf 2) → Badge zeigt korrekt "Schritt 2 von 3", egal ob Werte gerade primär oder in der Liste ist
1. Alle Rezepte als `completed` markieren → bei "normal"-Tier erscheint die Fallback-Nachricht statt einer Empfehlung, keine Frage-Zeile, Alternativen-Liste zeigt weiterhin alle sechs Einträge
1. Heutiges Recht und Streak-Reihe unverändert sichtbar und korrekt
1. `npm run build && npm run lint` — keine TypeScript- oder Lint-Fehler
1. Mobile-Ansicht: Avatar, Mood-Buttons, Frage, Primary-Card und Alternativen-Liste brechen nicht um

-----

## Später (bewusst nicht in diesem Update)

- Fortschritts-Reise / Journey-Map über alle Rezepte & Cleanser
- KI-generierte Wocheninsights aus Journal-Einträgen auf dem Dashboard
- Streak-StatCards durch Trend-Visualisierungen ersetzen/ergänzen
- Falls der Avatar sich bewährt: Prüfen, ob `MoodAvatar` als generischerer App-Mascot auch außerhalb des Dashboards Sinn macht (eigenes, größeres Thema)
