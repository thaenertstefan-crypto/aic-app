"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  TablesInsert,
  TablesUpdate,
} from "@/lib/supabase/database.types";
import type { ActionState } from "@/lib/types/action-state";
import type { RightItem } from "@/lib/types/db-json";
import { dbError } from "@/lib/utils/db-error";

export type RightsData = {
  rights: RightItem[] | null;
  introSeen: boolean;
};

// ─── Get all data for the page ─────────────────────────────────────────

export async function getBillOfRightsData(): Promise<{
  error: string | null;
  data: RightsData | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein.", data: null };
  }

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

  return {
    error: null,
    data: {
      rights: (bor?.rights as RightItem[]) ?? null,
      introSeen: Boolean(introRow),
    },
  };
}

// ─── Save Rights ────────────────────────────────────────────────────────

/** saveRightsAction liefert zusätzlich das gemergte Array zurück, damit der
 *  Client seinen State mit dem Server-Stand synchronisieren kann. */
export type SaveRightsState = ActionState & {
  rights?: RightItem[];
};

export async function saveRightsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<SaveRightsState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um zu speichern.", success: false };
  }

  const rightsRaw = formData.get("rights");
  if (typeof rightsRaw !== "string" || !rightsRaw) {
    return { error: "Keine Rechte zum Speichern erhalten.", success: false };
  }

  let incoming: RightItem[];
  try {
    incoming = JSON.parse(rightsRaw);
  } catch {
    return { error: "Ungültiges Format.", success: false };
  }

  // Optionale Baseline-IDs, die der Client beim Laden kannte — damit vom Client
  // beabsichtigte Löschungen greifen, ohne parallel (auf einem anderen Gerät)
  // hinzugefügte Rechte zu verlieren.
  const previousIdsRaw = formData.get("previousIds");
  let previousIds: string[] = [];
  if (typeof previousIdsRaw === "string" && previousIdsRaw) {
    try {
      previousIds = JSON.parse(previousIdsRaw);
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
      return { error: dbError(updateError, "bill-of-rights"), success: false };
    }
  } else {
    const { error: insertError } = await supabase
      .from("bill_of_rights")
      .insert({
        user_id: user.id,
        rights: merged,
      });

    if (insertError) {
      return { error: dbError(insertError, "bill-of-rights"), success: false };
    }
  }

  // Update progress: mark completed if 3+ rights
  const completed = merged.filter((r) => r.active).length >= 3;

  const { data: progress } = await supabase
    .from("user_recipe_progress")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("recipe_slug", "bill-of-rights")
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (progress) {
    const update: TablesUpdate<"user_recipe_progress"> = { current_step: 2 };
    if (completed && progress.status !== "completed") {
      update.status = "completed";
      update.completed_at = new Date().toISOString();
    } else if (!completed && progress.status === "not_started") {
      update.status = "in_progress";
    }
    const { error: progressError } = await supabase
      .from("user_recipe_progress")
      .update(update)
      .eq("id", progress.id);
    if (progressError) {
      return { error: dbError(progressError, "bill-of-rights"), success: false };
    }
  } else {
    const insert: TablesInsert<"user_recipe_progress"> = {
      user_id: user.id,
      recipe_slug: "bill-of-rights",
      current_step: 2,
      status: completed ? "completed" : "in_progress",
      started_at: new Date().toISOString(),
      cycle_number: 1,
    };
    if (completed) {
      insert.completed_at = new Date().toISOString();
    }
    const { error: progressError } = await supabase
      .from("user_recipe_progress")
      .insert(insert);
    if (progressError) {
      return { error: dbError(progressError, "bill-of-rights"), success: false };
    }
  }

  return { error: null, success: true, rights: merged };
}
