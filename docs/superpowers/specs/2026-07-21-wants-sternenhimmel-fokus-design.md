# Wants-Sternenhimmel — Kopf-Feinschliff & Fokus-Redesign

**Datum:** 2026-07-21
**Status:** Design freigegeben, bereit für Plan
**Betrifft:** `app/(app)/me/wants/star-map.tsx`, `app/(app)/me/wants/wants-me.tsx`

## Kontext

Der Wants-Sternenhimmel (`/me/wants`) zeigt alle Wants als benannte Sterne. Ein Tap
auf einen Stern öffnet heute eine Fokus-Ansicht per GSAP-Kamerafahrt. Stefans
Kritik nach dem iPhone-Test (Screen-Recording):

1. **Kopf zu dicht:** Deko-Stern (`StarArt`) + „Was mich leuchten lässt" wirken über
   dem SubPageHeader „Meine Wants" wie zwei Überschriften übereinander. Der
   Untertitel „Die Sterne, nach denen du greifst — was dich lebendig macht"
   vermischt zwei Bedeutungen unsauber (Ziele vs. Freudenquellen).
2. **Fokus-Zustand fehlerhaft:**
   - **Scroll-Bug:** Die Fokus-Karte ist ein `absolute inset-0`-Overlay *innerhalb*
     der in-flow StarMap-Box. Held + CTAs stehen zwar auf `opacity-0`, belegen aber
     weiter Layout-Platz → die ganze Seite bleibt scrollbar, die sticky Bottom-Nav
     rutscht mitten in den Bildschirm, darunter tauchen geisterhafte Himmels-Labels
     auf.
   - **Doppelter Stern:** Die Karte wird nur auf `opacity: 0.2` gedimmt/skaliert und
     bleibt hinter der Fokus-Karte sichtbar; die Fokus-Karte rendert oben nochmal
     einen großen Stern. Derselbe Stern erscheint doppelt.
   - **CTA-Überladung:** „← Zurück zum Himmel" + „Bearbeiten" + „Stern loslassen"
     stehen gestapelt; der Bearbeiten-Dialog legt zusätzlich Speichern/Abbrechen/
     Löschen obendrauf, was sich mit „Stern loslassen" doppelt.

