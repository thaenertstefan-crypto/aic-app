# Nachthimmel II — Redesign-Runde (Dashboard, Werte, Wants, Kopfwetter)

**Datum:** 2026-07-18
**Status:** validiert im Brainstorming (Mockup-Runde im visuellen Begleiter, Auswahl durch Stefan)

## Ziel

Die Bildsprache „Dein Nachthimmel" konsequent zu Ende bauen: Das Dashboard reagiert
als Wetterszene auf den Check-in, die Werteentdeckung gibt ihre Sternbild-Optik an
die Wants ab und wird zum Kompass-Pfad, die Wants werden zur begehbaren Sternenkarte
mit benannten Sternen, und der Kopfwetter-Hub wird von der Kachel-Liste zur
Wetterkarte. Eine Runde, ein Spec, vier Workstreams — Umsetzung sequenziell auf
`main`, jeder Block einzeln testbar auf dem iPhone.

## Entschiedene Richtungen (aus der Mockup-Runde)

- Dashboard-Wetter: **Hybrid** — Wetterelemente um das Maskottchen + dezente
  Himmelsreaktion. Horizont-Glow entfällt (erledigt den offenen
  Measure-6-Checkpoint: mood-reaktive Ambience statt Glow).
- Check-in-Frage: exakt **„Wie ist heute das Wetter in deinem Kopf?"**
- Werteentdeckung: **Variante A „Der Kompass-Pfad"** (Reskin der bestehenden Szene).
- Wants: Sternenkarte mit Zoom-Detailansicht; **Variante B** — die Zoom-Ansicht ist
  reine Betrachtung, in die Schmiede geht es nur über die Brückenkarte.
- Sterntaufe: **AI schlägt vor, Stefan tauft** (Destiller liefert Titel-Vorschlag,
  überall editierbar).
