"use server";

import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
import { TEXT_MAX_SHORT, tooLong } from "@/lib/utils/form-validation";

const RECIPE_MAP: Record<string, string> = {
  "know-myself": "values",
  "struggle-say-no": "overthinking",
  overthink: "overthinking",
  "more-confidence": "values",
};

/**
 * Die Nutzlast ist „ist fertig": das Onboarding-Formular leitet nach Erfolg
 * weiter und startet auf `ok(false)` — `error === null` allein hieße dort
 * schon „geschafft", bevor überhaupt abgeschickt wurde.
 */
export async function completeOnboardingAction(
  _prevState: ActionResult<boolean>,
  formData: FormData,
): Promise<ActionResult<boolean>> {
  return withUser(async ({ supabase, user }) => {
    const reason = formData.get("reason") as string;
    const confidenceBaselineRaw = formData.get("confidenceBaseline") as string;
    const name = ((formData.get("name") as string | null) ?? "").trim();

    if (!reason || !confidenceBaselineRaw || !name) {
      return failed("Bitte fülle alle Felder aus.");
    }

    const nameLengthError = tooLong(name, TEXT_MAX_SHORT);
    if (nameLengthError) {
      return failed(nameLengthError);
    }

    // Der Slider liefert 1–10; alles andere ist eine manipulierte Anfrage.
    const confidenceBaseline = Number(confidenceBaselineRaw);
    if (
      !Number.isInteger(confidenceBaseline) ||
      confidenceBaseline < 1 ||
      confidenceBaseline > 10
    ) {
      return failed("Ungültige Auswahl. Bitte versuche es erneut.");
    }

    const activeRecipeId = RECIPE_MAP[reason];

    if (!activeRecipeId) {
      return failed("Ungültige Auswahl. Bitte versuche es erneut.");
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      name,
      confidence_baseline: confidenceBaseline,
      active_recipe_id: activeRecipeId,
      onboarding_completed: true,
    });

    if (error) {
      return dbFailed(error, "profiles");
    }

    return ok(true);
  });
}
