/**
 * Fallback-Inhalte für die Mantra-Cleanser-Seite.
 *
 * Werden angezeigt, solange ein Nutzer noch keine eigenen Zeilen in
 * `user_mantra` / `mantra_cards` hat. Sobald jemand sein Mantra oder seine
 * Karten speichert, ersetzen die DB-Zeilen diese Defaults (siehe page.tsx).
 */

export type MantraCard = {
  thought: string;
  reframe: string;
};

export const DEFAULT_MANTRA = "Ich bin nicht für jeden";

// Overthinking-Gedanke → Reframe, jeweils endend auf das Mantra.
export const DEFAULT_CARDS: MantraCard[] = [
  {
    thought: "Eine Person im Meeting hat skeptisch geschaut.",
    reframe:
      "Vielleicht hatte sie einfach einen schlechten Tag. Ich muss nicht jeden überzeugen — ich bin nicht für jeden.",
  },
  {
    thought: "Jemand hat meine Nachricht stundenlang nicht beantwortet.",
    reframe:
      "Das sagt nichts über meinen Wert. Nicht jede Verbindung muss passen — ich bin nicht für jeden.",
  },
  {
    thought: "Ich habe das Gefühl, mich ständig erklären zu müssen.",
    reframe:
      "Ich darf sein, wie ich bin. Wer mich versteht, versteht mich — ich bin nicht für jeden.",
  },
  {
    thought: "Eine Kollegin mag meine Art anscheinend nicht.",
    reframe:
      "Das ist okay. Ich will nicht gefallen, ich will echt sein — ich bin nicht für jeden.",
  },
];
