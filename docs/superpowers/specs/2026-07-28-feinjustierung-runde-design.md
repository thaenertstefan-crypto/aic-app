# Feinjustierungsrunde: Onboarding, Booster, Auth, Wants/Schmiede, Intro-Texte

**Stand:** 2026-07-28
**Status:** Design, zur Freigabe

Eine Runde Feinschliff über sechs Oberflächen plus die Übernahme redigierter
Intro-Texte. Die Pakete sind weitgehend unabhängig und können einzeln gebaut,
getestet und deployed werden — Paket 2 (Booster) ist das umfangreichste und
enthält die Korrektur eines Regressionsfehlers aus der letzten Runde.

---

## Paket 1 — Onboarding

### 1.1 Kursiv und fett in den Kartentexten

Die Kartentexte in [`lib/content/onboarding-intro.ts`](../../../lib/content/onboarding-intro.ts)
sind heute reine Strings, die als `<CardDescription>` gerendert werden. Sie
bekommen leichtes Inline-Markup, das ein kleiner Renderer auflöst:

- `**Text**` → `<strong className="font-semibold text-foreground">`
- `*Text*` → `<em>` (kursiv; Fraunces hat einen echten Italic-Schnitt, siehe
  `app/layout.tsx` — `style: ["normal", "italic"]`)

Der Renderer lebt als eigene kleine Komponente (z. B.
`components/ui/rich-text.tsx`), nimmt einen String und gibt ein Fragment aus
Text- und Emphasis-Knoten zurück. Bewusst nur diese zwei Auszeichnungen, kein
Markdown-Parser, keine Links, kein verschachteltes Markup.

**Warum Markup statt JSX im Content:** Die Texte bleiben in der Content-Datei
lesbar und editierbar, ohne dass Copy-Änderungen JSX anfassen müssen. Die
Datei behält ihre bestehende Quote-Regel (einfache Quotes als Delimiter,
deutsche Anführungszeichen als U+201E/U+201C).

**Konkrete Betonungen** (1–2 pro Karte, zur Durchsicht):

| Karte | Betonung |
|---|---|
| intro1, Score ≤ 4 | **ehrlich zu sich selbst** |
| intro1, Score 5–7 | **gut genug** |
| intro1, Score ≥ 8 | **Normalzustand** |
| intro2 „Me"-Überblick | *Sei dir bewusst, wer du bist.* · **drei innere Anlaufpunkte** |
| intro3 Werte | **Werte** · *innerer Kompass* |
| intro4 Wants | **Wants** · *Wie einen Stern.* |
| intro5 Bill of Rights | **inneren Regeln** |
| intro6 Caveat | **Kopfwetter** · *Wetter kommt und vergeht, doch die eigenen Sterne leuchten weiter.* |
| intro7 Kopfwetter | *schnell abrufbare kleine Unterstützer für mittendrin im Alltag* |
| intro8 Abschluss | *ich bin gut genug* |

Die Zuordnung des Leitsatzes in intro6 folgt der Metapher-Mechanik: „Wetter
verdeckt Sterne, die weiterleuchten" gehört an einen Kopfwetter-Abschluss,
nicht an eine Wants-Karte.

### 1.2 Kompass auf voller Leuchtkraft

`CompassArt` dimmt sich per `opacity-40`, wenn `emojis.length === 0`
([`me-ornaments.tsx:30`](../../../components/brand/me-ornaments.tsx)). Im
Onboarding wird `emojis={[]}` übergeben — der Kompass ist dort also dauerhaft
auf 40 % gedimmt, während er auf /me mit den echten Werte-Emojis voll leuchtet.

Onboarding-Karte intro3 und die Mini-Vorschau in
[`intro-previews.tsx`](../../../components/onboarding/intro-previews.tsx)
übergeben künftig vier Beispiel-Emojis aus
[`lib/utils/values-emojis.ts`](../../../lib/utils/values-emojis.ts):

| Emoji | Wert |
|---|---|
| 🧗 | Abenteuerlust |
| ⚖️ | Ausgeglichenheit |
| 🌱 | Wachstum |
| 🪞 | Ehrlichkeit |

