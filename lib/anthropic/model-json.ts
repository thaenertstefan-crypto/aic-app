/**
 * Modell-Antworten in Struktur verwandeln.
 *
 * Ein Sprachmodell liefert JSON, das reproduzierbar auf dieselben Arten
 * kaputtgeht: in ```json-Fences verpackt, mit ungeescapten Anführungszeichen
 * INNERHALB eines String-Werts, mitten im Satz abgeschnitten, oder gleich als
 * Prosa statt als Objekt. Dieses Modul kennt die Kaskade — Fences abstreifen,
 * JSON.parse, Anker-Rettung — und hat GENAU EINEN Ausfall.
 *
 * Der Ausfall ist `null`: der Text war erkennbar als JSON gemeint, aber weder
 * parsebar noch per Anker rettbar. Wer `null` bekommt, antwortet mit 502. So
 * landet nie ein roher `{"comment": …`-Blob in der UI — das war vorher in zwei
 * Routen der Fall, weil jede Kopie der Kaskade anders ausfiel.
 *
 * Bewusst ohne Imports: alles Nötige kommt als Parameter herein. So bleibt die
 * Datei mit purem Node prüfbar (`npm test`), ohne dass jemand `@/`-Aliase
 * auflösen müsste.
 */

/**
 * Die erste Stufe: aus den Blöcken einer Modell-Antwort den sichtbaren Text.
 *
 * Ein Block ohne `type: "text"` (Thinking, Tool-Use) trägt keinen Text für die
 * Person und fällt raus. Getrimmt wird das Ergebnis, nicht der einzelne Block —
 * sonst verschwände das Leerzeichen zwischen zwei Blöcken mitten im Satz.
 *
 * Der Parametertyp ist bewusst strukturell statt aus dem SDK importiert: das
 * hält diese Datei importfrei und damit mit purem Node prüfbar.
 */
export function readTextBlocks(
  content: readonly { type: string; text?: string }[],
): string {
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
    .trim();
}

/** Woher `fields` kommt. Der Aufrufer entscheidet daran, ob das für seine
 *  Nutzlast reicht — und `"prose"` ist der einzige Fall, in dem `text`
 *  gefahrlos angezeigt werden darf. */
export type ModelJsonSource = "json" | "rescued" | "prose";

export type ModelJson = {
  source: ModelJsonSource;
  /** Bei `"json"` das geparste Objekt, bei `"rescued"` die per Anker
   *  geretteten String-Werte, bei `"prose"` leer. Beide Wege liefern dieselbe
   *  Form, damit der Aufrufer nur EINEN Validierungspfad schreibt. */
  fields: Record<string, unknown>;
  /** Der von Fences befreite Rohtext. */
  text: string;
};

/** Modelle legen JSON gern in ```json-Fences. */
function stripFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

/**
 * Löst \n, \" und \\ aus einem per Regex herausgeschnittenen JSON-String-Wert.
 *
 * Exportiert, weil `right-match.ts` Objekt-Felder aus kaputtem JSON schneidet,
 * die diese Kaskade nicht generisch retten kann — es soll aber nur EINE
 * Auflösung dieser Escapes im Repo geben.
 */
export function unescapeJsonString(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();
}

/** War der Text erkennbar als JSON gemeint (auch wenn kaputt/abgeschnitten)?
 *  Nur wenn NICHT, gilt er als Prosa und darf unverändert durchgereicht
 *  werden — sonst sieht die Person die geschweifte Klammer. */
function looksLikeJsonAttempt(text: string, fieldOrder: readonly string[]): boolean {
  if (text.startsWith("{")) return true;
  return fieldOrder.some((key) => new RegExp(`"${key}"\\s*:`).test(text));
}

/**
 * Schneidet einen String-Wert per Regex heraus, obwohl JSON.parse gekippt ist.
 *
 * Trägt das Verfahren: die Prompts fixieren die Feldreihenfolge, also ist der
 * NÄCHSTE Key ein verlässlicher Anker für das Ende des Werts — tolerant
 * gegenüber ungeescapten Anführungszeichen im Wert selbst. Beim letzten Feld
 * übernimmt die schließende Klammer diese Rolle.
 *
 * Die Keys sind Literale aus unseren eigenen Prompts (JSON-Bezeichner), daher
 * ohne Regex-Escaping eingesetzt.
 */
function rescueField(
  text: string,
  key: string,
  nextKey: string | undefined,
): string | null {
  const anchor = nextKey ? `,\\s*"${nextKey}"` : `\\}`;
  const match = text.match(
    new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"\\s*${anchor}`),
  );
  if (!match) return null;
  return unescapeJsonString(match[1]) || null;
}

/**
 * Die ganze Kaskade in einem Aufruf.
 *
 * `fieldOrder` ist die Feldreihenfolge, die der System-Prompt vorschreibt —
 * sie ist zugleich die Anker-Kette für die Rettung. Nur String-Felder lassen
 * sich retten; Objekte und Listen (`match`, `checklist`, `funken`, `wants`)
 * fehlen in `fields`, wenn das JSON kaputt war. Genau daran erkennt der
 * Aufrufer, dass seine Nutzlast verloren ist.
 *
 * @returns `null`, wenn nichts Verwertbares übrig bleibt → der Aufrufer
 *   antwortet mit 502.
 */
export function readModelJson(
  raw: string,
  options: { fieldOrder: readonly string[] },
): ModelJson | null {
  const text = stripFences(raw);
  if (!text) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return rescueModelJson(text, options.fieldOrder);
  }

  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    return { source: "json", fields: parsed as Record<string, unknown>, text };
  }

  // Valides JSON, aber nicht die erwartete Form (nackter String, Liste, Zahl).
  // War dennoch als JSON gemeint — also kein Prosa-Durchreichen.
  return null;
}

function rescueModelJson(
  text: string,
  fieldOrder: readonly string[],
): ModelJson | null {
  if (!looksLikeJsonAttempt(text, fieldOrder)) {
    // Echte Prosa (auch der alte Antwortstil vor der JSON-Umstellung):
    // unverändert durchreichen.
    return { source: "prose", fields: {}, text };
  }

  const fields: Record<string, unknown> = {};
  for (let i = 0; i < fieldOrder.length; i++) {
    const value = rescueField(text, fieldOrder[i], fieldOrder[i + 1]);
    if (value !== null) fields[fieldOrder[i]] = value;
  }

  if (Object.keys(fields).length === 0) return null;
  return { source: "rescued", fields, text };
}

/**
 * Liest ein String-Feld aus `fields` — getrimmt, gekappt, leer wird zu `null`.
 * Der Weg (JSON oder Rettung) spielt dabei keine Rolle, deshalb steht dieser
 * Check bei allen Aufrufern nur noch einmal pro Feld.
 */
export function readText(
  fields: Record<string, unknown>,
  key: string,
  maxLen?: number,
): string | null {
  const value = fields[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return maxLen === undefined ? trimmed : trimmed.slice(0, maxLen);
}
