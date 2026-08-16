"use client";

import { useEffect, useRef } from "react";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
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
import { RichText } from "@/components/ui/rich-text";
import { Slider } from "@/components/ui/slider";
import { FormError } from "@/components/ui/form-error";
import { Mascot, type MascotExpression } from "@/components/brand/mascot";
import { StarArt } from "@/components/brand/star-art";
import { CompassArt, SealArt } from "@/components/brand/me-ornaments";
import { Crossfade } from "@/components/dashboard/crossfade";
import { MePreview, BoosterPreview } from "@/components/onboarding/intro-previews";
import { IgnitingSky } from "@/components/onboarding/igniting-sky";
import { POST_LOGIN_KEY } from "@/components/dashboard/dashboard-reveal";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import {
  ONBOARDING_INTRO,
  ONBOARDING_COMPASS_EMOJIS,
  confidenceReaction,
} from "@/lib/content/onboarding-intro";
import { cn } from "@/lib/utils";
import { localDateKey } from "@/lib/utils/date";

import { ok, type ActionResult } from "@/lib/actions/action-result";
import { completeOnboardingAction } from "@/app/onboarding/onboarding.actions";

/** „Noch nicht abgeschickt" — die Nutzlast unterscheidet das vom Erfolg. */
const INITIAL_STATE: ActionResult<boolean> = ok(false);

/** Gültigkeitsfenster für den Post-Login-Marker (analog dashboard-reveal). */
const POST_LOGIN_MAX_AGE_MS = 10_000;

/** Sternenhimmel-Übergabe aufs Dashboard: Karte/Fortschritt/Navigation faden
 *  (0–400 ms), danach löst sich das Maskottchen auf und der Himmel zündet
 *  Sterne, bevor navigiert wird. */
const HANDOVER_FADE_MS = 400;
/** Kein freier Wert — an die Dauer der Zünd-Sequenz in `IgnitingSky`
 *  gebunden: letzter Stern zündet bei 600 ms Delay und braucht 500 ms
 *  Animationsdauer, ist also erst bei 1100 ms fertig. Muss mindestens so
 *  groß bleiben, sonst navigiert `router.push` mitten in die laufende
 *  Zünd-Animation hinein. */
const HANDOVER_TOTAL_MS = 1100;
/** Notbremse: greift die Client-Navigation nicht (Onboarding-Gate sieht das
 *  Profil-Flag noch nicht), holt der harte Redirect die Übergabe ein. Sitzt
 *  mit Abstand hinter HANDOVER_TOTAL_MS, damit router.push zuerst eine faire
 *  Chance bekommt. */
const HANDOVER_FALLBACK_MS = 1700;

type Step =
  | "name"
  | "response"
  | "reason"
  | "confidence"
  | "intro1"
  | "intro2"
  | "intro3"
  | "intro4"
  | "intro5"
  | "intro6"
  | "intro7"
  | "intro8";

