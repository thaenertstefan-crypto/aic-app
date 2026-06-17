# Phase 7: Design Elevation — „Dusk Membership"

> Ziel: von „funktioniert und sieht ordentlich aus" zu einer eigenständigen, atmosphärischen Optik, die einen Wiedererkennungswert hat und Lust macht, die App erneut zu öffnen. Fokus auf Farbe, Glasmorphismus und Bewegung — bewusst zurückhaltend-emotional, nicht verspielt/gamifiziert.
>
> Gewählte Richtung: **Dusk Membership** (tiefes Aubergine-Schwarz als Bühne, warmes Gold als „Reframe"-Akzent, gedämpftes Lavendel als „Kritiker"-Ton, Altrosa für Feier-Momente). Referenz: die interaktive Vorschau aus dem Planungs-Chat (`phase7-design-preview.html`).
>
> Gewählte Bewegungssprache: **atmosphärisch & emotional** — sanftes Driften, weiches Glühen, langsame Übergänge (GSAP, `sine`/`power2`-Easings). Explizit **keine** Konfetti- oder Gamification-Effekte.
>
> Voraussetzung: Phase 6 (Plan A + Plan B) abgeschlossen.

-----

## Wichtige Befunde aus dem Code (vor der Umsetzung gegenprüft)

Diese vier Punkte verändern, *wie* die einzelnen Schritte umgesetzt werden müssen — bewusst vorab geklärt, damit Claude Code nicht mitten im Schritt auf Überraschungen stößt:

1. **Es gibt aktuell keinen Dark-Mode-Umschalter.** `app/globals.css` definiert einen `.dark`-Block, aber nirgends im Code wird die Klasse `dark` je gesetzt (kein `next-themes`, kein Toggle, kein `matchMedia`-Listener für System-Präferenz). Die App läuft heute faktisch immer im `:root`-Theme. **Entscheidung für diese Phase:** Dusk Membership wird die *einzige* Optik — kein Light/Dark-Umschalter wird gebaut. `:root` und `.dark` bekommen identische Werte (siehe 7.1), damit nichts überraschend anders aussieht, falls die Klasse doch je gesetzt würde. Ein echter Toggle mit einer hellen Variante ist als 7.8 für später vorgemerkt, falls gewünscht.
2. **Farb-Altlasten in 20 Dateien.** Viele Stellen nutzen rohe Tailwind-Paletten-Klassen (`amber-*`, `emerald-*`, `orange-*`, `violet-*`, `gray-*`) mit manuell angeflanschten `dark:`-Varianten, statt der CSS-Variablen aus `globals.css`. Das ist faktisch ein zweites, informelles Farbsystem neben dem offiziellen Token-System. Erkannte Bedeutung dahinter: `amber` = generischer Highlight/Fortschritt-Ton, `emerald` = Erfolg/Abschluss, `orange` = Cleanser „Versprechen", `violet` = Cleanser „Confidence", `gray` = neutraler/unselektierter Zustand. Wenn die neuen Tokens in `globals.css` landen, ohne diese 20 Dateien anzufassen, sieht die App halb umgestylt aus (neue Palette + alte Amber/Gray-Fremdkörper). Deshalb ist die Bereinigung (7.2) ein **Pflichtschritt direkt nach den neuen Tokens**, kein Nice-to-have.
3. **Theme-Farbe ist an zwei weiteren Stellen hartkodiert:** `viewport.themeColor` in `app/layout.tsx` und `background_color`/`theme_color` in `app/manifest.ts` zeigen aktuell auf `#FAF2E6` (die alte Creme-Farbe). Beide steuern Browser-Chrome-Farbe und PWA-Splashscreen — müssen mit den neuen Tokens mitgezogen werden, sonst blitzt beim App-Start kurz die alte Farbe auf.
4. **Die Reframe-Komponente aus 6.13 ist bereits goldrichtig wiederverwendbar.** `components/auth/reframe-animation.tsx` (mit `DEFAULT_REFRAME_PAIRS`) und `components/auth/brand-panel.tsx` existieren schon, sind Token-basiert (nutzen `secondary`/`accent`/`background`/`primary`) und respektieren `prefers-reduced-motion` korrekt. Sie werden in 7.4 **wiederverwendet, nicht neu gebaut** — und ziehen die neue Palette in 7.1 automatisch mit, ohne dass die Auth-Seiten angefasst werden müssen.

