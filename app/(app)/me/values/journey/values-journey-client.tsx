"use client";

import { useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";
import { Lock } from "lucide-react";

import { Mascot } from "@/components/brand/mascot";
import { Reveal } from "@/components/ui/reveal";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const STEP_LABELS = [
  "Wertehypothese aufstellen",
  "Tag 1 — Reflexion",
  "Tag 2 — Reflexion",
  "Tag 3 — Reflexion",
  "Tag 4 — Reflexion",
  "Tag 5 — Reflexion",
  "Tag 6 — Reflexion",
  "Tag 7 — Reflexion",
  "Auswertung & Erkenntnisse",
];

const STEP_LINKS = [
  "/me/values/journey/hypothesis",
  "/me/values/journey/journal",
  "/me/values/journey/journal",
  "/me/values/journey/journal",
  "/me/values/journey/journal",
  "/me/values/journey/journal",
  "/me/values/journey/journal",
  "/me/values/journey/journal",
  "/me/values/journey/evaluation",
];

// ─── Sternbild-Geometrie (viewBox 0 0 360 880) ────────────────────────
// Unregelmäßiger Zickzack von unten (Start) nach oben (Auswertung); die
// vertikalen Abstände (~85–90 Units) geben der Kamerafahrt Scrollweg und
// verhindern Label-Kollisionen bei 360px.
const VIEW_W = 360;
const VIEW_H = 880;

const CONSTELLATION: { x: number; y: number; side: "left" | "right" }[] = [
  { x: 80, y: 830, side: "right" },
  { x: 235, y: 745, side: "left" },
  { x: 120, y: 655, side: "right" },
  { x: 265, y: 570, side: "left" },
  { x: 95, y: 480, side: "right" },
  { x: 250, y: 395, side: "left" },
  { x: 140, y: 305, side: "right" },
  { x: 270, y: 215, side: "left" },
  { x: 100, y: 110, side: "right" },
];

/** Position des Maskottchens (untere linke Ecke) im viewBox-Raum — Bezugspunkt
 *  für seine Blickrichtung zum aktuellen Stern. */
const MASCOT_POS = { x: 40, y: 845 };

/** Hintergrund-Funkelsterne — handgewählt abseits der Label-Bahnen. */
const MICRO_STARS: { x: number; y: number; r: number }[] = [
  { x: 20, y: 65, r: 1.2 },
  { x: 330, y: 42, r: 0.9 },
  { x: 45, y: 190, r: 1.0 },
  { x: 318, y: 325, r: 1.3 },
  { x: 14, y: 435, r: 0.8 },
  { x: 338, y: 545, r: 1.1 },
  { x: 28, y: 665, r: 1.0 },
  { x: 332, y: 765, r: 1.2 },
  { x: 185, y: 25, r: 0.9 },
  { x: 255, y: 855, r: 1.0 },
  { x: 120, y: 42, r: 1.4 },
  { x: 90, y: 350, r: 0.8 },
  { x: 200, y: 615, r: 0.9 },
  { x: 60, y: 520, r: 1.1 },
];

/** 4-strahliger Stern in einer 16er-Box. */
const STAR_PATH =
  "M8 0 L9.8 6.2 L16 8 L9.8 9.8 L8 16 L6.2 9.8 L0 8 L6.2 6.2 Z";

type State = "done" | "current" | "open";

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function StarGlyph({ state, reduced }: { state: State; reduced: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn(
        "size-5 shrink-0",
        state === "open" && "scale-75 opacity-35",
        state === "current" && !reduced && "star-pulse",
      )}
      style={
        state === "done"
          ? {
              filter:
                "drop-shadow(0 0 6px color-mix(in srgb, var(--primary) 60%, transparent))",
            }
          : state === "current" && reduced
            ? {
                filter:
                  "drop-shadow(0 0 8px color-mix(in srgb, var(--primary) 75%, transparent))",
              }
            : undefined
      }
      aria-hidden="true"
    >
      <path
        d={STAR_PATH}
        fill={
          state === "open" ? "var(--muted-foreground)" : "var(--primary)"
        }
      />
    </svg>
  );
}

