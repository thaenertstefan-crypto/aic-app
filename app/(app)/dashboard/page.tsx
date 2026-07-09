import Link from "next/link";
import { Quote } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { RECIPES, getRecipeBySlug, getRecipeStepPath } from "@/lib/utils/recipes";
import { getUserTimeZone, serverTodayKey } from "@/lib/server/timezone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardReveal } from "@/components/dashboard/dashboard-reveal";
import { DashboardFocus } from "@/components/dashboard/dashboard-focus";
import { DailyReminderScreen } from "@/components/daily-reminder/daily-reminder-screen";
import { SkyBackdrop } from "@/components/dashboard/sky-backdrop";
import type {
  Destination,
  PrimaryRecommendation,
} from "@/components/dashboard/daily-focus";
import type { RightItem } from "@/lib/types/db-json";

/**
 * Day-of-year (1–366), used to pick a stable daily right. Nimmt den
 * Kalendertag-Key "YYYY-MM-DD" in der User-Zeitzone entgegen, damit das
 * "Heutige Recht" um die lokale Mitternacht wechselt (nicht um UTC-Mitternacht).
 */
function dayOfYear(dateKey: string): number {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return Math.floor((now - start) / 86_400_000);
}

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
  let activeRecipeId: string | null = null;
  let todayMood: number | null = null;
  let progressRows: {
    recipe_slug: string;
    current_step: number | null;
    status: string | null;
  }[] = [];
  let rights: RightItem[] = [];

  if (user) {
    const [
      { data: profile, error: profileError },
      { data: moodRow, error: moodError },
      { data: progress, error: progressError },
      { data: billOfRights, error: rightsError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("name, active_recipe_id")
        .eq("id", user.id)
        .single(),
      supabase
        .from("daily_checkins")
        .select("mood_score")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle(),
      supabase
        .from("user_recipe_progress")
        .select("recipe_slug, current_step, status")
        .eq("user_id", user.id),
      supabase
        .from("bill_of_rights")
        .select("rights")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    // Echte Lesefehler dürfen nicht zu einem Leerzustand coalescen ("Daten weg"),
    // sondern sollen die Segment-Error-Boundary (app/(app)/error.tsx) auslösen.
    const readError = profileError ?? moodError ?? progressError ?? rightsError;
    if (readError) {
      throw new Error(`dashboard: read failed (${readError.code ?? "unknown"})`);
    }

    name = profile?.name ?? null;
    activeRecipeId = profile?.active_recipe_id ?? null;
    todayMood = moodRow?.mood_score ?? null;
    progressRows = progress ?? [];
    rights = (billOfRights?.rights as RightItem[] | null) ?? [];
  }

  // --- Aktuelles Recipe ---
  const activeRecipe = activeRecipeId ? getRecipeBySlug(activeRecipeId) : undefined;
  const activeProgress = progressRows.find(
    (p) => p.recipe_slug === activeRecipeId,
  );
  const hasActiveRecipe =
    !!activeRecipe &&
    activeRecipe.available &&
    !!activeProgress &&
    activeProgress.status !== "completed";

  const completedSlugs = new Set(
    progressRows.filter((p) => p.status === "completed").map((p) => p.recipe_slug),
  );
  // Suggest the onboarding recipe first; otherwise the first unfinished one.
  const suggestedRecipe = hasActiveRecipe
    ? undefined
    : activeRecipe && activeRecipe.available && !completedSlugs.has(activeRecipe.slug)
      ? activeRecipe
      : RECIPES.find((r) => r.available && !completedSlugs.has(r.slug));

  // --- Heutiges Recht ---
  const activeRights = rights.filter((r) => r.active);
  const todayRight =
    activeRights.length > 0
      ? activeRights[dayOfYear(today) % activeRights.length]
      : null;

  const greetingName = name?.trim();

  // --- Stimmungsbasierter Fokus (DailyFocus) ---
  // Continuity-Empfehlung: das, was die alte RecipeCard gezeigt hätte.
  const continuityRecipe = hasActiveRecipe ? activeRecipe : suggestedRecipe;

  // Werte-Status (not_started | in_progress | completed) für die dreistufige CTA
  // und die Verlinkung.
  const valuesStatus =
    progressRows.find((p) => p.recipe_slug === "values")?.status ??
    "not_started";
  const valuesCompleted = valuesStatus === "completed";

  // Laufende Entdeckung führt direkt zurück in die Journey (Wiederaufnahme, kein
  // erneutes Intro). Sonst auf die kanonische Werte-Heimat /me/values, die die
  // Intro-Sequenz gated und danach zur "Meine Werte"-Seite (→ Journey) führt.
  const valuesHref =
    valuesStatus === "in_progress" ? "/me/values/journey" : "/me/values";

  // Wants-Status analog: abgeschlossen (Wants bestätigt) → lebende Wants-Seite
  // mit den Little Bets; sonst der Rezept-Hub, der die Intro gated.
  const wantsCompleted =
    progressRows.find((p) => p.recipe_slug === "wants")?.status === "completed";

  // "Normale" Empfehlung (recipe-basiert, mood-unabhängig). Der low-Tier-Fall
  // (Mantra-Pause) und die Frage werden client-seitig in DashboardFocus aus der
  // live getippten Stimmung abgeleitet — so reagiert die Anzeige sofort.
  const normalPrimary: PrimaryRecommendation | null = continuityRecipe
    ? {
        key: continuityRecipe.slug,
        title: continuityRecipe.title,
        subtitle: hasActiveRecipe
          ? "Du bist mittendrin."
          : continuityRecipe.description,
        cta:
          continuityRecipe.slug === "values"
            ? valuesStatus === "in_progress"
              ? "Setze deine Entdeckungsreise fort"
              : "Starte deine Werteentdeckung"
            : hasActiveRecipe
              ? "Weitermachen"
              : "Jetzt starten",
        href:
          continuityRecipe.slug === "values"
            ? valuesHref
            : hasActiveRecipe
              ? getRecipeStepPath(continuityRecipe.slug, activeProgress?.current_step ?? 1)
              : continuityRecipe.startPath,
      }
    : null;

  const fallbackMessage =
    "Schön, dass du dranbleibst! Stöbere durch die Rezepte für deinen nächsten Schritt.";

  // Feste Liste aller sieben Anlaufstellen (handgeschriebene Ich-Sätze, daher
  // bewusst nicht aus RECIPES generiert). DashboardFocus filtert die aktuelle
  // Primary-Empfehlung client-seitig heraus.
  const allDestinations: Destination[] = [
    {
      key: "values",
      sentence: valuesCompleted
        ? "Ich würde gern meine Werte ansehen"
        : "Ich würde gern meine Werte reflektieren",
      href: valuesHref,
    },
    {
      key: "overthinking",
      sentence: "Ich bin schon wieder am Overthinken",
      href: "/booster/overthinking",
    },
    {
      key: "wants",
      sentence: wantsCompleted
        ? "Ich würde gern an meinen Little Bets arbeiten"
        : "Ich will rausfinden, was ich wirklich will",
      href: "/me/wants",
    },
    {
      key: "bor",
      sentence: "Ich brauch ein Reminder, was ich mir erlauben darf",
      href: "/me/bill-of-rights",
    },
    {
      // Führt zum täglichen Mantra-Ritual (lebt seit dem Merge auf der
      // Confidence-Boost-Landing, direkt unter der Hero-Karte).
      key: "mantra",
      sentence: "Ich fühl mich grad nicht gut genug",
      href: "/booster/confidence",
    },
    {
      key: "promises",
      sentence: "Ich will mein Versprechen an mich selbst einlösen",
      href: "/booster/promises",
    },
    {
      // Führt direkt in den akuten Moment-Flow „Gleich bin ich dran".
      key: "confidence",
      sentence: "Ich brauch 'n schnellen Confidence-Boost",
      href: "/booster/confidence/moment",
    },
    {
      key: "shadow",
      sentence: "Ich muss gerade richtig Dampf ablassen",
      href: "/booster/shadow",
    },
  ];

  return (
    <div className="space-y-10 p-4">
      <SkyBackdrop />
      <DailyReminderScreen rights={activeRights.map((r) => r.text)} />
      <DashboardReveal>
      {/* Greeting */}
      <header className="space-y-2">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
          {greetingName ? `Hey ${greetingName}!` : "Hey!"}
        </h1>
        <p className="text-sm capitalize text-muted-foreground">{dateLabel}</p>
      </header>

      {/* Mood check-in + stimmungsbasierter Fokus (client-seitig gekoppelt) */}
      <DashboardFocus
        initialScore={todayMood}
        normalPrimary={normalPrimary}
        fallbackMessage={fallbackMessage}
        allDestinations={allDestinations}
      />

      {/* Heutiges Recht */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Quote className="size-4" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              Heutiges Recht
            </p>
          </div>

          {todayRight ? (
            <p className="font-heading text-lg leading-relaxed text-foreground">
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
    </div>
  );
}

