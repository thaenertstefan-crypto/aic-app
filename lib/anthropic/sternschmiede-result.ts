/**
 * Validierung der Antwort von /api/sternschmiede.
 *
 * Die Funken sind die Nutzlast dieser Übung — die Bühne „Funken" existiert,
 * um sie zu zeigen. Eine leere Liste ist deshalb KEIN gültiges Ergebnis: die
 * Bühne bliebe zwar benutzbar (der Weg „Eigenen Funken hinzufügen" ist dort),
 * täte aber so, als hätte die KI nichts zu sagen gehabt. Wer hier `null`
 * bekommt, antwortet mit 502; der Client bleibt im Briefing und bietet einen
 * neuen Versuch an.
 *
 * Bewusst ohne `@/`-Imports: die Längen-Kappe kommt als Parameter herein. So
 * bleibt die Datei mit purem Node prüfbar.
 */

import { readModelJson, readText } from "./model-json.ts";

export type FunkeSuggestion = {
  text: string;
  reason: string | null;
};

export type ForgeResult = {
  comment: string;
  funken: FunkeSuggestion[];
};

/** Mehr Funken, als Slots ausgewürfelt wurden, sind Übererfüllung — verwerfen. */
export const MAX_FUNKEN_OUT = 5;

/** Die Feldreihenfolge, die der Sternschmiede-Prompt vorschreibt. */
const FIELD_ORDER = ["comment", "funken"] as const;

/** Prüft die Funken-Liste Element für Element; halluzinierte Felder fallen weg. */
function parseFunken(raw: unknown, maxTextLen: number): FunkeSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const out: FunkeSuggestion[] = [];
  for (const item of raw.slice(0, MAX_FUNKEN_OUT)) {
    if (!item || typeof item !== "object") continue;
    const fields = item as Record<string, unknown>;
    const text = readText(fields, "text", maxTextLen);
    if (!text) continue;
    out.push({ text, reason: readText(fields, "reason", maxTextLen) });
  }
  return out;
}

export function parseForgeOutput(
  raw: string,
  options: { maxTextLen: number },
): ForgeResult | null {
  const output = readModelJson(raw, { fieldOrder: FIELD_ORDER });
  if (!output) return null;

  // Die Funken kommen NUR aus echtem JSON. Ist das JSON gekippt, rettet die
  // Anker-Kette höchstens den Kommentar — die Liste ist dann verloren, und ein
  // Kommentar allein trägt die Bühne nicht.
  const funken =
    output.source === "json"
      ? parseFunken(output.fields.funken, options.maxTextLen)
      : [];
  if (funken.length === 0) return null;

  return { comment: readText(output.fields, "comment") ?? "", funken };
}
