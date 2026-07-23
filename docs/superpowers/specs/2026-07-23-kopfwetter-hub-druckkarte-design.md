# Kopfwetter-Hub als synoptische Druckkarte — Design-Spec

**Datum:** 2026-07-23
**Route:** `/booster` (interner Key `booster`, angezeigt „Kopfwetter")
**Betroffene Dateien:** `app/(app)/booster/page.tsx`, `app/(app)/booster/weather-art.tsx` (Symbole bleiben), ggf. `app/globals.css` (Motion-Klassen), `app/(app)/booster/saying-no/saying-no-wizard.tsx` (Nebenfix)

## Kontext & Problem

Der Kopfwetter-Hub ist heute eine „Wetterkarte": ein SVG mit Isobaren, Kopf-Silhouette-Insel und Front-Linie, auf dem 5 Wettersysteme an hartkodierten `x/y`-Koordinaten platziert sind. `impeccable critique` (27/40, Snapshot `.impeccable/critique/2026-07-23T15-24-49Z__app-app-booster.md`) und Stefans Bauchgefühl decken sich:

- **Die „Karte" existiert im Code, nicht auf dem Screen.** Isobaren (Opacity 0.18), Kopf-Insel (0.06 Füllung), Front-Linie sind so kontrastarm, dass das Auge nur 5 kleine, gleich schwere Icons in losem Raum sieht — verstreute Sticker statt zusammenhängendes Wetter.
- **Kein sichtbarer Grund verbindet die Systeme**, keine Hierarchie/Leserichtung.
- **Thumb-Zone:** Ziele über das hohe Feld verstreut, einige oben außer Daumenreichweite.
- Die geplante wärmere Copy hat **stark unterschiedliche Satzlängen** (2–6 Zeilen), die die kleinen `w-36`-Labels der Streu-Karte sprengen.

Kein AI-Slop; die Idee trägt. Ziel ist, den **Grund sichtbar** zu machen und das Streu-Layout durch eine lesbare, kollisionsfreie, daumenfreundliche Komposition zu ersetzen — ohne die Wetter-Poesie und die Marke (Nachthimmel/Kopfwetter) zu verlieren.

## Getroffene Entscheidungen (Brainstorm 2026-07-23)

1. **Richtung:** Atmosphäre sichtbar machen — Szene bleibt räumlich, der Grund wird endlich sichtbar.
2. **Atmosphäre:** echte **Druckkarte** (Wetterkarte), nicht diffuser Himmel — sichtbare, glühende Isobaren.
3. **Anordnung:** **alle 5 gleichrangig**, kein Ranking, kein emotionaler Bogen. Einstieg = Wiedererkennen des eigenen Wetters (Selbstwahl), bewusst kein vorgeschriebener erster Schritt.
4. **Labels:** volle, warme **Ich-Sätze sichtbar** an jeder Zelle (kein Tap nötig), Karte dafür luftig.
5. **Komposition:** **Ansatz A — Mäandernde Front** (Flow-Layout, Zickzack links/rechts).
6. **Copy-Detail:** informell „du" klein; „Things Got Messy" bleibt vorerst englisch (wie „Overthinking"/„Confidence-Boost").

## Copy

### Subheader (ersetzt den aktuellen `<p>`)

> Manchmal schlägt das Wetter um: Zweifel, Gedankenspiralen oder Überforderung ziehen auf. Das ist normal und das zieht auch wieder vorbei. Die folgenden Hilfen machen dich wetterfest gegen die Stürme und Regenwolken in deinem Kopf. Was brauchst du gerade?

(H1 „Kopfwetter" bleibt.)

### Die 5 Systeme (Ich-Satz = primäres Label, Modultitel = leise Meta-Zeile)

| Symbol (bleibt) | `feeling` (neu) | `title` | `href` |
|---|---|---|---|
| `WindSwirl` | Ich bin am overthinken | Overthinking | `/booster/overthinking` |
| `UmbrellaRain` | Ich will zu etwas Nein sagen, aber weiß nicht wie | `PAGE_TITLES.sayingNo` (Nein-Trainer) | `/booster/saying-no` |
| `CloudStack` | Ich fühl mich schuldig, obwohl ich es nicht sollte | `PAGE_TITLES.thingsGotMessy` (Things Got Messy) | `/booster/things-got-messy` |
| `StormCloud` | Ich muss Dampf ablassen | `PAGE_TITLES.shadow` (Schattenseite) | `/booster/shadow` |
| `ClearingStar` | Ich gehe gleich in eine nervenaufreibende Situation und brauche einen schnellen Confidence Boost | `PAGE_TITLES.confidence` (Confidence-Boost) | `/booster/confidence` |

Zuordnung geprüft: `things-got-messy` ruft `/api/messy-guilt-coach` — der Schuld-nach-einem-Moment-Coach; „Ich fühl mich schuldig …" trifft das Modul besser als das alte „Gerade ist alles zu viel".

Die `x/y`-Felder im `WeatherSystem`-Typ **entfallen** (kein Koordinaten-Layout mehr). Es bleibt: `feeling`, `title`, `art`, `href`; neu: eine Ausrichtungs-Angabe (siehe Layout) — entweder aus dem Index abgeleitet (gerade = links, ungerade = rechts) oder als explizites Feld `side: "left" | "right"`.

## Layout & Komposition (Ansatz A — Mäandernde Front)

**Kern:** Weg von hartkodierten `x/y`-Koordinaten auf festem viewBox. Stattdessen **Flow-Layout**, das die vollen Sätze automatisch kollisionsfrei anordnet und responsive/daumenfreundlich ist.

- **Struktur:** ein `relative` Container. Darin zwei Schichten:
  1. **Isobaren-Layer** (absolut, `inset-0`, `aria-hidden`, `pointer-events-none`): das atmosphärische SVG (siehe unten), füllt den Container.
  2. **Zellen-Flow** (relativ, `z-10`): vertikaler Stapel der 5 Links mit großzügigem vertikalem Gap.
- **Mäander:** Zellen wechseln die horizontale Ausrichtung — Zelle 1 links, 2 rechts, 3 links, 4 rechts, 5 links. Umsetzung z. B. per `self-start`/`self-end` in einem Flex-Column-Container oder `mr-auto`/`ml-auto` auf ~`max-w-[17rem]` breiten Zellen. Das Wetter-Symbol sitzt an der **Außenkante**, der Text fließt nach innen.
- **Kollisionsfreiheit:** Weil der Flow Platz reserviert und benachbarte Zellen auf gegenüberliegenden Seiten stehen, kollidieren auch der 6-Zeiler (Confidence) und lange Sätze nie. Ungleiche Höhen sind Teil des Charakters.
- **Keine feste Container-Höhe** mehr (`aspectRatio` entfällt); die Höhe ergibt sich aus dem Flow. Der Isobaren-Layer skaliert per `preserveAspectRatio="xMidYMid slice"` mit.

### Eine Zelle (Druckzentrum)

Ein `<Link>` (ganzes Element = Tap-Ziel), Aufbau:

- Weicher **radialer Lilac-Glow** (`--cleanser-confidence`) hinter dem Symbol als „Tiefdruckkern" + optional eine feine geschlossene Isobar-Ring-Andeutung um das Symbol.
- **Wetter-Symbol** (`size-14`, bestehende Komponente aus `weather-art.tsx`).
- **Ich-Satz** in Fraunces (`font-heading`), `text-balance`, `text-foreground` (Moonlight — nicht muted, Kontrast-Grund), zur Zellenseite ausgerichtet.
- **Modultitel** als `text-[11px] text-muted-foreground` Meta-Zeile.
- Interaktion wie bisher beibehalten: `rounded-xl`, Hover-`bg-muted/20`, `active:scale-[0.98]`, `focus-visible:ring-2 ring-ring/50`.
- `aria-label = "{title} — {feeling}"`.

## Atmosphäre (sichtbarer Grund)

Ersetzt das aktuelle Deko-SVG (Isobaren 0.18, Kopf-Insel, Front). **Kopf-Silhouette wird entfernt.**

- **Isobaren:** mehrere weich fließende, fast-vertikale Linien, die den Container durchziehen. Farbe Gold/Moonlight, Opacity ~0.35–0.45, mit **weichem Outer-Glow** (z. B. per SVG-`feGaussianBlur`-Filter oder doppelter Linie mit Blur), damit sie sichtbar „leuchten" statt als Haarlinie zu verschwinden.
- **Front:** eine diagonale Front-Linie in Lilac (`--cleanser-confidence`), gestrichelt (`strokeDasharray`), leicht driftend.
- **Neutraler Druck-Verlauf:** sanfter Aubergine-Tiefenverlauf (SVG-Gradient oder CSS) für Räumlichkeit — **ohne Wertung** (kein „schlecht→gut"-Gefälle; gleichrangig).
- Alle atmosphärischen Elemente `aria-hidden`, `pointer-events-none`.

## Motion

- **Isobaren/Front** driften langsam; **Zellen-Glow** pulst leise — bestehende `bs-*`-Motion-Klassen (aus `globals.css`) wiederverwenden, wo passend.
- **Reveal der 5 Zellen** in /me-Szenen-Grammatik: ruhiger Reveal (~600 ms), **kein** schneller, abgehackter Stagger. Bestehende `Reveal`-Komponente nutzen; Reveal muss einen bereits sichtbaren Default verbessern (Inhalt nie hinter der Transition gaten).
- **`prefers-reduced-motion: reduce`:** alle Drift/Puls/Reveal-Animationen aus, alles statisch und sichtbar (Fallback liegt zentral in `globals.css`).

## Zugänglichkeit & Responsive

- Ich-Sätze in **Moonlight** (`text-foreground`), nicht `muted-foreground` → Body-Kontrast ≥ 4.5:1 auf Aubergine.
- Isobaren/Atmosphäre `aria-hidden`; jede Zelle sichtbarer Gold-Fokusring, ganzes Element als großes Tap-Ziel.
- Flow-Layout skaliert ab ~375px ohne feste Höhe; keine absoluten Koordinaten, die auf schmalen Viewports brechen.

## Nebenfix (Detector-Fund, unabhängig)

`app/(app)/booster/saying-no/saying-no-wizard.tsx:860`: `animate-bounce` (Bounce-Easing) → gegen ein weiches ease-out (oder Entfernen) tauschen. Datiertes Easing, nicht Teil des Hubs, aber im selben Zug erledigbar.

## Nicht im Scope (YAGNI)

- Keine Tap-/Fokus-abhängige Anzeige der Ich-Sätze (Sätze sind immer voll sichtbar).
- Kein emotionaler Bogen / kein Ranking der Systeme.
- Keine Kopf-Silhouette / kein Terrain.
- Keine Eindeutschung von „Things Got Messy" (vorerst).
- Keine Änderung an den Ziel-Subpages außer dem `animate-bounce`-Nebenfix.

## Verifikation

- `npx tsc --noEmit`, `npm run gate` (Kontrast/Typo/Motion), `npm run build` grün.
- Finale Verifikation = iPhone am Live-Deploy (AIC-Konvention): sichtbarer Isobaren-Grund, kollisionsfreie Sätze inkl. 6-Zeiler, Daumen-Read top→bottom, Fokusring, reduced-motion ruhig.
