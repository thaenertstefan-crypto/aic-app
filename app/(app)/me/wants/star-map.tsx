"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Pencil, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mascot } from "@/components/brand/mascot";
import { STAR_PATH } from "@/components/brand/star-glyph";
import { useDialogFocus } from "@/lib/hooks/use-dialog-focus";
import { wantSentence } from "@/lib/recipes/wants/items";
import { ANSWER_MAX } from "@/lib/recipes/wants/state";
import { hash01 } from "@/lib/recipes/wants/sky-hash";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { getValueLabel } from "@/lib/utils/values-bank";
import { cn } from "@/lib/utils";
import { FocusSky } from "./focus-sky";
import { MomentWall } from "./moment-wall";
import type { StarMoment } from "@/lib/recipes/wants/moments";
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

const VIEW_W = 360;
const ROW_H = 80;

/** Ziel-Abstand (viewBox-Einheiten) an BEIDEN Rändern der Karte: oben bis zum
 *  ersten Stern, unten bis zum Maskottchen. Ein Wert steuert beide Seiten. */
const EDGE_PAD = 40;
/** Halbe y-Jitter-Amplitude (Slot-Versatz ±18, s. layoutStars) — als Reserve
 *  mitgerechnet, damit ein nach außen gewürfelter Stern den Zielabstand nicht
 *  auffrisst. */
const Y_JITTER_RESERVE = 18;
/** Maskottchen unten links: size-14 (56 px) + bottom-1 (4 px) = 60 px. Bei
 *  ~375 px Viewport ist die Karte ca. 343 px breit bei 360 viewBox-Einheiten
 *  → 60 px ≈ 63 Einheiten. */
const MASCOT_BOX = 63;

const TOP_PAD = EDGE_PAD + Y_JITTER_RESERVE;
const BOTTOM_PAD = EDGE_PAD + Y_JITTER_RESERVE + MASCOT_BOX;

/** Mindesthöhe der Bühne. Ohne sie kollabiert die Karte bei ein bis zwei
 *  Sternen zu einem Streifen und verliert ihre Tiefenwirkung — der Wert ist
 *  rein visuell gesetzt, nicht aus den Abständen abgeleitet. Achtung bei der
 *  Abnahme: bis 3 Sterne dominiert dieser Boden, Änderungen an der Formel
 *  darunter sind dann unsichtbar. */
const MIN_VIEW_H = 430;

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

/** Kürzung mit „…“ — hält Namen bei jeder Eingabelänge kurz. */
function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** So lang, wie das Titel-Feld erlaubt — länger ist kein Name mehr. */
const NAME_MAX = 60;

/** Voller Name eines Sterns: Titel, sonst die Beschreibung (Bestandsdaten
 *  ohne title, und ferne Sterne, deren Namen der KI-Aufruf nicht mitbrachte).
 *  Der Ersatz wird auf Titel-Länge gekürzt: ein ferner Stern trägt ein ganzes
 *  Antwortfeld, und das ist keine Überschrift. Den vollen Satz zeigt die
 *  Detailansicht ohnehin gleich darunter. */
export function starName(w: WantItem): string {
  const t = w.title?.trim();
  return t ? t : clip(wantSentence(w), NAME_MAX);
}

/** Innerste x-Position einer Spalte (viewBox-Einheiten, vom linken Rand;
 *  rechts gespiegelt). Der Name eines Sterns zeigt nach innen, also ist jede
 *  Einheit weiter außen eine Einheit mehr Platz für ihn — die Verteilung dient
 *  dem Namen, nicht umgekehrt. Weil der Versatz unten nur nach außen schiebt,
 *  ist dieser Wert zugleich der engste Fall, den ein Name je bekommt.
 *  Nah und fern teilen sich diese Geometrie unverändert: die Weite steckt
 *  allein in Größe, Deckkraft und Dunst, nie in der Position. */
