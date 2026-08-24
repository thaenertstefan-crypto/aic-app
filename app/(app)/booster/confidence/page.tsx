import { getCachedUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { serverTodayKey } from "@/lib/server/timezone";
import { rightOfTheDay } from "@/lib/utils/daily-right";
import type { RightItem } from "@/lib/types/db-json";
import { getSeenCleanserIntros } from "@/app/(app)/cleansers/actions";
import { BoosterArrive } from "@/components/booster/booster-arrive";

import { ConfidenceWizard } from "./confidence-wizard";

export default async function ConfidenceWizardPage() {
  const user = await getCachedUser();
  const supabase = await createClient();

  // Rechte, Kalendertag und Intro-Status sind voneinander unabhängig →
  // parallel laden.
  const [{ data: bor }, today, seenIntros] = await Promise.all([
    user
      ? supabase
          .from("bill_of_rights")
          .select("rights")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    serverTodayKey(),
    getSeenCleanserIntros(),
  ]);

  // Ein aktives Recht als Power-Erinnerung — dasselbe, das das Dashboard heute
  // als „Heutiges Recht" zeigt (siehe lib/utils/daily-right.ts).
  const rights = (bor?.rights as RightItem[] | null) ?? [];
  const todaysRight = rightOfTheDay(rights, today);

  return (
    <>
      <BoosterArrive />
      <ConfidenceWizard
        todaysRight={todaysRight?.text ?? null}
        introSeen={seenIntros.includes("confidence-boost")}
      />
    </>
  );
}
