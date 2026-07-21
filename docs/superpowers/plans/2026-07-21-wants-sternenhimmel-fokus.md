# Wants-Sternenhimmel — Kopf-Feinschliff & Fokus-Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Kopf der Wants-Seite entdichten und den Stern-Fokus so umbauen, dass er sich anfühlt, als gäbe es nur diesen einen Stern — scroll-gesperrt, ohne Doppelung, mit inline-Bearbeiten statt Dialog; das aktiv/erloschen-Konzept fällt komplett weg.

**Architecture:** Der Fokus wird eine per React-Portal an `document.body` gerenderte, fixe, scroll-gesperrte Ebene, die über der Bottom-Nav liegt. Beim Tap fliegt **ein** Stern (FLIP: von seinem Screen-Rechteck in die Bildmitte) auf Held-Größe, während die restliche Karte komplett ausfadet. Bearbeiten passiert inline in derselben Ebene (kein separater Dialog mehr).

**Tech Stack:** Next.js 16 App Router (Client Component), React 19 (`createPortal`), GSAP (bereits im Repo), TailwindCSS v4, shadcn/ui.

## Global Constraints

- **Alle Nutzertexte Deutsch**, warmer „du"-Ton.
- **Deutsche Typografie:** in gerendertem Text `„…"` = U+201E/U+201C, Gedankenstrich `—` (U+2014). (Typo-Gate prüft gerenderten Text.)
- **Mobile-first**, Ziel-Viewport ~375px.
- **Tailwind v4 Footgun:** `translate-`/`scale-`/`rotate-` kompilieren zu eigenen CSS-Properties. Wo bewegt wird, muss `transition-[…]` die bewegte Property nennen — hier irrelevant, weil Bewegung ausschließlich über GSAP (setzt `transform`/`x`/`y`/`scale` direkt), nicht über Tailwind-Transitions. **GSAP-animierte Elemente dürfen keine Tailwind-`-translate-x/y`-Utilities tragen** (GSAP überschreibt `transform`); Zentrierung stattdessen über `xPercent/yPercent`.
- **Kein Unit-Test-Harness.** Verifikations-Loop pro Task: `npx tsc --noEmit` → `npm run lint` → `npm run gate` → `npm run build`, plus die im Task genannten Beobachtungen (Stefan-iPhone-Gate am Live-Deploy).
- **Git:** solo, `main` ist Arbeitszweig; nach fertigem, funktionierendem Task committen (und ggf. pushen). Commit-Trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **PowerShell 5.1:** keine inneren `"` in mehrzeiligen Commit-Messages; Route-Group-Pfade `app/(app)/…` beim `git add` quoten.

---

## File Structure

- `app/(app)/me/wants/wants-me.tsx` — **Modify.** Kopf entdichten (Deko-Stern raus, neuer Untertitel); Edit-Dialog + `toggleActive` + `starZoomed`/`onZoomChange` raus; neue Callbacks `saveWantEdit`/`deleteWant` an `StarMap`.
- `app/(app)/me/wants/star-map.tsx` — **Modify (Kern-Umbau).** Portal-Fokus-Ebene, Scroll-Sperre, FLIP-Ein-Stern, Ansehen/Bearbeiten inline, aktiv/erloschen-Rendering raus, neues Prop-Interface.
- `lib/hooks/use-scroll-lock.ts` — **Create.** Kleiner Hook, der die Seite hinter dem Fokus scroll-sperrt.

---

## Task 1: Kopf der Wants-Seite entdichten

**Files:**
- Modify: `app/(app)/me/wants/wants-me.tsx`

**Interfaces:**
- Consumes: nichts Neues.
- Produces: nichts, das spätere Tasks brauchen (rein visuell/Copy).

Der Held-Block zeigt heute `StarArt` über dem Titel plus einen Untertitel, der zwei Bedeutungen vermischt. Deko-Stern raus, Untertitel vereinheitlichen.

- [ ] **Step 1: Deko-Stern aus dem Held-Block entfernen**

In `app/(app)/me/wants/wants-me.tsx` den Held-Block (aktuell um Zeile 229–239) so ändern — die `StarArt`-Zeile entfällt und der Untertitel wird ersetzt:

```tsx
                    <Reveal delay={0}>
                      <div className="flex flex-col items-center gap-3 pb-2 text-center">
                        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                          {PAGE_TITLES.meWantsHero}
                        </h2>
                        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                          Nahe Freuden, ferne Ziele — dein eigener Himmel.
                        </p>
                      </div>
                    </Reveal>
```

