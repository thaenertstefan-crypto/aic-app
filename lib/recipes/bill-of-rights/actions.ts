"use server";

import { revalidatePath } from "next/cache";

import {
  dbFailed,
  failed,
  ok,
  type ActionResult,
} from "@/lib/actions/action-result";
import { withUser } from "@/lib/actions/with-user";
import { writeProgress, type ProgressWrite } from "@/lib/recipes/progress";
import type { RightItem } from "@/lib/types/db-json";
import { TEXT_MAX_SHORT, tooLong } from "@/lib/utils/form-validation";

// Obergrenzen für das rights-JSONB-Array: schützt vor manipulierten
// FormData-Payloads (beliebige Objekte / Riesen-Texte), die sonst ungeprüft
// in der DB landen und später als RightItem gerendert würden.
const MAX_RIGHTS = 100;

/** Prüft ein einzelnes Element auf die RightItem-Shape (inkl. Text-Cap). */
function isRightItem(value: unknown): value is RightItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.text === "string" &&
    tooLong(v.text, TEXT_MAX_SHORT) === null &&
    typeof v.active === "boolean"
  );
}

export type RightsData = {
  rights: RightItem[] | null;
  introSeen: boolean;
};

// ─── Get all data for the page ─────────────────────────────────────────

export async function getBillOfRightsData(): Promise<ActionResult<RightsData>> {
  return withUser(async ({ supabase, user }) => {
    // Fetch bill of rights
    const { data: bor } = await supabase
      .from("bill_of_rights")
      .select("rights")
      .eq("user_id", user.id)
      .maybeSingle();

    // Intro "schon gesehen?" — gilt pro Slug, sobald irgendeine Zeile intro_seen=true hat.
    const { data: introRow } = await supabase
      .from("user_recipe_progress")
      .select("intro_seen")
      .eq("user_id", user.id)
      .eq("recipe_slug", "bill-of-rights")
      .eq("intro_seen", true)
      .limit(1)
      .maybeSingle();

    return ok({
      rights: (bor?.rights as RightItem[]) ?? null,
      introSeen: Boolean(introRow),
    });
  });
}

// ─── Save Rights ────────────────────────────────────────────────────────

/** Die Nutzlast ist das gemergte Array — der Client synchronisiert seinen
 *  State damit auf den Server-Stand. */