-----

## Farbsystem: Dusk Membership (Token-Referenz)

Quelle der Wahrheit sind die Hex-Werte unten (identisch zur interaktiven Vorschau). Sie werden **direkt als Hex** in die CSS-Variablen eingetragen — funktional identisch zu `oklch()`, aber ohne Konversions-Risiko. Wer die Schreibweise später an die bestehenden `oklch()`-Werte angleichen will, kann das verlustfrei per Konverter (z. B. oklch.com) nachziehen; visuell ändert sich dadurch nichts.

| Token | Hex | Rolle |
|-------|-----|-------|
| `--background` | `#1B1726` | Bühne — tiefes Aubergine-Schwarz |
| `--foreground` | `#F3EFFA` | Text auf der Bühne — warmes Lavendel-Weiß |
| `--card` | `#221C30` | Flache, nicht-gläserne Oberflächen (etwas heller als background) |
| `--card-foreground` | `#F3EFFA` | |
| `--popover` / `--popover-foreground` | wie `--card` / `--foreground` | |
| `--primary` | `#E7B65E` | Der „Reframe"-Ton — Haupt-CTA, Fokus, Gold |
| `--primary-foreground` | `#2B1B06` | Dunkle Schrift auf Gold |
| `--secondary` | `#2A2438` | Sekundäre Oberflächen (Buttons, Badges) |
| `--secondary-foreground` | `#F3EFFA` | |
| `--muted` | `#251F32` | Dezente Flächen |
| `--muted-foreground` | `#8E84A6` | Der „Kritiker"-Ton — gedämpftes Lavendel-Grau (durchgestrichene/leise Zustände) |
| `--accent` | `#332818` | Warm getönter Hover-Zustand |
| `--accent-foreground` | `#F3EFFA` | |
| `--destructive` | `#E5484D` | Klar abgegrenzt von Rosé — Fehler bleiben Fehler, keine Verwechslung mit Feier-Momenten |
| `--border` / `--input` | `rgba(255,255,255,0.12)` / `rgba(255,255,255,0.16)` | |
| `--ring` | `#E7B65E` | Fokus-Ring in Gold |
| `--success` *(neu)* | `#6FAE8A` | Ersetzt das hartkodierte `emerald-*` — gedämpftes Salbeigrün, passt in die Familie |
| `--celebrate` *(neu)* | `#C97B84` | Streak-/Meilenstein-Glow, Cleanser „Versprechen" — **niemals** für Fehler verwenden |
| `--cleanser-confidence` *(neu)* | `#9C7FB0` | Ersetzt `violet-*` — helleres Violett aus der Aubergine-Familie |

`--cleanser-mantra` und `--cleanser-promises` brauchen keine neuen Tokens: Mantra ist konzeptionell exakt der Reframe-Gedanke (`--primary`), Versprechen-an-dich-selbst ist eine kleine, wiederkehrende Feier (`--celebrate`). Nur Confidence braucht einen dritten, eigenen Ton.

-----

## Ausführungsreihenfolge

1. **7.1** Farbsystem: Dusk Membership Tokens — *Fundament, alles andere baut darauf auf*
2. **7.2** Farb-Altlasten konsolidieren — *Pflicht direkt danach, sonst wirkt 7.1 halbfertig*
3. **7.3** Bewegungs-Fundament (GSAP, Reduced-Motion-Hook, Glas-/Ambient-Bausteine) — *Infrastruktur für alles Visuelle danach*
4. **7.4** Signature-Element systemweit (Reframe-Rotation auf Dashboard + Completion-Screens)
5. **7.5** Glasmorphismus auf Dashboard & Values-Hub
6. **7.6** Mikro-Animationen (Bottom-Nav, primärer CTA-Glow, Streak-Count-up)
7. **7.7** Completion-Momente: atmosphärische Feier statt Konfetti

