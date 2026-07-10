import type { CSSProperties } from "react";
import Link from "next/link";
import {
  Brain,
  CheckCircle2,
  ChevronRight,
  Flame,
  Moon,
  ShieldOff,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Mascot } from "@/components/brand/mascot";
import { Card, CardContent } from "@/components/ui/card";
import { PAGE_TITLES } from "@/lib/content/labels";
import { cn } from "@/lib/utils";

type Tile = {
  /** Ich-Satz, nach dem man im akuten Moment sucht — die "Antwort" auf die
   *  Frage im Header. */
  feeling: string;
  /** Modulname, leise Meta-Zeile unter dem Ich-Satz. */
  title: string;
  icon: LucideIcon;
  href?: string;
  /** Confidence trägt seine Lilac-Modulfarbe statt des Gold-Identitäts-Chips. */
  tint?: "confidence";
  /** "Bald verfügbar" — nicht klickbar, abgesetzt dargestellt. */
  soon?: boolean;
};

const TILES: Tile[] = [
  {
    feeling: "Ich denke im Kreis",
    title: "Overthinking",
    icon: Brain,
    href: "/booster/overthinking",
  },
  {
    feeling: "Gerade ist alles zu viel",
    title: PAGE_TITLES.thingsGotMessy,
    icon: Flame,
    href: "/booster/things-got-messy",
  },
  {
    feeling: "Ich kann schlecht Nein sagen",
    title: PAGE_TITLES.sayingNo,
    icon: ShieldOff,
    href: "/booster/saying-no",
  },
  {
    feeling: "Ich muss Dampf ablassen",
    title: PAGE_TITLES.shadow,
    icon: Moon,
    href: "/booster/shadow",
  },
  {
    feeling: "Ich brauche Selbstvertrauen",
    title: PAGE_TITLES.confidence,
    icon: Sparkles,
    href: "/booster/confidence",
    tint: "confidence",
  },
  {
    feeling: "Ich will zu mir stehen",
    title: "Promise Keeper",
    icon: CheckCircle2,
    href: "/booster/promises",
  },
];

function TileRow({ tile }: { tile: Tile }) {
  const { feeling, title, icon: Icon, tint, soon } = tile;

  const inner = (
    <Card
      className={cn(
        "transition-[background-color,transform] duration-150 ease-out",
        !soon && "hover:bg-muted/40 group-active/row:scale-[0.98]",
      )}
      size="sm"
    >
      <CardContent className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            soon
              ? "bg-muted text-muted-foreground"
              : tint === "confidence"
                ? "bg-cleanser-confidence/15 text-cleanser-confidence"
                : "bg-primary/15 text-primary",
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-heading text-base font-medium leading-snug text-foreground">
            {feeling}
          </p>
          <p className="text-xs text-muted-foreground">
            {soon ? `${title} · Bald verfügbar` : title}
          </p>
        </div>
        {!soon && (
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        )}
      </CardContent>
    </Card>
  );

  if (soon || !tile.href) {
    return <div aria-disabled="true">{inner}</div>;
  }

  return (
    <Link
      href={tile.href}
      className="group/row block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {inner}
    </Link>
  );
}

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

      <ul className="flex flex-col gap-3">
        {TILES.map((tile, index) => (
          <li
            key={tile.title}
            className="booster-row-in"
            style={{ "--booster-i": index } as CSSProperties}
          >
            <TileRow tile={tile} />
          </li>
        ))}
      </ul>
    </div>
  );
}
