import {
  CalendarDays,
  CheckCircle2,
  Flame,
  LogOut,
  NotebookPen,
  ScrollText,
} from "lucide-react";

import { signoutAction } from "@/app/(auth)/auth.actions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/brand/page-header";
import { NAV_LABELS } from "@/lib/content/labels";

type RightItem = { id: string; text: string; active: boolean };

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let journalCount = 0;
  let recipesCompleted = 0;
  let longestPromiseStreak = 0;
  let daysSinceJoining = 0;
  let activeRightsCount = 0;

  if (user) {
    const [
      { count: journalEntriesCount },
      { data: progressRows },
      { data: promiseRows },
      { data: billOfRights },
    ] = await Promise.all([
      supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("user_recipe_progress")
        .select("recipe_slug, status")
        .eq("user_id", user.id),
      supabase.from("promises").select("longest_streak").eq("user_id", user.id),
      supabase
        .from("bill_of_rights")
        .select("rights")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

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

    const rights = (billOfRights?.rights as RightItem[] | null) ?? [];
    activeRightsCount = rights.filter((r) => r.active).length;

    if (user.created_at) {
      daysSinceJoining = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / 86_400_000,
      );
    }
  }

  return (
    <div className="space-y-6 p-4">
      <PageHeader
        title={NAV_LABELS.settings}
        description="Deine Fortschrittsübersicht und Kontoeinstellungen."
      />

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
        <StatCard
          icon={<ScrollText className="size-4 text-primary" />}
          value={activeRightsCount}
          label="Aktive Rechte"
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
