# Feinjustierungsrunde — Design-Spec

_Datum: 2026-07-27 · Status: freigegeben (Brainstorming)_

Eine Runde kleiner, unabhängiger Verbesserungen über sieben Bereiche. Ziel: eine
Spec, im Plan in klar getrennte, einzeln commit-/testbare Tasks geschnitten. Die
iPhone-Gates laufen pro Bereich. Statische Gates (`tsc` + `npm run gate` +
`npm run build`) müssen nach jedem Task grün sein.

Entschiedene Weichenstellungen (mit Stefan geklärt):
- **/me:** Nachthimmel-Raum (Meander), nicht Karten-Grid.
- **/booster-Maskottchen:** nur auf Landing/Intro raus, reagierender Begleiter im
  Flow bleibt.
- **/schmiede-Rosé:** ganze Schmiede-Zone inkl. Bottom-Nav-Akzent (route-aware
  Theming), Maskottchen ausgenommen.
- **/onboarding Punkt 4:** nur die kleine Animation (kein Größer/Umsortieren).
- **/login:** Variante B — direkt sichtbar (kein Gate zurück), großer Hero raus,
  ein Maskottchen, Sky-Backdrop dazu.

---

## 1 · /wants

### 1a — Yin/Yang-Wording aus user-facing Text

**Befund:** Die gerenderte Copy sagt bereits „Mühsal"/„Flow" (siehe
`wants-journey.tsx` Yin-/Yang-Phasen), nicht „Yin"/„Yang". Der user-facing Leak
sind die KI-**Begründungen** (`reason` je Stern, gerendert in
`wants-journey.tsx:741` und `schmiede/sternschmiede.tsx:431`): der Distiller-Prompt
rahmt das Audit als „Yin-&-Yang", also echot das Modell diese Wörter gelegentlich
in `comment`/`reason`.

**Änderung:**
- [lib/anthropic/prompts/wants-distiller.ts](../../../lib/anthropic/prompts/wants-distiller.ts):
  interne Audit-Struktur + Tags (`<yin>`, `<yang>`) bleiben; eine explizite
  Ausgabe-Regel ergänzen: **In `comment` und `reason` niemals die Wörter „Yin"
  oder „Yang" verwenden** — den Want stattdessen aus dem konkreten Inhalt herleiten
  (Mühsal/Flow/Tagtraum als Alltagssprache, nicht als Fachbegriff).
- [lib/anthropic/prompts/wants-refiner.ts](../../../lib/anthropic/prompts/wants-refiner.ts):
  gleiche Regel, falls dort ebenfalls Yin/Yang-Rahmung vorkommt (prüfen und
  angleichen).
- Sweep über gerenderte deutsche Strings (`app/(app)/me/wants/**`) als Sicherheit,
  dass keine sichtbare Copy „Yin"/„Yang" sagt.

**Bewusst NICHT angefasst:** interne Variablen-/Phasen-/Tag-Namen (`yin`, `yang`,
`YinYangContent`, `saveYinYangEntryAction`) — Code, kein gerenderter Text; das
Typo-/Text-Gate ist ohnehin nur auf gerenderten Text verengt.

**Verifikation:** Live-API-Testlauf des Distillers, dass kein `reason`/`comment`
die Wörter enthält.

### 1b — Einleitungstext

[app/(app)/me/wants/wants-me.tsx:206](../../../app/(app)/me/wants/wants-me.tsx):

- Vorher: `Nahe Freuden, ferne Ziele — dein eigener Himmel.`
- Nachher: `Meine Freudenquellen und Ziele, nach denen ich greife.`

Reiner String-Swap, deutsche Typografie beachten (Em-Dash entfällt).

---

## 2 · /schmiede

### 2a — Funken driften auf und ab

