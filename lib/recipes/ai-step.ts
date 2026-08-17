/**
 * Der KI-Schritt einer Übung — die eine Stelle, an der eine Übung das Modell
 * fragt und danach weitergeht.
 *
 * Die Produkt-Invariante, um die es hier geht: **ein KI-Ausfall blockiert die
 * Übung nicht.** Ob die Route antwortet, mit 429 abweist, Unsinn schickt oder
 * das Netz wegbricht — der Schritt endet immer in derselben Ziel-Bühne, im
 * Fehlerfall mit einer Meldung daneben. Vorher stand diese Invariante
 * nirgends geschrieben: sie existierte nur als dreimal wiederholtes
 * `setPhase` im `catch` von things-got-messy, saying-no und wants.
 *
 * **Das Modul gibt die nächste Bühne zurück; die Komponente ruft `setPhase`.**
 * Nur so fällt die Invariante unter `node --test` — `scripts/e2e/verify.mjs`
 * besucht Routen und prüft `data-e2e`-Marker, es klickt nie. Bühnen sind
 * interner Zustand, keine URLs; ein Marker auf einer Wizard-Bühne wäre im
 * Harness gar nicht erreichbar.
 *
 * Die Warte-Bühne bleibt bei der Komponente: sie setzt sie, bevor sie hier
 * hineingeht. Was danach kommt, entscheidet dieses Modul.
 */

/** Ein KI-Schritt: wohin er führt und was er sagt, wenn es schiefgeht. */
export type AiStep<Phase extends string> = {
  /** Die KI-Route, z. B. „/api/messy-guilt-coach". */
  endpoint: string;
  /** Die Bühne, in der der Schritt endet — bei Erfolg wie bei Ausfall. */
  target: Phase;
  /** Die Meldung, wenn die Route keine eigene mitschickt. */
  fallbackMessage: string;
};

/**
 * Das Ergebnis eines KI-Schritts. `phase` ist immer gesetzt — das ist die
 * Invariante. Geprüft wird wie bei `ActionResult` über `error === null`,
 * nicht über `if (!error)`: nur `null` verengt.
 */
export type AiStepResult<Phase extends string, Data> =
  | { phase: Phase; data: Data; error: null }
  | { phase: Phase; data: null; error: string };

/**
 * Die drei KI-Schritte der App. Sie stehen zusammen, damit die Invariante an
 * ihren echten Werten geprüft werden kann statt an im Test erfundenen.
 *
 * Kein Rezept-Modul im Sinne von ADR-0001: hier steht nur, wohin ein
 * KI-Schritt führt — nicht, wie eine Übung aussieht.
 */
export const AI_STEPS = {
  thingsGotMessy: {
    endpoint: "/api/messy-guilt-coach",
    target: "result",
    fallbackMessage:
      "Die Auswertung hat gerade nicht geklappt. Dein Eintrag ist gespeichert — versuch es gleich noch einmal.",
  },
  sayingNo: {
    endpoint: "/api/saying-no-coach",
    target: "feedback",
    fallbackMessage:
      "Das Feedback hat gerade nicht geklappt. Dein Nein ist gespeichert — versuch es gleich noch einmal.",
  },
  wants: {
    endpoint: "/api/wants-distiller",
    target: "sterne",
    fallbackMessage:
      "Das Destillieren hat gerade nicht geklappt. Deine Sternensuche ist gespeichert — du kannst deine Wants auch selbst formulieren.",
  },
} as const satisfies Record<string, AiStep<string>>;

/**
 * Fragt die KI-Route und gibt die nächste Bühne zurück.
 *
 * `read` verengt die Antwort auf das, was die Übung braucht — jede liest etwas
 * anderes aus ihrer Route, und genau das bleibt bei der Übung. `read` läuft
 * bewusst innerhalb des `try`: wirft es, ist das ein Ausfall wie jeder andere
 * und endet trotzdem in der Ziel-Bühne.
 */
export async function runAiStep<Phase extends string, Data>(
  step: AiStep<Phase>,
  body: unknown,
  read: (payload: Record<string, unknown>) => Data,
): Promise<AiStepResult<Phase, Data>> {
  try {
    const res = await fetch(step.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = asRecord(await res.json());

    if (!res.ok) {
      return {
        phase: step.target,
        data: null,
        error: messageFrom(payload, step.fallbackMessage),
      };
    }

    return { phase: step.target, data: read(payload), error: null };
  } catch {
    // Netzfehler, abgebrochene Verbindung, kaputtes JSON — für die Übung
    // dasselbe Ereignis.
    return { phase: step.target, data: null, error: step.fallbackMessage };
  }
}

/** Alles, was kein JSON-Objekt ist, ist für die Leser dasselbe wie ein leeres. */
function asRecord(payload: unknown): Record<string, unknown> {
  return payload !== null && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}

/** Die Route darf eine eigene, wärmere Meldung schicken — sonst greift unsere. */
function messageFrom(payload: Record<string, unknown>, fallback: string): string {
  return typeof payload.error === "string" && payload.error.trim()
    ? payload.error
    : fallback;
}
