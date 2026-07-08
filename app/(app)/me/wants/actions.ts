"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/utils/db-error";
import { serverTodayKey } from "@/lib/server/timezone";
import { saveBetsAction } from "@/app/(app)/recipes/wants/actions";
import type { BetItem, LittleBetContent } from "@/lib/types/db-json";
import {
  TEXT_MAX_LONG,
  TEXT_MAX_SHORT,
  tooLong,
} from "@/lib/utils/form-validation";

export type BetReflectionState = { error: string | null };

/**
 * Reflexion zu einem Little Bet speichern: legt einen Journal-Eintrag
 * (template_type "little_bet") an und markiert den Bet in der wants-Zeile als
 * „tried" (mit Verweis auf den Eintrag). Der Bet-Update läuft über die
 * kanonische saveBetsAction (Reload-vor-Write-Merge), damit parallele
 * Änderungen auf einem anderen Gerät erhalten bleiben.
 */
export async function saveBetReflectionAction(
  _prev: BetReflectionState,
  formData: FormData,
): Promise<BetReflectionState> {
  const betId = (formData.get("betId") as string | null)?.trim() ?? "";
  const experience = (formData.get("experience") as string | null)?.trim() ?? "";
  const liked = (formData.get("liked") as string | null)?.trim() ?? "";
  const disliked = (formData.get("disliked") as string | null)?.trim() ?? "";
  const vibeRaw = (formData.get("vibe") as string | null)?.trim() ?? "";
  const changedWants = (formData.get("changed_wants") as string | null)?.trim() ?? "";

  if (!betId) return { error: "Das hat gerade nicht geklappt. Versuch es noch einmal." };
  if (!experience) return { error: "Erzähl kurz, wie das Experiment war." };

  const lengthError =
    tooLong(experience, TEXT_MAX_LONG) ??
    (liked ? tooLong(liked, TEXT_MAX_LONG) : null) ??
    (disliked ? tooLong(disliked, TEXT_MAX_LONG) : null) ??
    (changedWants ? tooLong(changedWants, TEXT_MAX_LONG) : null);
  if (lengthError) return { error: lengthError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Du musst angemeldet sein." };

  const { data: row } = await supabase
    .from("wants")
    .select("bets")
    .eq("user_id", user.id)
    .maybeSingle();

  const bets = (row?.bets as BetItem[] | null) ?? [];
  const bet = bets.find((b) => b.id === betId);
  if (!bet) {
    return { error: "Wir konnten dieses Experiment nicht finden." };
  }

  const vibe =
    vibeRaw === "energized" || vibeRaw === "neutral" || vibeRaw === "drained"
      ? vibeRaw
      : undefined;

  const content: LittleBetContent = {
    bet_text: bet.text.slice(0, TEXT_MAX_SHORT),
    experience,
    ...(liked ? { liked } : {}),
    ...(disliked ? { disliked } : {}),
    ...(vibe ? { vibe } : {}),
    ...(changedWants ? { changed_wants: changedWants } : {}),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      recipe_slug: "wants",
      template_type: "little_bet",
      content,
      entry_date: await serverTodayKey(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: dbError(insertError, "wants") };
  }

  // Bet als ausprobiert markieren (komplettes Array über die kanonische Action
  // zurückschreiben — alle ids bleiben, also identischer Merge).
  const updatedBets: BetItem[] = bets.map((b) =>
    b.id === betId
      ? { ...b, status: "tried" as const, journalEntryId: inserted.id }
      : b,
  );

  const fd = new FormData();
  fd.set("bets", JSON.stringify(updatedBets));
  const res = await saveBetsAction({ error: null }, fd);
  if (res.error) return { error: res.error };

  revalidatePath("/me/wants");
  redirect("/me/wants");
}
