import Link from "next/link";
import {
  ChevronRight,
  Compass,
  ScrollText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { Card, CardContent } from "@/components/ui/card";
import { PAGE_TITLES } from "@/lib/content/labels";
import type { BetItem, RightItem, WantItem } from "@/lib/types/db-json";
import { cn } from "@/lib/utils";

function MeBlock({
  icon: Icon,
  title,
  subtitle,
  href,
  disabled,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href?: string;
  disabled?: boolean;
}) {
  const inner = (
    <Card className={cn(disabled ? "opacity-50" : "transition-colors hover:bg-muted/40")}>
      <CardContent className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            disabled
              ? "bg-muted text-muted-foreground"
              : "bg-primary/15 text-primary",
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-heading text-base font-semibold text-foreground">
            {title}
          </p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {!disabled && (
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        )}
      </CardContent>
    </Card>
  );

  if (disabled || !href) {
    return <div aria-disabled="true">{inner}</div>;
  }

  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}

export default async function MePage() {
  const supabase = await createClient();

  const user = await getCachedUser();

  let name: string | null = null;
  let valuesCount = 0;
  let activeRightsCount = 0;
  let activeWantsCount = 0;
  let openBetsCount = 0;

  if (user) {
    const [
      { data: profile, error: profileError },
      { data: hypothesis, error: hypothesisError },
      { data: billOfRights, error: rightsError },
      { data: wantsRow, error: wantsError },
    ] = await Promise.all([
      supabase.from("profiles").select("name").eq("id", user.id).single(),
      supabase
        .from("values_hypothesis")
        .select("values")
        .eq("user_id", user.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("bill_of_rights")
        .select("rights")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("wants")
        .select("wants, bets")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    // Echte Lesefehler an die Segment-Error-Boundary geben statt als Leerzustand
    // zu zeigen.
    const readError = profileError ?? hypothesisError ?? rightsError ?? wantsError;
    if (readError) {
      throw new Error(`me: read failed (${readError.code ?? "unknown"})`);
    }

    name = profile?.name ?? null;
    valuesCount = ((hypothesis?.values as string[] | null) ?? []).length;
    const rights = (billOfRights?.rights as RightItem[] | null) ?? [];
    activeRightsCount = rights.filter((r) => r.active).length;
    const wants = (wantsRow?.wants as WantItem[] | null) ?? [];
    activeWantsCount = wants.filter((w) => w.active).length;
    const bets = (wantsRow?.bets as BetItem[] | null) ?? [];
    openBetsCount = bets.filter((b) => b.status === "open").length;
  }

  const displayName = name?.trim() || "Du";
  const initial = displayName.charAt(0).toUpperCase();

  const valuesSubtitle =
    valuesCount > 0 ? `${valuesCount} Werte entdeckt` : "Noch keine Werte entdeckt";
  const rightsSubtitle =
    activeRightsCount > 0
      ? `${activeRightsCount} ${activeRightsCount === 1 ? "Recht" : "Rechte"} definiert`
      : "Noch keine Rechte definiert";
  const wantsSubtitle =
    activeWantsCount > 0
      ? openBetsCount > 0
        ? `${activeWantsCount} Wants · ${openBetsCount} offene ${openBetsCount === 1 ? "Bet" : "Bets"}`
        : `${activeWantsCount} Wants entdeckt`
      : "Noch keine Wants entdeckt";

  return (
    <div className="space-y-6 p-4">
      <header className="space-y-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
          {PAGE_TITLES.me}
        </h1>
        <p className="text-sm text-muted-foreground">
          That&apos;s me! Wer ich bin und was mir wichtig ist.
        </p>
      </header>

      {/* Profil-Identität */}
      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-2xl font-bold text-primary-foreground">
          {initial}
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="font-heading text-xl font-semibold text-foreground">
            {displayName}
          </p>
          {user?.email && (
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          )}
        </div>
      </div>

      <hr className="border-border" />

      {/* Self-Knowledge-Blöcke */}
      <div className="space-y-3">
        <MeBlock
          icon={Sparkles}
          title="Meine Werte"
          subtitle={valuesSubtitle}
          href="/me/values"
        />
        <MeBlock
          icon={Compass}
          title={PAGE_TITLES.meWants}
          subtitle={wantsSubtitle}
          href="/me/wants"
        />
        <MeBlock
          icon={ScrollText}
          title="Meine Bill of Rights"
          subtitle={rightsSubtitle}
          href="/me/bill-of-rights"
        />
      </div>
    </div>
  );
}
