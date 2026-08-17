/**
 * Die Bühnenfolge der Overthinking-Übung.
 *
 * Vorher mischte `canGoNext()` eine fachliche Gültigkeitsregel („Antwort nicht
 * leer") mit einem Netzwerk-Ladezustand, und `goNext()` stieß als
 * **Nebenwirkung der Navigation** einen Fetch an. „Weiter" und „Frage laden"
 * waren damit nicht mehr getrennt prüfbar.
 *
 * Hier steht nur die Gültigkeit — und nach demselben Muster wie der
 * KI-Schritt: **das Modul gibt die nächste Bühne zurück, die Komponente ruft
 * `setStep`.** Ob gerade eine KI-Frage unterwegs ist, ist Sache der Bühne, die
 * sie braucht; `isQuestionPending` beantwortet das getrennt und speist damit
 * sowohl den Schimmer als auch das deaktivierte „Weiter".
 *
 * Zum Vokabular: CONTEXT.md sagt für eine Bühne im Code `phase`. Diese Übung
 * zählt ihre Bühnen aber durch und zeigt die Nummer auch her („Schritt 3 von
 * 8"), deshalb heißt der Bezeichner hier bewusst weiter `step` — die Prosa
 * bleibt „Bühne". Der KI-Schritt (`lib/recipes/ai-step.ts`) hat benannte
 * Bühnen und sagt dort korrekt `phase`.
 */

export const TOTAL_STEPS = 8;

/** Die Antworten der Übung, je Bühne eine. */
export type Answers = {
  step2: string;
  step3: string;
  step4: string;
  step5: string;
  whatIfWrong: string;
  reframedProblem: string;
  decision: string;
};

export const EMPTY_ANSWERS: Answers = {
  step2: "",
  step3: "",
  step4: "",
  step5: "",
  whatIfWrong: "",
  reframedProblem: "",
  decision: "",
};

/**
 * Die KI-Fragen der Bühnen 3–6. Drei Zustände, bewusst ohne zweites Feld:
 *
 * - Schlüssel fehlt → die Bühne wartet noch auf ihre Frage,
 * - `null` → es kam keine (offline, Ausfall) → die Bühne nimmt die statische,
 * - Text → die Frage der KI.
 */
export type StepQuestions = Record<number, string | null | undefined>;

/**
 * Welche Antwort eine Bühne füllt — `null`, wenn sie keine Pflichtantwort hat.
 * Bühne 8 (der nächste Schritt) hängt bewusst nicht hier drin: sie wird beim
 * Abschließen geprüft, nicht beim Weitergehen.
 */
export function answerKeyForStep(step: number): keyof Answers | null {
  switch (step) {
    case 2:
      return "step2";
    case 3:
      return "step3";
    case 4:
      return "step4";
    case 5:
      return "step5";
    default:
      return null;
  }
}

/** Die Bühnen, für die die KI eine Frage formuliert: 3–5 „Warum?", 6 Challenger. */
export function needsGeneratedQuestion(step: number): boolean {
  return step >= 3 && step <= 6;
}

/**
 * Wartet diese Bühne noch auf ihre KI-Frage?
 *
 * Getrennt von der Gültigkeit — das ist der ganze Punkt. Der Aufrufer nutzt es
 * für den Schimmer *und* dafür, „Weiter" so lange zu sperren; die Frage, ob
 * die Bühne inhaltlich fertig ist, beantwortet `nextStep`.
 */
export function isQuestionPending(questions: StepQuestions, step: number): boolean {
  return needsGeneratedQuestion(step) && questions[step] === undefined;
}

/**
 * Ist diese Bühne inhaltlich beantwortet? Rein fachlich — kein Netz, keine
 * Ladezustände.
 */
export function isStepAnswered(
  step: number,
  answers: Answers,
  countdownDone: boolean,
): boolean {
  if (step === 1) return countdownDone;
  const key = answerKeyForStep(step);
  return key === null ? true : answers[key].trim().length > 0;
}

/**
 * Die nächste Bühne — oder `null`, wenn diese hier noch nicht so weit ist oder
 * es keine nächste mehr gibt.
 */
export function nextStep(
  step: number,
  answers: Answers,
  countdownDone: boolean,
): number | null {
  if (!isStepAnswered(step, answers, countdownDone)) return null;
  if (step >= TOTAL_STEPS) return null;
  return step + 1;
}

/**
 * Eine geänderte Antwort macht die KI-Fragen darunter ungültig — sie sind aus
 * dem alten Warum-Verlauf gebaut. Die betroffenen Bühnen holen sich beim
 * nächsten Besuch eine neue.
 *
 * Gibt dasselbe Objekt zurück, wenn nichts zu verwerfen ist: so löst Tippen
 * keinen Render aus, den es nicht braucht.
 */
export function dropQuestionsFrom(
  questions: StepQuestions,
  from: number,
): StepQuestions {
  const stale = Object.keys(questions)
    .map(Number)
    .filter((step) => step >= from);
  if (stale.length === 0) return questions;

  const next = { ...questions };
  for (const step of stale) delete next[step];
  return next;
}
