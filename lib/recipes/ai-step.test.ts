import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { type AiStepRequest, AI_STEPS, runAiStep } from "./ai-step.ts";

/**
 * Den Beleg eines gespeicherten Eintrags stellt sonst der Server aus
 * (`lib/recipes/saved-entry.ts`, `server-only`). Der Typ wird hier aus der
 * Anfrage abgeleitet statt importiert — ein Import würde `node --test` an
 * `server-only` scheitern lassen. Dass eine ROHE id nicht durchkommt, hält
 * `saved-entry.typecheck.ts` fest; hier geht es um das Verhalten.
 */
const savedId = (id: string) => id as AiStepRequest["entryId"];

/* ------------------------------------------------------------------ */
/*  fetch-Attrappe                                                     */
/* ------------------------------------------------------------------ */

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Antwortet mit genau diesem Status und JSON-Körper. */
function answering(status: number, body: unknown) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
}

/** Antwortet mit etwas, das kein JSON ist (z. B. eine Proxy-Fehlerseite). */
function answeringGarbage() {
  globalThis.fetch = (async () =>
    new Response("<html>502 Bad Gateway</html>", { status: 200 })) as typeof fetch;
}

/** Das Netz ist weg. */
function refusing() {
  globalThis.fetch = (async () => {
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
}

const steps = Object.entries(AI_STEPS);

/* ------------------------------------------------------------------ */
/*  Die Invariante: ein KI-Ausfall blockiert die Übung nicht           */
/* ------------------------------------------------------------------ */

describe("runAiStep — Ausfall führt trotzdem in die Ziel-Bühne", () => {
  // Das ist die Produkt-Invariante hinter allen vier KI-Schritten. Sie stand
  // vorher nirgends geschrieben, sondern nur als wiederholtes setPhase im
  // catch — eine fünfte Übung hätte sie mit hoher Wahrscheinlichkeit falsch
  // abgeschrieben.

  for (const [name, step] of steps) {
    it(`${name}: die Route weist ab, mit eigener Meldung`, async () => {
      answering(429, { error: "Gerade zu viele Anfragen — probier es später." });

      const result = await runAiStep(step, { entryId: savedId("abc") }, () => "nie gelesen");

      assert.equal(result.phase, step.target);
      assert.equal(result.error, "Gerade zu viele Anfragen — probier es später.");
      assert.equal(result.data, null);
    });

    it(`${name}: die Route weist ab, ohne eigene Meldung`, async () => {
      answering(500, {});

      const result = await runAiStep(step, { entryId: savedId("abc") }, () => "nie gelesen");

      assert.equal(result.phase, step.target);
      assert.equal(result.error, step.fallbackMessage);
      assert.equal(result.data, null);
    });

    it(`${name}: das Netz ist weg`, async () => {
      refusing();

      const result = await runAiStep(step, { entryId: savedId("abc") }, () => "nie gelesen");

      assert.equal(result.phase, step.target);
      assert.equal(result.error, step.fallbackMessage);
      assert.equal(result.data, null);
    });

    it(`${name}: die Antwort ist kein JSON`, async () => {
      answeringGarbage();

      const result = await runAiStep(step, { entryId: savedId("abc") }, () => "nie gelesen");

      assert.equal(result.phase, step.target);
      assert.equal(result.error, step.fallbackMessage);
      assert.equal(result.data, null);
    });

    it(`${name}: das Lesen der Antwort scheitert`, async () => {
      answering(200, { comment: "alles gut" });

      const result = await runAiStep(step, { entryId: savedId("abc") }, () => {
        throw new Error("unerwartetes Shape");
      });

      assert.equal(result.phase, step.target);
      assert.equal(result.error, step.fallbackMessage);
      assert.equal(result.data, null);
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Der Normalfall                                                     */
/* ------------------------------------------------------------------ */

describe("runAiStep — Erfolg", () => {
  it("gibt die Ziel-Bühne und das Gelesene zurück", async () => {
    answering(200, { analysis: "Das klingt nach gesunder Schuld.", extra: 1 });

    const result = await runAiStep(
      AI_STEPS.thingsGotMessy,
      { entryId: savedId("abc") },
      (payload) => ({ analysis: String(payload.analysis ?? "") }),
    );

    assert.equal(result.phase, "result");
    assert.equal(result.error, null);
    assert.deepEqual(result.data, { analysis: "Das klingt nach gesunder Schuld." });
  });

  it("liest auch aus einer Antwort, die gar kein Objekt ist", async () => {
    // Ein nacktes `null` oder ein Array darf keinen TypeError auslösen — der
    // Leser bekommt dann schlicht ein leeres Objekt.
    answering(200, null);

    const result = await runAiStep(
      AI_STEPS.wants,
      { entryId: savedId("abc") },
      (payload) => Object.keys(payload).length,
    );

    assert.equal(result.phase, "sterne");
    assert.equal(result.error, null);
    assert.equal(result.data, 0);
  });

  it("schickt Endpunkt, Methode und Körper wie vereinbart", async () => {
    let seen: { url: string; init: RequestInit | undefined } | null = null;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    await runAiStep(AI_STEPS.sayingNo, { mode: "feedback", entryId: savedId("abc") }, () => null);

    assert.equal(seen!.url, "/api/saying-no-coach");
    assert.equal(seen!.init?.method, "POST");
    assert.equal(seen!.init?.body, JSON.stringify({ mode: "feedback", entryId: savedId("abc") }));
  });
});
