# Wants-Sternenhimmel — Kamera-Push in den Stern (Design)

**Datum:** 2026-07-21
**Betrifft:** `app/(app)/me/wants/star-map.tsx` (Fokus-Zustand), Hintergrund der Fokus-Ebene
**Baut auf:** `2026-07-21-wants-sternenhimmel-fokus-design.md` (der Portal-/FLIP-/Scroll-Lock-Fokus)

## Problem

Der neue Fokus-Zustand funktioniert gut (keine Nav, kein Scroll, ein Stern, ruhige
Bühne). Zwei Dinge stören noch:

1. **Der Flug liest sich falsch.** Aktuell fliegt der getippte Stern von seiner
   Position in die Bildmitte, während die Karte ausfadet — das wirkt, als *reise
   der Stern zu dir*. Gewollt ist das Gegenteil: die *Kamera schiebt in den Stern
   hinein* und zoomt.
2. **Der Hintergrund ist auberginenhaft.** Die Fokus-Ebene ist eine opake
   Milchglas-Fläche (`bg-background/95 backdrop-blur-xl`), die den echten
   `SkyBackdrop` dahinter verdeckt. Gewollt ist ein gedimmter Sternenhimmel, als
   wäre man in genau diese Stelle der Sternenkarte gezoomt.

Beides ändert **nur den Weg in den Fokus und dessen Hintergrund** — der Ruhezustand
(Stern oben-mittig, Titel, Beschreibung, Bearbeiten-Button, Ansehen/Bearbeiten-Logik,
Persistenz beim Parent) bleibt unverändert.

## Entscheidungen (aus dem Brainstorming)

- **Zoom-Mechanik:** Parallax-Push (nicht: echter Transform der realen Karte). Bleibt
  komplett in der stabilen Portal-Ebene → robust, auch in der iOS-PWA.
- **Himmel im Fokus:** sanft lebendig — die gedimmten Hintergrundsterne funkeln und
  driften leise weiter (nicht still).

## Der eine Ziel-Punkt P

Alles hängt an **P = der Bildschirm-Position (Viewport-Koordinaten) des getippten
Sterns** zum Tap-Zeitpunkt. Wird bereits in `originRef` erfasst
(`{ x, y, size }`). Zusätzlich brauchen wir P **in Karten-lokalen Koordinaten** für
den Transform-Ursprung der realen Karte (Position des Sterns relativ zur oberen
linken Ecke von `mapRef`).

## Choreografie Hinflug (`zoomIn` / Öffnungs-Effekt), ~600 ms

Drei Ebenen wachsen von P aus nach außen → Parallaxe = „Kamera taucht in diese Stelle".

1. **Reale Karte** (`mapRef`, hinter allem):
   - `opacity: 1 → 0` (~0.35 s, `power2.out`)
   - `scale: 1 → 1.15`, `transformOrigin` = P in Karten-lokalen Koordinaten
   - Effekt: die echten Nachbarsterne driften im ersten Moment nach außen, bevor der
     Fokus-Himmel sie überdeckt. Cheap parallax.

2. **Gedimmter Fokus-Himmel** (`layerRef`, Portal, fix, `inset-0`):
   - Start: `opacity: 0`, `scale: 1.35`, `transformOrigin` = P in Viewport-Koordinaten
   - Ziel: `opacity: 1` (~0.4 s), `scale: 1.35 → 1` (settle, `power2.out`)
   - Sanft lebendig: die Sternen-Spans darin behalten ihre Twinkle-/Drift-Klassen.

3. **Der eine Stern** (`flyStarRef`, Portal, `z-[62]`):
   - Wie bisher: `fromTo` von Ursprung (`origin.x−tx, origin.y−ty`, `scale
     origin.size/FOCUS_STAR_SIZE`) auf `x:0, y:0, scale:1` (~0.6 s, `power2.inOut`).
     Das Wachstum dominiert die Bewegung; der Stern ist der Punkt, den die Kamera greift.

4. **Inhalt** (Titel/Text/Bearbeiten, `z-[61]`): erscheint wie bisher zeitversetzt
   (`contentVisible` nach ~350 ms).

### Occlusion-Garantie

