"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";

import { BoosterBackHeader } from "@/components/booster/booster-back-header";
import { RecipeIntro } from "@/components/recipes/recipe-intro";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { Mascot } from "@/components/brand/mascot";
import { ModuleIcon } from "@/components/booster/module-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { CompletionCelebration } from "@/components/ui/completion-celebration";
import { markCleanserIntroSeenAction } from "@/app/(app)/cleansers/actions";
import { getCleanserIntro } from "@/lib/utils/cleanser-intros";
import { PAGE_TITLES } from "@/lib/content/labels";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";

import { BreathingExercise } from "./breathing-exercise";
import { logConfidenceCheckin } from "@/lib/recipes/confidence/actions";
import {
  COUNTED_STEPS,
  advanceConfidence,
  initialConfidence,
  stepNumber,
} from "@/lib/recipes/confidence/state";

// ---------------------------------------------------------------------------
// Confidence-Boost — „Gleich bin ich dran": geführter 5-Minuten-Flow vor einem
// Auftritt, Meeting oder schwierigen Gespräch: Atmung → Körper-Anker → Stimme →
// Power-Erinnerung (Mantra + ggf. ein Recht) → Los geht's.
// Jeder Schritt ist per „Weiter" überspringbar — wer's eilig hat, tappt durch.
//
// Der Tap auf dem Hub landet direkt hier: die Übung ist der Wizard, es gibt
// keine Zwischenlandung mehr (KAN-43, wie bei Overthinking).
// ---------------------------------------------------------------------------

/** Mascot-Ausdruck je Intro-Karte: neugierig ankommen, strahlend rausgehen. */
const INTRO_EXPRESSIONS = ["curious", "radiant"] as const;

const INTRO_CARDS = getCleanserIntro("confidence-boost") ?? [];

/**
 * Das Mantra der Übung — Inhalt, kein Nutzer-Datum: Es steht am Ende jedes
 * Reframes dieser Übung und trägt den Abschluss-Screen (KAN-43; vorher als
 * `user_mantra` editierbar, mit dem Ritual verworfen).
 */
const MANTRA = "Ich bin nicht für jeden";

const TONGUE_TWISTERS = [
  "Zwischen zwei Zwetschgenzweigen sitzen zwei zwitschernde Schwalben.",
  "Blaukraut bleibt Blaukraut und Brautkleid bleibt Brautkleid.",
  "Fischers Fritz fischt frische Fische, frische Fische fischt Fischers Fritz.",
];

