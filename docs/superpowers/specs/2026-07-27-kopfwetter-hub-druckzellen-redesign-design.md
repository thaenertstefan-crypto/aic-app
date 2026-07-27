# Kopfwetter-Hub — Druckzellen-Redesign

**Datum:** 2026-07-27
**Betrifft:** `app/(app)/booster/*` (Hub-Seite)
**Ersetzt visuell:** [2026-07-23-kopfwetter-hub-druckkarte-design.md](2026-07-23-kopfwetter-hub-druckkarte-design.md)

## Ziel

Der /booster-Hub soll wie eine echte synoptische Wetterkarte aussehen — mit
geschwungenen, geschlossenen Druckgebieten im Stil der beigefügten Referenz
(IMG_9207), aber in den App-Farben. Der aktuelle Zustand (flacher Hintergrund
aus vier fast-vertikalen Isobaren-Linien + einer driftenden Lilac-Front) trifft
den Karten-Look noch nicht: Die Linien lesen als Deko-Streifen, nicht als
Wetterlage.

**Kernidee:** Weg vom geteilten Linien-Hintergrund, hin zu einer Karte, auf der
**jeder Booster sein eigenes Tiefdruckgebiet** ist — konzentrische, geschwungene
Gold-Konturen, in deren Auge das Booster-Icon sitzt (statt der „T"/„H"-Lettern
der Referenz).

## Nicht übernommen aus der Referenz

- **Warm-/Kaltfronten** (rote/blaue Linien mit Halbkreisen/Dreiecken) — entfallen.
- **Druck-Zahlen** (970, 1010, …) — entfallen.
- **Windpfeile** — entfallen (im aktuellen Design ohnehin nicht vorhanden).

## Entscheidungen (aus dem Brainstorming)

1. **Topologie:** Eigene Druckzellen — jedes Icon im Auge eines eigenen
   konzentrischen Ring-Clusters (literalste 1:1-Übersetzung der Referenz).
2. **Dichte:** Mittel — 3–4 Ringe pro Zelle, benachbarte Zellen rücken bis fast
   an die diagonalen Nachbarn heran (kartenhaft, nicht schwebend).