export async function saveRightsAction(
  formData: FormData,
): Promise<ActionResult<RightItem[]>> {
  return withUser(async (ctx) => {
    const { supabase, user } = ctx;
    const rightsRaw = formData.get("rights");
    if (typeof rightsRaw !== "string" || !rightsRaw) {
      return failed("Keine Rechte zum Speichern erhalten.");
    }

    let incomingRaw: unknown;
    try {
      incomingRaw = JSON.parse(rightsRaw);
    } catch {
      return failed("Ungültiges Format.");
    }

    if (
      !Array.isArray(incomingRaw) ||
      incomingRaw.length > MAX_RIGHTS ||
      !incomingRaw.every(isRightItem)
    ) {
      return failed("Ungültiges Format.");
    }

    // Auf die bekannte Shape normalisieren, damit keine Fremd-Properties
    // mit ins JSONB geschrieben werden.
    const incoming: RightItem[] = incomingRaw.map((r) => ({
      id: r.id,
      text: r.text,
      active: r.active,
    }));

    // Optionale Baseline-IDs, die der Client beim Laden kannte — damit vom Client
    // beabsichtigte Löschungen greifen, ohne parallel (auf einem anderen Gerät)
    // hinzugefügte Rechte zu verlieren.
    const previousIdsRaw = formData.get("previousIds");
    let previousIds: string[] = [];
    if (typeof previousIdsRaw === "string" && previousIdsRaw) {
      try {
        const parsed: unknown = JSON.parse(previousIdsRaw);
        previousIds = Array.isArray(parsed)
          ? parsed.filter((x): x is string => typeof x === "string")
          : [];
      } catch {
        previousIds = [];
      }
    }

    // Aktuellen DB-Stand frisch laden und per id mergen (Reload-vor-Write).
    const { data: existing } = await supabase
      .from("bill_of_rights")
      .select("id, rights")
      .eq("user_id", user.id)
      .maybeSingle();

    const dbRights = (existing?.rights as RightItem[] | null) ?? [];
    const incomingIds = new Set(incoming.map((r) => r.id));
    const previousIdSet = new Set(previousIds);
    // DB-Rechte, die der Client weder kannte noch mitschickt → parallel angelegt,
    // also bewahren. (DB-Rechte in previousIds, die jetzt fehlen, sind echte
    // Löschungen und fallen damit korrekt weg.)
    const concurrentAdds = dbRights.filter(
      (r) => !incomingIds.has(r.id) && !previousIdSet.has(r.id),
    );
    const merged: RightItem[] = [...incoming, ...concurrentAdds];

    if (existing) {
      const { error: updateError } = await supabase
        .from("bill_of_rights")
        .update({
          rights: merged,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        return dbFailed(updateError, "bill-of-rights");
      }
    } else {
      const { error: insertError } = await supabase
        .from("bill_of_rights")
        .insert({
          user_id: user.id,
          rights: merged,
        });

      if (insertError) {
        return dbFailed(insertError, "bill-of-rights");
      }
    }

    // Abgeschlossen, sobald drei Rechte aktiv sind — und ein abgeschlossener
    // Durchlauf wird nie zurückgestuft. Schritt 2 ist die Sammlung; dorthin
    // schiebt jedes Speichern, auch das eines abgeschlossenen Durchlaufs.
    const completed = merged.filter((r) => r.active).length >= 3;

    const progressResult = await writeProgress(
      ctx,
      "bill-of-rights",
      (row, now) => {
        const write: NonNullable<ProgressWrite> = { current_step: 2 };
        if (completed && row?.status !== "completed") {
          write.status = "completed";
          write.completed_at = now;
        } else if (!completed && (!row || row.status === "not_started")) {
          write.status = "in_progress";
        }
        // Neue Zeile heißt: hier beginnt der Durchlauf. Eine bestehende behält
        // ihr `started_at`.
        if (!row) write.started_at = now;
        return write;
      },
    );
    if (progressResult.error !== null) return progressResult;

    return ok(merged);
  });
}

// ─── Ein KI-Vorschlag wird ein Recht ────────────────────────────────────

/**
 * Nimmt das (ggf. editierte) Recht aus dem Abschluss-Screen einer Übung ins
 * Bill of Rights auf. Läuft über die kanonische `saveRightsAction`
 * (Validierung, MAX_RIGHTS, Merge, BoR-Fortschritt) — bewusst ohne Redirect,
 * damit der Wizard auf seinem Abschluss-Screen stehen bleibt.
 *
 * Stand hier vorher zweimal, byteidentisch: einmal bei „Nein sagen", einmal
 * bei „Things got messy". Beide bedienten dieselbe `saveRightsAction`, also
 * gehört die Übernahme neben sie und nicht neben die Übungen.
 */
export async function acceptSuggestedRightAction(
  formData: FormData,
): Promise<ActionResult> {
  const text = (formData.get("text") as string | null)?.trim() ?? "";
  if (!text) return failed("Der Vorschlag ist leer.");
  const lengthError = tooLong(text, TEXT_MAX_SHORT);
  if (lengthError) return failed(lengthError);

  const result = await withUser(async ({ supabase, user }) => {
    const { data: bor } = await supabase
      .from("bill_of_rights")
      .select("rights")
      .eq("user_id", user.id)
      .maybeSingle();
    const rights = (bor?.rights as RightItem[] | null) ?? [];

    const updated: RightItem[] = [
      ...rights,
      { id: crypto.randomUUID(), text, active: true },
    ];

    const fd = new FormData();
    fd.set("rights", JSON.stringify(updated));
    const res = await saveRightsAction(fd);
    return res.error !== null ? failed(res.error) : ok();
  });

  if (result.error !== null) return result;

  revalidatePath("/me/bill-of-rights");
  return result;
}
