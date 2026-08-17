# Coding Standards

Wie Code in diesem Repo geschrieben wird. Gedacht als Prüfliste für einen Review — jeder Punkt
soll an einem Diff entscheidbar sein, nicht Geschmacksfrage bleiben.

Ergänzt, nicht ersetzt: [CLAUDE.md](CLAUDE.md) (Architektur, Verifikation, Git-Workflow),
[PRODUCT.md](PRODUCT.md) (Zielgruppe, Register, Prinzipien), [DESIGN.md](DESIGN.md) (Palette,
Typografie, Komponenten, Elevation). Bei UI-Änderungen sind `PRODUCT.md` und `DESIGN.md` die
verbindlichen Quellen; hier stehen nur die Regeln, die sich am Code festmachen lassen.

## Sprache und Copy

- **Jeder nutzersichtbare Text ist Deutsch**, im „du", warm und ermutigend. Englische Strings in
  der UI sind ein Befund — auch in `aria-label`, `title`, `placeholder`, `alt` und Fehlermeldungen.
- **Deutsche Anführungszeichen:** `„…"` (U+201E öffnend, U+201C schließend). Ein ASCII-`"` als
  Schließzeichen ist ein Verstoß und wird von `scripts/check-typography.mjs` gefangen — allerdings
  nur in JSX-Textknoten, den gerenderten Attributen und unterhalb `lib/content/`. Copy, die
  woanders in String-Literalen steht, prüft niemand automatisch: dort mit dem Auge lesen.
- Kommentare und KI-Prompt-Strings sind von der Typografie-Regel bewusst ausgenommen.

## Next.js 16

- `cookies()`, `headers()`, `params` und `searchParams` sind **async und müssen awaited werden**:
  `const { slug } = await params`. Gilt für Pages, Layouts und Route Handler gleichermaßen.
- Der App Router in dieser Version weicht von älteren Konventionen ab. Vor neuem Routing- oder
  Rendering-Code die Guides unter `node_modules/next/dist/docs/` lesen statt aus dem Gedächtnis
  zu schreiben — so steht es auch in [AGENTS.md](AGENTS.md).

## Datenzugriff

- **Browser:** `lib/supabase/client.ts`. **Server-Komponenten:** `lib/supabase/server.ts`. Ein
  direkt konstruierter Supabase-Client außerhalb dieser beiden Module ist ein Befund.
- Typen kommen aus `lib/supabase/database.types.ts` (generiert). Handgeschriebene Row-Typen, die
  eine Tabelle nachbilden, sind ein Befund — bei Schema-Änderungen werden die Typen neu gezogen.
- JSONB-Spalten kommen als `Json`. Die schmalen Element-Shapes (`RightItem`, `*Content`) leben
  zentral in `lib/types/db-json.ts` und werden nicht pro Aufrufstelle neu definiert.
- **Ein JSONB-`content`-Shape zu ändern ist eine Migration, kein Refactor.** Bestehende Zeilen
  tragen das alte Shape weiter. Wer das Shape ändert, muss alle Leser mitziehen *und* sagen, was
  mit vorhandenen Daten passiert. Ein Diff, der nur den Schreiber anfasst, verliert stillschweigend
  Nutzerdaten.
- `journal_entries` identifizieren ihre UI immer über `template_type`.

## Struktur

- Übungen liegen unter `app/(app)/me/*` (durable: Werte, Wants, Bill of Rights) und
  `app/(app)/booster/*` (akut). Begriffe siehe [CONTEXT.md](CONTEXT.md).
- **Der Übungszustand ist ein Objekt mit benannten Übergängen**, nicht eine Reihe von `useState`.
  Er liegt als reines Modul in `lib/recipes/<übung>/state.ts` (`initialX`, `advanceX(state, event)`,
  Test daneben); die Client-Komponente ruft `useReducer` und rendert. Ein Übergang darf die Felder
  setzen, die er meint — die Regel greift dort, wo ein **ganzer Durchgang** endet oder neu beginnt
  (nächstes Szenario, zweiter KI-Anlauf):
  - Diese Stelle steht **im Modul**, einmal, und heißt so wie das, was passiert. Eine Feldliste an
    der Aufrufstelle — mehrere Setter hintereinander in der Komponente — ist ein Befund.
  - Sie sagt, *was den Wechsel überlebt*, und baut den Rest aus `initialX()` frisch; wo stattdessen
    ein Block geleert wird, ist der geleerte Stand ein **benannter, vollständiger** Wert
    (`noFeedback()`), keine Auswahl.
  - Dazu gehört ein Test, der über `Object.keys` des Zustands läuft und für jedes nicht
    überlebende Feld beides prüft: dass die Testdaten es verschmutzen und dass der Übergang es
    zurücksetzt. Ohne ihn leckt ein später hinzugefügtes Feld still in den nächsten Durchgang —
    und genau das ist der Defekt, den diese Regel verhindert.
  - Eine Bühne, in die mehrere Wege führen, wird von **jedem** dieser Wege im Modul gesetzt. Ein
    Übergang, der die Bühne offenlässt, weil die Komponente sie gleich nachreicht, ist ein Befund:
    dann hängt der Zustand wieder an der Aufrufreihenfolge.
- Server-Actions und Backend-Logik der Übungen liegen in `lib/recipes/**/actions.ts` — nicht im
  Routenbaum; geteilte Bausteine in `components/recipes/`, Journal-Formatierung in
  `lib/utils/journal.ts`.
