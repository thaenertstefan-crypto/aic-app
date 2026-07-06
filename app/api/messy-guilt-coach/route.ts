import { anthropic } from "@/lib/anthropic/client";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/messy-guilt-coach";
import {
  MESSY_GUILT_LIMIT,
  RATE_LIMIT_MESSAGE,
  checkRateLimit,
  logUsage,
} from "@/lib/anthropic/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { MessyMomentContent, RightItem } from "@/lib/types/db-json";
import { TEXT_MAX_SHORT } from "@/lib/utils/form-validation";

// Entry texts come from the user's own DB (already length-capped at save time),
// so defensively truncate instead of 400ing — max_tokens only bounds the OUTPUT.
const MAX_ENTRY_LEN = 2000;
const MAX_RIGHTS_IN_PROMPT = 100;

const AI_ERROR_MESSAGE =
  "Die Auswertung hat gerade nicht geklappt. Dein Eintrag ist gespeichert — versuch es gleich noch einmal.";

/** Ergebnis-Shape der Route: passendes bestehendes Recht, neuer Vorschlag
 *  oder null (nur Analyse). */
type RightResult =
  | { type: "existing"; id: string; text: string }
  | { type: "new"; text: string }
  | null;

/** Geparste Modell-Antwort inkl. Schuld-Vermutung und Regel-Benennung. */
type CoachResult = {
  analysis: string;
  guilt: "healthy" | "unhealthy" | null;
  rules: string | null;
  right: RightResult;
};

function clampText(value: string): string {
  return value.slice(0, MAX_ENTRY_LEN);
}

/**
 * Parse the model output. Preferred path: strict JSON per system prompt.
 * Fallbacks keep the UI functional: an "Ich habe das Recht …" sentence in
 * free text becomes a new-right proposal; otherwise the raw text is treated
 * as analysis-only (guilt/rules dann null → kein Badge, keine Regeln-Zeile).
 * For "existing" matches the returned text always comes from the DB list,
 * never from the model.
 */
function parseModelOutput(raw: string, activeRights: RightItem[]): CoachResult {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
    const parsed: unknown = JSON.parse(stripped);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { analysis?: unknown }).analysis === "string"
    ) {
      const analysis = ((parsed as { analysis: string }).analysis).trim();

      const rawGuilt = (parsed as { guilt?: unknown }).guilt;
      const guilt =
        rawGuilt === "healthy" || rawGuilt === "unhealthy" ? rawGuilt : null;

      const rawRules = (parsed as { rules?: unknown }).rules;
      const rules =
        typeof rawRules === "string" && rawRules.trim()
          ? rawRules.trim().slice(0, TEXT_MAX_SHORT)
          : null;

      const match = (parsed as { match?: unknown }).match as
        | { type?: unknown; id?: unknown; right?: unknown }
        | undefined;

      if (match?.type === "existing" && typeof match.id === "string") {
        const hit = activeRights.find((r) => r.id === match.id);
        if (hit) {
          return {
            analysis,
            guilt,
            rules,
            right: { type: "existing", id: hit.id, text: hit.text },
          };
        }
      }

      if (match?.type === "new" && typeof match.right === "string" && match.right.trim()) {
        return {
          analysis,
          guilt,
          rules,
          right: { type: "new", text: match.right.trim().slice(0, TEXT_MAX_SHORT) },
        };
      }

      if (analysis) {
        return { analysis, guilt, rules, right: null };
      }
    }
  } catch {
    // JSON kaputt → Freitext-Fallback unten.
  }

  // Struktureller Fallback: JSON.parse scheitert z.B. an ungeescapten geraden
  // Anführungszeichen INNERHALB eines String-Werts. Die Feld-Reihenfolge
  // (analysis → guilt → rules → match) ist per Prompt fixiert, deshalb lassen
  // sich die Werte über die nachfolgenden Keys als Anker heraustrennen —
  // tolerant gegenüber inneren Quotes.
  const structural = recoverFromBrokenJson(stripped, activeRights);
  if (structural) return structural;

  const sentence = stripped.match(/Ich habe das Recht[^.!\n]*[.!]?/)?.[0]?.trim();
  if (sentence) {
    const analysis = stripped.replace(sentence, "").trim();
    return {
      analysis: analysis || stripped,
      guilt: null,
      rules: null,
      right: { type: "new", text: sentence.slice(0, TEXT_MAX_SHORT) },
    };
  }

  return { analysis: stripped, guilt: null, rules: null, right: null };
}

/** Entschärft JSON-String-Escapes in per Regex extrahierten Werten. */
function unescapeJsonString(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\").trim();
}

