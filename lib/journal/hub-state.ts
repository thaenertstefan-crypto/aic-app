/**
 * Der Zustand der Journal-Liste — ein Objekt mit benannten Übergängen.
 *
 * Entstanden aus einem Defekt (KAN-69), nicht aus Vollständigkeit — genau der
 * Auslöser, den ADR-0004 für ein Zustands-Modul verlangt. Vorher filterte der
 * Hub im Speicher über die geladene Seite und führte Filter, Liste, `hasMore`
 * und Ladezustand in getrennten `useState`. Daraus liefen drei Dinge
 * auseinander: die ruhige Zeile behauptete „liegt nichts“, wo nur nichts
 * *geladen* war, „Mehr laden“ verschwand ausgerechnet in diesem Zustand (die
 * Sackgasse), und die Zählzeile nannte die geladenen statt der vorhandenen.
 *
 * Hier gehören sie zusammen: der Filter *ist* die Abfrage, und **eine Antwort
 * gilt nur für den Filter, für den sie geholt wurde**. Das ist die fachliche
 * Regel, die ohne laufende App nicht prüfbar wäre — schnelles Hin- und
 * Hertippen zwischen zwei Tabs darf keine vermischte Liste hinterlassen.
 *
 * Nach demselben Muster wie die Zustands-Module der Übungen: **das Modul
 * rechnet den nächsten Zustand aus, die Komponente rendert ihn.** Kein Fetch,
 * kein React, relative `.ts`-Pfade — so fällt die Regel unter `node --test`.
 */

import type { JournalListItem } from "../utils/journal-format.ts";

/** Der Wert des ersten Filter-Tabs: „Alle“, also gar keine Bedingung. */
export const ALL_FILTER = "all";

/**
 * Seitengröße der Journal-Liste („Mehr laden“).
 *
 * Sie steht hier statt bei der Action, weil sie zum Vertrag der Liste gehört
 * und drei Stellen sie brauchen: die Action, die sie abfragt, und das
 * Seed-Skript, das den Defekt dieses Tickets nachstellt — die Treffer eines
 * Filters müssen dafür *jenseits* einer Seite liegen. Ein `"use server"`-Modul
 * lässt sich aus einem Skript nicht importieren; ein zweites Literal wäre
 * genau die Sorte Zahl, die still auseinanderläuft.
 */
export const JOURNAL_PAGE_SIZE = 30;

/**
 * Eine geladene Seite der Journal-Liste.
 *
 * Die Form wohnt hier und nicht bei der Server-Action, damit die Übergänge
 * unten sie benennen können, ohne `"use server"`-Code in den Testlauf zu
 * ziehen; die Action importiert sie umgekehrt als Rückgabetyp.
 */
export type JournalPage = {
  items: JournalListItem[];
  hasMore: boolean;
  /**
   * Die Gesamtzahl der Einträge zum abgefragten Filter — der ganze Bestand,
   * nicht die geladene Seite. Der Unterschied ist der halbe Defekt.
   */
  total: number;
};

export type JournalHubState = {
  /** Der aktive Tab. `ALL_FILTER` oder ein `recipe_slug`. */
  filter: string;
  /** Die bisher geladenen Treffer *dieses* Filters, älteste zuletzt. */
  items: JournalListItem[];
  /** Gesamtzahl zum aktiven Filter; `null`, solange sie unterwegs ist. */
  total: number | null;
  hasMore: boolean;
  /** Die erste Seite eines frisch gewählten Filters ist unterwegs. */
  loading: boolean;
  /** „Mehr laden“ hängt an. */
  loadingMore: boolean;
  /**
   * Die letzte Abfrage dieses Filters ist gescheitert.
   *
   * Ohne dieses Feld wäre ein Fehler die stillste Sackgasse von allen: das
   * Skelett bliebe stehen, weil `loading` nie zurückgeht. Ein Wurf aus der
   * Action erreicht die Fehlergrenze der Route **nicht** — sie liegt
   * oberhalb, der Aufruf kommt aber aus einem Ereignis hier unten (geprüft:
   * auch in `startTransition` bleibt das Skelett stehen). Also fängt der
   * Zustand ihn.
   */
  failed: boolean;
};

