"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { DraftRestoreBanner } from "@/components/offline/draft-restore-banner";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { RecipeIntro } from "@/components/recipes/recipe-intro";
import { RecipeIntroCollapsible } from "@/components/recipes/recipe-intro-collapsible";
import { ReframeAnimation } from "@/components/auth/reframe-animation";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { useFormDraft } from "@/lib/hooks/use-form-draft";

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
  whatItWouldMean: string;
  currentProblem: string;
  newProblem: string;
  decision: string;
};

const EMPTY_ANSWERS: Answers = {
  step2: "",
  step3: "",
  step4: "",
  step5: "",
  whatIfWrong: "",
  whatItWouldMean: "",
  currentProblem: "",
  newProblem: "",
  decision: "",
};

const TOTAL_STEPS = 6;

// ─── Step Labels ──────────────────────────────────────────────────────

const STEP_HEADERS = [
  "",
  "Stopp. Atme durch.",
  "Kommen wir zur Sache.",
  "Geh noch tiefer.",
  "Noch eine Ebene tiefer.",
  "Der letzte Schritt – die Wende.",
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
        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
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
  const [progress, setProgress] = useState(0); // 0..1
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const animate = useCallback(
    (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = (timestamp - startRef.current) / 1000;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);

      if (p < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else if (!doneRef.current) {
        doneRef.current = true;
        onComplete();
      }
    },
    [duration, onComplete],
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const remaining = Math.ceil(duration * (1 - progress));

  return (
    <div className="relative flex items-center justify-center">
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
      <span className="absolute text-3xl font-bold tabular-nums text-primary">
        {remaining}
      </span>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────

export function OverthinkingWizard({ introSeen }: { introSeen: boolean }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [countdownDone, setCountdownDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hybrid-Intro (Schritt 6.10)
  const [introDismissed, setIntroDismissed] = useState(false);

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
    const key = getStepAnswerKey(step);
    return key ? answers[key].trim().length > 0 : true;
  };

  const goNext = () => {
    if (!canGoNext()) return;
    setError(null);
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    setError(null);
    if (step > 1) setStep((s) => s - 1);
  };

  // ── Submit ──────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!answers.decision.trim()) {
      setError("Magst du deine Entscheidung kurz notieren, bevor es weitergeht?");
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("problem", answers.step2);
    formData.set("why_levels", JSON.stringify([answers.step3, answers.step4, answers.step5]));
    formData.set("what_if_wrong", answers.whatIfWrong);
    formData.set("what_it_would_mean", answers.whatItWouldMean);
    formData.set("current_problem", answers.currentProblem);
    formData.set("new_problem", answers.newProblem);
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

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col items-center gap-8 text-center">
            <p className="text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
              Sag laut <span className="font-bold text-primary">"Stop!"</span>{" "}
              oder zähl rückwärts von 5
            </p>

            <CountdownCircle duration={5} onComplete={() => setCountdownDone(true)} />

            {countdownDone && (
              <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">
                Gut gemacht. Der Gedankenkarussell ist kurz gestoppt — nutzen wir diesen Moment.
              </p>
            )}
          </div>
        );

      case 2:
      case 3:
      case 4:
      case 5: {
        const ancestors = getLadderAncestors(step);
        const label = getStepLabel(step);
        const key = getStepAnswerKey(step)!;

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

            <div className="space-y-3">
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
                <p className="text-xs text-muted-foreground">
                  Nur ein paar Stichwörter reichen. Es muss kein perfekter Satz sein.
                </p>
              )}
            </div>
          </div>
        );
      }

      case 6:
        return (
          <div className="flex w-full flex-col gap-6">
            {/* Reframe questions */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="what-if-wrong" className="text-sm font-medium">
                  Was, wenn du falsch liegst?
                </Label>
                <Textarea
                  id="what-if-wrong"
                  value={answers.whatIfWrong}
                  onChange={(e) => updateAnswer("whatIfWrong", e.target.value)}
                  placeholder="Gibt es eine andere Perspektive, die du noch nicht gesehen hast?"
                  rows={3}
                  className="min-h-[80px] resize-y"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="what-it-would-mean" className="text-sm font-medium">
                  Was würde es bedeuten, wenn du falsch liegst?
                </Label>
                <Textarea
                  id="what-it-would-mean"
                  value={answers.whatItWouldMean}
                  onChange={(e) => updateAnswer("whatItWouldMean", e.target.value)}
                  placeholder="Was würde sich dann ändern? Wie würde sich deine Sichtweise verschieben?"
                  rows={3}
                  className="min-h-[80px] resize-y"
                />
              </div>
            </div>

            {/* Comparison */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="current-problem" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Aktuelles Problem
                </Label>
                <p className="text-xs text-muted-foreground/70">(wenn du nichts änderst)</p>
                <Textarea
                  id="current-problem"
                  value={answers.currentProblem}
                  onChange={(e) => updateAnswer("currentProblem", e.target.value)}
                  placeholder={answers.step2 || "Was passiert, wenn alles so bleibt?"}
                  rows={3}
                  className="min-h-[80px] resize-y"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-problem" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Neues Problem
                </Label>
                <p className="text-xs text-muted-foreground/70">(wenn du handelst)</p>
                <Textarea
                  id="new-problem"
                  value={answers.newProblem}
                  onChange={(e) => updateAnswer("newProblem", e.target.value)}
                  placeholder="Welche neue Herausforderung entsteht, wenn du etwas veränderst?"
                  rows={3}
                  className="min-h-[80px] resize-y"
                />
              </div>
            </div>

            {/* Decision */}
            <div className="space-y-2">
              <Label htmlFor="decision" className="text-base font-medium">
                Deine Entscheidung
              </Label>
              <Textarea
                id="decision"
                value={answers.decision}
                onChange={(e) => updateAnswer("decision", e.target.value)}
                placeholder="Was ist dein nächster Schritt – auch wenn er klein ist?"
                rows={3}
                className="min-h-[80px] resize-y"
                required
              />
            </div>
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
        <SubPageHeader backHref="/recipes" title="Overthinking" />
        <div className="flex flex-1 flex-col justify-center">
          <RecipeIntro
            cards={INTRO_CARDS}
            onComplete={handleIntroSeen}
            onSkip={handleIntroSeen}
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
          {/* Icon */}
          <div className="flex size-16 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="size-8 text-success" />
          </div>

          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Geschafft.
          </h1>

          <p className="text-muted-foreground">
            Du hast den Gedankenkarussell durchbrochen und eine klare Entscheidung getroffen. Das
            war mutig – nimm diesen Moment mit.
          </p>

          {/* Reframe als ruhiger Schlusspunkt */}
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

          {/* Decision highlight */}
          {answers.decision && (
            <Card className="w-full border-primary/30">
              <CardContent className="space-y-2 pt-(--card-spacing)">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  Deine Entscheidung
                </p>
                <p className="whitespace-pre-wrap text-left text-base leading-relaxed text-foreground">
                  {answers.decision}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex w-full flex-col gap-3 pt-4">
            <Button className="w-full" size="lg" render={<Link href="/recipes" />}>
              Zurück zur Übersicht
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => {
                setStep(1);
                setAnswers(EMPTY_ANSWERS);
                setCountdownDone(false);
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
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/recipes" title="Overthinking" />
      <div className="flex flex-1 flex-col px-4 py-6">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          {/* "Worum geht's?"-Collapsible (Wiederkehrer) */}
          {INTRO_CARDS.length > 0 && (
            <div className="mb-6">
              <RecipeIntroCollapsible cards={INTRO_CARDS} />
            </div>
          )}

          {/* Progress dots */}
        <ProgressDots current={step} completed={false} />

        {/* Draft restore prompt */}
        {pendingDraft && (
          <div className="mt-4">
            <DraftRestoreBanner onRestore={restoreDraft} onDiscard={clearDraft} />
          </div>
        )}

        {/* Step header */}
        <p className="mt-4 text-center text-xs font-medium text-muted-foreground">
          Schritt {step} von {TOTAL_STEPS}
        </p>
        {STEP_HEADERS[step] && (
          <h2 className="mt-1 text-center font-heading text-lg font-semibold text-foreground">
            {STEP_HEADERS[step]}
          </h2>
        )}

        {/* Error banner */}
        <FormError message={error} className="mt-4" />

        {/* Step content */}
        <div
          key={step}
          className="mt-8 flex flex-1 flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out"
        >
          {renderStepContent()}
        </div>

        {/* Bottom navigation */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-8">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={step === 1}
            className="gap-1"
          >
            <ChevronLeft className="size-4" />
            Zurück
          </Button>

          {step < TOTAL_STEPS ? (
            <Button onClick={goNext} disabled={!canGoNext()} className="gap-1">
              Weiter
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="gap-1">
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
