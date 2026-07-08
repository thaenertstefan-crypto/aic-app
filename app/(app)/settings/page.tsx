import { LogOut } from "lucide-react";

import { signoutAction } from "@/app/(auth)/auth.actions";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/brand/page-header";
import { NAV_LABELS } from "@/lib/content/labels";
import type { RightItem } from "@/lib/types/db-json";

export default async function SettingsPage() {
  const supabase = await createClient();

  const user = await getCachedUser();

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
      (max, p) => Math.max(max, p.longest_streak ?? 0),
      0,
    );

    const rights = (billOfRights?.rights as RightItem[] | null) ?? [];
    activeRightsCount = rights.filter((r) => r.active).length;

    if (user.created_at) {
      // eslint-disable-next-line react-hooks/purity -- Server Component: wird pro Request frisch gerendert, Date.now() ist hier gewollt
      const nowMs = Date.now();
      daysSinceJoining = Math.floor(
        (nowMs - new Date(user.created_at).getTime()) / 86_400_000,
      );
    }
  }

  return (
    <div className="space-y-6 p-4">
      <PageHeader
        title={NAV_LABELS.settings}
        description="Deine Fortschrittsübersicht und Kontoeinstellungen."
      />

      {/* Fortschrittsübersicht — eine ruhige Bilanz, kein Dashboard */}
      <Card>
        <CardContent className="divide-y divide-border py-0">
          {[
            { label: "Tagebucheinträge", value: journalCount },
            { label: "Rezepte abgeschlossen", value: recipesCompleted },
            { label: "Längste Versprechen-Serie", value: longestPromiseStreak },
            { label: "Tage dabei", value: daysSinceJoining },
            { label: "Aktive Rechte", value: activeRightsCount },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-baseline justify-between gap-4 py-3"
            >
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span className="font-heading text-xl font-semibold tabular-nums text-foreground">
                {stat.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

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
