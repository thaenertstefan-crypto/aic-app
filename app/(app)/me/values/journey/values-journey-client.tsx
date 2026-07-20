"use client";

import { useEffect, useRef } from "react";
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

// ─── Pfad-Geometrie (viewBox 0 0 360 880) ────────────────────────
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

/** Merker: Die filmische Kamerafahrt lief in dieser Session schon — beim
 *  täglichen Wiederbesuch springt die Ansicht direkt zum aktuellen Stern. */
const SWEPT_SESSION_KEY = "aic:values-journey-swept";

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

/** Geschwungener Wanderpfad durch die Wegmarken: kubische Segmente mit
 *  vertikalen Tangenten — der Pfad schlängelt sich, statt von Punkt zu
 *  Punkt zu springen (Wanderpfad-Anmutung statt Konstellations-Polyline). */
function buildTrailPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const bend = (b.y - a.y) * 0.5;
    d += ` C ${a.x},${a.y + bend} ${b.x},${b.y - bend} ${b.x},${b.y}`;
  }
  return d;
}

type State = "done" | "current" | "open";

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function WaymarkGlyph({
  state,
  reduced,
  finale = false,
  anchor = false,
}: {
  state: State;
  reduced: boolean;
  finale?: boolean;
  /** Ein erledigter Stern, der als aktueller Ruhepunkt dient (Tages-Gate):
   *  glüht und pulsiert wie der aktuelle Schritt, damit die Karte nie ohne
   *  angezündeten Bezugspunkt dasteht. */
  anchor?: boolean;
}) {
  // Glow-Logik wie beim alten Sternglyph: die Endstation glüht wärmer,
  // erledigte Marken tragen einen leisen Goldschein.
  const glow = finale
    ? state === "open"
      ? "drop-shadow(0 0 8px color-mix(in srgb, var(--primary) 40%, transparent))"
      : "drop-shadow(0 0 14px color-mix(in srgb, var(--primary) 85%, transparent))"
    : anchor
      ? "drop-shadow(0 0 8px color-mix(in srgb, var(--primary) 75%, transparent))"
      : state === "done"
        ? "drop-shadow(0 0 6px color-mix(in srgb, var(--primary) 60%, transparent))"
        : state === "current" && reduced
          ? "drop-shadow(0 0 8px color-mix(in srgb, var(--primary) 75%, transparent))"
          : undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        finale ? "size-9" : "size-6",
        "shrink-0",
        state === "open" && "opacity-60",
        !reduced &&
          (state === "current" || anchor || (finale && state === "done")) &&
          "star-pulse",
      )}
      style={glow ? { filter: glow } : undefined}
      aria-hidden="true"
    >
      {state === "done" && <circle cx="12" cy="12" r="5" fill="var(--primary)" />}
      {state === "current" && (
        <>
          {/* Pulsierende Kompassrose: 4-strahlige Nadel im Doppelring */}
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="var(--primary)" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--primary)" strokeWidth="1" opacity="0.3" />
          <path d="M12 5.5 L13.6 12 L12 18.5 L10.4 12 Z" fill="var(--primary)" />
          <path d="M5.5 12 L12 10.4 L18.5 12 L12 13.6 Z" fill="var(--primary)" opacity="0.45" />
        </>
      )}
      {state === "open" && (
        <circle cx="12" cy="12" r="5" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.2" />
      )}
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

  // Tages-Gate: currentStep ist normalerweise der erste NICHT erledigte
  // Schritt. Nur die Kalendersperre in page.tsx klemmt ihn auf einen bereits
  // erledigten Reflexionstag — daran erkennen wir „heute geschafft, nächster
  // Stern öffnet morgen", ohne ein zusätzliches Server-Signal.
  const gated = !allDone && done.has(currentStep);

  // Phasen-/Fortschritts-Zeile für den Header-Untertitel — macht die 7-Tage-
  // Form ab dem ersten Besuch sichtbar und erklärt die Tagessperre in Worten.
  const subtitle = allDone
    ? "Dein Kompass ist kalibriert"
    : currentStep === 0
      ? "Los geht's — deine Wertehypothese"
      : currentStep === lastIndex
        ? "Zeit für die Auswertung"
        : gated
          ? "Heute geschafft — morgen geht's weiter ✨"
          : `Tag ${currentStep} von 7`;

  // Bezugspunkt für die Kamerafahrt: der aktuelle Stern soll zentriert landen.
  const mapBoxRef = useRef<HTMLDivElement>(null);

  // Beim Laden zum aktuellen Stern führen — als sanfte Kamerafahrt über den
  // Nachthimmel (bewusste Ausnahme vom "oben starten"-Standard der App). Die
  // Fahrt landet auf der aktuellen Etappe (nicht am Seitenende = Anfang der
  // Reise) und läuft nur beim ersten Besuch pro Session; danach springt sie
  // direkt hin. Nutzer-Input bricht die Fahrt sofort ab; bei reduced motion
  // landet man ohne Fahrt direkt beim aktuellen Stern.
  useEffect(() => {
    const box = mapBoxRef.current;
    if (!box) return;

    const rect = box.getBoundingClientRect();
    const boxTop = rect.top + window.scrollY;
    const starY =
      boxTop +
      (CONSTELLATION[clamp(currentStep, 0, lastIndex)].y / VIEW_H) *
        rect.height;
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const center = clamp(starY - window.innerHeight / 2, 0, maxScroll);

    if (reduced) {
      window.scrollTo(0, center);
      return;
    }

    let swept = false;
    try {
      swept = sessionStorage.getItem(SWEPT_SESSION_KEY) === "1";
    } catch {
      // sessionStorage kann im Privat-Modus werfen — dann einfach animieren.
    }
    if (swept) {
      window.scrollTo(0, center);
      return;
    }

    const proxy = { y: window.scrollY };
    const tween = gsap.to(proxy, {
      y: center,
      duration: 1.5,
      delay: 0.15,
      ease: "power2.inOut",
      onUpdate: () => window.scrollTo(0, proxy.y),
    });
    try {
      sessionStorage.setItem(SWEPT_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }

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
  }, [reduced, currentStep, lastIndex]);

  // Gezeichnete Konstellation: Pfad durch die erledigten Sterne (der Server
  // liefert sie lückenlos ab 0) — mindestens zwei Punkte nötig.
  const maxDone = completedSteps.length ? Math.max(...completedSteps) : -1;
  const drawnPoints = CONSTELLATION.slice(0, maxDone + 1);
  const drawnPath =
    drawnPoints.length >= 2 ? buildTrailPath(drawnPoints) : null;

  const routeHint = buildTrailPath(CONSTELLATION);

  // Blick des Maskottchens zum aktuellen Stern
  const cur = CONSTELLATION[clamp(currentStep, 0, lastIndex)];
  const gazeX = clamp((cur.x - MASCOT_POS.x) / 140, -2, 2);
  const gazeY = clamp((cur.y - MASCOT_POS.y) / 140, -2, 0.5);

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader
        backHref="/me/values"
        title="Werteentdeckung"
        subtitle={subtitle}
      />

      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-6">
        <div
          ref={mapBoxRef}
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
            <g opacity="0.6">
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
            </g>

            {/* Angedeutete Route durch alle Sterne */}
            <path
              d={routeHint}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="1.5"
              strokeDasharray="2 6"
              strokeLinecap="round"
              opacity="0.25"
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

          {/* Wegmarken (Etappen) — echte Links, 44px-Hit-Area */}
          {STEP_LABELS.map((label, i) => {
            const state: State = done.has(i)
              ? "done"
              : i === currentStep
                ? "current"
                : "open";
            const finale = i === lastIndex;
            // Ein bereits erledigter Stern kann bei aktiver Tagessperre der
            // aktuelle Ruhepunkt sein: er bleibt angezündet, damit die Karte
            // nie ohne lebendigen Bezugspunkt dasteht.
            const isAnchor = gated && i === currentStep;
            const isActiveStep = isAnchor || state === "current";
            // Zustand auch für Screenreader hörbar machen (nicht nur Farbe/Form).
            const stateText = isActiveStep
              ? "aktuell"
              : state === "done"
                ? "erledigt"
                : "gesperrt";
            const { x, y, side } = CONSTELLATION[i];
            const clickable = state !== "open";
            // Bereits abgeschlossene Reflexionstage öffnen ihren eigenen
            // Eintrag (?day=N) statt des heutigen Formulars.
            const href =
              i >= 1 && i <= 7 && state === "done"
                ? `${STEP_LINKS[i]}?day=${i}`
                : STEP_LINKS[i];

            const labelEl = (
              <span
                className={cn(
                  "absolute top-1/2 flex items-center gap-1 font-heading",
                  // Die Endstation wird zweizeilig und wächst dadurch in der
                  // Höhe — sie hängt am Sternmittelpunkt statt zentriert zu
                  // sein, damit die erste Zeile nicht unter den Header rutscht.
                  finale ? "-translate-y-3.5" : "-translate-y-1/2",
                  finale ? "w-40 whitespace-normal" : "whitespace-nowrap",
                  finale ? "text-lg" : "text-base",
                  side === "right" ? "left-full ml-1.5" : "right-full mr-1.5",
                  finale && side !== "right" && "text-right",
                  state === "open"
                    ? "text-muted-foreground"
                    : "font-semibold text-foreground",
                  finale && "font-semibold",
                )}
              >
                {state === "open" && (
                  <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                {label}
                <span className="sr-only"> — {stateText}</span>
              </span>
            );

            const nodeClass =
              "absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center";
            const nodeStyle = {
              left: `${(x / VIEW_W) * 100}%`,
              top: `${(y / VIEW_H) * 100}%`,
            };

            // Locken-Cue: nur der aktuelle, HEUTE handlungsbereite Stern lockt
            // (an einem gesperrten Tag gibt es nichts anzutippen → kein Ring).
            const beckon =
              isActiveStep && !gated ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute left-1/2 top-1/2 rounded-full",
                    finale ? "size-11" : "size-8",
                    reduced
                      ? "-translate-x-1/2 -translate-y-1/2 border border-primary/40"
                      : "waymark-beckon border border-primary/50",
                  )}
                />
              ) : null;

            return clickable ? (
              <Link
                key={i}
                href={href}
                className={cn(
                  nodeClass,
                  "group rounded-full",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                )}
                style={nodeStyle}
                aria-current={isActiveStep ? "step" : undefined}
              >
                {/* Nur der Stern reagiert auf Hover/Tap — das Label wächst nicht mit. */}
                <span className="relative flex items-center justify-center transition duration-150 group-hover:scale-110 group-active:scale-95 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-active:scale-100">
                  {beckon}
                  <WaymarkGlyph
                    state={state}
                    reduced={reduced}
                    finale={finale}
                    anchor={isAnchor}
                  />
                </span>
                {labelEl}
              </Link>
            ) : (
              <span key={i} className={nodeClass} style={nodeStyle}>
                <WaymarkGlyph state={state} reduced={reduced} finale={finale} />
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

        {/* Erst-Besuch-Cue: Nur beim allerersten Aufruf (nichts erledigt, bei
            der Hypothese) sagen wir in Worten, dass der leuchtende Stern das
            Interaktions-Element ist — der Beckon-Ring allein trägt das für
            Erst-Nutzer nicht. Verschwindet dauerhaft, sobald Schritt 0 erledigt
            ist. Bewusst hier unter der Karte, NICHT im Header-Untertitel (den
            besetzt der Tages-Hinweis). Schließt `allDone` gegenseitig aus. */}
        {!allDone && currentStep === 0 && (
          <Reveal delay={0.6} className="pt-4">
            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              Tipp den leuchtenden Stern an, um zu starten.
            </p>
          </Reveal>
        )}

        {/* Tages-Gate: „Heute geschafft — morgen geht's weiter" steht als
            einziger, immer sichtbarer Hinweis im Header-Untertitel (siehe
            `subtitle`). Kein doppelter Banner am Seitenende. */}
        {allDone && (
          <Reveal delay={0.8} className="pt-4">
            <div className="text-center">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Dein Kompass ist kalibriert.
              </p>
              <Link
                href="/me/values/journey/evaluation"
                className="mt-2 inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Erkenntnisse ansehen
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}
