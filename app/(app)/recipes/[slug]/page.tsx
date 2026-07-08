import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { getRecipeBySlug } from "@/lib/utils/recipes";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { getValueLabel } from "@/lib/utils/values-bank";
import type { WantItem } from "@/lib/types/db-json";
import { getJournalData } from "@/app/(app)/recipes/values/actions";
import { hasSeenRecipeIntro } from "@/app/(app)/recipes/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ValuesStepOverview } from "@/components/recipes/values-step-overview";
import { RecipeIntroGate } from "@/components/recipes/recipe-intro-gate";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
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

  const user = await getCachedUser();
  const userId = user?.id ?? "";
  const isValues = slug === "values";
  const isWants = slug === "wants";

  // Hybrid-Intro (Schritt 6.10): beim ersten Mal Sequenz, danach Collapsible.
  // cards ist nur für Rezepte mit hinterlegter Intro gesetzt (aktuell "values").
  const introCards = getRecipeIntro(slug);

  // Alle voneinander unabhängigen Reads in einer Welle parallelisieren, statt
  // sie seriell hintereinander zu awaiten (Waterfall, P-1). Die values_hypothesis
  // wird nur für das Werte-Rezept gebraucht.
  const [
    { data: profile },
    { data: progress },
    introSeen,
    hypothesisRow,
    wantsRow,
  ] = await Promise.all([
      // Fetch the user's name for a warm greeting
      supabase.from("profiles").select("name").eq("id", userId).maybeSingle(),
      // Existing progress — highest cycle_number wins. started_at wird unten an
      // getJournalData durchgereicht (statt es dort erneut zu laden).
      supabase
        .from("user_recipe_progress")
        .select("status, current_step, started_at")
        .eq("user_id", userId)
        .eq("recipe_slug", slug)
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
      hasSeenRecipeIntro(slug),
      isValues
        ? supabase
            .from("values_hypothesis")
            .select("values, confirmed")
            .eq("user_id", userId)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle()
            .then((r) => r.data)
        : Promise.resolve(null),
      isWants
        ? supabase
            .from("wants")
            .select("wants")
            .eq("user_id", userId)
            .maybeSingle()
            .then((r) => r.data)
        : Promise.resolve(null),
    ]);

  const hasProgress = progress && progress.status !== "not_started";
  const isCompleted = progress?.status === "completed";

  // For the wants recipe, surface the user's confirmed wants so returning users
  // see them (and a shortcut to their living Wants page) without restarting.
  const activeWants: WantItem[] = isWants
    ? ((wantsRow?.wants as WantItem[] | null) ?? []).filter((w) => w.active)
    : [];

  // For the (cyclical) values recipe, surface the user's confirmed values right
  // here so returning users see them without having to restart the recipe.
  let confirmedValues: string[] = [];
  // Step overview state for the values recipe (computed from existing helpers).
  let hypothesisDone = false;
  let journalCount = 0;
  let journalDone = false;
  let evaluationDone = false;
  if (isValues) {
    const hypothesisValues = (hypothesisRow?.values as string[] | null) ?? null;
    if (hypothesisRow?.confirmed) {
      confirmedValues = hypothesisValues ?? [];
    }

    // Derive the three sub-step states from the existing journal helper. Die
    // bereits geladenen progress/hypothesis werden durchgereicht, damit
    // getJournalData NUR noch die Journal-Einträge holt (kein Doppel-Fetch).
    const journalData = await getJournalData({
      progress: progress
        ? { started_at: progress.started_at, current_step: progress.current_step }
        : null,
      hypothesisValues,
    });
    hypothesisDone = (journalData.hypothesis?.length ?? 0) > 0;
    journalCount = journalData.entries.length;
    journalDone = journalCount >= 7;
    evaluationDone = progress?.status === "completed";
  }

  return (
    <RecipeIntroGate slug={slug} cards={introCards} introSeen={introSeen}>
    <div className="px-4 py-6">
      {/* Back link + Info-Icon */}
      <div className="mb-6 flex items-center justify-between gap-2">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Alle Rezepte
        </Link>
        {introCards && <IntroInfoButton cards={introCards} />}
      </div>

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

        {/* Already-discovered wants (returning users) + Verweis auf die
            lebende Wants-Seite */}
        {isWants && activeWants.length > 0 && (
          <Card className="mt-6 border-primary/30">
            <CardContent className="space-y-3 pt-(--card-spacing)">
              <h2 className="font-heading text-base font-semibold text-primary">
                Deine Wants
              </h2>
              <ul className="space-y-1.5">
                {activeWants.map((want) => (
                  <li
                    key={want.id}
                    className="text-sm leading-relaxed text-foreground"
                  >
                    {want.text}
                  </li>
                ))}
              </ul>
              <Link
                href="/me/wants"
                className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Zu deinen Wants & Little Bets →
              </Link>
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