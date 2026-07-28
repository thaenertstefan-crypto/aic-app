# Feinjustierung 4 — Wants + Sternschmiede Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sternenkarte und Funken-Konstellation bekommen gleiche Ränder oben und unten, dieselbe Spalten-Streuung und ruhigere Funken — und der jeweilige Sekundär-CTA sitzt mittig zwischen der Button-Reihe und der Bottom-Nav statt am Stapel zu kleben.

**Architecture:** Die beiden Seiten sind Schwestern mit derselben Konstanten-Struktur (`VIEW_W` / `ROW_H` / `TOP_PAD` / `BOTTOM_PAD`) und demselben Layout-Problem am Seitenende. Die Ränder werden aus **einem** Abstandswert abgeleitet statt handgesetzt; der CTA-Block bekommt in beiden Dateien dieselbe `flex-1`-Spacer-Behandlung. Die Schmiede übernimmt zusätzlich die bereits im Code begründeten Spalten-Werte der Sternenkarte.

**Tech Stack:** Next.js 16 App Router, React 19, TailwindCSS v4, GSAP (in `star-map.tsx`).

Quelle: [`docs/superpowers/specs/2026-07-28-feinjustierung-runde-design.md`](../specs/2026-07-28-feinjustierung-runde-design.md), Pakete 5 und 6.

## Global Constraints

- **Alle user-facing Texte sind Deutsch**, warm/ermutigend, informelles „du".
- **Deutsche Anführungszeichen sind echte Unicode-Zeichen:** U+201E (`„`) öffnend, U+201C (`"`) schließend. Nie ASCII `"`.
- **Mobile-first, Ziel-Viewport ~375 px.** Bei 375 px Viewport ist der Karten-Container nach `px-4` ca. 343 px breit; die viewBox ist 360 Einheiten breit. 1 viewBox-Einheit ≈ 0,95 px. Wo px-Größen (Maskottchen) in viewBox-Einheiten umgerechnet werden, ist dieser Faktor zu berücksichtigen.
- **Tailwind v4-Footgun:** `translate-*` / `scale-*` / `rotate-*` kompilieren zu eigenständigen CSS-Properties, nicht zu `transform`. In `transition-[…]` namentlich nennen. `scripts/check-transitions.mjs` flaggt die falsche Kombination.
- **Es gibt kein Test-Framework im Repo.** Harte Gates: `npx tsc --noEmit`, `npm run gate`, `npm run build`. Jede Task endet damit.
- **`npm run lint` ist auf `main` vorbestehend ROT** — drei der Fehler stecken genau in `funken-sky.tsx`, `evaluation-form.tsx` und `wants-journey.tsx`. Beim Anfassen von `funken-sky.tsx` also nicht wundern: das ist Bestand, nicht die eigene Änderung. eslint hängt nicht im Gate.
- **Der eigentliche Abnahme-Test ist der iPhone-Check am Live-Deploy.** Abstände sind auf dem Desktop nicht beurteilbar. Nach jeder Task committen und nach `main` pushen.
- **PowerShell 5.1-Fallen:** Pfade mit `(app)` immer quoten (`git add "app/(app)/…"`); in mehrzeiligen Commit-Messages keine inneren `"` verwenden.

---

### Task 1: Sternenkarte — Abstände oben und unten angleichen

[`star-map.tsx`](<../../../app/(app)/me/wants/star-map.tsx>) hat zwei handgesetzte Konstanten: `TOP_PAD = 60`, `BOTTOM_PAD = 130`. Das ergibt heute etwa:

| Abstand | heute |
|---|---|
| Einleitetext → erster Stern | ~77 px |
| letzter Stern → Maskottchen | ~128 px |

Neu: **ein** gemeinsamer Abstandswert steuert beide Ränder. `TOP_PAD` und `BOTTOM_PAD` werden daraus abgeleitet — `BOTTOM_PAD` zusätzlich um die Maskottchen-Box erhöht, damit der Abstand *bis zum Maskottchen* und nicht bis zum Container-Rand gilt. Der Slot-Jitter in y (Amplitude 36, also ±18 viewBox-Einheiten) darf den Zielabstand nicht auffressen — er wird als Reserve mitgerechnet. Das `pb-2` am Einleitetext-Block entfällt, damit die 24 px Container-`gap-6` der einzige Beitrag von oben bleiben.

