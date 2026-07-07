/**
 * Zentrale, nutzersichtbare Labels für Navigation und Seitentitel. Niemals
 * "Booster", "Kopf-Apotheke" oder "Things Got Messy" irgendwo hardcoden — immer
 * von hier importieren, damit Umbenennungen an einer Stelle passieren.
 */

/** Kurz-Labels für die Bottom-Nav. */
export const NAV_LABELS = {
  dashboard: "Home",
  me: "Me",
  booster: "Apotheke", // gekürztes Nav-Label für die Kopf-Apotheke
  journal: "Journal",
  settings: "Einstellungen",
} as const;

/** Ausgeschriebene Seitentitel. */
export const PAGE_TITLES = {
  booster: "Kopf-Apotheke",
  thingsGotMessy: "Things Got Messy",
  sayingNo: "Nein-Trainer",
  me: "Me",
} as const;
