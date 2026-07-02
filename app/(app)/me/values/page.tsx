import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { getValueLabel } from "@/lib/utils/values-bank";
import { getValueEmoji } from "@/lib/utils/values-emojis";
import { getValueDescription } from "@/lib/utils/values-descriptions";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { hasSeenRecipeIntro } from "@/app/(app)/recipes/actions";
import { RecipeIntroGate } from "@/components/recipes/recipe-intro-gate";
import { IntroInfoButton } from "@/components/intro/intro-info-button";

export default async function MeValuesPage() {
  const supabase = await createClient();

  const user = await getCachedUser();

  let values: string[] = [];
  let valuesStatus = "not_started";

  if (user) {
    const [{ data: hypothesis }, { data: progress }] = await Promise.all([
      supabase
        .from("values_hypothesis")
        .select("values")
        .eq("user_id", user.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("user_recipe_progress")
        .select("status")
        .eq("user_id", user.id)
        .eq("recipe_slug", "values")
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    values = (hypothesis?.values as string[] | null) ?? [];
    valuesStatus = progress?.status ?? "not_started";
  }

  const introCards = getRecipeIntro("values");
  const introSeen = await hasSeenRecipeIntro("values");

  const ctaLabel =
    valuesStatus === "in_progress"
      ? "Setze deine Werteentdeckung fort"
      : "Geh auf Werteentdeckung";

  const cta = (className: string) => (
    <Button className={className} render={<Link href="/me/values/journey" />}>
      {ctaLabel}
      <ArrowRight className="size-4" />
    </Button>
  );

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader
        backHref="/me"
        title="Meine Werte"
        action={introCards ? <IntroInfoButton cards={introCards} /> : undefined}
      />
      <RecipeIntroGate slug="values" cards={introCards} introSeen={introSeen}>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
          <p className="text-center text-base leading-relaxed text-muted-foreground">
            Deine Werte sind dein innerer Kompass – sie zeigen dir, was dir
            tief im Inneren wirklich wichtig ist, und helfen dir, bei deinen
            alltäglichen Lebensentscheidungen den Weg einzuschlagen, der dich
            mit Energie lädt, anstatt sie aus dir herauszusaugen. Welcher Wert
            ist dir heute besonders wichtig?
          </p>
          {values.length > 0 ? (
            <>
              <div className="space-y-3">
                {values.map((id) => (
                  <Card key={id}>
                    <CardContent className="flex items-start gap-3">
                      <span className="text-2xl leading-none" aria-hidden="true">
                        {getValueEmoji(id)}
                      </span>
                      <div className="min-w-0 space-y-1">
                        <p className="font-heading text-base font-semibold text-foreground">
                          {getValueLabel(id)}
                        </p>
                        <p className="text-base leading-relaxed text-muted-foreground">
                          Dir ist wichtig, dass {getValueDescription(id)}.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {cta("mt-auto w-full gap-2")}
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-center text-base text-muted-foreground">
                Du hast noch keine Werte entdeckt.
              </p>
              {cta("w-full gap-2")}
            </div>
          )}
        </div>
      </RecipeIntroGate>
    </div>
  );
}
