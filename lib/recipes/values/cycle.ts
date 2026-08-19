/**
 * Der Durchlauf der Werte-Übung — als **ein** Wert, aus dem alles folgt, was
 * eine Fläche über ihn wissen muss.
 *
 * KAN-19 bis KAN-22 waren vier Fixes derselben Sorte: eine Fläche wusste nicht,
 * in welchem Durchlauf sie steht, und las darum die Daten eines anderen. Der
 * Durchlauf hatte danach eine Spalte, eine Migration und vier Bugfixes — aber
 * kein Modul. `.eq("cycle_number", …)` stand achtmal da, jedes Mal als Pflicht
 * des Aufrufers.
 *
 * Hier steht er einmal. Ein `Cycle` entsteht nur aus den Zeilen, die ihn
 * belegen (`cycleFrom`, `cycleOfEntry`), trägt seine drei abgeleiteten
 * Wahrheiten als Eigenschaften und öffnet mit `cycleJournal` den einzigen
 * Werte-Einstieg auf `journal_entries`.
 *
 * **Dieses Modul besitzt die Kopplung `values_hypothesis.version` ===
 * Durchlauf-Nummer** (ADR-0003). Version N ist der Kompass, der in Durchlauf N
 * getestet wird; die Anpassung am Ende von N entsteht als Version N+1 und wird
 * damit der Kompass von N+1. Deshalb hat `values_hypothesis` keine eigene
 * `cycle_number`. Kein Aufrufer außerhalb dieser Datei vergleicht die beiden
 * Zahlen noch — wer es tut, baut KAN-19 nach.
 *
 * **Die Nummer bleibt eine nackte `number`** (ADR-0002). Der Schutz kommt
 * daher, dass niemand mehr eine herumreicht, nicht aus einem Brand.
 *
 * `evaluation-phase.ts` und `journey-steps.ts` sind hier aufgegangen: sie
 * beantworteten dieselbe Frage in drei Teilen, und der Unterschied zwischen
 * `isComplete` und `hypothesisLocked` war zweimal ein Bug (KAN-19, KAN-20).
 * Nebeneinander ist er sichtbar.
 *
 * **Rein im Sinne der Testregel bleibt die obere Hälfte** — alles bis
 * `nextCycle`. `readCycle` und `cycleJournal` brauchen Supabase und haben
 * darum keinen Test; sie stehen trotzdem hier und nicht in `actions.ts`, aus
 * zwei Gründen: eine `"use server"`-Datei darf nur async Funktionen
 * exportieren (`cycleJournal` ist synchron, und die Analyse-Route braucht ihn),
 * und `readCycle` nimmt nur `ActionContext`, ist also auch aus
 * Server-Komponenten aufrufbar. Damit `node --test` die Datei lädt, kommt hier
 * kein unreiner Import zur Laufzeit an: `ActionContext` als `import type`,
 * Supabase über `ctx.supabase`, `readProgress` und `recipeSlugFor` aus
 * ausdrücklich reinen Modulen. Vorbild: `lib/recipes/progress.ts`.
 */

// Relativ und mit Endung: `node --test` fährt diese Datei ohne Bundler und
// löst den `@/`-Alias nicht auf.
import type { ActionContext } from "../../actions/with-user.ts";
import type { Tables } from "../../supabase/database.types.ts";
import { readProgress, type ProgressRow } from "../progress.ts";

/** Der Slug der Werte-Übung — der eine Ort, an dem er für den Durchlauf steht. */
const RECIPE_SLUG = "values";

/** Die zwei `template_type`, unter denen die Werte-Übung ins Journal schreibt. */
export type ValuesTemplate = "daily_value" | "value_eval";

/** Der Status einer Fortschritts-Zeile — aus der Spalte abgeleitet, nicht nachgebaut. */
type CycleStatus = Tables<"user_recipe_progress">["status"];

