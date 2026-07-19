# Dashboard-Mood-Atmosphäre & Header — Design

**Datum:** 2026-07-19
**Status:** Freigegeben (User-Review ausstehend)
**Scope:** Kleine, gezielte Design-Politur an der Dashboard-Wetterbühne (Wolken + Himmel), an den Mood-Übergängen und an der Header-Typografie. Kein Umbau der Architektur — nur die vier bekannten Dateien plus DESIGN.md.

## Ziel

Die Mood-Übergänge auf dem Dashboard sollen sich ruhiger und „durchatmend" anfühlen statt hart geschaltet. Die Wolken sollen als eigenständiges Wetter-Motiv lesbarer werden (größer, eigene Farbe, echtes Rein-/Rausfliegen). Der Himmel bekommt eine Nebel-Ebene als atmosphärisches Stimmungssignal, statt nur abzudunkeln. Und alle Seiten-/Flow-Header werden eine Stufe größer.

## Betroffene Dateien

- `app/(app)/dashboard/page.tsx` und weitere H1-Header (siehe §1)
- `components/dashboard/mascot-weather.tsx` — die Wolken
- `components/backdrops/sky-backdrop.tsx` — Himmel, Schleier, Sterne, neue Nebel-Ebene
- `app/globals.css` — Keyframes (Nebel-Drift neu; Twinkle bleibt, `--twinkle-dur`-Umschaltung entfällt)
- `DESIGN.md` — Typo-Skala nachziehen

---

## §1 — Header-Überschriften größer

Zwei bestehende Stufen, beide um eine Stufe nach oben:

