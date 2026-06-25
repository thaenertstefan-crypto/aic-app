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
import { MePreview, BoosterPreview } from "@/components/onboarding/intro-previews";
import { POST_LOGIN_KEY } from "@/components/dashboard/dashboard-reveal";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import { ONBOARDING_INTRO } from "@/lib/content/onboarding-intro";
import { cn } from "@/lib/utils";
import { utcDateKey } from "@/lib/utils/date";

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
  useScrollTopOnChange(step);
  const [reason, setReason] = useState("");
  const [confidenceBaseline, setConfidenceBaseline] = useState(5);
  const [name, setName] = useState("");

  const mascotRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Übergangs-Animation nur beim allerersten Onboarding-Eintritt direkt nach dem
  // Login/Signup (frischer Post-Login-Marker). Lazy-Initializer (wie
  // dashboard-reveal), damit die Startzustände schon im ersten Client-Render
  // gesetzt sind (kein Flash). Der Marker wird im Effect entfernt.
  const [showLoginIntro, setShowLoginIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = sessionStorage.getItem(POST_LOGIN_KEY);
      const ts = raw ? Number(raw) : NaN;
      return Number.isFinite(ts) && Date.now() - ts < POST_LOGIN_MAX_AGE_MS;
    } catch {
      return false;
    }
  });
  // Während der Intro überschriebener Gesichtsausdruck (Freude beim Landen).
  const [introExpression, setIntroExpression] = useState<MascotExpression | null>(
    null,
  );

  useEffect(() => {
    if (showLoginIntro) {
      try {
        sessionStorage.removeItem(POST_LOGIN_KEY);
      } catch {
        // ignore
      }
    }
  }, [showLoginIntro]);

  const [state, formAction, pending] = useActionState(completeOnboardingAction, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      // Reminder am Onboarding-Tag unterdrücken (Sicherheitsnetz).
      try {
        localStorage.setItem("aic_reminder_date", utcDateKey());
      } catch {
        // ignore
      }
      window.location.href = "/dashboard";
    }
  }, [state.success]);

  // Mascot-Entrance: entweder die Login→Onboarding-Sprungsequenz (nur beim
  // allerersten Eintritt nach Login) oder der normale Mount-Tween.
  useEffect(() => {
    const mascot = mascotRef.current;
    if (!mascot) return;

    // ── Login→Onboarding-Übergang ──
    if (showLoginIntro) {
      const content = contentRef.current;
      const cover = coverRef.current;

      if (reduced) {
        gsap.set(mascot, { y: 0, rotation: 0, opacity: 1, scale: 1 });
        if (content) gsap.set(content, { opacity: 0 });
        setIntroExpression("radiant");
        const tl = gsap.timeline({
          onComplete: () => {
            setShowLoginIntro(false);
            setIntroExpression(null);
          },
        });
        if (content) tl.to(content, { opacity: 1, duration: 0.5, delay: 0.5 });
        if (cover) tl.to(cover, { opacity: 0, duration: 0.4 }, "+=0.1");
        return () => {
          tl.kill();
        };
      }

      const drop = window.innerHeight * 0.45;
      gsap.set(mascot, { y: -drop, rotation: 180, opacity: 1, scale: 1 });
      if (content) gsap.set(content, { opacity: 0 });

      const tl = gsap.timeline({
        onComplete: () => {
          setShowLoginIntro(false);
          setIntroExpression(null);
        },
      });
      // a–c: ein Satz nach unten, dabei aufrecht drehen; beim Landen strahlen.
      tl.to(mascot, {
        y: 0,
        rotation: 0,
        duration: 1.0,
        ease: "power2.out",
        onComplete: () => setIntroExpression("radiant"),
      });
      // e: Schritt 1 langsam unter dem Maskottchen einblenden.
      if (content) tl.to(content, { opacity: 1, duration: 0.9, ease: "power1.out" }, "+=0.35");
      // f: Cover ausblenden → Logo + Layout erscheinen mit Schritt 1.
      if (cover) tl.to(cover, { opacity: 0, duration: 0.6, ease: "power1.in" }, "+=0.1");

      return () => {
        tl.kill();
      };
    }

    // ── Normaler Mount-Tween ──
    if (reduced) {
      gsap.set(mascot, { y: 0, opacity: 1, scale: 1 });
      return;
    }
    const tween = gsap.fromTo(
      mascot,
      { y: 80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: "back.out(1.7)" },
    );
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {/* Clean-Cover für den Login→Onboarding-Übergang: verdeckt Logo + Layout,
          sodass beim Sprung nur das Maskottchen sichtbar ist. Immer gerendert
          (kein Struktur-Mismatch bei der Hydration), nur per `hidden` gated. */}
      <div
        ref={coverRef}
        aria-hidden="true"
        suppressHydrationWarning
        className={cn(
          "fixed inset-0 z-40 bg-[var(--background)]",
          !showLoginIntro && "hidden",
        )}
      />

      {/* Mascot über der Karte (z-50 → über dem Cover während der Intro) */}
      <div className="relative z-50 mb-4 flex justify-center">
        <div
          ref={mascotRef}
          suppressHydrationWarning
          style={
            showLoginIntro && !reduced
              ? { transform: "translateY(-45vh) rotate(180deg)" }
              : undefined
          }
        >
          <Mascot
            expression={introExpression ?? expressionForStep(step)}
            size="lg"
          />
        </div>
      </div>

      {/* Inhalt (Fortschritt + Karte + Navigation) — während der Intro
          ausgeblendet, blendet danach unter dem Maskottchen ein. z-50 → über
          dem Cover. */}
      <div
        ref={contentRef}
        className="relative z-50 flex flex-col"
        suppressHydrationWarning
        style={showLoginIntro ? { opacity: 0 } : undefined}
      >
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
                Willkommen im Anti Imposter Club – einem Ort, der Dir helfen soll,
                aus Gedankenspiralen auszubrechen, schuldgefühlfrei &bdquo;Nein&ldquo;
                zu sagen und Dich einfach wieder gut genug zu fühlen.
              </CardDescription>
              <CardDescription>
                Bevor ich Dich mit unserer Club-App vertraut mache, magst Du mir
                verraten, wie Du heißt?
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
              {introCard.title && <CardTitle>{introCard.title}</CardTitle>}
              {introCard.body.map((paragraph, i) => (
                <CardDescription key={i}>{paragraph}</CardDescription>
              ))}
            </>
          )}
        </CardHeader>

        <CardContent>
          <FormError message={state.error} className="mb-4" />

          {step === "intro2" && <MePreview />}
          {step === "intro3" && <BoosterPreview />}

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
    </div>
  );
}
