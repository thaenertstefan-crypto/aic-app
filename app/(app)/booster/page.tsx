import Link from "next/link";

import { Reveal } from "@/components/ui/reveal";
import { PAGE_TITLES } from "@/lib/content/labels";
import { PressureField } from "./pressure-field";
import { PressureCell, type CellVariant } from "./pressure-cell";
import {
  ClearingStar,
  CloudStack,
  StormCloud,
  UmbrellaRain,
  WindSwirl,
} from "./weather-art";

type WeatherSystem = {
  /** Ich-Satz, nach dem man im akuten Moment sucht — primäres Label. */
  feeling: string;
  /** Modulname, leise Meta-Zeile. */
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

export default function BoosterPage() {
  return (
    <div className="space-y-6 p-4">
      <header className="space-y-3">
        <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground">
          {PAGE_TITLES.booster}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Manchmal schlägt das Wetter um: Zweifel, Gedankenspiralen oder
          Überforderung ziehen auf. Das ist normal und das zieht auch wieder
          vorbei. Die folgenden Hilfen machen dich wetterfest gegen die Stürme
          und Regenwolken in deinem Kopf. Was brauchst du gerade?
        </p>
      </header>

      <div className="relative -mx-4 overflow-x-clip">
        <PressureField />
        <div className="relative z-10 flex flex-col gap-14 px-4 py-4">
          {SYSTEMS.map((s, i) => {
            const left = i % 2 === 0;
            return (
              <Reveal
                key={s.href}
                delay={i * 0.09}
                className={left ? "self-start" : "self-end"}
              >
                <Link
                  href={s.href}
                  aria-label={`${s.title} — ${s.feeling}`}
                  className="group block w-[min(17rem,82vw)] rounded-xl px-3 py-3 transition-[background-color,scale] duration-150 ease-out hover:bg-muted/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {/* Icon + Text driften als Einheit mit den Ringen mit
                      („ziehendes Wetter"); der Link bleibt fester Tap-Target. */}
                  <span
                    className={`kw-cell-drift flex items-center gap-3 ${
                      left ? "flex-row text-left" : "flex-row-reverse text-right"
                    }`}
                    style={{ animationDelay: `${i * -1.7}s` }}
                  >
                    <PressureCell
                      art={s.art}
                      side={left ? "left" : "right"}
                      variant={s.variant}
                    />
                    <span className="relative z-10 flex flex-col gap-1">
                      <span className="kw-legible font-heading text-sm font-medium leading-snug text-balance text-foreground">
                        {s.feeling}
                      </span>
                      <span className="kw-legible text-[11px] text-muted-foreground">
                        {s.title}
                      </span>
                    </span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </div>
  );
}
