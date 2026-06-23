"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { Mascot } from "@/components/brand/mascot";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

// ─── Geometrie ────────────────────────────────────────────────────────
const DOT_PX = 34;
const ROW_GAP = 28;
const STEP_H = DOT_PX + ROW_GAP; // 62
const DOT_CENTER = DOT_PX / 2; // 17
const MASCOT_PX = 56; // Mascot size="sm" = size-14

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
  "/recipes/values/hypothesis",
  "/recipes/values/journal",
  "/recipes/values/journal",
  "/recipes/values/journal",
  "/recipes/values/journal",
  "/recipes/values/journal",
  "/recipes/values/journal",
  "/recipes/values/journal",
  "/recipes/values/evaluation",
];

// ─── Kompass: aufbauende Deltas ───────────────────────────────────────
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const CX = 30;
const CY = 27;

const COMPASS_TICKS = ANGLES.map((a) => {
  const rad = (Math.PI * a) / 180;
  const x1 = (CX + 21.5 * Math.sin(rad)).toFixed(2);
  const y1 = (CY - 21.5 * Math.cos(rad)).toFixed(2);
  const x2 = (CX + 19 * Math.sin(rad)).toFixed(2);
  const y2 = (CY - 19 * Math.cos(rad)).toFixed(2);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--primary)" stroke-width="1" opacity=".35"/>`;
}).join("");

const COMPASS_PETALS = ANGLES.map((a) => {
  const rad = (Math.PI * a) / 180;
  const perp = rad + Math.PI / 2;
  const tipX = (CX + 14 * Math.sin(rad)).toFixed(1);
  const tipY = (CY - 14 * Math.cos(rad)).toFixed(1);
  const baseX = CX + 6 * Math.sin(rad);
  const baseY = CY - 6 * Math.cos(rad);
  const midX = CX + 10 * Math.sin(rad);
  const midY = CY - 10 * Math.cos(rad);
  const lX = (midX + 2.4 * Math.sin(perp)).toFixed(1);
  const lY = (midY - 2.4 * Math.cos(perp)).toFixed(1);
  const rX = (midX - 2.4 * Math.sin(perp)).toFixed(1);
  const rY = (midY + 2.4 * Math.cos(perp)).toFixed(1);
  return `<path d="M${tipX},${tipY} L${lX},${lY} L${baseX.toFixed(1)},${baseY.toFixed(1)} L${rX},${rY} Z" fill="var(--primary)" opacity=".28"/>`;
}).join("");

const COMPASS_DELTAS: string[] = [
  /* 0 */ `<circle cx="30" cy="27" r="21" fill="none" stroke="var(--primary)" stroke-width="1.8" opacity=".9"/><circle cx="30" cy="27" r="18.5" fill="none" stroke="var(--primary)" stroke-width=".5" opacity=".2"/>`,
  /* 1 */ `<polygon points="30,6 33.5,21 30,18 26.5,21" fill="var(--primary)"/><text x="30" y="3.5" text-anchor="middle" font-size="5.5" font-weight="700" fill="var(--primary)" font-family="sans-serif">N</text>`,
  /* 2 */ `<line x1="51" y1="27" x2="43" y2="27" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" opacity=".7"/><text x="55" y="29.5" text-anchor="middle" font-size="5" fill="var(--primary)" font-family="sans-serif" opacity=".7">E</text>`,
  /* 3 */ `<polygon points="30,48 26.5,33 30,36 33.5,33" fill="var(--primary)" opacity=".28"/><text x="30" y="55" text-anchor="middle" font-size="5" fill="var(--primary)" font-family="sans-serif" opacity=".45">S</text>`,
  /* 4 */ `<line x1="9" y1="27" x2="17" y2="27" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" opacity=".7"/><text x="5" y="29.5" text-anchor="middle" font-size="5" fill="var(--primary)" font-family="sans-serif" opacity=".7">W</text>`,
  /* 5 */ `<circle cx="30" cy="27" r="13" fill="none" stroke="var(--primary)" stroke-width=".8" opacity=".3"/>${COMPASS_TICKS}`,
  /* 6 */ `<polygon points="30,7 33.5,27 30,22 26.5,27" fill="var(--primary)"/>`,
  /* 7 */ `<polygon points="30,47 26.5,27 30,32 33.5,27" fill="var(--accent)" opacity=".75"/>`,
  /* 8 */ `${COMPASS_PETALS}<circle cx="30" cy="27" r="6" fill="var(--primary)" opacity=".2"/><circle cx="30" cy="27" r="3.5" fill="var(--primary)"/>`,
];

