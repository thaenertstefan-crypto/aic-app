# Wants-Rezept — Feedback-Redesign (Sterne · Sternschmiede · Sternsuche)

**Datum:** 2026-07-12
**Status:** Design abgestimmt, bereit für Implementierungsplan

## Kontext

Das Wants-Rezept wurde kürzlich auf die Sternschmiede-Metapher umgebaut. Aus dem
Nutzer-Feedback ergibt sich eine Nachschärfung über drei Screens hinweg:

- `/me/wants` → [wants-me.tsx](../../../app/(app)/me/wants/wants-me.tsx) — die Sterne-Seite
- `/me/wants/schmiede` → [sternschmiede.tsx](../../../app/(app)/me/wants/schmiede/sternschmiede.tsx) — die Sternschmiede (Funken)
- `/me/wants/journey` → [wants-journey.tsx](../../../app/(app)/me/wants/journey/wants-journey.tsx) — die Sternsuche (früher „Audit", Yin/Yang)
- AI-Prompt → [sternschmiede.ts](../../../lib/anthropic/prompts/sternschmiede.ts)

Ziel: klarere Aufgabenteilung der Screens, ein hochwertigerer Übergang in die
Schmiede, konsistente Sprache und wertorientiertere Funken-Vorschläge.

## Leitprinzip der Aufgabenteilung

- **`/me/wants` = die Sterne.** Nur die bestätigten Sterne (Wants) und die Brücke
  in die Sternschmiede. Keine Bets/Funken hier.
- **`/me/wants/schmiede` = die Funken/Bets.** Hier entstehen Funken *und* hier
  leben die offenen/erledigten Bets samt Reflexion.
- **`/me/wants/journey` = die Sternsuche.** Zwei ehrliche Fragen → destillierte
  Sterne. Keine „Audit"/„Yin"/„Yang"-Sprache mehr.

---

## Änderung 1 — `/me/wants` (Sterne-Seite)

Datei: [wants-me.tsx](../../../app/(app)/me/wants/wants-me.tsx)

### Entfällt vollständig
- Der Kompass-Link „Dein Kompass zeigt hierhin" (Hero-Bereich). **(P1)**
- Die komplette Sektion **„Nach den Sternen greifen"** inkl. offener Bets,
  „Schon gegriffen", eigenem Funken-Input und den Reflektieren-Buttons. Diese
  Bets ziehen in die Sternschmiede. **(P2)**
- Damit entfallen aus dieser Komponente: `bets`-State, `persistBets`,
  `openBets`/`triedBets`, `addBet`, `deleteBet`, `newBet`. Die Seite verwaltet
  keine Bets mehr.
- Die `SwipeToForge`-Komponente und der Text „oder nach unten wischen". Die
  Wisch-Geste wird ersatzlos entfernt. **(P3)**

### Neue Struktur (mit Sternen)
1. Hero: StarArt + Titel (`meWantsHero`) + Subtitle. **Ohne** Kompass-Link.
2. Sektion **„Meine Sterne"**: Liste der aktiven Wants + Bearbeiten-Dialog +
   „eigenes Want hinzufügen" (unverändert).
3. **„Sternsuche nochmal machen"** — Button (Outline), steht **über** der Brücke. **(P3)**
4. **Brücke in die Sternschmiede** — die Karte „Noch nicht sicher, was dich zum
   Leuchten bringt?" mit Button „Zur Sternschmiede". Ohne Wisch-Hinweis, ohne
   Swipe. Button löst den View-Transition-Übergang aus (siehe Änderung 4).

### Leer-Zustand (keine Sterne)
Aktuell führt der Leer-Zustand nur in die Sternsuche. Neu: **auch ohne
gestartete Sternsuche gibt es einen Weg in die Schmiede.** **(P6)**

- Mascot + „Noch keine Sterne entdeckt" + kurzer Text.
- Primär-Button: **„Sternsuche starten"** (→ `/me/wants/journey`).
- Darunter die **Brücke in die Sternschmiede** (dieselbe Karte/derselbe
  Transition-Button wie im gefüllten Zustand).

> Hinweis: Der Leer-Zustand richtet sich künftig nur nach `activeWants.length === 0`
> (Bets sind hier nicht mehr relevant).

### Copy-Bereinigung (P7)
„Audit" → „Sternsuche" in dieser Datei: „Yin-&-Yang-Audit" → „Sternsuche",
„Mach das Audit …" → „Mach die Sternsuche …", „Audit starten" → „Sternsuche
starten", „Audit nochmal machen" → „Sternsuche nochmal machen".

---

## Änderung 2 — `/me/wants/schmiede` (Sternschmiede)

Dateien: [sternschmiede.tsx](../../../app/(app)/me/wants/schmiede/sternschmiede.tsx),
[schmiede/page.tsx](../../../app/(app)/me/wants/schmiede/page.tsx)

### Header mit Info-Button (P5)
Der `SubPageHeader` bekommt — analog zur Sterne-Seite — einen `IntroInfoButton`.
**Kein eigenes Schmiede-Intro:** Der Button zeigt beim Klick dasselbe
Wants-Intro-Overlay wie `/me/wants`, d. h. er nutzt die bestehenden
`getRecipeIntro("wants")`-Karten. Der Button rendert nur, wenn Karten vorhanden
sind.

### Bets leben jetzt hier (P2, P5) — auf der Intro/Landing-Ansicht
Die Landing-/Intro-Phase (`phase === "intro"`) wird zum Zuhause der Bets:

1. Kurze Willkommens-Einleitung (die ausführliche Fassung lebt jetzt im Info-Button).
2. Sektion **„Nach den Sternen greifen"** (aus wants-me übernommen):
   - Offene Bets als Karten mit „Ausprobiert? Reflektieren" (→
     `/me/wants/reflect/[betId]`) und „Verwerfen".
   - „Schon gegriffen" (erledigte Bets) als kompakte Liste, ggf. mit
     Journal-Link. Optional eingeklappt, wenn die Liste länger wird.
   - Eigenen Funken hinzufügen (Input + Plus).