> **7.8** (Tageslicht-Variante / echter Theme-Toggle) ist bewusst zurückgestellt — siehe Hinweis am Ende.

Nach jedem Schritt: `npm run dev` testen, `npm run build` + `npm run lint` laufen lassen (Refactor-Schritte wie 7.2 können Typfehler erzeugen, die `dev` nicht zeigt), committen.

-----

## Schritt 7.1: Farbsystem — Dusk Membership Tokens 🎨

```
Ersetze die Farb-Tokens in app/globals.css durch die neue "Dusk Membership"-
Palette. Dies wird die EINZIGE Optik der App — kein Light/Dark-Umschalter
existiert aktuell (nirgends im Code wird die Klasse "dark" gesetzt), deshalb
bekommen :root UND .dark identische Werte, damit die Optik unabhängig davon
stimmt, ob die Klasse je gesetzt wird.

1. In app/globals.css, sowohl im :root- als auch im .dark-Block, trage diese
   Werte ein (als Hex, nicht als oklch — funktional identisch, kein
   Konversions-Risiko):

   --background: #1B1726;
   --foreground: #F3EFFA;
   --card: #221C30;
   --card-foreground: #F3EFFA;
   --popover: #221C30;
   --popover-foreground: #F3EFFA;
   --primary: #E7B65E;
   --primary-foreground: #2B1B06;
   --secondary: #2A2438;
   --secondary-foreground: #F3EFFA;
   --muted: #251F32;
   --muted-foreground: #8E84A6;
   --accent: #332818;
   --accent-foreground: #F3EFFA;
   --destructive: #E5484D;
   --border: rgba(255,255,255,0.12);
   --input: rgba(255,255,255,0.16);
   --ring: #E7B65E;

   Für --chart-1 bis --chart-5 und --sidebar-*: an die neue Palette
   anpassen (z. B. eine Abstufung von --primary nach --muted-foreground),
   sie werden aktuell kaum genutzt, sollen aber nicht grell aus dem Rahmen
   fallen.

2. Neue Tokens ergänzen (in beiden Blöcken, gleicher Wert):
   --success: #6FAE8A;
   --success-foreground: #16241D;
   --celebrate: #C97B84;
   --cleanser-confidence: #9C7FB0;

   Binde --success, --celebrate und --cleanser-confidence im @theme-inline-
   Block oben in der Datei ein (analog zu den bestehenden Einträgen wie
   --color-primary: var(--primary);), damit sie als Tailwind-Utilities
   (bg-success, text-celebrate, border-cleanser-confidence, ...) nutzbar
   werden.

3. app/layout.tsx: viewport.themeColor von "#FAF2E6" auf "#1B1726" ändern.

4. app/manifest.ts: background_color UND theme_color von "#FAF2E6" auf
   "#1B1726" ändern. Den Kommentar über der Funktion (der noch auf die alte
   warme Creme-Farbe verweist) entsprechend aktualisieren.

Keine anderen Dateien in diesem Schritt anfassen — erst das Fundament, dann
die Verwender (7.2).
```

### Manuell — danach prüfen

1. `npm run dev` — die App läuft jetzt durchgängig in der dunklen Aubergine-Palette
2. Lesbarkeit grob prüfen: Fließtext, Buttons, Badges — nichts wirkt zu kontrastarm
3. PWA-Manifest: DevTools → Application → Manifest — `theme_color`/`background_color` zeigen `#1B1726`
4. **Bonus-Check:** Login- und Signup-Seite (aus 6.13) öffnen — `BrandPanel` und `ReframeAnimation` nutzen ausschließlich Tokens (`secondary`/`accent`/`background`/`primary`) und sollten automatisch in der neuen Palette erscheinen, ohne dass du sie anfasst
5. Die App sieht an vielen Stellen jetzt "falsch" aus (altes Amber/Gray blitzt gegen die neue Palette) — das ist erwartet und wird in 7.2 behoben

-----

## Schritt 7.2: Farb-Altlasten konsolidieren 🧹