/** Was Schritt 1 zeigt, wenn man ihn öffnet. */
export type HypothesisStage =
  /** Die Auswahl — der Kompass wird gerade erst gesetzt. */
  | "select"
  /** Der Kompass des **laufenden** Durchlaufs: steht fest, gilt aber noch. */
  | "current"
  /** Der Kompass eines abgeschlossenen Durchlaufs: nur noch Rückblick. */
  | "archive";

/**
 * Ein Durchlauf der Werte-Übung: Hypothese aufstellen, sieben Tage Tagebuch,
 * auswerten, Kompass anpassen.
 *
 * **Nie `null`.** Auch wer noch gar nicht angefangen hat, steht in Durchlauf 1
 * — `status: null` trägt die Aussage „noch nicht gestartet", genauso wie
 * `hypothesisVersion: null` „noch keine Hypothesen-Zeile" trägt. Dieselbe
 * Begründung wie bei `hasSeenRecipeIntro` in `lib/recipes/actions.ts`: ein
 * Anfangszustand ist ein Zustand, kein fehlender Wert.
 */
export type Cycle = {
  /** Die Nummer — `1` für den ersten. Der Filterwert jedes Werte-Reads. */
  number: number;
  /** `status` der Fortschritts-Zeile; `null`, wenn es keine gibt. */
  status: CycleStatus | null;
  /**
   * Version der **jüngsten** Hypothesen-Zeile; `null`, wenn es keine gibt.
   *
   * Nicht „die Version dieses Durchlaufs": sie ist `number`, solange der
   * Durchlauf läuft, und `number + 1`, sobald er angepasst wurde. Genau daran
   * hängt `isComplete`.
   */
  hypothesisVersion: number | null;
  /**
   * Ist **dieser** Durchlauf vorbei?
   *
   * Abgeschlossen wird auf **zwei** Wegen: über den Fortschritt und über eine
   * Hypothesen-Version, die über den Durchlauf hinausgeht. Der zweite Weg fängt
   * die Zeile ab, bei der das `insert` der neuen Version durchlief und das
   * `update` des Fortschritts danach nicht.
   *
   * `hypothesisVersion > number` statt `> 1`: die alte Fassung war die
   * Sonderform für Durchlauf 1 und meldete jeden weiteren Durchlauf sofort als
   * abgeschlossen — sieben Tage Journal liefen ins Leere (KAN-20).
   */
  isComplete: boolean;
  /**
   * Ist Schritt 1 vorbei — steht der Kompass also fest?
   *
   * **Nicht dasselbe wie `isComplete`,** auch wenn beide im ersten Durchlauf
   * zusammenfallen. „Dieser Durchlauf ist vorbei" wird mit jedem neuen
   * Durchlauf wieder falsch; „die Hypothese ist festgelegt" bleibt wahr. Wer
   * hier `isComplete` einsetzt, öffnet Schritt 1 im zweiten Durchlauf erneut —
   * und dann schreibt er wieder auf Version 1, also in eine Zeile, die niemand
   * mehr anzeigt (KAN-19).
   *
   * Schritt 1 gehört ausschließlich zum ersten Durchlauf: `nextCycle` beginnt
   * bei Schritt 2, der Kompass des neuen Durchlaufs ist das Ergebnis der
   * Anpassung des vorigen.
   */
  hypothesisLocked: boolean;
  /**
   * Welche der drei Ansichten Schritt 1 zeigt.
   *
   * „Gesperrt" allein reicht der Seite nicht, seit ein neuer Durchlauf hier
   * **beginnt** statt beim Journal: `hypothesisLocked` ist ab Durchlauf 2 wahr,
   * und mit nur einer gesperrten Ansicht begrüßte die App den frisch
   * gestarteten Durchlauf mit dem Satz „Dieser Durchlauf ist abgeschlossen".
   * Gesperrt und vorbei sind zwei verschiedene Aussagen (KAN-22).
   */
  stage: HypothesisStage;
};

/** Die drei Tatsachen, aus denen der Rest folgt. */
type CycleFacts = Pick<Cycle, "number" | "status" | "hypothesisVersion">;

