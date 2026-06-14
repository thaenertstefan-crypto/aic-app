import Link from "next/link";
import {
  Heart,
  Compass,
  Shield,
  XCircle,
  Brain,
  Moon,
  Clock,
  type LucideIcon,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { RECIPES } from "@/lib/utils/recipes";
import { PageHeader } from "@/components/brand/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** Map icon names stored in RECIPES to actual lucide components. */
const ICON_MAP: Record<string, LucideIcon> = {
  Heart,
  Compass,
  Shield,
  XCircle,
  Brain,
  Moon,
};

type ProgressState = {
  status: string;
  current_step: number;
};

/** Group progress rows by recipe_slug, keeping only the highest cycle_number. */
function buildProgressMap(
  rows: Array<{
    recipe_slug: string;
    status: string;
    current_step: number;
    cycle_number: number;
  }>,
): Map<string, ProgressState> {
  const map = new Map<string, ProgressState>();

  for (const row of rows) {
    const existing = map.get(row.recipe_slug);
    if (!existing || row.cycle_number > (existing as unknown as { cycle_number: number }).cycle_number) {
      map.set(row.recipe_slug, {
        status: row.status,
        current_step: row.current_step,
      });
    }
  }

  return map;
}

export default async function RecipesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch progress for all recipes the user has touched
  const { data: progressRows } = await supabase
    .from("user_recipe_progress")
    .select("recipe_slug, status, current_step, cycle_number")
    .eq("user_id", user?.id ?? "")
    .order("cycle_number", { ascending: false });

  const progressMap = buildProgressMap(progressRows ?? []);

  return (
    <div className="p-4">
      <PageHeader
        title="Rezepte"
        description="Deine persönlichen Übungen — jedes Rezept hilft dir, ein Stück klarer, stärker und freier zu werden."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {RECIPES.map((recipe) => {
          const Icon = ICON_MAP[recipe.icon] ?? Heart;
          const progress = progressMap.get(recipe.slug);

          if (!recipe.available) {
            return (
              <Card
                key={recipe.slug}
                size="sm"
                className="opacity-50"
                aria-disabled="true"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                      <CardTitle>{recipe.title}</CardTitle>
                    </div>
                    <Badge variant="outline">Bald verfügbar</Badge>
                  </div>
                  <CardDescription>{recipe.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    <span>{recipe.duration}</span>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Link key={recipe.slug} href={`/recipes/${recipe.slug}`}>
              <Card size="sm" className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="size-4 text-primary" />
                      </div>
                      <CardTitle>{recipe.title}</CardTitle>
                    </div>
                    {progress ? (
                      <Badge
                        variant={
                          progress.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {progress.status === "completed"
                          ? "Abgeschlossen"
                          : "In Arbeit"}
                      </Badge>
                    ) : (
                      <Badge variant="ghost" className="text-xs">
                        Neu
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{recipe.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    <span>{recipe.duration}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}