**Files:**
- Modify: `app/(app)/me/wants/star-map.tsx:31-34` (Konstanten)
- Modify: `app/(app)/me/wants/wants-me.tsx:201` (`pb-2` am Einleitetext-Block)

**Interfaces:**
- Consumes: nichts.
- Produces: `EDGE_PAD` / `Y_JITTER_RESERVE` / `MASCOT_BOX` als modul-lokale Konstanten in `star-map.tsx`. Task 4 spiegelt dieselbe Struktur in `funken-sky.tsx` (dort ohne `MASCOT_BOX`).

- [ ] **Step 1: Ränder aus einem Wert ableiten**

In `app/(app)/me/wants/star-map.tsx` den Konstanten-Block ersetzen:

```ts
const VIEW_W = 360;
const ROW_H = 80;

/** Ziel-Abstand (viewBox-Einheiten) an BEIDEN Rändern der Karte: oben bis zum
 *  ersten Stern, unten bis zum Maskottchen. Ein Wert steuert beide Seiten. */
const EDGE_PAD = 40;
/** Halbe y-Jitter-Amplitude (Slot-Versatz ±18, s. layoutStars) — als Reserve
 *  mitgerechnet, damit ein nach außen gewürfelter Stern den Zielabstand nicht
 *  auffrisst. */
const Y_JITTER_RESERVE = 18;
/** Maskottchen unten links: size-14 (56 px) + bottom-1 (4 px) = 60 px. Bei
 *  ~375 px Viewport ist die Karte ca. 343 px breit bei 360 viewBox-Einheiten
 *  → 60 px ≈ 63 Einheiten. */
const MASCOT_BOX = 63;

const TOP_PAD = EDGE_PAD + Y_JITTER_RESERVE;
const BOTTOM_PAD = EDGE_PAD + Y_JITTER_RESERVE + MASCOT_BOX;
```

`TOP_PAD` wird damit 58 (vorher 60), `BOTTOM_PAD` 121 (vorher 130). Beide bleiben in `layoutStars` unverändert in Gebrauch — es ändert sich nur, woher die Zahlen kommen.

- [ ] **Step 2: `pb-2` am Einleitetext entfernen**

In `app/(app)/me/wants/wants-me.tsx`, im `hasSterne`-Zweig:

```tsx
                  <Reveal delay={0}>
                    <div className="flex flex-col items-center gap-3 text-center">
                      <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                        {PAGE_TITLES.meWantsHero}
                      </h2>
                      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                        Meine Freudenquellen und Ziele, nach denen ich greife.
                      </p>
                    </div>
                  </Reveal>
```

Damit bleibt der `gap-6` des Containers (24 px) der einzige Beitrag von oben; die restlichen ~40 Einheiten kommen aus `TOP_PAD`.

(Der Absatz bekommt in Task 3 zusätzlich `text-base max-w-sm` — hier zunächst nur `pb-2` entfernen, damit die beiden Effekte am Gerät getrennt beurteilbar bleiben.)

- [ ] **Step 3: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler.

- [ ] **Step 4: Am Gerät prüfen und committen**

`/me/wants` mit mindestens vier Sternen öffnen: Der Abstand vom Einleitetext zum ersten Stern und der vom letzten Stern zum Maskottchen wirken gleich. Kein Stern-Label wird oben oder unten angeschnitten.

```bash
git add "app/(app)/me/wants/star-map.tsx" "app/(app)/me/wants/wants-me.tsx"
git commit -m "fix(wants): Raender der Sternenkarte aus einem Abstandswert abgeleitet

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 2: „Lust auf Neues?" mittig setzen

Der Ghost-Button sitzt heute als dritter Block im selben `gap-3`-Stapel wie die Button-Reihe. Er löst sich davon und sitzt vertikal mittig zwischen der Button-Reihe und der Bottom-Nav:

```
[ Sternensuche ]  [ Eigener Stern ]

          ↕ gleicher Abstand
     Lust auf Neues? Zur Sternschmiede
          ↕ gleicher Abstand