| Ort | Alt | Neu |
|---|---|---|
| Seiten-H1 (Dashboard „Hey Stefan!", `/me`, `/booster`) | `text-4xl` | `text-5xl` |
| Flow-/Wizard-H1 (Overthinking, Shadow, Saying-No, Things-Got-Messy, Wants-Journey, Confidence-Moment) | `text-3xl` | `text-4xl` |
| Evaluation-Header | `text-3xl sm:text-4xl` | `text-4xl sm:text-5xl` |

**Konkrete Fundstellen** (aus Grep `font-heading … text-3xl/4xl`):
- `app/(app)/dashboard/page.tsx:251` — `text-4xl` → `text-5xl`
- `app/(app)/me/page.tsx:73` — `text-4xl` → `text-5xl`
- `app/(app)/booster/page.tsx:37` — `text-4xl` → `text-5xl`
- `app/(app)/booster/things-got-messy/things-got-messy-wizard.tsx:276` — `text-3xl` → `text-4xl`
- `app/(app)/booster/overthinking/overthinking-wizard.tsx:664` — `text-3xl` → `text-4xl`
- `app/(app)/booster/shadow/shadow-wizard.tsx:210` — `text-3xl` → `text-4xl`
- `app/(app)/booster/saying-no/saying-no-wizard.tsx:630` — `text-3xl` → `text-4xl`
- `app/(app)/booster/confidence/moment/moment-flow.tsx:287` — `text-3xl` → `text-4xl`
- `app/(app)/me/wants/journey/wants-journey.tsx:718` — `text-3xl` → `text-4xl`
- `app/(app)/me/values/journey/evaluation/evaluation-form.tsx:199` — `text-3xl sm:text-4xl` → `text-4xl sm:text-5xl`

**Ausgenommen:** `app/(app)/booster/confidence/breathing-exercise.tsx:125` (`text-3xl`) — das ist die Countdown-**Ziffer** der Atemübung, kein Header. Bleibt unverändert.

**Doku:** `DESIGN.md` §3 (Typography → Hierarchy) auf die neuen Größen nachziehen: Display = `text-5xl` (3 rem), Headline/Flow-H1 = `text-4xl`. Die „Fixed-Scale-Rule" bleibt gültig (feste rem-Stufen, kein `clamp()`).

---

## §2 — Wolken: größer & Lavendel-Grau

In `mascot-weather.tsx`:

- **Farbe:** `STROKE`-Konstante von `var(--primary)` (Gold) auf **Lavender-Muted** umstellen. Der Ton existiert bereits als Token `--muted-foreground: #A89FBE` (globals.css) → `STROKE = "var(--muted-foreground)"`, kein hart kodierter Hex im JSX.
- **Sturmwolke** minimal kühler/dunkler als die ruhigen Wolken, für Tiefenwirkung (z. B. leicht reduzierte Helligkeit / etwas höhere Deckkraft desselben Lavendel-Tons). Kein zweiter Farbton, nur eine Nuance.
- **Größe:** `CloudSvg` — normale Wolke `w-12` → **`w-16`**, schwere (`heavy`) `w-16` → **`w-20`** (ca. +30 %).
- **Deckkraft:** die `fill`-Opacity leicht senken (normal `0.24` → ~`0.20`, heavy `0.34` → ~`0.30`), damit die größeren Flächen nicht zu schwer/blockig auf dem Aubergine liegen. Feintuning am Gerät.

Die Formsprache (Kreise + `rect` als Wolkenbank) bleibt unverändert.

---

## §3 — Wolken fliegen richtig rein/raus

In `mascot-weather.tsx`, `flyClass`:

- **Volles Rausfliegen:** Der versteckte Zustand schiebt aktuell nur um `translate-x-8`/`-8`/`-10` (≈32–40 px). Neu: eine **viewport-basierte Translation**, sodass die Wolke seitlich klar aus dem sichtbaren Bereich fliegt (Richtwert `±60vw`, am Gerät final justiert). Richtung bleibt seitengebunden: links platzierte Wolken fliegen nach links raus und von links rein, rechte nach rechts.
- **Übergangs-Timing:** Dauer `duration-700` → **~`duration-900`**, Easing weicher (`ease-in-out` bzw. ein sanfter Cubic-Bezier). Optional: Austritt eine Spur schneller als Eintritt, damit sich alte und neue Wolke nicht exakt spiegeln und der Wechsel „durchatmet". Wenn das über eine einzelne Transition-Klasse zu fummelig wird, ist eine gleiche Dauer für Ein-/Austritt akzeptabel — Priorität ist das volle Rein-/Rausfliegen.
- **Trennung Transition/Drift bleibt:** Der äußere Wrapper trägt Opacity+Transform (Flug), der innere `dash-cloud-drift` die Loop-Animation. Nicht vermischen.

---

## §4 — Stürmisch: zweite Regenwolke rechts

In `mascot-weather.tsx`, Storm-Block (Score 1):

- Zusätzlich zur bestehenden schweren Wolke + Wetterleuchten links eine **zweite Regenwolke rechts**, die von rechts hereinfliegt (`flyClass(storm, "translate-x-…")`, rechts positioniert).
- Etwas kleiner und tiefer versetzt als die linke, für Tiefe/Staffelung. Eigene Regenstriche (`dash-rain`-Klassen, ggf. mit anderen Delays, damit der Regen nicht synchron mit links fällt).
- Kein zweites Wetterleuchten — das bleibt ein einzelnes Glimmen links, sonst wird's zu viel.

---

## §5 — Hintergrund: Nebel-Ebene + zahmeres Abdunkeln + durchgehendes Funkeln

In `sky-backdrop.tsx` und `globals.css`.

### 5a — Nebel-Ebene (neu)
- Eine weiche, **langsam horizontal treibende Dunstschicht** im unteren Bilddrittel des `SkyBackdrop`. Kühles Lavendel-Grau, niedrige Deckkraft, als gemalter Gradient (kein `backdrop-filter` — Glass-Is-Rare-Regel).
- **Score-Reaktion:** Deckkraft zieht bei **stürmisch (1)** am stärksten herein, bei **bewölkt (2)** dezent, bei **ruhig/klar/sternenklar (3–5)** aufgelöst (Opacity 0). Getrieben über denselben `transition-opacity`-Mechanismus wie der Schleier.
- **Drift:** neuer Keyframe `sky-mist-drift` in `globals.css` (langsame, weite Horizontalbewegung, ~30–40 s, `ease-in-out infinite`). Reduced-motion: statischer Dunst, kein Drift (Basis-Opacity bleibt sichtbar).
- Liegt wie der Schleier im `-z-10`-Stack → dimmt nur Backdrop-Ebenen, nie den Content/Text.

### 5b — Abdunkeln zahmer & langsamer
- `veil`-Maximalwert von `0.35` (Score 1) auf **~`0.2`** zurücknehmen; Score 2 entsprechend leichter. Der Nebel trägt die Stimmung jetzt mit, das reine Schwarz muss nicht mehr so weit gehen.
- Fade-Dauer aller Backdrop-Übergänge (Schleier, Sterne-Gruppe, Nebel) `duration-700` → **~`duration-[1200ms]`**, weicheres Ease. Langsamer, damit der Stimmungswechsel fließt.

### 5c — Sternfunkeln durchgehend (Neustart-Fix)
- **Ursache:** Bei Score 5 wird `--twinkle-dur` von `6s` auf `2.8s` umgeschaltet. Das Ändern der `animation-duration` eines laufenden CSS-Loops remappt die Animation → sichtbarer „Neustart"/Sprung.
- **Fix:** Die `--twinkle-dur`-Umschaltung entfällt. Die Twinkle-Dauer bleibt **konstant** (`6s`). Die Score-5-„heller/lebendiger"-Wirkung kommt weiterhin **sanft** über den bereits vorhandenen `filter: brightness()` + Opacity-Transition der Sterne-Gruppe (der jetzt mit ~1200 ms fadet). Ergebnis: das Sternenfeld funkelt ununterbrochen weiter; zwischen den Moods faden nur Helligkeit und Schleier ineinander, der Loop läuft nie neu an.
- Prüfen, dass keine weitere Score-Änderung eine `animation-*`-Property auf den Twinkle-Spans anfasst (nur Opacity/Filter am Container sind erlaubt).

---

## Nicht-Ziele (YAGNI)

- Keine Änderung an der Wants-`SkyBackdrop`-Nutzung (rendert ohne Score, bleibt neutral — Nebel bleibt dort bei Opacity 0).
- Keine neuen Mood-Stufen, keine Änderung an `MOOD_LABELS`/`MOOD_FACES`/Nachrichten.
- Kein Umbau des Mood-Score-Contexts oder der Server-Action.
- Keine JS-getriebene Animation, wo CSS reicht.

## Verifikation

- `npx tsc --noEmit` und `npm run build` grün.
- Kontrast-Gate (`scripts/check-contrast.mjs`) unverändert grün (Text liegt über dem Backdrop-Stack, wird von Nebel/Schleier nicht berührt).
- Finales visuelles Gate: iPhone am Live-Deploy (Stefans Standard-Gate) — Header-Größen, Wolken-Flug, Nebel-Stimmung, durchgehendes Funkeln, reduced-motion.
