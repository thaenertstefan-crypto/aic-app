# KAN-33 — Bottom-Nav und die Handytastatur

- **Status:** Recherche, keine Umsetzung
- **Datum:** 2026-08-20
- **Betrifft:** `components/layout/bottom-nav.tsx`, `app/(app)/layout.tsx`, `app/layout.tsx`
- **Frage:** Die Bottom-Nav rutscht mit, sobald die iOS-Tastatur offen ist. Verstecken oder
  echt sticky über der Tastatur?

## Empfehlung in einem Absatz

**Verstecken.** Nicht als Rückzug, sondern weil „echt sticky“ auf iOS heute nur als
JS-Nachführung pro Frame gegen den Visual Viewport zu haben ist — es gibt keinen CSS-Hebel,
der auf einem ausgelieferten iOS greift. Diese Nachführung läuft genau in die Defektklasse,
die bei uns nur das iPhone zeigt: eine Leiste mit `backdrop-filter`, die jeden Frame neu
positioniert wird, während WebKit gleichzeitig den Visual Viewport animiert. Das Verstecken
dagegen braucht **ein Boolean**, kein Layout, keine Animation pro Frame — und selbst wenn das
Boolean einen Frame zu spät kommt, ist der Fehlerfall harmlos (Nav blitzt kurz auf) statt
zittrig. Dazu kommt: die Nav hat bei offener Tastatur keine Aufgabe. Ein Tab-Wechsel mitten im
Tippen wirft den Text weg.