[components/wants/funken-sky.tsx](../../../components/wants/funken-sky.tsx): jeder
Funke bekommt eine sanfte vertikale Drift. Neuer bzw. erweiterter
`funke-drift`-Keyframe in [app/globals.css](../../../app/globals.css) (Auf-/Ab-
Bewegung, kleine Amplitude), versetzte `animation-delay` je Funke (stabil aus dem
vorhandenen ID-Hash, kein `Math.random` → kein Hydration-Mismatch).
`motion-reduce` → statisch. Bestehende `me-star-glow`/`bs-ember`-Utilities nicht
brechen.

### 2b — Alles Gold → Rosé in der ganzen Schmiede-Zone (Maskottchen ausgenommen)

**Mechanik — route-aware Theming über einen Zone-Marker:**
- Neues Client-Component `ZoneTheme` (z. B. `components/layout/zone-theme.tsx`),
  gemountet in [app/(app)/layout.tsx](../../../app/(app)/layout.tsx). Liest
  `usePathname()`; setzt `document.body.dataset.zone = "schmiede"` wenn der Pfad
  mit `/me/wants/schmiede` beginnt, sonst löscht es das Attribut. Cleanup beim
  Unmount.
- CSS in [app/globals.css](../../../app/globals.css):
  `body[data-zone="schmiede"] { --primary: var(--celebrate); /* + --primary-foreground bei Bedarf */ }`.
  Weil `body` alles umschließt (Seiteninhalt **und** Bottom-Nav), remappt das den
  Gold-Akzent in einem Rutsch: Buttons (`bg-primary`/`text-primary`), Wizard-
  Akzente, Bottom-Nav (`text-primary`, `fill-primary/10`, Indicator `bg-primary`).

**Maskottchen-Ausnahme (Pflicht):** Die Blob-Farbe in
[components/brand/mascot.tsx:108](../../../components/brand/mascot.tsx) ist
`background: var(--primary)` — würde vom Remap mit-rosafiziert. Fix: einen
dedizierten Token `--mascot-body` einführen (`:root { --mascot-body: <gold> }`,
gleicher Wert wie das globale `--primary`), den die Blob-Fläche nutzt. Der
Zone-Remap fasst `--mascot-body` nicht an → Maskottchen bleibt gold. Die Wangen/
Mund-Glut nutzt bereits `--celebrate` (bleibt unverändert korrekt).

**Kontrast:** Rosé-Buttons sind neu (Gold war bisher die CTA-Farbe). `--celebrate`
liegt lt. Gate bei 5,79:1 als Akzent; für Buttons muss die Kombination
Rosé-Fläche × `--primary-foreground` (bzw. passendes Foreground) gegen das
Kontrast-Gate geprüft werden — ggf. `--primary-foreground` im Zone-Scope
mit-remappen. Neue Rosé-Button-Kombi ins `check-contrast.mjs` aufnehmen, falls
noch nicht abgedeckt.

**FOUC:** Der Marker wird per Effect gesetzt (1 Frame Gold möglich beim Eintritt).
Beim Betreten der Schmiede läuft ohnehin der Warp-Overlay darüber → verdeckt; im
stabilen Zustand innerhalb der Schmiede kein Flackern. Akzeptiert.

---

## 3 · /values/journey/journal — zwei Felder zu einem

[app/(app)/me/values/journey/journal/journal-form.tsx](../../../app/(app)/me/values/journey/journal/journal-form.tsx):

Aktuell zwei Textareas:
1. „Was ist heute passiert?" → `happenings`
2. „Welche Gedanken, Gefühle, Reaktionen kamen dabei auf?" → `response`

**Änderung:** eine Textarea, eine zusammengeführte Frage — der exakte Fragetext
über dem aktuell 2. Feld wird hinten an die erste Frage angehängt:
> **„Was ist heute passiert? Welche Gedanken, Gefühle, Reaktionen kamen dabei auf?"**

- Speichern in `happenings`; `response` wird nicht mehr abgefragt (neue Einträge
  schreiben nur `happenings`).