**Was gut ist und bleibt:** Titel „Was mich leuchten lässt"; die Brücke unten zur
Sternschmiede („Lust auf Neues?"); der Gold-CTA „Sternensuche" + „Eigener Stern";
die grundsätzliche Idee der Kamerafahrt/des Reinzoomens.

## Ziel

Der Fokus soll aussehen und sich anfühlen, **als gäbe es wirklich nur diesen einen
Stern**, in den man hineinzoomt — scroll-gesperrt, immersiv, ohne Doppelung, mit
aufgeräumten Aktionen. Gleichzeitig atmet der Kopf der Seite.

---

## 1 · Kopf der Seite (`wants-me.tsx`)

- Deko-`StarArt` über dem Titel **entfernen** (inkl. `StarArt`-Import, falls sonst
  ungenutzt). Der ganze Screen ist ohnehin ein Sternenfeld — ein einzelner
  Deko-Stern doppelt das nur und erzeugt den Doppel-Header-Eindruck.
- Untertitel neu: **„Nahe Freuden, ferne Ziele — dein eigener Himmel."** Hält beide
  Bedeutungen sauber und mappt exakt auf das `nah`/`fern`-Distanz-Modell.
- Titel `PAGE_TITLES.meWantsHero` („Was mich leuchten lässt") bleibt unverändert.
- Reihenfolge im Held-Block danach: Titel → Untertitel (kein Icon davor).

## 2 · Sternenkarte & Datenmodell — aktiv/erloschen ganz raus

Der Wegfall von „Stern loslassen" macht das aktiv/erloschen-Konzept obsolet (es war
der einzige Weg, `active: false` zu erzeugen). Das Konzept wird vollständig entfernt.

**`star-map.tsx`:**
- `active`/`out`-Zweige entfernen: keine grauen Sterne, kein `text-muted-foreground`-
  Fall wegen Inaktivität, kein reduzierter Stern für erloschen.
- Rendering nur noch nach Distanz:
  - `nah`: `size-6`, volle Deckkraft, `var(--primary)`, `want-star-twinkle`,
    `drop-shadow … 6px … 55%`.
  - `fern`: `size-3.5`, `opacity-55`, Dunst-Schleier (`bg-foreground/10 blur-md`)
    dahinter, `drop-shadow … 3px … 35%`, Label klein/muted.
- Karte liest `active` **nicht mehr** → bestehende `active:false`-Sterne (nur
  Stefans Testdaten, keine echten Nutzer) leuchten normal.

**Detail-Chips (im Fokus):**
- `fern` + Detailansicht: Chip „Ferner Stern — nach ihm greifst du" bleibt.
- `nah`: **kein** Chip (bewusst; im Design bestätigt).
- Der „Erloschen"-Chip entfällt.
- Wert-Chip („nährt deinen Wert: …") bleibt unverändert.

**`wants-me.tsx`:**
- `toggleActive` und der `onToggleActive`-Pfad entfallen.
- `addOwnStar` schreibt weiter `active: true` (das Feld bleibt Teil des DB-`WantItem`-
  Typs, wird nur nicht mehr gelesen/umgeschaltet). Keine DB-Migration nötig.

## 3 · Fokus-Zustand — „Ein Stern, volle Bühne" (`star-map.tsx`)

### 3.1 Ebene, Scroll-Sperre, Nav

- Die Fokus-Ansicht wird **per React-Portal an `document.body`** gerendert, als
  `fixed inset-0` mit hohem z-Index (über der Bottom-Nav, z. B. `z-[60]`; Nav ist
  `sticky z-50`). Das Portal entkommt allen `transform`/`filter`/ViewTransition-
  Ancestors (die einen fixed-Containing-Block erzeugen würden) und garantiert echtes
  Viewport-Fixed-Verhalten.
- **Scroll-Sperre:** solange fokussiert, `overflow: hidden` am Scroll-Root setzen
  (kleiner Helper/Effect; beim Verlassen zurücksetzen). Verhindert das Mitscrollen
  der Seite und der Nav.
- Die Portal-Ebene bekommt einen **okkludierenden Himmel-Hintergrund**
  (`bg-background`-Basis, sanft — die globale `SkyBackdrop`/`AppBackdrop` liegt
  ohnehin darunter), damit Bottom-Nav und die verblasste Karte im Settle-Zustand
  vollständig verdeckt sind (= „Nav ausgeblendet", volle Immersion). Dieser
  Hintergrund ist während des Flugs noch transparent (siehe Choreografie) und
  blendet erst zum Settle ein.

### 3.2 Ein-Stern-Illusion (FLIP)

- Beim Tap das **Screen-Rechteck** des getippten Sterns via `getBoundingClientRect`
  merken. Den Original-Stern in der Karte sofort auf `opacity: 0` setzen.
- In der Portal-Ebene **einen** Stern von genau diesem Rechteck (Position + Größe)
  in die Bildmitte + auf Held-Größe (`size-16`-Äquivalent) animieren (GSAP, FLIP).
- Gleichzeitig **alle übrigen Karten-Elemente** (andere Sterne, alle Labels,
  Funkelsterne/`MICRO_STARS`, Maskottchen) auf `opacity: 0` faden — **nicht** auf
  0.2. → Auf dem Bildschirm existiert physisch nur der eine, getippte Stern.
- Es gibt **keinen** zweiten Stern in einer Detail-Karte mehr.

### 3.3 Choreografie

1. **Tap:** Scroll-Sperre an; Portal-Ebene mountet (Hintergrund noch transparent);
   Original-Stern aus, Geschwister/Labels/Micro-Stars faden (~0.4s).
2. **Flug (~0.5s):** Portal-Stern fliegt vom Ursprungs-Rechteck in die Mitte und
   wächst. Weil die Ebene noch transparent ist, sieht man den echten Himmel
   zurückweichen (Kamerafahrt-Gefühl bleibt).
3. **Settle:** Kurz bevor der Stern die Mitte erreicht, blenden okkludierender
   Himmel-Hintergrund + Text-Block + „Zurück zum Himmel"-Control ein (verdeckt Nav
   und verblasste Karte endgültig).
4. **Zurück:** Umkehrung — Text/Hintergrund faden aus, Stern fliegt in seinen Slot
   zurück, Geschwister/Labels/Micro-Stars/Maskottchen faden ein, Scroll-Sperre auf,
   Portal unmountet.

### 3.4 Inhalt im Fokus (kein Auberginen-Kasten)

Unter dem zentrierten Stern schweben **direkt auf dem Himmel** (kein
`bg-card`-Kasten):

1. Name (`starName`, große Serif-Heading).
2. Chip „Ferner Stern — nach ihm greifst du" **nur** bei `fern`.
3. Wert-Chip „nährt deinen Wert: …" (falls `valueId`).
4. Beschreibung (`want.text`) — nur ein **zarter Schleier** dahinter für Lesbarkeit
   (z. B. dezenter Hintergrund/Blur-Panel, kein voller Karten-Look).

Oben links: **„← Zurück zum Himmel"** als leises Eck-Control (kein Vollbreit-Button).

## 4 · Bearbeiten — inline, ersetzt den Edit-Dialog

- **Ansehen-Modus** zeigt als einzige Aktion **„Bearbeiten"**. Kein „Stern
  loslassen", kein „Wieder anzünden".
- **„Bearbeiten"** verwandelt dieselbe Fokus-Ebene in-place:
  - Name → `Input` (max 60), Beschreibung → `Textarea`.
  - Aktionszeile → **[Speichern] [Abbrechen]** + leises **„Stern löschen"** mit
    Zwei-Tap-Bestätigung („Stern löschen" → „Wirklich löschen?").
- **Speichern:** persistiert und kehrt in den Ansehen-Modus zurück (weiterhin auf
  denselben Stern fokussiert).
- **Abbrechen:** verwirft Änderungen, zurück in den Ansehen-Modus.
- **Löschen:** Fokus schließt sanft (Fade, **kein** Rückflug — der Stern ist ja weg)
  → persistiert → Himmel erscheint ohne den Stern.
- Der bisherige **Edit-`Dialog`** in `wants-me.tsx` entfällt komplett (inkl.
  `editingId`/`editTitle`/`editText`/`confirmDelete`-State, soweit nur dafür genutzt)
  → keine doppelten Options-Sets mehr. Die Edit-/Delete-Logik lebt jetzt im
  Fokus; `wants-me` stellt Persistenz-Callbacks bereit (`onSaveEdit`, `onDelete`).

**Bleibt unverändert:** Der **„Eigener Stern"-Dialog** (Plus-Button auf der
Übersicht) ist ein separater Anlege-Flow und wird nicht angefasst.

## 5 · Motion & Reduced Motion

- `prefers-reduced-motion`: **kein Flug**. Karte aus, zentrierter Stern + Text
  erscheinen direkt (Crossfade); Rückweg ebenso. Scroll-Sperre und Portal identisch.
- Bestehende Twinkle-Animationen (`want-star-twinkle`, `star-twinkle`) auf der
  Übersicht bleiben.

## 6 · `starZoomed`-Chrome-Logik vereinfachen

Da der Fokus jetzt als Portal-Ebene alles überdeckt, muss das umgebende Chrome
(Held, CTAs, Schmiede-Link) nicht mehr per `starZoomed`-Opacity zurücktreten —
es wird ohnehin verdeckt und die Seite ist scroll-gesperrt. Die `onZoomChange`/
`starZoomed`-Kopplung kann entfallen oder auf das Nötigste reduziert werden (z. B.
nur noch Scroll-Sperre steuern). Ziel: keine „unsichtbar, aber Platz belegend"-
Elemente mehr, die Scrollhöhe erzeugen.

## Nicht-Ziele (YAGNI)

- Keine DB-Migration für `active` (Feld bleibt, wird nur nicht mehr gelesen).
- Keine Änderung am „Eigener Stern"-Anlege-Dialog.
- Keine Änderung an Sternschmiede-Warp, Sternensuche-Journey oder SubPageHeader.
- Kein neues Karten-/Grid-Layout (Hub-Grammatik: Szenen, keine Karten-Listen).

## Verifikation

- `npx tsc --noEmit`, `npm run gate` (Kontrast + Typo + Motion) und `npm run build`
  vor dem Push.
- Visuelles Gate ist Stefans iPhone-Test am Live-Deploy (kein Desktop-Browser-
  Subagent).
- Gezielt prüfen: (a) im Fokus ist die Seite nicht mehr scrollbar, Nav verdeckt;
  (b) nur ein Stern sichtbar, kein Geister-Himmel; (c) Bearbeiten inline, keine
  doppelten Aktions-Sets; (d) Löschen kehrt sauber in den Himmel zurück;
  (e) Reduced-Motion-Pfad ohne Flug funktioniert.
