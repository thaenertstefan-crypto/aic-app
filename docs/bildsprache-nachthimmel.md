# Bildsprache „Dein Nachthimmel" — Design

_Stand: 2026-07-17 · Status: von Stefan abgesegnet (inkl. Spec-Review), Implementierungsplan folgt_

## Problem

Die App erklärt Selbstkenntnis über drei Dinge (Werte, Wants, innere Regeln) plus Akut-Hilfen — aber die bisherigen Metaphern kommen aus vier verschiedenen Welten und hängen zusammenhangslos nebeneinander:

- **Kompass** (Werte) — Navigation, passt.
- **Sterne / Sternschmiede** (Wants) — Nacht, passt, aber intern unsauber: vermischt Ziele (wonach man greift) und Freudenquellen (was einen zum Leuchten bringt).
- **Bill of Rights** (innere Regeln) — juristisches Register, Fremdkörper.
- **Kopf-Apotheke** (Akut-Hilfen/Booster) — medizinisches Register, Fremdkörper; erklärt außerdem nicht, *warum* diese Übungen zu den anderen dreien gehören.

Gewünscht: eine einheitliche Bildsprache, die Emotion und Neugier erzeugt und die App verständlicher macht — ohne die Übungen zu übertünchen („Fokus bleibt auf den Übungen").

## Entscheidung: „Dein Nachthimmel"

Die Bildwelt erfindet nichts Neues, sondern erzählt die vorhandene Design-Welt („Candlelight in a Quiet Room", Aubergine-Nacht, North Star als Rückzugsort) zu Ende:

**Du sitzt in deinem geschützten, warmen Raum — das ist die App — und schaust in deinen eigenen Nachthimmel. Sich selbst kennenlernen heißt: den eigenen Himmel lesen lernen.**

- Der **Kompass** (Werte) zeigt die Richtung — Kompass + Sterne ist die klassische Navigation bei Nacht.
- Die **Sterne** (Wants) sind das, was dich leuchten lässt und wonach du greifst; in der **Sternschmiede** entstehen neue.
- Die **Bill of Rights** (innere Regeln) sind die Regeln, nach denen du navigierst.
- Selbstzweifel, Overthinking, messy Momente sind **Wetter**: real, manchmal heftig, aber vorüberziehend — und sie sagen nichts über deinen Himmel aus. Die Akut-Hilfen (**Kopfwetter**, vorher Kopf-Apotheke) ändern nicht deinen Himmel, sie helfen durchs Wetter, bis du deine Sterne wieder siehst.

Damit wird die bisherige Schwachstelle zur tragenden Idee: Die Hilfsübungen sind nicht mehr angehängt, sondern im Bild *notwendig*.

**Verworfene Alternativen:** „Licht-System" (alles über Licht erzählt — kollidiert mit der funktionalen Gold-Semantik der One-Candle-Rule; Kompass hängt lose) und „Nachtwanderung" (Reise-Rahmen — erzählt Weg/Ziel/Fortschritt und widerspricht dem Rückzugsort-North-Star und der Anti-Hustle-Referenz).

## Leitsatz

> **„Auch wenn das Wetter sie manchmal versteckt: Deine Sterne leuchten weiter."**

Bewusst „leuchten weiter" statt „ändert sich nicht": Der Himmel darf wachsen (Sternschmiede!) — das Stabile ist, dass kein Wetter ihn zerstören kann.

## Story (Onboarding-Rohfassung)

> Jeder Mensch hat verschiedene Dinge, die ihn oder sie zum Leuchten bringen, die einem Freude bringen, ein echtes Lachen entlocken, und ein Gefühl von echter Zufriedenheit geben. Diese Dinge sind wie Sterne am Nachthimmel, die besonders hell für einen selbst scheinen und wie den alten Seefahrern den Weg zu innerem Frieden zeigen. Die meisten haben nur nie in Ruhe hingeschaut.
>
> Hier ist dein Raum dafür. **Dein Kompass** zeigt dir, wofür du stehst — deine Werte. **Deine Sterne** zeigen dir, was dich leuchten lässt und wonach du greifst — Deine persönliche Freudenquellen und Ziele. Und **deine Bill of Rights** sind die Regeln, nach denen du navigierst — die Rechte, die du dir selbst gibst.
>
> Und wenn Wolken aufziehen — Zweifel, Grübeln, ein Tag, an dem alles zu viel ist — dann ist das Wetter. Nicht dein Himmel. Es zieht vorbei. Bis dahin findest du hier Hilfen, um durchzukommen — und deine Sterne wieder zu sehen.

## Begriffssystem

| Konzept | Bild | Name | Status |
|---|---|---|---|
| Werte | Kompass — zeigt die Richtung | **Kompass** | bleibt |
| Wants | Deine Sterne — leuchten & greifbar | **Sterne / Sternschmiede** | bleibt |
| Innere Regeln | Regeln, nach denen du navigierst | **Bill of Rights** | bleibt (geduldeter Eigenname) |
| Akut-Hilfen (Booster) | Wetter, das vorbeizieht | **Kopfwetter** | **neu** (ersetzt „Kopf-Apotheke") |
| Stimmungs-Check-in | Wetterbericht („Wie ist dein Kopfwetter heute?") | — | Umdeutung |
| Die App selbst | Der geschützte Raum, aus dem du in deinen Himmel schaust | — | Umdeutung (deckt sich mit Design-North-Star) |

**Wants — ein Konzept, zwei Facetten:** Es gibt Sterne, *nach denen du greifst* (Ziele), und Sterne, *die schon leuchten* (konkrete Freudenquellen). Beide sind Sterne an deinem Himmel. Die Facetten werden in der Copy **beschrieben, aber nicht benannt** (keine eigenen Vokabeln wie „Leitsterne"), um die Begriffslast klein zu halten.

## Sprachregeln (Named Rules)

1. **Die Rahmen-Regel.** Metaphern leben an den Rändern: Hub-Titel, Onboarding, Check-in, Intro-/Abschluss-Momente. Innerhalb der Übungs-Steps ist die Sprache konkret und bildfrei — Buttons, Fragen und Anweisungen sagen direkt, was zu tun ist. Ein Button heißt „Weiter", nie „Nach den Sternen greifen".
2. **Selbst gesetzt, nie gedeutet.** Sterne werden vom User benannt, niemals von der App gelesen. Keine Schicksals-, Astro- oder Deutungs-Semantik (harte Grenze zur Wellness-Esoterik-Anti-Referenz). Die App sagt nie „deine Sterne zeigen dir, dass …".
3. **Wetter wird festgestellt, nie bewertet.** Raues Kopfwetter ist kein Versagen — Copy formuliert wie ein freundlicher Blick aus dem Fenster („Heute ist es stürmisch bei dir"), nie als Diagnose oder Vorwurf. „Fortschritt ohne Scham" in Bildform.
4. **Ein Leuchtsatz pro Moment.** Der Leitsatz und seine Verwandten gehören in die Affirmations-Ebene (Fraunces Italic, `.font-affirmation`) und werden sparsam eingesetzt (Onboarding, ausgewählte Abschluss-Momente) — gleiche Logik wie die One-Candle-Rule, nur für Sprache.
5. **Eine Welt, keine Neuzugänge.** Alle künftigen Bilder kommen aus der Nachthimmel-Welt (Himmel, Sterne, Wetter, Kompass, Licht, der Raum). Keine neuen fremden Register (Medizin, Sport, Reise, Büro). Bill of Rights ist die eine geduldete Ausnahme und wird über die Navigations-Formulierung angeschlossen.

## Visuelle Ebene (dezent, auf vorhandener Infrastruktur)

1. **Der Himmel ist schon da.** SkyBackdrop + Body-Gradient + Ambient-Blobs *sind* der Nachthimmel. Optionales Nice-to-have: eine Handvoll statischer, kaum sichtbarer Sterne im Backdrop (Grain-artig subtil, kein Gefunkel).
2. **Hub-Szenen tragen die Motive** über die bestehende `scene-ornament-tint`-Konvention; Modul-Lichtfarben unverändert (Werte = Kompass/Gold, Wants = Sterne/Rosé, BoR = Siegel/Sage). Neu: **Kopfwetter-Hub** bekommt statt des Apotheken-Motivs ein ruhiges Wetter-Motiv (z. B. Wolke vor Sternen) in Lilac.
3. **Check-in wird sichtbar zum Wetterbericht.** Die Stimmungs-Auswahl im Dashboard bekommt Wetter-Semantik (klar, leicht bewölkt, stürmisch, …); der stimmungsbasierte „heutige Fokus" folgt daraus erzählerisch (klarer Himmel → Zeit für die Sterne; stürmisch → erstmal Kopfwetter-Hilfen). Kleinster Eingriff, größter Story-Effekt.
4. **Explizit unverändert:** One-Candle-Rule, Palette, Modul-Lichtfarben, Glass-Is-Rare, Hairline-Elevation, das Maskottchen als Charakter. Die Bildwelt ist eine Bedeutungsschicht über dem Designsystem, kein Umbau.

## Umfang (grob, noch ohne Implementierungsplan)

- **Naming & Copy:** Kopf-Apotheke → Kopfwetter (Hub-Titel, Copy; auch der Nav-Tab heißt einheitlich „Kopfwetter" statt „Booster"), Onboarding-Story, Hub-Intro-Texte, Leitsatz an Affirmations-Stellen.
- **Visuals:** ein neues Szenen-Ornament (Kopfwetter), Wetter-Semantik im Check-in; optional Backdrop-Sterne.
- **Docs:** DESIGN.md (Overview/North-Star um die Bildwelt ergänzen), PRODUCT.md (Story-Absatz).

## Nicht-Ziele

- Keine durchgehende „Erlebniswelt" (App als begehbare Landschaft) — bewusst verworfen.
- Kein neues Illustrations-System, keine neuen Farb-Token.
- Keine Aufspaltung der Wants in zwei App-Bereiche.
- Keine Metaphern innerhalb der Übungs-Steps.
