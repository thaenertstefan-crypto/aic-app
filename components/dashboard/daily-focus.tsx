"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";

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
 * `useCrossfade`-Maschine UND liegen zusammen in **einem** fadenden Wrapper:
 * eine gemeinsame Opacity, ein `transitionend`, ein Opacity-verifizierender
 * Fallback — garantiert out→swap→in für den ganzen Block, alte und neue Inhalte
 * können sich strukturell nicht überlagern. Lägen Frage und Karte in getrennten
 * Fade-Elementen, könnte der Compositor ihre Transitions unterschiedlich
 * verzögern (iOS-PWA nach Resume/Routenwechsel) und der Swap träfe die Frage
 * mitten im Fade.
 *
 * Das Token enthält neben dem Tier auch `showQuestion`: so blendet der Block
 * auch dann komplett über, wenn nur die Frage erscheint (erster Check-in des
 * Tages ohne Tier-Wechsel) — statt dass sie ohne Fade reinploppt.
 */
export function DailyFocus({
  tier,
  primary,
  fallbackMessage,
  showQuestion,
  alternatives,
}: DailyFocusProps) {
  // Nur die ersten paar Alternativen zeigen — der Rest liegt hinter „mehr".
  // Auf einem Screen, der Überforderung nehmen soll, ist eine kurze Liste
  // ruhiger als eine Wand aus sieben gleichwertigen Zeilen.
  const ALTERNATIVES_PREVIEW = 3;
  const [showAllAlternatives, setShowAllAlternatives] = useState(false);

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

  // Token fingerprintet den sichtbaren Zustand: Tier bestimmt Frage-Text,
  // Empfehlung und Alternativen; showQuestion die Präsenz der Frage.
  const fadeToken = `${tier}|${showQuestion ? "q" : "-"}`;

  const { shown, visible, reduced, onTransitionEnd, fadeRef } =
    useCrossfade<FocusSnapshot>(fadeToken, snapshot);
  // Während der Ausblend-Phase den eingefrorenen alten Snapshot zeigen, sonst den
  // live berechneten (analog zur `Crossfade`-Komponente). Bei reduzierter Bewegung
  // immer live (kein Swap-Timing).
  const view = reduced || shown.token === fadeToken ? snapshot : shown.value;

  return (
    /* Der ganze Block ist der Taktgeber der Maschine: sein transitionend löst
       den Swap aus, und über die Ref liest der Fallback hier die echte Opacity.
       Frage, Karte und CTAs faden damit als ein Teilbaum.

       transform-gpu + will-change + isolate zwingen WebKit, den fadenden
       Teilbaum als eigenen, sauber invalidierten Compositor-Layer zu führen:
       Der Opacity-Fade läuft über der backdrop-gefilterten Glass-Card, und
       iOS zeigt dort sonst einen veralteten Layer-Snapshot — der alte Inhalt
       bleibt als „Ghost" über dem neuen sichtbar (nur iOS-PWA, nicht Desktop). */
    <div
      ref={(el) => {
        fadeRef.current = el;
      }}
      className={cn(
        "space-y-3",
        !reduced && "isolate transform-gpu transition-opacity will-change-[opacity]",
        !reduced && (visible ? "opacity-100" : "opacity-0"),
      )}
      style={
        !reduced ? { transitionDuration: `${CROSSFADE_MS}ms` } : undefined
      }
      onTransitionEnd={onTransitionEnd}
    >
      <FocusQuestion question={view.question} />

      <div className="space-y-6">
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
              {(showAllAlternatives
                ? view.alternatives
                : view.alternatives.slice(0, ALTERNATIVES_PREVIEW)
              ).map((destination) => (
                <li key={destination.key}>
                  <Link
                    href={destination.href}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <span className="text-sm font-medium text-foreground">
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

            {!showAllAlternatives &&
              view.alternatives.length > ALTERNATIVES_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAllAlternatives(true)}
                  className="flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {view.alternatives.length - ALTERNATIVES_PREVIEW} weitere
                  anzeigen
                  <ChevronDown className="size-4 shrink-0" />
                </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
