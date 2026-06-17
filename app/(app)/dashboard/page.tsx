import Link from "next/link";
import {
  ArrowRight,
  Flame,
  NotebookPen,
  Quote,
  Sparkles,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/utils/streak";
import { RECIPES, getRecipeBySlug, getRecipeStepPath } from "@/lib/utils/recipes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { GlassPanel } from "@/components/ui/glass-panel";
import { CtaGlow } from "@/components/ui/cta-glow";
import { ReframeAnimation } from "@/components/auth/reframe-animation";
import { DashboardReveal } from "@/components/dashboard/dashboard-reveal";

import { MoodCheckin } from "./mood-checkin";

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
  let journalStreak = 0;
  let promiseStreak = 0;
  let mantraStreak = 0;

  if (user) {
    const [
      { data: profile },
      { data: moodRow },
      { data: progress },
      { data: billOfRights },
      { data: journalEntries },
      { data: promiseRows },
      { data: mantraCheckins },
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
      supabase
        .from("journal_entries")
        .select("entry_date")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false })
        .limit(90),
      supabase
        .from("promises")
        .select("current_streak")
        .eq("user_id", user.id)
        .eq("active", true),
      supabase
        .from("cleanser_checkins")
        .select("date")
        .eq("user_id", user.id)
        .eq("cleanser_slug", "mantra")
        .order("date", { ascending: false })
        .limit(90),
    ]);

    name = profile?.name ?? null;
    activeRecipeId = profile?.active_recipe_id ?? null;
    todayMood = moodRow?.mood_score ?? null;
    progressRows = progress ?? [];
    rights = (billOfRights?.rights as RightItem[] | null) ?? [];

    const journalDates = new Set(
      (journalEntries ?? []).map((e) => e.entry_date as string),
    );
    journalStreak = computeStreak(journalDates, journalDates.has(today));

    promiseStreak = (promiseRows ?? []).reduce(
      (max, p) => Math.max(max, (p.current_streak as number) ?? 0),
      0,
    );

    const mantraDates = new Set(
      (mantraCheckins ?? []).map((c) => c.date as string),
    );
    mantraStreak = computeStreak(mantraDates, mantraDates.has(today));
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

  return (
    <div className="space-y-6 p-4">
      <DashboardReveal>
      {/* Greeting */}
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {greetingName ? `Hey ${greetingName}!` : "Hey!"}
        </h1>
        <p className="text-sm capitalize text-muted-foreground">{dateLabel}</p>
        <ReframeAnimation size="compact" intervalMs={4500} className="pt-2" />
      </header>

      {/* Aktuelles Recipe — primäre Aktion */}
      <RecipeCard
        active={hasActiveRecipe ? activeRecipe : undefined}
        activeStep={activeProgress?.current_step ?? 1}
        suggested={suggestedRecipe}
      />

      {/* Mood check-in */}
      <MoodCheckin initialScore={todayMood} />

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

      {/* Streaks */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<NotebookPen className="size-4 text-primary" />}
          value={journalStreak}
          label="Tagebuch"
        />
        <StatCard
          icon={<Flame className="size-4 text-celebrate" />}
          value={promiseStreak}
          label="Versprechen"
        />
        <StatCard
          icon={<Sparkles className="size-4 text-primary" />}
          value={mantraStreak}
          label="Mantra"
        />
      </div>
      </DashboardReveal>
    </div>
  );
}

function RecipeCard({
  active,
  activeStep,
  suggested,
}: {
  active: ReturnType<typeof getRecipeBySlug> | undefined;
  activeStep: number;
  suggested: ReturnType<typeof getRecipeBySlug> | undefined;
}) {
  if (active) {
    const totalSteps = active.stepPaths?.length ?? 0;
    const clampedStep = Math.min(Math.max(activeStep, 1), totalSteps || 1);
    const href = getRecipeStepPath(active.slug, activeStep);

    return (
      <GlassPanel contentClassName="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Aktuelles Recipe
          </p>
          <p className="font-heading text-lg font-medium text-foreground">
            {active.title}
          </p>
        </div>

        {totalSteps > 1 ? (
          <div className="space-y-1.5">
            <Progress value={(clampedStep / totalSteps) * 100} />
            <p className="text-xs text-muted-foreground">
              Schritt {clampedStep} von {totalSteps}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Du bist mittendrin.</p>
        )}

        <CtaGlow>
          <Button className="w-full" render={<Link href={href} />}>
            Weitermachen
            <ArrowRight />
          </Button>
        </CtaGlow>
      </GlassPanel>
    );
  }

  if (suggested) {
    return (
      <GlassPanel contentClassName="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Empfehlung für dich
          </p>
          <p className="font-heading text-lg font-medium text-foreground">
            {suggested.title}
          </p>
          <p className="text-sm text-muted-foreground">
            {suggested.description}
          </p>
        </div>
        <CtaGlow>
          <Button className="w-full" render={<Link href={suggested.startPath} />}>
            Jetzt starten
            <ArrowRight />
          </Button>
        </CtaGlow>
      </GlassPanel>
    );
  }

  // Everything done / nothing to suggest → gentle pointer to the recipe list.
  return (
    <Card variant="glass">
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Schön, dass du dranbleibst! Stöbere durch die Rezepte für deinen
          nächsten Schritt.
        </p>
        <Button
          variant="outline"
          className="w-full"
          render={<Link href="/recipes" />}
        >
          Rezepte ansehen
        </Button>
      </CardContent>
    </Card>
  );
}

