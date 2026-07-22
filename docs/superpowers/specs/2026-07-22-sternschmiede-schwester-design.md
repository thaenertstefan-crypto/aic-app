# Sternschmiede-Redesign: „Schwester der Sternensuche"

**Datum:** 2026-07-22
**Status:** freigegeben (Brainstorming abgeschlossen)
**Betrifft:** `app/(app)/me/wants/schmiede/sternschmiede.tsx`, `components/backdrops/forge-backdrop.tsx`, `components/brand/forge-art.tsx`, `components/wants/warp-transition.tsx`, `components/layout/sub-page-header.tsx`, `app/globals.css`

## Leitgedanke

Die Sternschmiede und die Sternensuche (`app/(app)/me/wants/journey/wants-journey.tsx`) sind ein Paar — Sterne finden ↔ Funken schlagen —, sprechen aber heute nicht dieselbe visuelle Sprache. Die Schmiede wirkt eine Iteration zurück (Maskottchen-Held, Plain-Cards, generische Skeletons), während die Sternensuche auf StarGlyph-Held, Glass-Einschätzung und gezeichnete Konstellation gesprungen ist.

**Ziel:** die Schmiede zur *ebenbürtigen Schwester* machen — gleiche Kopf-Grammatik, gleiche Belohnungs-Dramaturgie — mit eigener Identität durch **Rosé-Glut + Funken** statt goldenem Sternhimmel. Modulfarbe Wants/Schmiede = `--celebrate` (Rosé, `#C97B84`), Gold bleibt reine Aktions-Farbe (One-Candle-Rule).