> Pflichtschritt, kein Polish. Ersetzt die in 20 Dateien verstreuten rohen Tailwind-Paletten-Klassen durch die neuen Tokens aus 7.1.

### Teil A: Generischer Sweep (amber / emerald / gray)

```
Ersetze in folgenden Dateien alle hartkodierten Tailwind-Paletten-Klassen
durch die entsprechenden Tokens aus app/globals.css. Reine Farb-Substitution,
keine Layout-Änderungen.

Mapping:
- amber-* (text/bg/border/ring, inkl. aller dark:-Varianten) → primary
  (z. B. "text-amber-600 dark:text-amber-400" → "text-primary";
  "bg-amber-100 dark:bg-amber-900/30" → "bg-primary/15")
- emerald-* → success
  (z. B. "bg-emerald-100 dark:bg-emerald-900/30" → "bg-success/15";
  "text-emerald-600 dark:text-emerald-400" → "text-success")
- gray-* (in Chip-/Karten-Kontexten wie "bg-white border-gray-200 ...
  dark:bg-gray-800 dark:border-gray-700") → "bg-card border-border" bzw.
  bei Text "text-foreground" / "text-muted-foreground", je nach Kontext
- purple-* (in evaluation-form.tsx) → secondary (oder, falls es sich um
  einen aktiven/markierten Zustand handelt, primary — im Code-Kontext prüfen)

Betroffene Dateien (alle Treffer prüfen, nicht nur die Beispiele oben):
- app/(app)/recipes/values/evaluation/evaluation-form.tsx
- app/(app)/recipes/values/hypothesis/hypothesis-form.tsx
- app/(app)/recipes/values/journal/journal-form.tsx
- app/(app)/recipes/[slug]/page.tsx
- app/(app)/recipes/overthinking/overthinking-wizard.tsx
- app/(app)/recipes/bill-of-rights/page.tsx
- app/(app)/recipes/bill-of-rights/messy/page.tsx
- app/(app)/profile/page.tsx
- app/(app)/dashboard/page.tsx
- app/(app)/cleansers/mantra/mantra-cleanser.tsx
- components/recipes/values-step-overview.tsx
- components/recipes/recipe-intro.tsx
- components/recipes/recipe-intro-collapsible.tsx
- components/cleansers/cleanser-intro.tsx
- components/offline/draft-restore-banner.tsx
- components/offline/offline-banner.tsx

Bei jeder Stelle: die "dark:"-Variante einfach weglassen, da es nur noch ein
Theme gibt (siehe 7.1) — die Token-Klasse allein deckt jetzt beide
"Modi" ab, weil :root und .dark identisch sind.
```

### Teil B: Cleanser-Kategoriefarben

```
Stelle die drei Cleanser-Kategoriefarben in app/(app)/cleansers/page.tsx von
hartkodierten Klassen auf die neuen Tokens um:

- "mantra" (iconClass/accentClass mit amber-*) → primary
  (z. B. iconClass: "bg-primary/15 text-primary")
- "promises" (orange-*) → celebrate
  (z. B. iconClass: "bg-celebrate/15 text-celebrate")
- "confidence" (violet-*) → cleanser-confidence
  (z. B. iconClass: "bg-cleanser-confidence/15 text-cleanser-confidence")

Dieselbe Umstellung in app/(app)/cleansers/promises/promise-card.tsx und
promises-cleanser.tsx (orange-* → celebrate) sowie
app/(app)/cleansers/confidence/page.tsx (violet-* → cleanser-confidence)
vornehmen, falls dort dieselben Kategoriefarben hartkodiert wiederkehren.
```

### Manuell — danach prüfen

1. `npm run build` + `npm run lint` — Pflicht hier, da viele Dateien gleichzeitig angefasst werden
2. Jede der 16+ Dateien einmal im Browser öffnen: kein Amber/Emerald/Gray/Violet blitzt mehr durch
3. Cleanser-Übersicht (`/cleansers`): drei klar unterscheidbare, aber zur Palette passende Icon-Farben
4. Bill of Rights, Overthinking, Values-Schritte: aktive/Fortschritts-Indikatoren sind jetzt golden statt amber, Erfolgs-Zustände salbeigrün statt emerald

