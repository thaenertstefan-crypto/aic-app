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

type Tile = {
  /** Ich-Satz, nach dem man im akuten Moment sucht — die "Antwort" auf die
   *  Frage im Header. */
  feeling: string;
  /** Modulname, leise Meta-Zeile unter dem Ich-Satz. */
  title: string;
  /** Das Wetter-Motiv der Zelle (siehe weather-art.tsx). */
  art: React.ReactNode;
  href: string;
};

const TILES: Tile[] = [
  {
    feeling: "Ich denke im Kreis",
    title: "Overthinking",
    art: <WindSwirl />,
    href: "/booster/overthinking",
  },
  {
    feeling: "Gerade ist alles zu viel",
    title: PAGE_TITLES.thingsGotMessy,
    art: <CloudStack />,
    href: "/booster/things-got-messy",
  },
  {
    feeling: "Ich kann schlecht Nein sagen",
    title: PAGE_TITLES.sayingNo,
    art: <UmbrellaRain />,
    href: "/booster/saying-no",
  },
  {
    feeling: "Ich muss Dampf ablassen",
    title: PAGE_TITLES.shadow,
    art: <StormCloud />,
    href: "/booster/shadow",
  },
  {
    feeling: "Ich brauche Selbstvertrauen",
    title: PAGE_TITLES.confidence,
    art: <ClearingStar />,
    href: "/booster/confidence",
  },
];

/** Eine Zelle des Himmelsausschnitts: Motiv über Ich-Satz und Modulname; die Haarlinie der Reihe bleibt als ruhige Rahmenlinie. */
function SkyCell({ tile }: { tile: Tile }) {
  return (
    <Link
      href={tile.href}
      className="flex flex-col items-center gap-3 rounded-xl px-2 pb-5 pt-4 text-center transition-[background-color,transform] duration-150 ease-out hover:bg-muted/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="flex h-16 items-end">{tile.art}</div>
      <p className="min-w-0 font-heading text-base font-medium leading-snug text-balance text-foreground">
        {tile.feeling}
      </p>
      {/* mt-auto zieht die Etiketten einer Reihe auf eine Linie,
          auch wenn der Ich-Satz daneben zweizeilig umbricht. */}
      <p className="mt-auto text-xs text-muted-foreground">{tile.title}</p>
    </Link>
  );
}

/** Je zwei Motive teilen sich eine Reihe — das letzte steht allein. */
const ROWS = [TILES.slice(0, 2), TILES.slice(2, 4), TILES.slice(4)];

export default function BoosterPage() {
  return (
    <div className="space-y-6 p-4">
      <header className="space-y-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
          {PAGE_TITLES.booster}
        </h1>
        <p className="text-sm text-muted-foreground">
          Manchmal zieht Wetter auf: Zweifel, Grübeln, alles zu viel. Es zieht
          vorbei — bis dahin helfen dir diese Übungen.
        </p>
      </header>

      <div className="relative -mx-1">
        {/* Dieselbe wandernde Kerze wie auf /me scheint durch den Himmelsausschnitt —
            die beiden Hubs sind Räume desselben Hauses. Rein dekorativ;
            bei reduced motion steht sie still (globals.css). */}
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

        <div className="relative z-10">
          {ROWS.map((row, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div
                className={`grid border-b border-border/70 ${
                  row.length === 1 ? "grid-cols-1" : "grid-cols-2"
                }`}
              >
                {row.map((tile) => (
                  <SkyCell key={tile.title} tile={tile} />
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
