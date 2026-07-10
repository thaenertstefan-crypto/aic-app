"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { PAGE_TITLES } from "@/lib/content/labels";
import { cn } from "@/lib/utils";

export type ValueChip = { emoji: string; label: string };

export type MeHubData = {
  values: ValueChip[];
  firstRight: string | null;
  rightsCount: number;
  wantsCount: number;
  openBets: string[];
};

/** Ein Recht liest sich immer als ganzer Affirmations-Satz (vgl. Bill of Rights). */
function asAffirmation(text: string): string {
  return text.startsWith("Ich habe das Recht")
    ? text
    : `Ich habe das Recht, ${text}`;
}

// ─── Ornamente (die Signatur des jeweiligen Raums, in Miniatur) ──────────

/** Kompassrose mit den echten Werte-Emojis als Himmelsrichtungen. */
function CompassArt({ emojis, animate }: { emojis: string[]; animate: boolean }) {
  const pos = [
    { x: 32, y: 16 }, // N
    { x: 50, y: 35 }, // O
    { x: 32, y: 54 }, // S
    { x: 14, y: 35 }, // W
  ];
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-14", emojis.length === 0 && "opacity-40")}
      aria-hidden="true"
    >
      <circle
        cx="32"
        cy="32"
        r="26"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1"
        opacity="0.3"
        className={animate ? "me-ring-draw" : undefined}
      />
      <circle cx="32" cy="32" r="20" fill="none" stroke="var(--primary)" strokeWidth="0.6" opacity="0.16" />
      <g className={animate ? "me-needle-sway" : undefined}>
        <polygon points="32,10 35,32 32,30 29,32" fill="var(--primary)" opacity="0.9" />
        <polygon points="32,54 29,32 32,34 35,32" fill="var(--primary)" opacity="0.35" />
      </g>
      {emojis.slice(0, 4).map((e, i) => (
        <text key={i} x={pos[i].x} y={pos[i].y} textAnchor="middle" dominantBaseline="central" fontSize="9">
          {e}
        </text>
      ))}
    </svg>
  );
}

/** Goldenes Wachssiegel mit §-Prägung — 12 Bogenkreise (r=4) auf Radius 21. */
function SealArt({ animate }: { animate: boolean }) {
  const scallops = Array.from({ length: 12 }, (_, k) => {
    const rad = (Math.PI * (k * 30)) / 180;
    return {
      cx: +(28 + 21 * Math.cos(rad)).toFixed(2),
      cy: +(28 + 21 * Math.sin(rad)).toFixed(2),
    };
  });
  return (
    <span className={cn("inline-block", animate && "me-seal-stamp")}>
      <svg
        viewBox="0 0 56 56"
        className={cn("size-12", animate && "me-seal-glow")}
        style={{ transform: "rotate(-6deg)" }}
        aria-hidden="true"
      >
        {scallops.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r="4" fill="var(--primary)" opacity="0.9" />
        ))}
        <circle cx="28" cy="28" r="21" fill="var(--primary)" opacity="0.95" />
        <circle cx="28" cy="28" r="15" fill="none" stroke="var(--primary-foreground)" strokeWidth="1" opacity="0.3" />
        <text
          x="28"
          y="34"
          textAnchor="middle"
          fontSize="17"
          fontFamily="var(--font-heading)"
          fontWeight="600"
          fill="var(--primary-foreground)"
        >
          §
        </text>
      </svg>
    </span>
  );
}

/** Kolben der Wants-Experimente (Bets), mit aufsteigenden Blasen. */
function FlaskArt({ animate, dim }: { animate: boolean; dim: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-12", dim && "opacity-40")} aria-hidden="true">
      <path
        d="M20 8v10L11 34a3 3 0 003 4h20a3 3 0 003-4l-9-16V8"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.6"
        opacity="0.85"
      />
      <path d="M16 27h16l4 7a3 3 0 01-3 4H15a3 3 0 01-3-4z" fill="var(--primary)" opacity="0.16" />
      {animate && (
        <>
          <circle className="me-bubble" cx="21" cy="32" r="1.6" fill="var(--primary)" />
          <circle className="me-bubble me-bubble-2" cx="27" cy="33" r="1.2" fill="var(--primary)" />
        </>
      )}
      <line x1="18" y1="8" x2="30" y2="8" stroke="var(--primary)" strokeWidth="1.6" />
    </svg>
  );
}

