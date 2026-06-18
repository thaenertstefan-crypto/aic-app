import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FocusQuestion } from "@/components/dashboard/focus-question";
import { Crossfade } from "@/components/dashboard/crossfade";

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

/**
 * Stimmungsbasierter Tages-Fokus: optionale Frage, eine primäre Empfehlung und
 * eine Liste alternativer Ziele. Rein präsentational — alle Daten kommen als
 * Props rein (Berechnung passiert beim Aufrufer).
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
      ? "Brauchst du eine Mantra-Pause?"
      : "Sollen wir weitermachen?";

  return (
    <div className="space-y-3">
      <FocusQuestion question={showQuestion ? question : null} />

      <Crossfade token={tier} className="space-y-3">
        {primary ? (
          <Card variant="glass" className="border border-primary">
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="font-heading text-lg font-medium text-foreground">
                  {primary.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {primary.subtitle}
                </p>
              </div>
              <Button className="w-full" render={<Link href={primary.href} />}>
                {primary.cta}
                <ArrowRight />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card variant="glass">
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{fallbackMessage}</p>
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

        {alternatives.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              …oder brauchst du gerade was anderes?
            </p>
            <ul className="space-y-2">
              {alternatives.map((destination) => (
                <li key={destination.key}>
                  <Link
                    href={destination.href}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <span className="text-sm text-foreground/90">
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
      </Crossfade>
    </div>
  );
}
