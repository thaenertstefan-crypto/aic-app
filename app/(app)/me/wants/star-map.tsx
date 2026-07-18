"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { Pencil, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/brand/mascot";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { getValueLabel } from "@/lib/utils/values-bank";
import { cn } from "@/lib/utils";
import type { WantItem } from "@/lib/types/db-json";

/**
 * Die Sternenkarte: alle Wants als benannte Sterne an stabilen Positionen
 * (Slot-Leiter + ID-Hash), Tiefe rein über die Darstellung (fern = kleiner/
 * gedimmter/Dunst, erloschen = grau). Tipp auf einen Stern → GSAP-Kamerafahrt
 * (Scale um den Sternpunkt) → Detailansicht (Titel, Wert-Chip, Beschreibung,
 * Aktionen). Reduced motion: harter Wechsel ohne Fahrt. Persistenz und
 * Dialoge bleiben beim Parent (wants-me) — hier leben nur Szene und Kamera.
 */

/** 4-strahliger Stern — die von der Werte-Szene freigegebene Sprache. */
const STAR_PATH = "M8 0 L9.8 6.2 L16 8 L9.8 9.8 L8 16 L6.2 9.8 L0 8 L6.2 6.2 Z";

const VIEW_W = 360;
const ROW_H = 96;
const TOP_PAD = 60;
const BOTTOM_PAD = 130; // Platz für das Maskottchen unten links

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

/** Kartenlabel: Titel, sonst gekürzte Beschreibung (Bestandsdaten ohne title);
 *  beide Quellen laufen durch dieselbe 26-Zeichen-Kürzung, damit lange Titel
 *  (Input erlaubt bis zu 60 Zeichen) das Label nicht sprengen. */
export function starLabel(w: WantItem): string {
  const t = w.title?.trim();
  if (t) return clip26(t);
  return clip26(w.text.trim());
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
  onEdit,
  onToggleActive,
}: {
  wants: WantItem[];
  onEdit: (want: WantItem) => void;
  onToggleActive: (want: WantItem) => void;
}) {
  const reduced = useReducedMotion();
  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const { stars, viewH } = layoutStars(wants);
  const zoomed = stars.find((s) => s.want.id === zoomedId) ?? null;

  function zoomIn(star: PlacedStar) {
    if (zoomedId) return;
    setZoomedId(star.want.id);
    if (reduced || !mapRef.current) {
      setDetailVisible(true);
      return;
    }
    // Kamerafahrt: Scale um den Sternpunkt — der angetippte Stern bleibt
    // an Ort und Stelle, der Rest des Himmels weicht nach außen zurück.
    const rect = mapRef.current.getBoundingClientRect();
    const px = (star.x / VIEW_W) * rect.width;
    const py = (star.y / viewH) * rect.height;
    gsap.to(mapRef.current, {
      scale: 2.4,
      opacity: 0.2,
      transformOrigin: `${px}px ${py}px`,
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => setDetailVisible(true),
    });
  }

  function zoomOut() {
    setDetailVisible(false);
    if (reduced || !mapRef.current) {
      setZoomedId(null);
      return;
    }
    gsap.to(mapRef.current, {
      scale: 1,
      opacity: 1,
      duration: 0.7,
      ease: "power2.inOut",
      onComplete: () => setZoomedId(null),
    });
  }

  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: `${VIEW_W} / ${viewH}`, minHeight: zoomedId ? 480 : undefined }}
    >
      {/* Die Karte (wird bei Zoom skaliert und gedimmt) */}
      <div ref={mapRef} className={cn("absolute inset-0", reduced && zoomedId && "opacity-0")}>
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
          const out = !want.active;
          const fern = want.distance === "fern" && !out;
          return (
            <button
              key={want.id}
              type="button"
              onClick={() => zoomIn({ want, x, y, side })}
              aria-label={`Stern ansehen: ${starLabel(want)}`}
              className="absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
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
                  out ? "size-3 opacity-30" : fern ? "size-3.5 opacity-55" : "size-6",
                  !reduced && !out && "want-star-twinkle",
                )}
                style={{
                  animationDelay: `${(i % 5) * 0.9}s`,
                  filter: out
                    ? undefined
                    : `drop-shadow(0 0 ${fern ? 3 : 6}px color-mix(in srgb, var(--primary) ${fern ? 35 : 55}%, transparent))`,
                }}
              >
                <path d={STAR_PATH} fill={out ? "var(--muted-foreground)" : "var(--primary)"} />
              </svg>
              <span
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-heading",
                  side === "left" ? "left-full ml-1.5" : "right-full mr-1.5",
                  out
                    ? "text-xs text-muted-foreground/70"
                    : fern
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

      {/* Zoom-Detailansicht: reine Betrachtung (Variante B — keine Schmiede) */}
      {zoomed && detailVisible && (
        <div className="absolute inset-0 z-20 flex flex-col items-center gap-4 overflow-y-auto px-2 pt-2 pb-4 text-center animate-in fade-in duration-300">
          <button
            type="button"
            onClick={zoomOut}
            className="flex min-h-11 items-center self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Zurück zum Himmel
          </button>

          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="size-16"
            style={{
              filter: zoomed.want.active
                ? "drop-shadow(0 0 18px color-mix(in srgb, var(--primary) 80%, transparent))"
                : undefined,
            }}
          >
            <path
              d={STAR_PATH}
              fill={zoomed.want.active ? "var(--primary)" : "var(--muted-foreground)"}
              opacity={zoomed.want.active ? 1 : 0.5}
            />
          </svg>

          <div className="space-y-2">
            <h3 className="font-heading text-2xl font-semibold text-balance break-words text-foreground">
              {starLabel(zoomed.want)}
            </h3>
            {zoomed.want.distance === "fern" && zoomed.want.active && (
              <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Ferner Stern — nach ihm greifst du
              </span>
            )}
            {!zoomed.want.active && (
              <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Erloschen
              </span>
            )}
          </div>

          {zoomed.want.valueId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Sparkles className="size-3" />
              nährt deinen Wert: {getValueLabel(zoomed.want.valueId)}
            </span>
          )}

          <div className="w-full rounded-xl bg-foreground/5 p-4 text-left">
            <p className="text-base leading-relaxed text-foreground">{zoomed.want.text}</p>
          </div>

          <div className="flex w-full flex-col gap-2 pt-1">
            <Button variant="outline" className="w-full gap-2" onClick={() => onEdit(zoomed.want)}>
              <Pencil className="size-4" /> Bearbeiten
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => onToggleActive(zoomed.want)}
            >
              {zoomed.want.active ? "Stern loslassen" : "Wieder anzünden"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