/**
 * Die eine Stelle, an der die drei abgeleiteten Wahrheiten entstehen — und die
 * einzige, an der `version` und Durchlauf-Nummer nebeneinanderstehen.
 *
 * Die Reihenfolge in `stage` ist die Regel: „abgeschlossen" schlägt „läuft
 * noch", nicht umgekehrt.
 */
function derive(facts: CycleFacts): Cycle {
  // Ohne Hypothesen-Zeile gilt Version 1 — dieselbe Annahme, die alle vier
  // Aufrufstellen vorher einzeln per `?? 1` trafen.
  const version = facts.hypothesisVersion ?? 1;

  const isComplete = facts.status === "completed" || version > facts.number;
  const hypothesisLocked =
    facts.status === "completed" || version > 1 || facts.number > 1;

  return {
    ...facts,
    isComplete,
    hypothesisLocked,
    stage: !hypothesisLocked ? "select" : isComplete ? "archive" : "current",
  };
}

/** Genau die zwei Spalten der Fortschritts-Zeile, die einen Durchlauf belegen. */
type CycleProgress = Pick<
  NonNullable<ProgressRow>,
  "status" | "cycle_number"
>;

/** Genau die eine Spalte der Hypothesen-Zeile, die einen Durchlauf belegt. */
type CycleHypothesis = Pick<Tables<"values_hypothesis">, "version">;

/**
 * Der **laufende** Durchlauf, aus den zwei Zeilen, die ihn belegen.
 *
 * Beide dürfen fehlen: wer noch nicht angefangen hat, steht in Durchlauf 1 ohne
 * Status und ohne Hypothese. Strukturell getypt statt auf die ganzen Zeilen,
 * damit die Signatur zeigt, welche drei Spalten gelesen werden (Vorbild:
 * `latestPerSlug`).
 */
export function cycleFrom(
  progress: CycleProgress | null,
  hypothesis: CycleHypothesis | null,
): Cycle {
  return derive({
    number: progress?.cycle_number ?? 1,
    status: progress?.status ?? null,
    hypothesisVersion: hypothesis?.version ?? null,
  });
}

/**
 * Der Durchlauf **eines Eintrags** — nicht zwingend der laufende.
 *
 * Die Analyse-Route wertet den Durchlauf aus, der auf der `value_eval`-Zeile
 * steht; wer den Rückblick eines älteren Durchlaufs erneut auswertet, soll
 * dessen sieben Tage bekommen, nicht die des laufenden.
 *
 * **Bekannt ist hier nur die Nummer.** Status und Hypothesen-Version sind
 * ungelesen, also `null` — daraus folgt „nicht nachweislich abgeschlossen".
 * Das ist keine Behauptung über den Durchlauf, sondern über das, was ohne
 * Fortschritts-Zeile gilt. Der einzige Aufrufer liest ohnehin nur `.number`;
 * wer mehr braucht, nimmt `readCycle` oder `cycleFrom`.
 */
export function cycleOfEntry(
  entry: Pick<Tables<"journal_entries">, "cycle_number">,
): Cycle {
  return derive({
    number: entry.cycle_number,
    status: null,
    hypothesisVersion: null,
  });
}

/**
 * Der eine Wortlaut für „Schritt 1 ist für diesen Durchlauf vorbei".
 *
 * Steht hier statt in `actions.ts`, weil eine `"use server"`-Datei nur async
 * Funktionen exportieren darf — und weil er ohnehin die nach außen gedrehte
 * Seite von `hypothesisLocked` ist.
 */
export const HYPOTHESIS_LOCKED =
  "Dein Kompass steht schon — für diesen Durchlauf lässt sich die Hypothese nicht mehr ändern.";

// ─── Auswertung (Schritt 3) ──────────────────────────────────────────

/** Die drei Bühnen der Auswertung. */
export type EvaluationPhase = "reflection" | "adjust" | "complete";

/**
 * Die Bühne, die der Nutzer beim Öffnen der Auswertung sehen soll.
 *
 * `hasEvalEntry` heißt: es liegt eine `value_eval`-Zeile **dieses** Durchlaufs
 * vor, also eine gespeicherte Reflexion.
 *
 * Dass `isComplete` zuerst geprüft wird, ist die Regel: sonst stünde der Nutzer
 * wieder in der Anpassungs-Bühne vor Werten, die er schon angepasst hat.
 */
