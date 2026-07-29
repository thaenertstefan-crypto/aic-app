# AIC-App — Status

_Gepflegt von `/feierabend`. Am Session-Start lesen, um sich zu orientieren._
_Chronik gehört hier **nicht** rein — die steht in `git log` und in den Obsidian Daily Notes._

_Letzter Stand: 2026-07-29 (`8499b91`)_

## Wo das Projekt steht

Die komplette baubare Roadmap ist durch. Alle Flächen (`/dashboard`, `/booster`, `/me/values`,
`/me/wants`, `/me/wants/schmiede`, `/me/bill-of-rights`, `/onboarding`, Auth) sind in der
Nachthimmel-Bildwelt umgesetzt und auf `main` gepusht. `tsc`, `npm run gate` (Kontrast · Typo ·
Motion · eslint `--max-warnings=0`) und `npm run build` sind grün — ein roter Lauf ist eine echte
Regression.

**Der einzige große Block ist der iPhone-Abnahme-Stau.** Er hat sich über ~10 Runden aufgebaut,
weil alle Runden nur statisch verifiziert wurden. Bevor eine neue Fläche aufgemacht wird: abarbeiten.

## Jetzt dran

1. **iPhone-Stau abarbeiten** (Tabelle unten), in Bündeln pro Reise, ein Durchgang je Fläche.
   Vorrang hat die Nacht vom 28./29.07.: Onboarding, Wants/Schmiede, Auth/Signup, Booster.
2. **Onboarding braucht einen FRISCHEN Account** — es zeigt sich pro Nutzer genau einmal und war
   für den Browser-Check strukturell unerreichbar. Nicht mit dem Stamm-Account starten.
3. **Plan 2 Task 4 (Zoom-Umbau) als beaufsichtigte Session ansetzen.** Task 3 ist die Voraussetzung
   und ist erledigt, der Plan trägt den vollständigen Code. Kompletter Rewrite von
   `booster-zoom.tsx` plus CSS, `booster-cells.tsx`, `booster-arrive.tsx`, `module-icon.tsx`,
   `navigation-spinner.tsx` und eine **breaking** Änderung an `arrive()` (nimmt ein Argument).
   Abnahme ist zu 100 % iPhone — Playwright kann von einem Klon, der über einen echten
   Routenwechsel fliegt, prinzipiell nichts sehen.
4. **E2E-Account: `intro_seen` für `values` und `bill-of-rights` setzen.** Der erste scharfe
   E2E-Lauf hat gefunden, dass beide Routen dem Test-Account die Intro-Sequenz zeigen — sie galten
   als grün, sagten über Layout aber nichts. Fix wie damals bei `/me/wants`. Ist ein Schreibzugriff
   auf die Prod-DB, deshalb nicht ungefragt gemacht. **Nur** `thaenert.stefan+e2e@…`.
5. **`ffmpeg`** — steht seit der Reibungs-Runde als offener Punkt drin, ohne Kontext im Status.
   Kontext steht in der Daily Note vom 29.07.; beim nächsten Aufgreifen hier ausformulieren
   oder streichen.

## iPhone-Abnahme-Stau

