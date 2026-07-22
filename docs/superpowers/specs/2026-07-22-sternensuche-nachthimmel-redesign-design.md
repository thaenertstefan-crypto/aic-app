# Sternensuche → Nachthimmel-Redesign

**Datum:** 2026-07-22
**Status:** Design abgestimmt, bereit für Implementierungsplan
**Betroffene Fläche:** `/me/wants/journey` (Sternensuche-Wizard)
**Art:** Präsentations-Redesign — Bühne, Motion, Copy. **Kein** Logik-/Datenumbau.

## Kontext & Problem

Die Sternensuche (`app/(app)/me/wants/journey/wants-journey.tsx`) ist der einzige
`/wants`-Screen, der **nicht** in der Nachthimmel-Szenen-Grammatik lebt, in der
die Geschwister-Flächen längst zuhause sind:

- **Star-Map** (`star-map.tsx`): voller Himmel, 4-strahlige Sterne, Tap-to-Focus, keine Karten.
- **Values-Journey** (`values-journey-client.tsx`): immersive Konstellation, Maskottchen in der Ecke.
- **Sternschmiede** (`schmiede/sternschmiede.tsx`): eigener `ForgeBackdrop`, themed Art pro Phase.

Die Sternensuche trägt dagegen das alte Formular-Muster: zentriertes `md`-Maskottchen +
`text-2xl` Fraunces-Bold-H1 + Formularkarten, wiederholt auf **jedem** Schritt. Das
erzeugt Stefans „die Wizards sehen überall anders aus"-Eindruck. Zusätzlich sind die
zwei emotional wichtigsten Momente — Warte-Screen und Abschluss — die visuell kahlsten
(Skeleton-Balken bzw. generisches Häkchen). Impeccable-Critique-Score: **29/40 (Good)**,
Schwächen bei Consistency (2) und Aesthetic/Minimalist (2).

Snapshot: `.impeccable/critique/2026-07-22T05-56-08Z__app-app-me-wants-journey-wants-journey-tsx.md`.

## Ziel

Die Sternensuche in denselben Nachthimmel holen, in dem Star-Map und Schmiede schon
leben — durch eine geteilte, persistente Himmel-Bühne, zurückgenommene Titel-Hierarchie,
weiche Übergänge und zwei echte Peak-Momente. Die stark funktionierende Logik bleibt
unangetastet.

## Phasen-State-Machine (unverändert)

`nudge → yin → yang → tagtraum → analyzing → sterne → done` (Werte-Nudge nur ohne
Werte-Hypothese). Die Phasen und ihre Datenflüsse bleiben; nur die Darstellung ändert sich.

---

## 1. Geteilte Schritt-Bühne (Fundament)

Eine gemeinsame Hülle für alle Schritte mit **persistentem** Nachthimmel-Hintergrund und
**persistentem** Maskottchen. Beim Schrittwechsel bleiben Himmel + Maskottchen stehen;
nur der Vordergrund (Frage + Felder) wechselt. Das ist der Hebel, der die harten
Übergänge auflöst.

- **Himmel-Backdrop:** Wiederverwendung/Anpassung von `FocusSky` (`focus-sky.tsx`) bzw.
  seiner `sky-light` / `sky-light-twinkle`-Sprache als ambienter, leise funkelnder
  Bühnen-Hintergrund. Rein gemalte Gradienten + Spans, **kein** `backdrop-filter`
  (Glass-Is-Rare, iOS-freundlich). Tiefer gedimmt als die Star-Map, damit Titel + Text
  die Bühne behalten. Als `absolute inset-0` hinter dem scrollbaren Inhalt der Hülle.
  - Umsetzungsentscheidung im Plan: `FocusSky` direkt wiederverwenden vs. eine schlanke
    `WizardSky`-Variante extrahieren. Ziel: ein Backdrop-Baustein, kein dritter Himmel.
- **Maskottchen:** klein (`size="sm"`), unten in der Bühnen-Ecke, schaut über alle
  Eingabeschritte mit (wie Star-Map/Values). Der zentrierte `size="md"`-Block oben
  entfällt auf den Eingabeschritten.
