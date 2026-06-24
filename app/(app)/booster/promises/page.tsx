import { createClient } from "@/lib/supabase/server";

import { PromisesCleanser, type Promise as PromiseRow } from "./promises-cleanser";

export default async function PromisesCleanserPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);

  let promises: PromiseRow[] = [];
  let completionsByPromise: Record<string, string[]> = {};

  if (user) {
    const { data: rows } = await supabase
      .from("promises")
      .select(
        "id, description, start_date, target_days, current_streak, longest_streak, last_completed",
      )
      .eq("user_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: true });

    promises = (rows ?? []) as PromiseRow[];

    const ids = promises.map((p) => p.id);
    if (ids.length > 0) {
      const { data: completions } = await supabase
        .from("promise_completions")
        .select("promise_id, completed_date")
        .in("promise_id", ids);

      completionsByPromise = (completions ?? []).reduce<Record<string, string[]>>(
        (acc, c) => {
          const pid = c.promise_id as string;
          (acc[pid] ??= []).push(c.completed_date as string);
          return acc;
        },
        {},
      );
    }
  }

  return (
    <PromisesCleanser
      promises={promises}
      completionsByPromise={completionsByPromise}
      todayISO={today}
    />
  );
}
