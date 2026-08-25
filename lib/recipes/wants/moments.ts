/**
 * Die Regeln rund um einen **Moment** — den Beleg an einem Stern, „das hier
 * habe ich gelebt" — als reines Modul, damit sie unter `node --test` fallen.
 *
 * Der Datenzugriff steht daneben in `actions.ts`. Hier liegt nur, was ohne
 * Supabase entscheidbar ist: der Deckel, die interne Marke, die Gruppierung
 * nach Stern und die Rechnung, welche Sterne ein Speichervorgang gelöscht hat.
 *
 * Warum Momente in einer eigenen Tabelle ohne Fremdschlüssel liegen, steht in
 * `docs/adr/0007-momente-in-eigener-tabelle-ohne-fremdschluessel.md`.
 */

import type { Tables } from "../../supabase/database.types.ts";
import { tooLong } from "../../utils/form-validation.ts";
import { ANSWER_MAX } from "./state.ts";

type MomentRow = Tables<"star_moments">;

/**
 * Der Deckel eines Moments: 800 Zeichen, **nicht** die 300 aus
 * `TEXT_MAX_SHORT`.
 *
 * Ein Moment, der beim Anlegen des Sterns aus einem Antwortfeld übernommen
 * wurde, trägt dessen ganzen Wortlaut. Ein engerer Deckel wiese genau die
 * Momente ab, die von selbst entstehen. Der Backstop dahinter ist der
 * `check`-Constraint auf der Spalte (Migration `…_star_moments.sql`) — wer
 * die eine Zahl ändert, ändert die andere mit.
 */
export const MOMENT_MAX = ANSWER_MAX;

/**
 * Woher ein Moment kommt. **Intern, nie sichtbar:** ein übernommener Moment
 * (`"audit"`) unterscheidet sich für den Nutzer in nichts von einem selbst
 * eingetragenen (`"own"`). Die Marke existiert, damit die Oberfläche erkennen
 * kann, ob an einem Stern noch **kein** eigener Moment hängt.
 */
export type MomentOrigin = "audit" | "own";

/**
 * Ein Moment, wie ihn die Oberfläche sieht.
 *
 * Aus der generierten Zeile abgeleitet statt nachgeschrieben — bis auf zwei
 * Punkte: `user_id` fällt weg (die RLS trägt ihn, die Fokus-Ebene braucht ihn
 * nicht), und `origin` ist hier enger als die Spalte. Der Generator führt eine
 * `text`-Spalte mit `check`-Constraint als `string`; die zwei erlaubten Werte
 * stehen nur in der Migration. `isMomentOrigin` ist die Stelle, an der aus dem
 * einen der andere wird.
 */
export type StarMoment = {
  id: MomentRow["id"];
  star_id: MomentRow["star_id"];
  text: MomentRow["text"];
  origin: MomentOrigin;
  created_at: MomentRow["created_at"];
};

/**
 * Ein neu anzulegender Moment — was der Aufrufer mitbringt, bevor es die Zeile
 * gibt.
 *
 * Absichtlich eine eigene Form neben `StarMoment` und **camelCase**, wo jener
 * snake_case trägt: `StarMoment` ist aus den Spalten abgeleitet und erbt deren
 * Schreibweise, das hier ist ein App-Argument wie `WantItem.valueId`. Die `id`
 * steht drin, weil sie vom Client kommt — daran hängt die Idempotenz.
 * `created_at` fehlt: das setzt die Datenbank.
 */
export type NewMoment = {
  id: string;
  starId: string;
  text: string;
  origin: MomentOrigin;
};

/** Momente eines Nutzers, nach Stern geschlagen — die Form, in der sie gelesen werden. */
export type MomentsByStar = Record<string, StarMoment[]>;

/**
 * Die eine Meldung für „das kann nur ein kaputter Client sein".
 *
 * Fehlende id, fehlende Stern-id, eine `origin`, die es nicht gibt — nichts
 * davon kann ein Nutzer verursachen und nichts davon kann er beheben. Also
 * eine Meldung statt vier, und keine, die ihm etwas vorwirft.
 */
export const MOMENT_BROKEN_CALL =
  "Das hat gerade nicht geklappt. Versuch es noch einmal.";

/**
 * Der Text eines Moments, geprüft — warme deutsche Meldung oder `null`.
 *
 * Leer ist ein Befund, kein Sonderfall: ein Moment ohne Text ist kein Beleg.
 */
export function momentTextError(text: string): string | null {
  if (!text.trim()) {
    return "Schreib kurz auf, was du gelebt hast.";
  }
  return tooLong(text, MOMENT_MAX);
}

/** Verengt den `string` der Spalte auf die zwei Werte des `check`-Constraints. */
export function isMomentOrigin(value: unknown): value is MomentOrigin {
  return value === "audit" || value === "own";
}

/** Die gelesenen Spalten — `user_id` holt niemand, die RLS trägt ihn. */
type MomentRowRead = Pick<
  MomentRow,
  "id" | "star_id" | "text" | "origin" | "created_at"
>;

/**
 * Eine gelesene Zeile als `StarMoment`.
 *
 * Die eine Stelle, an der aus dem `string` der Spalte eine `MomentOrigin`
 * wird — vorher stand diese Zuordnung zweimal da, einmal im Lesen und einmal
 * in der Antwort des Anlegens, und zwei Fassungen derselben Verengung sind
 * eine zu viel.
 *
 * `"own"` ist der Rückfall, obwohl der `check`-Constraint gar nichts anderes
 * zulässt: es ist die Marke ohne Sonderfall. Ein Moment, den niemand einordnen
 * kann, sieht dann aus wie ein selbst eingetragener — und das ist genau das,
 * was der Nutzer ohnehin sieht, denn die Marke ist intern.
 */
export function toStarMoment(row: MomentRowRead): StarMoment {
  return {
    id: row.id,
    star_id: row.star_id,
    text: row.text,
    origin: isMomentOrigin(row.origin) ? row.origin : "own",
    created_at: row.created_at,
  };
}

/**
 * Momente nach Stern gruppieren, in der Reihenfolge, in der sie ankommen.
 *
 * Sortiert wird in der Abfrage (`created_at`); das Gruppieren rührt die
 * Reihenfolge nicht an. Gebaut über eine `Map` und `Object.fromEntries`, weil
 * `star_id` ein Client-String ist: ein direkt beschriebenes Objektliteral
 * würde bei `"__proto__"` den Prototyp anfassen statt einen Schlüssel zu
 * setzen.
 */
export function groupMomentsByStar(moments: StarMoment[]): MomentsByStar {
  const byStar = new Map<string, StarMoment[]>();
  for (const moment of moments) {
    const bucket = byStar.get(moment.star_id);
    if (bucket) {
      bucket.push(moment);
    } else {
      byStar.set(moment.star_id, [moment]);
    }
  }
  return Object.fromEntries(byStar);
}

/**
 * Die Sterne, die dieser Speichervorgang gelöscht hat: `previousIds` minus
 * das Eingehende.
 *
 * Dieselbe Rechnung wie in `mergeItems` — nur von der anderen Seite gesehen.
 * Dort entscheidet `previousIds`, welches DB-Element bleibt; hier, dessen
 * Momente Müll geworden sind. Fehlt `previousIds`, fällt nichts weg und es
 * gibt nichts zu räumen: die sichere Seite, hier wie dort.
 */
export function deletedStarIds(
  previousIds: string[],
  incomingIds: string[],
): string[] {
  const incoming = new Set(incomingIds);
  return [...new Set(previousIds)].filter((id) => !incoming.has(id));
}