const COL_X_INNER = 58;
/** Wie weit der ID-Hash einen Stern aus seiner Spalte nach außen schiebt —
 *  stabil je Stern, damit die Karte kein Raster ist. Nur nach außen: nach
 *  innen läge sein Name. Weiter geht es nicht, ohne dass das 44-px-Tap-Ziel
 *  über den Kartenrand hinausragt: der äußerste Stern steht bei
 *  COL_X_INNER - X_JITTER = 30 Einheiten, das sind 8,3 % der Kartenbreite.
 *  Weil das Tap-Ziel in px misst und die Position in Prozent, wird der Rest je
 *  schmaler der Bildschirm desto knapper — bei 375 px bleiben ~6 px Luft, bei
 *  320 px noch ~2. Es ragt nie hinaus, aber viel Reserve ist das nicht. */
const X_JITTER = 28;

/** Was ein Namenszug an px verliert, bevor er anfängt: halbes Tap-Ziel
 *  (size-11 = 44 px) + Abstand zum Stern (ml-1.5/mr-1.5 = 6 px) + Luft zum
 *  Kartenrand. Diese Strecke ist in px festgeschrieben, die Sternposition in
 *  Prozent der Karte — deshalb rechnet die Breite unten in cqw minus px. */
const LABEL_GUTTER_PX = 22 + 6 + 4;

/** Der Platz, den ein Name wirklich hat: von seinem Stern bis zum
 *  gegenüberliegenden Kartenrand. `cqw` misst die Karte (sie trägt dafür
 *  `@container`), sodass jeder Stern seine eigene Schranke bekommt statt einer
 *  gemeinsamen, die sich am engsten Fall orientieren müsste. Erst hier kürzt
 *  `truncate` — und damit so spät wie möglich.
 *  Kollidieren können zwei Namen dabei nicht: pro Zeile steht genau ein Stern,
 *  und zwei Zeilen liegen selbst im ungünstigsten Fall noch
 *  ROW_H - 2 * Y_JITTER_RESERVE auseinander — mehr als die Höhe einer Zeile. */
function labelMaxWidth(x: number, side: "left" | "right"): string {
  const room = side === "left" ? VIEW_W - x : x;
  return `calc(${((room / VIEW_W) * 100).toFixed(2)}cqw - ${LABEL_GUTTER_PX}px)`;
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
    const outward = hash01(want.id) * X_JITTER;
    return {
      want,
      x: side === "left" ? COL_X_INNER - outward : VIEW_W - COL_X_INNER + outward,
      y: TOP_PAD + i * ROW_H + (hash01(`${want.id}y`) - 0.5) * Y_JITTER_RESERVE * 2,
      side,
    };
  });
  // Der LETZTE Stern sitzt bei TOP_PAD + (n-1) * ROW_H — nicht bei n * ROW_H.
  // Mit n * ROW_H entstand darunter exakt eine leere Zeile, der Rand war also
  // 40 + 80 = 120 statt der beabsichtigten EDGE_PAD = 40.
  const viewH = Math.max(
    MIN_VIEW_H,
    TOP_PAD + Math.max(0, ordered.length - 1) * ROW_H + BOTTOM_PAD,
  );
  return { stars, viewH };
}

