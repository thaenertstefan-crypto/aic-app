"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FocusQuestion } from "@/components/dashboard/focus-question";
import { AlternativesDisclosure } from "@/components/dashboard/alternatives-disclosure";
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
  // Frage aus dem Tier ableiten (nicht an primary.key koppeln), damit sie auch
  // bei künftigen "low"-Empfehlungen stimmig bleibt.
  const question =
    tier === "low"
      ? "Stürmt es gerade in deinem Kopf?"
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
                {/* text-foreground/80 statt muted: dieser Text liegt auf der
                    durchscheinenden Glass-Karte, wo ein heller Blob-Durchschein
                    Lavendel-Muted unter AA drückt (3.8:1). /80 hält auch dort
                    ≥4.5:1 und bleibt durch Größe/Gewicht sekundär. */}
                <p className="text-sm text-foreground/80">
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
              {/* /80 statt muted — Glass-Karten-Kontrast, siehe Subtitle oben. */}
              <p className="text-base text-foreground/80">
                {view.fallbackMessage}
              </p>
              <Button
                variant="outline"
                className="w-full"
                render={<Link href="/me" />}
              >
                Zu deinen Übungen
              </Button>
            </CardContent>
          </Card>
        )}

        {view.alternatives.length > 0 && (
          /* Alternativen bewusst zurückgestellt: eingeklappt hinter einem leisen
             Trigger, damit die Gold-Empfehlung oben die einzige offene Handlung
             bleibt. Erst ein Tap enthüllt die „Vorschlags-Shuffle"-Gruppe. */
          <AlternativesDisclosure destinations={view.alternatives} />
        )}
      </div>
    </div>
  );
}
