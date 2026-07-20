import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { Button } from "@/components/ui/button";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { getValueLabel } from "@/lib/utils/values-bank";
import { getValueEmoji } from "@/lib/utils/values-emojis";
import { getValueDescription } from "@/lib/utils/values-descriptions";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { hasSeenRecipeIntro } from "@/app/(app)/recipes/actions";
import { RecipeIntroGate } from "@/components/recipes/recipe-intro-gate";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { ValuesCompass, type CompassValue } from "./values-compass";

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

  // Serverseitig zu einfachen Daten auflösen — die Client-Komponente
  // (Kompassrose) bekommt nur noch fertige Strings.
  const compassValues: CompassValue[] = values.map((id) => ({
    id,
    label: getValueLabel(id),
    emoji: getValueEmoji(id),
    description: getValueDescription(id),
  }));

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
          <p className="text-center text-base leading-relaxed text-foreground">
            Deine Werte sind dein innerer Kompass – sie zeigen dir, was dir
            tief im Inneren wirklich wichtig ist, und helfen dir, bei deinen
            alltäglichen Lebensentscheidungen den Weg einzuschlagen, der dich
            mit Energie lädt, anstatt sie aus dir herauszusaugen.
          </p>
          <div className="flex flex-col gap-4">
            {compassValues.length > 0 && (
              <p className="text-center font-heading text-base font-medium text-foreground">
                Tippe einen Wert an, um ihm nachzuspüren.
              </p>
            )}
            <ValuesCompass values={compassValues} />
          </div>
          {cta(
            compassValues.length > 0 ? "mt-auto w-full gap-2" : "w-full gap-2",
          )}
        </div>
      </RecipeIntroGate>
    </div>
  );
}