========= Bottom-Nav =========
```

Im Leer-Zustand (keine Sterne) bleibt der Link wie bisher direkt unter „Sternensuche starten" — dort ist der Screen ohnehin zentriert.

**Files:**
- Modify: `app/(app)/me/wants/wants-me.tsx:220-237`

**Interfaces:**
- Consumes: `forgeLink()` (bestehende lokale Funktion, unverändert).
- Produces: nichts. Task 5 wendet dasselbe Muster auf die Schmiede an.

- [ ] **Step 1: CTA aus dem Stapel ziehen**

In `app/(app)/me/wants/wants-me.tsx` den Block im `hasSterne`-Zweig (heute `<div className="flex flex-col gap-3">` mit Button-Reihe **und** `forgeLink()`) ersetzen durch:

```tsx
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 gap-2"
                      render={<Link href="/me/wants/journey" />}
                    >
                      <Binoculars className="size-4" /> Sternensuche
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => setAddOpen(true)}
                    >
                      <Plus className="size-4" /> Eigener Stern
                    </Button>
                  </div>

                  {/* „Lust auf Neues?" sitzt mittig zwischen der Button-Reihe und
                      der Bottom-Nav — der flex-1-Spacer absorbiert den Rest der
                      Seitenhöhe (Karte und Buttons haben feste Höhen), pt-2 hält
                      einen Mindestabstand nach oben, damit der Link bei vielen
                      Sternen nicht an der Button-Reihe klebt. */}
                  <div className="flex flex-1 flex-col justify-center pt-2">
                    {forgeLink()}
                  </div>
```

Der Container darüber (`relative z-10 flex flex-1 flex-col gap-6 px-4 py-6`) ist bereits eine Flex-Spalte mit `flex-1` — der neue Spacer ist damit das einzige wachsende Kind und zentriert den Link im verbliebenen Raum. Der Leer-Zustand-Zweig bleibt unangetastet.

- [ ] **Step 2: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler.

- [ ] **Step 3: Am Gerät prüfen und committen**

`/me/wants` mit **wenigen** Sternen (1–2, viel Restraum) und mit **vielen** Sternen (Seite scrollt):

- Wenige Sterne: „Lust auf Neues? Zur Sternschmiede" sitzt mittig zwischen der Button-Reihe und der Bottom-Nav.
- Viele Sterne: Der Link klebt nicht an der Button-Reihe (Mindestabstand greift) und rutscht nicht unter die Bottom-Nav.
- Leer-Zustand (`/me/wants` ohne Sterne): unverändert direkt unter „Sternensuche starten".

```bash
git add "app/(app)/me/wants/wants-me.tsx"
git commit -m "fix(wants): Schmiede-Link mittig zwischen Button-Reihe und Bottom-Nav

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 3: Wants-Einleitetext auf Schmiede-Größe

| | Überschrift | Einleitetext |
|---|---|---|
| Wants | `text-2xl font-bold` | `text-sm max-w-xs` |
| Schmiede | `text-2xl font-bold` | `text-base` |

Die Überschriften sind bereits einheitlich. Der Einleitetext auf Wants zieht auf `text-base` nach und bekommt mehr Zeilenbreite, damit `text-base` nicht in Vierwort-Zeilen bricht.

**Files:**
- Modify: `app/(app)/me/wants/wants-me.tsx:205-207`

**Interfaces:**
- Consumes: nichts.
- Produces: nichts.

- [ ] **Step 1: Textgröße und Zeilenbreite angleichen**

```tsx
                      <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
                        Meine Freudenquellen und Ziele, nach denen ich greife.
                      </p>
```

- [ ] **Step 2: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler.

- [ ] **Step 3: Am Gerät prüfen und committen**

`/me/wants` und `/me/wants/schmiede` direkt nacheinander öffnen: Überschrift und Einleitetext haben auf beiden Seiten dieselbe Größe. Der Wants-Satz bricht nicht in Vierwort-Zeilen.

