"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { StarArt } from "@/components/brand/star-art";
import { CompassArt, SealArt } from "@/components/brand/me-ornaments";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { PAGE_TITLES } from "@/lib/content/labels";

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

      {/* Wants — die Experimente */}
      <Reveal delay={0.12}>
        <Scene
          href="/me/wants"
          ariaLabel={`${PAGE_TITLES.meWants} öffnen`}
          art={<StarArt animate={animate} dim={wantsCount === 0} />}
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

      {/* Bill of Rights — die Urkunde mit Siegel */}
      <Reveal delay={0.24}>
        <Scene
          href="/me/bill-of-rights"
          ariaLabel="Meine Bill of Rights öffnen"
          art={<SealArt animate={animate} />}
        >
          <SceneTitle>Meine Bill of Rights</SceneTitle>
          {rightsCount > 0 && firstRight ? (
            <p className="mt-2 line-clamp-2 font-affirmation text-sm leading-snug text-foreground">
              „{asAffirmation(firstRight)}&#8220;
            </p>
          ) : (
            <SceneMeta>Dieses Dokument wartet auf dein erstes Recht.</SceneMeta>
          )}
        </Scene>
      </Reveal>
      </div>
    </div>
  );
}
