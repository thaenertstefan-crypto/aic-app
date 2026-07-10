# Dashboard „Vorschlags-Shuffle" — Design-Spec

**Datum:** 2026-07-10
**Status:** Vom User freigegeben (Brainstorming-Session)
**Betrifft:** Block unter „…oder brauchst du gerade was anderes?" auf dem Dashboard
(`components/dashboard/daily-focus.tsx`)

## Problem

Der aktuelle Slot-Reel (fixhohes Scroll-Fenster mit Snap und Edge-Fade über ~8
umrandete Ich-Satz-Zeilen) funktioniert, hat aber keinen Charakter — kein Bezug zur
Marke (Maskottchen-Wärme, atmende Motion). Diagnose aus dem Brainstorming: **„es ist
seelenlos"** — nicht die Optik der Zeilen, nicht das Scroll-Verhalten, nicht die Menge.
Der Charakter soll primär über **Motion/Verspieltheit** kommen (User-Entscheidung),
und die Darstellung soll auf **Gruppen von 2–3 CTAs** wechseln, zwischen denen man
blättern kann — kein vertikales Scrollen mehr.

## Lösung: „Vorschlags-Shuffle"

Genau **eine sichtbare Gruppe von 3 Vorschlägen** + ein stiller Trigger, der die
nächste Gruppe „hinlegt". Interaktionsmodell: **Dialog statt Navigation** — der
Begleiter macht einen neuen Vorschlag, der User navigiert kein Menü.

### Aufbau

1. Überschrift (unverändert): *„…oder brauchst du gerade was anderes?"*
2. **3 Vorschlags-Zeilen** — Optik wie bestehend: Hairline-Border (`rounded-lg border`),
   Ich-Satz (`text-sm font-medium`), `ChevronRight`, hover `bg-muted/40`.
3. Trigger darunter: **nur das ↻-Icon** (lucide `RefreshCw`), zentriert,
   `text-muted-foreground` (hover → foreground) — kein Schriftzug, das Dashboard
   trägt schon genug Text (User-Entscheidung). Echter `<button>` mit
   `aria-label="Zeig mir was anderes"` und vollem 44px-Touch-Target (Icon selbst
   bleibt klein). Klar leiser als der goldene Primary-CTA (One-Candle-Regel
   bleibt intakt).

### Gruppierungs-Logik (Entscheidung: feste Rotation mit kuratiertem Start)

- Die vom Server kommenden `alternatives` (Primary bereits herausgefiltert, ~7–8 Stück)
  werden client-seitig in **3er-Gruppen** gechunkt.
- **Gruppe 1 ist kuratiert = Akut-Hilfen:** Overthinking, Confidence-Moment („Gleich
  bin ich dran"), Dampf ablassen (Shadow). Zielgruppe kommt oft in verletzlichen
  Momenten — die Akut-Anker zuerst.
- Danach der Rest in fester, stabiler Reihenfolge. Umsetzung: Sortierung über eine
  definierte Key-Priorität, dann chunken (nicht random — deterministisch, kein
  Flackern bei Re-Renders).
- Trigger blättert **zyklisch**: nach der letzten Gruppe wieder Gruppe 1.
- **≤ 3 Alternativen:** Trigger wird nicht gerendert.
- Letzte Gruppe darf 1–2 Einträge haben; die Liste hält eine **feste Mindesthöhe**
  (3 Zeilen), damit darunter nichts springt.

### Motion (das Herzstück)

- **Shuffle-Übergang (out → swap → in):**
  - Out: die 3 alten Zeilen **gestaffelt** (~40 ms Versatz je Zeile) ausblenden —
    Opacity → 0 plus 4–6 px nach **oben**, ~180 ms, ease-out.
  - Swap: `groupIndex` wechselt.
  - In: neue Zeilen gestaffelt von **unten** einschweben (fade + slide-in-from-bottom,
    ~250 ms, ease-out, ~40 ms Versatz).
  - Gefühl: „drei neue Karten hinlegen" — weich, atmend; kein hartes Umblättern.
- **Trigger-Feedback:** ↻-Icon dreht beim Tap eine halbe Umdrehung (Dauer ≈ Swap).
- **`prefers-reduced-motion: reduce`:** sofortiger Austausch ohne Animation, Icon
  statisch. (Pflicht laut PRODUCT.md/DESIGN.md.)

### Technik

- Lebt in `components/dashboard/daily-focus.tsx`, ausgelagert als kleine
  Client-Unterkomponente `SuggestionShuffle` (props: `destinations`).
- State: `groupIndex` (number) + Mini-Phase-State für out→swap→in (z. B.
  `"idle" | "out"`); **nicht** die bestehende `useCrossfade`-Maschine des
  Tier-Wechsels benutzen oder verändern — die blendet den ganzen Fokus-Block
  weiterhin als Ganzes über.
- Ein-Animation über das bestehende `animate-in`/`fade-in`/`slide-in-from-bottom`-Idiom
  (wie `dashboard-reveal.tsx`) mit `animationDelay` pro Zeile; Out-Phase über eine
  kleine CSS-Klasse/Transition, danach Swap per Timeout/`animationend`.
- **Tier-Wechsel-Interaktion:** ändert sich die Alternativen-Liste (anderer Primary),
  wird beim Rendern `groupIndex % groups.length` verwendet — kein Out-of-bounds,
  kein Reset-Bug.
- **A11y:** Trigger ist `<button type="button">` mit sprechendem Label; Listen-Container
  `aria-live="polite"`, damit Screenreader den Gruppenwechsel mitbekommen; alle Ziele
  bleiben zyklisch erreichbar (nicht mehr alle gleichzeitig im DOM — akzeptiert,
  da der Trigger sie deterministisch erschließt).
- **Aufräumen:** `.alt-reel`-Maske aus `app/globals.css` entfernen; Scroll-/Snap-/
  Scrollbar-Klassen und `max-h` aus der Liste entfernen.

## Verworfene Alternativen

- **Horizontal-Carousel (Swipe + Dots):** vertrauter Standard, aber „Navigation statt
  Dialog" und weniger Charakter.
- **Karten-Stapel:** verspielt-physisch, aber zu viel UI-Erfindung für einen
  Sekundär-Block (Product-Register: erlernte Vertrautheit schlägt Neuerfindung).
- **Zufälliges Mischen:** lebendiger, aber gezieltes Wiederfinden („wo ist der
  Overthinking-Booster?") würde zum Glücksspiel.
- **Trigger mit Mini-Maskottchen:** würde das große Maskottchen im Mood-Check-in
  direkt darüber entwerten; Charakter kommt stattdessen aus der Shuffle-Motion.

## Erfolgskriterien

- Der Block fühlt sich wie ein warmer Vorschlag des Begleiters an, nicht wie ein Menü.
- Nie mehr als 3 Optionen gleichzeitig sichtbar; alle Ziele in ≤ 3 Taps erreichbar.
- Erste Gruppe = Akut-Hilfen.
- Kein Layout-Springen unterhalb des Blocks beim Gruppenwechsel.
- Reduced-Motion-Fallback vorhanden; Tier-Crossfade des Gesamtblocks unverändert intakt.
