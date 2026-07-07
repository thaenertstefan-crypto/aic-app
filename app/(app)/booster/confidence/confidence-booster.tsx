"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

import { SubPageHeader } from "@/components/layout/sub-page-header";
import { CleanserIntroInfoButton } from "@/components/intro/cleanser-intro-info-button";
import { Card, CardContent } from "@/components/ui/card";
import { PAGE_TITLES } from "@/lib/content/labels";

import { BreathingExercise, ExerciseCard, EXERCISES } from "./breathing-exercise";
import { MantraRitual } from "./mantra-ritual";
import type { MantraCardData } from "./actions";

// ---------------------------------------------------------------------------
// Confidence-Boost — Landing des Merges aus Mantra Cleanser + Showstopper
// Confidence: oben der Einstieg in den akuten Moment-Flow, darunter das
// tägliche Mantra-Ritual (inkl. Streak, ohne Extra-Tap erreichbar), unten die
// 5 Showstopper-Übungen als Nachschlage-Referenz.
// ---------------------------------------------------------------------------

export function ConfidenceBooster({
  doneToday,
  streak,
  mantra,
  cards,
}: {
  doneToday: boolean;
  streak: number;
  mantra: string;
  cards: MantraCardData[];
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader
        backHref="/booster"
        title={PAGE_TITLES.confidence}
        action={<CleanserIntroInfoButton slug="confidence-boost" />}
      />
      <div className="mx-auto w-full max-w-md space-y-10 px-4 py-6">
        {/* Hero: der akute Moment-Flow */}
        <Link href="/booster/confidence/moment" className="block">
          <Card className="border-cleanser-confidence/40 bg-cleanser-confidence/10 transition-colors hover:bg-cleanser-confidence/15">
            <CardContent className="flex items-center gap-3 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cleanser-confidence/20 text-cleanser-confidence">
                <Zap className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-base font-semibold text-foreground">
                  Gleich bin ich dran?
                </span>
                <span className="block text-sm leading-relaxed text-muted-foreground">
                  Auftritt, Meeting, Prüfung — in 5 Minuten bist du bereit.
                </span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-cleanser-confidence" />
            </CardContent>
          </Card>
        </Link>

        {/* Tägliches Mantra-Ritual */}
        <section className="space-y-4">
          <h2 className="text-center font-heading text-lg font-semibold text-foreground">
            Dein tägliches Mantra-Ritual
          </h2>
          <MantraRitual
            doneToday={doneToday}
            streak={streak}
            mantra={mantra}
            cards={cards}
          />
        </section>

        {/* Referenz: die 5 Showstopper-Übungen */}
        <section className="space-y-3">
          <div className="space-y-1 text-center">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Die 5 Showstopper-Übungen
            </h2>
            <p className="text-sm text-muted-foreground">
              Selbstbewusstsein ist eine Fähigkeit — diese fünf Tricks kannst du
              jeden Tag mitnehmen.
            </p>
          </div>

          {EXERCISES.map((exercise, index) => (
            <ExerciseCard
              key={exercise.title}
              number={index + 1}
              title={exercise.title}
              short={exercise.short}
            >
              {exercise.detail}
            </ExerciseCard>
          ))}

          <ExerciseCard
            number={5}
            title="Inneren Caveman trainieren"
            short="Atmung + Körper, um runterzufahren."
          >
            <p className="mb-3">
              Vor einem Auftritt schaltet dein Körper auf Alarm. Mit der
              4-7-8-Atmung beruhigst du deinen inneren Höhlenmenschen — und
              wenn das Adrenalin trotzdem arbeiten will, gib ihm eine stille
              Aufgabe: Po- und Oberschenkelmuskeln anspannen oder die
              Handflächen fest gegeneinanderpressen (beides führt dich der
              „Gleich bin ich dran“-Flow Schritt für Schritt durch).
            </p>
            <BreathingExercise />
          </ExerciseCard>
        </section>
      </div>
    </div>
  );
}