-----

## Schritt 7.3: Bewegungs-Fundament 🌬️

> Infrastruktur, die 7.4–7.7 wiederverwenden. Hier wird GSAP eingeführt, der `prefers-reduced-motion`-Code aus 6.13 in einen Hook ausgelagert, und die Glas-/Blob-Bausteine entstehen einmal zentral statt mehrfach pro Seite.

```
1. GSAP installieren: npm install gsap

2. Neuer Hook lib/hooks/use-reduced-motion.ts:
   - Extrahiere die matchMedia("(prefers-reduced-motion: reduce)")-Logik aus
     components/auth/reframe-animation.tsx in einen eigenen Hook
     useReducedMotion(): boolean.
   - Refaktoriere reframe-animation.tsx so, dass es diesen Hook nutzt statt
     die Logik erneut zu implementieren. Verhalten bleibt unverändert.

3. Neue CSS-Utility-Klasse in app/globals.css, @layer utilities (neben dem
   bestehenden breathe478-Keyframe):
   .glass-panel {
     background: rgba(255, 255, 255, 0.055);
     border: 1px solid rgba(255, 255, 255, 0.14);
     backdrop-filter: blur(22px);
     -webkit-backdrop-filter: blur(22px);
   }
   (Radius/Padding/Shadow bleiben Sache der jeweiligen Komponente, damit die
   Utility flexibel bleibt.)

4. Neue Komponente components/ui/ambient-blobs.tsx (Client Component):
   - Rendert 2–3 absolut positionierte, weich verlaufende, unscharfe Kreise
     (CSS: position absolute, border-radius 50%, filter: blur(...), niedrige
     opacity) in Farben aus den Tokens (var(--primary), var(--celebrate),
     var(--muted-foreground)).
   - Container: position relative/absolute inset-0, overflow-hidden,
     pointer-events-none, aria-hidden="true".
   - Mit GSAP: jeder Blob driftet sanft (gsap.to mit x/y-Offset, duration
     11–16s, repeat: -1, yoyo: true, ease: "sine.inOut") — unterschiedliche
     Dauer pro Blob für ein organisches, nicht synchrones Gefühl.
   - Nutzt useReducedMotion() aus Schritt 2: wenn reduced motion aktiv ist,
     KEINE GSAP-Animation starten, Blobs bleiben statisch stehen.
   - Props: optional className für Größe/Positionierung durch die
     aufrufende Seite.

5. Kurzer Performance-Hinweis im Code-Kommentar: backdrop-filter + mehrere
   geblurte Ebenen sind auf älteren Mobilgeräten nicht kostenlos — diese
   Bausteine sind für 1–2 "Hero"-Momente pro Bildschirm gedacht, nicht für
   jede Karte (wird in 7.5 explizit so eingesetzt).
```

### Manuell — danach prüfen

1. `npm run build` — GSAP-Import und neuer Hook bauen fehlerfrei
2. `.glass-panel` an einer beliebigen Test-Stelle kurz ausprobieren (kann danach wieder entfernt werden) — sieht aus wie in der interaktiven Vorschau
3. `<AmbientBlobs />` isoliert rendern (z. B. testweise auf einer Seite einbauen) — Blobs driften sanft, kein Ruckeln
4. In den System-Einstellungen "Bewegung reduzieren" aktivieren → Blobs stehen still, keine Fehler in der Konsole
5. `reframe-animation.tsx` funktioniert nach dem Refactor weiterhin identisch (Login/Signup-Seite testen)

-----

## Schritt 7.4: Signature-Element systemweit 🔁

> Die rotierende Kritiker→Reframe-Zeile aus 6.13 wird zum durchgängigen Wiedererkennungsmerkmal der App — nicht nur auf der Auth-Seite.

