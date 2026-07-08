"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SectionLabel } from "@/components/ui/section-label";
import { Card, CardContent } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { DraftRestoreBanner } from "@/components/offline/draft-restore-banner";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { RecipeIntro } from "@/components/recipes/recipe-intro";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { ReframeAnimation } from "@/components/auth/reframe-animation";
import { CompletionCelebration } from "@/components/ui/completion-celebration";
import {
  OverthinkingCompanion,
  OverthinkingPeekCompanion,
} from "@/components/recipes/overthinking-companion";
import { OverthinkingIntroMascot } from "@/components/recipes/overthinking-intro-mascot";
import type { MascotExpression } from "@/components/brand/mascot";
import { Reveal } from "@/components/ui/reveal";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { PAGE_TITLES } from "@/lib/content/labels";
import { useFormDraft } from "@/lib/hooks/use-form-draft";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";

import { markRecipeIntroSeenAction } from "@/app/(app)/recipes/actions";
import { saveOverthinkingAction } from "./actions";

const INTRO_CARDS = getRecipeIntro("overthinking") ?? [];

// ─── Types ────────────────────────────────────────────────────────────

type Answers = {
  step2: string;
  step3: string;
  step4: string;
  step5: string;
  whatIfWrong: string;
  reframedProblem: string;
  decision: string;
};

const EMPTY_ANSWERS: Answers = {
  step2: "",
  step3: "",
  step4: "",
  step5: "",
  whatIfWrong: "",
  reframedProblem: "",
  decision: "",
};

const TOTAL_STEPS = 8;

// Fixe Einleitung vor der KI-Challenger-Frage in Schritt 6 (Perspektivwechsel).
const CHALLENGE_INTRO =
  "Verstehe … Ich möchte dich gerne challengen: Gibt es eine Perspektive, die du noch nicht betrachtet hast?";

// ─── Step Labels ──────────────────────────────────────────────────────

const STEP_HEADERS = [
  "",
  "Atme durch.",
  "Kommen wir zur Sache.",
  "Geh noch tiefer.",
  "Noch eine Ebene tiefer.",
  "Die tiefste Ebene.",
  "Perspektivwechsel.",
  "Reframing.",
  "Dein nächster Schritt.",
];

// ─── Progress Dots ────────────────────────────────────────────────────

function ProgressDots({ current, completed }: { current: number; completed: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2" role="group" aria-label="Fortschritt">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = completed || step < current;
        return (
          <div
            key={step}
            className={`size-2.5 rounded-full transition-all duration-500 ${
              isDone
                ? "bg-primary"
                : isActive
                  ? "bg-primary/70 ring-2 ring-primary/30"
                  : "bg-muted-foreground/20"
            }`}
            aria-label={`Schritt ${step}${isDone ? " – erledigt" : isActive ? " – aktuell" : ""}`}
          />
        );
      })}
    </div>
  );
}

// ─── Ladder display (steps 2-5) ───────────────────────────────────────

