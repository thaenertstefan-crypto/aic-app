"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent } from "react";

import { Reveal } from "@/components/ui/reveal";
import { PAGE_TITLES } from "@/lib/content/labels";
import { PressureCell, type CellVariant } from "@/app/(app)/booster/pressure-cell";
import {
  ClearingStar,
  CloudStack,
  StormCloud,
  UmbrellaRain,
  WindSwirl,
} from "@/app/(app)/booster/weather-art";
import { useBoosterZoom } from "@/components/booster/booster-zoom";

type WeatherSystem = {
  feeling: string;
  title: string;
  art: React.ReactNode;
  variant: CellVariant;
  href: string;
};

const SYSTEMS: WeatherSystem[] = [
  { feeling: "Ich bin am overthinken", title: "Overthinking", art: <WindSwirl />, variant: "overthinking", href: "/booster/overthinking" },
  { feeling: "Ich will zu etwas Nein sagen, aber weiß nicht wie", title: PAGE_TITLES.sayingNo, art: <UmbrellaRain />, variant: "sayingNo", href: "/booster/saying-no" },
  { feeling: "Ich fühl mich schuldig, obwohl ich es nicht sollte", title: PAGE_TITLES.thingsGotMessy, art: <CloudStack />, variant: "messy", href: "/booster/things-got-messy" },
  { feeling: "Ich muss Dampf ablassen", title: PAGE_TITLES.shadow, art: <StormCloud />, variant: "shadow", href: "/booster/shadow" },
  {
    feeling:
      "Ich gehe gleich in eine nervenaufreibende Situation und brauche einen schnellen Confidence Boost",
    title: PAGE_TITLES.confidence,
    art: <ClearingStar />,
    variant: "confidence",
    href: "/booster/confidence",
  },
];

export function BoosterCells() {
  const router = useRouter();
  const { zoomInto } = useBoosterZoom();

  function handleClick(e: MouseEvent<HTMLAnchorElement>, system: WeatherSystem) {
    // Modifier/Mittelklick → normaler Link (neuer Tab etc.).
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    const link = e.currentTarget;
    const iconEl = (link.querySelector("[data-cell-icon]") as HTMLElement | null) ?? link;
    const r = iconEl.getBoundingClientRect();
    zoomInto(
      {
        rect: { x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.width },
        variant: system.variant,
      },
      () => router.push(system.href),
    );
  }

  // Der Kamera-Push sitzt nicht mehr hier, sondern eine Ebene höher auf der
  // ganzen Hub-Bühne (BoosterHubStage) — sonst bliebe der Seitenkopf während
  // des Übergangs stehen. Hier bleibt nur der Tap-Punkt-Melder.
  return (
    <div data-nav-spinner="off">
      <div className="relative z-10 flex flex-col gap-16 px-4 py-4" data-e2e="booster-cells">
        {SYSTEMS.map((s, i) => {
          const left = i % 2 === 0;
          return (
            <Reveal key={s.href} delay={i * 0.09} className={left ? "self-start" : "self-end"}>
              <Link
                href={s.href}
                onClick={(e) => handleClick(e, s)}
                aria-label={`${s.title} — ${s.feeling}`}
                className="group block w-[min(17rem,82vw)] rounded-xl px-3 py-3 transition-[background-color,scale] duration-150 ease-out hover:bg-muted/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span
                  className={`kw-cell-drift flex items-center gap-3 ${
                    left ? "flex-row text-left" : "flex-row-reverse text-right"
                  }`}
                  style={{ animationDelay: `${i * -1.7}s` }}
                >
                  <span data-cell-icon className="inline-flex">
                    <PressureCell art={s.art} side={left ? "left" : "right"} variant={s.variant} />
                  </span>
                  <span className="relative z-10 flex flex-col gap-1">
                    <span className="kw-legible font-heading text-lg font-medium leading-snug text-balance text-foreground">
                      {s.feeling}
                    </span>
                  </span>
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