- Tagtraum-Schritt: **durch den Destiller** (eigener Schritt, AI formt „ferne Sterne").
- Brückenkarte: bestehende Karte wird nur umbenannt in
  **„Lust, was Neues zu entdecken?"** (Ziel bleibt die Sternschmiede).
- Kopfwetter: **Variante A „Die Karte deines Kopfes"** (Wetterkarte mit Kopf-Insel).
- Keine Reflexionsfrage an Sternen (weder persistiert noch angezeigt).
- Kopfwetter-Karte ohne die wandernde Kerze (`me-candle-bg` entfällt dort).

---

## Workstream 1: Dashboard — die Wetterszene

### SkyBackdrop (`components/backdrops/sky-backdrop.tsx`)

- **Horizont-Glow-Layer entfernen** (der goldene radial-gradient hinter dem
  Maskottchen). Sky-Wash (Abdunklung nach oben) bleibt.
- **Sterne prominenter:** 3 zusätzliche Sky-Lights, und alle Sky-Lights werden
  größer/deckender, damit sie auf gedimmtem Display sichtbar bleiben. Gilt überall,
  wo der SkyBackdrop rendert (Dashboard und Wants) — bewusst einheitlich.
- **Neuer Wetter-Modus:** Der Backdrop (bzw. eine neue Wetter-Ebene im selben
  Stack) reagiert auf den Mood-Score 1–5. Ohne Score (z. B. auf der Wants-Seite)
  bleibt er neutral wie heute — die Wants-Seite bekommt kein Wetter.

### Wetterlogik (Score → Szene)

Score-Quelle: die optimistische Auswahl beim Antippen der Chips (derselbe
`onSelect`-Pfad, über den heute schon Mascot-Gesicht und Fokus sofort reagieren),
sonst der gespeicherte Check-in des Tages, Default 3 („Ruhig").

| Score | Mascot-Bühne | Himmel |
|---|---|---|
| 1 Stürmisch | Gewitterwolke zieht zum Maskottchen rein, feine Regenstriche, seltenes sanftes Wetterleuchten (weiches Aufglimmen, kein harter Blitz) | dunkelt spürbar ab, Sterne verschleiert |
| 2 Bewölkt | zwei Wolken driften rein | leicht gedimmt, Sterne gedimmt |
| 3 Ruhig | eine kleine ruhige Wolke | neutral |
| 4 Klar | wolkenlos | Sterne normal |
| 5 Sternenklar | wolkenlos | alle Sterne funkeln heller/schneller |

- Wolken/Regen/Blitz sind gezeichnete SVG/CSS-Elemente in der Gold-Linien-Sprache
  der bestehenden Wetter-Motive (`weather-art.tsx` als Formsprache-Referenz).
- Übergänge: Beim Score-Wechsel animieren Wolken herein/heraus (sanft, einige
  hundert ms; „Wolken fliegen rein").
- Reduced motion: statische Szene — Wolken stehen, kein Drift, kein Regen-Loop,
  kein Wetterleuchten (Wolke + ggf. statische Regenstriche bleiben sichtbar).
- Die One-Candle-Regel bleibt unberührt: kein neues goldenes Leuchten; der
  Gold-CTA bleibt die einzige Kerze des Screens.

### Check-in (`app/(app)/dashboard/mood-checkin.tsx`)

- Frage neu: **„Wie ist heute das Wetter in deinem Kopf?"** (nur dieser String).
- Chips, Labels (Stürmisch → Sternenklar), Wetter-Botschaften (`MESSAGES`),
  `MOOD_FACES`, `moodTier`, DB `mood_score`: alles unverändert.

---

## Workstream 2: Werteentdeckung — der Kompass-Pfad

`app/(app)/me/values/journey/values-journey-client.tsx` — reiner Reskin, die
Mechanik bleibt vollständig erhalten: Geometrie (`CONSTELLATION`-Punkte, viewBox
360×880), GSAP-Kamerafahrt, Checkpoint-Zustände (done/current/open), Klick-Ziele,
Labels, Maskottchen-Position und -Blick.

Neue Übersetzung der Bildsprache (Sterne gehören jetzt den Wants):

- **Pfad statt Konstellationslinien:** geschwungene, gestrichelte Kurve durch alle
  Punkte (Wanderpfad-Anmutung statt Polyline von Stern zu Stern), Gold mit
  niedriger Deckkraft.
- **Wegmarken statt Sterne:**
  - erledigt = gefüllte goldene Punkte,
  - aktuell = pulsierende Kompassrose (4-strahlige Nadel) mit feinem Doppelring,
  - offen = dünne, gedimmte Ringe.
  Der `STAR_PATH`-Glyph verschwindet aus dieser Szene.
- **Hintergrund-Funkelsterne (`MICRO_STARS`) bleiben**, aber etwas gedimmter —
  der Nachthimmel über dem Pfad, nicht mehr die Checkpoint-Sprache.
- **Finale-Text:** „Dein Sternbild ist vollständig. ✨" →
  **„Dein Kompass ist kalibriert. ✨"** (zweite Zeile „Schau dir deine
  Erkenntnisse an." bleibt).
- Reduced motion wie heute (kein Pulsieren, statische Zustände).

---

## Workstream 3: Wants — Datenmodell & Sternensuche

### Datenmodell (`lib/types/db-json.ts`, JSONB — keine DB-Migration)

`WantItem` wird erweitert:

- `title: string | null` — der Sternname (2–3 Worte). `null` bei Bestandsdaten;
  Karten-Label fällt dann auf den gekürzten Beschreibungstext zurück.
- `distance?: "nah" | "fern"` — fehlend/`"nah"` = normaler Stern,
  `"fern"` = Tagtraum-Stern.
- `text` bleibt die **Beschreibung** des Sterns (das „Es macht mir Spaß…").
- Es wird **keine** Reflexionsfrage persistiert.

### Destiller (`lib/anthropic/`, `/api/wants-distiller`)

- Response pro Want zusätzlich: `title` (kurzer Namensvorschlag, 2–3 Worte).
- Neuer Input-Block **Tagträume**: Antworten aus dem neuen Schritt gehen als
  eigene Kategorie mit in den Prompt; daraus geformte Wants kommen als
  `distance: "fern"` zurück (mit Titel + Beschreibung wie alle anderen).
- Bestehende Felder (`reason`, `question`) können in der Response bleiben und
  weiter in der Sterne-Phase als Kontext angezeigt werden — persistiert werden
  sie nicht.

### Sternensuche-Journey (`app/(app)/me/wants/journey/wants-journey.tsx`)

- **Neue Phase `tagtraum`** zwischen `yang` und `analyzing`:
  Frage **„Wovon tagträumst du?"** — die Dinge, die dich gedankenversunken in die
  Leere starren lassen („Irgendwann mach ich mal einen Ironman, irgendwann mach
  ich mal einen Flugschein …"). Gleiche Mehrfach-Antwortboxen-UI wie Yin/Yang,
  **überspringbar** (leere Boxen = weiter ohne Tagträume).
- **Sterne-Phase:** jede Draft-Karte bekommt ein editierbares **Titel-Feld**
  (vorbefüllt mit dem AI-Vorschlag); ferne Sterne sind als „fern" erkennbar
  (kleines Badge). Eigene, hier manuell ergänzte Sterne: Titel-Feld leer, Distanz nah.
- Draft-Persistenz (`useFormDraft`) deckt die neuen Felder mit ab.

### Fernglas-Symbol

Die Sternensuche bekommt überall das **Binoculars-Icon** (lucide) als Symbol —
Aktionszeile der Sternenkarte, Leerzustand, ggf. Journey-Header — statt des
bisherigen Sparkles. Sollte `Binoculars` in der eingesetzten lucide-Version
fehlen: Fallback `Telescope` (dann als bewusste Abweichung im Commit notieren).

---

## Workstream 4: Wants — die Sternenkarte

`app/(app)/me/wants/wants-me.tsx`: die Kartenliste „Meine Sterne" wird durch eine
Himmelsszene ersetzt (SkyBackdrop bleibt darunter, Warp-Layout bleibt).

### Karte

- Jeder aktive Stern hängt an einer **stabilen Position**: Die Sterne werden in
  eine vertikale Slot-Leiter einsortiert (abwechselnd links/rechts versetzt;
  Label-Seite folgt der Position, kein Overflow bei 375 px). Die Slot-Reihenfolge
  mischt nah und fern **abwechselnd von oben nach unten** (keine getrennten
  Zonen); innerhalb des Slots sorgt ein Hash der Want-ID für stabilen,
  natürlichen Versatz, damit die Karte bei jedem Besuch gleich aussieht.
- **Tiefe ohne Zonen:** Tiefe entsteht ausschließlich über die
  Darstellung:
  - nah = voller Glanz, normale Größe, Label in Vordergrundfarbe,
  - fern = ~60 % Größe, deutlich gedimmt, leichter Dunst-Schleier, Label muted,
  - erloschen (deaktiviert) = klein, grau, stark gedimmt, Label muted.
- 4-strahliger Stern-Glyph (die von der Werte-Szene freigegebene Sprache),
  dezentes Funkeln, reduced motion = statisch.
- Maskottchen schaut von unten in den Himmel (Blick zur Szene, wie in der
  Werte-Journey).

### Zoom-Detailansicht

- Tipp auf einen Stern → **Kamerafahrt** zoomt auf den Stern (Transform der
  Szene, GSAP; reduced motion = harter Wechsel ohne Fahrt).
- Inhalt: großer glühender Stern, **Titel** (font-heading), **Wert-Chip** (falls
  Wert verknüpft), **Beschreibung** (der Want-Text). Keine Reflexionsfrage.
- Aktionen (Parität zur heutigen Liste):
  - **Bearbeiten** — Dialog mit Titel + Beschreibung, darin auch **Löschen**,
  - **Stern loslassen** — deaktivieren (wird zum erloschenen Stern) bzw.
    **Wieder anzünden** bei erloschenen,
  - **„← Zurück zum Himmel"** — zoomt heraus.
- **Keine Schmiede-Aktion** in der Detailansicht (Variante B).

### Drumherum

- Aktionszeile unter der Karte: **🔭 Sternensuche** (outline, Binoculars) und
  **„+ Eigener Stern"** (outline, Dialog mit Titel + Beschreibung).
- Brückenkarte: Titel neu **„Lust, was Neues zu entdecken?"**, Rest unverändert
  (Fließtext, Gold-CTA „Zur Sternschmiede", Warp-Übergang, One-Candle-Regel).
- Leerzustand (keine Sterne): Aufbau wie heute (Maskottchen, Sternsuche ODER
  Schmiede), Sternensuche-Button mit Fernglas-Icon.

---

## Workstream 5: Kopfwetter — die Karte deines Kopfes

`app/(app)/booster/page.tsx`: die 5 Kacheln werden zu **einer Wetterkarten-Szene**
(Hub-Grammatik: Szene statt Karten-Grid).

- **Karte:** dezente Isobaren-Ellipsen, eine Insel-Silhouette, die aus dem
  Augenwinkel wie ein Kopf im Profil wirkt (Gold-Linie, sehr niedrige Füllung),
  eine gestrichelte Front-Linie als Deko-Element (Lilac, niedrige Deckkraft).
- **Die 5 Wettersysteme** sitzen an fest handgesetzten Positionen auf der Karte;
  die bestehenden Motive aus `weather-art.tsx` ziehen um und behalten je genau
  eine Micro-Animation und die Ein-Lilac-Akzent-Regel.
- **Labels:** der Ich-Satz als primäres Label („Ich denke im Kreis", …),
  darunter der Modulname als leise Meta-Zeile (wie heute auf den Kacheln).
- **Interaktion:** jedes System ist ein echter Link mit Hit-Area ≥ 44 px und
  `aria-label` aus Modulname + Ich-Satz. Aufbau der Szene per Reveal (~600 ms),
  kein schneller Stagger.
- **Die wandernde Kerze (`me-candle-bg`) entfällt** auf dieser Seite ersatzlos.
- Header-Copy bleibt unverändert.
- Reduced motion: Motive statisch (wie heute in `globals.css` geregelt).

---

## Umsetzungsreihenfolge & Gates

1. **Dashboard-Wetterszene** (Glow raus, Sterne prominenter, Wetterlogik, Wording)
2. **Werte Kompass-Pfad** (gibt die Stern-Sprache frei)
3. **Kopfwetter-Karte** (unabhängiger, schneller Block)
4. **Wants** (Datenmodell → Destiller + Journey → Sternenkarte/Zoom)

Pro Block: `npx tsc --noEmit`, `npm run build`, Kontrast-Gate
(`scripts/check-contrast.mjs`), dann Commit + Push auf `main` für Stefans
iPhone-Check am Live-Deploy (das Verifikations-Gate dieser App — kein
Desktop-Browser-Subagent).

## Risiken & Abwägungen

- **Wetterleuchten:** bewusst selten und weich (Aufglimmen statt Blitz) — auf
  iOS-Echtgerät prüfen; bei Flacker-Eindruck zuerst Frequenz senken.
- **Backdrop-Kopplung:** SkyBackdrop wird von Dashboard UND Wants genutzt —
  Wetter nur bei vorhandenem Score, damit die Wants-Seite neutral bleibt.
- **Bestandsdaten:** alte Wants ohne `title`/`distance` müssen überall sauber
  zurückfallen (Label = gekürzter Text, Distanz = nah).
- **Destiller-Änderung:** Prompt-/Response-Erweiterung braucht einen echten
  API-Test (Titel-Qualität, fern-Markierung), nicht nur Typen.
- **lucide `Binoculars`:** Verfügbarkeit in der installierten Version prüfen,
  sonst `Telescope`.

## Out of Scope (bewusst nicht in dieser Runde)

- Leitsatz-Platzierung (eigene, zurückgestellte Runde).
- Palette-Wechsel (dokumentierte Kandidaten, „für später").
- Modul-Farb-Konsistenz Wants/Schmiede (Gold vs. Rosé) — bleibt als offener
  Punkt bestehen; die Sternenkarte bleibt in dieser Runde gold.
- FK-Migration `cleanser_checkins` → CASCADE.
