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
  `app/(app)/booster/*` (akut). Die Schritte einer Übung sind eine Phasen-State-Machine in der
  jeweiligen Client-Komponente.
- Server-Actions und Backend-Logik bleiben in `app/(app)/recipes/**/actions.ts`; geteilte
  Bausteine in `components/recipes/`, Journal-Templates in `components/journal/templates/`.
- AI-Aufrufe laufen über `lib/anthropic/`, System-Prompts liegen in `lib/anthropic/prompts/`.
  Ein Prompt-String inline in einer Komponente ist ein Befund.

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
