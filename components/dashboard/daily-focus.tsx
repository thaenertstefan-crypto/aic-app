"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FocusQuestion } from "@/components/dashboard/focus-question";
import { CROSSFADE_MS, useCrossfade } from "@/lib/hooks/use-crossfade";
import { cn } from "@/lib/utils";

export type Destination = {
  key: string;
  sentence: string;
  href: string;
  badge?: string;
};

export type PrimaryRecommendation = {
  key: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
};

type DailyFocusProps = {
  tier: "low" | "normal";
  primary: PrimaryRecommendation | null;
  /** Nur relevant wenn primary === null. */
  fallbackMessage?: string;
  showQuestion: boolean;
  alternatives: Destination[];
};

/** Eingefrorener Tier-Zustand für die gemeinsame Überblendung. */
type FocusSnapshot = {
  question: string | null;
  primary: PrimaryRecommendation | null;
  fallbackMessage?: string;
  alternatives: Destination[];
};

/**
 * Stimmungsbasierter Tages-Fokus: optionale Frage, eine primäre Empfehlung und
 * eine Liste alternativer Ziele.
 *
 * Frage, Empfehlungskarte und Alternativen laufen bewusst über **eine einzige**
 * `useCrossfade`-Maschine (Token = `tier`): so blenden sie mit einem gemeinsamen
 * Timer und einer gemeinsamen Opacity in Lockstep aus und wieder ein
 * (garantiert out→swap→in, nie Überlagerung). Würde man Frage und Karte über
 * getrennte Maschinen führen, könnten sie bei schnellem Stimmungswechsel driften.
 */
export function DailyFocus({
  tier,
  primary,
  fallbackMessage,
  showQuestion,
  alternatives,
}: DailyFocusProps) {
  // Frage aus dem Tier ableiten (nicht an primary.key koppeln), damit sie auch
  // bei künftigen "low"-Empfehlungen stimmig bleibt.
  const question =
    tier === "low"
      ? "Dreht dein Kopf gerade Runden?"
      : "Sollen wir weitermachen?";

  // Kompletter Tier-Zustand in einem Snapshot — neue Objekt-Identität pro Render
  // ist gewollt; `useCrossfade` liest den jeweils neuesten Wert über eine Ref und
  // übernimmt ihn erst beim Swap (Dependencies hängen nur am Token).
  const snapshot: FocusSnapshot = {
    question: showQuestion ? question : null,
    primary,
    fallbackMessage,
    alternatives,
  };

  const { shown, visible, reduced, onTransitionEnd, fadeRef } =
    useCrossfade<FocusSnapshot>(tier, snapshot);
  // Während der Ausblend-Phase den eingefrorenen alten Snapshot zeigen, sonst den
  // live berechneten (analog zur `Crossfade`-Komponente). Bei reduzierter Bewegung
  // immer live (kein Swap-Timing).
  const view = reduced || shown.token === tier ? snapshot : shown.value;

  return (
    <div className="space-y-3">
      <FocusQuestion question={view.question} visible={visible} />

      {/* Karten-Wrapper ist der Taktgeber der Maschine: sein transitionend
          löst den Swap aus, und über die Ref liest der Fallback hier die
          echte Opacity (die Frage hängt an derselben Maschine und kann
          null sein, daher kein eigener Handler). */}
      <div
        ref={(el) => {
          fadeRef.current = el;
        }}
        className={cn(
          "space-y-6",
          !reduced && "transition-opacity",
          !reduced && (visible ? "opacity-100" : "opacity-0"),
        )}
        style={
          !reduced ? { transitionDuration: `${CROSSFADE_MS}ms` } : undefined
        }
        onTransitionEnd={onTransitionEnd}
      >
        {view.primary ? (
          <Card variant="glass" className="border border-primary">
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="font-heading text-lg font-medium text-foreground">
                  {view.primary.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {view.primary.subtitle}
                </p>
              </div>
              <Button
                className="w-full"
                render={<Link href={view.primary.href} />}
              >
                {view.primary.cta}
                <ArrowRight />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card variant="glass">
            <CardContent className="space-y-3">
              <p className="text-base text-muted-foreground">
                {view.fallbackMessage}
              </p>
              <Button
                variant="outline"
                className="w-full"
                render={<Link href="/recipes" />}
              >
                Rezepte ansehen
              </Button>
            </CardContent>
          </Card>
        )}

        {view.alternatives.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              …oder brauchst du gerade was anderes?
            </p>
            <ul className="space-y-2">
              {view.alternatives.map((destination) => (
                <li key={destination.key}>
                  <Link
                    href={destination.href}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <span className="text-sm font-medium text-foreground/90">
                      {destination.sentence}
                    </span>
                    {destination.badge && (
                      <span className="text-xs text-muted-foreground">
                        {destination.badge}
                      </span>
                    )}
                    <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