export type JournalHubEvent =
  | { type: "filterChosen"; filter: string }
  | { type: "moreRequested" }
  /** Erste Seite eines Filters — sie *ersetzt* die Liste. */
  | { type: "pageLoaded"; filter: string; page: JournalPage }
  /** Folgeseite desselben Filters — sie hängt an. */
  | { type: "pageAppended"; filter: string; page: JournalPage }
  /** Die Abfrage kam nicht durch. */
  | { type: "loadFailed"; filter: string }
  /** Nach einem Fehler von vorn — die erste Seite des aktiven Filters. */
  | { type: "retryRequested" };

/**
 * Der vollständige Zustand eines eben gewählten Filters, dessen erste Seite
 * noch unterwegs ist — der eine benannte Wert, aus dem ein Tab-Wechsel besteht.
 *
 * Bewusst eine eigene Funktion und keine Feldliste im Übergang: was ein
 * Filterwechsel mitnimmt, ist damit **nichts**, und ein Feld, das dem Zustand
 * später zuwächst, ist automatisch mit zurückgesetzt statt still ins nächste
 * Ergebnis zu lecken.
 */
export function loadingFilter(filter: string): JournalHubState {
  return {
    filter,
    items: [],
    total: null,
    hasMore: false,
    loading: true,
    loadingMore: false,
    failed: false,
  };
}

/** Der Einstieg: die vom Server geladene erste Seite unter „Alle“. */
export function initialJournalHub(page: JournalPage): JournalHubState {
  return {
    filter: ALL_FILTER,
    items: page.items,
    total: page.total,
    hasMore: page.hasMore,
    loading: false,
    loadingMore: false,
    failed: false,
  };
}

/**
 * Der `recipe_slug` zum Tab-Wert — `undefined` für „Alle“, weil dort gar keine
 * Bedingung an die Abfrage geht. Die Tab-Werte aus `getFilterTabs()` sind
 * eins zu eins die Slugs aus `RECIPE_SLUG_BY_TEMPLATE`; es braucht keine
 * Übersetzung, nur diese eine Unterscheidung.
 */
export function recipeSlugForFilter(filter: string): string | undefined {
  return filter === ALL_FILTER ? undefined : filter;
}

/**
 * Der Keyset-Cursor für die nächste Seite: der älteste geladene Eintrag.
 * `undefined` heißt „es gibt nichts, hinter das geblättert werden könnte“.
 */
export function journalCursor(state: JournalHubState): string | undefined {
  return state.items[state.items.length - 1]?.created_at;
}

export function advanceJournalHub(
  state: JournalHubState,
  event: JournalHubEvent,
): JournalHubState {
  switch (event.type) {
    // Ein Tab-Wechsel ist eine neue Abfrage, kein Nachfilter: Liste, Cursor,
    // `hasMore` und Gesamtzahl gehören dem alten Filter und gehen mit ihm.
    // Deshalb steht hier ein benannter, vollständiger Wert statt einer
    // Feldliste — aus dem alten Filter überlebt nichts.
    case "filterChosen":
      if (event.filter === state.filter) return state;
      return loadingFilter(event.filter);

    case "moreRequested":
      if (state.loading || state.loadingMore || !state.hasMore) return state;
      return { ...state, loadingMore: true, failed: false };

    // Der Wettlauf: wer schnell zwischen zwei Tabs tippt, hat mehrere
    // Antworten unterwegs. Eine Antwort zählt nur, wenn sie zum aktiven Filter
    // gehört UND wir noch auf sie warten — sonst überschriebe die späte
    // Antwort eines abgewählten Tabs die Liste des aktuellen.
    case "pageLoaded":
      if (event.filter !== state.filter || !state.loading) return state;
      return {
        ...state,
        items: event.page.items,
        total: event.page.total,
        hasMore: event.page.hasMore,
        loading: false,
        loadingMore: false,
        failed: false,
      };

    case "pageAppended":
      if (event.filter !== state.filter || !state.loadingMore) return state;
      return {
        ...state,
        items: [...state.items, ...event.page.items],
        total: event.page.total,
        hasMore: event.page.hasMore,
        loadingMore: false,
        failed: false,
      };

    // Der Ausweg aus dem Fehler: nicht hängen bleiben, sondern das Warten
    // beenden und es sagen. Die Tabs stehen daneben weiter — es führt also
    // immer ein Weg heraus, auch ohne den Knopf.
    case "loadFailed":
      if (event.filter !== state.filter) return state;
      return { ...state, loading: false, loadingMore: false, failed: true };

    case "retryRequested":
      return loadingFilter(state.filter);
  }
}
