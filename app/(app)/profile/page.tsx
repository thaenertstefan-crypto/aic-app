import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Flame,
  LogOut,
  NotebookPen,
  Shield,
  Sparkles,
} from "lucide-react";

import { signoutAction } from "@/app/(auth)/auth.actions";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/brand/page-header";
import { getValueLabel } from "@/lib/utils/values-bank";

type RightItem = { id: string; text: string; active: boolean };

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name: string | null = null;
  let values: string[] = [];
  let activeRightsCount = 0;
  let journalCount = 0;
  let recipesCompleted = 0;
  let longestPromiseStreak = 0;
  let daysSinceJoining = 0;

  if (user) {
    const [
      { data: profile },
      { data: hypothesis },
      { data: billOfRights },
      { count: journalEntriesCount },
      { data: progressRows },
      { data: promiseRows },
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
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("user_recipe_progress")
        .select("recipe_slug, status")
        .eq("user_id", user.id),
      supabase.from("promises").select("longest_streak").eq("user_id", user.id),
    ]);

    name = profile?.name ?? null;
    values = (hypothesis?.values as string[] | null) ?? [];

    const rights = (billOfRights?.rights as RightItem[] | null) ?? [];
    activeRightsCount = rights.filter((r) => r.active).length;

    journalCount = journalEntriesCount ?? 0;

    recipesCompleted = new Set(
      (progressRows ?? [])
        .filter((p) => p.status === "completed")
        .map((p) => p.recipe_slug),
    ).size;

    longestPromiseStreak = (promiseRows ?? []).reduce(
      (max, p) => Math.max(max, (p.longest_streak as number) ?? 0),
      0,
    );

    if (user.created_at) {
      daysSinceJoining = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / 86_400_000,
      );
    }
  }

  const displayName = name?.trim() || "Du";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="space-y-6 p-4">
      <PageHeader
        title="Profil"
        description="Deine Einstellungen, persönlichen Daten und Fortschrittsübersicht."
      />

      {/* User info */}
      <Card variant="glass">
        <CardContent className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-bold text-primary">
            {initial}
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="font-heading text-lg font-medium text-foreground">
              {displayName}
            </p>
            {user?.email && (
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Meine Werte */}
      <Card variant="glass">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              Meine Werte
            </p>
          </div>

          {values.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {values.map((value) => (
                <Badge key={value} variant="secondary" className="text-sm">
                  {getValueLabel(value)}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Du hast deine Werte noch nicht festgelegt. Finde heraus, was dir
                wirklich wichtig ist.
              </p>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/recipes/values" />}
              >
                Werte entdecken
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mein Bill of Rights */}
      <Card variant="glass">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cleanser-confidence/15 text-cleanser-confidence">
              <Shield className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                Mein Bill of Rights
              </p>
              <p className="text-sm text-muted-foreground">
                {activeRightsCount > 0
                  ? `${activeRightsCount} aktive ${activeRightsCount === 1 ? "Recht" : "Rechte"}`
                  : "Noch keine Rechte formuliert"}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            render={<Link href="/recipes/bill-of-rights" />}
          >
            {activeRightsCount > 0 ? "Zur vollständigen Liste" : "Jetzt formulieren"}
            <ArrowRight />
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<NotebookPen className="size-4 text-primary" />}
          value={journalCount}
          label="Tagebucheinträge"
        />
        <StatCard
          icon={<CheckCircle2 className="size-4 text-success" />}
          value={recipesCompleted}
          label="Recipes abgeschlossen"
        />
        <StatCard
          icon={<Flame className="size-4 text-celebrate" />}
          value={longestPromiseStreak}
          label="Längste Versprechen-Serie"
        />
        <StatCard
          icon={<CalendarDays className="size-4 text-cleanser-confidence" />}
          value={daysSinceJoining}
          label="Tage dabei"
        />
      </div>

      {/* Logout */}
      <form action={signoutAction}>
        <Button type="submit" variant="outline" className="w-full">
          <LogOut />
          Abmelden
        </Button>
      </form>
    </div>
  );
}