3. **Kind-Frage-Karte** + Button **„Funken schlagen"** (unverändert).

Dafür übernimmt `sternschmiede.tsx` die optimistische Bet-Persistenz
(`persistBets`, `addBet`, `deleteBet`) aus wants-me — dieselbe `saveBetsAction`.
`schmiede/page.tsx` lädt und übergibt zusätzlich `initialBets` aus `getWantsData()`.

### Nach dem Funkenschlagen (done-Phase)
Da die Bets jetzt in der Schmiede leben, führt der Abschluss zurück in die
Schmiede-Landing (frisch geschlagene Funken sichtbar), sekundär „Zu deinen
Sternen". Die neu gespeicherten Bets werden in den lokalen Bet-State gemergt,
damit sie ohne Reload erscheinen.

---

## Änderung 3 — `/me/wants/journey` (Sternsuche)

Datei: [wants-journey.tsx](../../../app/(app)/me/wants/journey/wants-journey.tsx)

### Yin/Yang-Wörter streichen (P7)
Nur die Marker-Wörter „Yin"/„Yang" entfernen, die beschreibenden Titel bleiben:
- „Yin — Wofür nimmst du Mühsal in Kauf?" → „Wofür nimmst du Mühsal in Kauf?"
- „Was bringt dich zum Leuchten?" bleibt (enthält kein Yin/Yang).
- Button „Zurück zu Yin" → „Zurück".
- Interne Phase-Namen (`"yin"`/`"yang"`), Formularfelder und die Action
  `saveYinYangEntryAction` bleiben unverändert (nicht nutzersichtbar).

### „Audit" → „Sternsuche" (P7)
Alle nutzersichtbaren Vorkommen ersetzen:
- `AI_FALLBACK_MESSAGE`: „Dein Audit ist gespeichert …" → „Deine Sternsuche ist
  gespeichert …"
- Analyzing-Copy: „was dein Audit über deine Wants verrät" → „was deine
  Sternsuche über deine Wants verrät"
- Offline-/Fehler-Meldungen: „dein Audit wurde als Entwurf gesichert" →
  „deine Sternsuche wurde als Entwurf gesichert" (beide Stellen), analog die
  dritte Meldung.

