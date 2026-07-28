# Feinjustierung 3 — Auth (Login + Signup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Login-Kopf verliert seine doppelte Brand-Zeile, und der Signup-Hero spricht dieselbe Nachthimmel-Bildsprache wie die App dahinter — inklusive eines Maskottchens, das beim Aufwischen zur Seite von der Bühne geht statt nach oben.

**Architecture:** Alle drei Eingriffe konzentrieren sich auf [`components/auth/auth-reveal.tsx`](../../../components/auth/auth-reveal.tsx), die gemeinsame Vollbild-Bühne beider Pfade. Das Hero-Maskottchen zieht dabei aus [`app/(auth)/layout.tsx`](<../../../app/(auth)/layout.tsx>) in `AuthReveal` um, weil nur dort der `revealed`-State liegt, der seine Transition steuert.

**Tech Stack:** Next.js 16 App Router, React 19, TailwindCSS v4.

Quelle: [`docs/superpowers/specs/2026-07-28-feinjustierung-runde-design.md`](../specs/2026-07-28-feinjustierung-runde-design.md), Pakete 3 und 4.

## Global Constraints

- **Alle user-facing Texte sind Deutsch**, warm/ermutigend, informelles „du".
- **Deutsche Anführungszeichen sind echte Unicode-Zeichen:** U+201E (`„`) öffnend, U+201C (`"`) schließend. Nie ASCII `"`.
- **Mobile-first, Ziel-Viewport ~375 px.**
- **Tailwind v4-Footgun (in diesem Plan zentral):** `translate-x-*` kompiliert zu der eigenständigen CSS-Property `translate`, NICHT zu `transform`. Die Transition muss `translate` namentlich nennen, sonst springt die Position statt zu gleiten. Der Hero macht das bereits richtig (`transition-[translate,opacity]`). `scripts/check-transitions.mjs` flaggt die falsche Kombination.
- **Standalone-PWA-Viewport:** Vollbild-Bühnen nutzen `lvh`, nicht `svh`/`dvh` — sonst streift der Body-Hintergrund unten durch. `AuthReveal` verwendet bereits `min-h-lvh`; das bleibt so.
- **Es gibt kein Test-Framework im Repo.** Harte Gates: `npx tsc --noEmit`, `npm run gate`, `npm run build`. Jede Task endet damit.
- **`npm run lint` ist auf `main` vorbestehend ROT** (drei Sternschmiede-ESLint-Fehler). Keine Regression dieser Runde.
- **Der eigentliche Abnahme-Test ist der iPhone-Check am Live-Deploy.** Nach jeder Task committen und nach `main` pushen.
- **PowerShell 5.1-Fallen:** Pfade mit `(auth)` immer quoten (`git add "app/(auth)/…"`); in mehrzeiligen Commit-Messages keine inneren `"` verwenden.

---

### Task 1: Brand-Zeile aus dem kompakten Login-Kopf entfernen

Die Zeile „Der Club, den niemand zugibt zu brauchen." fällt aus dem kompakten Kopf. Betroffen ist der **ungegatete** Pfad (Login, Passwort-Reset, Passwort-neu) — also der `if (!gated)`-Zweig. Das Logo bleibt, der Abstand darunter wird auf das Karten-Layout hin nachjustiert.

