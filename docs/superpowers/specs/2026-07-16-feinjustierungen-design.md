# Feinjustierungen quer durch die App — Design

_Datum: 2026-07-16 · Status: von Stefan freigegeben (mündlich im Brainstorming)_

Eine Sammelrunde kleiner bis mittlerer Feinjustierungen aus Stefans Geräte-Test. Ein
großer Design-Brocken (Sternschmiede-Wizard + Funken-Logik), der Rest sind Copy-,
Layout- und Verhaltens-Fixes. Alles Mobile-first (~375px), alle Texte Deutsch, Du-Form.

---

## 1. Sternschmiede (`app/(app)/me/wants/schmiede/`)

### 1.1 Neuer Wizard-Ablauf mit Briefing-Schritt

Die Kindheitsfrage wandert von der Schmiede-Startansicht (Bets-Liste, Phase `intro`)
in einen neuen, eigenen Wizard-Schritt. Neue Phasen-Folge in `sternschmiede.tsx`:

1. **`intro`** (Startansicht, wie bisher): Funken-Liste + Button „Funken schlagen" —
   **ohne** Kindheitsfrage.
2. **`briefing`** (NEU, öffnet nach Tipp auf „Funken schlagen"):
   - Oben eine **Illustration Kompass + Sterne** — kleine SVG-Komposition aus den
     bestehenden Brand-Motiven (Kompass-Rosette aus `/values`, Stern-Glyphen aus der
     Journey). Kein externes Asset.
   - Erklärtext in warmem Ton: Hier entstehen Ideen zum Ausprobieren — Dinge, die
     Spaß machen und dich zum Leuchten bringen könnten, geschmiedet aus deinen
     **Werten**, deinen **Sternen** und einer kleinen, aber feinen Frage, die oft
     überraschend aufschlussreich ist und Inspiration bieten kann.
   - Darunter die **Kindheitsfrage** (Textarea, weiterhin optional, bestehender
     Placeholder bleibt).
   - CTA „Funken schlagen" → startet `forging`.
3. `forging` → `funken` → `done` (wie bisher).

### 1.2 Funken-Logik: Zufall im Code, feste Slots

Die Server-Route (Forge-Endpoint) würfelt selbst und gibt der KI feste Slots vor —
die weiche „AUSGEWOGENHEIT"-Regel im System-Prompt (`lib/anthropic/prompts/sternschmiede.ts`)
wird durch eine Slot-Struktur ersetzt, die pro Request dynamisch in die User-Message
(oder einen Prompt-Anhang) geschrieben wird:

- **Ohne Kindheitsantwort → genau 4 Funken:**
  - Funke 1: zu Wert A, Funke 2: zu Wert B — A und B werden **server-seitig per
    Zufall** aus den bestätigten Werten des Users gezogen (z. B. aus Freundlichkeit,
    Abenteuerlust, Fitness, Ausgeglichenheit, Dankbarkeit → Abenteuerlust +
    Ausgeglichenheit → Wochenendtrip planen, Yoga-Schnupperstunde).
  - Funke 3 + 4: aus den Sternen (wie bisher: angrenzende neue Ideen, niemals
    Umformulierungen bestehender Sterne).
- **Mit Kindheitsantwort → genau 5 Funken:** die 4 von oben + Funke 5 aus der
  Kindheitsantwort.
- `reason` benennt pro Funke die echte Quelle („nährt deinen Wert Abenteuerlust",
  „knüpft an deinen Stern … an", „erinnert an deine Kind-Antwort").
- **Fallbacks:**
  - Keine bestätigten Werte → 4 Funken rein aus Sternen (heutiges Verhalten).
  - Keine Sterne → 4 Funken aus 4 server-seitig ausgewürfelten Werten (bei weniger
    als 4 Werten: Werte dürfen doppelt bedient werden).
  - „Neue Funken schlagen" würfelt die Werte neu.

### 1.3 Abschluss + Optik

- **Abschluss-Screen (`done`):** nur noch ein CTA „Zurück zur Schmiede"; alle
  weiteren CTAs entfallen.
- **`ForgeBackdrop`** (`components/backdrops/forge-backdrop.tsx`): Die von unten
  aufsteigenden Funken wechseln von Gold auf **Rose Celebrate `#C97B84`**
  (Brand-Rosé aus DESIGN.md).

---

## 2. Wants-Flow / Sternensuche (`app/(app)/me/wants/`)

- **Einleitetext auf `/me/wants`:** „Finde mit der Sternensuche heraus, was dich zum
  Leuchten bringt, was dir echte Freude bringt und dir dieses Gefühl von tiefer
  Zufriedenheit entlockt."
- **Audit-Wizard Schritt 2:**
  - Frage: Was bringt dich in „Flow“? („Flow“ in deutschen Anführungszeichen
    U+201E/U+201C, wie von Stefan vorgegeben).
  - Bonus-Frage-Kasten: vertikales Padding symmetrisch (oben = unten).
- **Ergebnisscreen (nach KI-Destillation):** Überschrift entfällt. Stattdessen nur:
  „Das lese ich aus deiner Sternensuche heraus. Pass die Sätze an, …" — der
  bestehende Folgetext nach „Pass die Sätze an," bleibt wortgleich erhalten.
- **Completion-Screen:** nur noch ein CTA „Zu meinen Sternen".
- **Brücken-Karte** (Richtung Schmiede): Titel „Lust, neue Sterne zu entdecken?"
- **Tunnel-/Warp-Transition** (/wants ↔ Schmiede): Gesamtdauer ca. 25–30 % kürzer,
  gleiche Choreografie. Feinjustierung nach Gefühl auf dem echten Gerät.

---

## 3. Sky-Background — global (`components/backdrops/sky-backdrop.tsx`)

Mehr Sterne mit Verteilung **Richtung Bildschirmmitte** (bisher konzentrieren sie
sich an Rändern/oben). Gleiche Größen- und Funkel-Sprache wie die bestehenden.
Die Anpassung erfolgt in der geteilten Komponente und wirkt damit überall, wo der
Sky-Backdrop eingesetzt wird (Dashboard **und** Wants-Rezept).

---

## 4. /me-Hub (`app/(app)/me/me-hub.tsx`)

Szenen-Reihenfolge: **Werte → Wants → Bill of Rights**.

---

## 5. Werte (`app/(app)/me/values/`)

- **Landing:** Kompass größer darstellen.
- **Journey-Sternbild:** Der letzte Stern „Auswertung & Erkenntnisse" wird deutlich
  größer, bekommt warmen Gold-Glow/Puls und ein prominenteres Label — bleibt in der
  Sternbild-Sprache. Bei `prefers-reduced-motion`: statisch (größer + Glow, kein Puls).

---

## 6. Bill of Rights (`app/(app)/me/bill-of-rights/`)

- **Manuell hinzufügen:** „Ich habe das Recht," steht als fester, nicht löschbarer
  Präfix visuell **in** der Textbox; der Cursor startet nach dem Komma, der User
  schreibt nur die Fortsetzung. Umsetzung: statischer Text im Eingabe-Container +
  Eingabefeld dahinter (kein manipulierbares Text-Prefix im selben Input — Löschen
  ist damit technisch unmöglich). Gespeichert wird der zusammengesetzte Satz.
- **Seite:** Der Nein-Trainer-Verweis wird entfernt.

---

## 7. Kopfapotheke (`app/(app)/booster/page.tsx`)

Maskottchen oben entfällt. Stattdessen Untertitel unter der Überschrift (Muster der
anderen Seiten): „Für Momente, in denen der Kopf lauter ist als nötig."

---

## 8. Overthinking (`app/(app)/booster/overthinking/`)

Schritt 1: vertikale Abstände zwischen den Elementen verringern (kompakteres Layout).

---

## 9. Schattenseite (`app/(app)/booster/shadow/`)

- **Schreib-Screen:** „Niemand liest mit — nicht mal die KI." → „Niemand liest mit."
- **Abschluss-Screen:** Der Satz „Die KI bekommt das nie zu sehen" entfällt ebenfalls
  (Zeile bleibt: „Mit Schloss im Journal — nur für dich.").
- **Rage Walk:** Die Stoppuhr startet nicht mehr automatisch beim Betreten der
  Walk-Phase, sondern erst nach Tipp auf einen **Start-Button** (großer, einladender
  Knopf an Stelle der laufenden Uhr; danach Verhalten wie bisher).

---

## 10. Journal (`app/(app)/journal/`)

Kategorie-Leiste nur noch horizontal scrollbar (`overflow-x-auto overflow-y-hidden`,
ggf. `touch-action: pan-x`) — kein vertikales Mitscrollen mehr.

---

## Entscheidungen aus dem Brainstorming

| Frage | Entscheidung |
|---|---|
| Endstation Werte-Journey | Größerer Glow-Stern (in Sternbild-Sprache) |
| Booster-Untertitel | „Für Momente, in denen der Kopf lauter ist als nötig." |
| Funken-Zufall | Im Code (Server würfelt, KI bekommt feste Slots) |
| Sky-Background | Global anpassen (geteilte Komponente) |
| Schattenseite KI-Hinweise | Beide Sätze entfernen (Schreib- + Abschluss-Screen) |

## Verifikation

- `npx tsc --noEmit` + Klick-Test auf dem Gerät (Stefan testet gegen den Live-Deploy).
- Schmiede-Logik: mindestens 2 echte Forge-Durchläufe — einmal ohne, einmal mit
  Kindheitsantwort — und prüfen: Anzahl (4/5), 2 Funken mit Wert-`reason` zu den
  server-seitig gewählten Werten, 2 Stern-Funken, ggf. 1 Kind-Funke.
