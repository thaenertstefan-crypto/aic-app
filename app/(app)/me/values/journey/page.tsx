import { createClient } from "@/lib/supabase/server";

import { ValuesJourneyClient } from "./values-journey-client";

const LAST_INDEX = 8;

export default async function ValuesJourneyPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const completed = new Set<number>();

  if (user) {
    const [{ data: hypothesis }, { data: dailyEntries }, { data: progress }] =
      await Promise.all([
        supabase
          .from("values_hypothesis")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("journal_entries")
          .select("entry_date")
          .eq("user_id", user.id)
          .eq("recipe_slug", "values")
          .eq("template_type", "daily_value"),
        supabase
          .from("user_recipe_progress")
          .select("status")
          .eq("user_id", user.id)
          .eq("recipe_slug", "values")
          .order("cycle_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    // 0 — Hypothese aufgestellt
    if (hypothesis) completed.add(0);

    // 1–7 — je eindeutigem Reflexionstag
    const days = new Set(
      (dailyEntries ?? []).map((e) => e.entry_date as string),
    );
    const dailyCount = Math.min(days.size, 7);
    for (let i = 1; i <= dailyCount; i++) completed.add(i);

    // Auswertung abgeschlossen → alles erledigt
    if (progress?.status === "completed") {
      for (let i = 0; i <= LAST_INDEX; i++) completed.add(i);
    }
  }

  // currentStep = erster nicht erledigter Schritt (LAST_INDEX wenn alle erledigt)
  let currentStep = 0;
  while (currentStep <= LAST_INDEX && completed.has(currentStep)) currentStep++;
  if (currentStep > LAST_INDEX) currentStep = LAST_INDEX;

  return (
    <ValuesJourneyClient
      completedSteps={[...completed]}
      currentStep={currentStep}
    />
  );
}
