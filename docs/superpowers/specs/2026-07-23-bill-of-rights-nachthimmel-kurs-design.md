# Bill of Rights zieht in den Nachthimmel — „Der gesteuerte Kurs"

**Status:** Design approved (2026-07-23)
**Surface:** `app/(app)/me/bill-of-rights/*`
**Register:** product (siehe `PRODUCT.md` / `DESIGN.md`)

## Ausgangslage & Motivation

`/me/wants` hat eine vollständige Sternenkarte als Szene; `/me/werte` trägt den
Kompass. Die Bill of Rights blieb metaphorisch verwaist: ein Gerichtshof
(Pergament-Urkunde, Wachssiegel, §, Maskottchen als Richter mit Perücke +
Hammer) — in sich stimmig, aber eine Insel außerhalb der Bildwelt „Dein
Nachthimmel".

Laut Bildwelt-Spec (`docs/superpowers/specs/2026-07-17-bildsprache-nachthimmel-design.md`)
gilt: **Werte = Kompass, Wants = Sterne, Bill of Rights = Navigationsregeln —
„die Regeln, nach denen du navigierst".** Dieses Design bringt die Bill of Rights
in denselben Himmel wie ihre Nachbarn, ohne mit ihnen zu verschwimmen.

Zwei Symptome derselben ungelösten Frage werden mitbehoben: das Sparkles-/Stern-
Icon auf der „Vorschlag generieren"-Kachel (Sterne = Wants) und der Gerichtshof-
Ton des Maskottchens (ein Richter *urteilt* — falscher Frame für den
verletzlichen Moment).

## Leitentscheidungen (mit Stefan festgelegt)

1. **Motiv = „Der gesteuerte Kurs":** eine feine gepunktete Kurslinie mit
   Wegpunkten. **Bewusst KEINE Kompassrose** (das ist Werte) und **KEINE
   Sterne-als-Hauptsache** (das ist Wants). Die *Linien, nach denen du steuerst*
   sind das eindeutige Bill-of-Rights-Element.
2. **Kurs rein atmosphärisch:** keine Kopplung an Siegel oder einzelne Rechte.
   Hintergrund bleibt vollständig von Inhalt entkoppelt; Leer- und Voll-Zustand
   teilen denselben Himmel.
3. **Maskottchen: Sextant, ohne Kostüm.** Perücke fällt weg, Hammer wird zum
   Sextanten. „Begleiter statt Richter."
4. **Copy bleibt unverändert.** Alle bestehenden Texte (inkl. „Verliehen an dich
   — von dir selbst", „Dieses Dokument wartet auf dein erstes Recht", Things-Got-
   Messy-Verzahnung) bleiben wortgleich. Die Urkunde/GlassPanel bleibt der Held
   im Vordergrund.
5. **Scope = Alles:** Szene + Maskottchen + Icon-Fix + Delete-Konsistenz +
   leichte Kachel-Differenzierung.

## Architektur

### Szenen-Ebenen (von hinten nach vorn)

1. **`AppBackdrop`** — global im App-Layout, bleibt unverändert (Blobs +
   vertikaler Gradient).
2. **`SkyBackdrop`** (geteilt, `components/backdrops/sky-backdrop.tsx`) — **wird
   wiederverwendet**, neutral ohne `score`-Prop (wie auf `/me/wants`). Liefert
   den gemalten Abdunkel-Wash + die dezenten `.sky-light`-Funkelsterne. Kein
   `backdrop-filter` (Glass-Is-Rare, iOS-freundlich).
3. **`CourseLine`** (neu) — das einzige einzigartige Bill-of-Rights-Element; die
   gepunktete Kurslinie mit Wegpunkten.

Eine neue Kompositions-Komponente **`bill-of-rights-sky.tsx`** rendert
`<SkyBackdrop />` + `<CourseLine />` gemeinsam, `fixed inset-0 -z-10`,
`aria-hidden`, `pointer-events-none`. Wird aus der Bill-of-Rights-Client-
Komponente gerendert, damit sie bei Navigation weg wieder unmountet (gleiche
Konvention wie `SkyBackdrop` auf Dashboard/Wants).

> **Warum eine eigene Wrapper-Komponente:** hält die Szene an einer Stelle
> zusammen (eine Sache rendern statt zwei), und `CourseLine` bleibt isoliert
> testbar/anpassbar, ohne `SkyBackdrop` anzufassen.

