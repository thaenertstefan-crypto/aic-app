"use server";

import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/utils/db-error";
import { TEXT_MAX_SHORT, tooLong } from "@/lib/utils/form-validation";

export type OnboardingState = {
  error: string | null;
  success: boolean;
};

const RECIPE_MAP: Record<string, string> = {
  "know-myself": "values",
  "struggle-say-no": "overthinking",
  overthink: "overthinking",
  "more-confidence": "values",
};

export async function completeOnboardingAction(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const reason = formData.get("reason") as string;
  const confidenceBaselineRaw = formData.get("confidenceBaseline") as string;
  const name = ((formData.get("name") as string | null) ?? "").trim();

  if (!reason || !confidenceBaselineRaw || !name) {
    return { error: "Bitte fülle alle Felder aus.", success: false };
  }

  const nameLengthError = tooLong(name, TEXT_MAX_SHORT);
  if (nameLengthError) {
    return { error: nameLengthError, success: false };
  }

  // Der Slider liefert 1–10; alles andere ist eine manipulierte Anfrage.
  const confidenceBaseline = Number(confidenceBaselineRaw);
  if (
    !Number.isInteger(confidenceBaseline) ||
    confidenceBaseline < 1 ||
    confidenceBaseline > 10
  ) {
    return { error: "Ungültige Auswahl. Bitte versuche es erneut.", success: false };
  }

  const activeRecipeId = RECIPE_MAP[reason];

  if (!activeRecipeId) {
    return { error: "Ungültige Auswahl. Bitte versuche es erneut.", success: false };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht angemeldet. Bitte melde dich erneut an.", success: false };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      name,
      confidence_baseline: confidenceBaseline,
      active_recipe_id: activeRecipeId,
      onboarding_completed: true,
    });

  if (error) {
    return { error: dbError(error, "profiles"), success: false };
  }

  return { error: null, success: true };
}