```bash
git add "app/(app)/me/wants/wants-me.tsx"
git commit -m "style(wants): Einleitetext auf Schmiede-Groesse (text-base, max-w-sm)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 4: Funken driften weniger, streuen breiter, gleiche Ränder

**Drift:** `funke-drift` bewegt heute ±6 px vertikal ([`globals.css:977`](../../../app/globals.css)). Halbiert auf ±3 px, Periode bleibt bei 6 s.

**Streuung:** [`funken-sky.tsx:50`](../../../components/wants/funken-sky.tsx) setzt die Spaltenzentren auf 92 / 268 mit ±26 Jitter. Die Sternenkarte nutzt bereits **78 / 282 mit ±28** und hat das im Code begründet („Spalten-Zentren etwas weiter nach außen, damit sich die Sterne nicht in der Bildmitte sammeln"). Die Schmiede übernimmt genau diese Werte. Zwei Fliegen: die Konstellation wird breiter, **und** die Schwesterseiten sprechen dieselbe Sprache. Label-Overflow ist geprüft — bei `max-w-[8rem]` (≈134 viewBox-Einheiten) bleiben beide Spalten innerhalb der 360er-Breite.

**Ränder:** `FunkenSky` hat dieselbe Konstanten-Struktur wie die Sternenkarte (`TOP_PAD = 42`, `BOTTOM_PAD = 48`) und wird nach demselben abgeleiteten Abstandswert umgestellt — allerdings **ohne Maskottchen-Zuschlag**, weil unter der Konstellation direkt die „Eigener Funke"-Zeile folgt.

**Files:**
- Modify: `app/globals.css:977-983` (`funke-drift`)
- Modify: `components/wants/funken-sky.tsx:25-28` (Konstanten), `:48-57` (`layout`)

**Interfaces:**
- Consumes: die Konstanten-Struktur aus Task 1 als Vorlage (`EDGE_PAD` / `Y_JITTER_RESERVE`), hier modul-lokal neu definiert.
- Produces: nichts.

- [ ] **Step 1: Drift halbieren**

In `app/globals.css`:

```css
/* Schwebende Funken der Konstellation (FunkenSky): leises Auf-und-Ab-Glimmen.
   Halber Ausschlag (±3 px statt ±6) — die Konstellation soll atmen, nicht
   wandern. Periode bleibt bei 6 s. */
@keyframes funke-drift {
  0%, 100% { transform: translateY(-3px); opacity: 0.82; }
  50%      { transform: translateY(3px);  opacity: 1;    }
}
.funke-drift {
  animation: funke-drift 6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .funke-drift { animation: none; }
}
```

- [ ] **Step 2: Ränder ableiten**

In `components/wants/funken-sky.tsx` den Konstanten-Block ersetzen:

```ts
const VIEW_W = 360;
const ROW_H = 76;

/** Ziel-Abstand (viewBox-Einheiten) an beiden Rändern — derselbe Wert wie auf
 *  der Sternenkarte ([star-map.tsx](../../app/(app)/me/wants/star-map.tsx)).
 *  Ohne Maskottchen-Zuschlag: unter der Konstellation folgt direkt die
 *  „Eigener Funke"-Zeile. */
const EDGE_PAD = 40;
/** Halbe y-Jitter-Amplitude (Slot-Versatz ±15, s. layout) als Reserve. */
const Y_JITTER_RESERVE = 15;

const TOP_PAD = EDGE_PAD + Y_JITTER_RESERVE;
const BOTTOM_PAD = EDGE_PAD + Y_JITTER_RESERVE;
```

`TOP_PAD` und `BOTTOM_PAD` werden damit beide 55 (vorher 42 / 48).

- [ ] **Step 3: Spalten-Werte der Sternenkarte übernehmen**

Die `layout`-Funktion:

```ts
/** Slot-Leiter: links/rechts versetzt von oben nach unten; ID-Hash gibt jedem
 *  Funken einen stabilen Versatz im Slot. */
function layout(funken: BetItem[]): { placed: Placed[]; viewH: number } {
  const placed = funken.map((bet, i) => {
    const side: "left" | "right" = i % 2 === 0 ? "left" : "right";
    // Spalten-Zentren wie auf der Sternenkarte (78 / 282 statt 92 / 268), damit
    // sich die Funken nicht in der Bildmitte sammeln — und damit die beiden
    // Schwesterseiten dieselbe Sprache sprechen. Labels zeigen nach innen und
    // bleiben bei max-w-[8rem] (≈134 Einheiten) innerhalb der 360er-Breite.
    const baseX = side === "left" ? 78 : 282;
    return {
      bet,
      x: baseX + (hash01(bet.id) - 0.5) * 56,
      y: TOP_PAD + i * ROW_H + (hash01(`${bet.id}y`) - 0.5) * 30,
      side,
    };
  });
  const viewH = Math.max(200, TOP_PAD + funken.length * ROW_H + BOTTOM_PAD);
  return { placed, viewH };
}
```

Der x-Jitter geht von `* 52` auf `* 56` (±28 statt ±26); der y-Jitter bleibt bei `* 30` (±15) und passt damit zu `Y_JITTER_RESERVE`.

- [ ] **Step 4: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler. `npm run lint` ist in dieser Datei vorbestehend rot — nicht als Regression werten.

- [ ] **Step 5: Am Gerät prüfen und committen**

`/me/wants/schmiede` mit mehreren offenen Funken:

- Die Funken schweben ruhiger (halber Ausschlag), die Konstellation wirkt breiter verteilt.
- Kein Label läuft über den linken oder rechten Kartenrand.
- Der Abstand von der Überschrift zum ersten Funken und vom letzten Funken zur „Eigener Funke"-Zeile wirkt gleich.

```bash
git add app/globals.css components/wants/funken-sky.tsx
git commit -m "fix(schmiede): Funken driften weniger, streuen wie die Sternenkarte

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 5: Schmiede-CTA mittig, harter Spacer raus