- Der Typ (`JournalDraft`, `content`-Shape) behält `response` optional für
  Altdaten. Read-only-Ansicht: das eine `happenings`-Feld immer zeigen; den
  `response`-Block **nur** rendern, wenn ein Altdaten-Eintrag ihn nicht-leer hat
  (abwärtskompatibel, kein Datenverlust). Beim Bearbeiten eines Alteintrags wird
  auf das eine Feld reduziert (der alte `response` bleibt in der DB unangetastet,
  wird aber nicht mehr editiert).
- **Konsumenten prüfen:** `saveJournalEntryAction` und die Auswertung
  (`recipes/values/actions.ts` + `evaluation`) müssen mit fehlendem `response`
  klarkommen (kein `required`-Bruch, kein leeres-Feld-Rendering).
- Placeholder + `required` auf das eine Feld ziehen; Draft-Mechanik
  (`useFormDraft`) auf ein Feld reduzieren.

---

## 4 · /booster (Sub-Pages)

### 4a — Icon oben statt Maskottchen (nur Landing/Intro)

Jede Booster-Landing zeigt oben ihr eigenes Wetter-Icon aus
[app/(app)/booster/weather-art.tsx](../../../app/(app)/booster/weather-art.tsx)
statt des Intro-Maskottchens:

| Route | Icon |
|---|---|
| `/booster/overthinking` | `WindSwirl` |
| `/booster/saying-no` | `UmbrellaRain` |
| `/booster/things-got-messy` | `CloudStack` |
| `/booster/shadow` | `StormCloud` |
| `/booster/confidence` | `ClearingStar` |

- Der Intro-Hero jedes Wizards (aktuell `renderMascot={…}` über
  `RecipeIntroGate`) rendert das Modul-Icon statt des Maskottchens. Prüfen, wie
  [components/recipes/recipe-intro-gate.tsx](../../../components/recipes/recipe-intro-gate.tsx)
  den Hero erwartet und ob ein generischer `renderIcon`/`hero`-Prop sauberer ist
  als je Wizard.
- **Der reagierende Begleiter tiefer im Flow bleibt** (die `<Mascot expression=…>`
  in den Wizard-Schritten von saying-no/shadow/things-got-messy/confidence/
  overthinking) — Kern-Wärme-Mechanik, unberührt.

### 4b — Zoom-Übergang /booster → Sub-Page (echter Seitenwechsel)

**Architektur:** spiegelt die bewährte Warp-Mechanik aus
[components/wants/warp-transition.tsx](../../../components/wants/warp-transition.tsx).
Grund für Overlay-im-Layout statt View-Transitions-API: iOS-Standalone-PWA
rendert die View-Transitions-API nicht (etabliertes Projekt-Gotcha).

- Neues `app/(app)/booster/layout.tsx` hostet einen `BoosterZoomProvider`
  (analog `WarpProvider`), der Hub **und** alle fünf Sub-Pages umschließt →
  persistentes Overlay überlebt den Routenwechsel.
- Context-API (analog `useWarp`):
  - `zoomInto(origin, navigate)` — `origin` = Tap-Punkt/Rect des getippten Icons.
    Phase `zooming`: Kamera-Push aus dem Tap-Punkt (Scale mit
    `transform-origin` am Origin, Hintergrund/Nachbarn streamen nach außen —
    dieselbe Lesart wie der Stern-Zoom auf /wants). Nach `ACCEL_MS` navigieren.
  - `arrive()` — von der Sub-Page beim Mount gerufen, settlet den Zoom und löst das
    Overlay auf. No-op ohne laufenden Zoom (Direkt-Load der Sub-Page → normaler
    Load, kein Effekt).
  - Reduced-motion → sofort navigieren, kein Overlay.