- Eine Server-Action beginnt mit `withUser` aus `lib/actions/` und gibt ein `ActionResult<T>`
  zurück (`ok`/`failed`/`dbFailed`). Eine handgeschriebene `auth.getUser()`-Präambel oder eine eigene
  Rückgabeform ist ein Befund — der Altbestand ist migriert, es gibt keine Ausnahme mehr zu erben.
  Die eine begründete Ausnahme steht in `app/(auth)/auth.actions.ts`: Login, Signup und Reset laufen
  **vor** der Anmeldung, dort gibt es keinen User zu holen. Die Ergebnisform gilt auch dort.
  Der Fehlerzustand „nicht angemeldet" ist `SESSION_EXPIRED` — nie ein neu getippter Satz.
- **Bei `useActionState` trägt die Nutzlast das „ist gelaufen", nicht `error`.** Der Anfangszustand
  eines Formulars hat ebenfalls `error === null`; wer allein darauf prüft, schaltet die Bühne schon
  beim Mount weiter. Solche Actions geben `ActionResult<boolean>` zurück, starten auf `ok(false)` und
  melden Erfolg mit `ok(true)`; der Aufrufer prüft `state.error === null && state.data`. Actions,
  aus deren Ergebnis nur ein `<FormError>` gespeist wird, brauchen das nicht — dort genügt `ok()`.
- Eine Action, die kein Formular über `useActionState` bedient, hat **kein** `_prevState`-Argument.
- In **API-Routen** gilt der Wortlaut (`SESSION_EXPIRED`), nicht aber `withUser`/`getCachedUser`:
  eine Route läuft in ihrem eigenen Request-Kontext und fragt einmal ab, dort dedupliziert
  `getCachedUser` nichts und baut nur einen zweiten Client (siehe `lib/supabase/get-user.ts`).
  Für **KI-Routen** erledigt das `withAiRoute` (siehe unten) — dort ist eine eigene
  `auth.getUser()`-Präambel ein Befund.
- **Neue reine Module unter `lib/` bekommen eine `*.test.ts`** — co-located, ausgeführt von
  `node --test` als Teil von `npm run gate`. „Rein" heißt: keine Netzwerk-, DB- oder
  React-Abhängigkeit. Für Komponenten und Server-Actions gilt die Regel bewusst **nicht**.
- AI-Aufrufe laufen über `lib/anthropic/`, System-Prompts liegen in `lib/anthropic/prompts/`.
  Ein Prompt-String inline in einer Komponente ist ein Befund.
- Eine **KI-Route** beginnt mit `withAiRoute({ endpoint, failure }, handler)` aus
  `lib/anthropic/ask-model.ts` und ruft das Modell über das `askModel` aus dem Kontext auf; das
  Ergebnis wird über `result.failure !== null` geprüft und die mitgelieferte `Response`
  durchgereicht. Ein Befund ist alles, was das Modul schon trägt: ein eigener Modellaufruf, ein
  `claude-*`-Literal, ein handgeschriebener `checkRateLimit`/`logUsage`-Aufruf, ein eigener
  Textblock-Zusammenbau oder ein `catch` mit eigenem 500er. Neue Endpunkte kommen als Eintrag in
  `AI_ENDPOINT_LIMITS`, nicht als neue Konstante — der Schlüssel ist Rate-Limit- und
  `logUsage`-Name in einem.
- **`logUsage` läuft nur nach einem geglückten Modellaufruf**, und das Limit wird direkt davor
  geprüft. Beides steckt in `askModel`; wer es an einer Aufrufstelle wiederholt, kann es nur
  falsch machen.

## Styling und Motion

- **Mobile-first, Zielviewport ~375px.** Ein Layout, das erst ab Tablet-Breite aufgeht, ist nicht
  fertig.
- Farben kommen aus den Tokens in `app/globals.css` (`:root`). Hartkodierte Hex-Werte in
  Komponenten umgehen das Kontrast-Gate und sind ein Befund.
- **Tailwind v4:** `translate-*`, `scale-*` und `rotate-*` kompilieren zu *eigenen*
  CSS-Properties, nicht zu `transform`. Wer sie animiert, aber `transform` in `transition-[…]`
  listet, bekommt einen Sprung statt einer Bewegung. `scripts/check-transitions.mjs` fängt genau
  diese Kombination.
- **GSAP nullt eigenständige `translate`-Properties.** Auf einem GSAP-animierten Element bleibt
  eine Tailwind-`translate`-Klasse wirkungslos — Versatz dort über GSAP selbst setzen.
- `overflow-hidden` auf einem Vorfahren bricht `position: sticky` der Kinder. Ein neu gesetztes
  `overflow-hidden` oberhalb eines Sticky-Headers ist ein Befund.
- Beim Skalieren von SVGs: `vector-effect` vererbt **nicht**, es gehört auf jedes gestrichene
  Element einzeln.
- Interaktions-Controls werden an der Höhe des goldenen CTA bemessen, nicht kleiner.

## Verifikation im Diff

- Neue Bühnen bekommen einen `data-e2e`-Marker mit `expect`/`reject`, sonst wächst nur die
  Smoke-Test-Zone, die nichts aussagt. Eine neue Route ohne Marker ist ein Befund.
- Die statischen Gates (`npx tsc --noEmit`, `npm run gate`, `npm run build`) sind auf `main` grün.
  Ein roter Lauf ist eine echte Regression, kein Altlast-Rauschen.
- **Grün heißt nicht fertig.** Die Gates sind blind für gestapelte Opacity-Ebenen,
  `backdrop-filter`-Compositing, iOS-Viewport-Einheiten in der Standalone-PWA und fehlende
  View-Transitions. Bei visuellen und Motion-Änderungen ist das iPhone das eigentliche Gate — ein
  Review kann das nicht ersetzen, aber es soll benennen, wenn ein Diff Prüfung am Gerät braucht.