3. **Bewegung:** Langsamer Drift — jeder Ring-Cluster driftet minimal seitlich,
   Icon + Text stehen fest („ziehendes Wetter").
4. **Ringe:** 5 **individuell handgezeichnete** Ring-Sets (Charakter pro
   Wetterlage, wie die /me-Ornamente) — kein prozeduraler Generator.
5. **Tiefenverlauf:** Der dezente Vignette-/Tiefen-Verlauf bleibt als
   Atmosphäre, damit die Zellen nicht auf flachem Schwarz schweben.

## Layout — was bleibt

- Versetzte Links-/Rechts-Aufteilung der fünf Booster (Lesbarkeit).
- Pro Zeile: Ich-Satz (primäres Label) + Modulname (leise Meta-Zeile).
- `Reveal`-Einblendung (600 ms, gestaffelt).
- Kopf: Titel + Einleitungs-Copy (unverändert).

## Zell-Geometrie

- Pro Booster **3–4 verschachtelte, geschwungene** geschlossene Pfade
  (Nieren-/Oval-Form, leicht rotiert) — **keine Kreise**. Der Nutzer wünscht
  ausdrücklich „geschwungene" Druckgebiete.
- Nach innen enger werdend; das Icon sitzt im Zentrum wie das „T" der Referenz.
- **Asymmetrisch zur Seite:** links stehende Zellen buchten nach rechts aus,
  rechte nach links — so greifen die Zellen diagonal ineinander (statt am
  Bildschirmrand zu kleben). Gesteuert über `side: "left" | "right"`.
- Innerster Ring minimal kräftiger (`stroke-opacity ~0.5`), äußere Ringe
  verblassend (`~0.25`) → Tiefe ohne Wertung („kein schlecht→gut-Gefälle").
- Isobaren **einheitlich Gold** (`--primary`) — wie die einheitlich schwarzen
  Konturen der Referenz. Lilac (`--cleanser-confidence`) lebt nur im
  Icon-Akzent (unverändert).

## Komponenten-Architektur

- **Neu:** `app/(app)/booster/pressure-cell.tsx` — Komponente `PressureCell`.
  - Props: `art: React.ReactNode` (das Icon), `side: "left" | "right"`,
    `variant` (welches der 5 Ring-Sets).
  - Rendert Ring-Cluster-SVG **absolut positioniert hinter** Icon + Text
    (`pointer-events-none`, `z` unter dem Text), zentriert aufs Icon, größer
    als die Icon-Box, `overflow-visible`.
  - SVG behält sein Seitenverhältnis (**kein** `preserveAspectRatio="none"`
    Stretch) → Strichbreiten bleiben sauber, `vector-effect` wird **nicht**
    benötigt.
- **Bleibt:** `weather-art.tsx` — die fünf Icons (`WindSwirl`, `CloudStack`,
  `UmbrellaRain`, `StormCloud`, `ClearingStar`) unverändert; sie sind on-brand.
- **Abgelöst:** `pressure-field.tsx` — die vier vertikalen Isobaren + die
  Lilac-Front entfallen. Der dezente Tiefen-Verlauf (`#kw-depth`-Gradient-Rect)
  wandert als leichte Atmosphäre in den Hub (entweder verschlankte
  `PressureField`-Fassung nur mit dem Verlauf, oder direkt in `page.tsx`).
- **`page.tsx`:** Stagger, `Reveal`, Ich-Satz + Modulname bleiben. Das
  Icon-`<span>` wird in `PressureCell` gewickelt; `side` = `left ? "left" :
  "right"`.

## Motion

- Jeder Ring-Cluster erhält einen langsamen seitlichen Drift (`bs-sway` o. ä.,
  zentraler reduced-motion-Fallback in `globals.css`) mit **versetzter Phase**
  pro Zelle, damit sich die Zellen nicht im Gleichschritt bewegen
  (vgl. Memory: schnelle/synchrone Stagger wirken „abgehackt").
- Drift-Amplitude klein (wenige px), damit die Ringe optisch nicht vom Icon-Auge
  ablösen. Icon + Text bleiben statisch.
- Icon-Mikro-Animationen (`bs-*`: Spirale dreht, Regen fällt, Blitz zuckt)
  bleiben unverändert.
- Falls per CSS `translate` animiert wird: Transition/Keyframe muss die
  `translate`-Property explizit nennen (Tailwind v4: `translate` ist eigene
  Property, nicht `transform`).

## Ränder, Overflow & Gates

- `overflow-x-hidden` am Zell-/Bühnen-Wrapper, damit ausblutende Ringe keinen
  horizontalen Scroll erzeugen. **Kein Sticky-Header** auf dieser Tab-Route →
  das bekannte „overflow-hidden bricht sticky Header"-Problem greift hier nicht.
- Ringe dürfen am Bildschirmrand ausbluten (gewollter Karten-Look).
- Verifikation: `npx tsc --noEmit` + `npm run gate` + `npm run build`. Der
  visuelle Abnahme-Check läuft am iPhone-Live-Deploy (kein Desktop-Browser-
  Verifikations-Subagent nötig).

## Offene Kleinigkeiten (Implementierung)

- Konkrete Ring-Pfade der 5 Sets werden beim Bauen handgezeichnet und am Gerät
  feinjustiert (Größe/Ausbuchtung so, dass diagonale Nachbarn sich „fast
  berühren", ohne unruhig zu werden).
- Prüfen, ob der Tiefen-Verlauf mit den nun kräftigeren Ring-Zentren noch
  nötig/dezent genug ist, oder minimal nachgezogen werden muss.
