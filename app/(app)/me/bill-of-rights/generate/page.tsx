"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import { cn } from "@/lib/utils";

import { saveGeneratedRightAction } from "../actions";

const INTRO_CARDS = getRecipeIntro("bill-of-rights") ?? [];

/** Antippbare Regel-Karte im Duell: alte Regel oder neues Recht. */
function RuleCard({
  label,
  text,
  selected,
  onSelect,
}: {
  label: string;
  text: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="w-full text-left"
    >
      <Card
        className={cn(
          "transition-colors",
          selected
            ? "border-primary ring-2 ring-primary/30"
            : "border-border hover:border-primary/40",
        )}
      >
        <CardContent className="flex flex-col gap-1 pt-(--card-spacing)">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <p className="text-base leading-relaxed text-foreground">{text}</p>
        </CardContent>
      </Card>
    </button>
  );
}

export default function GenerateRightPage() {
  const [phase, setPhase] = useState<"reflect" | "duel">("reflect");
  useScrollTopOnChange(phase);
  const [p1, setP1] = useState("");
  const [oldRule, setOldRule] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [chosen, setChosen] = useState<"old" | "new" | null>(null);
  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(saveGeneratedRightAction, {
    error: null,
  });

  const canGenerate = p1.trim().length > 0 && !loading;

  async function generate() {
    setLoading(true);
    setGenError(null);
    try {
      const res = await fetch("/api/rights-formulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: p1.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "Wir konnten gerade keinen Vorschlag erstellen.");
        return;
      }
      setOldRule(data.oldRule ?? null);
      setSuggestion(data.newRight ?? "");
      // Ohne benannte alte Regel gibt es kein Duell — direkt zum Recht.
      setChosen(data.oldRule ? null : "new");
      setPhase("duel");
    } catch {
      setGenError("Wir konnten gerade keinen Vorschlag erstellen. Versuch es noch einmal.");
    } finally {
      setLoading(false);
    }
  }

  function resetToReflect() {
    setP1("");
    setOldRule(null);
    setSuggestion("");
    setChosen(null);
    setGenError(null);
    setPhase("reflect");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader
        backHref="/me/bill-of-rights"
        title="Vorschlag generieren"
        action={
          INTRO_CARDS.length > 0 ? (
            <IntroInfoButton cards={INTRO_CARDS} />
          ) : undefined
        }
      />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        {phase === "reflect" ? (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Hier baust du in Ruhe an deiner Bill of Rights. Beschreib kurz
              einen Moment, in dem du einen inneren Konflikt gespürt hast — ich
              zeige dir dann, welche zwei Regeln da in dir gekämpft haben.
            </p>

            <div className="space-y-2">
              <Label htmlFor="p1" className="text-base font-medium">
                Was ist zuletzt passiert, wo du einen inneren Konflikt gespürt hast?
              </Label>
              <Textarea
                id="p1"
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                rows={5}
                className="resize-y"
              />
            </div>

            <FormError message={genError} />

            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={!canGenerate}
              onClick={generate}
            >
              {loading ? "Wird erstellt …" : "Vorschlag generieren"}
            </Button>
          </>
        ) : (
          <>
            {oldRule ? (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Diese zwei Regeln haben da vermutlich in dir gekämpft:
                </p>

                <div className="flex flex-col gap-2">
                  <RuleCard
                    label="Die alte Regel"
                    text={oldRule}
                    selected={chosen === "old"}
                    onSelect={() => setChosen("old")}
                  />
                  <div className="flex justify-center" aria-hidden="true">
                    <Zap className="size-5 text-destructive" fill="currentColor" />
                  </div>
                  <RuleCard
                    label="Dein neues Recht"
                    text={suggestion}
                    selected={chosen === "new"}
                    onSelect={() => setChosen("new")}
                  />
                </div>

                <p className="text-center text-base font-medium text-foreground">
                  Nach welcher Regel willst du leben?
                </p>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Aus deiner Situation habe ich dir dieses neue Recht formuliert:
              </p>
            )}

            {chosen === "new" && (
              <form action={formAction} className="flex flex-col gap-5">
                <FormError message={state.error} />

                <p className="text-sm text-muted-foreground">
                  Dein neues Recht — du kannst es noch anpassen:
                </p>

                <input type="hidden" name="prompt1" value={p1} />
                <input type="hidden" name="old_rule" value={oldRule ?? ""} />

                <Textarea
                  name="text"
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  required
                  disabled={pending}
                  className="min-h-[120px] resize-y"
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={pending || !suggestion.trim()}
                >
                  {pending ? "Wird gespeichert …" : "Zu meiner Bill of Rights hinzufügen"}
                </Button>
              </form>
            )}

            {chosen === "old" && (
              <div className="flex flex-col gap-5">
                <Card className="border-dashed">
                  <CardContent className="pt-(--card-spacing)">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Auch das ist eine bewusste Entscheidung — und genau darum
                      geht es: Du entscheidest. Wenn sich das irgendwann anders
                      anfühlt, bin ich hier.
                    </p>
                  </CardContent>
                </Card>

                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={resetToReflect}
                >
                  Andere Situation reflektieren
                </Button>

                <Button
                  size="lg"
                  className="w-full"
                  render={<Link href="/me/bill-of-rights" />}
                >
                  Zurück zu deiner Bill of Rights
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
