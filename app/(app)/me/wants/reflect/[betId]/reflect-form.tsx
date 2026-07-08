"use client";

import { useActionState, useState } from "react";
import { Battery, BatteryLow, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionLabel } from "@/components/ui/section-label";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { Mascot } from "@/components/brand/mascot";
import { PAGE_TITLES } from "@/lib/content/labels";
import { cn } from "@/lib/utils";

import { saveBetReflectionAction } from "../../actions";

type Vibe = "energized" | "neutral" | "drained";

const VIBE_OPTIONS: { value: Vibe; label: string; icon: typeof Battery }[] = [
  { value: "energized", label: "Energie gegeben", icon: Battery },
  { value: "neutral", label: "War okay", icon: Minus },
  { value: "drained", label: "Eher ausgelaugt", icon: BatteryLow },
];

export function ReflectForm({
  betId,
  betText,
}: {
  betId: string;
  betText: string;
}) {
  const [state, formAction, pending] = useActionState(saveBetReflectionAction, {
    error: null,
  });
  const [vibe, setVibe] = useState<Vibe | null>(null);

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/me/wants" title={PAGE_TITLES.meWants} />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Mascot expression="curious" size="md" />
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Wie war dein Experiment?
          </h1>
        </div>

        <Card className="w-full">
          <CardContent className="pt-(--card-spacing)">
            <SectionLabel className="mb-1">Dein Little Bet</SectionLabel>
            <p className="text-base leading-relaxed text-foreground">{betText}</p>
          </CardContent>
        </Card>

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="betId" value={betId} />
          <input type="hidden" name="vibe" value={vibe ?? ""} />

          <FormError message={state.error} />

          <div className="space-y-2">
            <Label htmlFor="experience" className="text-base font-medium">
              Wie war das Erlebnis? Hat es deine Erwartungen erfüllt oder deine
              Sicht verändert?
            </Label>
            <Textarea
              id="experience"
              name="experience"
              placeholder="Erzähl einfach drauflos …"
              required
              disabled={pending}
              rows={4}
              maxLength={5000}
              className="min-h-[120px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="liked" className="text-base font-medium">
              Was hat dir gefallen?
            </Label>
            <Textarea
              id="liked"
              name="liked"
              disabled={pending}
              rows={2}
              maxLength={5000}
              className="min-h-[60px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="disliked" className="text-base font-medium">
              Was hat dir nicht gefallen?
            </Label>
            <Textarea
              id="disliked"
              name="disliked"
              disabled={pending}
              rows={2}
              maxLength={5000}
              className="min-h-[60px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">
              Wie waren die Leute und der Vibe?
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {VIBE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = vibe === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={pending}
                    aria-pressed={active}
                    onClick={() => setVibe(active ? null : option.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    <Icon className="size-5" />
                    <span className="text-xs font-medium leading-tight">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="changed_wants" className="text-base font-medium">
              Hat dieses Experiment deine Wants verändert oder bestätigt?
            </Label>
            <Textarea
              id="changed_wants"
              name="changed_wants"
              disabled={pending}
              rows={2}
              maxLength={5000}
              className="min-h-[60px] resize-y"
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Wird gespeichert …" : "Reflexion speichern"}
          </Button>
        </form>
        <div className="h-8" />
      </div>
    </div>
  );
}