- **Hub wird interaktiv:** die Zellen-Liste in
  [app/(app)/booster/page.tsx](../../../app/(app)/booster/page.tsx) (aktuell reine
  Server-`<Link>`) wird ein schlankes Client-Element, das den Tap abfängt
  (`preventDefault`), Origin-Koordinaten aus dem Event/Ref liest und
  `zoomInto(origin, () => router.push(href))` ruft. Fallback: ohne JS bleibt es
  ein echter `<Link href>` (Progressive Enhancement).
- **Sub-Page-Ankunft:** jede Landing ruft beim Mount `arrive()` (dünner
  Client-Hook im jeweiligen Wizard, der bereits Client-Component ist). Das Icon aus
  4a sitzt oben und ist der visuelle Landepunkt des Zooms.
- Zeittakt (`ACCEL_MS`/Settle) an die vorhandene Warp-Kalibrierung anlehnen, nicht
  neu erfinden.

**Verifikation:** iPhone/Live-Deploy — liest der Reinflug als Kamera-Push zum
Icon, kommt die Sub-Page sauber an, reduced-motion = harter Schnitt, Direkt-Load
einer Sub-Page ohne Zoom funktioniert normal.

---

## 5 · /login (Variante B)

Zwei Wünsche: Sky-Backdrop dazu, Doppel-Maskottchen weg.

**Befund Doppel-Maskottchen:** Auf `/login` ist `gated=false`
([components/auth/auth-reveal.tsx](../../../components/auth/auth-reveal.tsx)), also
rendert der nicht-gegatete Pfad den **Hero** (der via
[app/(auth)/layout.tsx](../../../app/(auth)/layout.tsx) sein eigenes
`MascotPeek` unten-rechts enthält) **plus** das Karten-`MascotPeek` oben → zwei
Maskottchen gleichzeitig.

**Variante B — Login bleibt direkt sichtbar (kein Gate), aber ohne großen Hero:**
- **Sky-Backdrop:** `SkyBackdrop` (neutral, ohne `score`) hinter die Auth-Bühne
  legen — konsistent mit Dashboard/Booster. Den Blob-/Gradient-Hero-Hintergrund
  für den nicht-gegateten Login zurücknehmen.
- **Ein Maskottchen:** auf dem nicht-gegateten Login **nicht** den vollen
  `BrandPanel`-Hero mit seinem Peek rendern; stattdessen: Logo + kompakte
  Brand-Zeile + Karte auf dem Sky-Backdrop, mit **einem** `MascotPeek` (das
  Karten-Maskottchen oben). Netto: ein Maskottchen, Karte direkt sichtbar, kein
  großer Hero, der mit der Karte konkurriert.
- **Umsetzungsschnitt:** Das Gating/Hero-Handling steckt in `AuthReveal` +
  `AuthLayout`. Sauber ist, den nicht-gegateten Zweig so umzubauen, dass er den
  Hero **nicht** mitrendert (bzw. der Layout-Hero für Login/Reset entfällt) und
  der Sky-Backdrop + genau ein Peek gesetzt wird. Signup (gegatet) behält Hero +
  Reveal.

**Signup-Nebenfix:** Beim Hochwischen blitzen kurz zwei Maskottchen (Hero-Peek +
Karten-Peek überlappen im Übergang). Das Karten-`MascotPeek` erst nach Abschluss
des Hero-Slides einblenden (bzw. Hero-Peek während des Reveals ausblenden), sodass
zu keinem Zeitpunkt beide sichtbar sind.

**Reset-Seiten** (`/passwort-vergessen`, `/passwort-neu`) sind ebenfalls
nicht-gegatet — dieselbe Hero-Zurücknahme + Sky-Backdrop gilt konsistent für sie
(kein zweites Maskottchen, kein konkurrierender Hero).

---

## 6 · /onboarding

[app/onboarding/page.tsx](../../../app/onboarding/page.tsx) +
[components/onboarding/intro-previews.tsx](../../../components/onboarding/intro-previews.tsx)
+ [components/brand/star-art.tsx](../../../components/brand/star-art.tsx) +
[components/brand/me-ornaments.tsx](../../../components/brand/me-ornaments.tsx).

