/**
 * Die Bewegungs-Grammatik der App, Teil 2: **das Warten** (KAN-52/KAN-61).
 *
 * Der eine Wartescreen der App ist „der Funkenflug" — ein Strom kleiner
 * Teilchen, die aufsteigen und vergehen. Dieses Modul hält nicht sein Bild,
 * sondern seine **Zeit**: wann er kommt und wann er wieder geht.
 *
 * Zwei Zahlen tragen das, und beide sind gegen dasselbe gerichtet — gegen ein
 * Aufblitzen:
 *
 * - **Die Schwelle (250 ms).** Darunter erscheint gar nichts. Eine
 *   KI-Antwort kann in 700 ms da sein; ein voll aufgefahrener Wartescreen
 *   wäre dann schlimmer als das Warten selbst. Den kurzen Moment trägt der
 *   gedrückte, deaktivierte Button allein.
 * - **Die Mindeststandzeit (400 ms).** Ist er einmal da, bleibt er so lange
 *   stehen. Sonst erscheint er bei einer 300-ms-Antwort für 50 ms und ist
 *   wieder weg — dasselbe Zucken, nur von der anderen Seite.
 *
 * Danach blendet er mit den generischen ~200 ms Opacity aus (KAN-30). Dass er
 * währenddessen noch steht, ist der Grund, warum `flugstand` drei Werte hat
 * und nicht zwei: der Aufrufer muss die Bühne bis zum Ende der Blende halten.
 *
 * Was den Wechsel überlebt: **nichts.** Jeder Weg endet in `ruhe`, und ein
 * neues Warten beginnt bei null — außer der Flug steht noch auf dem Schirm,
 * dann übernimmt er ihn direkt (siehe `geht` + `warteBegonnen`). Ihn erst
 * auszublenden und 250 ms später neu einzublenden wäre genau das Flackern,
 * gegen das die Schwelle antritt.
 */

/** Ab hier ist das Warten lang genug, um gezeigt zu werden. */
export const SCHWELLE_MS = 250;
/** So lange steht der Flug mindestens, sobald er einmal da ist. */
export const MINDESTSTANDZEIT_MS = 400;
/** Die generische Blende der Bewegungs-Grammatik (KAN-30). */
export const AUSBLENDEN_MS = 200;

export type WarteZustand =
  /** Nichts läuft, nichts steht. */
  | { kind: "ruhe" }
  /** Es wird gewartet, die Schwelle ist noch nicht erreicht — unsichtbar. */
  | { kind: "schwelle" }
  /** Sichtbar, die Mindeststandzeit läuft noch. */
  | { kind: "steht" }
  /** Sichtbar, die Mindeststandzeit ist um — er darf jederzeit gehen. */
  | { kind: "haelt" }
  /** Die Antwort ist da, aber die Mindeststandzeit läuft noch — er bleibt. */
  | { kind: "nachlauf" }
  /** Er blendet aus und ist bis zum Ende der Blende noch auf dem Schirm. */
  | { kind: "geht" };

export type WarteEreignis =
  | { type: "warteBegonnen" }
  | { type: "warteBeendet" }
  | { type: "schwelleErreicht" }
  | { type: "standzeitAbgelaufen" }
  | { type: "ausgeblendet" };

/**
 * Was der Aufrufer zu tun hat. `"aus"` heißt: keine Bühne rendern. `"steht"`
 * und `"geht"` heißen beide „sichtbar" und unterscheiden nur, welche Blende
 * die Szene trägt.
 */
export type Flugstand = "aus" | "steht" | "geht";

export const initialWarten: WarteZustand = { kind: "ruhe" };

const RUHE: WarteZustand = initialWarten;
const SCHWELLE: WarteZustand = { kind: "schwelle" };
const STEHT: WarteZustand = { kind: "steht" };
const HAELT: WarteZustand = { kind: "haelt" };
const NACHLAUF: WarteZustand = { kind: "nachlauf" };
const GEHT: WarteZustand = { kind: "geht" };

/**
 * Der Übergang. Gibt bei einem Ereignis ohne Wirkung **denselben** Zustand
 * zurück, damit `useReducer` das Rendern abbricht.
 */
export function advanceWarten(
  zustand: WarteZustand,
  ereignis: WarteEreignis,
): WarteZustand {
  switch (zustand.kind) {
    case "ruhe":
      return ereignis.type === "warteBegonnen" ? SCHWELLE : zustand;

    case "schwelle":
      if (ereignis.type === "schwelleErreicht") return STEHT;
      // Die schnelle Antwort: es war nie etwas zu sehen, also gibt es auch
      // nichts auszublenden.
      if (ereignis.type === "warteBeendet") return RUHE;
      return zustand;

    case "steht":
      if (ereignis.type === "standzeitAbgelaufen") return HAELT;
      if (ereignis.type === "warteBeendet") return NACHLAUF;
      return zustand;

    case "haelt":
      return ereignis.type === "warteBeendet" ? GEHT : zustand;

    case "nachlauf":
      if (ereignis.type === "standzeitAbgelaufen") return GEHT;
      // Ein zweites Warten setzt vor dem Gehen wieder ein — die Standzeit
      // läuft weiter, sie hat ja nie ausgesetzt.
      if (ereignis.type === "warteBegonnen") return STEHT;
      return zustand;

    case "geht":
      if (ereignis.type === "ausgeblendet") return RUHE;
      if (ereignis.type === "warteBegonnen") return STEHT;
      return zustand;
  }
}

export function flugstand(zustand: WarteZustand): Flugstand {
  switch (zustand.kind) {
    case "ruhe":
    case "schwelle":
      return "aus";
    case "geht":
      return "geht";
    default:
      return "steht";
  }
}