export function evaluationPhase(
  cycle: Cycle,
  hasEvalEntry: boolean,
): EvaluationPhase {
  if (cycle.isComplete) return "complete";
  return hasEvalEntry ? "adjust" : "reflection";
}

// ─── Sternenkarte ────────────────────────────────────────────────────

/** Der letzte Stern (Auswertung). Es gibt 9 Etappen: 0 = Hypothese, 1–7, 8. */
export const JOURNEY_LAST_INDEX = 8;

/** Was die Karte über den Durchlauf hinaus braucht. */
export type JourneyDays = {
  /** `entry_date` der `daily_value`-Einträge **dieses** Durchlaufs. Dubletten
   *  und Reihenfolge sind egal; gezählt werden eindeutige Tage. */
  entryDates: string[];
  /** Heutiger Datums-Schlüssel in Server-Zeitzone (`serverTodayKey()`). */
  today: string;
};

export type JourneySteps = {
  /** Indizes der erledigten Etappen, aufsteigend und lückenlos ab 0. */
  completed: number[];
  /** Die Etappe, auf der das Maskottchen steht. */
  currentStep: number;
};

/**
 * Welche Sterne der Werte-Reise leuchten.
 *
 * Die Übersicht war die letzte Fläche, die den Durchlauf nicht kannte: sie
 * zählte *alle* `daily_value`-Einträge und meldete im zweiten Durchlauf die
 * sieben Tage des ersten als erledigt. Journal und Auswertung lasen daneben
 * schon zyklus-scharf — jeder Klick auf einen „erledigten" Tag landete deshalb
 * auf dem leeren Formular von Tag 1, und die Auswertung leitete dorthin um
 * (KAN-21). Nicht die Reise war kaputt, nur ihre Karte.
 *
 * Deshalb rechnet die Karte aus **demselben** Wert wie die Auswertung: an
 * beiden Stellen entscheidet `cycle.isComplete`, ob ein Durchlauf vorbei ist.
 */