- [ ] **Step 2: Ungenutzte Imports/Variablen aufräumen**

`StarArt` wird jetzt nirgends mehr in der Datei genutzt → den Import entfernen:

```tsx
// ENTFERNEN:
import { StarArt } from "@/components/brand/star-art";
```

`reduced` (aus `useReducedMotion`) wurde nur von `StarArt animate={!reduced}` genutzt. Prüfen, ob `reduced` sonst noch vorkommt (Suche in der Datei). Falls nicht, `const reduced = useReducedMotion();` **und** den Import `useReducedMotion` entfernen. Falls doch noch genutzt: beide behalten.

- [ ] **Step 3: Verifizieren**

```bash
npx tsc --noEmit && npm run lint && npm run gate
```

Erwartet: tsc ohne Fehler; lint ohne `no-unused-vars` zu `StarArt`/`reduced`; Gate `PASS` (Typo-Gate akzeptiert den `—`-Gedankenstrich, keine ASCII-Quotes im neuen Satz).

- [ ] **Step 4: Build**

```bash
npm run build
```

Erwartet: erfolgreicher Build. (Falls `.next`-Geister-Typen: `rm -rf .next` und erneut.)

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/me/wants/wants-me.tsx"
git commit -F - <<'EOF'
refine(wants): Kopf entdichten — Deko-Stern raus, Untertitel vereinheitlicht

Nahe Freuden, ferne Ziele — dein eigener Himmel. Loest den Doppel-Header-
Eindruck und die vermischte Ziel/Freude-Bedeutung.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 2: Scroll-Lock-Hook

**Files:**
- Create: `lib/hooks/use-scroll-lock.ts`

**Interfaces:**
- Produces: `useScrollLock(active: boolean): void` — sperrt bei `active === true` das Seiten-Scrollen (setzt `document.body.style.overflow = "hidden"`), stellt beim Deaktivieren/Unmount den vorherigen Wert wieder her.

Bestehende Hooks liegen in `lib/hooks/` (z. B. `use-reduced-motion.ts`) — gleichem Muster folgen (`"use client"` nicht nötig, reiner Hook, wird von Client-Komponente importiert).

- [ ] **Step 1: Hook anlegen**

`lib/hooks/use-scroll-lock.ts`:

```ts
import { useEffect } from "react";

/**
 * Sperrt das Seiten-Scrollen, solange `active` true ist — für Vollbild-Overlays
 * (z. B. der Stern-Fokus), damit die Seite dahinter (inkl. sticky Bottom-Nav)
 * nicht mitscrollt. Stellt den vorherigen overflow-Wert beim Verlassen wieder her.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
```

- [ ] **Step 2: Verifizieren**

```bash
npx tsc --noEmit && npm run lint
```

Erwartet: keine Fehler. (Noch ungenutzt — der Import folgt in Task 3; kein `no-unused`-Problem, da nur eine exportierte Funktion.)

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-scroll-lock.ts
git commit -F - <<'EOF'
feat(hooks): useScrollLock — Seiten-Scroll fuer Vollbild-Overlays sperren

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 3: Fokus als scroll-gesperrte Portal-Ebene mit FLIP-Ein-Stern + Inline-Bearbeiten

**Files:**
- Modify: `app/(app)/me/wants/star-map.tsx` (Kern-Umbau)
- Modify: `app/(app)/me/wants/wants-me.tsx` (Wiring: neue Callbacks, Edit-Dialog + `toggleActive` + `starZoomed` raus)

**Interfaces:**
- Consumes: `useScrollLock(active: boolean)` aus `@/lib/hooks/use-scroll-lock` (Task 2).
- Produces: neues `StarMap`-Prop-Interface:
  ```ts
  StarMap({
    wants: WantItem[];
    onSaveEdit: (id: string, patch: { title: string | null; text: string }) => void;
    onDelete: (id: string) => void;
  })
  ```
  Die alten Props `onEdit`, `onToggleActive`, `onZoomChange` entfallen ersatzlos.

Dies ist der große, atomare Umbau: Das Interface ändert sich über beide Dateien, deshalb landen sie zusammen. Reihenfolge: erst `star-map.tsx` komplett ersetzen, dann `wants-me.tsx` anpassen, dann gemeinsam verifizieren.