```
Baue die bestehende ReframeAnimation-Komponente (components/auth/
reframe-animation.tsx, DEFAULT_REFRAME_PAIRS) an zwei weiteren Stellen ein.
Importiere und nutze die Komponente — NICHT neu implementieren.

1. Dashboard-Greeting (app/(app)/dashboard/page.tsx):
   Unter der bestehenden Begrüßung ("Hey {name}!" + Datum) eine kompakte
   Variante der ReframeAnimation einfügen (kleinere Schriftgrößen über eine
   neue optionale className/size-Prop steuerbar, falls die Standardgröße zu
   dominant wirkt). Rotationsintervall ruhig etwas länger lassen als auf der
   Auth-Seite (z. B. 4500ms statt 3500ms), damit es nicht hektisch wirkt
   neben dem Tagesgeschäft.

2. Completion-Screens (app/(app)/recipes/overthinking/overthinking-wizard.tsx
   und app/(app)/recipes/bill-of-rights/page.tsx, jeweils der
   "Geschafft."-Block mit dem CheckCircle2-Icon):
   Unter dem bestehenden Text eine ReframeAnimation mit EINEM passenden,
   fest gewählten Paar (kein Rotieren nötig an dieser Stelle — ein einzelner
   Reframe als Schlusspunkt reicht) oder mit reduzierter Pair-Liste. Wenn dir
   ein eigener Satz "Abschluss"-Paare lieber ist statt der Auth-Paare,
   kannst du der Komponente ein eigenes pairs-Array übergeben — die Prop
   existiert bereits.

Keine Layout-Umbrüche, die Komponente wird nur ergänzt.
```

### Manuell — danach prüfen

1. Dashboard öffnen → Begrüßung + darunter die rotierende Reframe-Zeile, ruhig und nicht hektisch
2. Overthinking- und Bill-of-Rights-Flow jeweils bis zum Abschluss durchklicken → der Reframe-Satz erscheint als emotionaler Schlusspunkt
3. "Bewegung reduzieren" aktivieren → an beiden neuen Stellen steht das erste/gewählte Paar statisch, kein Rotieren

-----

## Schritt 7.5: Glasmorphismus auf Dashboard & Values-Hub 🪟

> Bewusst auf zwei Stellen begrenzt — die mit dem größten Wow-Effekt pro Aufwand. Glas überall würde die Wirkung verwässern, nicht verstärken.

```
Setze .glass-panel + <AmbientBlobs /> aus 7.3 an genau zwei Stellen ein:

1. Dashboard — RecipeCard (app/(app)/dashboard/page.tsx, Funktion
   RecipeCard): die äußere Card durch einen Container mit position relative,
   AmbientBlobs als Hintergrund-Layer und glass-panel-Klasse ersetzen (statt
   der bisherigen schlichten Card mit ring-primary/20). Inhalt (Titel,
   Progress, Button) bleibt unverändert, sitzt jetzt auf der Glas-Fläche.

2. Values-Hub-Überblick (components/recipes/values-step-overview.tsx, aus
   Schritt 6.3): der äußere Wrapper der Step-Overview-Sektion bekommt
   denselben Glas+Blobs-Behandlung wie die RecipeCard, damit der "Wo stehe
   ich gerade"-Moment sich besonders anfühlt.

WICHTIG — bewusste Beschränkung:
- MoodCheckin, "Heutiges Recht"-Card und die drei StatCards auf dem
  Dashboard bleiben auf der einfachen .bg-card-Fläche (KEIN Glas). Glas ist
  für den einen primären Moment pro Screen reserviert, sonst verliert es
  seine Wirkung.
- Teste nach dem Einbau kurz mit gedrosselter CPU (Chrome DevTools →
  Performance → CPU 4x slowdown) auf einer der beiden Stellen, ob das
  Scrollen/Rendern noch flüssig wirkt. Bei spürbarem Ruckeln den Blur-Radius
  in .glass-panel reduzieren (z. B. von 22px auf 14px).
```

### Manuell — danach prüfen

1. Dashboard: die RecipeCard hebt sich jetzt klar als "der eine wichtige Moment" ab, mit sanft driftenden Farbflächen im Hintergrund
2. `/recipes/values`: der Schritt-Überblick aus 6.3 bekommt dieselbe Behandlung, fühlt sich wie ein zusammengehöriger Moment an
3. Restliche Dashboard-Cards bleiben bewusst schlicht — kein "alles glänzt"-Effekt
4. Performance auf einem älteren/gedrosselten Profil grob geprüft