export function ValuesJourneyClient({
  completedSteps,
  currentStep,
}: {
  completedSteps: number[];
  currentStep: number;
}) {
  const reduced = useReducedMotion();
  const done = new Set(completedSteps);
  const lastIndex = STEP_LABELS.length - 1;
  const allDone = done.size > lastIndex;

  // Die Reise startet unten: beim Laden ans Seitenende führen — als sanfte
  // Kamerafahrt über den Nachthimmel (bewusste Ausnahme vom "oben starten"-
  // Standard der App). Nutzer-Input bricht die Fahrt sofort ab; bei reduced
  // motion landet man ohne Fahrt direkt unten.
  useEffect(() => {
    const target =
      document.documentElement.scrollHeight - window.innerHeight;
    if (target <= 0) return;

    if (reduced) {
      window.scrollTo(0, target);
      return;
    }

    const proxy = { y: window.scrollY };
    const tween = gsap.to(proxy, {
      y: target,
      duration: 1.5,
      delay: 0.15,
      ease: "power2.inOut",
      onUpdate: () => window.scrollTo(0, proxy.y),
    });

    const cancel = () => tween.kill();
    const opts = { once: true, passive: true } as const;
    window.addEventListener("wheel", cancel, opts);
    window.addEventListener("touchstart", cancel, opts);
    window.addEventListener("keydown", cancel, opts);

    return () => {
      tween.kill();
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, [reduced]);

  // Gezeichnete Konstellation: Pfad durch die erledigten Sterne (der Server
  // liefert sie lückenlos ab 0) — mindestens zwei Punkte nötig.
  const maxDone = completedSteps.length ? Math.max(...completedSteps) : -1;
  const drawnPoints = CONSTELLATION.slice(0, maxDone + 1);
  const drawnPath =
    drawnPoints.length >= 2
      ? "M" + drawnPoints.map((p) => `${p.x},${p.y}`).join(" L")
      : null;

  const routeHint = CONSTELLATION.map((p) => `${p.x},${p.y}`).join(" ");

  // Blick des Maskottchens zum aktuellen Stern
  const cur = CONSTELLATION[clamp(currentStep, 0, lastIndex)];
  const gazeX = clamp((cur.x - MASCOT_POS.x) / 140, -2, 2);
  const gazeY = clamp((cur.y - MASCOT_POS.y) / 140, -2, 0.5);

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/me/values" title="Werteentdeckung" />

      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-6">
        <div
          className="relative w-full"
          style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
        >
          {/* Leises Glühen hinter dem vollständigen Sternbild */}
          {allDone && (
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-celebrate blur-3xl",
                reduced ? "opacity-35" : "opacity-0 quiet-glow-in",
              )}
            />
          )}

          {/* Nachthimmel: Funkelsterne + Konstellationslinien */}
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="absolute inset-0 size-full"
            aria-hidden="true"
          >
            {MICRO_STARS.map((s, i) => (
              <circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill="var(--foreground)"
                className={reduced ? undefined : "star-twinkle"}
                style={
                  reduced
                    ? { opacity: 0.35 }
                    : { animationDelay: `${(i % 6) * 0.6}s` }
                }
              />
            ))}

            {/* Angedeutete Route durch alle Sterne */}
            <polyline
              points={routeHint}
              fill="none"
              stroke="var(--muted-foreground)"
              strokeWidth="1"
              strokeDasharray="2 6"
              opacity="0.12"
            />

            {/* Bereits gezeichneter Teil der Konstellation */}
            {drawnPath && (
              <path
                d={drawnPath}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.7"
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset={reduced ? 0 : undefined}
                className={reduced ? undefined : "constellation-draw"}
              />
            )}
          </svg>

          {/* Sterne (Etappen) — echte Links, 44px-Hit-Area */}
          {STEP_LABELS.map((label, i) => {
            const state: State = done.has(i)
              ? "done"
              : i === currentStep
                ? "current"
                : "open";
            const { x, y, side } = CONSTELLATION[i];
            const clickable = state !== "open";

            const labelEl = (
              <span
                className={cn(
                  "absolute top-1/2 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap font-heading text-base",
                  side === "right" ? "left-full ml-1.5" : "right-full mr-1.5",
                  state === "open"
                    ? "text-muted-foreground/60"
                    : "font-semibold text-foreground",
                )}
              >
                {state === "open" && (
                  <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                {label}
              </span>
            );

            const nodeClass =
              "absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center";
            const nodeStyle = {
              left: `${(x / VIEW_W) * 100}%`,
              top: `${(y / VIEW_H) * 100}%`,
            };

            return clickable ? (
              <Link
                key={i}
                href={STEP_LINKS[i]}
                className={nodeClass}
                style={nodeStyle}
              >
                <StarGlyph state={state} reduced={reduced} />
                {labelEl}
              </Link>
            ) : (
              <span key={i} className={nodeClass} style={nodeStyle}>
                <StarGlyph state={state} reduced={reduced} />
                {labelEl}
              </span>
            );
          })}

          {/* Maskottchen schaut zu, wie sich der Himmel füllt */}
          <div className="absolute bottom-1 left-1">
            <Mascot
              size="sm"
              expression={allDone ? "radiant" : "curious"}
              gazeX={gazeX}
              gazeY={gazeY}
            />
          </div>
        </div>

        {allDone && (
          <Reveal delay={0.8} className="pt-4">
            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              Dein Sternbild ist vollständig. ✨
              <br />
              Schau dir deine Erkenntnisse an.
            </p>
          </Reveal>
        )}
      </div>
    </div>
  );
}
