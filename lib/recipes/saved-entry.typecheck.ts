/**
 * Typ-Test für den Reihenfolge-Zwang — läuft nie, wird nur von
 * `npx tsc --noEmit` geprüft.
 *
 * Bewusst NICHT `*.test.ts`: `node --test` würde die Datei einsammeln und am
 * `server-only`-Import von `saved-entry.ts` scheitern (dieselbe Begründung wie
 * bei `lib/actions/with-user.typecheck.ts`). Es gibt hier auch nichts zur
 * Laufzeit zu prüfen — `savedEntryId` ist die Identität, die ganze Aussage
 * steckt im Typ.
 *
 * Und genau deshalb steht sie hier: „erst speichern, dann auswerten" ist eine
 * Bedingung, die keinem auffällt, solange sie eingehalten wird. Ohne ein
 * `@ts-expect-error` gibt es keinen Ort, an dem der Bruch sichtbar würde.
 */
import { type AiStep, runAiStep } from "./ai-step.ts";
import { type SavedEntryId, savedEntryId } from "./saved-entry.ts";

const STEP: AiStep<"result"> = {
  endpoint: "/api/messy-guilt-coach",
  target: "result",
  fallbackMessage: "…",
};

/** Der Beleg aus einer Speicher-Action trägt bis in den KI-Schritt. */
export async function savedEntryReachesTheStep(inserted: { id: string }) {
  const entryId = savedEntryId(inserted.id);
  return runAiStep(STEP, { entryId }, (payload) => payload.analysis);
}

/** Der Nein-Trainer hängt seinen Modus an — der Eintrag bleibt Pflicht. */
export async function extraFieldsRideAlong(entryId: SavedEntryId) {
  return runAiStep(STEP, { mode: "feedback", entryId }, () => null);
}

/** Die eigentliche Aussage: eine id, die niemand gespeichert hat, geht nicht. */
export async function rawIdIsRejected() {
  return runAiStep(
    STEP,
    // @ts-expect-error — „zuerst fetchen" ist der Fehler, um den es geht.
    { entryId: "irgendeine-id" },
    () => null,
  );
}

/** Auch der Eintrag fehlen darf nicht — sonst wäre der Zwang optional. */
export async function missingEntryIsRejected() {
  return runAiStep(
    STEP,
    // @ts-expect-error — ohne Eintrag gibt es nichts auszuwerten.
    { mode: "feedback" },
    () => null,
  );
}

/**
 * Umgekehrt bleibt der Beleg ein String: `.eq("id", …)` und `FormData.set`
 * nehmen ihn ohne Umweg. Ginge das nicht, würde der Zwang überall Casts
 * erzwingen und wäre nach der dritten Übung wieder ausgehöhlt.
 */
export function savedEntryIsStillAString(entryId: SavedEntryId) {
  const asString: string = entryId;
  const form = new FormData();
  form.set("entryId", entryId);
  return asString;
}
