// Relativ und mit Endung: `node --test` fährt diese Datei ohne Bundler und
// löst den `@/`-Alias nicht auf.
import { cycleIsComplete, type CycleStand } from "./evaluation-phase.ts";

/**
 * Welche Sterne der Werte-Reise leuchten — als reines Modul, damit die Regel
 * unter `node --test` fällt.
 *
 * Die Übersicht war die letzte Fläche, die den Durchlauf nicht kannte: sie
 * zählte *alle* `daily_value`-Einträge und meldete im zweiten Durchlauf die
 * sieben Tage des ersten als erledigt. Journal und Auswertung lasen daneben
 * schon zyklus-scharf — jeder Klick auf einen „erledigten" Tag landete deshalb
 * auf dem leeren Formular von Tag 1, und die Auswertung leitete dorthin um
 * (KAN-21). Nicht die Reise war kaputt, nur ihre Karte.
 *
 * Deshalb rechnet die Karte hier aus **derselben** Vorlage wie die Auswertung:
 * `cycleIsComplete` entscheidet an beiden Stellen, ob ein Durchlauf vorbei ist.
 */

/** Der letzte Stern (Auswertung). Es gibt 9 Etappen: 0 = Hypothese, 1–7, 8. */
export const JOURNEY_LAST_INDEX = 8;

/** Woran die Karte hängt — die DB-Tatsachen plus der heutige Tag. */
export type JourneyStand = CycleStand & {
  /** `entry_date` der `daily_value`-Einträge **dieses** Durchlaufs. Dubletten
   *  und Reihenfolge sind egal; gezählt werden eindeutige Tage. */
  entryDates: string[];
  /** Heutiger Datums-Schlüssel in Server-Zeitzone (`serverTodayKey()`). */
  today: string;
  /** Gibt es überhaupt eine Hypothesen-Zeile? `hypothesisVersion` allein sagt
   *  das nicht — ohne Zeile steht dort die 1. */
  hasHypothesisRow: boolean;
};

export type JourneySteps = {
  /** Indizes der erledigten Etappen, aufsteigend und lückenlos ab 0. */
  completed: number[];
  /** Die Etappe, auf der das Maskottchen steht. */
  currentStep: number;
};

export function journeySteps({
  entryDates,
  today,
  hasHypothesisRow,
  ...cycle
}: JourneyStand): JourneySteps {
  const completed = new Set<number>();

  // 0 — Hypothese. Ab dem zweiten Durchlauf gilt sie ohne Rückfrage an die
  // Tabelle als erledigt: Schritt 1 gehört ausschließlich zum ersten Durchlauf
  // (`startNewCycleAction` beginnt bei Schritt 2, der Kompass des neuen
  // Durchlaufs ist das Ergebnis der Anpassung des vorigen). Fragte man hier
  // nach einer Zeile mit `version >= cycleNumber`, stünde ein Durchlauf, der
  // ohne Anpassung gestartet wurde, vor einem gesperrten Stern 0 und einem
  // gesperrten Rest — eine Sackgasse ohne Ausweg.
  if (cycle.cycleNumber > 1 || hasHypothesisRow) completed.add(0);

  // 1–7 — je eindeutigem Reflexionstag dieses Durchlaufs.
  const days = new Set(entryDates);
  const dailyCount = Math.min(days.size, 7);
  for (let i = 1; i <= dailyCount; i++) completed.add(i);

  // Durchlauf abgeschlossen → alles erledigt. Dieselbe Frage, die auch die
  // Auswertungs-Bühne stellt; zwei Antworten darauf waren schon einmal der Bug.
  if (cycleIsComplete(cycle)) {
    for (let i = 0; i <= JOURNEY_LAST_INDEX; i++) completed.add(i);
  }

  // currentStep = erste nicht erledigte Etappe (der letzte Stern, wenn alle
  // erledigt sind).
  let currentStep = 0;
  while (currentStep <= JOURNEY_LAST_INDEX && completed.has(currentStep)) {
    currentStep++;
  }
  if (currentStep > JOURNEY_LAST_INDEX) currentStep = JOURNEY_LAST_INDEX;

  // Kalender-Gating: Wurde der zuletzt abgeschlossene Reflexionstag HEUTE
  // ausgefüllt, darf der nächste Tag noch nicht aktiv werden. Das Maskottchen
  // bleibt auf dem heute erledigten Tag; der Folgetag öffnet am nächsten
  // Kalendertag. Hypothese (0) und Auswertung (8) bleiben unberührt.
  const latestEntryDate = entryDates.length
    ? entryDates.reduce((a, b) => (a > b ? a : b))
    : null;
  if (latestEntryDate === today && currentStep >= 1 && currentStep <= 7) {
    currentStep = dailyCount;
  }

  return { completed: [...completed].sort((a, b) => a - b), currentStep };
}
