/**
 * Was die Empfehlungskarte des Dashboards als nächstes zeigt — die Auswahlregel
 * aus KAN-35, als reine Funktion über bereits gelesene Fortschritts-Zeilen.
 *
 * **Betrachtet werden genau drei Bilder** (der Begriff steht in `CONTEXT.md`):
 * Kompass, Sternenhimmel, Rechte. Vorher lief hier
 * `RECIPES.find(r => r.available && !completedSlugs.has(r.slug))` durch **alle
 * sieben** Übungen — wer die drei durablen durch hatte, bekam als „nächsten
 * langen Weg" den Nein-Trainer angeboten. Ein Booster wird nie voll; er kann
 * kein nächstes Bild sein.
 *
 * **„In Arbeit" kommt aus `latestPerSlug`, nicht aus `profiles.active_recipe_id`.**
 * Die Spalte wird genau einmal geschrieben (im Onboarding) und danach nie
 * gepflegt — Continuity funktionierte für die eine dort gewählte Übung und war
 * tot, sobald sie fertig war. Festgeschrieben in ADR-0006.
 *
 * **„Leer" kommt aus `everCompletedSlugs`, nicht aus den Artefakt-Tabellen.**
 * `status === "completed"` heißt bei allen dreien bereits genau „das Bild hat
 * Inhalt": bestätigter Hypothesen-Stand, mindestens ein Stern, mindestens drei
 * aktive Rechte. Eine Abfrage auf `values_hypothesis` / `wants` /
 * `bill_of_rights` wäre eine zweite Wahrheit neben einer, die schon stimmt.
 *
 * **Der Endzustand ist eine Karte, kein Fallback.** Sind alle drei voll, steht
 * der Kompass da — ohne CTA. Die Karte schickt nie von sich aus in einen neuen
 * Durchlauf; das Laufband („kaum fertig, hier sind sieben weitere Tage") war
 * ausdrücklich verworfen. Ein selbst gestarteter zweiter Durchlauf kommt
 * trotzdem zurück, über „in Arbeit" — der Unterschied ist die Herkunft.
 *
 * Rein und getestet: hier kommt kein unreiner Import zur Laufzeit an, damit
 * `node --test` die Datei laden kann.
 */

import { getRecipeStepPath } from "../utils/recipes.ts";
import { everCompletedSlugs, latestPerSlug } from "../recipes/progress.ts";
import type { Tables } from "../supabase/database.types.ts";

/** Die drei durablen Bilder — die einzigen, über die diese Regel entscheidet. */
export type BildSlug = "values" | "wants" | "bill-of-rights";

/**
 * Der Zustand, in dem die Karte das Bild antrifft.
 *
 * `endzustand` gehört zum Kompass und zu keinem anderen: er hat auf derselben
 * Seite schon seinen Zwilling in der „Heutiges Recht"-Karte, und das zuletzt
 * gefüllte Bild zu zeigen ließe die Karte mit jeder Aktivität springen.
 */
export type BildState = "in_arbeit" | "leer" | "endzustand";

/** Das gewählte Bild samt Zustand — das Ergebnis der Regel, ohne Copy. */
export type SelectedBild = {
  slug: BildSlug;
  state: BildState;
  /** Der Schritt, an dem ein laufender Weg fortsetzt; sonst 1. */
  step: number;
};

/**
 * Die Empfehlungskarte, fertig zum Rendern.
 *
 * `cta` ist ein Objekt statt zweier Felder, weil Text und Ziel zusammen leben
 * und zusammen fehlen: im Endzustand gibt es beides nicht. Zwei optionale
 * Felder ließen den halben Zustand („Text ohne Ziel") zu, den niemand meint.
 */
export type Recommendation = {
  /**
   * Der Schlüssel, über den `dashboard-focus.tsx` das empfohlene Ziel aus den
   * Quicklinks nimmt — derselbe Slug wie in `DASHBOARD_DESTINATIONS`.
   */
  key: string;
  title: string;
  subtitle: string;
  cta?: { label: string; href: string };
};

/**
 * Was von einer Fortschritts-Zeile gelesen wird — strukturell getypt, damit die
 * Signatur die vier Spalten nennt und der Test keine ganze Zeile bauen muss.
 */
type ProgressLike = Pick<
  Tables<"user_recipe_progress">,
  "recipe_slug" | "cycle_number" | "status" | "current_step"
>;

/**
 * Die Bilder in ihrer festen Reihenfolge, mit ihrer Copy und ihren Wegen.
 *
 * **Die Reihenfolge ist eine Entscheidung:** der Kompass speist die Sterne —
 * kommt er zuletzt, kann er das nicht mehr.
 *
 * **Die Karte nennt das Bild, nicht den Übungstitel** (Register nach KAN-32:
 * die Fläche im Werden nennen, nicht den Mangel). Stünde hier „Deine Werte
 * entdecken", wäre der Karte nicht anzusehen, warum sie gerade dieses Ziel
 * wählt — die Quicklinks sprechen seit KAN-40 dieselbe Vokabel.
 */