export function journeySteps(
  cycle: Cycle,
  { entryDates, today }: JourneyDays,
): JourneySteps {
  const completed = new Set<number>();

  // 0 — Hypothese. Ab dem zweiten Durchlauf gilt sie ohne Rückfrage an die
  // Tabelle als erledigt: Schritt 1 gehört ausschließlich zum ersten Durchlauf
  // (`nextCycle` beginnt bei Schritt 2, der Kompass des neuen Durchlaufs ist
  // das Ergebnis der Anpassung des vorigen). Fragte man hier nach einer Zeile
  // mit `version >= number`, stünde ein Durchlauf, der ohne Anpassung
  // gestartet wurde, vor einem gesperrten Stern 0 und einem gesperrten Rest —
  // eine Sackgasse ohne Ausweg.
  //
  // `hypothesisVersion !== null` statt einer eigenen `hasHypothesisRow`-Angabe:
  // ohne Zeile stünde dort sonst die 1, und die sagt nichts.
  if (cycle.number > 1 || cycle.hypothesisVersion !== null) completed.add(0);

  // 1–7 — je eindeutigem Reflexionstag dieses Durchlaufs.
  const days = new Set(entryDates);
  const dailyCount = Math.min(days.size, 7);
  for (let i = 1; i <= dailyCount; i++) completed.add(i);

  // Durchlauf abgeschlossen → alles erledigt. Dieselbe Frage, die auch die
  // Auswertungs-Bühne stellt; zwei Antworten darauf waren schon einmal der Bug.
  if (cycle.isComplete) {
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

// ─── Der nächste Durchlauf ───────────────────────────────────────────

/**
 * Die Fortschritts-Zeile eines neuen Durchlaufs, ohne `user_id`/`recipe_slug`.
 *
 * Bewusst nicht `ProgressWrite`: `startNewCycleAction` legt IMMER eine neue
 * Zeile an — genau das ist ein neuer Durchlauf — und geht darum an
 * `writeProgress` vorbei, das die bestehende updaten würde. Ein Insert braucht
 * seine vier Felder vollständig, kein optionaler Patch.
 */
export type NewCycleRow = {
  cycle_number: number;
  current_step: number;
  status: CycleStatus;
  started_at: string;
};

/**
 * Was für den nächsten Durchlauf zu schreiben ist — nach dem Vorbild von
 * `nextWantsProgress`.
 *
 * Drei Regeln stehen hier, und keine davon war bisher geprüft:
 *
 * 1. Die Nummer geht um genau eins hoch.
 * 2. Der neue Durchlauf läuft (`in_progress`), auch wenn der vorige
 *    abgeschlossen war.
 * 3. Er beginnt bei **Schritt 2, dem Kompass** — nicht bei 1. Der neue
 *    Durchlauf testet den Kompass, der aus der Anpassung des vorigen entstanden
 *    ist; wer direkt in Tag 1 landet, hat ihn nie zu sehen bekommen (KAN-22).
 *    Ändern lässt er sich dort nicht, `hypothesisLocked` ist ab Durchlauf 2
 *    wahr (KAN-19).
 */
export function nextCycle(cycle: Cycle, now: string): NewCycleRow {
  return {
    cycle_number: cycle.number + 1,
    current_step: 2,
    status: "in_progress",
    started_at: now,
  };
}

// ─── Lesen (braucht Supabase, darum ohne Test) ───────────────────────

/**
 * Der laufende Durchlauf, aus der Datenbank.
 *
 * Ersetzt die zwei Reader derselben Zeile, die vorher nebeneinanderstanden
 * (`readCycleStand` + `readCycleNumber`), und sitzt auf `readProgress` auf —
 * dort steckt das `order("cycle_number").limit(1)`, ohne das „irgendeine Zeile"
 * der falsche Durchlauf wäre (KAN-24).
 *
 * Nimmt nur `ActionContext`, ist also auch aus Server-Komponenten aufrufbar,
 * die am Actions-Layer vorbeilesen.
 */
export async function readCycle(ctx: ActionContext): Promise<Cycle> {
  const { supabase, user } = ctx;

  const [progress, { data: hypothesis }] = await Promise.all([
    readProgress(ctx, RECIPE_SLUG),
    supabase
      .from("values_hypothesis")
      .select("version")
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return cycleFrom(progress, hypothesis);
}

/**
 * Der einzige Werte-Einstieg auf `journal_entries` — schon gefiltert auf User,
 * Vorlage und **diesen Durchlauf**.
 *
 * Damit steht `.eq("cycle_number", …)` genau einmal im Repo. Vorher war der
 * Filter die Pflicht jedes Aufrufers, und viermal hat sie jemand vergessen
 * (KAN-19 bis KAN-22).
 *
 * **`recipe_slug` setzt der Aufrufer selbst.** Nicht aus Nachlässigkeit: das
 * Tages-Gating in `saveJournalEntryAction` filtert bewusst ohne Slug, damit es
 * auch eine Alt-Zeile ohne passenden Slug findet und nicht daneben eine zweite
 * für denselben Tag anlegt (s. `lib/utils/journal-recipe-slug.ts`). Ein hier
 * eingebauter Slug-Filter würde diese Regel still brechen.
 *
 * Der Rückgabetyp bleibt der von Supabase — die Spaltenliste wird
 * durchgereicht, nicht verschluckt, damit `readJournalContent` weiterhin die
 * Diskriminante sieht.
 */
export function cycleJournal<Columns extends string>(
  { supabase, user }: ActionContext,
  cycle: Cycle,
  template: ValuesTemplate,
  columns: Columns,
  options?: { count?: "exact"; head?: boolean },
) {
  return supabase
    .from("journal_entries")
    .select(columns, options)
    .eq("user_id", user.id)
    .eq("template_type", template)
    .eq("cycle_number", cycle.number);
}
