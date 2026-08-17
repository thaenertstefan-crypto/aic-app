"use client";

import { useState } from "react";

import { acceptSuggestedRightAction } from "@/lib/recipes/bill-of-rights/actions";
import type { RightSuggestion } from "@/lib/recipes/right-suggestion";

/**
 * Der Weg vom KI-Vorschlag ins Bill of Rights.
 *
 * Zwei Übungen enden mit derselben Geste — „Nein sagen" und „Things got
 * messy": ein vorgeschlagenes Recht steht editierbar da, ein Tap übernimmt es.
 * Beide Wizards führten dafür dieselben fünf Zustände und eine byteidentische
 * `acceptRight()`. Hier steht das einmal.
 *
 * **Jeder Zustand trägt den Vorschlag, zu dem er gehört.** Daraus fällt beides
 * von selbst: ein neuer Vorschlag kommt mit leerem Textfeld und ohne
 * Übernahme-Status, und eine Antwort, die erst eintrifft, wenn die Person
 * schon weitergezogen ist, hängt sich nicht an den falschen Vorschlag. Beides
 * ging vorher schief — `suggestionText` und `accepted` standen in einer Liste
 * von Hand zurückgesetzter Felder, und „Nächstes Szenario" liegt auf demselben
 * Screen wie der Übernehmen-Button.
 */
export type SuggestedRight = {
  /**
   * Der Satz, wie er im Textfeld steht. Bei einem bestehenden Recht (`type:
   * "existing"`) leer — dort gibt es nichts zu übernehmen, die Bühne zeigt den
   * Text direkt aus dem Vorschlag.
   */
  text: string;
  setText: (text: string) => void;
  pending: boolean;
  error: string | null;
  /** true, sobald das Recht in der Bill of Rights steht. */
  accepted: boolean;
  accept: () => Promise<void>;
};

/** Ein Wert und der Vorschlag, für den er gilt. */
type For<T> = { suggestion: RightSuggestion; value: T };

export function useSuggestedRight(suggestion: RightSuggestion): SuggestedRight {
  const [edit, setEdit] = useState<For<string> | null>(null);
  const [pendingFor, setPendingFor] = useState<RightSuggestion>(null);
  const [result, setResult] = useState<For<string | null> | null>(null);

  /** Alles, was zu einem anderen Vorschlag gehört, gilt hier als nicht da. */
  function mine<T>(held: For<T> | null): T | null {
    return held !== null && held.suggestion === suggestion ? held.value : null;
  }

  // Solange niemand tippt, ist der Text der Vorschlag selbst.
  const text = mine(edit) ?? (suggestion?.type === "new" ? suggestion.text : "");
  const pending = suggestion !== null && pendingFor === suggestion;
  const settled = result !== null && result.suggestion === suggestion;

  async function accept() {
    const target = suggestion;
    setPendingFor(target);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("text", text);
      const res = await acceptSuggestedRightAction(fd);
      setResult({ suggestion: target, value: res.error });
    } catch {
      setResult({
        suggestion: target,
        value: "Das hat gerade nicht geklappt. Versuch es noch einmal.",
      });
    } finally {
      setPendingFor((held) => (held === target ? null : held));
    }
  }

  return {
    text,
    setText: (value) => setEdit({ suggestion, value }),
    pending,
    error: settled ? mine(result) : null,
    accepted: settled && mine(result) === null,
    accept,
  };
}