`interactive-widget=resizes-content` — der eine echte CSS-Hebel — ist in WebKit implementiert
und seit dem **13.08.2026** im Trunk standardmäßig an, aber in **keinem ausgelieferten iOS**.
Der Punkt gehört wiedervorgelegt, nicht heute gesetzt (Begründung unten in
[§ 4](#4-interactive-widget--der-hebel-der-noch-nicht-da-ist)).

---

## 1. Was iOS tatsächlich macht, wenn die Tastatur kommt

Es gibt zwei Viewports. Der **Layout-Viewport** ist das Rechteck, gegen das gelayoutet wird —
`position: fixed` und der Scrollport des Dokuments hängen daran. Der **Visual Viewport** ist
der Ausschnitt, den man gerade sieht; beim Pinch-Zoom schrumpft er innerhalb des
Layout-Viewports.

Beim Öffnen der Tastatur verhalten sich die Browser in drei Gruppen. Die Zuordnung stammt aus
dem *Viewport Investigation Effort* von Interop 2022 und ist von Chrome-Seite dokumentiert:

> **Group one** — Browsers that resize the Visual Viewport, leaving Layout Viewport untouched.
> Safari on iOS · Safari on iPadOS · Chrome on Chrome OS · Chrome on iOS · Chrome on iPadOS ·
> Edge on iOS · Edge on iPadOS
>
> In the browsers from group 1, with the OSK shown: The computed values for viewport-relative
> units remain the same. Elements that were designed to take up the full visual space keep
> their size. **Elements that use `position: fixed` remain in place and can be obscured by the
> OSK.**
>
> — [Prepare for viewport resize behavior changes coming to Chrome on Android](https://developer.chrome.com/blog/viewport-resize-behavior)

Dieselbe Aussage steht in WebKits eigenem Quelltext. Der Commit, der die
`interactive-widget`-Werte durchreicht, schreibt in der Commit-Message:

> Set default value of interactive-widget to `resizes-visual`, **which is the current default
> behavior on iOS**.
>
> — [WebKit-Commit `ea3e2c0755`, 2025-07-31](https://github.com/WebKit/WebKit/commit/ea3e2c0755)
> zu [Bug 296721](https://bugs.webkit.org/show_bug.cgi?id=296721)

Das ist die Mechanik: iOS **verkleinert den Layout-Viewport nicht**. Es verkleinert nur den
Visual Viewport und **verschiebt ihn** innerhalb des unveränderten Layout-Viewports nach
unten, damit das fokussierte Feld sichtbar wird. `window.innerHeight` bleibt gleich, `100dvh`
bleibt gleich, das Dokument bleibt gleich hoch — nur der Ausschnitt, den du siehst, wandert.

Das ist auch normativ gedeckt. CSS Values 4 erlaubt Interfaces, die Inhalt bewusst überlagern,
ausdrücklich:

> Additionally, UAs may have some dynamically-shown interfaces that intentionally overlay
> content and do not cause any shifts in layout — and therefore have **no effect on any of the
> viewport-percentage lengths**. (Typically on-screen keyboards will fit into this category.)
>
> — [CSS Values and Units 4, § Viewport-relative Units](https://drafts.csswg.org/css-values-4/#viewport-relative-lengths)

**Konsequenz für uns:** `dvh`, `svh` und `lvh` sind für dieses Problem alle drei blind. Die
Tastatur existiert für sie nicht.

## 2. Warum unsere Nav dabei wegrutscht

Die Nav ist heute:

```tsx
// components/layout/bottom-nav.tsx
<nav className="sticky bottom-0 z-50 border-t" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
```

in einer Spalte, die mindestens einen Bildschirm hoch ist:

```tsx
// app/(app)/layout.tsx
<div className="flex min-h-dvh flex-col" …>
  <main className="flex-1 overflow-x-clip">{children}</main>
  <BottomNav />
</div>
```

Zwei Spec-Fakten erklären das Verhalten vollständig:

- **Sticky misst gegen den Scrollport, nicht gegen den sichtbaren Ausschnitt.** „For a sticky
  positioned box, the inset properties represent insets from the respective edges of the
  scrollport of the nearest scroll container […]“
  ([CSS Positioned Layout 3, § 3.4](https://drafts.csswg.org/css-position-3/#stickypos-insets)).
  Nächster Scroll-Container ist hier das Dokument — `main` hat nur `overflow-x: clip`, und
  `clip` erzeugt keinen Scroll-Container. Der Scrollport des Dokuments **ist** der
  Layout-Viewport.
- **Der Layout-Viewport ist die dynamische Viewport-Größe.** „the layout viewport (whose size
  matches the dynamic viewport size); as a result, fixed boxes do not move when the document is
  scrolled“ ([CSS Positioned Layout 3, § 2.1](https://drafts.csswg.org/css-position-3/#def-cb)).

Also klebt die Nav an der Unterkante des Layout-Viewports — und die liegt bei offener Tastatur
**hinter** der Tastatur. Zusätzlich begrenzt der Containing Block (`min-h-dvh`) sie nach oben:
selbst wenn man wollte, kann CSS sie nicht über die Tastatur heben, weil `dvh` nicht schrumpft
(§ 1). Was man sieht — „scrollt mit dem Inhalt mit“ — ist der Visual Viewport, der nach unten
weggeschoben wird, während die Nav an ihrer alten Stelle bleibt.

`position: fixed` statt `sticky` ändert daran **nichts**: fixed hängt am selben
Layout-Viewport. Der Kommentar im Code, der `fixed` wegen eines `backdrop-filter`-Bugs meidet,
bleibt davon unberührt gültig.

Randnotiz: der Indikator-Effekt in `bottom-nav.tsx` hört auf `window`-`resize`. Das feuert auf
iOS beim Tastatur-Öffnen **nicht** (der Layout-Viewport ändert sich ja nicht) — heute also
kein Störfaktor. Das ändert sich, sobald `interactive-widget=resizes-content` greift; siehe § 4.

## 3. `visualViewport` — der einzige Sensor, den iOS hat

Die [VisualViewport-API](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) ist
in Safari/iOS Safari **ab Version 13** verfügbar
([BCD `api/VisualViewport.json`](https://github.com/mdn/browser-compat-data/blob/main/api/VisualViewport.json):
`safari: 13`, `safari_ios: "mirror"`). Für unser Deployment-Ziel ist sie ohne Vorbehalt da.

**Erkennung.** Es gibt kein „keyboard open“-Flag. Man rechnet die Lücke aus, die unten am
Layout-Viewport frei bleibt:

```ts
const vv = window.visualViewport;
// Lücke unter dem sichtbaren Ausschnitt, in Layout-Viewport-Koordinaten:
const gap = window.innerHeight - vv.height - vv.offsetTop;
const keyboardOpen = gap > 150;
```

`offsetTop` gehört zwingend in die Formel — auf iOS wandert der Ausschnitt, er schrumpft nicht
nur ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport): „On mobile
browsers […] the `VisualViewport.offsetLeft` and `VisualViewport.offsetTop` values are
generally updated — it is usually the visual viewport that changes rather than the window
position.“).

**Events.** `resize` feuert, wenn sich die Größe ändert; `scroll`, wenn sich der Ausschnitt
verschiebt
([MDN `resize`-Event](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/resize_event)).
Beim Tastatur-Öffnen auf iOS kommen **beide**, mehrfach, während der Animation. `scrollend` ist
in Safari **nicht** implementiert
([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/VisualViewport.json):
`safari: false`) — es gibt also kein Signal „die Tastatur ist jetzt fertig ausgefahren“.

**Fallstricke auf iOS, belegt:**

- `window.innerHeight` ist als Tastatur-Detektor unbrauchbar. Genau deswegen wurde
  [WebKit-Bug 176205](https://bugs.webkit.org/show_bug.cgi?id=176205) aufgemacht („On webkit
  ios there is no way for accounting for virtual keyboard height“, RESOLVED DUPLICATE von
  Bug 170982 = „Implement the VisualViewport API“). Aus dem Thread: „polling
  `window.innerHeight` on iOS doesn't provide any height difference with the keyboard open“.
  Die Auflösung des Bugs war ausdrücklich: *nimm die VisualViewport-API*.
- **`offsetTop` wird auf iOS 26 nach dem Schließen der Tastatur nicht zurückgesetzt.** Offener,
  von Apple bestätigter Fehler (FB19889436), reproduzierbar in Safari, WKWebView und UIWebView:
  „After the keyboard is dismissed, `visualViewport.offsetTop` does not reset to 0 […] as a
  result, the position of fixed elements remains incorrect“
  ([Apple Developer Forums, Thread 800125](https://developer.apple.com/forums/thread/800125) —
  28 Antworten, 25k Views, DTS-Antwort „in the process of being routed to the engineering
  team“). Wer die Nav pro Frame gegen `offsetTop` nachführt, erbt diesen Fehler direkt. Wer nur
  ein Boolean daraus ableitet, erbt ihn abgeschwächt — deshalb gehört `focusout` als zweites,
  unabhängiges Signal dazu (§ 8).

## 4. `interactive-widget` — der Hebel, der noch nicht da ist

Der Viewport-Meta-Key `interactive-widget` ist der standardisierte Weg, das Verhalten aus § 1
umzuschalten:

> `resizes-content` — Interactive UI widgets MUST resize the initial viewport by the
> interactive widget. Since the visual viewport's size is derived from the initial viewport,
> `resizes-content` will cause a resize of both the initial and visual viewports.
>
> — [CSS Viewport Module Level 1, § 3.4](https://drafts.csswg.org/css-viewport-1/#interactive-widget-section)

Mit `resizes-content` würde unser bestehendes `sticky bottom-0` **ohne eine Zeile JavaScript**
richtig sitzen: der Layout-Viewport schrumpft, `dvh` schrumpft mit, die Nav klebt über der
Tastatur.

**Stand der Unterstützung auf iOS — der entscheidende Befund.** Die Datenlage bei MDN sagt
schlicht „nein“
([BCD `html/elements/meta/name/viewport/interactive-widget.json`](https://github.com/mdn/browser-compat-data/blob/main/html/elements/meta/name/viewport/interactive-widget.json):
`safari: false`, `safari_ios: false` für alle drei Werte). Der WebKit-Quelltext erzählt eine
genauere Geschichte:

| Datum | Was |
| --- | --- |
| 2025-07-29 | `[interactive-widget] Add feature flag` — Flag angelegt, aus |
| 2025-07-31 | `[interactive-widget] Implement logic to process interactive-widgets values` — Werte werden geparst und zum UI-Prozess durchgereicht ([`ea3e2c0755`](https://github.com/WebKit/WebKit/commit/ea3e2c0755)) |
| 2026-07-14 | `[interactive-widget] Implement logic to support overlays-content` |
| 2026-07-31 | `[interactive-widget] Implement logic to support resizes-content` |
| **2026-08-13** | **`[interactive-widget] Enable feature flag`** — `status: testable` → `status: stable`, `PLATFORM(COCOA): true` ([`44ecc0e346`](https://github.com/WebKit/WebKit/commit/44ecc0e346943c08709fe264efac0f013da97543), [Bug 321543](https://bugs.webkit.org/show_bug.cgi?id=321543)) |
| 2026-08-14/18 | Weitere Layout-Tests (Tastatur, Navigation) |

Im heutigen Trunk steht in
[`UnifiedWebPreferences.yaml`](https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml):

```yaml
MetaViewportInteractiveWidgetEnabled:
  type: bool
  status: stable
  defaultValue:
    WebKit:
      "PLATFORM(COCOA)": true
```

und [`ViewportArguments.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/dom/ViewportArguments.cpp)
parst `resizes-visual`, `resizes-content`, `overlays-content`.

**Aber:** Das Flag ist **sieben Tage alt**. Es taucht in keinem Release-Note auf — die
jüngste Safari Technology Preview ([STP 250](https://webkit.org/blog/18191/release-notes-for-safari-technology-preview-250/),
13.08.2026) erwähnt `interactive-widget` nicht, und die Feature-Liste von
[Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) (September 2025)
liegt zeitlich weit vor der Implementierung. Ein Trunk-Flag ist **kein ausgeliefertes iOS**.
Zwischen Trunk und dem iPhone in Stefans Hand liegen mindestens eine STP-Runde und ein
OS-Release.

**Deshalb heute nicht setzen.** Next 16.2.9 kennt den Key
(`interactiveWidget?: 'resizes-visual' | 'resizes-content' | 'overlays-content'` in
`node_modules/next/dist/lib/metadata/types/extra-types.d.ts`), es wäre eine Zeile in
`app/layout.tsx`. Genau das ist die Falle: heute ein No-op, und irgendwann schaltet ein
iOS-Update ihn **still scharf**. Dann ändert sich auf jedem Formular-Screen gleichzeitig, was
`dvh`/`svh`/`lvh` bedeuten — und dieses Projekt hat seine Full-bleed-Bühnen mühsam auf `lvh`
kalibriert. Zusätzlich würde `window`-`resize` dann bei jedem Tastatur-Toggle feuern und den
GSAP-Indikator neu rechnen lassen. Der Key gehört in ein eigenes Ticket, wenn er in einem
Release-Note steht — mit Gerätetest.

## 5. `env(keyboard-inset-*)` und die VirtualKeyboard-API — auf iOS: nichts

Verdacht bestätigt, mit Beleg.

Die [VirtualKeyboard-API](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API)
(`navigator.virtualKeyboard.overlaysContent`, `geometrychange`, `boundingRect`) ist bei MDN als
*Limited availability / Experimental* geführt. Die Compat-Daten:

| Feature | Chrome | Safari | iOS Safari |
| --- | --- | --- | --- |
| `VirtualKeyboard` (gesamtes Interface) | 94 | **nein** ([WebKit-Bug 230225](https://bugs.webkit.org/show_bug.cgi?id=230225)) | mirror → **nein** |
| `env(keyboard-inset-bottom)` und alle `keyboard-inset-*` | 94 | **nein** | mirror → **nein** |

Quellen: [BCD `api/VirtualKeyboard.json`](https://github.com/mdn/browser-compat-data/blob/main/api/VirtualKeyboard.json),
[BCD `css/types/env.json`](https://github.com/mdn/browser-compat-data/blob/main/css/types/env.json).
`"mirror"` heißt in BCD: iOS Safari übernimmt den Wert von Safari — hier also `false`.
[WebKit-Bug 230225](https://bugs.webkit.org/show_bug.cgi?id=230225) („Implement the
VirtualKeyboard API“) ist seit 2021 offen und unimplementiert.

Zum Vergleich: `env(safe-area-inset-*)` gibt es auf iOS seit Safari 11 — die
`keyboard-inset-*`-Variablen sind **kein** Teil davon, sondern kommen aus der
[VirtualKeyboard-Spec](https://w3c.github.io/virtual-keyboard/). `env(keyboard-inset-bottom)`
liefert auf iOS `0px` (der Fallback), immer. Ein Layout darauf zu bauen heißt, auf iOS gar
nichts zu tun.

Die CSSWG-Spec beschreibt außerdem das Zusammenspiel: `VirtualKeyboard.overlaysContent = true`
überschattet `interactive-widget`
([CSS Viewport 1, § 3.4.1](https://drafts.csswg.org/css-viewport-1/#interaction-with-virtualkeyboard-overlayscontent)).
Für uns akademisch, solange iOS keines von beidem hat.

## 6. Der Kern: Was gilt in der Standalone-PWA?

Diese App läuft als Homescreen-PWA (`display: "standalone"` in `app/manifest.ts`,
`appleWebApp.capable: true` in `app/layout.tsx`). Eine Aussage, die nur für Safari gilt, ist
hier wertlos — also getrennt betrachtet.

**Was belegt ist:**

- Standalone heißt bei Apple ausdrücklich nur: **keine Browser-Chrome**. „When you use this
  standalone mode, Safari is not used to display the web content — specifically, there is no
  browser URL text field at the top of the screen or button bar at the bottom of the screen.
  Only a status bar appears at the top of the screen.“
  ([Configuring Web Applications, Apple Developer Library](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)).
  Kein Wort zu Viewport oder Tastatur.
- Die Engine ist dieselbe. Der WebKit-Commit aus § 1 spricht von „the current default behavior
  **on iOS**“ — nicht „in Safari“. Das Verhalten sitzt in WebCore/WebKit, nicht in der
  Safari-App.
- Der iOS-26-Fehler aus § 3 tritt laut Melder identisch „in Safari, WKWebView, and UIWebView“
  auf ([Thread 800125](https://developer.apple.com/forums/thread/800125)) — also über den
  Browser hinaus. Die Standalone-PWA rendert über denselben WKWebView-Pfad.
- Interop 2022 hat die Gruppen (§ 1) pro **Browser+OS**-Kombination klassifiziert, nicht pro
  Anzeigemodus.

**Wo die Quellenlage dünn ist — ausdrücklich:**

> Es existiert **keine** Primärquelle, die das Viewport-/Tastatur-Verhalten der
> iOS-Homescreen-PWA getrennt von Safari beschreibt. Nicht bei Apple, nicht im WebKit-Blog,
> nicht in der Spec. Apples Standalone-Dokumentation ist archiviert und stammt aus der
> iOS-4-Ära. Der WebKit-Quelltext hat keinen sichtbaren Sonderpfad für den Anzeigemodus in der
> Tastatur-Behandlung, aber „ich habe keinen gefunden“ ist schwächer als „es gibt keinen“.

**Was daraus folgt — und wo der Unterschied real ist.** Nach Aktenlage gilt § 1 in der PWA
genauso. Der praktische Unterschied liegt nicht im Mechanismus, sondern in dem, was
*zusätzlich* nicht passiert: in Safari überlagert sich das Tastatur-Verhalten mit der ein- und
ausfahrenden URL-Leiste, die ihrerseits den Layout-Viewport verändert. In der Standalone-PWA
gibt es diese Leiste nicht. Für die Erkennung aus § 3 ist das ein **Vorteil**: die einzige
Größenänderung, die dort je auftritt, ist die Tastatur. Ein Schwellwert von ~150 px unterscheidet
sicher zwischen „Tastatur“ (~290–340 px auf einem 375-px-iPhone) und „nichts“. In Safari müsste
man zusätzlich die ~50–60 px URL-Leiste ausschließen.

Aber — und das ist die Konsequenz für dieses Ticket — das ist ein Argument über
*Erkennungs-Robustheit*, nicht über *Positionierungs-Robustheit*. Die Nav pro Frame gegen
`offsetTop` zu schieben, ist in der PWA exakt so wackelig wie in Safari. Und ausgerechnet für
die PWA gilt die Hausregel: **die statischen Gates sehen davon nichts.** Diese Frage ist am
Ende nur auf dem Gerät zu entscheiden.

## 7. Gängige Praxis

Die eine explizite Design-Spec-Aussage, die es dazu gibt, kommt von Material Design und ist
eindeutig:

> Bottom sheets, navigation drawers, and **keyboards appear in front of the bottom navigation
> bar, temporarily covering it.**
>
> — [Material Design, Bottom navigation](https://m1.material.io/components/bottom-navigation.html)
> (wortgleich fortgeführt in [Material 2](https://m2.material.io/components/bottom-navigation))

Also: die Tastatur **verdeckt** die Bottom-Nav. Nicht: die Nav hebt sich.

Dasselbe ist auch das Verhalten, das die Plattformen selbst als Default gewählt haben. Genau
diesen Zustand beschreibt der Chrome-Artikel für Gruppe 1 als Normalfall — „Elements that use
`position: fixed` remain in place and **can be obscured by the OSK**“ — und Chrome hat sich
2022 mit Version 108 bewusst **von** `resizes-content` **weg** und zu `resizes-visual`
bewegt, um sich iOS anzugleichen. Der Mainstream-Default ist heute in jedem Major-Browser:
Tastatur überlagert, Bottom-Chrome verschwindet dahinter.

Apples eigene HIG zu Tab-Bars und Bildschirmtastaturen ließ sich nicht als Primärzitat
sichern — die Seiten werden client-seitig gerendert und liefern über HTTP keinen Text. Das ist
eine offene Lücke in dieser Recherche. Beobachtbar ist das native iOS-Verhalten: eine
`UITabBar` wird von der Tastatur verdeckt, sie fährt nicht mit hoch.

Bekannte Web-Apps mit Bottom-Nav und Texteingabe (Messenger-artige Oberflächen) heben in der
Regel **nur die Eingabezeile** über die Tastatur, nicht die Navigation. Das ist die eigentliche
Unterscheidung: Über die Tastatur gehört, was zum Tippen gebraucht wird. Navigation gehört
nicht dazu.

## 8. Die zwei Kandidaten, bewertet

### Kandidat B — echt sticky über der Tastatur

Um das zu bauen, brauchst du heute auf iOS:

1. `position: fixed` (nicht sticky — sticky kann den Containing Block `min-h-dvh` nicht
   verlassen, § 2),
2. eine Verschiebung, die aus `visualViewport.offsetTop` und `.height` jeden Frame neu berechnet
   wird — es gibt keine CSS-Größe, die das ausdrückt (§ 4, § 5),
3. eine Nachführung während der Tastatur-Animation ohne Abschluss-Signal (`scrollend` fehlt in
   Safari, § 3).

Dagegen sprechen vier konkrete Dinge in **diesem** Projekt:

- **`backdrop-filter` + Bewegung pro Frame.** Die Glass-Ebene der Nav ist bereits einmal an
  einem iOS-Compositing-Bug gescheitert — der Kommentar im Code dokumentiert, warum sie auf
  einer separaten absoluten Ebene liegt statt auf dem `<nav>`. Eine unscharfe Ebene jeden Frame
  neu zu positionieren, ist genau die Klasse, die nur das iPhone zeigt.
- **Zwei Animations-Autoritäten auf einem Element.** GSAP schreibt heute schon auf den
  Indikator innerhalb der Nav. Ein zweiter Schreiber auf dem Container ist eine Fehlerquelle,
  die dieses Repo schon einmal getroffen hat („GSAP nullt eigenständiges `translate`“).
- **`position: fixed` in der Nav wurde bereits einmal verworfen** — der WebKit-Bug, den der
  Kommentar beschreibt (Leiste ankert an der Inhalts- statt Viewport-Unterkante auf kurzen
  Seiten), wäre wieder im Spiel.
- **Ein offener, unbehobener iOS-26-Fehler sitzt direkt in der Formel.** `offsetTop` springt
  nach dem Schließen nicht auf 0 zurück (§ 3). Bei Kandidat B ist das ein dauerhaft falsch
  sitzendes Element; bei Kandidat A nur ein Boolean, das über `focusout` ohnehin
  zurückgesetzt wird.

Und selbst wenn es perfekt liefe: Was tut die Nav dort? Ein Tap darauf verwirft die Eingabe.

### Kandidat A — verstecken, solange die Tastatur offen ist

- Ein Boolean, kein Layout-Rechnen, keine Frame-Schleife.
- Der Fehlerfall ist harmlos: kommt das Signal spät, blitzt die Nav kurz auf, statt zu zittern.
- Zwei unabhängige Signale (`focusin`/`focusout` als Tor, `visualViewport` als Bestätigung)
  fangen sich gegenseitig ab — auch den `offsetTop`-Fehler aus § 3, und auch den Fall
  „iPad mit Hardware-Tastatur“ (Fokus da, aber keine Tastatur auf dem Schirm).
- Deckt sich mit der Material-Spec und mit dem Plattform-Default.
- Und: verschwindet der Hebel aus § 4 eines Tages doch auf dem iPhone, bleibt diese Lösung
  korrekt. Sie wird nur überflüssig, nicht falsch.

**Wichtig für die Umsetzung:** nicht aus dem Fluss nehmen. `display: none` auf einer
`sticky bottom-0`-Leiste ändert die Dokumenthöhe und kann einen Scroll-Sprung auslösen — genau
in dem Moment, in dem WebKit ohnehin scrollt. Nur visuell ausblenden (Opacity/Translate,
`pointer-events-none`, `inert` für Fokus und Screenreader), Platz behalten.

Skizze — **Illustration, kein fertiger Code**:

```tsx
// nur zur Veranschaulichung der Signalführung
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const isEditable = () => {
      const el = document.activeElement;
      return !!el && (el.matches("input, textarea, [contenteditable]"));
    };

    const check = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setOpen(isEditable() && gap > 150);
    };

    vv.addEventListener("resize", check);
    vv.addEventListener("scroll", check);
    // focusout ist das verlässliche Ende — unabhängig davon, ob offsetTop
    // korrekt zurückspringt (siehe § 3, iOS-26-Fehler).
    window.addEventListener("focusout", () => setOpen(false));
    return () => { /* … */ };
  }, []);

  return open;
}
```

## 9. Was das Umsetzungs-Ticket prüfen muss

Die statischen Gates (`tsc`, `npm run gate`, `npm run build`) sagen zu alldem **nichts**.
Prüfbar ist das nur auf dem iPhone, in der Homescreen-PWA, nicht in Safari:

1. Auf einem langen Formular (`/journal/new`) und auf einem kurzen (`/me/bill-of-rights/add`)
   ins Feld tippen — Nav weg, ohne dass der Inhalt springt.
2. Feld verlassen (Tastatur schließen über „Fertig“ **und** über Tap daneben) — Nav zurück, an
   der richtigen Stelle.
3. Zwischen zwei Feldern wechseln, ohne die Tastatur zu schließen — Nav bleibt weg, kein
   Flackern.
4. Auf iOS 26 danach nach oben scrollen und prüfen, ob die Nav korrekt sitzt (Gegenprobe zum
   `offsetTop`-Fehler aus § 3).
5. Mit Hardware-Tastatur (falls verfügbar): Fokus im Feld, Nav **bleibt** sichtbar.

## Quellen

**Specs**
- [CSS Viewport Module Level 1, § 3.4 `interactive-widget`](https://drafts.csswg.org/css-viewport-1/#interactive-widget-section)
- [CSS Viewport Module Level 1, § 3.4.1 Interaktion mit `VirtualKeyboard.overlaysContent`](https://drafts.csswg.org/css-viewport-1/#interaction-with-virtualkeyboard-overlayscontent)
- [CSS Positioned Layout Module Level 3, § 2.1 Containing Blocks](https://drafts.csswg.org/css-position-3/#def-cb)
- [CSS Positioned Layout Module Level 3, § 3.4 Sticky positioning](https://drafts.csswg.org/css-position-3/#stickypos-insets)
- [CSS Values and Units Module Level 4, Viewport-relative Units](https://drafts.csswg.org/css-values-4/#viewport-relative-lengths)
- [CSSOM View Module Level 1 (VisualViewport-Interface)](https://drafts.csswg.org/cssom-view-1/#the-visualviewport-interface)
- [VirtualKeyboard API (W3C)](https://w3c.github.io/virtual-keyboard/)

**WebKit / Apple**
- [WebKit-Commit `ea3e2c0755` — interactive-widget: Werte verarbeiten (2025-07-31)](https://github.com/WebKit/WebKit/commit/ea3e2c0755)
- [WebKit-Commit `44ecc0e346` — interactive-widget: Feature-Flag aktivieren (2026-08-13)](https://github.com/WebKit/WebKit/commit/44ecc0e346943c08709fe264efac0f013da97543)
- [WebKit `UnifiedWebPreferences.yaml` — `MetaViewportInteractiveWidgetEnabled`](https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml)
- [WebKit `ViewportArguments.cpp` — `parseInteractiveWidgetValue`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/dom/ViewportArguments.cpp)
- [WebKit-Bug 321543 — interactive-widget: Enable feature flag](https://bugs.webkit.org/show_bug.cgi?id=321543)
- [WebKit-Bug 230225 — Implement the VirtualKeyboard API (offen)](https://bugs.webkit.org/show_bug.cgi?id=230225)
- [WebKit-Bug 176205 — kein Weg zur Tastaturhöhe auf iOS (Duplikat von 170982)](https://bugs.webkit.org/show_bug.cgi?id=176205)
- [Release Notes for Safari Technology Preview 250 (13.08.2026)](https://webkit.org/blog/18191/release-notes-for-safari-technology-preview-250/)
- [WebKit Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- [Apple Developer Forums 800125 — iOS 26: `VisualViewport.offsetTop` wird nicht zurückgesetzt](https://developer.apple.com/forums/thread/800125)
- [Configuring Web Applications (Apple Developer Library, archiviert)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)

**MDN / Compat-Daten**
- [MDN — VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
- [MDN — VisualViewport: `resize`-Event](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/resize_event)
- [MDN — VirtualKeyboard API](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API)
- [MDN — `env()`](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- [MDN — `<meta name="viewport">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport)
- [BCD — `api/VisualViewport.json`](https://github.com/mdn/browser-compat-data/blob/main/api/VisualViewport.json)
- [BCD — `api/VirtualKeyboard.json`](https://github.com/mdn/browser-compat-data/blob/main/api/VirtualKeyboard.json)
- [BCD — `css/types/env.json`](https://github.com/mdn/browser-compat-data/blob/main/css/types/env.json)
- [BCD — `html/elements/meta/name/viewport/interactive-widget.json`](https://github.com/mdn/browser-compat-data/blob/main/html/elements/meta/name/viewport/interactive-widget.json)

**Praxis**
- [Chrome for Developers — Prepare for viewport resize behavior changes coming to Chrome on Android](https://developer.chrome.com/blog/viewport-resize-behavior)
- [Material Design — Bottom navigation](https://m1.material.io/components/bottom-navigation.html)
- [Material Design 2 — Bottom navigation](https://m2.material.io/components/bottom-navigation)

**Projekt**
- `components/layout/bottom-nav.tsx`, `app/(app)/layout.tsx`, `app/layout.tsx`, `app/manifest.ts`
- `node_modules/next/dist/lib/metadata/types/extra-types.d.ts` (Next 16.2.9, `interactiveWidget`)
