/**
 * Beschreibung je Wert-ID — jeweils die Klausel NACH "Dir ist wichtig, dass "
 * (die Seite setzt den Satz daraus zusammen). Custom-Werte und Legacy-IDs
 * bekommen die Default-Klausel.
 */
export const VALUE_DESCRIPTIONS: Record<string, string> = {
  authenticity: "du du selbst sein kannst — ohne Maske und ohne Verstellung",
  "self-compassion": "du dir selbst mit der gleichen Güte begegnest wie einem guten Freund",
  honesty: "du ehrlich bist, auch wenn es unbequem ist",
  integrity: "dein Handeln mit deinen Überzeugungen übereinstimmt",
  mindfulness: "du präsent im Moment bist, statt im Autopilot zu leben",
  courage: "du dich traust, auch wenn die Angst mitredet",
  assertiveness: "du für dich einstehst und deine Grenzen klar machst",
  resilience: "du nach Rückschlägen wieder aufstehst",
  empowerment: "du deine eigene Kraft spürst und Entscheidungen selbst triffst",
  "self-discipline": "du dranbleibst, auch wenn die Motivation nachlässt",
  responsibility: "du Verantwortung für dein Handeln übernimmst",
  growth: "du dich weiterentwickelst und über dich hinauswächst",
  curiosity: "du Neues entdeckst und Fragen stellst",
  creativity: "du deine Ideen Gestalt annehmen lässt",
  wisdom: "du innehältst und aus Erfahrung lernst",
  empathy: "du dich in andere hineinfühlen kannst",
  kindness: "du anderen mit Freundlichkeit begegnest",
  generosity: "du gibst, ohne sofort etwas zurückzuerwarten",
  connection: "du echte Nähe zu anderen Menschen lebst",
  service: "du etwas beiträgst, das über dich hinausreicht",
  gratitude: "du das Gute in deinem Leben wahrnimmst und wertschätzt",
  forgiveness: "du loslässt, was dich belastet — bei anderen und bei dir",
  balance: "du Arbeit, Ruhe und Leben in Einklang bringst",
  rest: "du dir Pausen gönnst, ohne ein schlechtes Gewissen",
  "physical-health": "du gut für deinen Körper sorgst",
  joy: "du dir Momente der Freude erlaubst",
  humor: "du das Leben auch leicht nehmen kannst",
  purpose: "dein Tun einen Sinn hat, der dich trägt",
  adventurousness: "du dich auf Neues und Unbekanntes einlässt",
  "letting-go": "du loslassen kannst, was du nicht kontrollieren kannst",
};

export const DEFAULT_VALUE_DESCRIPTION = "dieser Wert dein Handeln leitet";

export function getValueDescription(id: string): string {
  return VALUE_DESCRIPTIONS[id] ?? DEFAULT_VALUE_DESCRIPTION;
}
