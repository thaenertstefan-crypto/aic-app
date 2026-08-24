import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DASHBOARD_DESTINATIONS } from "./dashboard-destinations.ts";

/**
 * Was der Typcheck schon hält, steht hier nicht: dass jeder Schlüssel ein
 * Rezept-Slug ist (oder `"confidence"`), erzwingt `DestinationKey`. Geprüft
 * wird, was ein Typ nicht sagen kann — die Zusage des Tickets, dass jeder Satz
 * genau ein Ziel hat und keines doppelt vorkommt.
 */
describe("DASHBOARD_DESTINATIONS", () => {
  it("führt genau die acht Anlaufstellen", () => {
    assert.equal(DASHBOARD_DESTINATIONS.length, 8);
  });

  it("vergibt jeden Schlüssel nur einmal", () => {
    // Ein doppelter Schlüssel bräche zweierlei auf einmal: den React-`key` der
    // Liste und den Filter, der die aktuelle Empfehlung herausnimmt — der zöge
    // dann zwei Zeilen statt einer.
    const keys = DASHBOARD_DESTINATIONS.map((d) => d.key);
    assert.equal(new Set(keys).size, keys.length);
  });

  it("schickt keine zwei Sätze an denselben Ort", () => {
    const hrefs = DASHBOARD_DESTINATIONS.map((d) => d.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
  });

  it("schreibt jeden Satz aus der Ich-Perspektive", () => {
    for (const { key, sentence } of DASHBOARD_DESTINATIONS) {
      assert.ok(
        sentence.startsWith("Ich "),
        `${key}: „${sentence}“ ist kein Ich-Satz`,
      );
    }
  });

  it("zielt nur auf app-interne Routen", () => {
    for (const { key, href } of DASHBOARD_DESTINATIONS) {
      assert.ok(href.startsWith("/"), `${key}: ${href} ist kein interner Pfad`);
    }
  });
});