function Ladder({ ancestors }: { ancestors: { label: string; value: string }[] }) {
  if (ancestors.length === 0) return null;

  return (
    <div className="w-full space-y-1.5">
      {ancestors.map((a, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
          <span className="mt-0.5 shrink-0 text-primary/60">
            {i === 0 ? "●" : "↳"}
          </span>
          <span className="italic line-clamp-1">
            {a.label}: {a.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Countdown SVG ────────────────────────────────────────────────────

function CountdownCircle({
  duration,
  onComplete,
}: {
  duration: number;
  onComplete: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const animate = useCallback(
    // Benannter Funktionsausdruck: der rekursive rAF-Aufruf bindet an den
    // Funktionsnamen selbst statt an die (zur Initialisierungszeit noch nicht
    // deklarierte) äußere const.
    function animateFrame(timestamp: number) {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = (timestamp - startRef.current) / 1000;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);

      if (p < 1) {
        rafRef.current = requestAnimationFrame(animateFrame);
      } else if (!doneRef.current) {
        doneRef.current = true;
        onComplete();
      }
    },
    [duration, onComplete],
  );

  useEffect(() => {
    if (!started) return;
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [started, animate]);

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const remaining = Math.ceil(duration * (1 - progress));

  return (
    <button
      type="button"
      onClick={() => setStarted(true)}
      disabled={started}
      aria-label={started ? "Countdown läuft" : "Countdown starten"}
      className="relative flex items-center justify-center rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 enabled:cursor-pointer enabled:hover:scale-[1.03] enabled:active:scale-95"
    >
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted-foreground/15"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <span className="absolute font-bold tabular-nums text-primary">
        {!started ? (
          <span className="text-xl font-semibold">Start</span>
        ) : progress >= 1 ? (
          <span className="text-xl font-semibold">Stopp!</span>
        ) : (
          <span className="text-3xl">{remaining}</span>
        )}
      </span>
    </button>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────

export function OverthinkingWizard({ introSeen }: { introSeen: boolean }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [countdownDone, setCountdownDone] = useState(false);
  // KI-formulierte "Warum?"-Fragen für Schritte 3–5 (statischer Fallback: getStepLabel).
  const [generatedQuestions, setGeneratedQuestions] = useState<Record<number, string>>({});
  const [questionLoading, setQuestionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bei jedem Schritt- und beim Wechsel auf den Abschluss-Screen nach oben.
  useScrollTopOnChange(saved ? "complete" : step);

  // Hybrid-Intro (Schritt 6.10)
  const [introDismissed, setIntroDismissed] = useState(false);

  // Laufende Nummer der KI-Frage-Requests: Bei überlappenden Fetches (schnelles
  // Weiterklicken durch Schritte 3–6) darf nur der NEUESTE Request den
  // Ladezustand beenden — sonst räumt das finally des älteren den Schimmer weg,
  // während der neuere noch läuft (Fallback-Frage blitzt auf, KI-Frage ploppt nach).
  const questionRequestRef = useRef(0);

  // Offline draft safety net
  const { pendingDraft, saveDraft, clearDraft, dismissPendingDraft } =
    useFormDraft<Answers>("overthinking");

  const restoreDraft = () => {
    if (pendingDraft) {
      setAnswers({ ...EMPTY_ANSWERS, ...pendingDraft });
      // Jump to the final step so the restored answers can be completed.
      setCountdownDone(true);
      setStep(TOTAL_STEPS);
    }
    dismissPendingDraft();
  };

  // ── Answer helpers ──────────────────────────────────────────────

  const updateAnswer = (key: keyof Answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const getStepAnswerKey = (s: number): keyof Answers | null => {
    switch (s) {
      case 2: return "step2";
      case 3: return "step3";
      case 4: return "step4";
      case 5: return "step5";
      default: return null;
    }
  };

  const getStepLabel = (s: number): string => {
    switch (s) {
      case 2: return "Was ist dein Problem (an der Oberfläche)?";
      case 3: return "Und warum ist das so?";
      case 4: return "Warum noch? Geh eine Ebene tiefer.";
      case 5: return "Und was steckt ganz unten dahinter?";
      default: return "";
    }
  };

  const getLadderAncestors = (s: number): { label: string; value: string }[] => {
    const items: { label: string; value: string }[] = [];
    if (answers.step2) items.push({ label: "Problem", value: answers.step2 });
    if (s >= 4 && answers.step3) items.push({ label: `Warum`, value: answers.step3 });
    if (s >= 5 && answers.step4) items.push({ label: `Warum`, value: answers.step4 });
    return items;
  };

  // ── Navigation ──────────────────────────────────────────────────

  const canGoNext = (): boolean => {
    if (step === 1) return countdownDone;
    // Während die KI-Frage für diesen Schritt noch lädt, kein Weiter
    // (verhindert u. a. das Überspringen des Schimmers in Schritt 6).
    if (questionLoading && step >= 3 && step <= 6 && !generatedQuestions[step]) {
      return false;
    }
    const key = getStepAnswerKey(step);
    return key ? answers[key].trim().length > 0 : true;
  };

  // Lässt die KI die maßgeschneiderte Frage für einen Schritt formulieren:
  // Schritte 3–5 → nächste, tiefere "Warum?"-Frage; Schritt 6 → positive
  // Challenger-Frage. Fehler/Offline werden still verschluckt — dann greift der
  // statische Fallback in renderStepContent.
  const generateForStep = async (target: number) => {
    const problem = answers.step2.trim();
    if (!problem) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const isChallenger = target === 6;
    const whyChain: string[] = [];
    if (isChallenger) {
      // Challenger nutzt den vollständigen Warum-Verlauf.
      if (answers.step3.trim()) whyChain.push(answers.step3.trim());
      if (answers.step4.trim()) whyChain.push(answers.step4.trim());
      if (answers.step5.trim()) whyChain.push(answers.step5.trim());
    } else {
      if (target >= 4 && answers.step3.trim()) whyChain.push(answers.step3.trim());
      if (target >= 5 && answers.step4.trim()) whyChain.push(answers.step4.trim());
    }

    const requestId = ++questionRequestRef.current;
    setQuestionLoading(true);
    // Veraltete Frage für diesen Schritt verwerfen, damit der Schimmer greift.
    setGeneratedQuestions((prev) => {
      const next = { ...prev };
      delete next[target];
      return next;
    });

    try {
      const res = await fetch("/api/overthinking-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem,
          whyChain,
          mode: isChallenger ? "challenger" : "why",
        }),
      });
      const data = await res.json();
      if (res.ok && data.question) {
        // Pro Schritt gekeyt — auch eine "veraltete" Antwort landet beim
        // richtigen target und ist damit harmlos.
        setGeneratedQuestions((prev) => ({ ...prev, [target]: data.question }));
      }
    } catch {
      // Stiller Fallback auf die statische Frage.
    } finally {
      if (requestId === questionRequestRef.current) {
        setQuestionLoading(false);
      }
    }
  };

  const goNext = () => {
    if (!canGoNext()) return;
    setError(null);
    if (step < TOTAL_STEPS) {
      const target = step + 1;
      // Schritte 3–5: "Warum?"-Leiter; Schritt 6: Challenger-Frage.
      if (target >= 3 && target <= 6) {
        void generateForStep(target);
      }
      setStep(target);
    }
  };

  const goBack = () => {
    setError(null);
    if (step > 1) setStep((s) => s - 1);
  };

  // ── Submit ──────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!answers.decision.trim()) {
      setError("Magst du deinen nächsten Schritt kurz notieren, bevor es weitergeht?");
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("problem", answers.step2);
    formData.set("why_levels", JSON.stringify([answers.step3, answers.step4, answers.step5]));
    // Die in Schritt 6 angezeigte KI-Frage wandert mit ins Journal; nach
    // Draft-Restore oder KI-Ausfall ggf. leer — dann ohne diese Sektion.
    formData.set("challenger_question", generatedQuestions[6] ?? "");
    formData.set("what_if_wrong", answers.whatIfWrong);
    formData.set("reframed_problem", answers.reframedProblem);
    formData.set("decision", answers.decision);

    // No connection — keep the entry as a local draft instead of losing it.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveDraft(answers);
      setSubmitting(false);
      setError(
        "Du bist offline – dein Eintrag wurde als Entwurf gesichert. Sobald du wieder online bist, kannst du ihn abschließen.",
      );
      return;
    }

    try {
      const result = await saveOverthinkingAction({ error: null, success: false }, formData);

      setSubmitting(false);

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        clearDraft();
        setSaved(true);
      }
    } catch {
      // Network error mid-request — preserve the entry as a draft.
      saveDraft(answers);
      setSubmitting(false);
      setError(
        "Speichern fehlgeschlagen – dein Eintrag wurde als Entwurf gesichert. Versuch es später noch einmal.",
      );
    }
  };

  // ── Render: Step content ────────────────────────────────────────

  function getCompanionExpression(): MascotExpression {
    if (step === 7) return "happy";
    return "smile";
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        // Volle Spaltenhöhe: der Intro-Text zentriert sich im freien Raum
        // zwischen Header und Countdown-Block; der Block selbst sitzt unten
        // nah am "Weiter"-Button.
        return (
          <div className="flex w-full flex-1 flex-col items-center self-stretch text-center">
            <div className="flex flex-1 items-center">
              <p className="text-base leading-relaxed text-muted-foreground">
                Dein Kopf dreht gerade Runden? Man kennt&apos;s – lass uns
                gemeinsam aus dem Gedankenkarussell aussteigen!
              </p>
            </div>

            <div className="flex flex-col items-center gap-8">
              <p className="text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
                Zähle von 5 runter und sage dann laut{" "}
                <span className="font-bold text-primary">Stopp</span>.
              </p>

              <CountdownCircle duration={5} onComplete={() => setCountdownDone(true)} />

              {countdownDone && (
                <p className="text-base text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">
                  Gut gemacht. Der Gedankenkarussell ist kurz gestoppt — nutzen wir diesen Moment.
                </p>
              )}
            </div>
          </div>
        );

      case 2:
      case 3:
      case 4:
      case 5: {
        const ancestors = getLadderAncestors(step);
        // Schritt 2 bleibt statisch; ab Schritt 3 die KI-Frage (Fallback: statisch).
        const label = step >= 3 ? generatedQuestions[step] ?? getStepLabel(step) : getStepLabel(step);
        const key = getStepAnswerKey(step)!;
        // Während die KI-Frage noch lädt, einen Schimmer statt Frage + Textfeld zeigen.
        const showQuestionLoading = step >= 3 && questionLoading && !generatedQuestions[step];

        return (
          <div className="flex w-full flex-col gap-5">
            {/* Ladder of previous answers */}
            {ancestors.length > 0 && (
              <Card size="sm" className="border-muted">
                <CardContent className="pt-(--card-spacing)">
                  <Ladder ancestors={ancestors} />
                </CardContent>
              </Card>
            )}

            {showQuestionLoading ? (
              <div className="space-y-3" aria-busy="true">
                <div className="space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Ich überlege, wie ich am besten weiterfrage …
                </p>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Label htmlFor={`step-${step}`} className="text-base font-medium leading-relaxed">
                  {label}
                </Label>
                <Textarea
                  id={`step-${step}`}
                  value={answers[key]}
                  onChange={(e) => updateAnswer(key, e.target.value)}
                  placeholder={
                    step === 2
                      ? "Was beschäftigt dich? Was geht dir immer wieder durch den Kopf?"
                      : "Schreib, was dir in den Sinn kommt – ganz ohne Bewertung."
                  }
                  rows={4}
                  className="min-h-[120px] resize-y"
                />
                {answers[key].length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nur ein paar Stichwörter reichen. Es muss kein perfekter Satz sein.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      }

      case 6: {
        // Schritt 6 – Perspektivwechsel: fixe Einleitung + KI-Challenger-Frage.
        const showChallengerLoading = questionLoading && !generatedQuestions[6];
        const challenger = generatedQuestions[6];

        if (showChallengerLoading) {
          return (
            <div className="flex w-full flex-col gap-3" aria-busy="true">
              <div className="space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              </div>
              <p className="text-sm text-muted-foreground">
                Einen Moment – ich denke über eine andere Perspektive nach …
              </p>
            </div>
          );
        }

        return (
          <div className="flex w-full flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-2">
              <Label htmlFor="what-if-wrong" className="text-base font-medium leading-relaxed">
                {CHALLENGE_INTRO}
                {challenger && (
                  <span className="mt-1 block font-semibold text-primary">{challenger}</span>
                )}
              </Label>
              <Textarea
                id="what-if-wrong"
                value={answers.whatIfWrong}
                onChange={(e) => updateAnswer("whatIfWrong", e.target.value)}
                placeholder="Schreib, was dir dazu in den Sinn kommt – ganz ohne Bewertung."
                rows={4}
                className="min-h-[120px] resize-y"
              />
            </div>
          </div>
        );
      }

      case 7:
        // Schritt 7 – Reframing: Antwort aus Schritt 6 als Kontext, dann die
        // Reframing-Frage mit dem ursprünglichen Problem darunter.
        return (
          <div className="flex w-full flex-col gap-5">
            {/* Antwort aus Schritt 6 */}
            {answers.whatIfWrong.trim() && (
              <Card size="sm" className="border-muted">
                <CardContent className="space-y-1 pt-(--card-spacing)">
                  <SectionLabel>Deine Antwort von eben</SectionLabel>
                  <p className="text-sm italic text-muted-foreground">
                    {answers.whatIfWrong}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <Label htmlFor="reframed-problem" className="text-base font-medium leading-relaxed">
                Was würde diese Perspektive für dein Problem bedeuten?
              </Label>

              {/* Ursprüngliches Problem */}
              <div className="rounded-md border border-muted bg-muted/30 px-3 py-2">
                <SectionLabel>Dein ursprüngliches Problem</SectionLabel>
                <p className="text-sm italic text-muted-foreground">
                  {answers.step2 || "—"}
                </p>
              </div>

              <Textarea
                id="reframed-problem"
                value={answers.reframedProblem}
                onChange={(e) => updateAnswer("reframedProblem", e.target.value)}
                placeholder="Wie würde sich dein Problem auflösen oder verkleinern?"
                rows={4}
                className="min-h-[120px] resize-y"
              />
            </div>
          </div>
        );

      case 8:
        // Schritt 8 – Dein nächster Schritt.
        return (
          <div className="flex w-full flex-col gap-2">
            <Label htmlFor="decision" className="text-base font-medium leading-relaxed">
              Dein nächster Schritt
            </Label>
            <Textarea
              id="decision"
              value={answers.decision}
              onChange={(e) => updateAnswer("decision", e.target.value)}
              placeholder="Was ist dein nächster Schritt – auch wenn er klein ist?"
              rows={4}
              className="min-h-[120px] resize-y"
              required
            />
          </div>
        );

      default:
        return null;
    }
  };

  // ── Render: Intro-Sequenz (erster Besuch) ───────────────────────

  const handleIntroSeen = () => {
    setIntroDismissed(true);
    void markRecipeIntroSeenAction("overthinking");
  };

  if (!introSeen && !introDismissed && INTRO_CARDS.length > 0) {
    return (
      <div className="flex min-h-svh flex-col">
        <SubPageHeader backHref="/booster" title="Overthinking" />
        <div className="flex flex-1 flex-col justify-center">
          <RecipeIntro
            cards={INTRO_CARDS}
            onComplete={handleIntroSeen}
            onSkip={handleIntroSeen}
            renderMascot={(index) => <OverthinkingIntroMascot index={index} />}
          />
        </div>
      </div>
    );
  }

  // ── Render: Completion screen ───────────────────────────────────

  if (saved) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center px-4 py-6 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-6">
          {/* Icon mit ruhigem Feier-Moment */}
          <CompletionCelebration />

          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Geschafft.
          </h1>

          <p className="text-muted-foreground">
            Du hast den Gedankenkarussell durchbrochen und einen klaren nächsten Schritt
            festgelegt. Das war mutig – nimm diesen Moment mit.
          </p>

          {/* Reframe als ruhiger Schlusspunkt — erscheint nach dem Icon */}
          <Reveal delay={0.4} className="w-full">
            <ReframeAnimation
              size="compact"
              align="center"
              pairs={[
                {
                  critic: "Ich muss erst alles zu Ende denken",
                  reframe: "Ich darf entscheiden und loslassen",
                },
              ]}
            />
          </Reveal>

          {/* Decision highlight */}
          {answers.decision && (
            <Card className="w-full border-primary/30">
              <CardContent className="space-y-2 pt-(--card-spacing)">
                <SectionLabel>Dein nächster Schritt</SectionLabel>
                <p className="whitespace-pre-wrap text-left text-base leading-relaxed text-foreground">
                  {answers.decision}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex w-full flex-col gap-3 pt-4">
            <Button className="w-full" size="lg" render={<Link href="/booster" />}>
              Zurück zur {PAGE_TITLES.booster}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => {
                setStep(1);
                setAnswers(EMPTY_ANSWERS);
                setCountdownDone(false);
                setGeneratedQuestions({});
                setQuestionLoading(false);
                setSaved(false);
                setError(null);
              }}
            >
              Erneut durchführen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Wizard ──────────────────────────────────────────────

  return (
    <div className="relative flex min-h-svh flex-col overflow-x-clip">
      <SubPageHeader
        backHref="/booster"
        title="Overthinking"
        action={
          INTRO_CARDS.length > 0 ? (
            <IntroInfoButton cards={INTRO_CARDS} />
          ) : undefined
        }
      />
      <div className="flex flex-1 flex-col px-4 py-6">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          {/* Progress dots */}
        <ProgressDots current={step} completed={false} />

        {/* Draft restore prompt */}
        {pendingDraft && (
          <div className="mt-4">
            <DraftRestoreBanner onRestore={restoreDraft} onDiscard={clearDraft} />
          </div>
        )}

        {/* Step header */}
        <div>
          <p className="mt-4 text-center text-xs font-medium text-muted-foreground">
            Schritt {step} von {TOTAL_STEPS}
          </p>
          {STEP_HEADERS[step] && (
            <h2 className="mt-1 text-center font-heading text-lg font-semibold text-foreground">
              {STEP_HEADERS[step]}
            </h2>
          )}
        </div>

        {/* Error banner */}
        <FormError message={error} className="mt-4" />

        {/* Begleiter je Schritt-Phase:
            – Schritt 1: keiner (lenkt vom Countdown ab)
            – Schritt 2-5: Eck-Peek mit Notizblock rechts oben im Inhaltsbereich (s. u.)
            – Schritt 6-8: zentrierter Top-Begleiter, größer + mit Luft nach oben */}
        {step >= 6 && (
          <div className="mt-6">
            <OverthinkingCompanion expression={getCompanionExpression()} size="md" />
          </div>
        )}

        {/* Step content — in Schritten 2–5 lugt der Eck-Begleiter rechts oben in
            den freien Raum zwischen Überschrift und der vertikal zentrierten
            Frage/Textbox, ohne etwas zu verdecken. */}
        <div className="relative mt-8 flex flex-1 flex-col">
          {step >= 2 && step <= 5 && (
            <OverthinkingPeekCompanion className="pointer-events-none absolute right-0 top-0 z-10 -mr-7" />
          )}
          <div
            key={step}
            className="flex flex-1 flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out"
          >
            {renderStepContent()}
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-8">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={goBack}
              className="gap-1"
            >
              <ChevronLeft className="size-4" />
              Zurück
            </Button>
          )}

          {step < TOTAL_STEPS ? (
            <Button onClick={goNext} disabled={!canGoNext()} className="ml-auto gap-1">
              Weiter
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="ml-auto gap-1">
              {submitting ? "Wird gespeichert …" : "Abschließen"}
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