type Bild = {
  slug: BildSlug;
  title: string;
  /** Einladung, wenn das Bild noch leer ist. */
  leer: { subtitle: string; cta: string; href: string };
  /** Wiederaufnahme eines laufenden Wegs, an seiner Stelle. */
  resume: { subtitle: string; href: (step: number) => string };
};

const BILDER: readonly Bild[] = [
  {
    slug: "values",
    title: "Dein Kompass",
    leer: {
      subtitle: "Er zeigt dir, wofür du stehst. Eine Woche lang beobachten, dann steht die erste Nadel.",
      cta: "Kompass ausrichten",
      // Nicht `startPath` (/me/values/journey/hypothesis): /me/values ist die
      // kanonische Heimat, gated die Intro-Sequenz und führt danach weiter.
      href: "/me/values",
    },
    resume: {
      subtitle: "Du bist mittendrin — dein Kompass wird gerade schärfer.",
      // Direkt zurück in die Journey, ohne erneutes Intro.
      href: () => "/me/values/journey",
    },
  },
  {
    slug: "wants",
    title: "Dein Sternenhimmel",
    leer: {
      subtitle: "Er wartet auf seinen ersten Stern — auf das, was dich leuchten lässt.",
      cta: "Ersten Stern suchen",
      href: "/me/wants/journey",
    },
    resume: {
      subtitle: "Du bist mittendrin — dein Himmel füllt sich gerade.",
      href: (step) => getRecipeStepPath("wants", step),
    },
  },
  {
    slug: "bill-of-rights",
    title: "Deine Rechte",
    leer: {
      subtitle: "Die Regeln, nach denen du navigierst. Deine ersten drei geben ihnen Halt.",
      cta: "Erstes Recht formulieren",
      href: "/me/bill-of-rights",
    },
    resume: {
      subtitle: "Du bist mittendrin — deine Rechte nehmen gerade Form an.",
      href: (step) => getRecipeStepPath("bill-of-rights", step),
    },
  },
];

/** Der Kompass im Endzustand: alles steht, und nichts drängt weiter. */
const ENDZUSTAND_SUBTITLE =
  "Er steht — und dein Sternenhimmel und deine Rechte auch. Alles Weitere kommt, wenn du magst.";

/**
 * Die Regel selbst — sie gibt das **Bild** zurück, nicht seinen Slug, damit die
 * Karte unten es nicht wieder nachschlagen muss. Ein Nachschlagen bräuchte
 * einen Zweig für „nicht gefunden", den es nicht geben kann.
 *
 * In dieser Ordnung: erst das erste Bild in Arbeit, sonst das erste leere,
 * sonst der Endzustand. Ein laufender Weg schlägt also die Reihenfolge — wer
 * mitten in den Wants steckt, wird nicht zum leeren Kompass geschickt.
 */
function select(rows: readonly ProgressLike[]): {
  bild: Bild;
  state: BildState;
  step: number;
} {
  const latest = latestPerSlug(rows);
  const completed = everCompletedSlugs(rows);

  for (const bild of BILDER) {
    const row = latest.get(bild.slug);
    if (row?.status === "in_progress") {
      return { bild, state: "in_arbeit", step: row.current_step ?? 1 };
    }
  }

  for (const bild of BILDER) {
    if (!completed.has(bild.slug)) {
      return { bild, state: "leer", step: 1 };
    }
  }

  // Der Endzustand gehört dem Kompass, und BILDER beginnt mit ihm.
  return { bild: BILDER[0], state: "endzustand", step: 1 };
}

/** Welches Bild dran ist, und in welchem Zustand die Karte es antrifft. */
export function selectBild(rows: readonly ProgressLike[]): SelectedBild {
  const { bild, state, step } = select(rows);

  return { slug: bild.slug, state, step };
}

/**
 * Dieselbe Regel, als fertige Karte — der eine Aufruf, den das Dashboard macht.
 *
 * Der generische Fallback („Stöbere durch die Rezepte…") ist damit weg: es gibt
 * keinen Zustand mehr ohne Karte.
 */
export function nextRecommendation(rows: readonly ProgressLike[]): Recommendation {
  const { bild, state, step } = select(rows);
  const card = { key: bild.slug, title: bild.title };

  if (state === "endzustand") {
    return { ...card, subtitle: ENDZUSTAND_SUBTITLE };
  }

  if (state === "in_arbeit") {
    return {
      ...card,
      subtitle: bild.resume.subtitle,
      cta: { label: "Weitermachen", href: bild.resume.href(step) },
    };
  }

  return {
    ...card,
    subtitle: bild.leer.subtitle,
    cta: { label: bild.leer.cta, href: bild.leer.href },
  };
}
