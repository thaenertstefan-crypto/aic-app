/**
 * Statische Inhalte des Nein-Trainers (Rezept #4, „Saying 'No' Blueprint“
 * à la Dr. Aziz Gazipura aus dem AIC Cookbook). Bewusst ohne "server-only":
 * die Schichten rendern im Wizard als Quick-Reference, die Szenarien dienen
 * dem Übungsmodus als Fallback-Pool, wenn die KI nicht erreichbar ist.
 */

export type SayingNoLayer = {
  /** Key — identisch mit den Checklist-Feldern in SayingNoContent. */
  key: "complete_sentence" | "no_apology" | "warmth" | "no_but";
  title: string;
  rule: string;
  example: string;
};

export const SAYING_NO_LAYERS: readonly SayingNoLayer[] = [
  {
    key: "complete_sentence",
    title: "„Nein.“ ist ein vollständiger Satz",
    rule: "Du schuldest niemandem eine lange Erklärung. Je mehr du dich rechtfertigst, desto mehr Angriffsfläche bietest du — und desto unsicherer klingt dein Nein.",
    example: "„Nein, das passt für mich nicht.“ — Punkt. Kein „weil …“-Marathon.",
  },
  {
    key: "no_apology",
    title: "Keine Entschuldigungen",
    rule: "Ein Nein ist kein Vergehen. Wer sich fürs Nein entschuldigt, sagt zwischen den Zeilen: Ich tue dir gerade Unrecht. Tust du aber nicht — du füllst nur zuerst dein eigenes Glas.",
    example: "Statt „Es tut mir so leid, aber …“ einfach direkt loslegen.",
  },
  {
    key: "warmth",
    title: "Wärme zuerst",
    rule: "Ein gutes Nein darf herzlich sein. Zeig echte Wertschätzung für die Anfrage — das nimmt dem Nein die Härte, ohne es aufzuweichen.",
    example: "„Danke, dass du dabei an mich gedacht hast — das freut mich wirklich.“",
  },
  {
    key: "no_but",
    title: "Das sanfte Nein — und niemals „aber“",
    rule: "Du kannst Nein sagen, ohne das Wort Nein zu benutzen: Beginne den Satz mit „Leider …“. Wichtig: kein „aber“ nach deiner Wärme — es radiert sie wieder aus.",
    example: "„Danke, dass du an mich denkst. Leider bin ich diese Woche raus.“",
  },
] as const;

/** Kuratierte Alltagsszenarien für den Übungsmodus — Fallback, wenn die KI
 *  nicht erreichbar ist, und Pool fürs „Anderes Szenario“-Reroll. */
export const STATIC_SCENARIOS: readonly string[] = [
  "Dein Nachbar klingelt am Samstagmorgen: Er zieht nächstes Wochenende um und sucht noch helfende Hände. Du hattest dir das Wochenende eigentlich für dich freigehalten. „Du packst doch bestimmt mit an, oder?“",
  "Deine Kollegin fängt dich kurz vor Feierabend ab: Sie schafft ihre Präsentation für morgen nicht allein. „Kannst du noch eine Stunde dranhängen? Du bist einfach am schnellsten mit den Folien.“",
  "Familienfeier bei deiner Tante — sie ruft an: „Du übernimmst dieses Jahr wieder den Kuchen und die Deko, ja? Du machst das immer so schön.“ Du wolltest diesmal einfach nur Gast sein.",
  "Der Vereinsvorstand schreibt dir: „Wir bräuchten dringend jemanden fürs Sommerfest-Orgateam. Du bist doch so zuverlässig!“ Dein Kalender ist jetzt schon voll.",
  "Eine Freundin steht spontan vor deiner Tür: „Ich dachte, wir machen uns einen schönen Abend!“ Du hattest dich auf einen ruhigen Abend allein gefreut und wolltest früh schlafen.",
  "Ein alter Schulfreund schreibt dir: „Kannst du mir 200 Euro leihen? Nur bis Ende des Monats, versprochen.“ Es wäre nicht das erste Mal — und beim letzten Mal hat die Rückzahlung ewig gedauert.",
  "In der Familien-WhatsApp-Gruppe wirst du direkt angesprochen: „Du organisierst doch das Geschenk für Oma, du kannst das am besten!“ Du hast es die letzten drei Male gemacht.",
  "Dein Chef fragt freitags um 16 Uhr: „Können Sie am Wochenende die Schicht von Herrn Meier übernehmen? Sie wissen ja, wie eng es gerade ist.“ Du hast Karten für ein Konzert.",
  "Eine Bekannte aus dem Fitnessstudio fragt: „Du kennst dich doch mit Bewerbungen aus — liest du meine bis morgen Korrektur? Sind nur zwölf Seiten.“ Dein Abend war schon verplant.",
] as const;