-----

## Schritt 7.6: Mikro-Animationen 🎬

```
Drei kleine, gezielte Bewegungs-Akzente, alle über useReducedMotion()
abgesichert:

1. Bottom-Nav aktiver Tab (components/layout/bottom-nav.tsx):
   Ein weicher, animierter Indikator (z. B. ein kleiner Punkt oder eine
   dünne Linie unter dem aktiven Icon), der beim Tab-Wechsel sanft zur neuen
   Position gleitet statt hart zu springen. Mit GSAP (gsap.to auf die
   x-Position des Indikator-Elements, duration ~0.4s, ease "power2.out").
   Bei reduced motion: Indikator erscheint direkt an der Zielposition, ohne
   Gleiten.

2. Primärer CTA-Glow (Dashboard RecipeCard-Button "Weitermachen"/"Jetzt
   starten"): ein dezenter, atmender Glow-Halo hinter dem Button (analog zur
   interaktiven Vorschau — ein geblurtes Element in --primary-Farbe, das
   per GSAP zwischen zwei Opacity-Werten pulst, duration ~2.2s, yoyo,
   repeat -1, ease "sine.inOut"). NUR an diesem einen Button, nicht an
   jedem Button der App.

3. Streak-Zahlen-Count-up (components/ui/stat-card.tsx): wenn der value-Prop
   sich ändert oder beim ersten Rendern, zähle die Zahl per GSAP von 0 zum
   Zielwert hoch (gsap.to auf ein Ref-Element mit textContent-Update via
   onUpdate, duration ~0.8s, ease "power1.out"). Bei reduced motion: Zahl
   erscheint direkt, kein Hochzählen.

Optionale Erweiterung (nicht Teil dieses Schritts, nur als Hinweis): GSAP
ScrollTrigger (seit 2025 Teil der kostenlosen Standard-Lizenz) würde sich für
ein sanftes Einblenden der Manifest-Liste in Bill of Rights oder der
Tagebuch-Tage in Values eignen, falls dir die Listen beim Scrollen zu
statisch wirken. Bei Bedarf als eigenen Schritt (7.9) nachreichen.
```

### Manuell — danach prüfen

1. Zwischen Bottom-Nav-Tabs wechseln → Indikator gleitet sanft, kein Sprung
2. Dashboard-CTA: dezenter, ruhiger Glow, der nicht ablenkt
3. Streak-Zahlen zählen beim Laden sanft hoch
4. "Bewegung reduzieren" aktiv → alle drei Effekte zeigen sofort den Zielzustand ohne Animation

-----

## Schritt 7.7: Completion-Momente — atmosphärische Feier statt Konfetti 🌅

> Explizit **keine** Konfetti-/Partikel-Bibliothek einbauen — passt nicht zur gewählten "atmosphärisch & emotional"-Richtung. Die Feier ist leise: Glühen, nicht Krachen.

```
Überarbeite die beiden Completion-Screens aus 7.4
(overthinking-wizard.tsx, bill-of-rights/page.tsx, jeweils der
CheckCircle2-Block) um einen ruhigen Feier-Moment:

1. Ersetze "bg-emerald-100 dark:bg-emerald-900/30" / "text-emerald-600
   dark:text-emerald-400" durch "bg-success/15" / "text-success" (falls in
   7.2 noch nicht erledigt).

2. Hinter dem Check-Icon-Kreis ein einmaliger (NICHT endlos loopender)
   Glow-Burst: ein geblurtes Element in --celebrate-Farbe, das beim
   Erscheinen der Completion-Screen per GSAP von opacity 0/scale 0.8 auf
   einen sanften sichtbaren Zustand fadet (duration ~1.2s, ease
   "power2.out", einmalig, kein repeat).

3. Das Check-Icon selbst bekommt eine sanfte Entrance (scale von 0.7 auf 1,
   leichtes Überschwingen erlaubt — ease "back.out(1.4)", duration ~0.6s),
   statt einfach da zu sein.

4. Die ReframeAnimation aus 7.4 erscheint zeitlich NACH dem Icon (kurzer
   Delay, ~0.4s), damit die Abfolge wie ein kleiner Moment wirkt: Ankommen
   → Aufatmen → Reframe.

Bei reduced motion: Icon und Glow erscheinen direkt im finalen Zustand, kein
Scale/Fade. Alles über useReducedMotion() absichern.
```

