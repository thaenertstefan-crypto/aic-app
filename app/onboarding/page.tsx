"use client";

import { useEffect, useRef } from "react";
import { useActionState, useState } from "react";
import gsap from "gsap";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { FormError } from "@/components/ui/form-error";
import { Mascot, type MascotExpression } from "@/components/brand/mascot";
import { Crossfade } from "@/components/dashboard/crossfade";
import { LoginOnboardingOverlay } from "@/components/onboarding/login-onboarding-overlay";
import { POST_LOGIN_KEY } from "@/components/dashboard/dashboard-reveal";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { ONBOARDING_INTRO } from "@/lib/content/onboarding-intro";

import { completeOnboardingAction } from "@/app/onboarding/onboarding.actions";

/** Gültigkeitsfenster für den Post-Login-Marker (analog dashboard-reveal). */
const POST_LOGIN_MAX_AGE_MS = 10_000;

type Step =
  | "name"
  | "response"
  | "reason"
  | "confidence"
  | "intro1"
  | "intro2"
  | "intro3"
  | "intro4";

const STEPS: Step[] = [
  "name",
  "response",
  "reason",
  "confidence",
  "intro1",
  "intro2",
  "intro3",
  "intro4",
];

const REASON_OPTIONS = [
  { value: "know-myself", label: "Ich möchte mich besser kennenlernen" },
  { value: "struggle-say-no", label: "Mir fällt es schwer, Nein zu sagen" },
  { value: "overthink", label: "Ich denke über alles zu viel nach" },
  { value: "more-confidence", label: "Ich möchte insgesamt selbstbewusster werden" },
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

function expressionForStep(step: Step): MascotExpression {
  switch (step) {
    case "response":
      return "happy";
    case "reason":
    case "confidence":
      return "curious";
    default:
      return "smile";
  }
}

export default function OnboardingPage() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState<Step>("name");
  const [reason, setReason] = useState("");
  const [confidenceBaseline, setConfidenceBaseline] = useState(5);
  const [name, setName] = useState("");

  const mascotRef = useRef<HTMLDivElement>(null);

  // Übergangs-Overlay nur beim allerersten Onboarding-Eintritt direkt nach dem
  // Login/Signup (frischer Post-Login-Marker). Per useEffect gesetzt, damit es
  // keine Hydration-Diskrepanz gibt.
  const [showLoginIntro, setShowLoginIntro] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(POST_LOGIN_KEY);
      const ts = raw ? Number(raw) : NaN;
      if (Number.isFinite(ts) && Date.now() - ts < POST_LOGIN_MAX_AGE_MS) {
        sessionStorage.removeItem(POST_LOGIN_KEY);
        setShowLoginIntro(true);
      }
    } catch {
      // sessionStorage nicht verfügbar — kein Overlay, kein Problem.
    }
  }, []);

  const [state, formAction, pending] = useActionState(completeOnboardingAction, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      // Reminder am Onboarding-Tag unterdrücken (Sicherheitsnetz).
      try {
        localStorage.setItem(
          "aic_reminder_date",
          new Date().toISOString().slice(0, 10),
        );
      } catch {
        // ignore
      }
      window.location.href = "/dashboard";
    }
  }, [state.success]);

  // Mascot springt beim ersten Mount aus dem Boden in die Mitte.
  useEffect(() => {
    const el = mascotRef.current;
    if (!el) return;
    if (reduced) {
      gsap.set(el, { y: 0, opacity: 1, scale: 1 });
      return;
    }
    const tween = gsap.fromTo(
      el,
      { y: 80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: "back.out(1.7)" },
    );
    return () => {
      tween.kill();
    };
  }, [reduced]);

  // Kleiner Hüpfer auf der Antwort-Karte.
  useEffect(() => {
    if (step !== "response" || reduced) return;
    const el = mascotRef.current;
    if (!el) return;
    const tween = gsap.fromTo(
      el,
      { scale: 1 },
      { scale: 1.1, duration: 0.16, yoyo: true, repeat: 1, ease: "power1.inOut" },
    );
    return () => {
      tween.kill();
    };
  }, [step, reduced]);

  const stepIndex = STEPS.indexOf(step);
  const progressPercent = ((stepIndex + 1) / STEPS.length) * 100;
  const isLast = step === "intro4";

  const canAdvance =
    step === "name"
      ? name.trim() !== ""
      : step === "reason"
        ? reason !== ""
        : true;

  const goNext = () => {
    if (isLast) {
      const formData = new FormData();
      formData.set("reason", reason);
      formData.set("confidenceBaseline", String(confidenceBaseline));
      formData.set("name", name);
      formAction(formData);
      return;
    }
    setStep(STEPS[stepIndex + 1]);
  };

  const goBack = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
  };

  const displayName = name.trim() || "du";
  const introCard =
    step.startsWith("intro") &&
    ONBOARDING_INTRO[Number(step.replace("intro", "")) - 1];

  return (
    <div className="flex min-h-svh flex-col justify-center px-4 py-8">
      {showLoginIntro && (
        <LoginOnboardingOverlay onDone={() => setShowLoginIntro(false)} />
      )}
      {/* Mascot über der Karte */}
      <div className="mb-4 flex justify-center">
        <div ref={mascotRef}>
          <Mascot expression={expressionForStep(step)} size="md" />
        </div>
      </div>

      {/* Fortschrittsanzeige */}
      <div className="mx-auto mb-6 flex w-full max-w-sm flex-col gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Schritt {stepIndex + 1} von {STEPS.length}
        </span>
        <div className="h-1 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Karte — Inhalt blendet beim Schrittwechsel sanft über (Token = Step). */}
      <Crossfade token={step}>
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          {step === "name" && (
            <>
              <CardTitle>Willkommen 👋</CardTitle>
              <CardDescription>
                Willkommen im Anti Imposter Club. Schön, dass du da bist.
                Verrätst du mir, wie du heißt?
              </CardDescription>
            </>
          )}
          {step === "response" && (
            <>
              <CardTitle>Nett dich kennenzulernen, {displayName}! 👋</CardTitle>
              <CardDescription>
                Lass mich dir kurz zwei Fragen stellen und dir dann die App
                zeigen.
              </CardDescription>
            </>
          )}
          {step === "reason" && (
            <>
              <CardTitle>Was bringt dich hierher?</CardTitle>
              <CardDescription>
                Was hat dich heute hergeführt? Dein Weg darf sich später ändern.
              </CardDescription>
            </>
          )}
          {step === "confidence" && (
            <>
              <CardTitle>Wie sicher fühlst du dich gerade?</CardTitle>
              <CardDescription>
                Es gibt kein &bdquo;richtig&ldquo; oder &bdquo;falsch&ldquo;
                hier. Sei ehrlich mit dir.
              </CardDescription>
            </>
          )}
          {introCard && (
            <>
              <CardTitle>{introCard.title}</CardTitle>
              <CardDescription>{introCard.body}</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          <FormError message={state.error} className="mb-4" />

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
                onValueChange={(val: number) => setConfidenceBaseline(val)}
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
        </CardContent>
      </Card>
      </Crossfade>

      {/* Navigation */}
      <div className="mx-auto mt-4 flex w-full max-w-sm flex-col gap-2">
        <Button
          className="w-full"
          disabled={!canAdvance || (isLast && pending)}
          onClick={goNext}
        >
          {step === "name"
            ? "Los geht's"
            : isLast
              ? pending
                ? "Wird eingerichtet …"
                : "Ich bin bereit"
              : "Weiter"}
        </Button>

        {stepIndex > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={goBack}
            disabled={pending}
          >
            Zurück
          </Button>
        )}
      </div>
    </div>
  );
}