### `CourseLine` — Spezifikation

- **Form:** ein einzelner, sanft geschwungener Pfad (SVG `<path>`), der oben
  rechts in den Himmel eintritt und nach unten/links hinausschwingt. Reine
  Bézier-Kurve, ruhig, nicht verspielt.
- **Strich:** `stroke-dasharray` (gepunktet/gestrichelt), Farbe `--foreground`
  bei niedriger Opazität (~0.28–0.32, im `.sky-light`-Register), damit er als
  „gechartert" liest, nicht als aufgemalt. `fill: none`, `stroke-linecap: round`.
- **Wegpunkte:** eine Handvoll (4–6) kleine Kreise entlang des Pfades. **Hier
  landet die Modulfarbe:** laut `DESIGN.md` ist die Bill-of-Rights-Lichtfarbe
  **Sage (`--success`)**, und „Modulfarbe lebt ausschließlich in Szenen-
  Ornamenten und Glows (`--scene-glow`)". Die Wegpunkte tragen also einen
  Hauch Sage-Glow über `--scene-glow`. **Gold bleibt unangetastet als
  Aktionsfarbe** (One-Candle-Rule).
- **`--scene-glow`:** auf `var(--success)` gesetzt (auf dem Bill-of-Rights-
  Szenen-Wrapper oder in `CourseLine` lokal), sodass bestehende
  `scene-glow`-Keyframes (globals.css) die Sage-Färbung ziehen.
- **Positionierung:** Der Pfad wird in Viewport-Anteilen skaliert (SVG
  `viewBox` + `preserveAspectRatio`), damit er über Gerätehöhen stabil sitzt.
  Full-bleed über `lvh`, nicht `svh/dvh` (Standalone-PWA-Regel), falls Höhe
  explizit gesetzt wird.
- **Motion:**
  - Linie ist **immer sichtbar** (statischer Default — kein class-getriggertes
    Reveal, das auf Headless/Hidden-Tab blank bliebe).
  - Wegpunkte: sehr langsamer, dezenter Glow-Puls (reuse `--scene-glow`-
    Keyframe-Sprache aus globals.css).
  - `@media (prefers-reduced-motion: reduce)`: **komplett statisch, weiterhin
    voll sichtbar** (Linie + Wegpunkte stehen still).

### Maskottchen: `MascotJudge` → `MascotNavigator`

Datei `components/brand/mascot-judge.tsx` → **`mascot-navigator.tsx`**
(nur auf `/me/bill-of-rights` verwendet).

- **Perücke (`JudgeWig`) entfällt vollständig** — inkl. des Über-Blob-SVG-
  Overlays und der `WIG_PULSE`-Atmung.
- **Gavel (`JudgeGavel`) → `Sextant`:** ein kleines eigenes SVG (eigener
  Koordinatenraum, wie beim Gavel), das unten rechts am Blob anlehnt (gleiche
  `rotate`-Wrapper-Anker, außerhalb des Blobs, wird nicht beschnitten).
  Sextant-Silhouette: Bogen-Rahmen (Kreissegment), Radialarm/Index, kleiner
  Spiegel/Teleskop-Andeutung. Holz-/Messington oder gedämpftes Foreground —
  ruhig, nicht bunt; **kein Gold** (bleibt Aktionsfarbe).
- **Blob:** `Mascot` mit würdevollem, leicht gesenktem Blick bleibt
  (`expression="smile"`, `gazeY` leicht nach unten). Breathe/Reduced-Motion-
  Verhalten des `Mascot` unverändert.
- Aufrufstelle in `bill-of-rights-me.tsx` (`{introDone && <MascotJudge/>}`) auf
  `MascotNavigator` umstellen.

### Kleinere Fixes

1. **Icon** (`bill-of-rights-me.tsx`, `ActionTiles`): Import `Sparkles` →
   `Waypoints` (lucide). Die „Vorschlag generieren"-Kachel nutzt `Waypoints`
   (geplotteter Pfad — bindet ans Kurs-Motiv, vermeidet Kompass *und* Stern).
   „Manuell hinzufügen" behält `PenLine`.

