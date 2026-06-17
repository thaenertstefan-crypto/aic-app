import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getRecipeBySlug } from "@/lib/utils/recipes";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { getValueLabel } from "@/lib/utils/values-bank";
import { getJournalData } from "@/app/(app)/recipes/values/actions";
import { hasSeenRecipeIntro } from "@/app/(app)/recipes/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ValuesStepOverview } from "@/components/recipes/values-step-overview";
import { RecipeIntroGate } from "@/components/recipes/recipe-intro-gate";
import { StartRecipeButton } from "./start-recipe-button";

export default async function RecipeDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const recipe = getRecipeBySlug(slug);

  // --- Unknown slug ---------------------------------------------------
  if (!recipe) {
    return (
      <div className="flex min-h-[60svh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
          <Heart className="size-6 text-muted-foreground" />
        </div>
        <h1 className="font-heading text-2xl font-bold">Dieses Rezept gibt es nicht</h1>
        <p className="mt-2 max-w-xs text-muted-foreground">
          Huch, da ist wohl etwas schiefgelaufen. Kein Problem — schau einfach in der Übersicht,
          welche Rezepte auf dich warten.
        </p>
        <Link href="/recipes" className="mt-6">
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            Zurück zur Übersicht
          </Button>
        </Link>
      </div>
    );
  }

  // --- Known but not available ----------------------------------------
  if (!recipe.available) {
    return (
      <div className="flex min-h-[60svh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
          <Heart className="size-6 text-muted-foreground" />
        </div>
        <h1 className="font-heading text-2xl font-bold">Noch nicht verfügbar</h1>
        <p className="mt-2 max-w-xs text-muted-foreground">
          <span className="font-medium text-foreground">{recipe.title}</span> ist noch in
          Bearbeitung. Es dauert nicht mehr lange, dann kannst du auch dieses Rezept ausprobieren.
        </p>
        <Link href="/recipes" className="mt-6">
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            Zurück zur Übersicht
          </Button>
        </Link>
      </div>
    );
  }

  // --- Available recipe -----------------------------------------------
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the user's name for a warm greeting
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  // Check for existing progress — highest cycle_number wins
  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("status, current_step")
    .eq("user_id", user?.id ?? "")
    .eq("recipe_slug", slug)
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasProgress = progress && progress.status !== "not_started";
  const isCompleted = progress?.status === "completed";

  // Hybrid-Intro (Schritt 6.10): beim ersten Mal Sequenz, danach Collapsible.
  // cards ist nur für Rezepte mit hinterlegter Intro gesetzt (aktuell "values").
  const introCards = getRecipeIntro(slug);
  const introSeen = await hasSeenRecipeIntro(slug);

  // For the (cyclical) values recipe, surface the user's confirmed values right
  // here so returning users see them without having to restart the recipe.
  let confirmedValues: string[] = [];
  // Step overview state for the values recipe (computed from existing helpers).
  let hypothesisDone = false;
  let journalCount = 0;
  let journalDone = false;
  let evaluationDone = false;
  if (slug === "values") {
    const { data: hypothesis } = await supabase
      .from("values_hypothesis")
      .select("values, confirmed")
      .eq("user_id", user?.id ?? "")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (hypothesis?.confirmed) {
      confirmedValues = (hypothesis.values as string[] | null) ?? [];
    }

    // Derive the three sub-step states from the existing journal helper plus the
    // already-fetched progress row — no new data logic.
    const journalData = await getJournalData();
    hypothesisDone = (journalData.hypothesis?.length ?? 0) > 0;
    journalCount = journalData.entries.length;
    journalDone = journalCount >= 7;
    evaluationDone = progress?.status === "completed";
  }

  return (
    <RecipeIntroGate slug={slug} cards={introCards} introSeen={introSeen}>
    <div className="px-4 py-6">
      {/* Back link */}
      <Link
        href="/recipes"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Alle Rezepte
      </Link>

      <div className="max-w-prose">
        {/* Greeting */}
        {profile?.name && (
          <p className="mb-2 text-sm text-muted-foreground">
            Hey {profile.name} ✨
          </p>
        )}

        {/* Title */}
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {recipe.title}
        </h1>

        {/* Duration */}
        <p className="mt-2 text-sm text-muted-foreground">
          Dauer: <span className="text-foreground">{recipe.duration}</span>
        </p>

        {/* Intro — richer multi-paragraph framing, falls back to description */}
        {recipe.intro ? (
          <div className="mt-4 space-y-4">
            {recipe.intro.map((paragraph, i) => (
              <p
                key={i}
                className="text-base leading-relaxed text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {recipe.description}
          </p>
        )}

        {/* Already-discovered values (returning users) */}
        {confirmedValues.length > 0 && (
          <Card className="mt-6 border-primary/30">
            <CardContent className="space-y-3 pt-(--card-spacing)">
              <h2 className="font-heading text-base font-semibold text-primary">
                Deine Werte
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {confirmedValues.map((value) => (
                  <span
                    key={value}
                    className="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {getValueLabel(value)}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step overview — values recipe only */}
        {slug === "values" && (
          <div className="mt-6">
            <ValuesStepOverview
              hypothesisDone={hypothesisDone}
              journalCount={journalCount}
              journalDone={journalDone}
              evaluationDone={evaluationDone}
            />
          </div>
        )}

        {/* Start / Continue form */}
        <StartRecipeButton
          slug={slug}
          label={
            isCompleted ? "Erneut starten" : hasProgress ? "Fortsetzen" : "Starten"
          }
        />
      </div>
    </div>
    </RecipeIntroGate>
  );
}