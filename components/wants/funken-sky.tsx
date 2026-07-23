"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/lib/hooks/use-dialog-focus";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { BetItem } from "@/lib/types/db-json";

/**
 * Die Funken-Konstellation der Sternschmiede: offene Funken schweben als
 * glühende Rosé-Punkte an stabilen Positionen über der Esse (Slot-Leiter +
 * ID-Hash → gleicher Himmel bei jedem Besuch). Tipp auf einen Funken → eine per
 * Portal an document.body gerenderte, fixe, scroll-gesperrte Fokus-Ebene über
 * der Bottom-Nav: Text + „Ausprobiert? Reflektieren" + „Verwerfen" (zweistufig)
 * + „Schließen". Leichtere Schwester der StarMap — ohne Edit-Modus, ohne
 * Distanz, ohne GSAP (Auf-Zoom rein per CSS vom Tap-Punkt). Reduced motion:
 * harter Schnitt ohne Flug. Persistenz bleibt beim Parent (sternschmiede.tsx).
 */

const VIEW_W = 360;
const ROW_H = 76;
const TOP_PAD = 42;
const BOTTOM_PAD = 48;

/** Stabiler Hash 0..1 aus einem String — gleiche Konstellation bei jedem Besuch. */
function hash01(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

/** 28-Zeichen-Kürzung mit „…" — hält Konstellations-Labels bei jeder Länge kurz. */
function clip28(s: string): string {
  const t = s.trim();
  return t.length > 28 ? `${t.slice(0, 27).trimEnd()}…` : t;
}

type Placed = { bet: BetItem; x: number; y: number; side: "left" | "right" };

/** Slot-Leiter: links/rechts versetzt von oben nach unten; ID-Hash gibt jedem
 *  Funken einen stabilen Versatz im Slot. */
function layout(funken: BetItem[]): { placed: Placed[]; viewH: number } {
  const placed = funken.map((bet, i) => {
    const side: "left" | "right" = i % 2 === 0 ? "left" : "right";
    const baseX = side === "left" ? 92 : 268;
    return {
      bet,
      x: baseX + (hash01(bet.id) - 0.5) * 52,
      y: TOP_PAD + i * ROW_H + (hash01(`${bet.id}y`) - 0.5) * 30,
      side,
    };
  });
  const viewH = Math.max(200, TOP_PAD + funken.length * ROW_H + BOTTOM_PAD);
  return { placed, viewH };
}

export function FunkenSky({
  funken,
  reflectHref,
  onDelete,
}: {
  funken: BetItem[];
  reflectHref: (id: string) => string;
  onDelete: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Tap-Punkt (viewport-relativ) → transform-origin für den Auf-Zoom der Ebene.
  const originRef = useRef<{ x: number; y: number } | null>(null);

  // Portal erst nach Mount (kein document auf dem Server).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliger Client-Mount-Flag
  useEffect(() => setMounted(true), []);

  // Scroll-Lock + Fokus reinziehen (preventScroll) + Tab-Falle + Fokus-Rückkehr.
  useDialogFocus({
    open: focusedId !== null,
    dialogRef,
    triggerRef,
    onEscape: close,
  });

  const { placed, viewH } = layout(funken);
  const focused = funken.find((f) => f.id === focusedId) ?? null;

  function open(bet: BetItem, el: HTMLElement) {
    if (focusedId) return;
    const r = el.getBoundingClientRect();
    originRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    triggerRef.current = el;
    setConfirmDelete(false);
    setReady(false);
    setFocusedId(bet.id);
  }

  function close() {
    setFocusedId(null);
    setConfirmDelete(false);
    setReady(false);
  }

  // Auf-Zoom: transform-origin am Tap-Punkt setzen, dann per rAF „ready" → CSS
  // transitioniert von scale(0.92)/opacity 0 auf 1. Reduced motion: sofort da.
  useEffect(() => {
    if (!focusedId) return;
    if (reduced) {
      setReady(true);
      return;
    }
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, [focusedId, reduced]);

  function handleDelete() {
    if (!focused) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const id = focused.id;
    close();
    onDelete(id);
  }

  const origin = originRef.current;

  return (
    <div className="relative w-full" style={{ aspectRatio: `${VIEW_W} / ${viewH}` }}>
      {/* Die Konstellation (inert, solange ein Funke fokussiert ist: die
          Hintergrund-Punkte dürfen weder Tastatur-Fokus noch Screenreader). */}
      <div className="absolute inset-0" inert={focusedId !== null}>
        {placed.map(({ bet, x, y, side }, i) => (
          <button
            key={bet.id}
            type="button"
            onClick={(e) => open(bet, e.currentTarget)}
            aria-label={`Funken ansehen: ${clip28(bet.text)}`}
            className="absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{ left: `${(x / VIEW_W) * 100}%`, top: `${(y / viewH) * 100}%` }}
          >
            <span
              aria-hidden
              className={cn("size-3 rounded-full bg-celebrate", !reduced && "funke-drift")}
              style={{
                boxShadow: "0 0 10px 2px color-mix(in srgb, var(--celebrate) 70%, transparent)",
                animationDelay: `${(i % 5) * 0.7}s`,
              }}
            />
            <span
              className={cn(
                "absolute top-1/2 block max-w-[8rem] -translate-y-1/2 truncate font-heading text-base font-medium text-foreground",
                side === "left" ? "left-full ml-2" : "right-full mr-2",
              )}
            >
              {clip28(bet.text)}
            </span>
          </button>
        ))}
      </div>

      {/* Fokus-Ebene: Portal an document.body, fix, scroll-gesperrt, über der Nav. */}
      {mounted &&
        focused &&
        createPortal(
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Funke: ${focused.text}`}
            tabIndex={-1}
            className="fixed inset-0 z-[60] outline-none"
          >
            {/* Gedimmte Esse: klick = schließen. Für Screenreader/Tastatur inert
                (aria-hidden + tabIndex -1) — der explizite „Schließen"-Button unten
                trägt den barrierefreien Weg, sonst läge diese Fläche als erstes
                „Schließen" vor dem eigentlichen Funken in der VoiceOver-Reihenfolge. */}
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={close}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            {/* Inhalt: fliegt vom Tap-Punkt auf (transform-origin), fadet auf. */}
            <div
              className={cn(
                "absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 transition-[opacity,scale] duration-300 ease-out motion-reduce:transition-none",
                ready ? "scale-100" : "scale-[0.92]",
              )}
              style={{
                transformOrigin: origin
                  ? `${origin.x}px ${origin.y}px`
                  : "center",
                opacity: ready ? 1 : 0,
              }}
            >
              <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 text-center">
                <span
                  aria-hidden
                  className="size-5 rounded-full bg-celebrate"
                  style={{
                    boxShadow: "0 0 22px 5px color-mix(in srgb, var(--celebrate) 70%, transparent)",
                  }}
                />
                <p className="text-lg leading-relaxed text-foreground">{focused.text}</p>
                <div className="flex w-full flex-col gap-2">
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    render={<Link href={reflectHref(focused.id)} />}
                  >
                    <Flame className="size-4" /> Ausprobiert? Reflektieren
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={handleDelete}
                  >
                    {/* aria-live: der Text-Swap zur Rückfrage wird sonst nicht
                        angesagt (gleicher Button behält den Fokus). */}
                    <span aria-live="polite">
                      {confirmDelete ? "Wirklich verwerfen?" : "Verwerfen"}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={close}
                  >
                    Schließen
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
