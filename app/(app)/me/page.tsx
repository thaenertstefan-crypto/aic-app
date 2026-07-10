import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { PAGE_TITLES } from "@/lib/content/labels";
import { getValueLabel } from "@/lib/utils/values-bank";
import { getValueEmoji } from "@/lib/utils/values-emojis";
import type { BetItem, RightItem, WantItem } from "@/lib/types/db-json";
import { MeHub, type ValueChip } from "./me-hub";

export default async function MePage() {
  const supabase = await createClient();

  const user = await getCachedUser();

  let values: ValueChip[] = [];
  let firstRight: string | null = null;
  let rightsCount = 0;
  let wantsCount = 0;
  let openBets: string[] = [];

  if (user) {
    const [
      { data: hypothesis, error: hypothesisError },
      { data: billOfRights, error: rightsError },
      { data: wantsRow, error: wantsError },
    ] = await Promise.all([
      supabase
        .from("values_hypothesis")
        .select("values")
        .eq("user_id", user.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("bill_of_rights")
        .select("rights")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("wants")
        .select("wants, bets")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    // Echte Lesefehler an die Segment-Error-Boundary geben statt als Leerzustand
    // zu zeigen.
    const readError = hypothesisError ?? rightsError ?? wantsError;
    if (readError) {
      throw new Error(`me: read failed (${readError.code ?? "unknown"})`);
    }

    const valueIds = (hypothesis?.values as string[] | null) ?? [];
    values = valueIds.map((id) => ({
      emoji: getValueEmoji(id),
      label: getValueLabel(id),
    }));

    const rights = ((billOfRights?.rights as RightItem[] | null) ?? []).filter(
      (r) => r.active,
    );
    rightsCount = rights.length;
    firstRight = rights[0]?.text ?? null;

    const wants = (wantsRow?.wants as WantItem[] | null) ?? [];
    wantsCount = wants.filter((w) => w.active).length;
    const bets = (wantsRow?.bets as BetItem[] | null) ?? [];
    openBets = bets.filter((b) => b.status === "open").map((b) => b.text);
  }

  return (
    <div className="space-y-6 p-4">
      <header className="space-y-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
          {PAGE_TITLES.me}
        </h1>
        <p className="text-sm text-muted-foreground">
          That&apos;s me! Wer ich bin und was mir wichtig ist.
        </p>
      </header>

      <MeHub
        values={values}
        firstRight={firstRight}
        rightsCount={rightsCount}
        wantsCount={wantsCount}
        openBets={openBets}
      />
    </div>
  );
}
