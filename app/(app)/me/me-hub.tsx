"use client";

import Link from "next/link";

import { Reveal } from "@/components/ui/reveal";
import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";
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

type Scene = {
  href: string;
  ariaLabel: string;
  art: React.ReactNode;
  title: string;
  body: React.ReactNode;
};

/** Eine Meander-Szene: Signatur + Text, links/rechts versetzt auf dem Nachthimmel. */
function MeanderScene({
  scene,
  side,
  delay,
}: {
  scene: Scene;
  side: "left" | "right";
  delay: number;
}) {
  const left = side === "left";
  return (
    <Reveal delay={delay} className={left ? "self-start" : "self-end"}>
      <Link
        href={scene.href}
        aria-label={scene.ariaLabel}
        className="group block w-[min(17rem,76vw)] rounded-xl px-3 py-4 transition-[background-color,scale] duration-150 ease-out hover:bg-muted/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className={`flex items-center gap-4 ${left ? "flex-row" : "flex-row-reverse"}`}>
          <span className="shrink-0">{scene.art}</span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block font-heading text-lg font-semibold text-foreground">
              {scene.title}
            </span>
            <span className="mt-1.5 block">{scene.body}</span>
          </span>
        </span>
      </Link>
    </Reveal>
  );
}

export function MeHub({ values, firstRight, rightsCount, wantsCount, openBets }: MeHubData) {
  const reduced = useReducedMotion();
  const animate = !reduced;
  const valuesCount = values.length;
  const openBetsCount = openBets.length;

  const wantsMeta =
    wantsCount > 0 ? `${wantsCount} Wants entdeckt` : "Noch keine Wants entdeckt";

  const scenes: Scene[] = [
    {
      href: "/me/values",
      ariaLabel: "Meine Werte öffnen",
      art: <CompassArt emojis={values.map((v) => v.emoji)} animate={animate} className="size-16" />,
      title: "Meine Werte",
      body:
        valuesCount > 0 ? (
          <span className="flex flex-wrap gap-1.5">
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
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Deine Kompassrose wartet darauf, sich zu füllen.
          </span>
        ),
    },
    {
      href: "/me/wants",
      ariaLabel: `${PAGE_TITLES.meWants} öffnen`,
      art: <StarArt animate={animate} dim={wantsCount === 0} className="size-16" />,
      title: PAGE_TITLES.meWants,
      body:
        openBetsCount > 0 ? (
          <span className="flex flex-wrap gap-1.5">
            {openBets.slice(0, 2).map((bet, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
              >
                <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                <span className="max-w-[9rem] truncate">{bet}</span>
              </span>
            ))}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{wantsMeta}</span>
        ),
    },
    {
      href: "/me/bill-of-rights",
      ariaLabel: "Meine Bill of Rights öffnen",
      art: <SealArt animate={animate} className="size-16" />,
      title: "Meine Bill of Rights",
      body:
        rightsCount > 0 && firstRight ? (
          <span className="line-clamp-2 font-affirmation text-sm leading-snug text-foreground">
            „{asAffirmation(firstRight)}&#8220;
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Dieses Dokument wartet auf dein erstes Recht.
          </span>
        ),
    },
  ];

  return (
    <div className="relative -mx-4 overflow-x-clip">
      {/* Geteilter Nachthimmel wie auf Dashboard/Booster (neutral, kein Score). */}
      <SkyBackdrop />
      <div className="relative z-10 flex flex-col gap-16 px-4 py-4">
        {scenes.map((scene, i) => (
          <MeanderScene
            key={scene.href}
            scene={scene}
            side={i % 2 === 0 ? "left" : "right"}
            delay={i * 0.12}
          />
        ))}
      </div>
    </div>
  );
}