export function ConfidenceWizard({
  todaysRight,
  introSeen,
}: {
  todaysRight: string | null;
  introSeen: boolean;
}) {
  const [introDismissed, setIntroDismissed] = useState(false);
  const [state, dispatch] = useReducer(advanceConfidence, null, initialConfidence);
  const { step, breathingDone } = state;
  useScrollTopOnChange(step);

  // Der stille Check-in darf pro Durchlauf nur einmal feuern — im Dev-Modus
  // läuft der Effekt sonst zweimal.
  const checkinFired = useRef(false);

  useEffect(() => {
    if (step !== "go" || checkinFired.current) return;
    checkinFired.current = true;
    // Fire-and-forget: Abschluss still loggen (Slug "confidence"),
    // der Screen wartet nicht darauf.
    void logConfidenceCheckin().catch(() => {});
  }, [step]);

  function handleIntroSeen() {
    setIntroDismissed(true);
    // Fire-and-forget: Gesehen-Status still persistieren.
    void markCleanserIntroSeenAction("confidence-boost");
  }

  function next() {
    dispatch({ type: "stepFinished" });
  }

  // ── Erst-Intro ──────────────────────────────────────────────────

  if (!introSeen && !introDismissed) {
    return (
      <div className="flex min-h-svh flex-col">
        <BoosterBackHeader title={PAGE_TITLES.confidence} />
        {/* data-e2e: der E2E-Lauf muss unterscheiden können, ob die Route
            ihren Inhalt zeigt oder (noch) die Erst-Intro-Sequenz —
            siehe scripts/e2e/verify.mjs. Ohne Laufzeit-Wirkung. */}
        <div className="flex flex-1 flex-col justify-center" data-e2e="recipe-intro">
          <RecipeIntro
            cards={INTRO_CARDS}
            onComplete={handleIntroSeen}
            onSkip={handleIntroSeen}
            renderMascot={(index) => (
              <Mascot
                expression={INTRO_EXPRESSIONS[index] ?? "smile"}
                size="md"
              />
            )}
          />
        </div>
      </div>
    );
  }

  const header = (
    <BoosterBackHeader
      title={PAGE_TITLES.confidence}
      // Nur Schritt 1 blendet ein — dort steht auch das ModuleIcon, dort
      // endet der Kopfwetter-Zoom.
      enterFade={step === "breathe"}
      action={
        INTRO_CARDS.length > 0 ? (
          <IntroInfoButton cards={INTRO_CARDS} />
        ) : undefined
      }
    />
  );

  const progress =
    step === "go" ? null : (
      <p className="text-center text-xs font-medium text-muted-foreground">
        Schritt {stepNumber(step)} von {COUNTED_STEPS}
      </p>
    );

  // ── Schritt 1: Atmen ────────────────────────────────────────────

  if (step === "breathe") {
    return (
      // data-e2e: die Zusicherung, dass der Tap auf den Booster wirklich im
      // Wizard landet und nicht auf einer Zwischenlandung — siehe
      // scripts/e2e/verify.mjs. Ohne Laufzeit-Wirkung.
      <div className="flex min-h-svh flex-col" data-e2e="confidence-wizard">
        {header}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 einblenden">
          {/* Icon + Einstiegs-Text als ein zentriertes Paar — dieselbe
              Einstiegs-Grammatik wie overthinking, saying-no und shadow. Der
              Wrapper trägt bewusst kein Padding nach oben: der Landeplatz des
              Kopfwetter-Flugs (LANDE_Y in lib/kopfwetter/flug.ts) rechnet damit,
              dass das ModuleIcon direkt unter dem Header sitzt. */}
          <div className="flex flex-col items-center gap-1 text-center">
            <ModuleIcon variant="confidence" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Erst der Körper, dann der Kopf.
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Dein Körper schaltet auf Alarm — lass uns deinen
              Fight-or-Flight-Reflex beruhigen. Vier Runden 4-7-8-Atmung, folge
              einfach dem Kreis.
            </p>
          </div>
          {progress}

          <Card className="w-full">
            <CardContent className="py-2">
              <BreathingExercise
                onDone={() => dispatch({ type: "breathingFinished" })}
              />
            </CardContent>
          </Card>

          <Button
            size="lg"
            variant={breathingDone ? "default" : "outline"}
            className="w-full"
            onClick={next}
          >
            Weiter
          </Button>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Schritt 2: Körper-Anker ─────────────────────────────────────

  if (step === "body") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 einblenden">
          {progress}
          <div className="space-y-2 text-center">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Körper-Anker
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Adrenalin will arbeiten. Gib ihm eine Aufgabe, die niemand sieht:
            </p>
          </div>

          <Card className="w-full">
            <CardContent className="space-y-2 pt-(--card-spacing)">
              <p className="font-heading text-base font-medium text-foreground">
                Po &amp; Oberschenkel
              </p>
              <p className="text-base leading-relaxed text-muted-foreground">
                Spann Po- und Oberschenkelmuskeln fest an — 5 Sekunden halten,
                dann locker lassen. Dreimal. Das erdet dich, buchstäblich.
              </p>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardContent className="space-y-2 pt-(--card-spacing)">
              <p className="font-heading text-base font-medium text-foreground">
                Handflächen
              </p>
              <p className="text-base leading-relaxed text-muted-foreground">
                Press deine Handflächen fest gegeneinander — oder drück gegen
                eine Wand oder Tischkante. 5 Sekunden Spannung, dann lösen. Die
                Anspannung geht mit raus.
              </p>
            </CardContent>
          </Card>

          <Button size="lg" className="w-full" onClick={next}>
            Weiter
          </Button>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Schritt 3: Stimme ───────────────────────────────────────────

  if (step === "voice") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 einblenden">
          {progress}
          <div className="space-y-2 text-center">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Deine Stimme
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Gleich beim Sprechen: <span className="font-medium text-foreground">Tempo runter</span> —
              langsamer, als sich richtig anfühlt. Und{" "}
              <span className="font-medium text-foreground">beende deine Sätze</span>:
              Stimme am Ende nach unten, Punkt statt Fragezeichen.
            </p>
          </div>

          <Card className="w-full">
            <CardContent className="space-y-3 pt-(--card-spacing)">
              <p className="text-sm text-muted-foreground">
                Zum Aufwärmen von Zunge und Kiefer — sprich einen davon dreimal,
                laut oder leise gemurmelt:
              </p>
              <ul className="space-y-3">
                {TONGUE_TWISTERS.map((t) => (
                  <li
                    key={t}
                    className="rounded-lg bg-muted/50 px-3 py-2 text-base leading-relaxed text-foreground"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Button size="lg" className="w-full" onClick={next}>
            Weiter
          </Button>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Schritt 4: Power-Erinnerung ─────────────────────────────────

  if (step === "reminder") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 einblenden">
          {progress}
          <div className="space-y-2 text-center">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Und jetzt du.
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Lies es einmal langsam — und nimm es mit rein:
            </p>
          </div>

          <Card className="w-full border-primary/30">
            <CardContent className="flex min-h-[28svh] flex-col items-center justify-center gap-4 py-6 text-center">
              <SectionLabel>Dein Mantra</SectionLabel>
              <p className="font-affirmation text-3xl leading-tight font-medium tracking-tight text-foreground">
                {MANTRA}
              </p>
            </CardContent>
          </Card>

          {/* Kuratierter Auftritts-Reframe — die häufigste Angst vor einem
              Auftritt, einmal liebevoll umgedreht (Stil der Reframe-Karten). */}
          <Card className="w-full">
            <CardContent className="space-y-3 pt-(--card-spacing)">
              <SectionLabel>Falls da so ein Gedanke ist …</SectionLabel>
              <p className="text-base leading-relaxed italic text-muted-foreground">
                „Was, wenn ich gleich was sage, was dem anderen nicht gefällt —
                oder ich mich blamiere?“
              </p>
              <p className="text-base leading-relaxed text-foreground">
                Meine Ideen und Worte haben einen Platz verdient. Ich darf sie
                aussprechen. Mehr als echt sein kann ich nicht. Wenn das
                jemandem nicht gefällt, ist das nicht mein Problem — ich bin
                nicht für jeden.
              </p>
            </CardContent>
          </Card>

          {todaysRight && (
            <Card className="w-full">
              <CardContent className="pt-(--card-spacing)">
                <p className="text-base leading-relaxed text-muted-foreground">
                  Und denk dran:{" "}
                  <span className="font-affirmation font-medium text-foreground">
                    {todaysRight.startsWith("Ich habe das Recht")
                      ? todaysRight
                      : `Du hast das Recht, ${todaysRight}`}
                  </span>
                </p>
              </CardContent>
            </Card>
          )}

          <Button size="lg" className="w-full" onClick={next}>
            Ich bin bereit
          </Button>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Abschluss: Los geht's ───────────────────────────────────────
  // Grüner Haken wie auf den anderen Abschluss-Screens; das Mantra kommt
  // noch einmal groß — als Letztes, was man liest, bevor man rausgeht.

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center einblenden">
        <CompletionCelebration />
        <div className="space-y-2">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
            Los geht&apos;s — du bist bereit.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Langsam sprechen, Sätze beenden — und dein Mantra hast du dabei:
          </p>
        </div>
        <Card className="w-full border-primary/30">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <SectionLabel>Dein Mantra</SectionLabel>
            <p className="font-affirmation text-2xl leading-tight font-medium tracking-tight text-foreground">
              {MANTRA}
            </p>
          </CardContent>
        </Card>
        <Button size="lg" className="w-full" render={<Link href="/booster" />}>
          Fertig
        </Button>
      </div>
    </div>
  );
}
