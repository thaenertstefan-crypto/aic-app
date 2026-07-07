import { createClient } from "@/lib/supabase/server";
import type { RightItem } from "@/lib/types/db-json";

import { DEFAULT_MANTRA } from "../defaults";
import { MomentFlow } from "./moment-flow";

/** Tag im Jahr (0-basiert) — für die deterministische Rechte-Rotation. */
function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

export default async function MomentFlowPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let mantra = DEFAULT_MANTRA;
  let right: string | null = null;

  if (user) {
    // Mantra und Rechte sind unabhängig → parallel laden.
    const [{ data: mantraRow }, { data: bor }] = await Promise.all([
      supabase
        .from("user_mantra")
        .select("text")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("bill_of_rights")
        .select("rights")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    mantra = mantraRow?.text ?? DEFAULT_MANTRA;

    // Ein aktives Recht als Power-Erinnerung — deterministisch pro Tag
    // rotiert (Math.random wäre im Render unrein; Muster wie das
    // „Heutige Recht" auf dem Dashboard).
    const activeRights = ((bor?.rights as RightItem[] | null) ?? []).filter(
      (r) => r.active,
    );
    if (activeRights.length > 0) {
      right = activeRights[dayOfYear(new Date()) % activeRights.length].text;
    }
  }

  return <MomentFlow mantra={mantra} right={right} />;
}