const STEPS: Step[] = [
  "name",
  "response",
  "reason",
  "confidence",
  "intro1",
  "intro2",
  "intro3",
  "intro4",
  "intro5",
  "intro6",
  "intro7",
  "intro8",
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
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  useScrollTopOnChange(step);
  const [reason, setReason] = useState("");
  const [confidenceBaseline, setConfidenceBaseline] = useState(5);
  const [name, setName] = useState("");
  // Läuft die Übergabe? Startet mit dem Tap auf „Ich bin bereit", parallel zur
  // Server-Action.
  const [handover, setHandover] = useState(false);
  const handoverStart = useRef<number | null>(null);

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

  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    INITIAL_STATE,
  );

  // „Wirklich durchgelaufen": der Anfangszustand trägt ebenfalls `error: null`,
  // deshalb entscheidet die Nutzlast, nicht das fehlende Fehlerfeld.
  const completed = state.error === null && state.data;

  const fallbackTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!completed) return;
    // Reminder am Onboarding-Tag unterdrücken (Sicherheitsnetz).
    try {
      localStorage.setItem("aic_reminder_date", localDateKey());
    } catch {
      // ignore
    }
    // Marker für DashboardReveal: das Dashboard staffelt seine Abschnitte von
    // oben ein, genau wie nach dem Login. 10 s Gültigkeit — reicht.
    try {
      sessionStorage.setItem(POST_LOGIN_KEY, String(Date.now()));
    } catch {
      // ignore
    }

    const elapsed = handoverStart.current ? Date.now() - handoverStart.current : 0;
    const wait = reduced ? 0 : Math.max(0, HANDOVER_TOTAL_MS - elapsed);

    const go = window.setTimeout(() => {
      // Client-Navigation, damit der fixe SkyBackdrop wirklich stehenbleibt.
      router.push("/dashboard");
      fallbackTimer.current = window.setTimeout(() => {
        if (window.location.pathname !== "/dashboard") {
          window.location.href = "/dashboard";
        }
      }, HANDOVER_FALLBACK_MS);
    }, wait);

    return () => {
      window.clearTimeout(go);
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    };
  }, [completed, reduced, router]);

  // Rücknahme der Übergabe-Sequenz, sobald die Server-Action abgeschlossen ist,
  // ohne Erfolg — die Karte kommt mit FormError zurück. Trigger ist die
  // fallende `pending`-Flanke, nicht der Fehlertext: zwei identische Fehler
  // hintereinander (z. B. abgelaufene Session) liefern denselben String, und
  // `Object.is` würde den Effect dann beim zweiten Versuch nicht erneut
  // feuern — die Übergabe bliebe für immer ausgeblendet hängen.
  useEffect(() => {
    if (pending || completed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Rücknahme der Übergabe-Sequenz nach abgeschlossener, erfolgloser Server-Action
    setHandover(false);
    handoverStart.current = null;
  }, [pending, completed]);

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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Teil der einmaligen GSAP-Entrance-Sequenz beim Mount (Reduced-Motion-Zweig)
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
  const isLast = step === "intro8";

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
      // Die Sequenz startet SOFORT und läuft parallel zur Server-Action —
      // dauert die Action länger, bleibt der gezündete Himmel einfach ruhig
      // stehen. Kein Loop, kein Spinner.
      setHandover(true);
      handoverStart.current = Date.now();
      formAction(formData);
      return;
    }
    setStep(STEPS[stepIndex + 1]);
  };

  const goBack = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
  };

  const displayName = name.trim() || "du";
  // intro1 = dynamische Confidence-Reaktion (nach Score). intro2–intro6 kommen
  // aus ONBOARDING_INTRO; intro2 → Index 0, daher Offset -2.
  const introCard =
    step === "intro1"
      ? confidenceReaction(confidenceBaseline)
      : step.startsWith("intro")
        ? ONBOARDING_INTRO[Number(step.replace("intro", "")) - 2]
        : null;

  return (
    <div className="flex min-h-svh flex-col justify-center px-4 py-8">
      {/* Sternenhimmel-Übergabe: der Nachthimmel zündet gestaffelt Sterne,
          während Karte und Maskottchen faden. Kein Spinner — die Fläche selbst
          trägt die Wartezeit. `!reduced` hier am Call-Site geprüft (nicht nur
          intern in IgnitingSky): der Hook dort startet frisch bei `false` und
          flippt erst im eigenen Effect, sonst blitzen die Sterne bei Reduced
          Motion einen Frame lang auf, bevor die Komponente `null` liefert. */}
      {handover && !reduced && <IgnitingSky />}

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
      <div
        className={cn(
          "relative z-50 mb-8 flex justify-center transition-opacity duration-500 ease-out",
          handover && "opacity-0",
        )}
        style={handover ? { transitionDelay: `${HANDOVER_FADE_MS}ms` } : undefined}
      >
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
          dem Cover. Keine `transition-opacity`-Klasse hier: GSAP tweent die
          inline-Opacity dieses Elements während der Login→Onboarding-Intro
          frameweise, eine zusätzliche CSS-Transition würde jeden Frame
          nachziehen und die 0,9s-Intro verschmieren. Die Transition sitzt
          deshalb nur inline im Handover-Zweig. `pointer-events-none` im
          Handover, damit die unsichtbaren Buttons keine Taps mehr annehmen,
          während sie noch (kurz) enabled sind. */}
      <div
        ref={contentRef}
        className={cn("relative z-50 flex flex-col", handover && "pointer-events-none")}
        suppressHydrationWarning
        style={
          showLoginIntro
            ? { opacity: 0 }
            : handover
              ? { opacity: 0, transition: `opacity ${HANDOVER_FADE_MS}ms ease-out` }
              : undefined
        }
      >
      {/* Fortschrittsanzeige — nur der ruhige Balken (bei 12 Schritten wirkt eine
          „Schritt X von 12"-Zeile eher einschüchternd als hilfreich). */}
      <div className="mx-auto mb-6 w-full max-w-sm">
        <div className="h-1 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Karte — Inhalt blendet beim Schrittwechsel sanft über (Token = Step).
          Weiche „Kerzenlicht"-Fläche statt harter Box: kein Ring, weicher
          Schatten auf dem Nachthimmel (kein Glas → Glass-is-rare + iOS-Ghosting). */}
      <Crossfade token={step}>
      <Card className="mx-auto w-full max-w-sm rounded-2xl shadow-xl shadow-black/25 ring-0">
        <CardHeader>
          {step === "name" && (
            <>
              <CardTitle className="text-xl">Willkommen 👋</CardTitle>
              <CardDescription className="text-base">
                Willkommen im Anti Imposter Club – einem Ort, der dir helfen soll,
                aus Gedankenspiralen auszubrechen, schuldgefühlfrei nach deinen
                eigenen Regeln zu leben, &bdquo;Nein&ldquo; zu sagen, ohne dich
                schlecht zu fühlen, und wieder zu spüren, dass du gut genug bist.
              </CardDescription>
              <CardDescription className="text-base">
                Bevor ich dich mit unserer Club-App vertraut mache – magst du mir
                verraten, wie du heißt?
              </CardDescription>
            </>
          )}
          {step === "response" && (
            <>
              <CardTitle className="text-xl">Nett dich kennenzulernen, {displayName}! 👋</CardTitle>
              <CardDescription className="text-base">
                Lass mich dir kurz zwei Fragen stellen und dir dann die App
                zeigen.
              </CardDescription>
            </>
          )}
          {step === "reason" && (
            <>
              <CardTitle className="text-xl">Was bringt dich hierher?</CardTitle>
              <CardDescription className="text-base">
                Was hat dich heute hergeführt? Dein Weg darf sich später ändern.
              </CardDescription>
            </>
          )}
          {step === "confidence" && (
            <>
              <CardTitle className="text-xl">Wie sicher fühlst du dich gerade?</CardTitle>
              <CardDescription className="text-base">
                Es gibt kein &bdquo;richtig&ldquo; oder &bdquo;falsch&ldquo;
                hier. Sei ehrlich mit dir.
              </CardDescription>
            </>
          )}
          {introCard && (
            <>
              {introCard.title && <CardTitle className="text-xl">{introCard.title}</CardTitle>}
              {introCard.body.map((paragraph, i) => (
                <CardDescription key={i} className="text-base">
                  <RichText text={paragraph} />
                </CardDescription>
              ))}
            </>
          )}
        </CardHeader>

        <CardContent>
          <FormError message={state.error} className="mb-4" />

          {step === "intro2" && <MePreview />}
          {/* Passendes Ornament je Anlaufpunkt — bindet die Copy an die echten
              Hub-Signaturen (ruhig, nicht animiert). */}
          {step === "intro3" && (
            <div className="flex justify-center py-2">
              <CompassArt
                emojis={ONBOARDING_COMPASS_EMOJIS}
                animate={true}
                className="size-20"
              />
            </div>
          )}
          {step === "intro4" && (
            <div className="flex justify-center py-2">
              <StarArt animate={true} className="size-20" />
            </div>
          )}
          {step === "intro5" && (
            <div className="flex justify-center py-2">
              {/* Ohne Stempel: der Crossfade der Karte ist hier die Ankunft. */}
              <SealArt animate={true} stamp={false} className="size-16" />
            </div>
          )}
          {step === "intro7" && <BoosterPreview />}

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
                className="md:text-base"
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
