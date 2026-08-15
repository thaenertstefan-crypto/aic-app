/**
 * Validierung der Antwort von /api/journal-analysis.
 *
 * Die KI-Antwort ist NICHT vertrauenswürdig: `confirmed` darf nur Werte aus der
 * aktuellen Hypothese nennen, `suggested` nur ids aus der Werte-Bank, die noch
 * nicht in der Hypothese stehen. Was hier durchkommt, landet ungeprüft in der
 * UI und (bei Annahme) in der neuen Hypothese.
 *
 * Bewusst ohne Imports: die erlaubten ids kommen als Parameter herein. So bleibt
 * die Datei mit purem Node prüfbar, und die Route ist der einzige Ort, der
 * Werte-Bank und KI zusammenführt.
 */

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

/** Modelle legen JSON gern in ```json-Fences. */
function stripFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

export function parseAnalysisResult(
  raw: string,
  options: {
    currentValues: string[];
    bankIds: string[];
    fallbackInsights: string;
  },
): JournalAnalysisResult {
  const { currentValues, bankIds, fallbackInsights } = options;
  const text = stripFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Kippt das Parsing, gilt der alte Weg: Prosa allein, keine Blöcke.
    return { insights: text || fallbackInsights, confirmed: [], suggested: [] };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { insights: text || fallbackInsights, confirmed: [], suggested: [] };
  }

  const obj = parsed as Record<string, unknown>;

  const insights =
    typeof obj.insights === "string" && obj.insights.trim()
      ? obj.insights.trim()
      : fallbackInsights;

  const confirmed: string[] = [];
  if (Array.isArray(obj.confirmed)) {
    for (const id of obj.confirmed) {
      if (typeof id !== "string") continue;
      if (!currentValues.includes(id)) continue;
      if (confirmed.includes(id)) continue;
      confirmed.push(id);
    }
  }

  const suggested: ValueSuggestion[] = [];
  if (Array.isArray(obj.suggested)) {
    for (const item of obj.suggested) {
      if (suggested.length >= MAX_SUGGESTIONS) break;
      if (typeof item !== "object" || item === null) continue;
      const { id, reason } = item as Record<string, unknown>;
      if (typeof id !== "string" || typeof reason !== "string") continue;
      if (!bankIds.includes(id)) continue;
      if (currentValues.includes(id)) continue;
      if (suggested.some((s) => s.id === id)) continue;
      const trimmed = reason.trim();
      if (!trimmed) continue;
      suggested.push({ id, reason: trimmed.slice(0, MAX_REASON_LEN) });
    }
  }

  return { insights, confirmed, suggested };
}
