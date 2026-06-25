import { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/utils/streak";
import { serverTodayKey } from "@/lib/server/timezone";

import { MantraCleanser } from "./mantra-cleanser";
import { getMantraData } from "./actions";

export default async function MantraCleanserPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = await serverTodayKey();

  let doneToday = false;
  let streak = 0;

  // Check-ins und Mantra/Karten sind voneinander unabhängig → parallel laden.
  const [checkinsResult, { mantra, cards }] = await Promise.all([
    user
      ? supabase
          .from("cleanser_checkins")
          .select("date")
          .eq("user_id", user.id)
          .eq("cleanser_slug", "mantra")
          .order("date", { ascending: false })
          .limit(90)
      : Promise.resolve({ data: null }),
    // Mantra + Karten (mit Default-Fallback) zentral über die Action laden.
    getMantraData(),
  ]);

  if (user) {
    const dates = new Set(
      (checkinsResult.data ?? []).map((c) => c.date as string),
    );
    doneToday = dates.has(today);
    streak = computeStreak(dates, today);
  }

  return (
    <MantraCleanser
      doneToday={doneToday}
      streak={streak}
      mantra={mantra}
      cards={cards}
    />
  );
}
