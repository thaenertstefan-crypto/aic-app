"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Handshake, PartyPopper, Plus, Trophy } from "lucide-react";

import { PageHeader } from "@/components/brand/page-header";
import { CleanserIntroSection } from "@/components/cleansers/cleanser-intro-section";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormError } from "@/components/ui/form-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

import { createPromiseAction } from "./actions";
import { PromiseCard } from "./promise-card";

export type Promise = {
  id: string;
  description: string;
  start_date: string;
  target_days: number;
  current_streak: number;
  longest_streak: number;
  last_completed: string | null;
};

const MILESTONE_COPY: Record<number, { title: string; body: string }> = {
  7: {
    title: "7 Tage am Stück! 🔥",
    body: "Eine ganze Woche, in der du dein Wort dir selbst gegenüber gehalten hast. Genau so wächst Selbstvertrauen.",
  },
  14: {
    title: "14 Tage durchgezogen! 🌱",
    body: "Zwei Wochen Dranbleiben — das ist längst keine Laune mehr, das wirst du. Stark!",
  },
  30: {
    title: "30 Tage geschafft! 🏆",
    body: "Du hast dein Promise einen ganzen Monat lang gehalten. Du kannst dich auf dich verlassen — und das hast du dir bewiesen.",
  },
};

export function PromisesCleanser({
  promises,
  completionsByPromise,
  todayISO,
}: {
  promises: Promise[];
  completionsByPromise: Record<string, string[]>;
  todayISO: string;
}) {
  const [milestone, setMilestone] = useState<number | null>(null);

  return (
    <div className="space-y-6 p-4">
      <PageHeader
        title="Versprechen an dich selbst"
        description="Kleine, konkrete Versprechen — Tag für Tag gehalten. So beweist du dir, dass du dich auf dich verlassen kannst."
      />

      <CleanserIntroSection slug="promises" />

      <NewPromiseDialog />

      {promises.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Noch kein Promise"
          description="Fang klein an. Ein konkretes Versprechen, das du an den meisten Tagen wirklich halten kannst."
        />
      ) : (
        <div className="space-y-4">
          {promises.map((promise) => (
            <PromiseCard
              key={promise.id}
              promise={promise}
              completedDates={completionsByPromise[promise.id] ?? []}
              todayISO={todayISO}
              onMilestone={setMilestone}
            />
          ))}
        </div>
      )}

      <CelebrationDialog
        milestone={milestone}
        onClose={() => setMilestone(null)}
      />
    </div>
  );
}

function NewPromiseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form actions run inside a transition, so closing + refreshing here (rather
  // than in an effect) is the idiomatic, lint-clean way to react to success.
  async function handleSubmit(formData: FormData) {
    const res = await createPromiseAction({ error: null, success: false }, formData);
    if (res.success) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button size="lg" className="w-full gap-2">
            <Plus />
            Neues Promise
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Promise</DialogTitle>
          <DialogDescription>
            Je konkreter, desto besser. Beschreibe genau, was du in welcher
            Situation tust.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Textarea
              name="description"
              rows={4}
              placeholder="z.B. 'Ich gehe an Homeoffice-Tagen direkt nach der Arbeit 30 Min im Park spazieren'"
              aria-label="Promise-Beschreibung"
            />
            <p className="text-xs text-muted-foreground">
              Nenne den Auslöser, die Handlung und – wenn möglich – wo und wie
              lange.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Zeitraum</p>
            <RadioGroup
              name="target_days"
              defaultValue="30"
              className="flex-row gap-2"
            >
              <RadioGroupItem value="7" className="flex-1 justify-center">
                7 Tage
              </RadioGroupItem>
              <RadioGroupItem value="14" className="flex-1 justify-center">
                14 Tage
              </RadioGroupItem>
              <RadioGroupItem value="30" className="flex-1 justify-center">
                30 Tage
              </RadioGroupItem>
            </RadioGroup>
          </div>

          <FormError message={error} />

          <CreateSubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Einen Moment…" : "Promise erstellen"}
    </Button>
  );
}

function CelebrationDialog({
  milestone,
  onClose,
}: {
  milestone: number | null;
  onClose: () => void;
}) {
  const copy = milestone ? MILESTONE_COPY[milestone] : null;

  return (
    <Dialog open={milestone !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader className="items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-celebrate/15 text-celebrate">
            {milestone === 30 ? (
              <Trophy className="size-7" />
            ) : (
              <PartyPopper className="size-7" />
            )}
          </div>
          <DialogTitle className="text-lg">{copy?.title}</DialogTitle>
          <DialogDescription>{copy?.body}</DialogDescription>
        </DialogHeader>
        <Button className="w-full" onClick={onClose}>
          Weiter so
        </Button>
      </DialogContent>
    </Dialog>
  );
}
