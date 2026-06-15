import Link from "next/link";
import { Flame, Sparkles, Zap, type LucideIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/utils/streak";
import { PageHeader } from "@/components/brand/page-header";
import { Card, CardContent } from "@/components/ui/card";

type Cleanser = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Tailwind classes for the icon's colored circle. */
  iconClass: string;
  /** Tailwind color class for the stat accent. */
  accentClass: string;
};

const CLEANSERS: Cleanser[] = [
  {
    href: "/cleansers/mantra",
    icon: Sparkles,
    title: "Ich bin nicht für jeden",
    description: "Ein Mantra für den Moment — 30 Sekunden Durchatmen.",
    iconClass:
      "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    accentClass: "text-amber-600 dark:text-amber-400",
  },
  {
    href: "/cleansers/promises",
    icon: Flame,
    title: "Versprechen an dich selbst",
    description: "Kleine Versprechen halten — Tag für Tag, Serie für Serie.",
    iconClass:
      "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    accentClass: "text-orange-600 dark:text-orange-400",
  },
  {
    href: "/cleansers/confidence",
    icon: Zap,
    title: "Show Stopper Confidence",
    description: "Fünf Tricks für mehr Präsenz — plus eine Atemübung.",
    iconClass:
      "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
    accentClass: "text-violet-600 dark:text-violet-400",
  },
];

function dayLabel(n: number): string {
  return n === 1 ? "Tag" : "Tage";
}

export default async function CleansersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let activePromises = 0;
  let bestStreak = 0;
  let mantraStreak = 0;

  if (user) {
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: promiseRows }, { data: checkins }] = await Promise.all([
      supabase
        .from("promises")
        .select("current_streak")
        .eq("user_id", user.id)
        .eq("active", true),
      supabase
        .from("cleanser_checkins")
        .select("date")
        .eq("user_id", user.id)
        .eq("cleanser_slug", "mantra")
        .order("date", { ascending: false })
        .limit(90),
    ]);

    const promises = promiseRows ?? [];
    activePromises = promises.length;
    bestStreak = promises.reduce(
      (max, p) => Math.max(max, (p.current_streak as number) ?? 0),
      0,
    );

    const dates = new Set((checkins ?? []).map((c) => c.date as string));
    mantraStreak = computeStreak(dates, dates.has(today));
  }

  return (
    <div className="space-y-6 p-4">
      <PageHeader
        title="Cleanser"
        description="Schnelle Übungen für den Moment — gegen akute Selbstzweifel."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {CLEANSERS.map((cleanser) => {
          const Icon = cleanser.icon;

          return (
            <Link key={cleanser.href} href={cleanser.href} className="block">
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardContent className="flex h-full flex-col gap-3">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full ${cleanser.iconClass}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-heading text-base font-medium text-foreground">
                      {cleanser.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {cleanser.description}
                    </p>
                  </div>

                  {cleanser.href === "/cleansers/mantra" &&
                    mantraStreak > 0 && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Flame
                          className={`size-3.5 ${cleanser.accentClass}`}
                        />
                        <span>
                          Serie:{" "}
                          <span className={`font-medium ${cleanser.accentClass}`}>
                            {mantraStreak} {dayLabel(mantraStreak)}
                          </span>
                        </span>
                      </p>
                    )}

                  {cleanser.href === "/cleansers/promises" &&
                    activePromises > 0 && (
                      <p className="text-xs text-muted-foreground">
                        <span className={`font-medium ${cleanser.accentClass}`}>
                          {activePromises} aktiv
                        </span>
                        {bestStreak > 0 && (
                          <>
                            {" · Beste Serie: "}
                            <span
                              className={`font-medium ${cleanser.accentClass}`}
                            >
                              {bestStreak} {dayLabel(bestStreak)}
                            </span>
                          </>
                        )}
                      </p>
                    )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