export function StarMap({
  wants,
  moments,
  onSaveEdit,
  onDelete,
  onAddMoment,
  onUpdateMoment,
  onDeleteMoment,
}: {
  wants: WantItem[];
  /** Die Momente aller Sterne, nach Stern-ID geschlagen (s. `groupMomentsByStar`). */
  moments: Record<string, StarMoment[]>;
  // Kein `distance` im Patch: die Weite ist eine Herkunftsangabe („aus einem
  // Antwortfeld der Tagtraum-Frage"), keine Nutzer-Einstellung. Sie war hier
  // mit zwei Taps brechbar — siehe CONTEXT.md (Stern) und ADR-0005.
  onSaveEdit: (
    id: string,
    patch: { title: string | null; text: string },
  ) => Promise<string | null>;
  onDelete: (id: string) => void;
  onAddMoment: (starId: string, text: string) => Promise<string | null>;
  onUpdateMoment: (id: string, text: string) => Promise<string | null>;
  onDeleteMoment: (id: string) => Promise<string | null>;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [contentVisible, setContentVisible] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [focusError, setFocusError] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const flyStarRef = useRef<HTMLDivElement>(null);
  // Fokus-Ebene = Dialog: der gerenderte Container (für Fokus + Tab-Falle) und
  // der auslösende Stern-Button, auf den beim Schließen der Fokus zurückkehrt.
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const originRef = useRef<{ x: number; y: number; size: number } | null>(null);
  // Karten-lokaler Ursprung (Sternposition relativ zur oberen linken Kartenecke)
  // — Transform-Ursprung für den Auf-Zoom der realen Karte.
  const mapOriginRef = useRef<{ x: number; y: number } | null>(null);

  // Portal erst nach Mount (kein document auf dem Server).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliger Client-Mount-Flag, kein document auf dem Server
  useEffect(() => setMounted(true), []);

  // Scroll-Lock + Fokus reinziehen (preventScroll) + Tab-Falle + Fokus-Rückkehr.
  // Escape verlässt im Edit-Modus erst den Edit (getippter Text bleibt), sonst
  // schließt es die Fokus-Ebene.
  useDialogFocus({
    open: focusedId !== null,
    dialogRef,
    triggerRef,
    onEscape: () => {
      if (mode === "edit") {
        setMode("view");
        setConfirmDelete(false);
        setFocusError(null);
      } else {
        zoomOut();
      }
    },
  });

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
    // `@container`: die Karte ist der Bezug für die cqw-Rechnung in
    // labelMaxWidth. Sie hat keine `fixed` Nachfahren — die Fokus-Ebene hängt
    // per Portal an document.body —, also kostet die Containment nichts.
    <div
      className="@container relative w-full"
      style={{ aspectRatio: `${VIEW_W} / ${viewH}` }}
      data-e2e="star-map"
    >
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
              // Negativer Versatz: alle Mikro-Sterne funkeln ab dem ersten
              // Frame, nur phasenverschoben. Positiv ließ sie bis zum Start
              // deckend stehen und dann auf den 0-%-Keyframe (opacity 0.15)
              // springen — dasselbe Nacheinander-Anspringen wie bei den Funken.
              style={reduced ? { opacity: 0.3 } : { animationDelay: `-${(i % 5) * 0.7}s` }}
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
              aria-label={`Stern ansehen: ${starName(want)}`}
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
                // Die Schranke ist der Kartenrand, nicht eine feste Breite:
                // gekürzt wird erst, wenn der Name den Rand erreicht.
                style={{ maxWidth: labelMaxWidth(x, side) }}
                className={cn(
                  "absolute top-1/2 block -translate-y-1/2 truncate font-heading",
                  side === "left" ? "left-full ml-1.5" : "right-full mr-1.5",
                  fern
                    ? "text-xs text-muted-foreground"
                    : "text-base font-semibold text-foreground",
                )}
              >
                {starName(want)}
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
                    <p className="w-full rounded-xl bg-foreground/5 p-4 text-left text-base leading-relaxed whitespace-pre-wrap text-foreground backdrop-blur-sm">
                      {wantSentence(focused)}
                    </p>
                    <Button variant="outline" className="mt-1 w-full gap-2" onClick={enterEdit}>
                      <Pencil className="size-4" /> Bearbeiten
                    </Button>
                    {/* Die Belegwand — was du an diesem Stern schon gelebt hast. */}
                    <MomentWall
                      moments={moments[focused.id] ?? []}
                      distance={focused.distance === "fern" ? "fern" : "nah"}
                      onAdd={(text) => onAddMoment(focused.id, text)}
                      onUpdate={onUpdateMoment}
                      onDelete={onDeleteMoment}
                    />
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
                      // Ein ferner Stern trägt ein ganzes Antwortfeld.
                      maxLength={ANSWER_MAX}
                      autoFocus
                      className="resize-y"
                      aria-label="Beschreibung des Sterns"
                    />
                    {/* Das Beispiel steht als eigenes Feld am Stern — sichtbar,
                        damit der gelesene Satz und der bearbeitete derselbe
                        sind. */}
                    {focused.example && (
                      <p className="w-full text-left text-sm text-muted-foreground">
                        z. B. {focused.example}
                      </p>
                    )}
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