Abenteuerlust und Ausgeglichenheit stehen wörtlich im Kartentext („sei es
Abenteuerlust oder Gelassenheit"). 🧭 (Integrität) wird bewusst nicht genutzt —
ein Kompass-Emoji im Kompass liest sich falsch.

Die Dämpfungsregel selbst bleibt unangetastet: Auf /me ist der leere Kompass
ein ehrlicher Leer-Zustand, den die Werte-Übung füllt.

### 1.3 Stern funkelt stärker

`me-star-glow` in [`app/globals.css`](../../../app/globals.css) läuft heute mit
Opacity 0.85 ↔ 1 und Glow-Radius 2 ↔ 6 px über 4 s — ein ruhiges Atmen, kein
Funkeln. Zwei Änderungen:

1. **Grundschein kräftiger:** Glow-Radius auf etwa 5 ↔ 14 px, größerer
   Helligkeitshub. Rhythmus bleibt bei 4 s.
2. **Glitzer dazu:** Eine zweite, langsamere Animation (etwa 5 s) mit einem
   sehr kurzen hellen Aufblitz — der Großteil der Periode ist Ruhe, nur ein
   schmales Keyframe-Fenster hellt auf. Die beiden Perioden (4 s / 5 s) laufen
   auseinander, dadurch wirkt das Funkeln unregelmäßig statt getaktet.

Beide Animationen sitzen auf derselben `<g>`-Gruppe in `StarArt`; die
`prefers-reduced-motion`-Regel deckt beide ab.

Weil /me-Hub, Onboarding-Karte intro4 und die Mini-Vorschau dieselbe
[`StarArt`](../../../components/brand/star-art.tsx) rendern, sind sie
automatisch aligned — kein zweiter Ort zum Pflegen.

**Nicht betroffen:** `want-star-twinkle` auf der Sternenkarte. Die vielen
kleinen Sterne bleiben ruhig, sonst flackert der ganze Himmel.

### 1.4 Siegel-Animation glätten

Das „Gestaggerte" entsteht, weil drei Zeitachsen gleichzeitig starten:

1. `Crossfade` blendet die ganze Karte ein
2. `me-seal-stamp` skaliert von 1.15 → 1 **mit einem Opacity-Knick bei 60 %**
3. `me-seal-glow` pulst ab Frame 0 den Drop-Shadow

Der Opacity-Knick erzeugt einen sichtbaren Zwei-Phasen-Eindruck, und der
Glüh-Puls läuft an, während der Stempel noch fährt.

**Fix:** Opacity-Knick raus (eine durchgehende Kurve von 0 auf 1), Stempel auf
etwa 0,5 s straffen, und `me-seal-glow` bekommt eine `animation-delay`, die es
erst nach dem Stempel anlaufen lässt. Ein Ereignis statt drei überlagerter.

Gilt für /me-Hub und Onboarding-Karte intro5 gleichermaßen (geteilte
`SealArt`).

### 1.5 Abschluss → Dashboard

Heute: `<SpinnerOverlay />`, solange die Server-Action läuft, dann
`window.location.href = "/dashboard"` — ein harter Reload.

Neu, die **Sternenhimmel-Übergabe**:

```
„Ich bin bereit"
   │
   ├─ 0–400 ms   Karte, Fortschrittsbalken, Navigation faden aus
   │             (Server-Action läuft parallel)
   │
   ├─ 400–900 ms Maskottchen löst sich sanft auf,
   │             der Nachthimmel zündet gestaffelt Sterne
   │
   ├─ danach     Navigation → /dashboard
   │             POST_LOGIN_KEY gesetzt
   │
   └─ Dashboard  DashboardReveal staffelt die Abschnitte von oben ein
```

Der Trick: `SkyBackdrop` ist auf **beiden** Seiten dieselbe fixe `-z-10`-Ebene
([`onboarding/layout.tsx:26`](<../../../app/onboarding/layout.tsx>) und dem
Dashboard). Wenn dazwischen nichts aufblitzt, liest sich der Wechsel als eine
durchgehende Fläche.

Details:

- **Navigation:** Bevorzugt Client-Navigation statt `window.location.href`,
  damit der Himmel wirklich stehenbleibt. Das Onboarding liegt außerhalb der
  `(app)`-Route-Group, der Wechsel ist also ein Layout-Tausch — funktioniert
  der Onboarding-Gate danach nicht sauber (Profil-Flag noch nicht sichtbar),
  bleibt der harte Redirect als Fallback. Die Stern-Zünd-Sequenz deckt beide
  Varianten ab, weil sie über der Navigation liegt.
- **Sterne zünden:** Fünf bis sechs zusätzliche Lichter im bestehenden
  `sky-light`-Vokabular, gestaffelt mit etwa 120 ms Abstand, in freien
  Bereichen des Himmels.
- **Wartezeit:** Dauert die Server-Action länger als die Sequenz, bleibt der
  gezündete Himmel einfach ruhig stehen. Kein Loop, kein Spinner.
- **Fehlerfall:** Gibt die Server-Action einen Fehler zurück, zieht sich die
  Sequenz zurück und die Karte kommt mit `FormError` zurück — wie bisher.
- **Reduced motion:** Karte fadet, direkt navigieren.

`POST_LOGIN_KEY` wird vom Onboarding gesetzt, damit
[`DashboardReveal`](../../../components/dashboard/dashboard-reveal.tsx) greift.
Der Marker hat 10 s Gültigkeit — reicht.

---

## Paket 2 — Booster

### 2.1 Regressionsfix: Intro-Maskottchen zurückholen

Commit `dbde5b0` hat in allen fünf Booster-Intros `renderMascot` von den
animierten Maskottchen auf statische Wetter-Icons umgestellt; `aac85c9` hat die
dann unreferenzierten Komponenten als toten Code gelöscht. Das war nicht
gewollt — die Intro-Begleiter sollen bleiben.

Wiederherzustellen aus `dbde5b0^`:

| Datei | Zeilen | Konsument |
|---|---|---|
| `components/recipes/overthinking-intro-mascot.tsx` | 222 | `overthinking-wizard.tsx` |
| `components/recipes/saying-no-intro-mascot.tsx` | 240 | `saying-no-wizard.tsx` |
| `components/recipes/shadow-intro-mascot.tsx` | 216 | `shadow-wizard.tsx` |
| `components/recipes/things-got-messy-intro-mascot.tsx` | 211 | `things-got-messy-wizard.tsx` |

Dazu in `confidence-booster.tsx` die Konstante `INTRO_EXPRESSIONS`
(`smile → curious → radiant`) und der `<Mascot expression={…} size="md" />`.

Geprüft: Die vier Komponenten nutzen **keine** eigenen CSS-Klassen, das in
`aac85c9` mitentfernte CSS (`me-candle-bg`) gehört zum /me-Hub-Hintergrund und
hat nichts mit ihnen zu tun. Der Restore ist eigenständig.

Die drei Zweige für `things-got-messy` / `saying-no` / `shadow` in
[`recipe-intro-gate.tsx`](../../../components/recipes/recipe-intro-gate.tsx)
bleiben draußen, sofern die Prüfung bestätigt, dass diese Slugs nie über den
Gate laufen (die Booster-Wizards rufen `RecipeIntro` direkt auf). Gibt es doch
einen Konsumenten, kommen sie mit zurück.

### 2.2 Modul-Icon unter dem Sub-Page-Header

Der `SubPageHeader` bleibt **unverändert** — kein Icon-Slot, kein Icon im
Header. Stattdessen eine geteilte Komponente (z. B.
`components/booster/module-icon.tsx`), die auf der **ersten Seite der Übung**
direkt unter dem Header zentriert sitzt:

```
+---------------------------+
|  ‹   Overthinking      ⓘ  |   SubPageHeader (unverändert)
+---------------------------+
|                           |
|            (~)            |   Modul-Icon, zentriert
|                           |
|        ● ○ ○ ○ ○ ○ ○ ○    |   ProgressDots
|          Schritt 1        |
```

| Übung | Position | Änderung |
|---|---|---|
| Overthinking | über `ProgressDots` | `WindSwirl` kommt neu dazu |
| Confidence | über der „Gleich bin ich dran?"-Karte | `ClearingStar` kommt neu dazu |
| Nein sagen | Modus-Wahl (`phase === "mode"`) | `<Mascot smile>` → `UmbrellaRain` |
| Schattenseite | Modus-Wahl (Fallthrough-Return) | `<Mascot curious>` → `StormCloud` |
| Things Got Messy | Einstieg (Fallthrough-Return) | `<Mascot smile>` → `CloudStack` |

**Alle anderen Maskottchen bleiben unangetastet** — Warte-Screens
(„Ich schau mir das kurz an …"), Zwischenschritte der Wizards und die
Abschluss-Screens behalten ihre etablierten Begleiter.

Die Komponente registriert ihren DOM-Rect beim Zoom-Kontext (siehe 2.3) und
ist während eines laufenden Zoom-Übergangs unsichtbar, bis der fliegende Klon
übergibt.

### 2.3 Zoom: Kamera fliegt aufs Icon, Icon reist nach oben

Zwei Bewegungen gleichzeitig, der Seitenwechsel liegt dazwischen:

```
Kopfwetter-Hub                       Sub-Page
                                     +----------------+
  +----------------+                 | ‹ Overthinking |
  |  (~) Ich bin   |                 +----------------+
  |      am ...    |   ══════════▶   |      (~)       |  ← Klon landet
  |                |                 |   ● ○ ○ ○ ○    |
  |  (o) Ich ...   |                 |   Schritt 1    |
  +----------------+                 +----------------+

  1) Kamera fliegt aufs Icon zu:     2) Icon-Klon reist gleichzeitig
     Hub skaliert am Tap-Punkt          nach oben in die Bildmitte
     verankert vorbei und fadet         und geht auf Zielgröße
```

Ablauf:

1. Tap auf eine Zelle → Rect des Icons und die Variante werden erfasst.
2. Ein **fixer Klon** des Wetter-Icons löst sich vom Tap-Punkt (z-Ebene über
   allem). Der Hub skaliert dahinter am Icon verankert an der Kamera vorbei
   und fadet aus — dieselbe Grammatik wie der Wants→Schmiede-Warp.
3. Der Klon reist auf einer weichen Kurve nach oben in die Bildmitte und
   nimmt dabei Zielgröße an.
4. Mittendrin: `router.push()` auf die Sub-Page. Der Klon liegt darüber, der
   Wechsel ist nicht sichtbar.
5. Sub-Page mountet:
   - **Rendert sie ein Modul-Icon** (erste Übungsseite): Sie meldet dessen
     Rect, der Klon setzt sich exakt darauf, blendet über auf das echte Icon
     und verschwindet.
   - **Rendert sie keins** (Intro-Sequenz beim Erstbesuch, siehe unten): Sie
     meldet `null`, der Klon löst sich an seiner Zielposition auf und
     übergibt an das Intro-Maskottchen über der Karte.

Das Overlay lebt weiter im geteilten
[`booster/layout.tsx`](<../../../app/(app)/booster/layout.tsx>), damit es den
Routenwechsel überlebt.

**Was wegfällt:**

- Der Lilac-Bloom (`booster-zoom-bloom`) — er deckte die Navigation ab, das
  übernimmt jetzt der Klon.
- Der Spinner: [`navigation-spinner.tsx`](../../../components/layout/navigation-spinner.tsx)
  hört in der **Capture**-Phase, das `preventDefault()` der Booster-Zellen
  kommt also zu spät und der Spinner erscheint nach 150 ms mitten im Zoom.
  Fix: Der Zellen-Container bekommt einen Opt-out-Marker (z. B.
  `data-nav-spinner="off"`), auf den der Spinner per `closest()` prüft und
  dann aussteigt. Lokal, ohne Nebenwirkung auf andere Navigationen.

**Was bleibt:**

- Der Watchdog (`WATCHDOG_MS`) gegen hängende Navigation. Bleibt die Ankunft
  aus, fadet der Klon weg statt hängenzubleiben.
- Reduced motion: sofort navigieren, kein Klon, kein Push.
- Der Doppel-Tap-Schutz (`phaseRef.current !== "idle"` → normal navigieren).

**Erstbesuch:** Auf der Intro-Sequenz gibt es bewusst kein Modul-Icon unter
dem Header — dort sitzt das Intro-Maskottchen über der Karte. Der Klon löst
sich beim Ankommen auf. Der Zoom endet beim Erstbesuch damit anders als
danach; das ist die bewusste Entscheidung, weil zwei Signaturen auf einer
Intro-Seite zu viel wären.

### 2.4 Einleitungstext kürzen

In [`booster/page.tsx:14`](<../../../app/(app)/booster/page.tsx>) fällt der
Satz „Das ist normal und das zieht auch wieder vorbei." weg. Der Absatz lautet
danach:

> Manchmal schlägt das Wetter um: Zweifel, Gedankenspiralen oder Überforderung
> ziehen auf. Die folgenden Hilfen machen dich wetterfest gegen die Stürme und
> Regenwolken in deinem Kopf. Was brauchst du gerade?

---

## Paket 3 — Login

Die Zeile „Der Club, den niemand zugibt zu brauchen." fällt aus dem kompakten
Kopf in [`auth-reveal.tsx:94–96`](../../../components/auth/auth-reveal.tsx).
Betroffen ist der ungegatete Pfad (Login, Passwort-Reset). Das Logo bleibt, der
Abstand darunter wird auf das Karten-Layout hin nachjustiert.

Die Hero-Headline auf dem Signup („Willkommen im Club, den niemand zugibt zu
brauchen.") bleibt — dort trägt sie den Erstkontakt.

---

## Paket 4 — Signup

### 4.1 Sky-Backdrop im Hero

Das Hero-Panel malt heute seinen eigenen Verlauf
(`bg-linear-to-br from-secondary via-accent/60 to-background` plus
`AmbientBlobs`). Es bekommt stattdessen den geteilten
[`SkyBackdrop`](../../../components/backdrops/sky-backdrop.tsx), wie Dashboard,
/me und Kopfwetter.

Damit spricht der Erstkontakt dieselbe Bildsprache wie die App dahinter — und
die Kante am oberen Rand, die du siehst, ist mit hoher Wahrscheinlichkeit
genau der Übergang zwischen diesem Hero-Verlauf und dem Body-Hintergrund. Ob
sie damit weg ist, prüfst du nach dem Deploy am Gerät; bleibt sie, gehen wir
separat auf safe-area/`lvh`-Jagd.

`AmbientBlobs` fliegt mit raus — der Nachthimmel bringt seine eigene Tiefe mit
und zwei atmosphärische Ebenen übereinander werden matschig.

### 4.2 Maskottchen wischt nach rechts raus

Beim Aufwischen schiebt sich das Hero-Panel nach oben weg
(`-translate-y-full`). Das unten rechts hereinlugende Maskottchen
([`(auth)/layout.tsx:31`](<../../../app/(auth)/layout.tsx>)) fährt heute
einfach mit nach oben.

Neu: Es bekommt eine eigene Transition, die es **nach rechts** aus dem Bild
schiebt — es verlässt die Bühne zur Seite, während der Hero nach oben geht.
Gleiche Dauer wie der Hero (1000 ms), gleiche Kurve, damit die beiden
Bewegungen als eine gelesen werden.

**Achtung Tailwind v4:** `translate-x` kompiliert zu der eigenständigen
CSS-Property `translate`, nicht zu `transform`. Die Transition muss `translate`
namentlich nennen, sonst springt die Position statt zu gleiten. Der Hero macht
das bereits richtig (`transition-[translate,opacity]`).

Der bestehende `heroGone`-Timer, der den Karten-Peek erst nach 1000 ms
einblendet, bleibt — er verhindert, dass kurz zwei Maskottchen sichtbar sind.

---

## Paket 5 — Wants

### 5.1 Abstände oben und unten angleichen

[`star-map.tsx`](<../../../app/(app)/me/wants/star-map.tsx>) hat zwei
handgesetzte Konstanten: `TOP_PAD = 60`, `BOTTOM_PAD = 130` (in
viewBox-Einheiten, VIEW_W 360). Das ergibt heute etwa:

| Abstand | heute |
|---|---|
| Einleitetext → erster Stern | ~77 px |
| letzter Stern → Maskottchen | ~128 px |

Neu: **ein** gemeinsamer Abstandswert steuert beide Ränder. `TOP_PAD` und
`BOTTOM_PAD` werden daraus abgeleitet — `BOTTOM_PAD` zusätzlich um die
Maskottchen-Box (`size="sm"` = `size-14` = 56 px plus `bottom-1`) erhöht, damit
der Abstand *bis zum Maskottchen* und nicht bis zum Container-Rand gilt.

Zielwert etwa 40 px auf beiden Seiten. Das `pb-2` am Einleitetext-Block
entfällt, damit die 24 px Container-`gap-6` der einzige Beitrag von oben
bleiben.

Der Slot-Jitter in y (Amplitude 36, also ±18 viewBox-Einheiten) darf den
Zielabstand nicht auffressen — der abgeleitete `BOTTOM_PAD` rechnet den halben
Jitter als Reserve mit ein.

### 5.2 „Lust auf Neues?" mittig setzen

Der Ghost-Button sitzt heute als dritter Block im selben `gap-3`-Stapel wie
die Button-Reihe. Er löst sich davon und sitzt vertikal mittig zwischen der
Button-Reihe und der Bottom-Nav:

```
[ Sternensuche ]  [ Eigener Stern ]

          ↕ gleicher Abstand
     Lust auf Neues? Zur Sternschmiede
          ↕ gleicher Abstand

========= Bottom-Nav =========
```

Umsetzung über einen wachsenden Zwischenraum ober- und unterhalb des CTA
(`flex-1`-Spacer oder `my-auto`), mit einem Mindestabstand nach oben, damit er
bei vielen Sternen nicht an der Button-Reihe klebt.

Das `forgeLink()`-Fragment in
[`wants-me.tsx:139`](<../../../app/(app)/me/wants/wants-me.tsx>) wird dafür aus
dem Stapel gezogen. Im Leer-Zustand (keine Sterne) bleibt es wie bisher direkt
unter „Sternensuche starten" — dort ist der Screen ohnehin zentriert.

### 5.3 Einleitetext auf Schmiede-Größe

| | Überschrift | Einleitetext |
|---|---|---|
| Wants | `text-2xl font-bold` | `text-sm max-w-xs` |
| Schmiede | `text-2xl font-bold` | `text-base` |

Die Überschriften sind bereits einheitlich. Der Einleitetext auf Wants zieht
auf `text-base` nach und bekommt mehr Zeilenbreite (`max-w-xs` → etwa
`max-w-sm`), damit `text-base` nicht in Vierwort-Zeilen bricht.

---

## Paket 6 — Sternschmiede

### 6.1 Funken driften weniger, streuen breiter

**Drift:** `funke-drift` bewegt heute ±6 px vertikal
([`globals.css:977`](../../../app/globals.css)). Halbiert auf ±3 px, Periode
bleibt bei 6 s.

**Streuung:** [`funken-sky.tsx:50`](../../../components/wants/funken-sky.tsx)
setzt die Spaltenzentren auf 92 / 268 mit ±26 Jitter. Die Sternenkarte nutzt
bereits **78 / 282 mit ±28** und hat das im Code begründet („Spalten-Zentren
etwas weiter nach außen, damit sich die Sterne nicht in der Bildmitte
sammeln"). Die Schmiede übernimmt genau diese Werte.

Zwei Fliegen: die Konstellation wird breiter, **und** die Schwesterseiten
sprechen dieselbe Sprache. Label-Overflow ist geprüft — bei `max-w-[8rem]`
(≈134 viewBox-Einheiten) bleiben beide Spalten innerhalb der 360er-Breite.

### 6.2 Abstände von Wants übernehmen

`FunkenSky` hat dieselbe Konstanten-Struktur wie die Sternenkarte
(`TOP_PAD = 42`, `BOTTOM_PAD = 48`) und wird nach demselben abgeleiteten
Abstandswert umgestellt — allerdings ohne Maskottchen-Zuschlag, weil unter der
Konstellation direkt die „Eigener Funke"-Zeile folgt.

Der CTA-Block am Seitenende bekommt dieselbe Behandlung wie Wants 5.2:
„Zurück zu meinen Sternen" mittig zwischen der Gold-CTA und der Bottom-Nav.
Der harte `<div className="h-8" />`-Spacer am Ende von
[`sternschmiede.tsx`](<../../../app/(app)/me/wants/schmiede/sternschmiede.tsx>)
entfällt.

---

## Paket 7 — Intro-Texte übernehmen

Übernahme der redigierten Fassungen aus `INTROS_REVIEW.md` nach
[`lib/utils/recipe-intros.ts`](../../../lib/utils/recipe-intros.ts). Acht
inhaltliche Änderungen; Vertipper in den neuen Passagen werden still
korrigiert (jede unten aufgeführt).

### 7.1 Values

**Karte 2 „Deine Werte."** — kaputter Satz repariert:

> … wissen gar nicht, was ihre ~~eigentlich~~ **Werte** eigentlich sind.

**Karte 3 „Was dich erwartet"**:

> ~~In diesem Rezept~~ **In dieser Übung** findest du deine Werte nicht durch
> stundenlange Selbstreflexion **heraus** — sondern durch echte Beobachtung …

### 7.2 Wants

**Karte 1 „Wessen Ziele jagst du eigentlich?"** — vollständig neu. Neuer
Schluss („jagst du dann wirklich deine eigenen Ziele?") schließt an den Titel
an, statt wie bisher auf Identität zu schwenken.

Korrekturen in der neuen Fassung:

| md | übernommen als |
|---|---|
| interessanter Weise | interessanterweise |
| durch … oder einfach den Leuten, die uns … begleiten | … oder einfach die Leute, die uns … begleiten |
| fangen diese Ziele … an auch für uns schmackhaft auszusehen | … an, auch für uns schmackhaft auszusehen |

**Karte 2** — Titel „Dein Kompass und deine Sterne" → **„Deine Sterne"**, Body
vollständig neu (deutlich ausführlicher, mit dem Erwartungs-Berg am Schluss).

| md | übernommen als |
|---|---|
| ein schlechten Tag | einen schlechten Tag |
| essenziel | essenziell |
| das richtige für uns zu tun | das Richtige für uns zu tun |
| losgelöst davon was andere glauben, die richtigen Sterne für uns sind | losgelöst davon, was andere für die richtigen Sterne für uns halten |
| Bindestrich `-` als Gedankenstrich | Halbgeviertstrich `—` (Hausstil) |

**Karte 3** — Body neu (die zwei Fragen explizit nummeriert).

| md | übernommen als |
|---|---|
| stellen wir zwei uns bei der Sternensuche-Übung zwei scheinbar gegensätzliche | stellen wir uns bei der Sternensuche zwei scheinbar gegensätzliche |
| Was bringt in Flow? | Was bringt dich in Flow? |
| in eine Zustand des Flows | in einen Zustand des Flows |
| bis spät in die Nach | bis spät in die Nacht |

**Karte 4** — weicherer Übergang zur Schmiede:

> ~~Dafür gibt es die Sternschmiede:~~ **Falls das auf dich zutreffen sollte,
> dann gibt es hier die Sternschmiede:**

### 7.3 Bill of Rights

**Karte 4** — „Vorschlag generieren" → **„Recht generieren"** in Titel und
Body.

Dein Edit deckt eine echte Inkonsistenz auf: Der Einstiegs-Button auf
/me/bill-of-rights heißt bereits „Recht generieren"
([`bill-of-rights-me.tsx:326`](<../../../app/(app)/me/bill-of-rights/bill-of-rights-me.tsx>)),
die Zielseite dahinter aber „Vorschlag generieren". Vereinheitlicht wird auf
**„Recht generieren"**:

| Ort | heute | neu |
|---|---|---|
| `recipe-intros.ts` Karte 4, Titel + Body | Vorschlag generieren | Recht generieren |
| `bill-of-rights/generate/page.tsx:124` (Sub-Page-Titel) | Vorschlag generieren | Recht generieren |
| `bill-of-rights/generate/page.tsx:162` (Submit-Button) | Vorschlag generieren | Recht generieren |
| `bill-of-rights-intro-mascot.tsx:11` (Kommentar) | Vorschlag generieren | Recht generieren |
| `bill-of-rights-me.tsx:326` (Einstiegs-Button) | Recht generieren | unverändert |

Begründung: Der Button, den man tippt, heißt so — und das Ergebnis ist ein
Recht, kein Vorschlag.

### 7.4 Nein sagen

**Karte 2**:

> Diese simple Regel ~~(nach Dr. Aziz Gazipura)~~ ist dein neuer
> ~~Kompass~~ **Filter**: …

„Kompass" ist im AIC-Bildsystem für die Werte reserviert — „Filter" trifft die
Mechanik besser und räumt die Metapher-Kollision auf.

### 7.5 Nicht übernommen

Zwei Stellen, an denen die `.md` gegenüber dem Code verschlechtert ist
(Transkriptions-Rutscher, keine Absicht) — hier bleibt der Code-Stand:

| Ort | `.md` | bleibt |
|---|---|---|
| Nein sagen, Karte 1 | Und jetzt sitzt da mit einem vollen Kalender | Und jetzt sitzt **du** da … |
| Schattenseite, Karte 3 | der privatste Ort der App | der **privateste** Ort der App |

### 7.6 Aufräumen

`INTROS_REVIEW.md` wird gelöscht, sobald die Änderungen im Code stehen und die
Gates grün sind.

**Achtung:** Alle deutschen Anführungszeichen in den neuen Texten müssen echte
Unicode-Zeichen sein (U+201E „ und U+201C ") — ASCII-Quotes brechen sowohl das
Typo-Gate als auch die String-Literale in der Datei (sie ist mit einfachen
Quotes delimitiert).

---

## Nicht in diesem Umfang

Bewusst ausgeklammert, damit der Umfang beherrschbar bleibt:

- **`want-star-twinkle`** auf der Sternenkarte bleibt ruhig — nur das
  Hub-Ornament funkelt stärker.
- **Kompass-Dämpfung auf /me** bleibt: Der leere Kompass ist dort ein
  ehrlicher Zustand, kein Bug.
- **Maskottchen auf Booster-Abschluss-Screens** bleiben — sie feiern mit.
- **`overflow-x-clip`** auf dem Overthinking-Wizard-Root: bekannt riskant für
  den `sticky` `SubPageHeader`, aber bestehend und unauffällig. Nicht Teil
  dieser Runde.
- **`npm run lint`** ist auf `main` vorbestehend rot (drei
  Sternschmiede-ESLint-Fehler). Nicht Teil dieser Runde; harte Gates bleiben
  `tsc` + `npm run gate` + `build`.

---

## Verifikation

Pro Paket: `npx tsc --noEmit`, `npm run gate` (Kontrast + Typo + Motion) und
`npm run build`. Der eigentliche Abnahme-Test ist der iPhone-Check am
Live-Deploy — mehrere Punkte dieser Runde (Hero-Kante, Zoom-Übergang,
Abstände, Funkeln) sind auf dem Desktop schlicht nicht beurteilbar.

Besonders am Gerät zu prüfen:

- Zoom-Übergang: landet der Klon sauber auf dem Icon? Kein Spinner-Aufblitzen?
- Onboarding → Dashboard: bleibt der Himmel wirklich stehen?
- Signup: ist die Kante oben weg?
- Wants/Schmiede: sind die Abstände oben und unten wirklich gleich?
