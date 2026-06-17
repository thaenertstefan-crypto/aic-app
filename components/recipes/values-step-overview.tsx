import Link from "next/link";
import { CheckCircle2, Lock, ChevronRight } from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

interface ValuesStepOverviewProps {
  hypothesisDone: boolean;
  journalCount: number;
  journalDone: boolean;
  evaluationDone: boolean;
}

type StepStatus = "done" | "current" | "open" | "locked";

type Step = {
  n: number;
  title: string;
  description: string;
  href: string;
  status: StepStatus;
  /** Short status label shown as a pill. */
  badge: string;
};

export function ValuesStepOverview({
  hypothesisDone,
  journalCount,
  journalDone,
  evaluationDone,
}: ValuesStepOverviewProps) {
  // The current step is the first one that is neither done nor locked.
  const currentStep = !hypothesisDone
    ? 1
    : !journalDone
      ? 2
      : !evaluationDone
        ? 3
        : 0; // 0 = everything done

  const journalProgress = Math.min(journalCount, 7);

  const steps: Step[] = [
    {
      n: 1,
      title: "Hypothese aufstellen",
      description: "Wähle 5 Werte, die sich gerade echt für dich anfühlen.",
      href: "/recipes/values/hypothesis",
      status: hypothesisDone ? "done" : "current",
      badge: hypothesisDone ? "erledigt" : "offen",
    },
    {
      n: 2,
      title: "7 Tage beobachten",
      description: "Halte eine Woche lang täglich fest, was dich bewegt.",
      href: "/recipes/values/journal",
      status: journalDone
        ? "done"
        : !hypothesisDone
          ? "locked"
          : currentStep === 2
            ? "current"
            : "open",
      badge: journalDone
        ? "erledigt"
        : !hypothesisDone
          ? "gesperrt"
          : journalCount > 0
            ? `Tag ${journalProgress}/7`
            : "offen",
    },
    {
      n: 3,
      title: "Auswerten & verfeinern",
      description: "Schau dir die Muster an und schärfe deine Werte nach.",
      href: "/recipes/values/evaluation",
      status: evaluationDone
        ? "done"
        : !journalDone
          ? "locked"
          : "current",
      badge: evaluationDone
        ? "erledigt"
        : !journalDone
          ? "gesperrt bis Tagebuch fertig"
          : "offen",
    },
  ];

  return (
    <GlassPanel>
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          So läuft&apos;s ab
        </h2>
        <ol className="space-y-2">
          {steps.map((step) => (
            <StepRow key={step.n} step={step} />
          ))}
        </ol>
      </section>
    </GlassPanel>
  );
}

function StepBadge({ status, label }: { status: StepStatus; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "done" &&
          "bg-success/15 text-success",
        status === "current" &&
          "bg-primary/15 text-primary",
        status === "open" &&
          "bg-primary/15 text-primary",
        status === "locked" && "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function StepIndicator({ step }: { step: Step }) {
  if (step.status === "done") {
    return (
      <CheckCircle2 className="size-6 shrink-0 text-success" />
    );
  }
  if (step.status === "locked") {
    return <Lock className="size-5 shrink-0 text-muted-foreground" />;
  }
  // current / open — numbered marker
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        step.status === "current"
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {step.n}
    </span>
  );
}

function StepRow({ step }: { step: Step }) {
  const accessible = step.status !== "locked";

  const inner = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border-l-4 px-4 py-3 transition-colors",
        step.status === "current" &&
          "border-primary bg-primary/10",
        step.status === "done" && "border-success/60 bg-muted/30",
        step.status === "open" && "border-muted-foreground/20 bg-muted/30",
        step.status === "locked" && "border-muted-foreground/20 bg-muted/30 opacity-60",
        accessible && "hover:bg-muted/60",
      )}
    >
      <div className="mt-0.5">
        <StepIndicator step={step} />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h3
            className={cn(
              "font-heading text-base font-semibold",
              step.status === "locked"
                ? "text-muted-foreground"
                : "text-foreground",
            )}
          >
            {step.title}
          </h3>
          <StepBadge status={step.status} label={step.badge} />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {step.description}
        </p>
      </div>

      {accessible && (
        <ChevronRight className="mt-1 size-4 shrink-0 self-center text-muted-foreground" />
      )}
    </div>
  );

  if (!accessible) {
    return <li>{inner}</li>;
  }

  return (
    <li>
      <Link href={step.href} className="block">
        {inner}
      </Link>
    </li>
  );
}
