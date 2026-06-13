"use client";

import { useEffect } from "react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";

import { completeOnboardingAction } from "@/app/onboarding/onboarding.actions";

type Step = "reason" | "confidence" | "name";

const STEPS: Step[] = ["reason", "confidence", "name"];

const STEP_LABELS: Record<Step, string> = {
  reason: "Dein Grund",
  confidence: "Dein Gefühl",
  name: "Dein Name",
};

const REASON_OPTIONS = [
  {
    value: "know-myself",
    label: "Ich möchte mich besser kennenlernen",
  },
  {
    value: "struggle-say-no",
    label: "Mir fällt es schwer, Nein zu sagen",
  },
  {
    value: "overthink",
    label: "Ich denke über alles zu viel nach",
  },
  {
    value: "more-confidence",
    label: "Ich möchte insgesamt selbstbewusster werden",
  },
];

const CONFIDENCE_LABELS: Record<number, string> = {
  1: "Noch ganz unsicher",
  2: "Eher unsicher",
  3: "Ein bisschen unsicher",
  4: "Leicht unsicher",
  5: "Geht so",
  6: "Teils, teils",
  7: "Ganz ok",
  8: "Schon recht sicher",
  9: "Ziemlich sicher",
  10: "Rundum sicher",
};

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState("");
  const [confidenceBaseline, setConfidenceBaseline] = useState(5);
  const [name, setName] = useState("");

  const [state, formAction, pending] = useActionState(completeOnboardingAction, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      window.location.href = "/dashboard";
    }
  }, [state.success]);

  const stepIndex = STEPS.indexOf(step);
  const progressPercent = ((stepIndex + 1) / STEPS.length) * 100;

  const canAdvanceFromReason = reason !== "";
  const canAdvanceFromConfidence = true;

  const handleNext = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1]);
    }
  };

  const handleSubmit = () => {
    const formData = new FormData();
    formData.set("reason", reason);
    formData.set("confidenceBaseline", String(confidenceBaseline));
    formData.set("name", name);
    formAction(formData);
  };

  return (
    <div className="flex min-h-svh flex-col px-4 py-8">
      {/* Progress indicator */}
      <div className="mb-8 flex flex-col gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Schritt {stepIndex + 1} von {STEPS.length}
          <span className="ml-2 text-muted-foreground/60">
            — {STEP_LABELS[step]}
          </span>
        </span>
        <div className="h-1 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          {stepIndex === 0 && (
            <>
              <CardTitle>Was bringt dich hierher?</CardTitle>
              <CardDescription>
                Schön, dass du da bist! Jeder Schritt zählt — und du hast den
                ersten schon gemacht. Was hat dich heute hergeführt?
              </CardDescription>
            </>
          )}
          {stepIndex === 1 && (
            <>
              <CardTitle>Wie sicher fühlst du dich gerade?</CardTitle>
              <CardDescription>
                Es gibt kein &bdquo;richtig&ldquo; oder &bdquo;falsch&ldquo;
                hier. Sei ehrlich mit dir — das ist der Ort dafür.
              </CardDescription>
            </>
          )}
          {stepIndex === 2 && (
            <>
              <CardTitle>Wie möchtest du genannt werden?</CardTitle>
              <CardDescription>
                Perfekt, fast geschafft! Sag mir noch deinen Namen, dann kann es
                richtig losgehen.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {state.error && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </div>
          )}

          {/* Step 1: Reason */}
          {step === "reason" && (
            <RadioGroup
              value={reason}
              onValueChange={(val) => setReason(val as string)}
            >
              {REASON_OPTIONS.map((option) => (
                <RadioGroupItem key={option.value} value={option.value}>
                  {option.label}
                </RadioGroupItem>
              ))}
            </RadioGroup>
          )}

          {/* Step 2: Confidence slider */}
          {step === "confidence" && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <span className="text-5xl font-bold text-primary">
                  {confidenceBaseline}
                </span>
                <p className="mt-1 text-sm text-muted-foreground">
                  {CONFIDENCE_LABELS[confidenceBaseline]}
                </p>
              </div>
              <Slider
                value={confidenceBaseline}
                onValueChange={(val: number) =>
                  setConfidenceBaseline(val)
                }
                min={1}
                max={10}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Wenig sicher</span>
                <span>Sehr sicher</span>
              </div>
            </div>
          )}

          {/* Step 3: Name */}
          {step === "name" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Dein Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Wie möchtest du angesprochen werden?"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-2 border-t pt-4">
          {step !== "name" && (
            <Button
              className="w-full"
              disabled={
                (step === "reason" && !canAdvanceFromReason) ||
                (step === "confidence" && !canAdvanceFromConfidence)
              }
              onClick={handleNext}
            >
              Weiter
            </Button>
          )}

          {step === "name" && (
            <Button
              className="w-full"
              disabled={!name || pending}
              onClick={handleSubmit}
            >
              {pending ? "Wird eingerichtet …" : "Loslegen!"}
            </Button>
          )}

          {stepIndex > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setStep(STEPS[stepIndex - 1])}
            >
              Zurück
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Encouraging footer */}
      <p className="mx-auto mt-6 max-w-xs text-center text-xs text-muted-foreground">
        {step === "reason" &&
          "Du musst dich nicht entscheiden — dein Weg darf sich ändern."}
        {step === "confidence" &&
          "Selbstvertrauen ist kein Ziel, sondern eine Reise. Du bist genau richtig, wo du bist."}
        {step === "name" &&
          "Gleich geht's los. Wir freuen uns auf dich!"}
      </p>
    </div>
  );
}