Der CTA-Block am Seitenende bekommt dieselbe Behandlung wie Wants in Task 2: „Zurück zu meinen Sternen" mittig zwischen der Gold-CTA und der Bottom-Nav. Der harte `<div className="h-8" />`-Spacer am Ende der Landing entfällt.

**Files:**
- Modify: `app/(app)/me/wants/schmiede/sternschmiede.tsx:653-669` (Landing-Zweig, Fallthrough-Return)

**Interfaces:**
- Consumes: `goBackToStars()` und `warpBusy` (bestehend, unverändert).
- Produces: nichts.

- [ ] **Step 1: CTA-Block umbauen und Spacer entfernen**

In `app/(app)/me/wants/schmiede/sternschmiede.tsx`, am Ende des Landing-Returns (nach den beiden `<FormError …/>`), den Block ersetzen:

```tsx
          {/* Die eine Gold-CTA. Erstbesuch ohne Funken: schlicht „Funken schlagen". */}
          <Button className="w-full gap-2" size="lg" onClick={() => setPhase("briefing")}>
            <Flame className="size-4" />
            {firstVisit ? "Funken schlagen" : "Neue Funken schlagen"}
          </Button>

          {/* Zurück in den Sternenhimmel — derselbe Warp, nur rückwärts (Aufstieg).
              Gedämpft (ghost), damit „Funken schlagen" die eine Gold-CTA bleibt.
              Sitzt mittig zwischen der Gold-CTA und der Bottom-Nav: der
              flex-1-Spacer absorbiert den Rest der Seitenhöhe, pt-2 hält einen
              Mindestabstand nach oben. Ersetzt den früheren harten h-8-Spacer. */}
          <div className="flex flex-1 flex-col justify-center pt-2">
            <Button
              variant="ghost"
              className="w-full gap-2 text-muted-foreground"
              disabled={warpBusy}
              onClick={goBackToStars}
            >
              <ArrowUp className="size-4" /> Zurück zu meinen Sternen
            </Button>
          </div>
```

Der abschließende `<div className="h-8" />` dieses Zweigs entfällt.

**Nur dieser eine Spacer.** Die `<div className="h-8" />` in den Phasen `briefing` (~Zeile 309) und `funken` (~Zeile 490) bleiben stehen — sie gehören zu anderen Screens und sind nicht Teil dieser Runde.

- [ ] **Step 2: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler.

Gegenprüfen: `grep -n 'className="h-8"' "app/(app)/me/wants/schmiede/sternschmiede.tsx"`
Expected: genau zwei verbliebene Treffer (briefing und funken).

- [ ] **Step 3: Am Gerät prüfen und committen**

`/me/wants/schmiede` ohne Funken (Erstbesuch, viel Restraum) und mit mehreren Funken (Seite scrollt):

- „Zurück zu meinen Sternen" sitzt mittig zwischen der Gold-CTA und der Bottom-Nav.
- Bei vielen Funken klebt er nicht an der Gold-CTA und rutscht nicht unter die Nav.
- **Sind die Abstände oben und unten auf Wants und Schmiede wirklich gleich?** Beide Seiten direkt nacheinander vergleichen.
- Der Warp zurück auf `/me/wants` funktioniert unverändert.

```bash
git add "app/(app)/me/wants/schmiede/sternschmiede.tsx"
git commit -m "fix(schmiede): Zurueck-CTA mittig, harter h-8-Spacer der Landing raus

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```
