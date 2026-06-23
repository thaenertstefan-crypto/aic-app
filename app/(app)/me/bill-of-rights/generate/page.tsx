"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { RecipeIntroCollapsible } from "@/components/recipes/recipe-intro-collapsible";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";

import { saveGeneratedRightAction } from "../actions";

export default function GenerateRightPage() {
  const [phase, setPhase] = useState<"reflect" | "result">("reflect");
  const [p1, setP1] = useState("");
  const [p3, setP3] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(saveGeneratedRightAction, {
    error: null,
  });

  const canGenerate = (p1.trim() || p3.trim()).length > 0 && !loading;

  async function generate() {
    setLoading(true);
    setGenError(null);
    try {
      const situation = p1.trim();
      const res = await fetch("/api/rights-formulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, idealReaction: p3.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "Wir konnten gerade keinen Vorschlag erstellen.");
        return;
      }
      setSuggestion(data.suggestion ?? "");
      setPhase("result");
    } catch {
      setGenError("Wir konnten gerade keinen Vorschlag erstellen. Versuch es noch einmal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/me/bill-of-rights" title="Vorschlag generieren" />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <RecipeIntroCollapsible cards={getRecipeIntro("bill-of-rights") ?? []} />

        {phase === "reflect" ? (
          <>
            <p className="text-sm text-muted-foreground">Deine inneren Konflikte</p>

            <div className="space-y-2">
              <Label htmlFor="p1" className="text-base font-medium">
                Was ist zuletzt passiert, wo du einen inneren Konflikt gespürt hast?
              </Label>
              <Textarea
                id="p1"
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                rows={3}
                className="resize-y"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="p3" className="text-base font-medium">
                Wie würdest du handeln, wenn du frei von Angst, Schuld und Zweifel
                wärst?
              </Label>
              <Textarea
                id="p3"
                value={p3}
                onChange={(e) => setP3(e.target.value)}
                rows={3}
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
          <form action={formAction} className="flex flex-1 flex-col gap-5">
            <FormError message={state.error} />

            <p className="text-sm text-muted-foreground">
              Dein Vorschlag — du kannst ihn noch anpassen:
            </p>

            <input type="hidden" name="prompt1" value={p1} />
            <input type="hidden" name="prompt3" value={p3} />

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
              {pending ? "Wird gespeichert …" : "Zu meinen Bill of Rights hinzufügen"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
