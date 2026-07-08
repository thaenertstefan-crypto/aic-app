import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { Mascot } from "@/components/brand/mascot";
import { PAGE_TITLES } from "@/lib/content/labels";
import { getWantsData } from "@/app/(app)/recipes/wants/actions";

import { ReflectForm } from "./reflect-form";

export default async function ReflectBetPage({
  params,
}: {
  params: Promise<{ betId: string }>;
}) {
  const { betId } = await params;
  const { data } = await getWantsData();

  const bet = (data?.bets ?? []).find((b) => b.id === betId);

  // Bet fehlt oder wurde bereits reflektiert → freundlicher Rückweg.
  if (!bet || bet.status === "tried") {
    return (
      <div className="flex min-h-svh flex-col">
        <SubPageHeader backHref="/me/wants" title={PAGE_TITLES.meWants} />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-6 text-center">
          <Mascot expression="curious" size="md" />
          <p className="text-base leading-relaxed text-muted-foreground">
            {bet?.status === "tried"
              ? "Dieses Experiment hast du schon reflektiert."
              : "Wir konnten dieses Experiment nicht finden."}
          </p>
          <Button className="w-full" render={<Link href="/me/wants" />}>
            Zurück zu deinen Wants
          </Button>
        </div>
      </div>
    );
  }

  return <ReflectForm betId={bet.id} betText={bet.text} />;
}
