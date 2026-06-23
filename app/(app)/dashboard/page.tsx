import Link from "next/link";
import { Quote } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { RECIPES, getRecipeBySlug, getRecipeStepPath } from "@/lib/utils/recipes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardReveal } from "@/components/dashboard/dashboard-reveal";
import { DashboardFocus } from "@/components/dashboard/dashboard-focus";
import { DailyReminderScreen } from "@/components/daily-reminder/daily-reminder-screen";
import type {
  Destination,
  PrimaryRecommendation,
} from "@/components/dashboard/daily-focus";

type RightItem = { id: string; text: string; active: boolean };

/** Day-of-year (1–366), used to pick a stable daily right. */
function dayOfYear(date: Date): number {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dateLabel = now.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
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
      { data: profile },
      { data: moodRow },
      { data: progress },
      { data: billOfRights },
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
      ? activeRights[dayOfYear(now) % activeRights.length]
      : null;

  const greetingName = name?.trim();

  // --- Stimmungsbasierter Fokus (DailyFocus) ---
  // Continuity-Empfehlung: das, was die alte RecipeCard gezeigt hätte.
  const continuityRecipe = hasActiveRecipe ? activeRecipe : suggestedRecipe;

  // Werte-Fortschritt immer ermitteln (unabhängig vom aktiven Recipe), damit
  // der "Werte reflektieren"-Eintrag den richtigen Schritt/Badge zeigt.
  const valuesProgress = progressRows.find(
    (p) => p.recipe_slug === "values" && p.status !== "completed",
  );
  const valuesTotalSteps = getRecipeBySlug("values")?.stepPaths?.length ?? 3;
  const valuesBadge = valuesProgress
    ? `Schritt ${Math.min(Math.max(valuesProgress.current_step ?? 1, 1), valuesTotalSteps)} von ${valuesTotalSteps}`
    : undefined;
  const valuesHref = valuesProgress
    ? getRecipeStepPath("values", valuesProgress.current_step ?? 1)
    : "/recipes/values/hypothesis";

  // "Normale" Empfehlung (recipe-basiert, mood-unabhängig). Der low-Tier-Fall
  // (Mantra-Pause) und die Frage werden client-seitig in DashboardFocus aus der
  // live getippten Stimmung abgeleitet — so reagiert die Anzeige sofort.
  const normalPrimary: PrimaryRecommendation | null = continuityRecipe
    ? {
        key: continuityRecipe.slug,
        title: continuityRecipe.title,
        subtitle:
          continuityRecipe.slug === "values" && valuesBadge
            ? valuesBadge
            : hasActiveRecipe
              ? "Du bist mittendrin."
              : continuityRecipe.description,
        cta: hasActiveRecipe ? "Weitermachen" : "Jetzt starten",
        href: hasActiveRecipe
          ? getRecipeStepPath(continuityRecipe.slug, activeProgress?.current_step ?? 1)
          : continuityRecipe.startPath,
      }
    : null;

  const fallbackMessage =
    "Schön, dass du dranbleibst! Stöbere durch die Rezepte für deinen nächsten Schritt.";

  // Feste Liste aller sechs Anlaufstellen (handgeschriebene Ich-Sätze, daher
  // bewusst nicht aus RECIPES generiert). DashboardFocus filtert die aktuelle
  // Primary-Empfehlung client-seitig heraus.
  const allDestinations: Destination[] = [
    {
      key: "values",
      sentence: "Ich würde gern meine Werte reflektieren",
      href: valuesHref,
      badge: valuesBadge,
    },
    {
      key: "overthinking",
      sentence: "Ich bin schon wieder am Overthinken",
      href: "/recipes/overthinking",
    },
    {
      key: "bor",
      sentence: "Ich brauch ein Reminder, was ich mir erlauben darf",
      href: "/recipes/bill-of-rights",
    },
    {
      key: "mantra",
      sentence: "Ich fühl mich grad nicht gut genug",
      href: "/cleansers/mantra",
    },
    {
      key: "promises",
      sentence: "Ich will mein Versprechen an mich selbst einlösen",
      href: "/cleansers/promises",
    },
    {
      key: "confidence",
      sentence: "Ich brauch 'n schnellen Confidence-Boost",
      href: "/cleansers/confidence",
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <DailyReminderScreen rights={activeRights.map((r) => r.text)} />
      <DashboardReveal>
      {/* Greeting */}
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
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
      <Card variant="glass">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Quote className="size-4" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
              Heutiges Recht
            </p>
          </div>

          {todayRight ? (
            <p className="font-heading text-lg leading-relaxed text-foreground/90">
              {asAffirmation(todayRight.text)}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Du hast noch keine persönlichen Grundrechte formuliert. Sie
                erinnern dich täglich daran, was du dir selbst zugestehst.
              </p>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/recipes/bill-of-rights" />}
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

