/**
 * Validierung der Antwort von /api/journal-analysis.
 *
 * Die KI-Antwort ist NICHT vertrauenswürdig: `confirmed` darf nur Werte aus der
 * aktuellen Hypothese nennen, `suggested` nur ids aus der Werte-Bank, die noch
 * nicht in der Hypothese stehen. Was hier durchkommt, landet ungeprüft in der
 * UI und (bei Annahme) in der neuen Hypothese.
 *
 * Die Kaskade (Fences, JSON.parse, Anker-Rettung) gehört `model-json.ts` —
 * hier bleibt nur die Frage, welche ids erlaubt sind. Bewusst ohne `@/`:
 * die erlaubten ids kommen als Parameter herein. So bleibt die Datei mit
 * purem Node prüfbar, und die Route ist der einzige Ort, der Werte-Bank und
 * KI zusammenführt.
 */

import { readModelJson, readText } from "./model-json.ts";

export type ValueSuggestion = { id: string; reason: string };

export type JournalAnalysisResult = {
  insights: string;
  confirmed: string[];
  suggested: ValueSuggestion[];
};

/** Mehr Karten passen nicht auf die Bühne, ohne die Entscheidung zu verwässern. */
export const MAX_SUGGESTIONS = 3;
/** Ein Satz Begründung — alles darüber ist abgeschnittener Fließtext. */
export const MAX_REASON_LEN = 240;

/** Die Feldreihenfolge, die der journal-analysis-Prompt vorschreibt. */
const FIELD_ORDER = ["insights", "confirmed", "suggested"] as const;

export function parseAnalysisResult(
  raw: string,
  options: {
    currentValues: string[];
    bankIds: string[];
    fallbackInsights: string;
  },
): JournalAnalysisResult {
  const { currentValues, bankIds, fallbackInsights } = options;
  const output = readModelJson(raw, { fieldOrder: FIELD_ORDER });

  // Ausfall der Kaskade. Diese Route antwortet als einzige NICHT mit 502: die
  // Karte trägt den Fallback-Text, damit der Werte-Zyklus nicht an einer
  // kaputten Antwort hängen bleibt.
  if (!output) {
    return { insights: fallbackInsights, confirmed: [], suggested: [] };
  }

  // Echte Prosa — Rückwärtskompatibilität mit dem alten Antwortstil vor der
  // JSON-Umstellung: unverändert durchreichen.
  if (output.source === "prose") {
    return { insights: output.text, confirmed: [], suggested: [] };
  }

  const insights = readText(output.fields, "insights") ?? fallbackInsights;

  // confirmed und suggested sind Listen und damit nur aus echtem JSON zu
  // holen; bei geretteter Antwort bleiben sie leer.
  const confirmed: string[] = [];
  if (Array.isArray(output.fields.confirmed)) {
    for (const id of output.fields.confirmed) {
      if (typeof id !== "string") continue;
      if (!currentValues.includes(id)) continue;
      if (confirmed.includes(id)) continue;
      confirmed.push(id);
    }
  }

  const suggested: ValueSuggestion[] = [];
  if (Array.isArray(output.fields.suggested)) {
    for (const item of output.fields.suggested) {
      if (suggested.length >= MAX_SUGGESTIONS) break;
      if (typeof item !== "object" || item === null) continue;
      const fields = item as Record<string, unknown>;
      const id = fields.id;
      const reason = readText(fields, "reason", MAX_REASON_LEN);
      if (typeof id !== "string" || !reason) continue;
      if (!bankIds.includes(id)) continue;
      if (currentValues.includes(id)) continue;
      if (suggested.some((s) => s.id === id)) continue;
      suggested.push({ id, reason });
    }
  }

  return { insights, confirmed, suggested };
}
