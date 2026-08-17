import "server-only";

import { unstable_rethrow } from "next/navigation";

import { SESSION_EXPIRED } from "@/lib/actions/action-result";
import { createClient } from "@/lib/supabase/server";

import { callAnthropic, type ModelCall } from "./client.ts";
import { readTextBlocks } from "./model-json.ts";
import {
  type AiEndpoint,
  RATE_LIMIT_MESSAGE,
  checkRateLimit,
  logUsage,
} from "./rate-limit.ts";

/**
 * Der gemeinsame Einstieg der KI-Routen.
 *
 * Der eigentliche Ablauf stand achtmal in den Routen: Client bauen,
 * `auth.getUser()`, 401, Rate-Limit, 429, Modell-Literal, Textblock-Zusammenbau,
 * `logUsage`, `catch`/500. Genau ein Band davon trug echtes Verhalten — der
 * Prompt. Die sechs anderen sind Transport und liegen jetzt hier.
 *
 * Zwei Reihenfolge-Zwänge werden dabei baulich statt per Kommentar erfüllt:
 * das Limit wird direkt vor dem Aufruf geprüft (also nach jeder Validierung der
 * Route — ungültige Anfragen kommen gar nicht erst hierher), und `logUsage`
 * läuft erst, wenn der Aufruf geglückt ist.
 *
 * Bewusst ohne eigene Laufzeit-Tests: der Aufruf ist unrein (Netzwerk, Auth,
 * Rate-Limit) und fällt damit nicht unter die Testregel aus
 * CODING_STANDARDS.md. Die eine reine Bande — `readTextBlocks` — ist nach
 * `model-json.ts` gezogen und dort geprüft.
 *
 * Abgenommen wird das hier am echten Durchlauf, nicht am grünen Gate.
 */

/** Das Modell. Stand vorher neunmal als Literal in den Routen. */
export const MODEL = "claude-haiku-4-5";

type ServerClient = Awaited<ReturnType<typeof createClient>>;
type SignedInUser = NonNullable<
  Awaited<ReturnType<ServerClient["auth"]["getUser"]>>["data"]["user"]
>;

export type AskOptions = {
  /** Der System-Prompt aus `lib/anthropic/prompts/`. */
  system: string;
  /** Die zusammengebaute Nutzer-Nachricht. */
  message: string;
  maxTokens: number;
  /**
   * Überschreibt die Fehlermeldung der Route für diesen einen Aufruf. Nur
   * nötig, wo eine Route zwei Modi mit verschiedenen Meldungen hat
   * (Nein-Trainer: Szenario vs. Feedback).
   */
  failure?: string;
};

/**
 * Das Ergebnis eines Modellaufrufs — in derselben Form wie `ActionResult`:
 * `failure === null` genau dann, wenn eine Antwort da ist.
 *
 * Der Fehlerfall trägt die fertige `Response` mit Status und Meldung; die
 * Route gibt sie durch, statt selbst einen Status zu wählen. `reason`
 * unterscheidet die zwei Sorten, weil eine Route unterschiedlich darauf
 * reagieren darf — die Journal-Auswertung fällt bei `"no-answer"` weich auf
 * ihren Fallback-Text, gibt das Limit aber hart durch.
 */
export type AskResult =
  | { text: string; failure: null; reason: null }
  | { text: null; failure: Response; reason: "rate-limit" | "no-answer" };

/** Was eine KI-Route bekommt: Client, angemeldeter Nutzer, der Modellaufruf. */
export type AiRouteContext = {
  supabase: ServerClient;
  user: SignedInUser;
  askModel: (options: AskOptions) => Promise<AskResult>;
};

type RouteOptions = {
  /** Bestimmt Rate-Limit-Schlüssel und `logUsage`-Eintrag in einem. */
  endpoint: AiEndpoint;
  /** Die Meldung dieser Route, wenn der Modellaufruf nichts hergibt. */
  failure: string;
  /**
   * Der Modellaufruf. Existiert als Parameter, damit der Transport
   * austauschbar bleibt; der Default hält die acht Routen davon frei.
   */
  call?: ModelCall;
};

