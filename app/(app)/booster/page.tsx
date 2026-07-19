import Link from "next/link";

import { Reveal } from "@/components/ui/reveal";
import { PAGE_TITLES } from "@/lib/content/labels";
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
  href: string;
  /** Position des System-Zentrums auf der Karte (viewBox-Koordinaten 200×340). */
  x: number;
  y: number;
};

const SYSTEMS: WeatherSystem[] = [
  { feeling: "Ich denke im Kreis", title: "Overthinking", art: <WindSwirl />, href: "/booster/overthinking", x: 96, y: 118 },
  { feeling: "Gerade ist alles zu viel", title: PAGE_TITLES.thingsGotMessy, art: <CloudStack />, href: "/booster/things-got-messy", x: 52, y: 192 },
  { feeling: "Ich kann schlecht Nein sagen", title: PAGE_TITLES.sayingNo, art: <UmbrellaRain />, href: "/booster/saying-no", x: 146, y: 178 },
  { feeling: "Ich muss Dampf ablassen", title: PAGE_TITLES.shadow, art: <StormCloud />, href: "/booster/shadow", x: 62, y: 262 },
  { feeling: "Ich brauche Selbstvertrauen", title: PAGE_TITLES.confidence, art: <ClearingStar />, href: "/booster/confidence", x: 142, y: 252 },
];

export default function BoosterPage() {
  return (
    <div className="space-y-6 p-4">
      <header className="space-y-3">
        <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground">
          {PAGE_TITLES.booster}
        </h1>
        <p className="text-sm text-muted-foreground">
          Manchmal zieht Wetter auf: Zweifel, Grübeln, alles zu viel. Es zieht
          vorbei — bis dahin helfen dir diese Übungen.
        </p>
      </header>

      <Reveal>
        <div className="relative w-full" style={{ aspectRatio: "200 / 340" }}>
          {/* Karten-Untergrund: Isobaren, Kopf-Insel, Front-Linie — reine Deko */}
          <svg viewBox="0 0 200 340" className="absolute inset-0 size-full" aria-hidden="true">
            {/* Isobaren */}
            <g fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.18" strokeWidth="0.8">
              <ellipse cx="100" cy="185" rx="92" ry="130" />
              <ellipse cx="100" cy="185" rx="72" ry="105" />
              <ellipse cx="104" cy="180" rx="50" ry="78" />
            </g>
            {/* Insel: aus dem Augenwinkel eine Kopf-Silhouette im Profil */}
            <path
              d="M70 268 C 40 250, 38 210, 52 185 C 44 170, 48 140, 66 126 C 70 96, 100 82, 126 92 C 152 100, 162 128, 156 154 C 166 166, 164 186, 154 196 C 158 212, 150 230, 136 236 C 134 254, 118 268, 100 266 C 90 274, 78 274, 70 268 Z"
              fill="var(--primary)"
              fillOpacity="0.06"
              stroke="var(--primary)"
              strokeOpacity="0.35"
              strokeWidth="1"
            />
            {/* Front-Linie (Deko) */}
            <path d="M30 60 Q 70 42 110 30 Q 150 18 180 24" fill="none" stroke="var(--cleanser-confidence)" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="1 3" />
            <g fill="var(--cleanser-confidence)" fillOpacity="0.4">
              <path d="M70 44 l4 -1 -2 4 Z" />
              <path d="M120 27 l4 -1 -2 4 Z" />
            </g>
          </svg>

          {/* Die 5 Wettersysteme — echte Links auf der Karte */}
          {SYSTEMS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-label={`${s.title} — ${s.feeling}`}
              className="absolute z-10 flex w-36 -translate-x-1/2 -translate-y-9 flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition-[background-color,transform] duration-150 ease-out hover:bg-muted/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              style={{ left: `${(s.x / 200) * 100}%`, top: `${(s.y / 340) * 100}%` }}
            >
              {s.art}
              <p className="font-heading text-sm font-medium leading-snug text-balance text-foreground">
                {s.feeling}
              </p>
              <p className="text-[11px] text-muted-foreground">{s.title}</p>
            </Link>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