2. **Delete-Guardrail (Zwei-Tap-Confirm):** Im Bearbeiten-Dialog wird
   „Recht löschen" zweistufig — analog zu StarMap (`confirmDelete`-State):
   - Lokaler State `confirmDelete: boolean`, beim Öffnen/Schließen des Dialogs
     und bei `startEdit` zurückgesetzt.
   - Erster Tap: Label wechselt zu „Wirklich löschen?" (destructive), löscht
     noch nicht.
   - Zweiter Tap: führt `deleteRight(editingId)` aus und schließt.
   - Behebt die destruktive-ohne-Confirm-Lücke **und** die Inkonsistenz zu
     StarMap (dort schon zwei-Tap).

3. **Kachel-Differenzierung (leicht, risikoarm):** Die zwei identischen
   Gold-Chip-Kacheln sollen nicht mehr als Zwillings-Grid lesen. „Vorschlag
   generieren" liest als führender Pfad, „Manuell hinzufügen" als ruhigere
   Sekundär-Option (z. B. über Chip-/Text-Gewichtung). **Bewusst zurückhaltend:**
   keine zweite Gold-*Aktion* einführen (One-Candle-Rule) — nur die visuelle
   Gleichrangigkeit auflösen. Kein Struktur-Umbau.

## Nicht-Ziele (YAGNI)

- Keine Kopplung des Kurses an Rechte/Siegel (bewusst atmosphärisch).
- Keine Kompassrose, kein Sternbild-Verbinden, keine radialen Chart-Linien
  (Verwechslungsgefahr mit Werte bzw. Wants).
- Keine Copy-Änderungen.
- Kein aktives „Peilen" des Maskottchens (nur angelehnter Sextant).
- Keine mood-/score-reaktive Himmelslogik auf dieser Seite (SkyBackdrop läuft
  neutral).

## Marken-/Regel-Konformität (DESIGN.md)

- **One-Candle-Rule:** Gold bleibt einzig Aktionsfarbe; Szene nutzt Sage-
  `--scene-glow` nur als Ornament. Kein neuer Gold-Akzent auf nicht-interaktiven
  Flächen.
- **Glass-Is-Rare:** Szene rein gemalt (Gradient + SVG), kein zusätzliches
  `backdrop-filter`; die eine GlassPanel-Urkunde bleibt der Glass-Moment.
- **Modul-Lichtfarbe:** Sage für Bill of Rights, korrekt und ausschließlich in
  Szenen-Ornament/Glow.
- **Sticky-Header:** kein `overflow-hidden`/clip-Vorfahr über `SubPageHeader`
  hinzufügen (Backdrop ist `fixed -z-10`, clippt nichts). Bekannte Falle
  vermieden.
- **iOS:** `lvh` statt `svh/dvh` bei Full-bleed; kein neues `backdrop-filter`.
- **Portal-Fokus:** unverändert (Bearbeiten-Dialog nutzt bestehende
  Dialog-Komponente); Zwei-Tap-Delete ändert nur Label-Logik, keine Fokus-/
  Scroll-Mechanik.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `app/(app)/me/bill-of-rights/bill-of-rights-sky.tsx` | **neu** — Wrapper: `SkyBackdrop` + `CourseLine` |
| `app/(app)/me/bill-of-rights/course-line.tsx` | **neu** — das Kurs-Motiv (SVG-Pfad + Wegpunkte) |
| `app/(app)/me/bill-of-rights/bill-of-rights-me.tsx` | Backdrop rendern; Icon `Sparkles`→`Waypoints`; Zwei-Tap-Delete; Kachel-Differenzierung; `--scene-glow` auf Wrapper |
| `components/brand/mascot-navigator.tsx` | **umbenannt** aus `mascot-judge.tsx`; Perücke raus, Sextant statt Gavel |
| `app/globals.css` | ggf. Wegpunkt-Glow-Keyframe/Utility, falls nicht durch bestehende `scene-glow`-Sprache abgedeckt |

## Verifikation

- `npm run gate` (Kontrast + Typo + Motion) grün.
- `npx tsc --noEmit` grün; `npm run build` grün.
- Visuelles Gate = iPhone am Live-Deploy (Stefans Konvention). Keine Desktop-
  Browser-Verifikations-Runde.
- Reduced-Motion-Check: Kurslinie + Wegpunkte sichtbar und statisch; Maskottchen
  ruht.
- Leer-Zustand (kein Recht) und Voll-Zustand teilen dieselbe Szene (visuell
  bestätigen, dass der Kurs in beiden gleich sitzt).