// ─── Die Szene: ein lichtdurchflutetes Fenster in einen Raum ─────────────

function Scene({
  href,
  ariaLabel,
  art,
  children,
}: {
  href: string;
  ariaLabel: string;
  art: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="relative flex items-center gap-3 rounded-xl py-8 transition-colors hover:bg-muted/20"
    >
      <div className="shrink-0">{art}</div>
      <div className="min-w-0 flex-1">
        <div className="max-w-2xl">{children}</div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function SceneTitle({ children }: { children: React.ReactNode }) {
  return <p className="font-heading text-base font-semibold text-foreground">{children}</p>;
}

function SceneMeta({ children }: { children: React.ReactNode }) {
  return <p className="mt-0.5 text-xs text-muted-foreground">{children}</p>;
}

export function MeHub({ values, firstRight, rightsCount, wantsCount, openBets }: MeHubData) {
  const reduced = useReducedMotion();
  const animate = !reduced;
  const valuesCount = values.length;
  const openBetsCount = openBets.length;

  const wantsMeta =
    wantsCount > 0
      ? openBetsCount > 0
        ? `${wantsCount} Wants · ${openBetsCount} offene ${openBetsCount === 1 ? "Bet" : "Bets"}`
        : `${wantsCount} Wants entdeckt`
      : "Noch keine Wants entdeckt";

  return (
    <div className="relative -mx-1">
      {/* Eine einzelne Kerze wandert langsam durch den gesamten Hub-Hintergrund
          und flackert leise — sie scheint durch die transparenten Szenen (nur
          Haarlinien) hindurch. Bei reduced-motion aus. */}
      {!reduced && (
        <span
          aria-hidden="true"
          className="me-candle-bg pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage:
              "radial-gradient(closest-side, color-mix(in srgb, var(--primary) 16%, transparent), transparent 72%)",
            backgroundRepeat: "no-repeat",
            backgroundSize: "75% 55%",
          }}
        />
      )}

      <div className="relative z-10 divide-y divide-border/70">
        {/* Werte — die Kompassrose */}
        <Reveal delay={0}>
          <Scene
            href="/me/values"
            ariaLabel="Meine Werte öffnen"
            art={<CompassArt emojis={values.map((v) => v.emoji)} animate={animate} />}
          >
          <SceneTitle>Meine Werte</SceneTitle>
          {valuesCount > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {values.slice(0, 4).map((v) => (
                <span
                  key={v.label}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-white/5 px-2 py-0.5 text-xs text-foreground"
                >
                  <span aria-hidden="true">{v.emoji}</span>
                  {v.label}
                </span>
              ))}
              {valuesCount > 4 && (
                <span className="inline-flex items-center rounded-full border border-border bg-white/5 px-2 py-0.5 text-xs text-muted-foreground">
                  +{valuesCount - 4}
                </span>
              )}
            </div>
          ) : (
            <SceneMeta>Deine Kompassrose wartet darauf, sich zu füllen.</SceneMeta>
          )}
        </Scene>
      </Reveal>

      {/* Bill of Rights — die Urkunde mit Siegel */}
      <Reveal delay={0.12}>
        <Scene
          href="/me/bill-of-rights"
          ariaLabel="Meine Bill of Rights öffnen"
          art={<SealArt animate={animate} />}
        >
          <SceneTitle>Meine Bill of Rights</SceneTitle>
          {rightsCount > 0 && firstRight ? (
            <p className="mt-2 line-clamp-2 font-heading text-sm italic leading-snug text-foreground">
              „{asAffirmation(firstRight)}&#8220;
            </p>
          ) : (
            <SceneMeta>Dieses Dokument wartet auf dein erstes Recht.</SceneMeta>
          )}
        </Scene>
      </Reveal>

      {/* Wants — die Experimente */}
      <Reveal delay={0.24}>
        <Scene
          href="/me/wants"
          ariaLabel={`${PAGE_TITLES.meWants} öffnen`}
          art={<FlaskArt animate={animate} dim={wantsCount === 0} />}
        >
          <SceneTitle>{PAGE_TITLES.meWants}</SceneTitle>
          {openBetsCount > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {openBets.slice(0, 2).map((bet, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                >
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                  <span className="max-w-[9rem] truncate">{bet}</span>
                </span>
              ))}
            </div>
          ) : (
            <SceneMeta>{wantsMeta}</SceneMeta>
          )}
        </Scene>
      </Reveal>
      </div>
    </div>
  );
}