function recoverFromBrokenJson(
  stripped: string,
  activeRights: RightItem[],
): CoachResult | null {
  if (!stripped.startsWith("{")) return null;

  const analysisMatch = stripped.match(/"analysis"\s*:\s*"([\s\S]*?)"\s*,\s*"guilt"/);
  if (!analysisMatch) return null;
  const analysis = unescapeJsonString(analysisMatch[1]);
  if (!analysis) return null;

  const guiltMatch = stripped.match(/"guilt"\s*:\s*"(healthy|unhealthy)"/);
  const guilt = guiltMatch ? (guiltMatch[1] as "healthy" | "unhealthy") : null;

  const rulesMatch = stripped.match(/"rules"\s*:\s*"([\s\S]*?)"\s*,\s*"match"/);
  const rulesRaw = rulesMatch ? unescapeJsonString(rulesMatch[1]) : "";
  const rules = rulesRaw ? rulesRaw.slice(0, TEXT_MAX_SHORT) : null;

  let right: RightResult = null;
  const existingMatch = stripped.match(
    /"type"\s*:\s*"existing"\s*,\s*"id"\s*:\s*"([^"]+)"/,
  );
  if (existingMatch) {
    const hit = activeRights.find((r) => r.id === existingMatch[1]);
    if (hit) right = { type: "existing", id: hit.id, text: hit.text };
  } else {
    const newMatch = stripped.match(/"right"\s*:\s*"(Ich habe das Recht[\s\S]*?)"\s*\}/);
    if (newMatch) {
      const text = unescapeJsonString(newMatch[1]).slice(0, TEXT_MAX_SHORT);
      if (text) right = { type: "new", text };
    }
  }

  return { analysis, guilt, rules, right };
}

/**
 * Analyse a saved "Things Got Messy" reflection against the user's Bill of
 * Rights. Accepts { entryId } (texts and rights are re-loaded server-side via
 * the RLS-scoped client) and returns { analysis, right }. The result is also
 * persisted onto the entry's ai_insights column.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Du musst angemeldet sein." },
      { status: 401 },
    );
  }

  const { entryId } = (await request.json()) as { entryId?: string };

  if (!entryId || typeof entryId !== "string") {
    return Response.json(
      { error: "Es fehlt der Eintrag für die Auswertung." },
      { status: 400 },
    );
  }

  // Die zwei Reads sind unabhängig → parallel laden.
  const [{ data: entry }, { data: bor }] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("id, content")
      .eq("id", entryId)
      .eq("user_id", user.id)
      .eq("recipe_slug", "things-got-messy")
      .eq("template_type", "messy_moment")
      .maybeSingle(),
    supabase
      .from("bill_of_rights")
      .select("rights")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!entry) {
    return Response.json(
      { error: "Wir konnten deinen Eintrag nicht finden." },
      { status: 404 },
    );
  }

  const content = entry.content as MessyMomentContent;
  const activeRights = (((bor?.rights as RightItem[] | null) ?? [])
    .filter((r) => r.active)
    .slice(0, MAX_RIGHTS_IN_PROMPT))
    .map((r) => ({ ...r, text: r.text.slice(0, TEXT_MAX_SHORT) }));

  // Cap hourly AI calls per user (checked after input validation so invalid
  // requests don't burn quota).
  if (
    await checkRateLimit(supabase, user.id, "messy-guilt-coach", MESSY_GUILT_LIMIT)
  ) {
    return Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const rightsText =
      activeRights.length > 0
        ? activeRights.map((r) => `<right id="${r.id}">${r.text}</right>`).join("\n")
        : "(noch keine Rechte vorhanden — es muss ein neues vorgeschlagen werden)";

    const userMessage = `Was passiert ist und wo sich das Schuldgefühl gemeldet hat:
<messy_when>${clampText(content.messy_when) || "(keine Angabe)"}</messy_when>

Die bisherigen Rechte der Person:
<rights>
${rightsText}
</rights>`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      // Analyse (2–4 Sätze) + Einordnung + Regeln-Satz + JSON-Gerüst +
      // Rechts-Satz — 700 lässt Luft, damit nie mitten im Satz abgeschnitten wird.
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Only count genuinely successful generations against the quota.
    await logUsage(supabase, user.id, "messy-guilt-coach");

    const raw = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!raw) {
      return Response.json({ error: AI_ERROR_MESSAGE }, { status: 502 });
    }

    const { analysis, guilt, rules, right } = parseModelOutput(raw, activeRights);

    // Persist onto the entry: die maschinenlesbare Vermutung wandert ins
    // content-JSONB (fürs Journal-Rendering), der Lesetext in ai_insights.
    // WICHTIG: content mergen, nie ersetzen — sonst ist messy_when weg.
    const mergedContent: MessyMomentContent = {
      ...content,
      ai_guilt_guess: guilt,
      ai_rules_conflict: rules,
    };

    const insightParts = [analysis];
    if (guilt) {
      insightParts.push(
        `Vermutung: ${guilt === "healthy" ? "gesunde Schuld" : "ungesunde Schuld"}`,
      );
    }
    if (rules) {
      insightParts.push(`Die Regeln im Konflikt: ${rules}`);
    }
    if (right?.type === "existing") {
      insightParts.push(`Passendes Recht aus deinem Bill of Rights: ${right.text}`);
    } else if (right?.type === "new") {
      insightParts.push(`Vorschlag für ein neues Recht: ${right.text}`);
    }
    await supabase
      .from("journal_entries")
      .update({
        content: mergedContent,
        ai_insights: insightParts.filter(Boolean).join("\n\n"),
      })
      .eq("id", entry.id);

    return Response.json({ analysis, guilt, rules, right });
  } catch (error) {
    console.error("messy-guilt-coach: AI call failed", error);
    return Response.json({ error: AI_ERROR_MESSAGE }, { status: 500 });
  }
}
