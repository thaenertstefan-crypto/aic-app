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
  // ── Die restlichen 50 Bank-Werte (Vorschläge dürfen aus der ganzen Bank
  //    kommen, nicht nur aus den kuratierten 30). ─────────────────────────
  "quality-relationships": "🫂", "time-management": "⏳", optimism: "🌤️",
  patience: "🐢", intention: "🕯️", appreciation: "💐", diligence: "🪡",
  harmony: "☯️", celebration: "🎉", "open-mindedness": "🚪", passion: "🔥",
  enthusiasm: "🎈", learning: "📚", positivity: "🌞", community: "🏘️",
  advocacy: "📣", accountability: "📋", excellence: "🏅", innovation: "💡",
  benevolence: "🌼", simplicity: "🫧", "real-connection": "💬",
  solitude: "🌙", fitness: "🏃", "growth-mindset": "📈", quality: "💠",
  environmentalism: "🌍", "hard-work": "🛠️", bravery: "🦅",
  "mindful-speech": "🗣️", commitment: "🪢", education: "🎓",
  philanthropy: "💝", boldness: "🚀", altruism: "🫶", minimalism: "📦",
  inclusivity: "🌈", courteousness: "🎩", adaptability: "🌊",
  experiences: "🎪", "work-life-balance": "🏡", beauty: "🌺",
  "open-expression": "🎤", graciousness: "🌻", constructiveness: "🧱",
  pragmatism: "🔧", diversity: "🌐", humility: "🌾", spirituality: "🪷",
  resourcefulness: "🧰",
};

export const DEFAULT_VALUE_EMOJI = "🌿";

export function getValueEmoji(id: string): string {
  return VALUE_EMOJIS[id] ?? DEFAULT_VALUE_EMOJI;
}
