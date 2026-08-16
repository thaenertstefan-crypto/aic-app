/**
 * Auflösung des `match`-Felds gegen das Bill of Rights der Person.
 *
 * Zwei Routen stellen dem Modell dieselbe Frage — messy-guilt-coach und
 * saying-no-coach: passt eines der bestehenden Rechte, oder braucht es ein
 * neues? Beide bekommen dieselbe Antwort-Form, und für beide gilt dieselbe
 * Regel: der TEXT eines bestehenden Rechts kommt IMMER aus der Datenbank, nie
 * aus der Modellantwort. Eine halluzinierte id wird zu `null` (= kein Recht).
 *
 * Bewusst ohne `@/`-Imports: die Rechte-Liste und die Längen-Kappe kommen als
 * Parameter herein. So bleibt die Datei mit purem Node prüfbar.
 */

import { unescapeJsonString } from "./model-json.ts";

/** So viel von einem Recht braucht dieses Modul — `RightItem` aus
 *  `lib/types/db-json.ts` passt strukturell hinein. */
export type RightLike = { id: string; text: string };

/** Passendes bestehendes Recht, neuer Vorschlag oder nichts. */
export type RightResult =
  | { type: "existing"; id: string; text: string }
  | { type: "new"; text: string }
  | null;

/** Der Satz, auf den diese beiden Übungen hinauslaufen. Steht hier einmal,
 *  weil ihn drei Stellen suchen — zwei in Prosa, eine in kaputtem JSON. */
const RIGHT_SENTENCE = /Ich habe das Recht[^.!\n]*[.!]?/;

/**
 * Findet den Rechts-Satz in einer Freitext-Antwort. Antwortet das Modell in
 * Prosa statt in JSON, trägt dieser Satz die Bühne auch allein.
 */
export function findRightSentence(text: string, maxLen: number): string | null {
  const sentence = text.match(RIGHT_SENTENCE)?.[0]?.trim();
  return sentence ? sentence.slice(0, maxLen) : null;
}

/** Löst das `match`-Objekt aus intaktem JSON auf. */
export function resolveMatch(
  raw: unknown,
  activeRights: readonly RightLike[],
  maxLen: number,
): RightResult {
  if (!raw || typeof raw !== "object") return null;
  const match = raw as { type?: unknown; id?: unknown; right?: unknown };

  if (match.type === "existing" && typeof match.id === "string") {
    const hit = activeRights.find((r) => r.id === match.id);
    return hit ? { type: "existing", id: hit.id, text: hit.text } : null;
  }
  if (match.type === "new" && typeof match.right === "string" && match.right.trim()) {
    return { type: "new", text: match.right.trim().slice(0, maxLen) };
  }
  return null;
}

/**
 * Holt das `match` aus kaputtem JSON. `readModelJson` rettet nur String-Felder;
 * `match` ist ein Objekt und fehlt dort deshalb. Die beiden Formen sind aber
 * eng genug, um sie direkt aus dem Rohtext zu schneiden.
 */
export function rescueMatch(
  text: string,
  activeRights: readonly RightLike[],
  maxLen: number,
): RightResult {
  const existing = text.match(/"type"\s*:\s*"existing"\s*,\s*"id"\s*:\s*"([^"]+)"/);
  if (existing) {
    const hit = activeRights.find((r) => r.id === existing[1]);
    return hit ? { type: "existing", id: hit.id, text: hit.text } : null;
  }

  const proposed = text.match(/"right"\s*:\s*"(Ich habe das Recht[\s\S]*?)"\s*\}/);
  if (proposed) {
    const right = unescapeJsonString(proposed[1]).slice(0, maxLen);
    if (right) return { type: "new", text: right };
  }

  return null;
}
