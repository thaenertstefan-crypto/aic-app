import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Der Transport zum Modell — und sonst nichts.
 *
 * Vorher exportierte diese Datei die rohe SDK-Instanz, und neun Aufrufstellen
 * griffen direkt danach. `ModelCall` ist stattdessen ein Interface: `askModel`
 * nimmt es als Parameter entgegen (Default: `callAnthropic`), sodass der
 * Aufruf austauschbar ist, ohne dass jede Route das SDK kennen muss.
 *
 * Der Typ ist absichtlich schmal — genau die Felder, die wir schicken, und
 * genau die, die wir lesen. Er beschreibt unseren Bedarf, nicht das SDK.
 */
export type ModelRequest = {
  model: string;
  max_tokens: number;
  system: string;
  messages: readonly { role: "user"; content: string }[];
};

export type ModelResponse = {
  content: readonly { type: string; text?: string }[];
};

export type ModelCall = (request: ModelRequest) => Promise<ModelResponse>;

// Der `server-only`-Import oben lässt den Build scheitern, falls dieses Modul
// je in eine Client-Komponente gezogen wird — das hält ANTHROPIC_API_KEY aus
// dem Browser-Bundle.
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Der echte Aufruf. Die einzige Stelle im Repo, die das SDK anfasst. */
export const callAnthropic: ModelCall = ({
  model,
  max_tokens,
  system,
  messages,
}) =>
  anthropic.messages.create({
    model,
    max_tokens,
    system,
    messages: [...messages],
  });
