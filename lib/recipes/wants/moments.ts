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
import { ANSWER_MAX, type DraftWant } from "./state.ts";

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
 * Die Momente, mit denen ein Stern-Entwurf geboren wird (KAN-58).
 *
 * Ein **naher** Stern ist aus vielen Antwortfeldern destilliert, und welches
 * Feld welchen Stern gefüttert hat, weiß nur das Modell. Es sagt es aber schon:
 * seit KAN-45 bestellt der Prompt Zeiger (Frage + Nummer), und `parseQuotes`
 * löst sie gegen die gespeicherten Antwortfelder auf. `DraftWant.quotes` ist
 * damit bereits der **Wortlaut der Person** — hier wird er nur noch zu Momenten
 * gemacht. Der Wortlaut läuft nie durch das Modell (ADR-0005).
 *
 * Drei Regeln, in dieser Reihenfolge:
 *
 * 1. **Ferne Sterne bekommen nichts.** Kein Mangel, sondern die Weite von der
 *    anderen Seite: einen fernen Stern hast du noch nicht gelebt, es gibt
 *    nichts zu belegen. `farDrafts` setzt `quotes: []`, die Marke ist der
 *    zweite Riegel — und der einzige, der auch nach einem `refineSucceeded`
 *    noch trägt.
 * 2. **Die Belege werden die Momente** — jeder einer, im Wortlaut.
 * 3. **Rückfall ist `example`**, wenn kein Beleg übrig bleibt. Von der KI
 *    formuliert und damit schlechter als die eigenen Worte, aber nie leer.
 *
 * Einen dritten Rückfall gibt es bewusst nicht. Fehlen Belege **und**
 * Beispiel — das Modell hat keins geliefert, oder `refineSucceeded` hat es mit
 * dem Satz fallen lassen —, bleibt der Stern ohne Moment. Der einzige Text,
 * der dann noch dastünde, wäre der Stern selbst, und ein Stern unter dem Stern
 * ist genau das, was KAN-36 dem fernen Stern verweigert hat. Ein leerer Stern
 * ist die ehrlichere Fläche: dort trägt die Person ihren ersten Beleg selbst
 * ein.
 *
 * Was als Moment nicht durchginge, fällt weg statt zu werfen: ein einziger
 * Ausreißer darf nicht das Anlegen des Sterns abweisen, an dem er hängt —
 * dieselbe Haltung wie in `parseQuotes`.
 *
 * Gerechnet wird beim Bestätigen, nicht beim Destillieren: `refineSucceeded`
 * ersetzt den Satz eines Sterns und nullt sein `example`, und ein vorher
 * gebauter Moment trüge dann einen Anker für einen Satz, den es nicht mehr
 * gibt. Wer auf der Sterne-Bühne einen Stern verwirft, verwirft seine Momente
 * ungeschrieben mit — sie entstehen erst aus dem, was übrig ist.
 *
 * `newId` kommt herein, damit das Modul rein bleibt (`crypto.randomUUID` im
 * Client, eine zählbare Quelle im Test) — dasselbe Muster wie `farDrafts`.
 */
export function momentsForDrafts(
  drafts: DraftWant[],
  newId: () => string,
): NewMoment[] {
  const out: NewMoment[] = [];

  for (const draft of drafts) {
    if (draft.distance === "fern") continue;

    const quoted = draft.quotes.map((q) => q.trim()).filter(usableAsMoment);
    const texts =
      quoted.length > 0 ? quoted : [draft.example?.trim() ?? ""].filter(usableAsMoment);

    for (const text of texts) {
      out.push({ id: newId(), starId: draft.id, text, origin: "audit" });
    }
  }

  return out;
}

/** Was `momentTextError` durchgehen ließe — die eine Prüfung, hier als Filter. */
function usableAsMoment(text: string): boolean {
  return momentTextError(text) === null;
}

/**
 * Der Deckel für die mitgereichte Momente-Liste — Schutz vor einer
 * manipulierten Nutzlast, keine Regel über Momente.
 *
 * Das ist `MAX_QUOTES_PER_WANT` mal `MAX_WANTS`: mehr Belege je Stern löst
 * `parseQuotes` gar nicht erst auf, mehr Sterne nimmt `parseItems` nicht an.
 * Die Rechnung steht hier als **Zahl** und nicht als Ausdruck, weil
 * `MAX_QUOTES_PER_WANT` in `lib/anthropic/wants-distiller-result.ts` wohnt —
 * dieses Modul läuft im Client, und ein Import von dort zöge den ganzen
 * Werte-Katalog und den JSON-Leser des Modells ins Bundle, für eine 3.
 *
 * Die Grenze ist stattdessen ein Test daneben, wie beim Deckel von
 * `MOMENT_MAX` gegen den `check`-Constraint der Spalte: wer eine der beiden
 * Zahlen verschiebt, macht ihn rot.
 */
export const MAX_BORN_MOMENTS = 300;

/**
 * Die mitgereichten Momente einer Speicher-Anfrage — **filternd, nicht
 * abweisend**.
 *
 * Anders als `parseItems`, das bei einem einzigen Ausreißer `null` gibt und
 * damit das ganze Speichern abweist: die Momente sind die Zugabe, die Sterne
 * sind die Nutzlast. Was hier nicht durchgeht, kostet einen Beleg, nie einen
 * Stern — dieselbe Haltung wie in `parseQuotes`.
 *
 * `starIds` ist der Stand **nach** dem Merge. Ein Moment an einem Stern, den es
 * dort nicht gibt, wäre eine Waise ab der ersten Zeile: ADR-0007 erlaubt
 * Waisen, aber es gibt keinen Grund, welche zu erzeugen.
 *
 * Die Herkunft wird nicht geprüft, sondern **gesetzt**: geboren wird nur
 * `"audit"`. `"own"` heißt „selbst eingetragen", und das ist keine Zeile, die
 * aus einer Sternensuche fällt — was der Aufrufer behauptet, ändert daran
 * nichts. Eine Server-Action ist eine offene HTTP-Fläche.
 */
export function parseBornMoments(
  raw: FormDataEntryValue | null,
  starIds: Set<string>,
): NewMoment[] {
  if (typeof raw !== "string" || !raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: NewMoment[] = [];
  const seen = new Set<string>();

  for (const item of parsed.slice(0, MAX_BORN_MOMENTS)) {
    if (!item || typeof item !== "object") continue;
    const { id, starId, text } = item as Record<string, unknown>;
    if (typeof id !== "string" || !id.trim()) continue;
    if (typeof starId !== "string" || !starIds.has(starId)) continue;
    if (typeof text !== "string" || !usableAsMoment(text.trim())) continue;
    // Zweimal dieselbe id in EINER Anweisung bringt Postgres dazu, den
    // Schreibvorgang abzuweisen („cannot affect row a second time") — und mit
    // ihm alle Momente, die sonst durchgegangen wären.
    if (seen.has(id)) continue;
    seen.add(id);

    out.push({ id, starId, text: text.trim(), origin: "audit" });
  }

  return out;
}

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
