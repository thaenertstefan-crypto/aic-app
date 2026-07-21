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
import { FocusSky } from "./focus-sky";
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
const ROW_H = 80;
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
    // Spalten-Zentren etwas weiter nach außen (±102 statt ±84 um die Mitte 180),
    // damit sich die Sterne nicht in der Bildmitte sammeln. Labels zeigen nach
    // innen und gewinnen dadurch Platz.
    const baseX = side === "left" ? 78 : 282;
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
  onSaveEdit: (
    id: string,
    patch: { title: string | null; text: string; distance: "nah" | "fern" },
  ) => Promise<string | null>;
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
  const [editDistance, setEditDistance] = useState<"nah" | "fern">("nah");
  const [focusError, setFocusError] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const flyStarRef = useRef<HTMLDivElement>(null);
  // Fokus-Ebene = Dialog: der gerenderte Container (für Fokus + Tab-Falle) und
  // der auslösende Stern-Button, auf den beim Schließen der Fokus zurückkehrt.
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const prevFocusedRef = useRef<string | null>(null);
  const originRef = useRef<{ x: number; y: number; size: number } | null>(null);
  // Karten-lokaler Ursprung (Sternposition relativ zur oberen linken Kartenecke)
  // — Transform-Ursprung für den Auf-Zoom der realen Karte.
  const mapOriginRef = useRef<{ x: number; y: number } | null>(null);

  // Portal erst nach Mount (kein document auf dem Server).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliger Client-Mount-Flag, kein document auf dem Server
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
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    // Auslöser merken, damit der Fokus beim Schließen genau hierher zurückkehrt.
    triggerRef.current = el;
    originRef.current = { x: cx, y: cy, size };
    // Sternposition relativ zur Karte — Ursprung für den Karten-Auf-Zoom.
    const mapRect = mapRef.current?.getBoundingClientRect();
    mapOriginRef.current = mapRect ? { x: cx - mapRect.left, y: cy - mapRect.top } : null;
    setMode("view");
    setConfirmDelete(false);
    setFocusError(null);
    setFocusedId(want.id);
  }

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
        // Kräftiger Dive: alle Nachbarsterne streamen sichtbar nach außen an den
        // Rändern vorbei → liest als Kamera-Flug in die Stelle (nicht reisender Stern).
        gsap.to(mapRef.current, { opacity: 0, scale: 2.6, duration: 0.45, ease: "power2.out" });
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
      { opacity: 0, scale: 1.9 },
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

  // Die Fokus-Ebene wie ein Dialog behandeln: Fokus reinziehen, Tab einsperren,
  // Escape schließt (im Edit-Modus verlässt Escape erst den Edit, damit getippter
  // Text nicht verloren geht). Ohne das bliebe der Fokus auf dem unsichtbaren
  // Auslöser-Stern und Tab liefe in die Seite hinter dem Overlay.
  useEffect(() => {
    if (!focusedId) return;
    const dialog = dialogRef.current;
    // preventScroll: der Dialog-Container haengt per Portal am Ende von
    // document.body — ohne das wuerde focus() die Seite ans Dokument-Ende
    // scrollen (das „Aufploppen" beim Rein-Zoom).
    const raf = requestAnimationFrame(() => dialog?.focus({ preventScroll: true }));

    function focusables(): HTMLElement[] {
      if (!dialog) return [];
      return Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (mode === "edit") {
          setMode("view");
          setConfirmDelete(false);
          setFocusError(null);
        } else {
          zoomOut();
        }
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const els = focusables();
      if (els.length === 0) {
        e.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [focusedId, mode]);

  // Beim Schließen den Fokus auf den auslösenden Stern zurücksetzen — außer der
  // Stern wurde gelöscht (Karte remountet per key, Button ist dann weg).
  useEffect(() => {
    const prev = prevFocusedRef.current;
    prevFocusedRef.current = focusedId;
    if (prev && !focusedId) {
      const trigger = triggerRef.current;
      // preventScroll: Fokus zurueck auf den (evtl. weit unten liegenden)
      // Auslöser-Stern, ohne die Seite dorthin zu scrollen — man bleibt an der
      // Scroll-Position von vor dem Rein-Zoom.
      if (trigger && document.body.contains(trigger)) trigger.focus({ preventScroll: true });
      triggerRef.current = null;
    }
  }, [focusedId]);

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
    if (layer) gsap.to(layer, { opacity: 0, scale: 1.9, duration: 0.5, ease: "power2.in" });
    // Reale Karte fadet zurück und setzt ihren Auf-Zoom zurück.
    if (mapRef.current) {
      gsap.to(mapRef.current, { opacity: 1, scale: 1, duration: 0.5, delay: 0.15, ease: "power2.out" });
    }
    window.setTimeout(() => setFocusedId(null), 500);
  }

  function enterEdit() {
    if (!focused) return;
    setEditTitle(focused.title ?? "");
    setEditText(focused.text);
    setEditDistance(focused.distance === "fern" ? "fern" : "nah");
    setConfirmDelete(false);
    setFocusError(null);
    setMode("edit");
  }

  async function saveEdit() {
    if (!focused) return;
    const t = editText.trim();
    if (!t) return;
    const err = await onSaveEdit(focused.id, {
      title: editTitle.trim() ? editTitle.trim() : null,
      text: t,
      distance: editDistance,
    });
    if (err) {
      setFocusError(err);
      return;
    }
    setFocusError(null);
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
      {/* Die Sternenkarte (fadet beim Fokus komplett aus). `inert`, solange ein
          Stern fokussiert ist: die unsichtbare Karte darf weder Tastatur-Fokus
          noch Screenreader bekommen. */}
      <div ref={mapRef} className="absolute inset-0" inert={focusedId !== null}>
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
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Stern: ${starName(focused)}`}
            tabIndex={-1}
            className="outline-none"
          >
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
              style={{ left: "50%", top: `${FOCUS_STAR_TOP * 100}lvh`, opacity: 0 }}
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
              style={{ top: `calc(${FOCUS_STAR_TOP * 100}lvh + 3rem)`, bottom: 0 }}
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
                    {/* Distanz: die Kern-Grammatik des Himmels selbst setzen. */}
                    <div className="w-full space-y-1.5">
                      <span className="block text-left text-xs font-medium text-muted-foreground">
                        Wie weit weg ist dieser Stern?
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            { value: "nah", label: "Naher Stern", hint: "eine Freude" },
                            { value: "fern", label: "Ferner Stern", hint: "ein Ziel" },
                          ] as const
                        ).map((opt) => {
                          const active = editDistance === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setEditDistance(opt.value)}
                              className={cn(
                                "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-center transition-colors",
                                active
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:bg-muted/40",
                              )}
                            >
                              <span className="text-sm font-medium">{opt.label}</span>
                              <span className="text-xs opacity-80">{opt.hint}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {focusError && (
                      <p className="w-full text-left text-sm text-destructive">{focusError}</p>
                    )}
                    <div className="flex w-full gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setMode("view");
                          setConfirmDelete(false);
                          setFocusError(null);
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
          </div>,
          document.body,
        )}
    </div>
  );
}
