import Link from "next/link";
import {
  Brain,
  Flame,
  ShieldOff,
  Sparkles,
  Quote,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PAGE_TITLES } from "@/lib/content/labels";
import { cn } from "@/lib/utils";

type Tile = {
  title: string;
  desc: string;
  icon: LucideIcon;
  href?: string;
  /** "Bald verfügbar" — nicht klickbar, abgesetzt dargestellt. */
  soon?: boolean;
};

const TILES: Tile[] = [
  {
    title: "Overthinking",
    desc: "Gedankenspirale durchbrechen",
    icon: Brain,
    href: "/booster/overthinking",
  },
  {
    title: PAGE_TITLES.thingsGotMessy,
    desc: "Wenn's chaotisch wird",
    icon: Flame,
    href: "/booster/things-got-messy",
  },
  {
    title: "Saying No",
    desc: "Nein sagen ohne schlechtes Gewissen",
    icon: ShieldOff,
    soon: true,
  },
  {
    title: "Showstopper Confidence",
    desc: "Selbstbewusstsein in 5 Minuten",
    icon: Sparkles,
    href: "/booster/confidence",
  },
  {
    title: "Mantra Cleanser",
    desc: "Innere Kritik umschreiben",
    icon: Quote,
    href: "/booster/mantra",
  },
  {
    title: "Promise Keeper",
    desc: "Versprechen an dich selbst",
    icon: CheckCircle2,
    href: "/booster/promises",
  },
];

function TileCard({ tile }: { tile: Tile }) {
  const { title, desc, icon: Icon, soon } = tile;

  const inner = (
    <Card
      className={cn(
        "h-full transition-colors",
        soon ? "opacity-60" : "hover:bg-muted/40",
      )}
    >
      <CardContent className="flex h-full flex-col gap-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="space-y-0.5">
          <p className="font-heading text-sm font-semibold leading-snug text-foreground">
            {title}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
        </div>
        {soon && (
          <span className="mt-auto inline-flex w-fit items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Bald verfügbar
          </span>
        )}
      </CardContent>
    </Card>
  );

  if (soon || !tile.href) {
    return <div aria-disabled="true">{inner}</div>;
  }

  return (
    <Link href={tile.href} className="block">
      {inner}
    </Link>
  );
}

export default function BoosterPage() {
  return (
    <div className="space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {PAGE_TITLES.booster}
        </h1>
        <p className="text-sm text-muted-foreground">
          Für Momente, in denen du kurz zu dir zurückfinden willst.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {TILES.map((tile) => (
          <TileCard key={tile.title} tile={tile} />
        ))}
      </div>
    </div>
  );
}
