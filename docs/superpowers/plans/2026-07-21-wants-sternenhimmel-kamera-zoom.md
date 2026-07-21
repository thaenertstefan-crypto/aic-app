# Wants-Sternenhimmel — Kamera-Push in den Stern — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Wants-Fokus so umbauen, dass sich das Öffnen als Kamera-Push in den getippten Stern liest (Parallaxe statt Stern-fliegt-zur-Mitte) und der Hintergrund ein gedimmter, lebendiger Sternenhimmel statt einer Aubergine-Milchglas-Fläche ist.

**Architecture:** Der Fokus lebt weiter in der per Portal an `document.body` gerenderten, scroll-gesperrten Ebene. Ein Ziel-Punkt P (Bildschirm-Position des getippten Sterns) trägt die Parallaxe: reale Karte, Fokus-Himmel und der eine Stern wachsen beim Öffnen von P aus nach außen; der Rückflug kehrt das um. Der opake Milchglas-Layer wird durch einen neuen, wiederverwendbaren `FocusSky`-Baustein ersetzt (solide gedimmte Kopie der `SkyBackdrop`-Sprache, kein `backdrop-filter`).

**Tech Stack:** Next.js 16 (App Router, Client Component), React 19, GSAP, TailwindCSS v4, globale `sky-light`-Klassen aus `app/globals.css`.

## Global Constraints

- **Kein Test-Framework.** Verifikation pro Task = `npx tsc --noEmit`, `npm run lint`, `npm run gate` (Kontrast + Typo + Motion), `npm run build`. Die Gate-Ausgaben SIND die Test-Evidenz; es gibt keine Unit-Tests zu schreiben.
- **Tailwind-v4-Transform-Footgun:** GSAP-getriebene Elemente (`mapRef`, `layerRef`) dürfen **keine** `scale-*` / `translate-*` / `rotate-*`-Utilities in ihrem `className` tragen — die kompilieren in v4 zu eigenen CSS-Properties und kollidieren mit der von GSAP geschriebenen `transform`-Matrix. Nur Layout-/Farb-Klassen.
- **Occlusion-Garantie:** Die Fokus-Himmel-Ebene (`layerRef`) geht **nie unter Scale 1** (Hinflug 1.35 → 1, Rückflug 1 → 1.35). Aufskalieren eines `inset-0`-Layers deckt immer mehr ab — Nav + verblasste Karte bleiben verdeckt.
- **`prefers-reduced-motion`:** harter Schnitt ohne Flug und ohne Scale (Himmel sofort `opacity:1, scale:1`, Stern in Ruheposition, Inhalt sofort sichtbar).
- **Ruhezustand unverändert:** Stern oben-mittig, Titel, Beschreibung, Bearbeiten-Button, Ansehen/Bearbeiten/Löschen, Persistenz beim Parent — nichts davon ändert sich.
- **Deutsche UI-Sprache**, warmer „du"-Ton. Neue Prosa in diesem Change ist minimal; falls doch: typografische Anführung `„…"` = U+201E/U+201C, Gedankenstrich `—` = U+2014.
- **Mobile-first**, Zielviewport ~375px.
- **PowerShell-Commit-Gotchas:** keine inneren `"` in mehrzeiligen Commit-Messages (zerlegen unter PS 5.1 die Argumente → Heredoc `@'…'@` ohne innere `"`); Route-Group-Pfade beim `git add` quoten, weil PS die `(app)`-Klammern sonst als Gruppierung parst.

---

## File Structure

- **Create:** `app/(app)/me/wants/focus-sky.tsx` — neuer, rein dekorativer `FocusSky`-Baustein: solide gedimmte, sanft lebendige Kopie der Himmel-Sprache. Füllt seinen Container (`absolute inset-0`), ohne eigene Positionierung/Transform, damit er als Einheit mit `layerRef` skaliert.
- **Modify:** `app/(app)/me/wants/star-map.tsx` — (Task 2) opaken Layer durch `<FocusSky />` ersetzen; (Task 3) Parallax-Push-Choreografie in `zoomIn`-Effekt und `zoomOut` ergänzen, Karten-lokalen Ursprung erfassen.

---

### Task 1: `FocusSky`-Baustein (gedimmter, lebendiger Himmel)

**Files:**
- Create: `app/(app)/me/wants/focus-sky.tsx`

**Interfaces:**
- Consumes: globale CSS-Klassen `sky-light` / `sky-light-twinkle` (aus `app/globals.css`).
- Produces: `export function FocusSky(): JSX.Element` — keine Props. Rendert `absolute inset-0` mit opaker `bg-background`-Basis, gemaltem Abdunkel-Wash und gedimmten, funkelnden Sternen. Wird in Task 2 als Kind von `layerRef` gerendert.

- [ ] **Step 1: Datei anlegen**

Create `app/(app)/me/wants/focus-sky.tsx`:

```tsx
/**
 * Gedimmter, lebendiger Nachthimmel als Hintergrund des Wants-Fokus.
 *
 * Eine tief abgedunkelte, opake Kopie der SkyBackdrop-Sprache: solide
 * bg-background-Basis (verdeckt Nav + verblasste Karte), darüber der gemalte
 * Abdunkel-Wash und eine Handvoll leise funkelnder Sterne. Rein gemalte
 * Gradienten + Spans, kein backdrop-filter (Glass-Is-Rare, iOS-freundlich).
 *
 * Ohne eigene Positionierung/Transform (nur inset-0-Füllung), damit die
 * Fokus-Ebene den ganzen Himmel als eine Einheit skalieren kann (Parallax-Push).
 * Sanft lebendig: die Sterne behalten ihre Twinkle-Klassen, insgesamt tiefer
 * gedimmt als die Sternenkarte, damit Titel + Text die Bühne behalten.
 */
