"use server";

import { createClient } from "@/lib/supabase/server";

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
  const confidenceBaseline = formData.get("confidenceBaseline") as string;
  const name = formData.get("name") as string;

  if (!reason || !confidenceBaseline || !name) {
    return { error: "Bitte fülle alle Felder aus.", success: false };
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
      confidence_baseline: parseInt(confidenceBaseline, 10),
      active_recipe_id: activeRecipeId,
      onboarding_completed: true,
    });

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}