type State = "done" | "current" | "open";

function compassInner(i: number, state: State): string | null {
  if (state === "open") return null;
  const base = COMPASS_DELTAS.slice(0, i).join("");
  const delta = COMPASS_DELTAS[i] ?? "";
  if (state === "done") {
    return `<g opacity="0.2">${base}${delta}</g>`;
  }
  // current: Vorläufer stabil, nur das neue Delta blendet ein
  return `<g>${base}</g><g class="compass-delta-new">${delta}</g>`;
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

  const trackHeight = lastIndex * STEP_H;
  const fillHeight = Math.min(currentStep, lastIndex) * STEP_H;
  const mascotTop = currentStep * STEP_H + DOT_CENTER - MASCOT_PX / 2;

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/me/values" title="Werteentdeckung" />
      <style>{`
        .compass-delta-new { animation: compassIn 0.9s ease forwards; }
        @keyframes compassIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes journeyPulse {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 45%, transparent); }
          50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--primary) 0%, transparent); }
        }
        .journey-pulse { animation: journeyPulse 2.2s ease-in-out infinite; }
      `}</style>

      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-8">
        <div className="relative">
          {/* Verbindungslinie + Fortschrittsstreifen */}
          <span
            className="absolute w-0.5 rounded bg-border"
            style={{ left: DOT_CENTER - 1, top: DOT_CENTER, height: trackHeight }}
          />
          <span
            className="absolute w-0.5 rounded bg-primary transition-[height] duration-700"
            style={{ left: DOT_CENTER - 1, top: DOT_CENTER, height: fillHeight }}
          />

          {/* Mitwanderndes Maskottchen */}
          <div
            className="absolute"
            style={{
              left: DOT_CENTER - MASCOT_PX / 2,
              top: mascotTop,
              zIndex: 20,
              transition: reduced
                ? "none"
                : "top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <Mascot size="sm" expression="curious" gazeY={-1} />
          </div>

          {/* Meilensteine */}
          {STEP_LABELS.map((label, i) => {
            const state: State = done.has(i)
              ? "done"
              : i === currentStep
                ? "current"
                : "open";
            const inner = compassInner(i, state);
            const clickable = state !== "open";

            const labelEl = (
              <span
                className={cn(
                  "font-heading text-sm",
                  state === "open"
                    ? "text-muted-foreground/60"
                    : "font-medium text-foreground",
                )}
              >
                {label}
              </span>
            );

            return (
              <div
                key={i}
                className="relative"
                style={{ height: STEP_H }}
              >
                {/* Dot */}
                <div
                  className={cn(
                    "absolute left-0 top-0 z-10 flex items-center justify-center rounded-full",
                    state === "done" && "bg-primary text-primary-foreground",
                    state === "current" &&
                      "border-2 border-primary bg-background",
                    state === "current" && !reduced && "journey-pulse",
                    state === "open" &&
                      "border-2 border-muted-foreground/30 bg-background opacity-60",
                  )}
                  style={{ width: DOT_PX, height: DOT_PX }}
                >
                  {state === "done" && <Check className="size-4" />}
                </div>

                {/* Label (klickbar, wenn done/current) */}
                <div
                  className="absolute -translate-y-1/2"
                  style={{ left: DOT_PX + 12, right: 72, top: DOT_CENTER }}
                >
                  {clickable ? (
                    <Link href={STEP_LINKS[i]} className="hover:underline">
                      {labelEl}
                    </Link>
                  ) : (
                    labelEl
                  )}
                </div>

                {/* Kompass */}
                {inner && (
                  <div
                    className="absolute -translate-y-1/2"
                    style={{ right: 0, top: DOT_CENTER, width: 62, height: 54 }}
                  >
                    <svg
                      viewBox="0 0 60 54"
                      width="62"
                      height="54"
                      dangerouslySetInnerHTML={{ __html: inner }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
