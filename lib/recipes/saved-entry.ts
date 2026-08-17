import "server-only";

/**
 * Der Beleg, dass eine Zeile in `journal_entries` steht.
 *
 * Fünf KI-Routen (`journal-analysis`, `messy-guilt-coach`, `wants-distiller`,
 * `wants-refiner` und der Feedback-Modus von `saying-no-coach`) bekommen eine
 * `entryId`, laden den Eintrag serverseitig nach und antworten mit 404, wenn es
 * ihn nicht gibt. Vier davon schreiben ihr Ergebnis anschließend zurück auf
 * dieselbe Zeile. Daraus folgt ein Zwang: **erst speichern, dann auswerten.**
 *
 * Der Zwang stand vorher nirgends — nicht im Typ, nicht an der Route, in keinem
 * Test. Er lebte ausschließlich in der Aufrufreihenfolge von vier
 * Client-Komponenten. Wer eine fünfte KI-Übung baut und zuerst fetcht, bekam
 * ein 404 und suchte den Fehler in der Route.
 *
 * **Dieser Typ IST der Zwang.** `runAiStep` nimmt keine nackte `string`-id mehr
 * entgegen, sondern nur eine `SavedEntryId`, und die entsteht ausschließlich
 * hier. Weil dieses Modul `server-only` ist, kann eine Client-Komponente den
 * Beleg nicht selbst ausstellen — sie kann ihn nur weiterreichen. „Zuerst
 * fetchen" ist damit ein Typfehler statt eines 404.
 *
 * Kein Rezept-Modul im Sinne von ADR-0001: hier steht nur, woher eine
 * Eintrags-id kommen darf — nicht, wie eine Übung aussieht.
 */

declare const fromDatabase: unique symbol;

/**
 * Eine Eintrags-id, die belegt aus der Datenbank kommt. Zuweisbar auf `string`
 * (für `.eq("id", …)` und `FormData`), aber ein `string` ist NICHT zuweisbar
 * auf sie — das ist der ganze Punkt.
 */
export type SavedEntryId = string & { readonly [fromDatabase]: true };

/**
 * Stellt den Beleg aus. Aufzurufen an genau den zwei Stellen, an denen er
 * wahr ist:
 *
 * - eine Speicher-Action hat die Zeile gerade geschrieben (`ok(savedEntryId(inserted.id))`),
 * - ein serverseitiger Read hat sie gerade gelesen (Seiten-Daten eines Wiederbesuchs).
 *
 * Beides sind Server-Fakten, und beides sind die einzigen Wege, auf denen eine
 * Übung an eine id kommt.
 */
export function savedEntryId(id: string): SavedEntryId {
  return id as SavedEntryId;
}
