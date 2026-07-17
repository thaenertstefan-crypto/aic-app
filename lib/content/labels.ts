/**
 * Zentrale, nutzersichtbare Labels für Navigation und Seitentitel. Niemals
 * "Booster", "Kopfwetter" oder "Things Got Messy" irgendwo hardcoden — immer
 * von hier importieren, damit Umbenennungen an einer Stelle passieren.
 */

/** Kurz-Labels für die Bottom-Nav. */
export const NAV_LABELS = {
  dashboard: "Home",
  me: "Me",
  booster: "Kopfwetter", // interner Key bleibt "booster" (Route /booster)
  journal: "Journal",
  settings: "Einstellungen",
} as const;

/** Ausgeschriebene Seitentitel. */
export const PAGE_TITLES = {
  booster: "Kopfwetter",
  thingsGotMessy: "Things Got Messy",
  sayingNo: "Nein-Trainer",
  confidence: "Confidence-Boost",
  shadow: "Schattenseite",
  me: "Me",
  wants: "Sternensuche",
  meWants: "Meine Wants",
  meWantsHero: "Was mich leuchten lässt",
} as const;
