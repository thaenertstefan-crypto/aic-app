"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { SubPageHeader } from "@/components/layout/sub-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { Mascot } from "@/components/brand/mascot";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";

import { BreathingExercise } from "../breathing-exercise";
import { logMomentFlowCheckin } from "../actions";

// ---------------------------------------------------------------------------
// „Gleich bin ich dran" — geführter 5-Minuten-Flow vor einem Auftritt,
// Meeting oder schwierigen Gespräch: Atmung → Körper-Anker → Stimme →
// Power-Erinnerung (Mantra + ggf. ein Recht) → Los geht's.
// Jeder Schritt ist per „Weiter" überspringbar — wer's eilig hat, tappt durch.
// ---------------------------------------------------------------------------

type Step = "breathe" | "body" | "voice" | "reminder" | "go";

const STEP_ORDER: Step[] = ["breathe", "body", "voice", "reminder", "go"];

const TONGUE_TWISTERS = [
  "Zwischen zwei Zwetschgenzweigen sitzen zwei zwitschernde Schwalben.",
  "Blaukraut bleibt Blaukraut und Brautkleid bleibt Brautkleid.",
  "Fischers Fritz fischt frische Fische, frische Fische fischt Fischers Fritz.",
];

export function MomentFlow({
  mantra,
  right,
}: {
  mantra: string;
  right: string | null;
}) {
  const [step, setStep] = useState<Step>("breathe");
  useScrollTopOnChange(step);

  const [breathingDone, setBreathingDone] = useState(false);
  // Der stille Check-in darf pro Flow-Durchlauf nur einmal feuern.
  const checkinFired = useRef(false);

  const stepIndex = STEP_ORDER.indexOf(step);

  function next() {
    const upcoming = STEP_ORDER[stepIndex + 1];
    if (!upcoming) return;
    if (upcoming === "go" && !checkinFired.current) {
      checkinFired.current = true;
      // Fire-and-forget: Abschluss still loggen (Slug "confidence"),
      // der Screen wartet nicht darauf.
      void logMomentFlowCheckin().catch(() => {});
    }
    setStep(upcoming);
  }

  const header = (
    <SubPageHeader backHref="/booster/confidence" title="Gleich bin ich dran" />
  );

  const progress =
    step === "go" ? null : (
      <p className="text-center text-xs font-medium text-muted-foreground">
        Schritt {stepIndex + 1} von 4
      </p>
    );

  // ── Schritt 1: Atmen ────────────────────────────────────────────

  if (step === "breathe") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {progress}
          <div className="space-y-2 text-center">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Erst der Körper, dann der Kopf.
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Dein Körper schaltet auf Alarm — lass uns deinen
              Fight-or-Flight-Reflex beruhigen. Vier Runden 4-7-8-Atmung,
              folge einfach dem Kreis.
            </p>
          </div>

          <Card className="w-full">
            <CardContent className="py-2">
              <BreathingExercise onDone={() => setBreathingDone(true)} />
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
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
              <p className="font-heading text-3xl leading-tight font-medium tracking-tight text-foreground">
                {mantra}
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
                oder ich mich blamiere?&quot;
              </p>
              <p className="text-base leading-relaxed text-foreground">
                Meine Ideen und Worte haben einen Platz verdient. Ich darf sie
                aussprechen. Mehr als echt sein kann ich nicht. Wenn das
                jemandem nicht gefällt, ist das nicht mein Problem — ich bin
                nicht für jeden.
              </p>
            </CardContent>
          </Card>

          {right && (
            <Card className="w-full">
              <CardContent className="pt-(--card-spacing)">
                <p className="text-base leading-relaxed text-muted-foreground">
                  Und denk dran:{" "}
                  <span className="font-medium text-foreground">
                    {right.startsWith("Ich habe das Recht")
                      ? right
                      : `Du hast das Recht, ${right}`}
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
  // Bewusst leichtgewichtig (kein CompletionCelebration): das Ziel ist,
  // JETZT raus aus der App und rein in den Moment zu gehen.

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Mascot expression="radiant" size="md" />
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Los geht&apos;s — du bist bereit.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Langsam sprechen, Sätze beenden — und dein Mantra hast du dabei.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full"
          render={<Link href="/booster/confidence" />}
        >
          Fertig
        </Button>
      </div>
    </div>
  );
}