function halted(
  reason: "rate-limit" | "no-answer",
  failure: Response,
): AskResult {
  return { text: null, failure, reason };
}

/**
 * Umschließt einen Route-Handler mit Auth, Modellaufruf und Fehlerabbildung.
 *
 * ```ts
 * export const POST = withAiRoute(
 *   { endpoint: "wants-refiner", failure: AI_ERROR_MESSAGE },
 *   async ({ supabase, user, askModel }, request) => {
 *     // … Eingaben prüfen, Daten laden, eigene 400/404 beantworten …
 *     const answer = await askModel({ system: SYSTEM_PROMPT, maxTokens: 200, message });
 *     if (answer.failure !== null) return answer.failure;
 *     return Response.json({ text: answer.text });
 *   },
 * );
 * ```
 */
export function withAiRoute(
  route: RouteOptions,
  handle: (ctx: AiRouteContext, request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  const call = route.call ?? callAnthropic;

  return async function POST(request: Request) {
    // Kein getCachedUser: eine Route läuft in ihrem eigenen Request-Kontext und
    // fragt einmal ab — dort dedupliziert der Cache nichts und baut nur einen
    // zweiten Client (siehe CODING_STANDARDS.md, Abschnitt Struktur).
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: SESSION_EXPIRED }, { status: 401 });
    }

    const askModel = async (options: AskOptions): Promise<AskResult> => {
      const failure = options.failure ?? route.failure;

      // Direkt vor dem Aufruf: die Route hat ihre Eingaben schon geprüft, also
      // verbrennt keine ungültige Anfrage ein Kontingent.
      if (await checkRateLimit(supabase, user.id, route.endpoint)) {
        return halted(
          "rate-limit",
          Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 }),
        );
      }

      let text: string;
      try {
        const answer = await call({
          model: MODEL,
          max_tokens: options.maxTokens,
          system: options.system,
          messages: [{ role: "user", content: options.message }],
        });
        text = readTextBlocks(answer.content);
      } catch (error) {
        console.error(`${route.endpoint}: Modellaufruf fehlgeschlagen`, error);
        return halted(
          "no-answer",
          Response.json({ error: failure }, { status: 500 }),
        );
      }

      // Erst nach dem geglückten Aufruf — fehlgeschlagene Versuche zählen nicht
      // gegen das Kontingent der Person.
      //
      // Mit eigenem Fang, und das ist der Unterschied zu vorher: in den alten
      // Routen stand `logUsage` INNERHALB des Fangs um den Modellaufruf. Ein
      // misslungener Zähl-Eintrag warf damit eine schon bezahlte Antwort weg
      // und zeigte der Person einen Fehler. Ein nicht gezählter Aufruf ist der
      // deutlich kleinere Schaden.
      try {
        await logUsage(supabase, user.id, route.endpoint);
      } catch (error) {
        console.error(`${route.endpoint}: logUsage fehlgeschlagen`, error);
      }

      // Eine leere Antwort ist kein Ergebnis. 502 statt 500: der Aufruf lief,
      // das Modell hat nur nichts geliefert.
      if (!text) {
        return halted(
          "no-answer",
          Response.json({ error: failure }, { status: 502 }),
        );
      }

      return { text, failure: null, reason: null };
    };

    try {
      return await handle({ supabase, user, askModel }, request);
    } catch (error) {
      // Netz für alles außerhalb des Modellaufrufs (Parsen, Persistenz).
      // `unstable_rethrow` zuerst, sonst schluckt dieser Fang die
      // Kontroll-Fehler von `redirect()` und `notFound()`.
      unstable_rethrow(error);
      console.error(`${route.endpoint}: Route fehlgeschlagen`, error);
      return Response.json({ error: route.failure }, { status: 500 });
    }
  };
}
