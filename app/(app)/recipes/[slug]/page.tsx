import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getRecipeBySlug } from "@/lib/utils/recipes";
import { Button } from "@/components/ui/button";
import { startRecipeAction } from "@/app/(app)/recipes/actions";

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

  return (
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

        {/* Description */}
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {recipe.description}
        </p>

        {/* Start / Continue form */}
        <form action={startRecipeAction} className="mt-8">
          <input type="hidden" name="recipeSlug" value={slug} />
          <Button type="submit" size="lg">
            {isCompleted ? "Erneut starten" : hasProgress ? "Fortsetzen" : "Starten"}
          </Button>
        </form>
      </div>
    </div>
  );
}