### 6a — Maskottchen höher (mehr Abstand zur Progress-Bar)

Der Maskottchen-Wrapper (`mb-4`) und die Progress-Bar (`mb-6`) sitzen zu nah.
Abstand vergrößern, sodass das Maskottchen luftiger über dem Balken sitzt. Reiner
Spacing-Tweak; die Login→Onboarding-Sprungsequenz (GSAP) nicht brechen.

### 6b — Stern an die echten Wants-Sterne angleichen

**Befund:** [star-art.tsx](../../../components/brand/star-art.tsx) rendert einen
**5-zackigen** Stern (`i * 36 - 90`, 10 Punkte). Die echten Wants nutzen die
**4-strahlige** `StarGlyph` (`STAR_PATH` in
[components/brand/star-glyph.tsx](../../../components/brand/star-glyph.tsx)).

**Änderung:** `StarArt` auf die 4-Strahlen-Sprache umbauen (STAR_PATH + Glow),
API (`animate`, `dim`, `className`) unverändert. Das fixt in einem Zug:
- Onboarding intro4 (`StarArt`),
- /me-Hub (`StarArt` in [me-hub.tsx](../../../app/(app)/me/me-hub.tsx)),
- Onboarding-`MePreview` ([intro-previews.tsx](../../../components/onboarding/intro-previews.tsx)).

Die pulsierende `me-star-glow`-Animation beibehalten. Optischer Feinschliff
(Größe/Glow) so, dass der Hub-Stern und der Kartenstern auf /wants als dieselbe
Familie lesen.

### 6c — Kompass weniger dezent

[me-ornaments.tsx](../../../components/brand/me-ornaments.tsx) `CompassArt`: Ring-
und Nadel-Opacity/Stroke anheben (aktuell Ring `opacity 0.3`, innerer Ring `0.16`,
Nadel `0.9`/`0.35`), damit der Kompass in der Onboarding-Preview (intro3, `size-20`)
präsenter liest. Betrifft auch den /me-Hub-Kompass (geteilte Quelle) — dort
gegenchecken, dass es nicht zu dominant wird.

### 6d — Preview-Icons animiert (nur die Animation)

Die Onboarding-Ornamente laufen aktuell `animate={false}`. Auf die kleine
Idle-Animation wie auf /me umstellen:
- intro3 `CompassArt`, intro4 `StarArt`, intro5 `SealArt` → `animate={true}`.
- Kopfwetter-Preview (`BoosterPreview` in
  [intro-previews.tsx](../../../components/onboarding/intro-previews.tsx)): die fünf
  Wetter-Icons bekommen eine kleine Idle-Animation (dezente Drift/Puls, konsistent
  mit dem /me-Ornament-Gefühl).
- `motion-reduce` → statisch. Kein Größer-/Umsortieren (bewusst nur Animation).

---

## 7 · /me — Nachthimmel-Raum (Meander)

[app/(app)/me/me-hub.tsx](../../../app/(app)/me/me-hub.tsx) von der geteilten
Liste (Hairline-Divider + Chevron + wandernde Kerze) auf die **Meander-Grammatik
des neuen Kopfwetter-Hubs** ([app/(app)/booster/page.tsx](../../../app/(app)/booster/page.tsx))
ziehen:

- **Layout:** die drei Signaturen (Werte = `CompassArt`, Wants = Stern/Sternbild,
  Bill of Rights = `SealArt`) sitzen links/rechts alternierend auf dem geteilten
  `SkyBackdrop` (neutral, kein `score`), analog zum Booster-Meander
  (`self-start`/`self-end`, `flex-row`/`flex-row-reverse`). Kein Divider, kein
  Chevron, kein Listen-Rhythmus.
- **Ornamente:** größer und lebendig (Idle-Animation an), als „drei Lichter in
  deinem inneren Himmel".
- **Tap-Ziel:** ganze Zeile = `<Link>` mit Fokusring, `active:scale`, wie im
  Booster-Hub.
