/** Emoji pro Wert-ID (deckt die kuratierten 30 ab). Unbekannte IDs / Custom-Werte
 *  bekommen den Default. */
export const VALUE_EMOJIS: Record<string, string> = {
  authenticity: "💎", "self-compassion": "🤍", honesty: "🪞", integrity: "🧭",
  mindfulness: "🌬️", courage: "🦁", assertiveness: "🛡️", resilience: "🌳",
  empowerment: "⚡", "self-discipline": "🎯", responsibility: "🤝",
  growth: "🌱", curiosity: "🔍", creativity: "🎨", wisdom: "🦉",
  empathy: "💞", kindness: "🌸", generosity: "🎁", connection: "🔗",
  service: "🤲", gratitude: "🙏", forgiveness: "🕊️", balance: "⚖️",
  rest: "😴", "physical-health": "💪", joy: "✨", humor: "😄",
  purpose: "🌟", adventurousness: "🧗", "letting-go": "🍃",
};

export const DEFAULT_VALUE_EMOJI = "🌿";

export function getValueEmoji(id: string): string {
  return VALUE_EMOJIS[id] ?? DEFAULT_VALUE_EMOJI;
}
