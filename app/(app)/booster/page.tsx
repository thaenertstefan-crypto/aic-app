import Link from "next/link";

import { Mascot } from "@/components/brand/mascot";
import { Reveal } from "@/components/ui/reveal";
import { PAGE_TITLES } from "@/lib/content/labels";
import {
  ConfidenceFlask,
  MessyJar,
  NoVial,
  PromiseJar,
  ShadowPot,
  SpiralFlask,
} from "./vessels";

type Tile = {
  /** Ich-Satz, nach dem man im akuten Moment sucht — die "Antwort" auf die
   *  Frage im Header. */
  feeling: string;
  /** Modulname, leise Meta-Zeile unter dem Ich-Satz. */
  title: string;
  /** Das Gefäß im Regal (siehe vessels.tsx). */
  art: React.ReactNode;
  href: string;
};

const TILES: Tile[] = [
  {
    feeling: "Ich denke im Kreis",
    title: "Overthinking",
    art: <SpiralFlask />,
    href: "/booster/overthinking",
  },
  {
    feeling: "Gerade ist alles zu viel",
    title: PAGE_TITLES.thingsGotMessy,
    art: <MessyJar />,
    href: "/booster/things-got-messy",
  },
  {
    feeling: "Ich kann schlecht Nein sagen",
    title: PAGE_TITLES.sayingNo,
    art: <NoVial />,
    href: "/booster/saying-no",
  },
  {
    feeling: "Ich muss Dampf ablassen",
    title: PAGE_TITLES.shadow,
    art: <ShadowPot />,
    href: "/booster/shadow",
  },
  {
    feeling: "Ich brauche Selbstvertrauen",
    title: PAGE_TITLES.confidence,
    art: <ConfidenceFlask />,
    href: "/booster/confidence",
  },
  {
    feeling: "Ich will zu mir stehen",
    title: "Promise Keeper",
    art: <PromiseJar />,
    href: "/booster/promises",
  },
];

/** Ein Regalfach: Gefäß steht auf dem Brett (Haarlinie der Reihe), darunter
 *  Ich-Satz und Modulname als Etikett. */
function ShelfCell({ tile }: { tile: Tile }) {
  return (
    <Link
      href={tile.href}
      className="flex flex-col items-center gap-3 rounded-xl px-2 pb-5 pt-4 text-center transition-[background-color,transform] duration-150 ease-out hover:bg-muted/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="flex h-16 items-end">{tile.art}</div>
      <p className="min-w-0 font-heading text-base font-medium leading-snug text-balance text-foreground">
        {tile.feeling}
      </p>
      {/* mt-auto zieht die Etiketten einer Regalreihe auf eine Linie,
          auch wenn der Ich-Satz daneben zweizeilig umbricht. */}
      <p className="mt-auto text-xs text-muted-foreground">{tile.title}</p>
    </Link>
  );
}

/** Je zwei Gefäße teilen sich ein Regalbrett. */
const SHELVES = [TILES.slice(0, 2), TILES.slice(2, 4), TILES.slice(4, 6)];

export default function BoosterPage() {
  return (
    <div className="space-y-6 p-4">
      <header className="space-y-4">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
          {PAGE_TITLES.booster}
        </h1>
        <div className="flex items-center gap-5">
          <Mascot expression="curious" size="sm" gazeX={1.1} className="shrink-0" />
          <div className="space-y-0.5">
            <p className="font-heading text-lg font-medium leading-snug text-foreground">
              Was ist gerade los?
            </p>
            <p className="text-sm text-muted-foreground">
              Nimm dir, was dir jetzt guttut.
            </p>
          </div>
        </div>
      </header>

      <div className="relative -mx-1">
        {/* Dieselbe wandernde Kerze wie auf /me scheint durch das Regal —
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
          {SHELVES.map((shelf, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div className="grid grid-cols-2 border-b border-border/70">
                {shelf.map((tile) => (
                  <ShelfCell key={tile.title} tile={tile} />
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
