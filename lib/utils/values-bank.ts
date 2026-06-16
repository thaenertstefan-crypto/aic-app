/**
 * Value Bank — adapted from the AIC Cookbook.
 * Used in Recipe #1 ("Deine Werte entdecken") Step 1 (Hypothesis).
 *
 * Each value has a stable `id` (persisted) and a German `de` label (displayed).
 */
export type ValueItem = { id: string; de: string };

export const VALUES_BANK: readonly ValueItem[] = [
  { id: "kindness", de: "Freundlichkeit" },
  { id: "adventurousness", de: "Abenteuerlust" },
  { id: "growth", de: "Wachstum" },
  { id: "gratitude", de: "Dankbarkeit" },
  { id: "empathy", de: "Empathie" },
  { id: "balance", de: "Ausgeglichenheit" },
  { id: "courage", de: "Mut" },
  { id: "resilience", de: "Resilienz" },
  { id: "quality-relationships", de: "Wertvolle Beziehungen" },
  { id: "time-management", de: "Zeitmanagement" },
  { id: "optimism", de: "Optimismus" },
  { id: "curiosity", de: "Neugier" },
  { id: "mindfulness", de: "Achtsamkeit" },
  { id: "patience", de: "Geduld" },
  { id: "authenticity", de: "Authentizität" },
  { id: "intention", de: "Absicht" },
  { id: "appreciation", de: "Wertschätzung" },
  { id: "diligence", de: "Sorgfalt" },
  { id: "joy", de: "Freude" },
  { id: "honesty", de: "Ehrlichkeit" },
  { id: "integrity", de: "Integrität" },
  { id: "harmony", de: "Harmonie" },
  { id: "celebration", de: "Feiern" },
  { id: "open-mindedness", de: "Aufgeschlossenheit" },
  { id: "forgiveness", de: "Vergebung" },
  { id: "purpose", de: "Sinn" },
  { id: "passion", de: "Leidenschaft" },
  { id: "enthusiasm", de: "Begeisterung" },
  { id: "learning", de: "Lernen" },
  { id: "positivity", de: "Positivität" },
  { id: "responsibility", de: "Verantwortung" },
  { id: "generosity", de: "Großzügigkeit" },
  { id: "community", de: "Gemeinschaft" },
  { id: "advocacy", de: "Fürsprache" },
  { id: "accountability", de: "Rechenschaft" },
  { id: "excellence", de: "Exzellenz" },
  { id: "innovation", de: "Innovation" },
  { id: "benevolence", de: "Wohlwollen" },
  { id: "assertiveness", de: "Durchsetzungsvermögen" },
  { id: "simplicity", de: "Einfachheit" },
  { id: "humor", de: "Humor" },
  { id: "real-connection", de: "Echte Verbindung" },
  { id: "solitude", de: "Alleinsein" },
  { id: "service", de: "Dienst" },
  { id: "fitness", de: "Fitness" },
  { id: "growth-mindset", de: "Wachstumsdenken" },
  { id: "quality", de: "Qualität" },
  { id: "environmentalism", de: "Umweltbewusstsein" },
  { id: "hard-work", de: "Fleiß" },
  { id: "bravery", de: "Tapferkeit" },
  { id: "mindful-speech", de: "Achtsame Sprache" },
  { id: "commitment", de: "Verbindlichkeit" },
  { id: "education", de: "Bildung" },
  { id: "philanthropy", de: "Philanthropie" },
  { id: "boldness", de: "Kühnheit" },
  { id: "altruism", de: "Selbstlosigkeit" },
  { id: "letting-go", de: "Loslassen" },
  { id: "self-compassion", de: "Selbstmitgefühl" },
  { id: "empowerment", de: "Selbstermächtigung" },
  { id: "minimalism", de: "Minimalismus" },
  { id: "inclusivity", de: "Inklusion" },
  { id: "creativity", de: "Kreativität" },
  { id: "courteousness", de: "Höflichkeit" },
  { id: "adaptability", de: "Anpassungsfähigkeit" },
  { id: "experiences", de: "Erlebnisse" },
  { id: "work-life-balance", de: "Work-Life-Balance" },
  { id: "rest", de: "Erholung" },
  { id: "wisdom", de: "Weisheit" },
  { id: "beauty", de: "Schönheit" },
  { id: "open-expression", de: "Offener Ausdruck" },
  { id: "graciousness", de: "Güte" },
  { id: "constructiveness", de: "Konstruktivität" },
  { id: "connection", de: "Verbundenheit" },
  { id: "pragmatism", de: "Pragmatismus" },
  { id: "diversity", de: "Vielfalt" },
  { id: "humility", de: "Demut" },
  { id: "self-discipline", de: "Selbstdisziplin" },
  { id: "spirituality", de: "Spiritualität" },
  { id: "physical-health", de: "Körperliche Gesundheit" },
  { id: "resourcefulness", de: "Einfallsreichtum" },
] as const;

/** Prefix marking a user-defined custom value, e.g. `"custom:Gelassenheit"`. */
export const CUSTOM_PREFIX = "custom:";

/**
 * Resolves a stored value identifier to its German display label.
 * - `"custom:<text>"` → returns `<text>`.
 * - A known bank id → returns its German label.
 * - Otherwise → returns the input unchanged (legacy data / robustness fallback).
 */
export function getValueLabel(idOrCustom: string): string {
  if (idOrCustom.startsWith(CUSTOM_PREFIX)) {
    return idOrCustom.slice(CUSTOM_PREFIX.length);
  }
  const item = VALUES_BANK.find((v) => v.id === idOrCustom);
  return item ? item.de : idOrCustom;
}