Die Hero-Headline auf dem Signup („Willkommen im Club, den niemand zugibt zu brauchen.") bleibt — dort trägt sie den Erstkontakt.

**Files:**
- Modify: `components/auth/auth-reveal.tsx:89-97`

**Interfaces:**
- Consumes: nichts.
- Produces: nichts.

- [ ] **Step 1: Zeile entfernen, Abstand nachziehen**

In `components/auth/auth-reveal.tsx`, im `if (!gated)`-Zweig, den Kopf-Block ersetzen:

```tsx
        <div
          className="relative z-10 px-6 pt-6 md:px-10 md:pt-8"
          style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}
        >
          <Logo size="default" />
        </div>
```

Der `<p className="mt-3 max-w-xs …">`-Absatz entfällt ersatzlos. Der Karten-Bereich darunter trägt seinen Abstand bereits selbst (`flex flex-1 items-center justify-center px-4 py-8`) — ohne die Zeile zentriert sich die Karte im verbliebenen Raum, das ist der gewünschte Zustand. Keine weitere Abstands-Konstante hinzufügen; die Nachjustierung passiert am Gerät in Step 3, falls der Kopf dann zu nah an der Karte klebt.

- [ ] **Step 2: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler.

- [ ] **Step 3: Am Gerät prüfen und committen**

`/login`, `/passwort-vergessen` und `/passwort-neu` öffnen: Nur noch Logo über der Karte, keine Brand-Zeile. `/signup` unverändert — dort trägt die Hero-Headline die Zeile weiterhin.

Falls das Logo jetzt zu dicht über der Karte sitzt, ergänze am Kopf-`div` ein `pb-2`; ändere nicht das `py-8` des Karten-Containers (das trägt auch den Reset-Pfad).

```bash
git add components/auth/auth-reveal.tsx
git commit -m "copy(auth): Brand-Zeile aus dem kompakten Login-Kopf entfernt

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 2: Sky-Backdrop im Signup-Hero

Das Hero-Panel malt heute seinen eigenen Verlauf (`bg-linear-to-br from-secondary via-accent/60 to-background` plus `AmbientBlobs`). Es bekommt stattdessen den geteilten [`SkyBackdrop`](../../../components/backdrops/sky-backdrop.tsx), wie Dashboard, /me und Kopfwetter.

Damit spricht der Erstkontakt dieselbe Bildsprache wie die App dahinter — und die Kante am oberen Rand ist mit hoher Wahrscheinlichkeit genau der Übergang zwischen diesem Hero-Verlauf und dem Body-Hintergrund. Ob sie damit weg ist, wird nach dem Deploy am Gerät geprüft; bleibt sie, geht es separat auf safe-area/`lvh`-Jagd.

`AmbientBlobs` fliegt mit raus — der Nachthimmel bringt seine eigene Tiefe mit und zwei atmosphärische Ebenen übereinander werden matschig.

**Files:**
- Modify: `components/auth/auth-reveal.tsx:7` (Import), `:158-169` (Hero-Panel)

**Interfaces:**
- Consumes: `SkyBackdrop` aus `@/components/backdrops/sky-backdrop` (bereits in der Datei importiert, wird im ungegateten Zweig verwendet).
- Produces: nichts.

- [ ] **Step 1: Hero-Panel auf den Nachthimmel umstellen**

In `components/auth/auth-reveal.tsx` das Hero-Panel (der `absolute inset-0 z-20`-Block) ersetzen:

```tsx
      {/* Hero-Panel: liegt darüber und schiebt beim Aufdecken nach oben weg.
          Nachthimmel statt eigenem Verlauf — derselbe SkyBackdrop wie Dashboard,
          /me und Kopfwetter, damit der Erstkontakt die Bildsprache der App
          dahinter spricht. AmbientBlobs entfällt: der Himmel bringt seine eigene
          Tiefe mit, zwei atmosphärische Ebenen übereinander werden matschig. */}
      <div
        className={cn(
          "absolute inset-0 z-20 isolate flex flex-col overflow-hidden",
          "bg-background",
          "transition-[translate,opacity] duration-1000 ease-out",
          revealed
            ? "pointer-events-none -translate-y-full opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        <SkyBackdrop />

        <div className="flex flex-1 flex-col">{hero}</div>
```

`bg-background` ersetzt den Verlauf und hält das Panel opak — sonst schiene beim Wegschieben die Login-Karte durch. `SkyBackdrop` rendert `fixed inset-0 -z-10`; weil das Panel `isolate` trägt, bleibt der Himmel innerhalb dieses Stacking-Kontexts hinter dem Hero-Inhalt, wandert aber mit dem Panel nach oben weg.

- [ ] **Step 2: `AmbientBlobs`-Import entfernen**

Die Zeile `import { AmbientBlobs } from "@/components/ui/ambient-blobs";` löschen und mit `grep -n "AmbientBlobs" components/auth/auth-reveal.tsx` gegenprüfen (erwartet: kein Treffer).

`components/ui/ambient-blobs.tsx` selbst bleibt bestehen — die Komponente wird woanders verwendet. Mit `grep -rln "AmbientBlobs" app components` gegenprüfen; gibt es keinen weiteren Konsumenten, bleibt sie trotzdem stehen (Aufräumen toter Komponenten ist nicht Teil dieser Runde).

- [ ] **Step 3: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler.

- [ ] **Step 4: Am Gerät prüfen und committen**

`/signup` als installierte PWA öffnen:

- **Ist die Kante oben weg?** Wenn nicht, ist es kein Verlaufs-Übergang, sondern ein safe-area/`lvh`-Thema — das wird separat verfolgt, nicht in dieser Task.
- Der Hero zeigt den Nachthimmel mit funkelnden Lichtern, keine Farb-Blobs mehr.
- Beim Aufwischen schiebt sich der ganze Hero inklusive Himmel nach oben weg; darunter liegt der Nachthimmel des ungegateten Zweigs — der Wechsel darf nicht als Schnitt lesen.

```bash
git add components/auth/auth-reveal.tsx
git commit -m "feat(auth): Nachthimmel statt eigenem Verlauf im Signup-Hero

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 3: Maskottchen wischt nach rechts raus

Beim Aufwischen schiebt sich das Hero-Panel nach oben weg (`-translate-y-full`). Das unten rechts hereinlugende Maskottchen ([`(auth)/layout.tsx:31`](<../../../app/(auth)/layout.tsx>)) fährt heute einfach mit nach oben.

Neu: Es bekommt eine eigene Transition, die es **nach rechts** aus dem Bild schiebt — es verlässt die Bühne zur Seite, während der Hero nach oben geht. Gleiche Dauer wie der Hero (1000 ms), gleiche Kurve, damit die beiden Bewegungen als eine gelesen werden.

Dafür zieht das Maskottchen aus dem Layout in `AuthReveal` um: Nur dort liegt der `revealed`-State, der die Transition steuert. Das Layout ist eine Server-Component und kann keine Funktions-Props oder State übergeben.

Der bestehende `heroGone`-Timer, der den Karten-Peek erst nach 1000 ms einblendet, bleibt — er verhindert, dass kurz zwei Maskottchen sichtbar sind.

**Files:**
- Modify: `app/(auth)/layout.tsx:28-39` (Hero-Maskottchen entfällt), `:4` (Import)
- Modify: `components/auth/auth-reveal.tsx` (Hero-Maskottchen mit eigener Transition im Hero-Panel)

**Interfaces:**
- Consumes: `MascotPeek` aus `@/components/brand/mascot-peek` (in `auth-reveal.tsx` bereits importiert), `revealed`-State (lokal).
- Produces: nichts.

- [ ] **Step 1: Maskottchen aus dem Layout nehmen**

`app/(auth)/layout.tsx` wird zu:

```tsx
import { Logo } from "@/components/brand/logo";
import { BrandPanel } from "@/components/auth/brand-panel";
import { AuthReveal } from "@/components/auth/auth-reveal";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthReveal
      hero={
        <>
          {/* Logo oben, mit Abstand zur Notch/Statusleiste */}
          <div
            className="px-6 pt-6 md:px-10 md:pt-8"
            style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}
          >
            <Logo size="default" />
          </div>

          {/* Headline / Subline / Reframe mittig im Hero */}
          <div className="flex flex-1 items-center">
            <BrandPanel className="bg-none" />
          </div>
        </>
      }
    >
      {children}
    </AuthReveal>
  );
}
```

Das Hero-Maskottchen und der `MascotPeek`-Import entfallen hier — es wandert in Step 2 nach `AuthReveal`, weil nur dort der `revealed`-State liegt, der seine Ausfahrt steuert.

- [ ] **Step 2: Maskottchen mit eigener Transition im Hero-Panel rendern**

In `components/auth/auth-reveal.tsx`, im Hero-Panel direkt hinter `<div className="flex flex-1 flex-col">{hero}</div>`:

```tsx
        {/* Maskottchen lugt von unten rechts halb über den Bildschirmrand
            herein, gekippt, Blick nach links oben zur Headline. Es verlässt die
            Bühne beim Aufdecken NACH RECHTS, während der Hero nach oben geht —
            gleiche Dauer und Kurve, damit die beiden Bewegungen als eine
            gelesen werden.

            Tailwind v4: `translate-x-*` kompiliert zu der eigenständigen
            CSS-Property `translate`, nicht zu `transform`. Die Transition muss
            `translate` deshalb namentlich nennen, sonst springt die Position
            statt zu gleiten. */}
        <MascotPeek
          from="right"
          size="lg"
          rotate={-45}
          gazeX={0}
          gazeY={-3}
          expression="curious"
          className={cn(
            "pointer-events-none absolute bottom-0 right-0 -mb-3 -mr-12 z-10",
            "transition-[translate,opacity] duration-1000 ease-out",
            revealed ? "translate-x-[140%] opacity-0" : "translate-x-0 opacity-100",
          )}
        />
```

`translate-x-[140%]` statt `translate-x-full`: Das Maskottchen sitzt durch `-mr-12` schon halb außerhalb, aber `100 %` der eigenen Breite reicht bei der `-45°`-Drehung nicht sicher über die Kante — 140 % räumt es zuverlässig aus dem Bild.

`MascotPeek` muss `className` durchreichen; das tut es bereits (der Karten-Peek weiter unten in derselben Datei nutzt es). Falls `MascotPeek` eine eigene Transform-Klasse setzt, die mit `translate-x-*` kollidiert, das dortige `className`-Merging prüfen — `cn()` löst Tailwind-Konflikte, aber nicht Konflikte zwischen `translate` und einem inline gesetzten `transform`.

- [ ] **Step 3: Gates laufen lassen**

Run: `npx tsc --noEmit; if ($?) { npm run gate }; if ($?) { npm run build }`
Expected: alle drei ohne Fehler. Das Motion-Gate muss still bleiben — die Transition nennt `translate`, nicht `transform`.

- [ ] **Step 4: Am Gerät prüfen und committen**

`/signup` als installierte PWA öffnen und nach oben wischen:

- Das Maskottchen gleitet **nach rechts** aus dem Bild, während der Hero nach oben geht. Es darf nicht springen (das wäre der Tailwind-v4-Footgun) und nicht mit nach oben fahren.
- Beide Bewegungen enden gleichzeitig (1000 ms).
- Es sind zu keinem Zeitpunkt zwei Maskottchen gleichzeitig sichtbar — der Karten-Peek erscheint erst nach 1000 ms (`heroGone`).
- Reduced motion aktiviert: Der Gate entfällt komplett (`gated = !reduced && pathname === "/signup"`), Hero und Karte stehen untereinander; das Hero-Maskottchen wird dann nicht gerendert. Prüfen, dass dabei nichts fehlt oder doppelt ist.

```bash
git add "app/(auth)/layout.tsx" components/auth/auth-reveal.tsx
git commit -m "feat(auth): Hero-Maskottchen wischt nach rechts von der Buehne

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```