export function FocusSky() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-background">
      {/* Abdunkel-Wash nach oben — wie SkyBackdrop, etwas tiefer gezogen. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.28) 20%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.04) 58%, transparent 72%)",
        }}
      />
      {/* Gedimmte, leise funkelnde Sterne (SkyBackdrop-Sprache, tiefer gedimmt). */}
      <div className="absolute inset-0" style={{ opacity: 0.55 }}>
        <span className="sky-light sky-light-twinkle absolute left-[14%] top-[16%]" />
        <span
          className="sky-light sky-light-twinkle absolute right-[18%] top-[10%]"
          style={{ animationDelay: "1.6s" }}
        />
        <span className="sky-light absolute left-[8%] top-[30%]" style={{ opacity: 0.3 }} />
        <span
          className="sky-light sky-light-twinkle absolute right-[12%] top-[24%]"
          style={{ animationDelay: "0.8s" }}
        />
        <span
          className="sky-light sky-light-twinkle absolute left-[40%] top-[8%]"
          style={{ animationDelay: "2.3s" }}
        />
        <span className="sky-light absolute right-[36%] top-[40%]" style={{ opacity: 0.3 }} />
        <span
          className="sky-light sky-light-twinkle absolute left-[24%] top-[54%]"
          style={{ animationDelay: "2.9s" }}
        />
        <span
          className="sky-light sky-light-twinkle absolute right-[26%] top-[62%]"
          style={{ animationDelay: "4.2s" }}
        />
        <span className="sky-light absolute left-[68%] top-[48%]" style={{ opacity: 0.3 }} />
        <span
          className="sky-light sky-light-twinkle absolute left-[80%] top-[30%]"
          style={{ animationDelay: "3.7s" }}
        />
        <span
          className="sky-light sky-light-twinkle absolute left-[12%] top-[74%]"
          style={{ animationDelay: "1.9s" }}
        />
        <span className="sky-light absolute right-[10%] top-[80%]" style={{ opacity: 0.3 }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verifikation**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

Run: `npm run lint`
Expected: keine neuen Fehler in `app/(app)/me/wants/focus-sky.tsx` (vorbestehende Warnungen in anderen Dateien wie `evaluation-form.tsx` ignorieren).

Run: `npm run gate`
Expected: PASS (Kontrast + Typo + Motion) — die Datei nutzt keine `transition-[…transform…]`-Kombination.

Run: `npm run build`
Expected: erfolgreicher Build.

- [ ] **Step 3: Commit**

```
git add "app/(app)/me/wants/focus-sky.tsx"
```
Commit-Message (Heredoc, keine inneren `"`):
```
feat(wants): FocusSky — gedimmter lebendiger Himmel als Fokus-Hintergrund

Solide, tief gedimmte Kopie der SkyBackdrop-Sprache (opake Basis, gemalter
Wash, leise funkelnde Sterne). Kein backdrop-filter. Wird in der Fokus-Ebene
als eine Einheit skaliert.
```

---

### Task 2: Opaken Milchglas-Layer durch `FocusSky` ersetzen

**Files:**
- Modify: `app/(app)/me/wants/star-map.tsx`

**Interfaces:**
- Consumes: `FocusSky` aus `./focus-sky` (Task 1).
- Produces: keine Signatur-Änderung. `layerRef` bleibt die fixe, opacity-getweente Fokus-Ebene; ihr Inhalt ist jetzt `<FocusSky />` statt einer `bg-background/95 backdrop-blur-xl`-Fläche. Keine Scale/Parallaxe in diesem Task — nur der Hintergrund-Tausch (fade wie im Bestand).

- [ ] **Step 1: Import ergänzen**

In `app/(app)/me/wants/star-map.tsx`, direkt nach den bestehenden lokalen Imports (die Zeile `import type { WantItem } from "@/lib/types/db-json";` bleibt zuletzt), den `FocusSky`-Import einfügen. Konkret die Import-Gruppe so, dass diese Zeile vorhanden ist:

```tsx
import { FocusSky } from "./focus-sky";
```

Platzierung: unmittelbar vor `import type { WantItem } from "@/lib/types/db-json";`.

- [ ] **Step 2: Layer-Markup ersetzen**

Ersetze den bestehenden okkludierenden Layer-Block:

```tsx
            {/* Okkludierender Himmel-Hintergrund (verdeckt Nav + verblasste Karte) */}
            <div
              ref={layerRef}
              className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl"
              style={{ opacity: 0 }}
              aria-hidden="true"
            />
```

durch:

```tsx
            {/* Okkludierender gedimmter Sternenhimmel (verdeckt Nav + verblasste
                Karte). Skaliert in Task 3 als Einheit für den Parallax-Push. */}
            <div
              ref={layerRef}
              className="fixed inset-0 z-[60]"
              style={{ opacity: 0 }}
              aria-hidden="true"
            >
              <FocusSky />
            </div>
```

- [ ] **Step 3: Verifikation**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

Run: `npm run lint`
Expected: keine neuen Fehler in `star-map.tsx`.

Run: `npm run gate`
Expected: PASS.

Run: `npm run build`
Expected: erfolgreicher Build.

- [ ] **Step 4: Commit**

```
git add "app/(app)/me/wants/star-map.tsx"
```
Commit-Message:
```
refactor(wants): Fokus-Hintergrund von Aubergine-Milchglas zu FocusSky

Opaken bg-background/95 backdrop-blur-xl-Layer durch den gedimmten
FocusSky-Himmel ersetzt. Kein backdrop-filter mehr. Fade-Verhalten
unveraendert; Parallaxe folgt im naechsten Schritt.
```

---

### Task 3: Parallax-Push-Choreografie

**Files:**
- Modify: `app/(app)/me/wants/star-map.tsx`

**Interfaces:**
- Consumes: `layerRef`, `mapRef`, `flyStarRef`, `originRef`, `target()`, `FOCUS_STAR_SIZE`, `reduced` (alle bestehend).
- Produces: neuer Ref `mapOriginRef` (Karten-lokaler Ursprung); `zoomIn` erfasst ihn; der Öffnungs-Effekt skaliert Karte (auf, Ursprung am Stern) und Fokus-Himmel (von P aus einsettelnd); `zoomOut` kehrt beides um und setzt die Karten-Transform zurück.

- [ ] **Step 1: `mapOriginRef` deklarieren**

Direkt nach der bestehenden Zeile

```tsx
  const originRef = useRef<{ x: number; y: number; size: number } | null>(null);
```

einfügen:

```tsx
  // Karten-lokaler Ursprung (Sternposition relativ zur oberen linken Kartenecke)
  // — Transform-Ursprung für den Auf-Zoom der realen Karte.
  const mapOriginRef = useRef<{ x: number; y: number } | null>(null);
```

- [ ] **Step 2: `zoomIn` — Karten-lokalen Ursprung erfassen**

Ersetze die bestehende `zoomIn`-Funktion:

```tsx
  function zoomIn(want: WantItem, el: HTMLElement) {
    if (focusedId) return;
    const r = el.getBoundingClientRect();
    // Sichtbare Sterngröße (svg), nicht die 44px-Tap-Fläche des Buttons.
    const size = want.distance === "fern" ? 14 : 24;
    originRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, size };
    setMode("view");
    setConfirmDelete(false);
    setFocusError(null);
    setFocusedId(want.id);
  }
```

durch:

```tsx
  function zoomIn(want: WantItem, el: HTMLElement) {
    if (focusedId) return;
    const r = el.getBoundingClientRect();
    // Sichtbare Sterngröße (svg), nicht die 44px-Tap-Fläche des Buttons.
    const size = want.distance === "fern" ? 14 : 24;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    originRef.current = { x: cx, y: cy, size };
    // Sternposition relativ zur Karte — Ursprung für den Karten-Auf-Zoom.
    const mapRect = mapRef.current?.getBoundingClientRect();
    mapOriginRef.current = mapRect ? { x: cx - mapRect.left, y: cy - mapRect.top } : null;
    setMode("view");
    setConfirmDelete(false);
    setFocusError(null);
    setFocusedId(want.id);
  }
```

- [ ] **Step 3: Öffnungs-Effekt — Karte auf-zoomen + Himmel von P aus einsetteln**

Ersetze den bestehenden Öffnungs-Effekt (der `useEffect`, der mit `if (!focusedId) return;` beginnt und den `mapRef`-Fade, `gsap.set(fly, …)`, `fromTo(fly, …)` und den `contentVisible`-Timeout enthält):

```tsx
  // Kamerafahrt beim Öffnen: Stern fliegt vom Ursprung in die Mitte, Karte fadet.
  useEffect(() => {
    if (!focusedId) return;
    const layer = layerRef.current;
    const fly = flyStarRef.current;
    const origin = originRef.current;

    if (mapRef.current) {
      gsap.to(mapRef.current, {
        opacity: 0,
        duration: reduced ? 0 : 0.35,
        ease: "power2.out",
      });
    }
    if (!layer || !fly) return;

    gsap.set(fly, { xPercent: -50, yPercent: -50 });

    if (reduced || !origin) {
      gsap.set(fly, { x: 0, y: 0, scale: 1, opacity: 1 });
      gsap.set(layer, { opacity: 1 });
      setContentVisible(true);
      return;
    }

    const { x: tx, y: ty } = target();
    gsap.set(layer, { opacity: 0 });
    gsap.fromTo(
      fly,
      { x: origin.x - tx, y: origin.y - ty, scale: origin.size / FOCUS_STAR_SIZE, opacity: 1 },
      { x: 0, y: 0, scale: 1, duration: 0.6, ease: "power2.inOut" },
    );
    gsap.to(layer, { opacity: 1, duration: 0.4, delay: 0.25, ease: "power2.out" });
    const t = window.setTimeout(() => setContentVisible(true), 350);
    return () => window.clearTimeout(t);
  }, [focusedId, reduced]);
```

durch:

```tsx
  // Kamera-Push beim Öffnen: alle drei Ebenen wachsen von P (Tap-Punkt) nach außen
  // — reale Karte schiebt auf + fadet, Fokus-Himmel settelt von P aus ein, der eine
  // Stern wächst in die Fokus-Position. Reduced motion: harter Schnitt ohne Scale.
  useEffect(() => {
    if (!focusedId) return;
    const layer = layerRef.current;
    const fly = flyStarRef.current;
    const origin = originRef.current;
    const mapOrigin = mapOriginRef.current;

    // Reale Karte: fadet aus und schiebt leicht auf (Ursprung am getippten Stern)
    // → Nachbarsterne driften nach außen, erster Moment des Reinfliegens.
    if (mapRef.current) {
      if (reduced || !mapOrigin) {
        gsap.to(mapRef.current, { opacity: 0, duration: reduced ? 0 : 0.35, ease: "power2.out" });
      } else {
        gsap.set(mapRef.current, { transformOrigin: `${mapOrigin.x}px ${mapOrigin.y}px` });
        gsap.to(mapRef.current, { opacity: 0, scale: 1.15, duration: 0.35, ease: "power2.out" });
      }
    }
    if (!layer || !fly) return;

    gsap.set(fly, { xPercent: -50, yPercent: -50 });

    if (reduced || !origin) {
      gsap.set(fly, { x: 0, y: 0, scale: 1, opacity: 1 });
      gsap.set(layer, { opacity: 1, scale: 1 });
      setContentVisible(true);
      return;
    }

    const { x: tx, y: ty } = target();

    // Fokus-Himmel: taucht von P aus ein — startet vergrößert am Tap-Punkt und
    // settelt auf Scale 1, während er auffadet. Scale bleibt ≥ 1 → volle Occlusion.
    gsap.set(layer, { transformOrigin: `${origin.x}px ${origin.y}px` });
    gsap.fromTo(
      layer,
      { opacity: 0, scale: 1.35 },
      { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" },
    );

    gsap.fromTo(
      fly,
      { x: origin.x - tx, y: origin.y - ty, scale: origin.size / FOCUS_STAR_SIZE, opacity: 1 },
      { x: 0, y: 0, scale: 1, duration: 0.6, ease: "power2.inOut" },
    );
    // Inhalt erscheint, wenn der Push weitgehend gesettelt ist.
    const t = window.setTimeout(() => setContentVisible(true), 420);
    return () => window.clearTimeout(t);
  }, [focusedId, reduced]);
```

- [ ] **Step 4: `zoomOut` — Push umkehren + Karten-Transform zurücksetzen**

Ersetze die bestehende `zoomOut`-Funktion:

```tsx
  function zoomOut() {
    setContentVisible(false);
    setMode("view");
    setConfirmDelete(false);
    setFocusError(null);
    const fly = flyStarRef.current;
    const layer = layerRef.current;
    const origin = originRef.current;

    if (reduced) {
      if (mapRef.current) gsap.set(mapRef.current, { opacity: 1 });
      setFocusedId(null);
      return;
    }
    if (fly && origin) {
      const { x: tx, y: ty } = target();
      gsap.to(fly, {
        x: origin.x - tx,
        y: origin.y - ty,
        scale: origin.size / FOCUS_STAR_SIZE,
        duration: 0.5,
        ease: "power2.inOut",
      });
    }
    if (layer) gsap.to(layer, { opacity: 0, duration: 0.4, ease: "power2.out" });
    if (mapRef.current) {
      gsap.to(mapRef.current, { opacity: 1, duration: 0.5, delay: 0.15, ease: "power2.out" });
    }
    window.setTimeout(() => setFocusedId(null), 500);
  }
```

durch:

```tsx
  function zoomOut() {
    setContentVisible(false);
    setMode("view");
    setConfirmDelete(false);
    setFocusError(null);
    const fly = flyStarRef.current;
    const layer = layerRef.current;
    const origin = originRef.current;

    if (reduced) {
      if (mapRef.current) gsap.set(mapRef.current, { opacity: 1, scale: 1 });
      setFocusedId(null);
      return;
    }
    if (fly && origin) {
      const { x: tx, y: ty } = target();
      gsap.to(fly, {
        x: origin.x - tx,
        y: origin.y - ty,
        scale: origin.size / FOCUS_STAR_SIZE,
        duration: 0.5,
        ease: "power2.inOut",
      });
    }
    // Fokus-Himmel zieht sich zu P zusammen (Umkehr des Push) und fadet aus.
    if (layer) gsap.to(layer, { opacity: 0, scale: 1.35, duration: 0.5, ease: "power2.in" });
    // Reale Karte fadet zurück und setzt ihren Auf-Zoom zurück.
    if (mapRef.current) {
      gsap.to(mapRef.current, { opacity: 1, scale: 1, duration: 0.5, delay: 0.15, ease: "power2.out" });
    }
    window.setTimeout(() => setFocusedId(null), 500);
  }
```

- [ ] **Step 5: Verifikation**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

Run: `npm run lint`
Expected: keine neuen Fehler in `star-map.tsx`.

Run: `npm run gate`
Expected: PASS. Insbesondere Motion-Gate PASS — `mapRef`/`layerRef` tragen keine `scale-*`/`translate-*`-Utilities, GSAP schreibt `transform` direkt.

Run: `npm run build`
Expected: erfolgreicher Build.

- [ ] **Step 6: Commit**

```
git add "app/(app)/me/wants/star-map.tsx"
```
Commit-Message:
```
feat(wants): Parallax-Push in den Stern statt Flug zur Mitte

Beim Oeffnen wachsen Karte, Fokus-Himmel und Stern vom Tap-Punkt aus nach
aussen (Kamera taucht in die Stelle); zoomOut kehrt es um und setzt die
Karten-Transform zurueck. Himmel-Scale bleibt >= 1 (volle Occlusion).
Reduced motion: harter Schnitt ohne Scale.
```

---

## Self-Review (vom Plan-Autor durchgeführt)

- **Spec-Abdeckung:** (1) Kamera-Push → Task 3 (drei Ebenen wachsen von P). (2) Gedimmter lebendiger Himmel statt Aubergine-Glas → Task 1 (`FocusSky`) + Task 2 (Einbau). Occlusion-Garantie, Reduced-Motion, Tailwind-Footgun → in Task 3 + Global Constraints. Ruhezustand unberührt → keine Änderung an View/Edit-Markup. ✅
- **Platzhalter:** keine — jeder Code-Step enthält vollständigen Code. ✅
- **Typ-Konsistenz:** `mapOriginRef` (`{x,y}|null`) in Step 1 deklariert, in Step 2 geschrieben, in Step 3 gelesen. `originRef`/`target()`/`FOCUS_STAR_SIZE`/`reduced` bestehend. ✅
- **Reihenfolge/Zwischenzustände:** Task 2 ist für sich korrekt (Fokus funktioniert, nur ohne Scale). Task 3 baut Parallaxe additiv darauf. Reviewer kann jeden Task einzeln abnehmen/ablehnen. ✅