- [ ] **Step 1: `star-map.tsx` komplett ersetzen**

Ganze Datei `app/(app)/me/wants/star-map.tsx` durch diese Fassung ersetzen:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Pencil, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mascot } from "@/components/brand/mascot";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
import { getValueLabel } from "@/lib/utils/values-bank";
import { cn } from "@/lib/utils";
import type { WantItem } from "@/lib/types/db-json";

/**
 * Die Sternenkarte: alle Wants als benannte Sterne an stabilen Positionen
 * (Slot-Leiter + ID-Hash), Tiefe rein über die Darstellung (fern = kleiner/
 * gedimmter/Dunst). Tipp auf einen Stern → GSAP-FLIP: genau dieser Stern fliegt
 * in die Bildmitte, während die restliche Karte komplett ausfadet — es bleibt
 * physisch nur ein Stern. Der Fokus lebt in einer per Portal an document.body
 * gerenderten, fixen, scroll-gesperrten Ebene über der Bottom-Nav (volle
 * Immersion). Ansehen + Bearbeiten passieren inline in dieser Ebene; Persistenz
 * bleibt beim Parent (wants-me). Reduced motion: harter Wechsel ohne Flug.
 */

/** 4-strahliger Stern — die von der Werte-Szene freigegebene Sprache. */
const STAR_PATH = "M8 0 L9.8 6.2 L16 8 L9.8 9.8 L8 16 L6.2 9.8 L0 8 L6.2 6.2 Z";

const VIEW_W = 360;
const ROW_H = 96;
const TOP_PAD = 60;
const BOTTOM_PAD = 130; // Platz für das Maskottchen unten links

/** Fokus-Stern: Held-Größe (px) und vertikale Zielposition (Anteil der Höhe). */
const FOCUS_STAR_SIZE = 64;
const FOCUS_STAR_TOP = 0.26;

/** Hintergrund-Funkelsterne als Anteile der Szene (x/y in 0–1). */
const MICRO_STARS: { fx: number; fy: number; r: number }[] = [
  { fx: 0.06, fy: 0.06, r: 1.1 }, { fx: 0.92, fy: 0.1, r: 0.9 },
  { fx: 0.5, fy: 0.16, r: 0.8 }, { fx: 0.1, fy: 0.34, r: 1.0 },
  { fx: 0.9, fy: 0.42, r: 1.2 }, { fx: 0.06, fy: 0.62, r: 0.9 },
  { fx: 0.94, fy: 0.72, r: 1.0 }, { fx: 0.55, fy: 0.88, r: 1.1 },
];