Die Himmel-Ebene geht **nie unter Scale 1** (1.35 → 1 beim Hinflug, 1 → 1.35 beim
Rückflug). Aufskalieren eines `inset-0`-Layers deckt immer **mehr** ab, nie weniger —
die Bottom-Nav und die verblasste Karte bleiben in jeder Phase verdeckt. Deshalb ist
eine opake Basis (siehe Hintergrund) + Scale ≥ 1 ausreichend; kein Rand-Aufblitzen.

## Choreografie Rückflug (`zoomOut`), Umkehrung

- **Fokus-Himmel:** `scale: 1 → 1.35` (zieht sich zu P zusammen — die Umkehr des
  Push) + `opacity → 0`.
- **Stern:** schrumpft/fliegt zurück zum Ursprung (wie bisher).
- **Reale Karte:** `scale → 1`, `opacity → 1` (fadet zurück ein).
- Timing wie im Bestand (~0.5 s + Reset von `focusedId` per Timeout).

## Hintergrund: gedimmter, lebendiger Himmel statt Aubergine-Glas

Ersetzt `bg-background/95 backdrop-blur-xl` auf `layerRef` durch eine **solide,
tief gedimmte Kopie der `SkyBackdrop`-Sprache**:

- **Opake Basis:** `bg-background` (voll deckend) — verdeckt Nav + verblasste Karte
  sicher (kein `backdrop-filter`; iOS-heikel und gegen die „Glass-Is-Rare"-Regel).
- **Sternen-Wash darüber:** derselbe gemalte Abdunkel-Gradient wie im echten Backdrop
  (`linear-gradient(180deg, rgba(0,0,0,…) …)`) plus eine Handvoll Sternen-Spans in der
  `sky-light` / `sky-light-twinkle`-Sprache, insgesamt **tiefer gedimmt** als die Karte
  (niedrigere Opacity), damit Titel und Text die Bühne behalten.
- **Kein Glas:** rein gemalte Gradienten + Spans, GPU-billig, konsistent mit
  `SkyBackdrop`.

Umsetzungsdetail: Der gedimmte Himmel wird als **eigener, wiederverwendbarer
Baustein** gerendert (nicht das ganze `SkyBackdrop` mit seiner Score-Logik), damit
er (a) opak/gedimmt für den Fokus konfiguriert ist und (b) als eine Einheit mit
`layerRef` skaliert. Konkrete Struktur (Sternen-Positionen, Dimm-Werte) legt der Plan
fest; Sprache und Twinkle-Klassen kommen aus `SkyBackdrop`.

## Kanten & Constraints

- **Tailwind v4 Transform-Footgun:** Weder `mapRef` noch `layerRef` dürfen
  `scale-*` / `translate-*` / `rotate-*`-Utilities tragen — GSAP schreibt die
  `transform`-Matrix direkt, was mit diesen (eigene CSS-Properties in v4) kollidieren
  würde. Beide tragen nur Layout-/Farb-Klassen.
- **`prefers-reduced-motion`:** harter Schnitt ohne Flug und ohne Scale — Himmel sofort
  bei `opacity:1, scale:1`, Stern in Ruheposition, Inhalt sofort sichtbar (wie im
  Bestand `reduced`-Zweig).
- **Scroll-Lock, Portal, z-Stack, Ansehen/Bearbeiten/Löschen, Persistenz beim Parent:**
  unverändert.
- **Motion-Gate:** Neue/parallele GSAP-Tweens müssen weiter durch `npm run gate`
  (Motion-Check) laufen; Dauer/Ease im etablierten Rahmen halten.

## Nicht-Ziele (YAGNI)

- Kein echter Transform der realen Karte in Viewport-Koordinaten (verworfene
  Alternative — mehr iOS-Risiko).
- Keine Änderung am Ruhezustand, an der Slot-Leiter-Anordnung, am Empty-State oder am
  „Eigener Stern"/„Sternensuche"/Schmiede-Umfeld.
- Kein neues Persistenz-/Datenmodell.

## Verifikation

Kein Test-Framework. Loop wie im Vorgänger-Spec: `npx tsc --noEmit`, `npm run lint`,
`npm run gate` (Kontrast + Typo + Motion), `npm run build`. Visuelles Gate: Stefans
iPhone am Live-Deploy — besonders, ob der Push in genau den getippten Stern taucht,
ob der Himmel als gedimmter Sternenhimmel (nicht Aubergine-Glas) liest, und ob der
Rückflug sauber umkehrt.
