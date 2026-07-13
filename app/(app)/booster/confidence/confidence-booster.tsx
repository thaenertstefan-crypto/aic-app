"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

import { SubPageHeader } from "@/components/layout/sub-page-header";
import { CleanserIntroInfoButton } from "@/components/intro/cleanser-intro-info-button";
import { Card, CardContent } from "@/components/ui/card";
import { PAGE_TITLES } from "@/lib/content/labels";

import { MantraRitual } from "./mantra-ritual";
import type { MantraCardData } from "./actions";

// ---------------------------------------------------------------------------
// Confidence-Boost — Landing: oben der Einstieg in den akuten Moment-Flow
// („Gleich bin ich dran"), darunter das tägliche Mantra-Ritual (inkl. Streak,
// ohne Extra-Tap erreichbar).
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
      </div>
    </div>
  );
}
