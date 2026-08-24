import type { RecipeSlug } from "../utils/recipes.ts";

/**
 * Der Schlüssel ist bewusst der Rezept-Slug, nicht ein eigener Name: Die
 * Empfehlungskarte auf dem Dashboard trägt denselben Slug, und
 * `dashboard-focus.tsx` filtert über die Gleichheit der beiden das Ziel heraus,
 * das die Karte gerade zeigt. Ein abweichender Schlüssel (früher `"bor"` für
 * `"bill-of-rights"`) macht den Filter still wirkungslos — das Ziel stünde dann
 * doppelt auf der Seite. `RecipeSlug` erzwingt die Kopplung im Typcheck.
 *
 * `"confidence"` ist die eine Ausnahme: „Gleich bin ich dran“ ist kein Rezept
 * mit Fortschritt, also empfiehlt die Karte es nie und es fällt nie weg.
 */
export type DestinationKey = RecipeSlug | "confidence";

export type Destination = {
  key: DestinationKey;
  sentence: string;
  href: string;
};

/**
 * Die acht Anlaufstellen des Dashboards — handgeschriebene Ich-Sätze mit je
 * genau einem Ziel (KAN-40). Bewusst **nicht** aus `RECIPES` generiert: Die
 * Sätze sind die Sprache des Nutzers in seinem Moment („Ich fühle mich schuldig
 * für etwas"), nicht der Titel der Übung, die dahinter liegt. Und sie sind
 * bewusst **statisch**: Ob eine Übung schon durch ist, ändert nichts daran,
 * warum jemand sie sucht — das Fortsetzen ist die Aufgabe der Empfehlungskarte.
 *
 * Reihenfolge: erst die akuten Sätze (Kopfwetter), dann die durablen (Me) —
 * wer hier aufklappt, hat meist etwas Akutes.
 *
 * Sichtbar sind sieben oder acht: `dashboard-focus.tsx` nimmt das Ziel heraus,
 * das die Empfehlungskarte gerade zeigt. Ein Layout, das auf genau acht baut
 * (2×4-Raster), wäre damit falsch.
 */
export const DASHBOARD_DESTINATIONS: Destination[] = [
  {
    key: "overthinking",
    sentence: "Ich bin schon wieder am Overthinken",
    href: "/booster/overthinking",
  },
  {
    // Landet nach KAN-43 direkt im „Gleich bin ich dran“-Wizard; bis dahin auf
    // der Confidence-Boost-Landing, die ihn anbietet.
    key: "confidence",
    sentence: "Ich bin aufgeregt und muss kurz meine Nerven beruhigen",
    href: "/booster/confidence",
  },
  {
    key: "shadow",
    sentence: "Ich muss gerade richtig Dampf ablassen",
    href: "/booster/shadow",
  },
  {
    key: "saying-no",
    sentence: "Ich will zu etwas Nein sagen",
    href: "/booster/saying-no",
  },
  {
    // Schuld hat bewusst keine eigene Übung — Things Got Messy trägt sie.
    key: "things-got-messy",
    sentence: "Ich fühle mich schuldig für etwas",
    href: "/booster/things-got-messy",
  },
  {
    key: "values",
    sentence: "Ich möchte meinen inneren Kompass ansehen",
    href: "/me/values",
  },
  {
    key: "wants",
    sentence: "Ich möchte in meinem Sternenhimmel reviewen, was mich leuchten lässt",
    href: "/me/wants",
  },
  {
    key: "bill-of-rights",
    sentence: "Ich brauche eine Erinnerung, was ich mir erlauben darf",
    href: "/me/bill-of-rights",
  },
];