- **Motion:** `Reveal`-Stagger ~0,6 s (ruhig, nicht abgehackt — vgl. Memory
  „Hub-Grammatik: Szenen statt Karten" + „schnelle Stagger wirken abgehackt");
  `motion-reduce` → alles statisch sichtbar.
- **Inhalt bleibt erhalten**, nur neu arrangiert: Werte-Chips (max 4 + Überhang),
  offene Bets (max 2 Pills) bzw. `wantsMeta`, erstes Recht als Affirmation
  (`asAffirmation`, line-clamp). Empty-States (leerer Kompass/Stern/Siegel) wie
  gehabt.
- Die Wants-Kachel darf **nicht** entgolden-leaken (vgl. C1-Roadmap-Fix); die
  Signatur bleibt in ihrer etablierten Farbe.

**Konsistenz-Notiz:** /me und /booster sind danach beide „Meander-Hubs" — /booster
als Wetterkarte, /me als ruhiger innerer Raum; gleiche Grammatik, anderer Ton.

---

## Plan-Schnitt (2 Pläne)

Geschnitten nach Arbeits-/Verifikations-Natur, nicht strikt nach Seite. Die zwei
Pläne sind unabhängig und in beliebiger Reihenfolge ausführbar; jeder Task bleibt
einzeln commit-/testbar.

**Plan 1 — Feinschliff: Copy, Ornamente & Theming** (überwiegend statisch,
gate-verifiziert, geringes Device-Risiko):
- 1a Yin/Yang aus Distiller/Refiner-Prompt
- 1b Wants-Einleitungstext
- 3 Journal: ein Feld
- 2b Schmiede-Rosé-Zone (route-aware Theming + `--mascot-body`-Ausnahme)
- 6a Onboarding-Maskottchen höher
- 6b `StarArt` auf 4-Strahlen angleichen (fixt /me-Hub + Onboarding + Preview)
- 6c Kompass weniger dezent
- 6d Preview-Ornamente + Kopfwetter-Preview animiert

**Plan 2 — Bewegung & Layout: Meander, Zoom-Nav & Login** (Motion/Architektur/
Layout, iPhone ist das entscheidende Gate):
- 2a Schmiede-Funken driften auf/ab
- 4a Booster-Icon auf Landing (Maskottchen dort raus)
- 4b Booster→Sub-Page Zoom-Übergang (`BoosterZoomProvider`, Warp-Architektur)
- 5 /login Variante B (Sky-Backdrop + Hero-Rücknahme + Signup-Nebenfix + Reset-Seiten)
- 7 /me Nachthimmel-Raum (Meander-Hub)

_Hinweis:_ Beide Pläne berühren [app/globals.css](../../../app/globals.css) (Plan 1:
Zone-Token; Plan 2: Funken-/Warp-Keyframes) und die geteilten Ornamente, aber in
getrennten Abschnitten — kein Merge-Konflikt bei sequentieller Ausführung.

## Nicht im Scope

- Interne Yin/Yang-Code-Namen umbenennen (Variablen/Actions/Typen).
- Neue Booster-Module oder Wizard-Logik-Änderungen.
- Journal-Auswertungslogik über das Feld-Merge hinaus.
- Die bereits offenen iPhone-Finals/Re-Critiques aus AIC-STATUS.md.

## Verifikation (pro Task)

- Statisch: `tsc --noEmit`, `npm run gate` (Kontrast + Typo + Motion), `npm run build`.
- Distiller (1a): Live-API-Testlauf ohne „Yin"/„Yang" in Ausgabe.
- Kontrast (2b): Rosé-Button-Kombi im Gate.
- Device: Stefans iPhone am Live-Deploy ist das finale Gate (visuelle Bereiche:
  /me-Meander, /booster-Zoom + Icons, /schmiede-Rosé + Funken-Drift, /login,
  /onboarding-Animationen).