- **Titel-Hierarchie:** Die Schritt-Fragen bleiben in Fraunces (Serif-ist-Stimme —
  „Wofür nimmst du Mühsal in Kauf?" ist echte App-Stimme), aber runter von
  `text-2xl font-bold` auf `text-xl` / `font-semibold`. Sie schweben auf dem Himmel
  statt zu schreien.
- **Fortschritt:** Header-Untertitel „Schritt 1 von 3" — **nur** auf den drei
  Eingabeschritten (yin=1, yang=2, tagtraum=3). Nutzt die aktuell leere
  `SubPageHeader`-Untertitelzeile (kein Extra-Banner; konsistent mit dem Values-Muster
  „Tag N von 7"). Auf `nudge`/`analyzing`/`sterne`/`done` **kein** Zähler.

**Isolation:** Die Bühne ist eine Wrapper-Komponente (z. B. `JourneyStage`), die
`header`, den persistenten Himmel, das persistente Maskottchen und einen Slot für den
schrittspezifischen Vordergrund kapselt. Jeder Schritt rendert nur noch seinen
Vordergrund hinein. Das reduziert die heutige Wiederholung (jede Phase baut ihr eigenes
`min-h-lvh`-Gerüst) auf eine Stelle.

## 2. Übergänge zwischen den Fragen

Persistente Bühne + Vordergrund-Wechsel als **ruhiges Crossfade mit leisem Aufsteigen**:
alte Frage fadet aus, neue fadet ein und steigt dabei ~8px sanft auf.

- **Reduced-motion:** sofortiger Schnitt (kein Fade/Move), Inhalt nie versteckt.
- **iOS-PWA-Falle:** **keine** React/Browser View-Transitions-API — die rendert in der
  iOS-Standalone-PWA nicht. Echte CSS/JS-Animation (Tailwind `animate-in` bzw. GSAP,
  konsistent mit dem Rest der App).
- **Tailwind-v4-Falle:** wenn `translate-*` für den Rise genutzt wird, muss die Transition
  `translate` explizit nennen (`transition-[opacity,translate]`), sonst springt die Position.
- Der bestehende `useScrollTopOnChange(phase)` bleibt (Scroll-Reset beim Schrittwechsel).

## 3. Warte-Screen (`analyzing`) — Peak 1

Skeleton-Balken **raus**. Stattdessen: der Nachthimmel der Bühne, in dem nach und nach
leise Sterne **auffunkeln** (gestaffeltes Opacity-/Twinkle-In der `sky-light`-Punkte),
„dein Himmel entsteht gerade …". Kleines Maskottchen in der Ecke schaut hoch
(`expression="curious"`).

- **Copy:** „Ich schaue, was deine Sternensuche über deine Wants verrät …" →
  „Dein Himmel entsteht gerade …" (oder eine gleichwertig warme Variante im Plan).
- **Reduced-motion:** Sterne einfach still da, keine gestaffelte Einblendung.
- Der Screen kündigt die Konstellation an, die auf `sterne`/`done` ankommt.

## 4. Ergebnis-Screen (`sterne`) — Konstellations-Liste

- **Kopf:** großer funkelnder 4-strahliger Held-Stern (`STAR_PATH`, Gold-Glow) **statt**
  des `happy`-Maskottchens.
- **KI-Einschätzung (`comment`):** als **Glass-Karte** (`glass-card`) statt solider
  Plum-Karte — eines der erlaubten 1–2 Glass-Hero-Momente pro Screen.
- **Vorschläge (`draftWants`):** als **kompakte Stern-Zeilen** statt immer-offener Karten:
  - Kollabiert: Stern-Glyphe + Name + einzeilig gekürzter Text + Chevron. Ferne Sterne
    gedimmt/kleiner (wie Star-Map).
  - **Antippen öffnet** die volle Bearbeitung inline (Progressive Disclosure, analog zur
    Star-Map-Fokus-Logik): Titel-Input, Text-Textarea, „Passt zu deinem Wert"-Chip,
    `reason`, der `question`-Rückfrage-Block inkl. „Konkreter machen" (Refiner), und
    Verwerfen.
  - Zeilen togglen unabhängig (Muster wie der bestehende „Bonus"-Accordion); Default
    kollabiert. Ein neu per Hand hinzugefügter Stern erscheint **aufgeklappt**, damit man
    sofort tippen kann.
  - `keptCount` zählt weiterhin alle nicht-leeren Sterne (kollabiert oder offen).
- **„Eigenen Stern hinzufügen":** als Zeile/Feld am Ende der Liste.
- **CTA:** „Diese N Sterne behalten" mit **Stern-Glyphe statt `Compass`-Icon** (Kompass =
  Werte im Design-System; auf Wants ein Metaphern-Bruch).
- **Manueller Modus & aiError-Zweig** bleiben funktional erhalten (nur in die neue Bühne
  eingepasst).

## 5. Abschluss-Screen (`done`) — Dein neues Sternbild — Peak 2

Das `CompletionCelebration`-Häkchen **raus** (auf diesem Screen). Stattdessen: die neu
erschaffenen Sterne erscheinen als **kleine Konstellation** — 4-strahlige `STAR_PATH`-
Glyphen, verbunden durch eine sich sanft ziehende Linie (Wiederverwendung der
`constellation-draw`-Sprache aus `values-journey-client.tsx`), Sterne funkeln auf.

- **Copy:** H1 → „N Sterne stehen jetzt an deinem Himmel." (Fraunces), darunter warmer
  Satz + CTA „Zu deinen Sternen".
- **1-Stern-Fallback:** bei genau einem Stern kein Sternbild (liest nicht als Bild) →
  schlichter Held-Stern + „Dein Stern leuchtet." (Variante A aus dem Brainstorming).
- **Reduced-motion:** Konstellation sofort vollständig da, keine Draw-/Twinkle-Animation.
- Bewusst weiterhin **ohne** `SubPageHeader` (Vollbild-Feier), aber jetzt mit echtem
  Peak-Charakter.

## 6. Copy & geteilter Stern-Glyph

- „Weiter zum Leuchten" → **„Weiter"**.
- „Meine Wants destillieren" → **„Meine Sterne finden"**.
- Die 4-strahlige `STAR_PATH`-Glyphe (`"M8 0 L9.8 6.2 L16 8 L9.8 9.8 L8 16 L6.2 9.8 L0 8 L6.2 6.2 Z"`,
  heute lokal in `star-map.tsx`) wandert in eine **geteilte Komponente** (z. B.
  `components/brand/star-glyph.tsx`, exportiert `StarGlyph` + `STAR_PATH`). Verwendung:
  Ergebnis-Zeilen, Held-Stern, Abschluss-Konstellation, „Sterne behalten"-CTA. `star-map.tsx`
  importiert die Glyphe künftig von dort (ein Symbol, ein roter Faden).

---

## Bewusst NICHT angefasst (Out of Scope)

- Offline-Draft + Restore (`useFormDraft`, `DraftRestoreBanner`).
- KI-Fallback: Retry + Manuell-Modus (`aiError`-Zweig, `AI_FALLBACK_MESSAGE`).
- Werte-Nudge-Phase (`nudge`) — Inhalt/Logik unverändert, nur in die Bühne eingepasst.
- Alle Server-Actions (`saveYinYangEntryAction`, `saveWantsAction`, `runDistiller`,
  `refineWant`) und API-Routen.
- a11y-Labels, Pflichtfeld-/maxLength-Constraints, disabled-CTA-Logik.
- Intro-Sequenz (`RecipeIntro`) + `IntroInfoButton`.

## Verifikations-Gates

- `npx tsc --noEmit`, `npm run gate` (Kontrast + Typo + Motion), `npm run build`.
- Kontrast: Glass-Karte + gedimmter Himmel gegen Moonlight-Text ≥ 4.5:1 prüfen
  (`scripts/check-contrast.mjs`).
- Reduced-motion-Pfad für Bühne, Übergänge, Warte-Auffunkeln und Abschluss-Konstellation.
- **Finales Gate = iPhone** am Live-Deploy (Stefans Konvention): keine Desktop-Browser-
  Verifikations-Runde.

## Bekannte Fallen (aus Projekt-Memory)

- iOS-PWA rendert die View-Transitions-API nicht → echte CSS/JS-Animation.
- Tailwind v4: `translate` als eigene Property in der Transition nennen.
- Full-bleed Standalone-PWA-Bühne: `lvh` statt `svh`/`dvh` (Body-BG-Streifen unten).
- iOS backdrop-filter-Fades: Glass nur sparsam; `isolate` + `transform-gpu` +
  `will-change-[opacity]` falls ein Glass-Element ein-/ausfadet.
- Falls für die Ergebnis-Zeilen ein Portal-/Dialog-artiges Fokus-Handling genutzt wird:
  `focus({ preventScroll: true })` (Seitenende-„Ploppen").