Grundlage ist die Critique-Momentaufnahme `.impeccable/critique/2026-07-22T11-42-51Z__app-app-me-wants-schmiede.md` (29/40, Kernbefund „Geschwister-Divergenz").

## Kern-Entscheidung: die Esse ersetzt den Amboss

Der Amboss als zentrales SVG-Objekt (`AnvilArt` in `forge-art.tsx`) **wird entfernt**. Das löst drei Kritikpunkte auf einmal: „Amboss zu räumlich", „geschmiedeter Stern passt nicht zur 4-strahligen `STAR_PATH`-Glyphe", und das generische Kolben-/Werkstatt-Vokabular verliert seinen Anker.

An seine Stelle tritt die **Esse**: gemalte Glut am unteren Bildrand, aus der **Funken als glühende Rosé-Punkte** aufsteigen und frei im Raum schweben. Das ist reiner Hintergrund (gemalte Gradienten + aufsteigende Spans), kein Objekt — leicht animierbar, iOS-freundlich (kein `backdrop-filter`), und trägt die Metapher „aus dem Feuer wird ein Stern".

`forge-art.tsx` wird retired (nach Prüfung, dass es nirgends sonst importiert wird).

## Screen-für-Screen

### Landing (`phase: "intro"`) — Funken-Konstellation

- **Hintergrund:** `ForgeBackdrop` wird zur **Esse** — der Ember-Pool wird **vollständig rosé** (heute nutzt der breite Bloom `--primary`/Gold bei 22 %→8 %; künftig `--celebrate`). Der kleine hellere Kern und die aufsteigenden `forge-spark`-Embers bleiben rosé (sind sie schon).
- **Offene Funken (`openBets`)** = **schwebende Glut-Punkte** an stabilen Positionen über der Esse, mit Label. **Antippen → Fokus** (siehe „Funken-Fokus" unten). Die bisherigen Plum-Karten entfallen.
- **Kopf:** kein `<h2>` „Nach den Sternen greifen" mehr, kein doppelter Sektionstext. Ein Kopfsatz trägt: *„Hier schlägst du Funken — kleine, risikofreie Experimente, aus denen ein neuer Stern werden kann."* Der `!hasSterne`-Hinweis bleibt als leiser Zusatz.
- **„Schon gegriffen" (`triedBets`)** = leise **Hairline-Zeilen** unter der Konstellation (kein Karten-Kasten), wie bisher inkl. Journal-Link.
- **„Eigenen Funken hinzufügen"**-Input bleibt, sitzt unter der Konstellation.
- **Gold-CTA** unten: **„Neue Funken schlagen"**. Sonderfall: bei erstem Besuch ohne offene/getriedene Funken schlicht **„Funken schlagen"** (kein „Neue").
- **Reflektier-Icon:** `FlaskConical` (Kolben) raus → szenen-eigenes Glyph (**`Flame`**).
- **„Verwerfen":** bekommt eine **Rückfrage** (zweistufig, wie `confirmDelete` in `star-map.tsx`) statt sofort zu löschen.

### Warte-Screen (`phase: "forging"`)

Skeletons + `AnvilArt active` **raus**. Die **Esse wird heißer** (Bloom intensiver, evtl. warmer Gold-Anteil im Kern) und **Funken sprühen schnell auf** — Text *„Ich schlage ein paar Funken für dich …"*. Direktes Pendant zum „Dein Himmel entsteht …" der Sternensuche (`ANALYZING_STARS`), nur als Funkenflug statt auffunkelnder Sterne.

### Funken-Auswahl (`phase: "funken"`) — Kopf wie Sternensuche

- **Held-Symbol:** großer glühender **Rosé-Funke** (Pendant zum `StarGlyph size-14` im `sterne`-Screen) statt `Mascot`.
- **Einschätzung** (`comment`): als **Glass-Card** (`<Card variant="glass">`), wie im `sterne`-Screen — heute Plain-`<Card>`.
- **Leiser Hinweis** unter dem Kopf: **„Tipp an, um an- oder abzuwählen."** (Muster wie andernorts in der App.)
- **Funken-Liste:** bleibt **verfeinerte Karten** mit klarem Zustand — „an" = gefüllter Rosé-Haken + Glut-Ring (`border-celebrate/55 bg-celebrate/8`), „aus" = sichtbar gedimmt (`opacity-50`). Begründungstext bleibt.

### Success-Screen (`phase: "done"`) — Funken-Schwarm

Statt `Mascot` + „Zurück zur Schmiede": die **frisch geschlagenen Funken steigen aus der Esse auf und schweben als Gruppe** (Funken-Schwarm) über dem Feuer. Titel *„N Funken glühen jetzt in deiner Schmiede."* (1er-Fallback: *„Der erste Funke ist geschlagen."*). CTA **„Zurück zur Schmiede"** → Landing, wo dieselben Funken an derselben Stelle weiterschweben (Kontinuität). Der **goldene Stern bleibt bewusst ausgespart** — Funke→Stern ist erst der spätere echte Moment (nach Ausprobieren + Reflektieren).

## Funken-Fokus (neue Interaktion)

Tap auf einen schwebenden Funken auf der Landing → der Funke fliegt in die Bildmitte über eine gedimmte Esse, darunter erscheinen **Text + „Ausprobiert? Reflektieren" (`Flame`) + „Verwerfen" (mit Rückfrage) + Schließen**.

Umsetzung folgt der **Interaktions-Grammatik der `StarMap`** (Fokus-Ebene per Portal an `document.body`, Scroll-Lock, Focus-Trap, Escape schließt), aber als **eigene, leichtere Komponente** — nicht die volle `StarMap` wiederverwenden (die trägt Edit-Modus, Distanz-Umschaltung etc., die Funken nicht brauchen). Pflicht-Details aus Erfahrung:
- `element.focus({ preventScroll: true })` überall (Portal-Fokus scrollt sonst ans Dokumentende → siehe Memory „Portal-focus() braucht preventScroll").
- Reduced Motion: harter Schnitt ohne Flug.
- `inert` auf der Hintergrund-Konstellation, solange ein Funke fokussiert ist.

## Warp-Übergang zähmen (`warp-transition.tsx` + `globals.css`)

Heute ~980 ms, golden, 48 Streifen bei Opacity 0.95 → liest als goldener Blitz. Ziel: **Sternen-Sturz, dezent**.
- **Dauer ~750 ms gesamt.** Aufteilung z. B. `ACCEL_MS` 260 + `TUNNEL_MS` 140 + `DECEL_MS` 350 (Feinjustage beim Bauen; Navigation weiterhin am Ende des Exit-Slides).
- **Wash entgolden:** die `.warp-wash` nutzt heute `--primary` 42 % radial; künftig Aubergine/Rosé (z. B. `--celebrate` niedrig-alpha bzw. reine Abdunklung), kein goldener Kern.
- **Streifen dezenter:** `STREAK_COUNT` ~24 statt 48, dünner (kleinere `width`), geringere Peak-Opacity (~0.6 statt 0.95), **kühl-weiß** (`--foreground`) statt Gold.

## Zurück-Button vereinheitlichen (`sub-page-header.tsx`)

Der Header-Zurück-Pfeil ist heute ein `<Link transitionTypes={["forge-up"]}>` — React-View-Transitions rendern in der iOS-Standalone-PWA nicht (Memory „ios-pwa-no-view-transitions-api"), also springt der Header auf dem iPhone hart, während der untere „Zurück zu meinen Sternen"-Button den echten `ascend()`-Warp fliegt.

**Fix:** `SubPageHeader` bekommt einen optionalen **`onBack`-Escape-Hatch** (Render-Prop bzw. Callback). Ist er gesetzt, rendert der Zurück-Pfeil als `<button>` und ruft `onBack` (→ in der Schmiede `goBackToStars()`/`ascend()`) statt als `<Link>` zu navigieren. Ohne `onBack` bleibt das heutige Link-Verhalten für alle anderen Screens unverändert. Der `backTransitionTypes`-Pfad der Schmiede entfällt damit.

## Farb- & Kontrast-Notiz

Rosé (`--celebrate`) wird **nur für Glut/Glow/Ornament** genutzt (Funken-Punkte, Ember-Bloom, Auswahl-Ring), nie für Fließtext. Text bleibt Moonlight/Lavender; Gold bleibt die einzige Aktions-Farbe. Damit keine neuen Kontrast-Risiken. Die Esse bleibt low-alpha, damit die eine Gold-CTA nie überstrahlt wird.

## Reduced Motion

Jede neue Bewegung braucht einen `prefers-reduced-motion: reduce`-Fallback (Projekt-Pflicht):
- Esse-Funken-Drift, Warte-Funkenflug, Success-Aufstieg → statisch sichtbar (Funken einfach da), kein Auf-/Aufsteigen.
- Funken-Fokus → harter Schnitt.
- Warp → sofort navigieren (bereits so).

## Umfang / YAGNI (nicht Teil dieser Runde)

- Kein echter „Funke wird zum Stern"-Goldmoment (bewusst dem späteren Reflexions-Flow vorbehalten).
- Keine Änderung an der KI-Logik (`/api/sternschmiede`), an `saveBetsAction` oder am Datenmodell (`BetItem`).
- Keine Änderung an der Sternensuche selbst — sie ist die Referenz, nicht das Ziel.
- Kein Umbau der `StarMap`; der Funken-Fokus ist eine eigene, leichtere Komponente.

## Punkte-Mapping (Stefans 11 Punkte → Lösung)

| Punkt | Lösung |
|---|---|
| Warp zu doll / zu golden / Streifen zu prominent | Warp-Sektion: ~750 ms, entgoldet, ~24 dezente kühl-weiße Streifen |
| Gold-Schimmer im Backdrop soll rosé | Esse: Ember-Bloom `--primary`→`--celebrate` |
| Amboss zu räumlich + Stern ≠ Glyphe | Amboss entfernt (Esse ersetzt ihn) |
| Header „Nach den Sternen greifen" raus, Text in den Kopf | Landing-Kopf zusammengeführt, H2 entfällt |
| Star-Map-Idee / was statt Karten / Kolben passt nicht | Funken-Konstellation über der Esse; Kolben→`Flame` |
| CTA „Neue Funken schlagen" | Landing-CTA (mit „Funken schlagen"-Erstbesuch-Fallback) |
| Header-Zurück = Rückflug wie unten | `onBack`-Escape-Hatch → `ascend()` |
| Warte-Animation langweilig | Esse-Funkenflug statt Skeletons |
| Completion-Kopf wie Sternensuche + Karten klarer antippbar | Held-Funke + Glass-Card + „antippen"-Hinweis + verfeinerte Karten |
| Success-Screen cooler | Funken-Schwarm-Aufstieg |