/** Stabiler Hash 0..1 aus einem String — gleicher Himmel bei jedem Besuch. */
function hash01(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

/** 26-Zeichen-Kürzung mit „…“ — hält Kartenlabels bei jeder Eingabelänge kurz. */
function clip26(s: string): string {
  return s.length > 26 ? `${s.slice(0, 25).trimEnd()}…` : s;
}

/** Voller Name eines Sterns: Titel, sonst die Beschreibung (Bestandsdaten ohne
 *  title). Für die Detailansicht, wo Platz ist — hier NICHT kürzen. */
export function starName(w: WantItem): string {
  const t = w.title?.trim();
  return t ? t : w.text.trim();
}

/** Kartenlabel: wie starName, aber durch dieselbe 26-Zeichen-Kürzung, damit
 *  lange Titel (Input erlaubt bis zu 60 Zeichen) den engen Slot nicht sprengen. */
export function starLabel(w: WantItem): string {
  return clip26(starName(w));
}

type PlacedStar = { want: WantItem; x: number; y: number; side: "left" | "right" };

/** Slot-Leiter: nah und fern abwechselnd von oben nach unten, links/rechts
 *  versetzt; der ID-Hash gibt jedem Stern einen stabilen Versatz im Slot. */
function layoutStars(wants: WantItem[]): { stars: PlacedStar[]; viewH: number } {
  const nah = wants.filter((w) => w.distance !== "fern");
  const fern = wants.filter((w) => w.distance === "fern");
  const ordered: WantItem[] = [];
  for (let i = 0; i < Math.max(nah.length, fern.length); i++) {
    if (i < fern.length) ordered.push(fern[i]);
    if (i < nah.length) ordered.push(nah[i]);
  }
  const stars = ordered.map((want, i) => {
    const side: "left" | "right" = i % 2 === 0 ? "left" : "right";
    const baseX = side === "left" ? 96 : 264;
    return {
      want,
      x: baseX + (hash01(want.id) - 0.5) * 56,
      y: TOP_PAD + i * ROW_H + (hash01(`${want.id}y`) - 0.5) * 36,
      side,
    };
  });
  const viewH = Math.max(430, TOP_PAD + ordered.length * ROW_H + BOTTOM_PAD);
  return { stars, viewH };
}

export function StarMap({
  wants,
  onSaveEdit,
  onDelete,
}: {
  wants: WantItem[];
  onSaveEdit: (id: string, patch: { title: string | null; text: string }) => void;
  onDelete: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [contentVisible, setContentVisible] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");

  const mapRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const flyStarRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<{ x: number; y: number; size: number } | null>(null);

  // Portal erst nach Mount (kein document auf dem Server).
  useEffect(() => setMounted(true), []);
  // Seite hinter dem Fokus scroll-sperren.
  useScrollLock(focusedId !== null);

  const { stars, viewH } = layoutStars(wants);
  const focused = wants.find((w) => w.id === focusedId) ?? null;

  // Ziel des Fokus-Sterns: horizontal zentriert, vertikal bei FOCUS_STAR_TOP.
  function target() {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight * FOCUS_STAR_TOP,
    };
  }

  function zoomIn(want: WantItem, el: HTMLElement) {
    if (focusedId) return;
    const r = el.getBoundingClientRect();
    // Sichtbare Sterngröße (svg), nicht die 44px-Tap-Fläche des Buttons.
    const size = want.distance === "fern" ? 14 : 24;
    originRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, size };
    setMode("view");
    setConfirmDelete(false);
    setFocusedId(want.id);
  }

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

  function zoomOut() {
    setContentVisible(false);
    setMode("view");
    setConfirmDelete(false);
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

  function enterEdit() {
    if (!focused) return;
    setEditTitle(focused.title ?? "");
    setEditText(focused.text);
    setConfirmDelete(false);
    setMode("edit");
  }

  function saveEdit() {
    if (!focused) return;
    const t = editText.trim();
    if (!t) return;
    onSaveEdit(focused.id, { title: editTitle.trim() ? editTitle.trim() : null, text: t });
    setMode("view");
  }

  function handleDelete() {
    if (!focused) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const id = focused.id;
    // Sanft ausblenden, dann persistieren. Der Parent remountet die Karte per
    // key={wants.length} → der Fokus setzt sich zurück (Stern ist ja weg).
    setContentVisible(false);
    const finish = () => onDelete(id);
    if (reduced || !layerRef.current) {
      finish();
      return;
    }
    gsap.to(layerRef.current, { opacity: 0, duration: 0.3, ease: "power2.out", onComplete: finish });
  }

  return (
    <div className="relative w-full" style={{ aspectRatio: `${VIEW_W} / ${viewH}` }}>
      {/* Die Sternenkarte (fadet beim Fokus komplett aus) */}
      <div ref={mapRef} className="absolute inset-0">
        <svg viewBox={`0 0 ${VIEW_W} ${viewH}`} className="absolute inset-0 size-full" aria-hidden="true">
          {MICRO_STARS.map((s, i) => (
            <circle
              key={i}
              cx={s.fx * VIEW_W}
              cy={s.fy * viewH}
              r={s.r}
              fill="var(--foreground)"
              className={reduced ? undefined : "star-twinkle"}
              style={reduced ? { opacity: 0.3 } : { animationDelay: `${(i % 5) * 0.7}s` }}
            />
          ))}
        </svg>

        {stars.map(({ want, x, y, side }, i) => {
          const fern = want.distance === "fern";
          return (
            <button
              key={want.id}
              type="button"
              onClick={(e) => zoomIn(want, e.currentTarget)}
              aria-label={`Stern ansehen: ${starLabel(want)}`}
              className="absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{ left: `${(x / VIEW_W) * 100}%`, top: `${(y / viewH) * 100}%` }}
            >
              {/* Dunst-Schleier hinter fernen Sternen */}
              {fern && (
                <span aria-hidden className="absolute size-8 rounded-full bg-foreground/10 blur-md" />
              )}
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className={cn(
                  "shrink-0",
                  fern ? "size-3.5 opacity-55" : "size-6",
                  !reduced && "want-star-twinkle",
                )}
                style={{
                  animationDelay: `${(i % 5) * 0.9}s`,
                  filter: `drop-shadow(0 0 ${fern ? 3 : 6}px color-mix(in srgb, var(--primary) ${fern ? 35 : 55}%, transparent))`,
                }}
              >
                <path d={STAR_PATH} fill="var(--primary)" />
              </svg>
              <span
                className={cn(
                  // max-w + truncate: lange Titel (bis 60 Zeichen erlaubt) können
                  // sonst über den Kartenrand laufen oder mit dem gegenüberliegenden
                  // Label kollidieren. „…" statt Overflow.
                  "absolute top-1/2 block max-w-[8rem] -translate-y-1/2 truncate font-heading",
                  side === "left" ? "left-full ml-1.5" : "right-full mr-1.5",
                  fern
                    ? "text-xs text-muted-foreground"
                    : "text-base font-semibold text-foreground",
                )}
              >
                {starLabel(want)}
              </span>
            </button>
          );
        })}

        {/* Maskottchen schaut von unten in den Himmel */}
        <div className="absolute bottom-1 left-1">
          <Mascot size="sm" expression="curious" gazeX={0.6} gazeY={-1.6} />
        </div>
      </div>

      {/* Fokus-Ebene: per Portal an document.body, fix, scroll-gesperrt, über der Nav */}
      {mounted &&
        focused &&
        createPortal(
          <>
            {/* Okkludierender Himmel-Hintergrund (verdeckt Nav + verblasste Karte) */}
            <div
              ref={layerRef}
              className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl"
              style={{ opacity: 0 }}
              aria-hidden="true"
            />

            {/* Zurück-zum-Himmel — leises Eck-Control oben links */}
            <button
              type="button"
              onClick={zoomOut}
              className={cn(
                "fixed left-3 z-[62] flex min-h-11 items-center text-sm text-muted-foreground transition-opacity duration-300 hover:text-foreground motion-reduce:transition-none",
                contentVisible ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
            >
              ← Zurück zum Himmel
            </button>

            {/* Der eine Stern (fliegt hier hinein, bleibt zentral) */}
            <div
              ref={flyStarRef}
              className="pointer-events-none fixed z-[62]"
              style={{ left: "50%", top: `${FOCUS_STAR_TOP * 100}vh` }}
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 16 16"
                className="size-16"
                style={{
                  filter: "drop-shadow(0 0 18px color-mix(in srgb, var(--primary) 80%, transparent))",
                }}
              >
                <path d={STAR_PATH} fill="var(--primary)" />
              </svg>
            </div>

            {/* Inhalt unter dem Stern (kein Karten-Kasten — schwebt auf dem Himmel) */}
            <div
              className={cn(
                "fixed inset-x-0 z-[61] flex justify-center px-6 text-center transition-opacity duration-300 motion-reduce:transition-none",
                contentVisible ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              style={{ top: `calc(${FOCUS_STAR_TOP * 100}vh + 3rem)`, bottom: 0 }}
            >
              <div className="flex w-full max-w-sm flex-col items-center gap-3 overflow-y-auto pt-4 pb-10">
                {mode === "view" ? (
                  <>
                    <h3 className="font-heading text-2xl font-semibold text-balance break-words text-foreground">
                      {starName(focused)}
                    </h3>
                    {focused.distance === "fern" && (
                      <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        Ferner Stern — nach ihm greifst du
                      </span>
                    )}
                    {focused.valueId && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <Sparkles className="size-3" />
                        nährt deinen Wert: {getValueLabel(focused.valueId)}
                      </span>
                    )}
                    <p className="w-full rounded-xl bg-foreground/5 p-4 text-left text-base leading-relaxed text-foreground backdrop-blur-sm">
                      {focused.text}
                    </p>
                    <Button variant="outline" className="mt-1 w-full gap-2" onClick={enterEdit}>
                      <Pencil className="size-4" /> Bearbeiten
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      maxLength={60}
                      placeholder="Name des Sterns (optional)"
                      aria-label="Name des Sterns"
                    />
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={4}
                      maxLength={300}
                      autoFocus
                      className="resize-y"
                      aria-label="Beschreibung des Sterns"
                    />
                    <div className="flex w-full gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setMode("view");
                          setConfirmDelete(false);
                        }}
                      >
                        Abbrechen
                      </Button>
                      <Button className="flex-1" onClick={saveEdit} disabled={!editText.trim()}>
                        Speichern
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full gap-2 text-destructive hover:text-destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="size-4" />
                      {confirmDelete ? "Wirklich löschen?" : "Stern löschen"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
```

- [ ] **Step 2: `wants-me.tsx` — Wiring anpassen**

**2a. State entschlacken.** Im `WantsMe`-Body die Edit-/Zoom-States entfernen. Diese Zeilen (aktuell ~49–58) —

```tsx
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addText, setAddText] = useState("");
  // Fokus-Zoom: steht ein Stern im Detail, tritt das umgebende Chrome zurück.
  const [starZoomed, setStarZoomed] = useState(false);
  // Löschen ist endgültig → ein zweiter Tap bestätigt (statt harter confirm()).
  const [confirmDelete, setConfirmDelete] = useState(false);
```

— ersetzen durch (nur die Add-States bleiben):

```tsx
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addText, setAddText] = useState("");
```

**2b. Handler ersetzen.** `startEdit`, `saveEdit`, `toggleActive` (aktuell ~99–143) entfernen und durch einen einzigen `saveWantEdit` ersetzen. `deleteWant` (aktuell ~145–147) bleibt unverändert:

```tsx
  function saveWantEdit(id: string, patch: { title: string | null; text: string }) {
    void persistWants(
      wants.map((w) => (w.id === id ? { ...w, title: patch.title, text: patch.text } : w)),
    );
  }

  function deleteWant(id: string) {
    void persistWants(wants.filter((w) => w.id !== id));
  }
```

(`addOwnStar` bleibt unverändert — schreibt weiter `active: true`.)

**2c. Held-Block.** War Task 1. Sicherstellen, dass er wie in Task 1 aussieht (kein `starZoomed`-Wrapper — der Block braucht die frühere `transition-opacity`/`starZoomed`-Umhüllung nicht mehr). Der Held-`<div>` (aktuell ~223–240) wird zu:

```tsx
                  <Reveal delay={0}>
                    <div className="flex flex-col items-center gap-3 pb-2 text-center">
                      <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                        {PAGE_TITLES.meWantsHero}
                      </h2>
                      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                        Nahe Freuden, ferne Ziele — dein eigener Himmel.
                      </p>
                    </div>
                  </Reveal>
```

**2d. `StarMap`-Aufruf.** Den Aufruf (aktuell ~248–254) ersetzen:

```tsx
                  <StarMap
                    key={wants.length}
                    wants={wants}
                    onSaveEdit={saveWantEdit}
                    onDelete={deleteWant}
                  />
```

**2e. CTA-Block ent-`starZoomed`-en.** Der Aktions-/Schmiede-Block (aktuell ~259–281) verliert die `starZoomed`-Opacity-Umhüllung:

```tsx
                  <div className="flex flex-col gap-3">
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
                    {forgeLink()}
                  </div>
```

**2f. Edit-Dialog entfernen.** Den gesamten `Dialog`-Block „Bearbeiten-Dialog: Stern umformulieren oder löschen" (aktuell ~285–336, von `<Dialog open={editingId !== null} …>` bis zum schließenden `</Dialog>`) **ersatzlos löschen**. Der „Eigener Stern"-Dialog darunter bleibt vollständig erhalten.

**2g. Ungenutzte Imports.** Prüfen und entfernen, falls jetzt ungenutzt: `Textarea`, `Input` (beide waren nur im Edit-Dialog + Add-Dialog — der Add-Dialog nutzt beide weiter, also **behalten**). `Pencil` war nicht importiert. Sicher entfernen lässt sich nichts pauschal — nach dem Edit ganz auf `tsc`/`lint` hören (Step 3). `StarArt` ist bereits in Task 1 raus.

- [ ] **Step 3: Verifizieren (tsc + lint + gate)**

```bash
npx tsc --noEmit && npm run lint && npm run gate
```

Erwartet: keine Typfehler; keine ungenutzten Imports/Variablen (`editingId`, `confirmDelete`, `starZoomed`, `setStarZoomed` etc. sind weg); Gate `PASS` (die neuen Fokus-Texte „Ferner Stern — nach ihm greifst du", „Stern löschen", „Wirklich löschen?", „Zurück zum Himmel" nutzen korrekten `—` und `„…"`, keine ASCII-Quotes).

- [ ] **Step 4: Build**

```bash
npm run build
```

Erwartet: erfolgreicher Build. (Bei `.next`-Geistern: `rm -rf .next` und erneut — **nicht** ins `.next` cd'en.)

- [ ] **Step 5: Verhaltens-Check (Dev-Server, Desktop-Vorprüfung)**

```bash
npm run dev
```

Auf `/me/wants` prüfen (Desktop-Vorprüfung; Stefans echtes Gate ist das iPhone):
- Tap auf einen Stern → **genau ein** Stern fliegt in die Mitte, die restliche Karte ist komplett weg (kein Geister-Himmel, keine zweite Kopie).
- Im Fokus lässt sich die Seite **nicht** scrollen; die Bottom-Nav ist verdeckt.
- „Zurück zum Himmel" führt sauber zurück, Karte + Nav sind wieder da.
- „Bearbeiten" verwandelt inline zu Feldern; Speichern aktualisiert den Text und bleibt fokussiert; Abbrechen verwirft.
- „Stern löschen" → „Wirklich löschen?" → löscht, Fokus schließt, Himmel ohne den Stern.
- „Eigener Stern"-Dialog funktioniert weiter.
- DevTools „Emulate CSS prefers-reduced-motion: reduce": Tap → Stern + Text erscheinen direkt zentriert ohne Flug; Zurück ebenso.

- [ ] **Step 6: Commit (+ Push)**

```bash
git add "app/(app)/me/wants/star-map.tsx" "app/(app)/me/wants/wants-me.tsx"
git commit -F - <<'EOF'
refine(wants): Fokus als Ein-Stern-Buehne — Portal, Scroll-Sperre, FLIP, Inline-Edit

Ein getippter Stern fliegt in die Mitte, die restliche Karte fadet ganz aus
(kein doppelter Stern, kein Geister-Himmel). Fokus ist eine scroll-gesperrte
Portal-Ebene ueber der Nav. Bearbeiten passiert inline statt im Dialog;
aktiv/erloschen-Konzept (loslassen/anzuenden, graue Sterne) komplett entfernt.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
git push
```

(Push, weil Stefan direkt am Live-Deploy auf dem iPhone testet — CLAUDE.md-Workflow.)

---

## Self-Review (vom Autor bereits durchlaufen)

**Spec-Abdeckung:**
- Kopf (Deko-Stern raus, Untertitel) → Task 1. ✔
- aktiv/erloschen ganz raus (Map-Rendering, „Erloschen"-Chip, Wieder-anzünden, `toggleActive`) → Task 3 (star-map neu ohne `active`-Zweige; wants-me ohne `toggleActive`). `active: true` beim Anlegen bleibt (unverändert). ✔
- Fokus: Portal an body, Scroll-Sperre, Nav verdeckt → Task 2 (Hook) + Task 3 (Portal/z-[60]+). ✔
- Ein-Stern-FLIP, restliche Karte auf 0 → Task 3 (`zoomIn`/Effect/`flyStarRef`, Map-Fade auf 0). ✔
- Choreografie (Flug ~0.6s, Hintergrund/Text-Settle mit Delay) → Task 3. ✔
- Kein Karten-Kasten, Schleier hinter Beschreibung (`bg-foreground/5 … backdrop-blur-sm`), Name/fern-Chip/Wert-Chip → Task 3. ✔
- „nah" ohne Chip → Task 3 (nur `fern` rendert Chip). ✔
- Back als Eck-Control → Task 3. ✔
- Inline-Bearbeiten ersetzt Dialog, Speichern/Abbrechen + „Stern löschen" (Zwei-Tap), Dialog entfernt → Task 3. ✔
- Löschen schließt Fokus sanft, kein Rückflug → Task 3 (`handleDelete`). ✔
- „Eigener Stern"-Dialog unberührt → Task 3 (2f explizit erhalten). ✔
- Reduced Motion ohne Flug → Task 3 (`reduced`-Zweige in Effect/`zoomOut`/`handleDelete`). ✔
- `starZoomed`/`onZoomChange`-Kopplung raus → Task 3 (State + Prop + Wrapper entfernt). ✔

**Placeholder-Scan:** Keine TBD/TODO; vollständiger Datei-Ersatz + exakte Snippet-Anker. ✔
**Typ-Konsistenz:** `onSaveEdit(id, { title, text })` / `onDelete(id)` identisch in star-map (Aufruf) und wants-me (`saveWantEdit`/`deleteWant`). `useScrollLock(boolean)` identisch definiert (Task 2) und genutzt (Task 3). ✔
```
