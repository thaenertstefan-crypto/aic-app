import Link from "next/link";
import { Quote } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { readAllProgress } from "@/lib/recipes/progress";
import { nextRecommendation } from "@/lib/dashboard/next-bild";
import { getUserTimeZone, serverTodayKey } from "@/lib/server/timezone";
import { rightOfTheDay } from "@/lib/utils/daily-right";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardReveal } from "@/components/dashboard/dashboard-reveal";
import { DashboardFocus } from "@/components/dashboard/dashboard-focus";
import { DailyReminderScreen } from "@/components/daily-reminder/daily-reminder-screen";
import { DashboardSky } from "@/components/dashboard/dashboard-sky";
import { MoodScoreProvider } from "@/components/dashboard/mood-score-context";
import type { Tables } from "@/lib/supabase/database.types";
import type { RightItem } from "@/lib/types/db-json";

/** Ensure a right reads as a full affirmation sentence. */
function asAffirmation(text: string): string {
  return text.startsWith("Ich habe das Recht") ? text : `Ich habe das Recht, ${text}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const user = await getCachedUser();

  const now = new Date();
  const today = await serverTodayKey(now);
  // Ohne explizite timeZone würde hier die Server-TZ (auf Vercel: UTC)
  // formatiert — abends/nachts stünde dann der falsche Wochentag da, während
  // `today` bereits den User-Kalendertag meint.
  const dateLabel = now.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: await getUserTimeZone(),
  });

  let name: string | null = null;
  let todayMood: number | null = null;
  let progress: Tables<"user_recipe_progress">[] = [];
  let rights: RightItem[] = [];

  if (user) {
    const [
      { data: profile, error: profileError },
      { data: moodRow, error: moodError },
      progressRows,
      { data: billOfRights, error: rightsError },
    ] = await Promise.all([
      // `active_recipe_id` wird hier bewusst nicht mehr gelesen: die Spalte
      // wird genau einmal geschrieben (Onboarding) und nie gepflegt, taugt also
      // nicht als "woran arbeitest du gerade". Siehe ADR-0006.
      supabase.from("profiles").select("name").eq("id", user.id).single(),
      supabase
        .from("daily_checkins")
        .select("mood_score")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle(),
      // Wirft von sich aus bei einem echten Lesefehler — siehe readAllProgress.
      readAllProgress({ supabase, user }),
      supabase
        .from("bill_of_rights")
        .select("rights")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    // Echte Lesefehler dürfen nicht zu einem Leerzustand coalescen ("Daten weg"),
    // sondern sollen die Segment-Error-Boundary (app/(app)/error.tsx) auslösen.
    const readError = profileError ?? moodError ?? rightsError;
    if (readError) {
      throw new Error(`dashboard: read failed (${readError.code ?? "unknown"})`);
    }

    name = profile?.name ?? null;
    todayMood = moodRow?.mood_score ?? null;
    progress = progressRows;
    rights = (billOfRights?.rights as RightItem[] | null) ?? [];
  }

  // --- Heutiges Recht ---
  const activeRights = rights.filter((r) => r.active);
  const todayRight = rightOfTheDay(rights, today);

  const greetingName = name?.trim();

  // --- Stimmungsbasierter Fokus (DailyFocus) ---
  // Die Auswahlregel ist eine reine Funktion über die schon gelesenen Zeilen
  // (KAN-56): das erste Bild in Arbeit, sonst das erste leere, sonst der
  // Kompass ohne CTA. Der low-Tier-Override und die Frage werden client-seitig
  // in DashboardFocus aus der live getippten Stimmung abgeleitet — so reagiert
  // die Anzeige sofort.
  const normalPrimary = nextRecommendation(progress);

  return (
    <div className="space-y-13 p-4">
      <MoodScoreProvider initialScore={todayMood}>
        <DashboardSky />
        <DailyReminderScreen rights={activeRights.map((r) => r.text)} />
        <DashboardReveal>
        {/* Greeting */}
        <header className="space-y-2">
          <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground">
            {greetingName ? `Hey ${greetingName}!` : "Hey!"}
          </h1>
          <p className="text-sm capitalize text-muted-foreground">{dateLabel}</p>
        </header>

        {/* Mood check-in + stimmungsbasierter Fokus (client-seitig gekoppelt) */}
        <DashboardFocus initialScore={todayMood} normalPrimary={normalPrimary} />

        {/* Heutiges Recht */}
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Quote className="size-4" />
              </div>
              <h2 className="text-xs font-medium text-muted-foreground">
                Heutiges Recht
              </h2>
            </div>

            {todayRight ? (
              <p className="font-affirmation text-lg leading-relaxed text-foreground">
                {asAffirmation(todayRight.text)}
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-base text-muted-foreground">
                  Du hast noch keine persönlichen Grundrechte formuliert. Sie
                  erinnern dich täglich daran, was du dir selbst zugestehst.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href="/me/bill-of-rights" />}
                >
                  Bill of Rights starten
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </DashboardReveal>
      </MoodScoreProvider>
    </div>
  );
}

