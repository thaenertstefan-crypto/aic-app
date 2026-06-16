import { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/utils/streak";

import { MantraCleanser } from "./mantra-cleanser";
import { getMantraData } from "./actions";

export default async function MantraCleanserPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);

  let doneToday = false;
  let streak = 0;

  if (user) {
    const { data: checkins } = await supabase
      .from("cleanser_checkins")
      .select("date")
      .eq("user_id", user.id)
      .eq("cleanser_slug", "mantra")
      .order("date", { ascending: false })
      .limit(90);

    const dates = new Set((checkins ?? []).map((c) => c.date as string));
    doneToday = dates.has(today);
    streak = computeStreak(dates, doneToday);
  }

  // Mantra + Karten (mit Default-Fallback) zentral über die Action laden.
  const { mantra, cards } = await getMantraData();

  return (
    <MantraCleanser
      doneToday={doneToday}
      streak={streak}
      mantra={mantra}
      cards={cards}
    />
  );
}