### Manuell — danach prüfen

1. Overthinking- und Bill-of-Rights-Flow jeweils bis zum Schluss durchspielen → der Abschluss fühlt sich wie ein kleiner, ruhiger Moment an, nicht wie ein hartes "fertig"
2. Glow-Burst läuft einmal durch und bleibt dann ruhig stehen (kein endloses Pulsieren an dieser Stelle — das wäre zu viel)
3. "Bewegung reduzieren" aktiv → Screen zeigt sofort den finalen Zustand

-----

## Genereller Hinweis zur Arbeitsweise

- Reihenfolge einhalten: 7.1 → 7.2 → 7.3 → 7.4 → 7.5 → 7.6 → 7.7. Die ersten drei sind reines Fundament — erst danach wird es sichtbar "wow".
- Nach jedem Schritt:

  ```bash
  npm run dev      # manuell testen
  npm run build    # besonders wichtig bei 7.2 (viele Dateien gleichzeitig)
  npm run lint
  git add .
  git commit -m "Phase 7.x: <kurze Beschreibung>"
  git push
  ```

- `prefers-reduced-motion` ist in jedem Bewegungs-Schritt (7.3, 7.4, 7.6, 7.7) Pflicht, nicht optional — über den zentralen `useReducedMotion()`-Hook aus 7.3.
- Glasmorphismus bewusst sparsam einsetzen (7.5): ein bis zwei Hero-Momente pro Bildschirm, der Rest bleibt schlicht. Das ist kein Versehen, sondern Absicht — sonst verliert der Effekt seine Wirkung.

-----

## Ausblick: 7.8 — Tageslicht-Variante / echter Theme-Toggle (zurückgestellt)

Falls sich später zeigt, dass eine helle Variante gebraucht wird (z. B. für Nutzung bei hellem Tageslicht draußen), wäre der nächste Schritt: dieselbe Farb-Erzählung (kühl = Kritiker, warm = Reframe) in einer hellen Tonalität neu denken, plus echte Toggle-Infrastruktur (z. B. `next-themes`) inklusive System-Präferenz-Erkennung. Bewusst nicht Teil dieser Phase, da aktuell keine Toggle-Infrastruktur existiert und der Wunsch nach *einer* starken, atmosphärischen Identität im Vordergrund stand.

-----

## Checkliste Phase 7

- [ ] 7.1 Dusk-Membership-Tokens in `:root` und `.dark` identisch gesetzt, `themeColor`/Manifest aktualisiert
- [ ] 7.2 Alle 16+ Dateien von amber/emerald/gray/violet/orange auf Tokens umgestellt, Cleanser-Kategoriefarben über neue Tokens
- [ ] 7.3 GSAP installiert, `useReducedMotion`-Hook, `.glass-panel`-Utility, `<AmbientBlobs />` einsatzbereit
- [ ] 7.4 ReframeAnimation auf Dashboard-Greeting und beiden Completion-Screens
- [ ] 7.5 Glasmorphismus auf Dashboard-RecipeCard und Values-Hub-Überblick, Performance grob geprüft
- [ ] 7.6 Bottom-Nav-Indikator, CTA-Glow, Streak-Count-up — alle reduced-motion-sicher
- [ ] 7.7 Completion-Screens mit ruhigem Glow-Burst statt Konfetti, `--success`-Token statt `emerald`
- [ ] `npm run build` + `npm run lint` laufen nach jedem Schritt sauber durch
- [ ] Mindestens einmal mit "Bewegung reduzieren" aktiv durch die ganze App geklickt

→ 7.8 (Tageslicht-Variante) folgt nur bei Bedarf, keine feste Priorität.