---

## Änderung 4 — Übergang `/me/wants` → Sternschmiede (View Transition)

**Ziel:** `/wants` slidet nach oben aus dem Bild, `/schmiede` slidet von unten
herein — „als würde man nach unten scrollen", in einer Smoothness ähnlich den
`/me`-Reveals. Kein Spinner-Overlay; stattdessen ein Spinner **im Button**. **(P4)**

### Mechanik (Next 16 React `<ViewTransition>`)
1. **Config:** `experimental.viewTransition: true` in
   [next.config.ts](../../../next.config.ts) aktivieren.
2. **Richtungs-Übergang per Transition-Type:**
   - Vorwärts (wants → schmiede): Navigation trägt den Typ `forge-down`.
   - Zurück (schmiede → wants): Navigation trägt den Typ `forge-up` (umgekehrter
     Slide, „nach oben scrollen").
3. **Auslöser statt `<Link>`:** Der „Zur Sternschmiede"-Button navigiert
   programmatisch via `router.push("/me/wants/schmiede", { transitionTypes: ["forge-down"] })`,
   umschlossen von Reacts `useTransition` → `startTransition`. Vorteil:
   - Der globale `NavigationSpinner` erfasst programmatische `router.push`
     bewusst **nicht** → kein Overlay.
   - `isPending` aus `useTransition` treibt den **Spinner im Button** (z. B.
     `Spinner`/`Loader2` statt Flame, Button disabled während pending).
4. **Zurück-Weg:** Der `SubPageHeader`-Back der Schmiede navigiert mit
   `transitionTypes: ["forge-up"]`. Dafür bekommt `SubPageHeader` optional eine
   `backTransitionTypes`-Prop (oder die Schmiede nutzt einen eigenen
   Back-Handler), sodass nur dieser eine Rückweg den umgekehrten Slide spielt.
5. **ViewTransition-Wrapper (Inhalt):** Der **Seiteninhalt** (ohne Header) von
   `/wants` und `/schmiede` wird je in ein `<ViewTransition>` gehüllt, das
   `forge-down`/`forge-up` auf vertikale Slide-Animationen mappt und
   `default: "none"` setzt — damit animiert **nur** dieser Übergang, alle
   anderen Navigationen bleiben unberührt.
6. **Header asymmetrisch — alter slidet mit, neuer fadet ein:** Der Header wird
   **separat** vom Inhalt in ein eigenes `<ViewTransition>` gehüllt, **ohne
   geteilten `name`** (kein Pairing/Morph). So wirkt beim Vorwärts-Übergang
   (`forge-down`) auf jeder Seite nur eine Seite der Animation:
   - Alter Header (`/wants`): **Exit = mit hochsliden** (gleiche
     `translateY`-Bewegung wie der Inhalt, verlässt das Bild nach oben).
   - Neuer Header (`/schmiede`): **Enter = langsames Einfaden** (nur Opacity,
     kein Slide), leicht verzögert, damit er sanft erscheint statt zu poppen.
   - Rückweg (`forge-up`) spiegelt das sinnvoll (schmiede-Header slidet mit nach
     unten raus, wants-Header fadet ein). `default: "none"`.
7. **CSS-Keyframes** (in globals.css): vertikale Slide-Keyframes für den Inhalt
   (`translateY` statt `translateX`), asymmetrisches Timing (Exit schnell
   ~150 ms, Enter langsamer ~210 ms + Delay), leichter Blur/Fade zum Kaschieren;
   separate Regeln für den Header — `::view-transition-old(header-…)` = Slide-up,
   `::view-transition-new(header-…)` = langsamer Opacity-Fade.
8. **Reduced Motion:** `@media (prefers-reduced-motion: reduce)` setzt
   `animation-duration/-delay: 0s` für die View-Transition-Pseudo-Elemente →
   sofortiger Swap (bestehende `useReducedMotion`-Nutzung bleibt für andere
   Effekte).

### Verhalten / Fallbacks
- Der alte `/wants`-Header **slidet mit hoch raus**, der neue `/schmiede`-Header
  **fadet langsam ein** (asymmetrisch, siehe Punkt 6).
- Ohne View-Transition-Support (ältere iOS-Versionen) swappt der Browser ohne
  Animation — Funktion bleibt voll erhalten.
- **Vor der Umsetzung verifizieren** (AGENTS.md): API gegen
  `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` und
  `.../config/next-config-js/viewTransition.md` prüfen (Import aus `react`,
  `transitionTypes` an `useRouter().push`).

---

## Änderung 5 — AI-Prompt: Funken stärker an Werten orientieren

Datei: [sternschmiede.ts](../../../lib/anthropic/prompts/sternschmiede.ts) **(P8)**

Der Prompt bekommt bereits Werte + Sterne + Kind-Antwort. Bisher orientieren
sich die Funken stark an den Wants; das wird ausbalanciert:

- **Aufteilung:** Bei 3–5 Funken sollen **mindestens 2** primär von den
  **Werten** der Person inspiriert sein (nicht von den Sternen). Der Rest darf
  weiter an Sternen/Kind-Antwort anknüpfen. Die gute Want-Orientierung bleibt.
- **Fallback:** Sind keine bestätigten Werte vorhanden, greift die Regel nicht;
  dann orientieren sich die Funken an Sternen/Kind-Antwort wie bisher.
- **Begründung (`reason`):** Wenn ein Funke zu einem Wert passt, soll die
  Begründung **benennen, wie** die Wette diesen Wert nährt — nicht nur die
  Wants. `reason` bleibt `null`, wenn es keine echte Verbindung gibt (keine
  erfundenen Bezüge).

Die Route [route.ts](../../../app/api/sternschmiede/route.ts) bleibt unverändert
(Werte werden bereits mitgeschickt); es ändert sich nur der System-Prompt.

---

## Betroffene Dateien (Überblick)

| Datei | Änderung |
|---|---|
| `app/(app)/me/wants/wants-me.tsx` | Kompass-Link raus (P1); Bets-Sektion raus (P2); Swipe raus, „Sternsuche nochmal" über die Brücke (P3); Brücke im Leer-Zustand (P6); Transition-Button (P4); Copy „Audit"→„Sternsuche" (P7) |
| `app/(app)/me/wants/schmiede/sternschmiede.tsx` | Info-Button im Header (P5); Bets-Landing inkl. Persistenz (P2/P5); done → Schmiede-Landing |
| `app/(app)/me/wants/schmiede/page.tsx` | `initialBets` laden/übergeben |
| `app/(app)/me/wants/journey/wants-journey.tsx` | Yin/Yang-Wörter streichen, „Audit"→„Sternsuche" (P7) |
| `lib/anthropic/prompts/sternschmiede.ts` | Werte-Aufteilung + Begründung (P8) |
| `next.config.ts` | `experimental.viewTransition: true` (P4) |
| `app/globals.css` | Vertikale View-Transition-Keyframes + reduced-motion (P4) |
| `components/layout/sub-page-header.tsx` | optional `backTransitionTypes` für Rückweg-Slide + eigener `<ViewTransition>`-Wrapper (alter Header slidet mit, neuer fadet ein) (P4) |

## Nicht im Scope (YAGNI)
- Keine DB-/Schema-Änderungen (`template_type`, Bet-/Want-Shapes bleiben).
- Keine Umbenennung interner Bezeichner (`saveYinYangEntryAction`, Phasen `yin`/`yang`).
- Keine Änderung der Sternsuche-Logik selbst (nur Copy).
- Keine neuen Animationen außerhalb des Schmiede-Übergangs.

## Offene Verifikationspunkte
1. View-Transition-API gegen die lokalen Next-16-Docs prüfen, bevor Code entsteht.
2. Prüfen, dass `NavigationSpinner` bei `router.push` wirklich nicht feuert
   (laut Kommentar so gewollt) — sonst Link mit Opt-out-Attribut nutzen.
3. E2E-Sichtprüfung des Übergangs auf iOS-PWA (Slide + reduced-motion-Fallback).