| Fläche | Commit | Worauf achten |
|---|---|---|
| Onboarding (Plan 1) | `d75b947` | **Frischer Account.** intro1–8 durchklicken: kein übrig gebliebenes `*` im Text; Kompass mit 4 Emojis; Stern blitzt unregelmäßig (Sternenkarte auf `/me/wants` darf sich NICHT verändert haben); Siegel stempelt in EINEM Zug. **Der große Punkt:** „Ich bin bereit" → bleibt der Himmel beim Übergang zum Dashboard wirklich stehen (kein Weiß-Blitz, kein Neuaufbau)? Zusätzlich: Server-Fehler beim Abschluss (Flugmodus) muss die Karte auch beim ZWEITEN identischen Fehler zurückbringen. |
| Wants + Schmiede | `4ba551b`, `8499b91` | Phantom-Zeile: unterer Rand muss dem oberen entsprechen, „Lust auf Neues?" rutscht dadurch tiefer — beides in EINEM Blick. Einleitetext bricht sauber; Funken-Labels laufen nicht über den Rand. Sekundär-CTA sitzt rechnerisch ~36 px unter der optischen Mitte (app-weites Muster, kein Fehler dieser Runde). |
| Auth / Signup | `ed1165c` | `/login` ohne Brand-Zeile — sitzt das Logo zu dicht an der Karte? (dann `pb-2` an den Kopf-`div` in `auth-reveal.tsx`, **nicht** das `py-8`). `/signup`: Kante am oberen Rand weg? Aufwischen — Maskottchen gleitet nach **rechts** raus, springt nicht, endet mit dem Hero gleichzeitig (1000 ms), nie zwei Maskottchen. Reduced motion: Gate entfällt, nichts fehlt. |
| Booster-Intros | `ed1165c` | Die vier Maskottchen sind per Screenshot bestätigt — **bewegen sie sich auch?** Sie koppeln über global definierte `@keyframes` per inline-`style` (statisch geprüft, nicht gesehen). Mit Reduce Motion gegenprüfen: entscheiden sie in JS (`useReducedMotion`). |
| Booster-Modul-Icon | `b395ca7` | Icon nur auf Schritt 1 der Wizards, nie gestapelt mit dem Begleiter-Maskottchen; `SubPageHeader` unverändert; keine Intro-Sequenz mit Icon. |
| Kopfwetter-Hub | `f06499b` | Isobaren/Front deutlich sichtbar (keine Geisterlinien); alle 5 Ich-Sätze voll lesbar, auch der 6-Zeiler; ganze Zeile = Tap-Ziel, Gold-Fokusring; Lilac-Kern-Glow erkennbar, Reveal ruhig. Danach **Re-Critique** `/impeccable critique app/(app)/booster` (Baseline 27/40). |
| `/me/bill-of-rights` | `0a5f947` | Siegel als Kopf ohne Überlappung, kein zweites am Fuß; Intro groß + weiß; die drei Sternbilder dezent (nicht zu hell) — Position/Dichte sind Startwerte, je Stern in `constellations.tsx` nachziehbar; zwei Buttons einzeilig, „Recht generieren" als einzige Gold-Kerze. |
| Sternschmiede | `881a564` | Warp dezent-kühl (~0,75 s, keine goldene Blitz), reduced-motion = harter Schnitt; die vier Phasen; Funken-Fokus-Ebene ploppt nicht, Escape/Fokus-Rückgabe/zweistufiges Verwerfen; Header-Zurück fliegt den echten Warp. |
| Sternensuche | `1048c48` | Header klebt und verdeckt nichts; Sterne-Liste klappt weich, Chevron synchron; Hintergrund-Sterne bleiben ruhig; Completion ohne Lücke oben. **Rest-Risiko:** die `grid-template-rows`-Transition kann auf älterem iOS-Safari ruckeln — bei fühlbarem Jank auf ein Collapse-Primitive (Radix Collapsible / gemessene Höhe) ausweichen. |
| `/me/wants` (Kamera-Push) | `f2e3775`, `70df381` | Reinflug liest als Kamera-Flug ZUM Stern, Himmel hell genug, Rückflug kehrt sauber um; nah/fern-Toggle → Speichern → Stern in neuer Tiefe; kein `lvh`-Body-Streifen; Reflect kurz + Feier-Screen. Zu schwacher Dive: Karten-Scale `2.6` hoch. Verteilung: `baseX`/`ROW_H` einen Tick. **Ansonsten design-abgeschlossen (35/40).** |
| `/me/values/journey/journal` | `d1dac57` | 7/7-Glühen landet als Peak; Ermunterung in Fraunces Italic; gespeicherter Eintrag liest als Prosa statt Grau-Kasten. Danach Re-Critique (31/40). |
| `/me/values/journey` | `466ca49`, `b3846a1` | „Ersetzen" neutral statt rot, „Weitere Werte" eingeklappt, Zyklus-Glühen als Peak, Erst-Besuch-Cue bei `currentStep 0`; ein „geschafft"-Hinweis nur im Header, kein „Schritt 2 von 3"; Kamera landet auf dem aktuellen Stern. Danach Re-Critique (31/40). |
| `/me/values` | `678c411` | Rose benennt ihre Auswahl, kein Legende-Loch, Detailkarte bündig bei kurzen **und** langen Werten, Hinweiszeile als ruhige Caption. Danach Re-Critique (29/40). |
| Motion-Fixes | `8018627` | Login-Reveal (Karte zoomt, Hero wischt), Mood-Chip skaliert, Booster-Kachel drückt sich — jeweils animiert statt Sprung. |
| Dashboard | `da42688` | Wetter-Block ist **verifiziert** („perfekt"). Offen nur der Re-Audit: `/impeccable audit das dashboard` erneut, um A11y/Theming-Anstieg zu bestätigen. |

## Offene Entscheidungen (Stefan)

- **Zünd-Sterne beim Onboarding-Abschluss.** Die sechs Extra-Lichter gehören der Onboarding-Route
  und blinken beim Routenwechsel weg; der Grund-Nachthimmel bleibt. Sie mitzunehmen hieße, sie in
  eine geteilte Layout-Ebene zu heben (wie beim Wants→Schmiede-Warp) — eine Architektur-Entscheidung,
  die der Plan nicht vorsah. Bewusst nur die Timing-Hälfte gefixt. **Stört es?**
- **`SkyBackdrop` hinter der gegateten Signup-Karte fehlt** — nach dem Aufwischen endet `/signup`
  auf flachem `bg-background`. Vorschlag: `<SkyBackdrop />` als erstes Kind des gegateten Roots
  (Hero-Panel ist opak, der zweite Himmel bliebe bis zur Bewegung verdeckt). Braucht einen
  Geräte-Check auf Schimmern während der ~1 s Überlappung. Letzter der zwei Plandefekte.
- **Journey-Produktfragen:** die 5 getesteten Werte während der Reflexionswoche im Journal als
  Anker zeigen; und ob die „exakt 5 Werte"-Pflicht in der Hypothese so bleibt (aktuell hart gegatet).

_Bereits entschieden und gebaut (nicht neu aufmachen): Wants = **Gold**, Schmiede-Subpage = **Rosé**;
Abschluss-Screens bleiben **Gold**, Semantik trägt das Sage+Rose-Icon; Seitentitel folgen der
Single-Title-Rule; Emoji auf der Kompass-Rose bleiben._

## Bekannte Rest-Defekte

- **Sternenkarten-Metriken, zwei Punkte offen** (`4ba551b`): (a) `MASCOT_BOX` wird immer
  eingerechnet, das Maskottchen sitzt aber nur unten **links** — bei gerader Sternzahl endet die
  Leiter rechts und der Zuschlag ist unnötig (unterer Rand liest ~103 statt 40 Einheiten);
  (b) `EDGE_PAD = 40` steht doppelt in zwei Dateien, zusammengehalten nur von einem Kommentar. Ein
  geteiltes `sky-metrics.ts` wäre der ehrliche Weg.
- **Aus dem Nacht-Slot-1-Review, vorbestehend:** das Hero-Panel
  ist bei `revealed` nicht `inert`, der unsichtbare Wisch-Button bleibt fokussierbar
  (`inert={revealed || undefined}`); `saying-no` hat 5 Intro-Karten, aber nur 4
  Maskottchen-Varianten (Karten 4 und 5 teilen sich einen Begleiter).
- **Wants Track F, beim nächsten Anfassen mitnehmen:** generische „Speichern fehlgeschlagen"-Strings
  (`/impeccable clarify`), harter Karten-Remount bei Add/Delete statt Per-Stern Enter/Exit
  (`/impeccable animate`), Vibe-Pillen im Reflect nicht als „(optional)" markiert, Fokus-Edit-Save
  ohne Erfolgssignal, und die hand-gerollte Fokus-Ebene auf das echte `Dialog`-Primitive ziehen
  (`/impeccable extract`).
- **Deferred Minors (bewusst offen, Risiko ~0):** hartkodiertes `#0f0c1a` in `pressure-field.tsx`;
  kein GSAP-Tween-Teardown beim Fokus-Unmount (durch `key={wants.length}`-Remount harmlos);
  „Ferner Stern"/„Erloschen"-Badge-Farbpaar nicht vom Kontrast-Gate abgedeckt; stale
  Stern-/Konstellations-Begriffe in `values-journey-client`-Bezeichnern; Dashboard-Audit-P3
  (dauerhafte `drop-shadow`-Loops im Gewitter-Wetter — nur bei fühlbarem Jank via
  `/impeccable optimize`).

## Merkregeln aus schmerzhaften Runden

- **Neue Bühnen brauchen einen `data-e2e`-Marker**, sonst wächst die `·`-Smoke-Test-Zone
  stillschweigend wieder zu.
- **Sternenkarte/Funken-Himmel:** bis 3 Sterne bzw. 2 Funken dominiert `MIN_VIEW_H` — Änderungen an
  der Höhenformel sind darunter komplett unsichtbar. Steht auch im Code.
- **Restores von Komponenten, die per inline-`style` animieren: Keyframe-Namen prüfen, nicht
  Klassennamen.** Ein grep auf CSS-Klassen zielt auf die falsche Kopplung und kann nicht fehlschlagen.
- **Künftige Portal-Overlays auf `useDialogFocus`** setzen statt Focus/Scroll neu zu rollen.

## Links
- Vault project note: `Stefan's Vault/02 Projekte/AIC-App.md`
- Product & design context: `PRODUCT.md`, `DESIGN.md`
